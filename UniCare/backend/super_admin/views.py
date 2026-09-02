import json
import re
import secrets
import hashlib
import hmac
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import connection
from .models import Hospital
# pyrefly: ignore [missing-import]
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail


def is_valid_phone(phone):
    """Validate a 10-digit Indian mobile number (starts with 6-9)."""
    if not phone:
        return False
    digits = ''.join(ch for ch in str(phone) if ch.isdigit())
    if digits.startswith('91') and len(digits) == 12:
        digits = digits[2:]
    return len(digits) == 10 and digits[0] in '6789'


def require_hospital_admin(request, require_approved=False):
    """Return the hospital bound to the current hospital-admin session.
    If require_approved=True, verify the hospital status is 'Approved'.
    """
    hospital_id = request.session.get('hospital_admin_hospital_id')
    if not hospital_id:
        hospital_id = request.GET.get('hospital_id') or request.POST.get('hospital_id')
        if not hospital_id:
            try:
                body_data = json.loads(request.body.decode('utf-8'))
                hospital_id = body_data.get('hospital_id')
            except Exception:
                pass
    if not hospital_id:
        return None, JsonResponse(
            {'status': 'error', 'message': 'Please sign in as a hospital administrator.'}, status=401
        )
    try:
        hid = int(hospital_id)
    except ValueError:
        hid = hospital_id

    if require_approved:
        with connection.cursor() as cursor:
            cursor.execute("SELECT hospital_status FROM tbl_hospital WHERE hospital_id = %s", [hid])
            row = cursor.fetchone()
            if not row or row[0] != 'Approved':
                return None, JsonResponse(
                    {'status': 'error', 'message': 'Your hospital registration is pending approval by Super Admin.'}, status=403
                )

    return hid, None



def verify_password_and_upgrade(user_id, supplied_password, stored_password):
    """Verify supported legacy hashes and upgrade non-Django values after login."""
    stored_password = (stored_password or '').strip()
    valid = check_password(supplied_password, stored_password)
    if stored_password.startswith('sha256$'):
        try:
            _, salt, password_hash = stored_password.split('$', 2)
            valid = hmac.compare_digest(
                hashlib.sha256(f'{salt}{supplied_password}'.encode('utf-8')).hexdigest(), password_hash
            )
        except ValueError:
            valid = False
    elif not valid and stored_password:
        # Constant-time compatibility check for old plaintext rows; replace immediately on success.
        valid = hmac.compare_digest(stored_password, supplied_password)

    if valid and not stored_password.startswith('pbkdf2_'):
        with connection.cursor() as cursor:
            cursor.execute("UPDATE tbl_user SET user_password=%s WHERE user_id=%s", [make_password(supplied_password), user_id])
    return valid


def ensure_doctor_extensions():
    """Ensure tbl_doctor has the experience and hospital_id extension columns."""
    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tbl_doctor' AND COLUMN_NAME='doctor_experience'")
        if not cursor.fetchone()[0]:
            cursor.execute("ALTER TABLE tbl_doctor ADD COLUMN doctor_experience VARCHAR(100) NULL")
        cursor.execute("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tbl_doctor' AND COLUMN_NAME='hospital_id'")
        if not cursor.fetchone()[0]:
            cursor.execute("ALTER TABLE tbl_doctor ADD COLUMN hospital_id INT NULL AFTER user_id")


def ensure_recovery_columns():
    """Ensure tbl_user has the recovery question/answer and must_change_password columns."""
    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tbl_user' AND COLUMN_NAME='user_recovery_question'")
        if not cursor.fetchone()[0]:
            cursor.execute("ALTER TABLE tbl_user ADD COLUMN user_recovery_question VARCHAR(255) NULL")
        cursor.execute("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tbl_user' AND COLUMN_NAME='user_recovery_answer'")
        if not cursor.fetchone()[0]:
            cursor.execute("ALTER TABLE tbl_user ADD COLUMN user_recovery_answer VARCHAR(255) NULL")
        cursor.execute("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tbl_user' AND COLUMN_NAME='must_change_password'")
        if not cursor.fetchone()[0]:
            cursor.execute("ALTER TABLE tbl_user ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0")

@csrf_exempt
def super_admin_login(request):
    """
    Super Admin Login API
    Validates the user against tbl_user and tbl_role.
    Checks user_is_active = TRUE.
    Creates Django user session storing admin_id and admin_name.
    """
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST

    email = (data.get('admin_email') or data.get('email') or '').strip()
    password = (data.get('admin_password') or data.get('password') or '').strip()

    # Field Validations
    if not email:
        return JsonResponse({'status': 'error', 'message': 'Email Required'}, status=400)
    if not password:
        return JsonResponse({'status': 'error', 'message': 'Password Required'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT u.user_id, u.user_name, u.user_email, u.user_password, u.user_is_active
            FROM tbl_user u INNER JOIN tbl_role r ON r.role_id = u.role_id
            WHERE (LOWER(u.user_email) = LOWER(%s) OR LOWER(u.user_name) = LOWER(%s))
              AND LOWER(REPLACE(REPLACE(r.role_name, ' ', ''), '_', '')) = 'superadmin'
            LIMIT 1
        """, [email, email])
        admin = cursor.fetchone()
    if not admin:
        return JsonResponse({'status': 'error', 'message': 'Invalid Email or Password'}, status=401)
    admin_id, admin_name, admin_email, stored_pass, is_active = admin
    password_valid = verify_password_and_upgrade(admin_id, password, stored_pass)

    if not password_valid:
        return JsonResponse({'status': 'error', 'message': 'Invalid Email or Password'}, status=401)

    if not is_active:
        return JsonResponse({'status': 'error', 'message': 'Account is inactive. Please contact system administrator.'}, status=403)

    # Login succeeds -> Create user session
    request.session['admin_id'] = admin_id
    request.session['admin_name'] = admin_name
    request.session.modified = True

    return JsonResponse({
        'status': 'success',
        'message': 'Login successful',
        'admin_id': admin_id,
        'admin_name': admin_name,
        'admin_email': admin_email
    })


@csrf_exempt
def super_admin_logout(request):
    """
    Destroys session and logs out super admin.
    """
    request.session.flush()
    return JsonResponse({'status': 'success', 'message': 'Session destroyed successfully.'})


@csrf_exempt
def request_password_reset(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST
    email = (data.get('email') or '').strip().lower()
    if not email:
        return JsonResponse({'status': 'error', 'message': 'Email is required.'}, status=400)
    with connection.cursor() as cursor:
        cursor.execute("SELECT user_id FROM tbl_user WHERE LOWER(user_email)=LOWER(%s) LIMIT 1", [email])
        user_exists = cursor.fetchone() is not None
    if not user_exists:
        return JsonResponse({'status': 'success', 'message': 'If the address is registered, a verification code has been sent.'})
    code = f'{secrets.randbelow(1000000):06d}'
    request.session['password_reset_email'] = email
    request.session['password_reset_code'] = code
    request.session.set_expiry(15 * 60)
    try:
        send_mail('UniCare password reset code', f'Your UniCare password reset code is: {code}. It expires in 15 minutes.', None, [email], fail_silently=False)
    except Exception:
        return JsonResponse({'status': 'error', 'message': 'Unable to send reset email. Please contact the system administrator.'}, status=503)
    return JsonResponse({'status': 'success', 'message': 'Verification code sent to your email.'})


@csrf_exempt
def confirm_password_reset(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST
    email = (data.get('email') or '').strip().lower()
    code = (data.get('code') or '').strip()
    password = (data.get('password') or '').strip()
    if not email or not code or len(password) < 5:
        return JsonResponse({'status': 'error', 'message': 'Email, verification code, and a 5-character password are required.'}, status=400)
    if request.session.get('password_reset_email') != email or request.session.get('password_reset_code') != code:
        return JsonResponse({'status': 'error', 'message': 'Invalid or expired verification code.'}, status=400)
    hashed_password = make_password(password)
    with connection.cursor() as cursor:
        cursor.execute("UPDATE tbl_user SET user_password=%s WHERE LOWER(user_email)=LOWER(%s)", [hashed_password, email])
    request.session.pop('password_reset_email', None)
    request.session.pop('password_reset_code', None)
    return JsonResponse({'status': 'success', 'message': 'Password updated successfully. You can now log in.'})


RECOVERY_QUESTIONS = [
    "What is the name of your best friend?",
    "What was the official name of the high school or secondary school you attended?",
    "What is the name of your first pet?",
    "What is your mother's name?",
    "What was the make and model of your first car?",
    "What city were you born in?",
]


@csrf_exempt
def recovery_account_lookup(request):
    """
    Forgot Password - Step 1
    Accepts a registered email address or phone number.
    Returns the recovery question linked to that account (never the answer).
    """
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST

    identifier = (data.get('identifier') or data.get('email') or data.get('phone') or '').strip()
    if not identifier:
        return JsonResponse({'status': 'error', 'message': 'Email address or phone number is required.'}, status=400)

    ensure_recovery_columns()

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT u.user_id, u.user_email, u.user_phone, u.user_recovery_question, u.user_recovery_answer
            FROM tbl_user u
            WHERE (LOWER(u.user_email) = LOWER(%s) OR u.user_phone = %s)
              AND u.user_is_active = 1
            LIMIT 1
        """, [identifier, identifier])
        row = cursor.fetchone()

    if not row:
        return JsonResponse({'status': 'error', 'message': 'No account found with this email address or phone number.'}, status=404)

    user_id, user_email, user_phone, recovery_question, recovery_answer = row

    if not recovery_question:
        return JsonResponse({
            'status': 'error',
            'message': 'This account does not have a recovery question set. Please contact the system administrator.'
        }, status=400)

    # Store the account context server-side, never return the answer to the client.
    request.session['recovery_user_id'] = user_id
    request.session['recovery_user_email'] = user_email
    request.session['recovery_user_phone'] = user_phone
    request.session['recovery_question'] = recovery_question
    request.session.set_expiry(15 * 60)
    request.session.modified = True

    return JsonResponse({
        'status': 'success',
        'recovery_question': recovery_question
    })


@csrf_exempt
def recovery_answer_verify(request):
    """
    Forgot Password - Step 2
    Verifies the user-provided answer against the stored hash.
    If correct, resets the password to the new value supplied.
    """
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST

    answer = (data.get('answer') or data.get('recovery_answer') or '').strip()
    new_password = (data.get('new_password') or data.get('password') or '').strip()
    confirm_password = (data.get('confirm_password') or data.get('confirmPassword') or '').strip()

    if not answer:
        return JsonResponse({'status': 'error', 'message': 'Recovery answer is required.'}, status=400)
    if not new_password:
        return JsonResponse({'status': 'error', 'message': 'New password is required.'}, status=400)
    if len(new_password) < 8 or not re.match(r'^(?=.*[A-Za-z])(?=.*\d).{8,}$', new_password):
        return JsonResponse({'status': 'error', 'message': 'Password must be at least 8 characters and include a letter and number.'}, status=400)
    if new_password != confirm_password:
        return JsonResponse({'status': 'error', 'message': 'Passwords do not match.'}, status=400)

    user_id = request.session.get('recovery_user_id')
    if not user_id:
        return JsonResponse({'status': 'error', 'message': 'Please start the password recovery process again.'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute("SELECT user_recovery_answer FROM tbl_user WHERE user_id = %s", [user_id])
        row = cursor.fetchone()

    if not row or not row[0]:
        return JsonResponse({'status': 'error', 'message': 'Recovery data not found for this account.'}, status=400)

    # Compare in a constant-time way using Django's password hasher.
    stored_answer = row[0]
    normalized_answer = answer.strip().lower()
    valid = check_password(normalized_answer, stored_answer)

    if not valid and stored_answer.startswith('sha256$'):
        try:
            _, salt, answer_hash = stored_answer.split('$', 2)
            valid = hmac.compare_digest(
                hashlib.sha256(f'{salt}{normalized_answer}'.encode('utf-8')).hexdigest(), answer_hash
            )
        except ValueError:
            valid = False

    if not valid:
        return JsonResponse({'status': 'error', 'message': 'Incorrect recovery answer.'}, status=400)

    # Answer is correct — hash and store the new password.
    hashed_password = make_password(new_password)
    with connection.cursor() as cursor:
        cursor.execute("UPDATE tbl_user SET user_password = %s WHERE user_id = %s", [hashed_password, user_id])

    # Clear recovery session context.
    request.session.pop('recovery_user_id', None)
    request.session.pop('recovery_user_email', None)
    request.session.pop('recovery_user_phone', None)
    request.session.pop('recovery_question', None)

    return JsonResponse({
        'status': 'success',
        'message': 'Password reset successful. You can now log in with your new password.'
    })


@csrf_exempt
def check_session(request):
    """
    Check if active super admin session exists.
    """
    admin_id = request.session.get('admin_id')
    admin_name = request.session.get('admin_name')

    if admin_id and admin_name:
        return JsonResponse({
            'authenticated': True,
            'admin_id': admin_id,
            'admin_name': admin_name
        })
    
    return JsonResponse({'authenticated': False})


@csrf_exempt
def dashboard_stats(request):
    """
    Retrieves Super Admin Dashboard statistics directly from MySQL database tables.
    """
    admin_id = request.session.get('admin_id')
    admin_name = request.session.get('admin_name')

    if not admin_name:
        admin_name = "Super Admin"

    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM tbl_hospital WHERE hospital_is_active = TRUE;")
        total_hospitals = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM tbl_hospital WHERE hospital_status = 'Pending';")
        pending_hospitals = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM tbl_hospital WHERE hospital_status = 'Approved';")
        approved_hospitals = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM tbl_hospital WHERE hospital_status = 'Rejected';")
        rejected_hospitals = cursor.fetchone()[0]

    return JsonResponse({
        'status': 'success',
        'admin_name': admin_name,
        'admin_id': admin_id,
        'stats': {
            'total_hospitals': total_hospitals,
            'pending_hospitals': pending_hospitals,
            'approved_hospitals': approved_hospitals,
            'rejected_hospitals': rejected_hospitals
        }
    })


@csrf_exempt
def get_hospital_requests(request):
    """
    Retrieves pending hospital registration requests directly from MySQL (tbl_hospital).
    """
    if request.method != 'GET':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT h.hospital_id, h.hospital_uid, h.hospital_name, h.hospital_email,
                   h.hospital_phone, h.hospital_address, h.hospital_status, h.hospital_is_active, h.hospital_created_at,
                   u.user_name AS admin_name, u.user_email AS admin_email, u.user_phone AS admin_phone
            FROM tbl_hospital h
            LEFT JOIN tbl_user u ON u.hospital_id = h.hospital_id AND u.role_id = 1
            WHERE h.hospital_status = 'Pending'
            ORDER BY h.hospital_id DESC
        """)
        columns = [col[0] for col in cursor.description]
        requests_list = [dict(zip(columns, row)) for row in cursor.fetchall()]

    return JsonResponse({
        'status': 'success',
        'requests': requests_list,
        'total_pending': len(requests_list)
    })


@csrf_exempt
def hospital_request_action(request):
    """
    Approve or Reject a pending hospital request in MySQL (tbl_hospital).
    """
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST

    hospital_id = data.get('hospital_id')
    action = data.get('action')  # 'approve' or 'reject'

    if not hospital_id or not action:
        return JsonResponse({'status': 'error', 'message': 'Hospital ID and Action are required'}, status=400)

    if action not in ['approve', 'reject']:
        return JsonResponse({'status': 'error', 'message': 'Invalid action.'}, status=400)

    new_status = 'Approved' if action == 'approve' else 'Rejected'
    is_active = 1 if action == 'approve' else 0

    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE tbl_hospital 
            SET hospital_status = %s, hospital_is_active = %s 
            WHERE hospital_id = %s
        """, [new_status, is_active, hospital_id])

    return JsonResponse({
        'status': 'success',
        'message': f'Hospital request has been {new_status.lower()} successfully.'
    })


@csrf_exempt
def get_hospitals(request):
    """
    Retrieves all hospitals from MySQL (tbl_hospital) with optional status filtering & search query.
    """
    if request.method != 'GET':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    status_filter = request.GET.get('status', 'all').strip()
    search_query = request.GET.get('search', '').strip()

    sql = """
        SELECT hospital_id, hospital_uid, hospital_name, hospital_email, 
               hospital_phone, hospital_address, hospital_status, hospital_is_active, hospital_created_at
        FROM tbl_hospital
        WHERE 1=1
    """
    params = []

    if status_filter and status_filter.lower() != 'all':
        if status_filter.lower() == 'active':
            sql += " AND hospital_is_active = TRUE"
        elif status_filter.lower() == 'inactive':
            sql += " AND hospital_is_active = FALSE"
        else:
            sql += " AND hospital_status = %s"
            params.append(status_filter.capitalize())

    if search_query:
        sql += " AND (hospital_name LIKE %s OR hospital_uid LIKE %s OR hospital_email LIKE %s OR hospital_phone LIKE %s)"
        like_term = f"%{search_query}%"
        params.extend([like_term, like_term, like_term, like_term])

    sql += " ORDER BY hospital_id DESC"

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        columns = [col[0] for col in cursor.description]
        hospitals_list = [dict(zip(columns, row)) for row in cursor.fetchall()]

    return JsonResponse({
        'status': 'success',
        'hospitals': hospitals_list,
        'count': len(hospitals_list)
    })


@csrf_exempt
def add_hospital(request):
    """
    Directly insert a new Hospital into MySQL (tbl_hospital).
    """
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST

    name = data.get('hospital_name', '').strip()
    email = data.get('hospital_email', '').strip()
    phone = data.get('hospital_phone', '').strip()
    address = data.get('hospital_address', '').strip()
    status = data.get('hospital_status', 'Approved').strip()
    is_active = 1 if data.get('hospital_is_active', True) else 0

    if not name or not phone:
        return JsonResponse({'status': 'error', 'message': 'Hospital Name and Phone are required'}, status=400)
    if not is_valid_phone(phone):
        return JsonResponse({'status': 'error', 'message': 'Enter a valid 10-digit hospital phone number.'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute("SELECT COALESCE(MAX(hospital_id), 0) FROM tbl_hospital")
        max_id = cursor.fetchone()[0]
        new_uid = f"HOS{max_id + 1:03d}"

        cursor.execute("""
            INSERT INTO tbl_hospital (hospital_uid, hospital_name, hospital_email, hospital_phone, hospital_address, hospital_status, hospital_is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, [new_uid, name, email, phone, address, status, is_active])

    return JsonResponse({
        'status': 'success',
        'message': 'Hospital added successfully to MySQL database.'
    })


@csrf_exempt
def update_hospital(request):
    """
    Updates hospital record in MySQL (tbl_hospital).
    """
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST

    hospital_id = data.get('hospital_id')
    name = data.get('hospital_name', '').strip()
    email = data.get('hospital_email', '').strip()
    phone = data.get('hospital_phone', '').strip()
    address = data.get('hospital_address', '').strip()
    status = data.get('hospital_status', 'Approved').strip()
    is_active = 1 if data.get('hospital_is_active', True) else 0

    if not hospital_id or not name:
        return JsonResponse({'status': 'error', 'message': 'Hospital ID and Name are required'}, status=400)
    if not is_valid_phone(phone):
        return JsonResponse({'status': 'error', 'message': 'Enter a valid 10-digit hospital phone number.'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE tbl_hospital
            SET hospital_name=%s, hospital_email=%s, hospital_phone=%s, hospital_address=%s, hospital_status=%s, hospital_is_active=%s
            WHERE hospital_id=%s
        """, [name, email, phone, address, status, is_active, hospital_id])

    return JsonResponse({
        'status': 'success',
        'message': 'Hospital details updated successfully.'
    })


@csrf_exempt
def toggle_hospital_active(request):
    """
    Toggle hospital_is_active status in MySQL (tbl_hospital).
    """
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST

    hospital_id = data.get('hospital_id')
    if not hospital_id:
        return JsonResponse({'status': 'error', 'message': 'Hospital ID required'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute("UPDATE tbl_hospital SET hospital_is_active = NOT hospital_is_active WHERE hospital_id = %s", [hospital_id])
        cursor.execute("SELECT hospital_is_active FROM tbl_hospital WHERE hospital_id = %s", [hospital_id])
        row = cursor.fetchone()
        new_active = bool(row[0]) if row else False

    return JsonResponse({
        'status': 'success',
        'message': f'Hospital active status updated.',
        'hospital_is_active': new_active
    })


@csrf_exempt
def delete_hospital(request):
    """
    Delete hospital record from MySQL (tbl_hospital).
    """
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST

    hospital_id = data.get('hospital_id')
    if not hospital_id:
        return JsonResponse({'status': 'error', 'message': 'Hospital ID required'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM tbl_hospital WHERE hospital_id = %s", [hospital_id])

    return JsonResponse({
        'status': 'success',
        'message': 'Hospital deleted successfully from MySQL database.'
    })


@csrf_exempt
def analytics_data(request):
    """
    Retrieves deep platform analytics from MySQL database tables.
    """
    if request.method != 'GET':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    with connection.cursor() as cursor:
        cursor.execute("SELECT hospital_status, COUNT(*) FROM tbl_hospital GROUP BY hospital_status")
        status_rows = cursor.fetchall()
        status_counts = {row[0]: row[1] for row in status_rows}

        cursor.execute("SELECT COUNT(*) FROM tbl_hospital")
        total_hospitals = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM tbl_hospital WHERE hospital_is_active = TRUE")
        active_hospitals = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM tbl_hospital WHERE hospital_is_active = FALSE")
        inactive_hospitals = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM tbl_department")
        total_departments = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM tbl_doctor")
        total_doctors = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM tbl_patient")
        total_patients = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM tbl_appointment")
        total_appointments = cursor.fetchone()[0]

        cursor.execute("""
            SELECT hospital_id, hospital_uid, hospital_name, hospital_email, hospital_status, hospital_created_at 
            FROM tbl_hospital 
            ORDER BY hospital_id DESC 
            LIMIT 5
        """)
        columns = [col[0] for col in cursor.description]
        recent_hospitals = [dict(zip(columns, row)) for row in cursor.fetchall()]

    return JsonResponse({
        'status': 'success',
        'analytics': {
            'total_hospitals': total_hospitals,
            'active_hospitals': active_hospitals,
            'inactive_hospitals': inactive_hospitals,
            'pending_hospitals': status_counts.get('Pending', 0),
            'approved_hospitals': status_counts.get('Approved', 0),
            'rejected_hospitals': status_counts.get('Rejected', 0),
            'total_departments': total_departments,
            'total_doctors': total_doctors,
            'total_patients': total_patients,
            'total_appointments': total_appointments,
            'recent_hospitals': recent_hospitals
        }
    })


@csrf_exempt
def register_hospital_public(request):
    """
    Creates a hospital administrator draft account. Hospital registration is submitted later from the dashboard.
    """
    if request.method == 'OPTIONS':
        res = JsonResponse({'status': 'ok'})
        res["Access-Control-Allow-Origin"] = "*"
        res["Access-Control-Allow-Headers"] = "*"
        return res

    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST

    admin_name = (data.get('adminName') or data.get('fullName') or '').strip()
    email = (data.get('adminEmail') or data.get('email') or data.get('admin_email') or data.get('hospital_email') or '').strip()
    phone = (data.get('contactNumber') or data.get('hospital_phone') or data.get('phone') or data.get('contact') or data.get('adminPhone') or '').strip()
    password = (data.get('adminPassword') or data.get('password') or '').strip()
    recovery_question = (data.get('recoveryQuestion') or data.get('recovery_question') or '').strip()
    recovery_answer = (data.get('recoveryAnswer') or data.get('recovery_answer') or '').strip()
    has_hospital_details = bool((data.get('hospital_name') or data.get('name') or '').strip())
    name = (data.get('hospital_name') or data.get('name') or f"{admin_name}'s Hospital").strip()
    address = (data.get('hospital_address') or data.get('address') or '').strip()

    if not admin_name:
        return JsonResponse({'status': 'error', 'message': 'Full Name is required'}, status=400)
    if not email:
        return JsonResponse({'status': 'error', 'message': 'Email Address is required'}, status=400)
    if not phone:
        return JsonResponse({'status': 'error', 'message': 'Phone Number is required'}, status=400)
    if not is_valid_phone(phone):
        return JsonResponse({'status': 'error', 'message': 'Enter a valid 10-digit phone number.'}, status=400)
    if not password:
        return JsonResponse({'status': 'error', 'message': 'Password is required'}, status=400)
    if not re.match(r'^(?=.*[A-Za-z])(?=.*\d).{8,}$', password):
        return JsonResponse({'status': 'error', 'message': 'Password must be at least 8 characters and include a letter and number.'}, status=400)
    if not recovery_question:
        return JsonResponse({'status': 'error', 'message': 'Recovery Question is required'}, status=400)
    if not recovery_answer:
        return JsonResponse({'status': 'error', 'message': 'Recovery Answer is required'}, status=400)

    ensure_recovery_columns()

    with connection.cursor() as cursor:
        cursor.execute("SELECT 1 FROM tbl_user WHERE LOWER(user_email) = LOWER(%s) LIMIT 1", [email])
        if cursor.fetchone():
            return JsonResponse({'status': 'error', 'message': 'An account with this email already exists.'}, status=409)

        hospital_id = None
        new_uid = ''
        # The simple account screen creates only a Hospital Admin account. The
        # dashboard's registration form is the single place that creates the
        # actual tbl_hospital row and sends it for approval.
        if has_hospital_details:
            cursor.execute("SELECT COALESCE(MAX(hospital_id), 1000) FROM tbl_hospital")
            max_id = cursor.fetchone()[0]
            new_uid = f"HOSP-{max_id + 1}"
            cursor.execute("""
                INSERT INTO tbl_hospital (hospital_uid, hospital_name, hospital_email, hospital_phone, hospital_address, hospital_status, hospital_is_active)
                VALUES (%s, %s, %s, %s, %s, 'Draft', 0)
            """, [new_uid, name, email, phone, address])
            hospital_id = cursor.lastrowid

        # Always store ENCRYPTED / HASHED password in tbl_user
        hashed_pass = make_password(password)
        hashed_recovery_answer = make_password(recovery_answer.strip().lower())
        display_username = admin_name
        cursor.execute("""
            INSERT INTO tbl_user (hospital_id, role_id, user_name, user_email, user_phone, user_password,
                                  user_recovery_question, user_recovery_answer, user_is_active)
            VALUES (%s, 1, %s, %s, %s, %s, %s, %s, 1)
        """, [hospital_id, display_username, email, phone, hashed_pass, recovery_question, hashed_recovery_answer])

    return JsonResponse({
        'status': 'success',
        'message': 'Administrator account created successfully.',
        'hospital': {
            'id': new_uid,
            'hospital_id': hospital_id,
            'hospital_uid': new_uid,
            'name': name if has_hospital_details else '',
            'hospital_name': name if has_hospital_details else '',
            'adminName': admin_name or display_username,
            'username': display_username,
            'user_name': display_username,
            'adminEmail': email,
            'email': email,
            'phone': phone,
            'address': address,
            'status': 'Draft',
            'approved': False
        }
    })


@csrf_exempt
def check_hospital_status_public(request):
    """
    Public endpoint to check registration status of a hospital.
    """
    if request.method == 'OPTIONS':
        res = JsonResponse({'status': 'ok'})
        res["Access-Control-Allow-Origin"] = "*"
        res["Access-Control-Allow-Headers"] = "*"
        return res

    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST

    email = (data.get('email') or data.get('loginEmail') or data.get('adminEmail') or '').strip()

    if not email:
        return JsonResponse({'status': 'error', 'message': 'Email is required'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT hospital_id, hospital_uid, hospital_name, hospital_email, hospital_phone, hospital_status, hospital_is_active
            FROM tbl_hospital
            WHERE hospital_email = %s OR hospital_uid = %s
        """, [email, email])
        row = cursor.fetchone()

    if not row:
        return JsonResponse({'status': 'error', 'message': 'No registered hospital found with this email.'}, status=404)

    hospital_data = {
        'hospital_id': row[0],
        'id': row[1],
        'hospital_uid': row[1],
        'name': row[2],
        'hospital_name': row[2],
        'adminEmail': row[3],
        'email': row[3],
        'phone': row[4],
        'status': row[5],
        'approved': row[5] == 'Approved',
        'is_active': bool(row[6])
    }

    return JsonResponse({
        'status': 'success',
        'hospital': hospital_data
    })


@csrf_exempt
def hospital_admin_login(request):
    """
    Hospital Administrator Login API
    Authenticates user against tbl_user (role_id = 1) and tbl_hospital.
    Draft, pending, approved, and rejected administrators can sign in to view their registration status.
    Sets Django user session storing user_id, hospital_id, role_id.
    """
    if request.method == 'OPTIONS':
        res = JsonResponse({'status': 'ok'})
        res["Access-Control-Allow-Origin"] = "*"
        res["Access-Control-Allow-Headers"] = "*"
        return res

    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST

    identifier = (data.get('email') or data.get('username') or data.get('admin_email') or data.get('hospital_email') or '').strip()
    password = (data.get('password') or data.get('admin_password') or '').strip()

    if not identifier:
        return JsonResponse({'status': 'error', 'message': 'Email or Username is required.'}, status=400)

    with connection.cursor() as cursor:
        # Step 1: Query tbl_user where role_id = 1 by matching user_email OR user_name (username)
        cursor.execute("""
            SELECT u.user_id, u.hospital_id, u.role_id, u.user_name, u.user_email, u.user_password, u.user_is_active,
                   h.hospital_uid, h.hospital_name, h.hospital_email, h.hospital_phone, h.hospital_address, h.hospital_status, h.hospital_is_active
            FROM tbl_user u
            LEFT JOIN tbl_hospital h ON u.hospital_id = h.hospital_id
            WHERE (LOWER(u.user_email) = LOWER(%s) OR LOWER(u.user_name) = LOWER(%s)) AND u.role_id = 1
            LIMIT 1
        """, [identifier, identifier])
        row = cursor.fetchone()

        if not row:
            return JsonResponse({'status': 'error', 'message': 'Invalid Email/Username or Password.'}, status=401)

    (user_id, hospital_id, role_id, user_name, user_email, stored_password, user_is_active,
     hospital_uid, hospital_name, hospital_email, hospital_phone, hospital_address, hospital_status, hospital_is_active) = row

    if not user_is_active:
        return JsonResponse({'status': 'error', 'message': 'Administrator account is inactive.'}, status=403)

    # Password check
    if password:
        password_valid = verify_password_and_upgrade(user_id, password, stored_password)
        if not password_valid:
            return JsonResponse({'status': 'error', 'message': 'Invalid Email/Username or Password.'}, status=401)

    # Save to session
    request.session['hospital_admin_user_id'] = user_id
    request.session['hospital_admin_hospital_id'] = hospital_id
    request.session['hospital_admin_role_id'] = role_id
    request.session['hospital_admin_email'] = user_email
    request.session['hospital_admin_username'] = user_name
    request.session.modified = True

    hospital_data = {
        'user_id': user_id,
        'hospital_id': hospital_id,
        'role_id': role_id,
        'role': 'Hospital Administrator',
        'role_name': 'Hospital Administrator',
        'user_name': user_name,
        'username': user_name,
        'id': hospital_uid,
        'hospital_uid': hospital_uid,
        'name': hospital_name,
        'hospital_name': hospital_name,
        'hospital_registration_number': hospital_uid,
        'email': hospital_email,
        'user_email': user_email,
        'hospital_email': hospital_email,
        'phone': hospital_phone,
        'hospital_contact_number': hospital_phone,
        'address': hospital_address,
        'hospital_address': hospital_address,
        'status': hospital_status,
        'hospital_status': hospital_status,
        'is_active': bool(hospital_is_active),
        'hospital_is_active': bool(hospital_is_active),
        'approved': hospital_status == 'Approved'
    }

    return JsonResponse({
        'status': 'success',
        'message': 'Hospital Admin login successful',
        'hospital': hospital_data
    })


@csrf_exempt
def submit_hospital_registration(request):
    """Sends hospital details from the admin dashboard for Super Admin approval."""
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST
    # The session owns the registration record.  A new account has no hospital
    # row yet; this request creates it and links it to that account.
    admin_user_id = request.session.get('hospital_admin_user_id')
    hospital_id = request.session.get('hospital_admin_hospital_id')
    if not admin_user_id:
        return JsonResponse({'status': 'error', 'message': 'Please sign in as a hospital administrator.'}, status=401)
    name = (data.get('hospital_name') or '').strip()
    email = (data.get('hospital_email') or '').strip()
    phone = (data.get('hospital_phone') or '').strip()
    address = (data.get('hospital_address') or '').strip()
    if not hospital_id or not name or not email or not phone:
        if hospital_id:
            return JsonResponse({'status': 'error', 'message': 'Hospital name, email, and phone are required.'}, status=400)
        if not name or not email or not phone:
            return JsonResponse({'status': 'error', 'message': 'Hospital name, email, and phone are required.'}, status=400)
    if not is_valid_phone(phone):
        return JsonResponse({'status': 'error', 'message': 'Enter a valid 10-digit hospital phone number.'}, status=400)
    with connection.cursor() as cursor:
        if not hospital_id:
            cursor.execute("SELECT COALESCE(MAX(hospital_id), 0) FROM tbl_hospital")
            next_hid = cursor.fetchone()[0] + 1
            hospital_uid = f"HOS{next_hid:03d}"
            cursor.execute("""INSERT INTO tbl_hospital (hospital_uid, hospital_name, hospital_email, hospital_phone, hospital_address, hospital_status, hospital_is_active)
                VALUES (%s,%s,%s,%s,%s,'Pending',0)""", [hospital_uid, name, email, phone, address])
            hospital_id = cursor.lastrowid
            cursor.execute("UPDATE tbl_user SET hospital_id=%s WHERE user_id=%s AND hospital_id IS NULL", [hospital_id, admin_user_id])
            request.session['hospital_admin_hospital_id'] = hospital_id
            request.session.modified = True
        else:
            cursor.execute("""UPDATE tbl_hospital SET hospital_name=%s, hospital_email=%s, hospital_phone=%s,
                hospital_address=%s, hospital_status='Pending', hospital_is_active=0 WHERE hospital_id=%s
                AND hospital_status IN ('Draft', 'Rejected')""", [name, email, phone, address, hospital_id])
            if cursor.rowcount == 0:
                return JsonResponse({'status': 'error', 'message': 'This registration has already been submitted or is not available for editing.'}, status=409)
    return JsonResponse({'status': 'success', 'message': 'Hospital registration sent to Super Admin for approval.', 'status': 'Pending', 'hospital_id': hospital_id})


@csrf_exempt
def get_hospital_admin_dashboard_data(request):
    """
    Retrieves dynamic hospital information and hospital-specific dashboard counts.
    Strictly uses the logged-in administrator's authenticated hospital_id.
    """
    if request.method == 'OPTIONS':
        res = JsonResponse({'status': 'ok'})
        res["Access-Control-Allow-Origin"] = "*"
        res["Access-Control-Allow-Headers"] = "*"
        return res

    hospital_id = request.session.get('hospital_admin_hospital_id')
    if not hospital_id:
        admin_user_id = request.session.get('hospital_admin_user_id')
        if not admin_user_id:
            return JsonResponse({'status': 'error', 'message': 'Please sign in as a hospital administrator.'}, status=401)
        with connection.cursor() as cursor:
            cursor.execute("SELECT user_name, user_email, user_phone FROM tbl_user WHERE user_id=%s AND role_id=1", [admin_user_id])
            admin_row = cursor.fetchone()
        if not admin_row:
            return JsonResponse({'status': 'error', 'message': 'Hospital administrator was not found.'}, status=404)
        return JsonResponse({'status': 'success', 'hospital_info': {
            'hospital_id': None, 'hospital_uid': '', 'name': '', 'hospital_name': '',
            'email': '', 'hospital_email': '', 'phone': '', 'hospital_phone': '',
            'address': '', 'hospital_address': '', 'status': 'Draft', 'hospital_status': 'Draft',
            'admin_name': admin_row[0], 'admin_email': admin_row[1], 'admin_phone': admin_row[2],
        }, 'stats': {'total_doctors': 0, 'total_receptionists': 0, 'total_patients': 0, 'today_appointments': 0, 'total_departments': 0}})

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT hospital_id, hospital_uid, hospital_name, hospital_email, hospital_phone, hospital_address, hospital_status, hospital_is_active, hospital_created_at
            FROM tbl_hospital
            WHERE hospital_id = %s
            LIMIT 1
        """, [hospital_id])
        h_row = cursor.fetchone()

        if not h_row:
            return JsonResponse({'status': 'error', 'message': 'Hospital not found.'}, status=404)

        hid, h_uid, h_name, h_email, h_phone, h_address, h_status, h_active, h_created = h_row

        # Counts filtered strictly for hid
        cursor.execute("""
            SELECT COUNT(*) 
            FROM tbl_doctor d 
            JOIN tbl_user u ON d.user_id = u.user_id 
            WHERE u.hospital_id = %s
        """, [hid])
        total_doctors = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM tbl_receptionist WHERE hospital_id = %s", [hid])
        total_receptionists = cursor.fetchone()[0]
        if total_receptionists == 0:
            cursor.execute("SELECT COUNT(*) FROM tbl_user WHERE hospital_id = %s AND role_id = 3", [hid])
            total_receptionists = cursor.fetchone()[0]

        cursor.execute("""
            SELECT COUNT(*) FROM tbl_patient p
            JOIN tbl_user u ON p.user_id = u.user_id
            WHERE u.hospital_id = %s
        """, [hid])
        total_patients = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM tbl_appointment WHERE hospital_id = %s", [hid])
        total_appointments = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM tbl_department WHERE hospital_id = %s", [hid])
        total_departments = cursor.fetchone()[0]

    hospital_info = {
        'hospital_id': hid,
        'id': h_uid,
        'hospital_uid': h_uid,
        'hospital_registration_number': h_uid,
        'name': h_name,
        'hospital_name': h_name,
        'email': h_email,
        'hospital_email': h_email,
        'phone': h_phone,
        'hospital_contact_number': h_phone,
        'address': h_address,
        'hospital_address': h_address,
        'status': h_status,
        'hospital_status': h_status,
        'is_active': bool(h_active),
        'hospital_is_active': bool(h_active),
        'created_at': h_created.strftime('%Y-%m-%d') if h_created else ''
    }

    stats = {
        'total_doctors': total_doctors,
        'total_receptionists': total_receptionists,
        'total_patients': total_patients,
        'today_appointments': total_appointments,
        'total_appointments': total_appointments,
        'total_departments': total_departments
    }

    return JsonResponse({
        'status': 'success',
        'hospital': hospital_info,
        'hospital_info': hospital_info,
        'stats': stats
    })


@csrf_exempt
def get_doctors(request):
    """
    Retrieves doctors from MySQL (tbl_doctor JOIN tbl_user).
    """
    if request.method != 'GET':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    ensure_doctor_extensions()
    hospital_id, error = require_hospital_admin(request)
    if error:
        return error

    sql = (
        "SELECT DISTINCT d.doctor_id, u.hospital_id, d.doctor_license_no, d.doctor_specialization, d.doctor_is_active, d.doctor_experience,"
        " u.user_name, u.user_email, u.user_phone, u.user_created_at"
        " FROM tbl_doctor d"
        " JOIN tbl_user u ON d.user_id = u.user_id"
        " WHERE (d.hospital_id = %s OR u.hospital_id = %s)"
        " ORDER BY d.doctor_id DESC"
    )
    params = [hospital_id, hospital_id]

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = cursor.fetchall()

    doctors_list = []
    for r in rows:
        doc_uid = f"DOC{r[0]:03d}"
        doctors_list.append({
            'doctor_id': r[0],
            'id': doc_uid,
            'doc_uid': doc_uid,
            'hospital_id': r[1],
            'license': r[2],
            'doctor_license_no': r[2],
            'specialization': r[3],
            'department': r[3],
            'is_active': bool(r[4]),
            'experience': r[5] or '',
            'name': r[6],
            'email': r[7],
            'phone': r[8],
            'created_at': r[9].strftime('%Y-%m-%d') if hasattr(r[9], 'strftime') else str(r[9] or '')
        })

    return JsonResponse({
        'status': 'success',
        'doctors': doctors_list,
        'count': len(doctors_list)
    })


@csrf_exempt
def add_doctor(request):
    """
    Inserts a new doctor into MySQL (tbl_user & tbl_doctor).
    Sets doctor's ID (e.g. DOC-1001) as password for doctor login.
    """
    if request.method == 'OPTIONS':
        res = JsonResponse({'status': 'ok'})
        res["Access-Control-Allow-Origin"] = "*"
        res["Access-Control-Allow-Headers"] = "*"
        return res

    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST

    ensure_doctor_extensions()
    hospital_id_param, error = require_hospital_admin(request, require_approved=True)
    if error:
        return error
    name = (data.get('name') or data.get('docName') or '').strip()
    email = (data.get('email') or data.get('docEmail') or '').strip()
    phone = (data.get('phone') or data.get('docPhone') or '').strip()
    specialization = (data.get('specialization') or data.get('department') or 'General Medicine').strip()
    license_no = (data.get('license') or data.get('license_no') or '').strip()
    password = (data.get('password') or '').strip()
    experience = (data.get('experience') or '').strip()

    if not name or not email or len(password) < 8:
        return JsonResponse({'status': 'error', 'message': 'Doctor name, email, and an 8-character password are required'}, status=400)
    if phone and not is_valid_phone(phone):
        return JsonResponse({'status': 'error', 'message': 'Enter a valid 10-digit phone number for the doctor.'}, status=400)

    # Validate email/phone uniqueness in tbl_user
    email_clean = email.lower().strip()
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1 FROM tbl_user WHERE LOWER(user_email) = LOWER(%s) LIMIT 1", [email_clean])
        if cursor.fetchone():
            return JsonResponse({'status': 'error', 'message': 'An account with this email address already exists.'}, status=409)

        if phone:
            phone_clean = phone.strip()
            cursor.execute("SELECT 1 FROM tbl_user WHERE user_phone = %s LIMIT 1", [phone_clean])
            if cursor.fetchone():
                return JsonResponse({'status': 'error', 'message': 'An account with this phone number already exists.'}, status=409)

    import random
    if not license_no:
        clean_name = ''.join(c for c in name if c.isalnum())[:3].upper()
        rand_num = random.randint(10000, 99999)
        license_no = f"LIC-{clean_name}-{rand_num}"

    # The authenticated session, never a client-supplied ID, owns this record.
    valid_hospital_id = hospital_id_param
    with connection.cursor() as cursor:
        # Guarantee medical license number uniqueness
        while True:
            cursor.execute("SELECT 1 FROM tbl_doctor WHERE LOWER(doctor_license_no) = LOWER(%s) LIMIT 1", [license_no])
            if not cursor.fetchone():
                break
            rand_num = random.randint(10000, 99999)
            clean_name = ''.join(c for c in name if c.isalnum())[:3].upper()
            license_no = f"LIC-{clean_name}-{rand_num}"

        cursor.execute("SELECT hospital_id FROM tbl_hospital WHERE hospital_id = %s", [valid_hospital_id])
        if not cursor.fetchone():
            return JsonResponse({'status': 'error', 'message': 'Hospital account was not found.'}, status=404)

    with connection.cursor() as cursor:
        ensure_recovery_columns()
        # Step 1: Create user record in tbl_user
        cursor.execute("""
            INSERT INTO tbl_user (hospital_id, role_id, user_name, user_email, user_phone, user_password, user_is_active, must_change_password)
            VALUES (%s, 2, %s, %s, %s, %s, 1, 1)
        """, [valid_hospital_id, name, email, phone, make_password(password)])
        user_id = cursor.lastrowid

        # Step 2: link to a department owned by this hospital only.
        cursor.execute("SELECT department_id FROM tbl_department WHERE hospital_id=%s AND department_name=%s LIMIT 1", [valid_hospital_id, specialization])
        dept_row = cursor.fetchone()
        if dept_row:
            dept_id = dept_row[0]
        else:
            cursor.execute("INSERT INTO tbl_department (hospital_id, department_name, department_description, department_is_active) VALUES (%s, %s, %s, 1)", [valid_hospital_id, specialization, ''])
            dept_id = cursor.lastrowid

        cursor.execute(
            "INSERT INTO tbl_doctor (user_id, hospital_id, department_id, doctor_license_no, doctor_specialization, doctor_experience, doctor_is_active)"
            " VALUES (%s, %s, %s, %s, %s, %s, 1)",
            [user_id, valid_hospital_id, dept_id, license_no, specialization, experience]
        )
        doctor_id = cursor.lastrowid

        doc_uid = f"DOC{doctor_id:03d}"

    return JsonResponse({
        'status': 'success',
        'message': 'Doctor registered successfully.',
        'doctor': {
            'doctor_id': doctor_id,
            'id': doc_uid,
            'doc_uid': doc_uid,
            'name': name,
            'email': email,
            'phone': phone,
            'department': specialization,
            'specialization': specialization,
            'license': license_no,
            'experience': experience,
            'password': None
        }
    })


@csrf_exempt
def delete_doctor(request):
    """
    Deletes doctor record from MySQL (tbl_doctor & tbl_user).
    """
    if request.method == 'OPTIONS':
        res = JsonResponse({'status': 'ok'})
        res["Access-Control-Allow-Origin"] = "*"
        res["Access-Control-Allow-Headers"] = "*"
        return res

    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST

    hospital_id, error = require_hospital_admin(request, require_approved=True)
    if error:
        return error

    doctor_id = data.get('doctor_id') or data.get('id')
    if not doctor_id:
        return JsonResponse({'status': 'error', 'message': 'Doctor ID required'}, status=400)

    if isinstance(doctor_id, str):
        if doctor_id.startswith('DOC-'):
            doctor_id = int(doctor_id.replace('DOC-', ''))
        elif doctor_id.startswith('DOC'):
            doctor_id = int(doctor_id.replace('DOC', ''))

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT d.user_id 
            FROM tbl_doctor d 
            JOIN tbl_user u ON d.user_id = u.user_id 
            WHERE d.doctor_id = %s AND u.hospital_id = %s
        """, [doctor_id, hospital_id])
        row = cursor.fetchone()
        if not row:
            return JsonResponse({'status': 'error', 'message': 'Doctor not found for this hospital.'}, status=404)
        user_id = row[0]
        cursor.execute("DELETE FROM tbl_doctor WHERE doctor_id = %s", [doctor_id])
        if user_id:
            cursor.execute("DELETE FROM tbl_user WHERE user_id = %s", [user_id])

    return JsonResponse({
        'status': 'success',
        'message': 'Doctor deleted successfully from MySQL.'
    })


@csrf_exempt
def update_doctor(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST

    ensure_doctor_extensions()
    hospital_id, error = require_hospital_admin(request, require_approved=True)
    if error:
        return error

    doctor_id = data.get('doctor_id')
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip()
    phone = (data.get('phone') or '').strip()
    specialization = (data.get('specialization') or data.get('department') or 'General Medicine').strip()
    license_no = (data.get('license') or '').strip()
    experience = (data.get('experience') or '').strip()
    if not doctor_id or not name or not email:
        return JsonResponse({'status': 'error', 'message': 'Doctor ID, name and email are required.'}, status=400)
    if phone and not is_valid_phone(phone):
        return JsonResponse({'status': 'error', 'message': 'Enter a valid 10-digit phone number for the doctor.'}, status=400)

    email_clean = email.lower().strip()
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT d.user_id 
            FROM tbl_doctor d 
            JOIN tbl_user u ON d.user_id = u.user_id 
            WHERE d.doctor_id = %s AND u.hospital_id = %s
        """, [doctor_id, hospital_id])
        row = cursor.fetchone()
        if not row:
            return JsonResponse({'status': 'error', 'message': 'Doctor not found.'}, status=404)
        user_id = row[0]

        # Validate unique email
        cursor.execute("SELECT 1 FROM tbl_user WHERE LOWER(user_email) = LOWER(%s) AND user_id != %s LIMIT 1", [email_clean, user_id])
        if cursor.fetchone():
            return JsonResponse({'status': 'error', 'message': 'Email address is already in use by another user.'}, status=409)

        # Validate unique phone
        if phone:
            phone_clean = phone.strip()
            cursor.execute("SELECT 1 FROM tbl_user WHERE user_phone = %s AND user_id != %s LIMIT 1", [phone_clean, user_id])
            if cursor.fetchone():
                return JsonResponse({'status': 'error', 'message': 'Phone number is already in use by another user.'}, status=409)

        # Validate unique license
        if license_no:
            license_clean = license_no.strip()
            cursor.execute("SELECT 1 FROM tbl_doctor WHERE LOWER(doctor_license_no) = LOWER(%s) AND doctor_id != %s LIMIT 1", [license_clean, doctor_id])
            if cursor.fetchone():
                return JsonResponse({'status': 'error', 'message': 'Medical license number is already in use by another doctor.'}, status=409)

        cursor.execute("UPDATE tbl_user SET user_name=%s, user_email=%s, user_phone=%s WHERE user_id=%s", [name, email, phone, user_id])
        cursor.execute("UPDATE tbl_doctor SET doctor_license_no=%s, doctor_specialization=%s, doctor_experience=%s WHERE doctor_id=%s", [license_no, specialization, experience, doctor_id])
    return JsonResponse({'status': 'success', 'message': 'Doctor updated successfully.'})


@csrf_exempt
def get_receptionists(request):
    if request.method != 'GET':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)
    hospital_id, error = require_hospital_admin(request)
    if error:
        return error
    sql = """
        SELECT r.receptionist_id, r.hospital_id, r.receptionist_is_active,
               u.user_name, u.user_email, u.user_phone, u.user_created_at
        FROM tbl_receptionist r JOIN tbl_user u ON r.user_id = u.user_id
    """
    params = [hospital_id]
    sql += " WHERE r.hospital_id = %s"
    sql += " ORDER BY r.receptionist_id DESC"
    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = cursor.fetchall()
    return JsonResponse({'status': 'success', 'receptionists': [
        {
            'receptionist_id': row[0],
            'id': f'REC{row[0]:03d}',
            'rec_uid': f'REC{row[0]:03d}',
            'hospital_id': row[1],
            'is_active': bool(row[2]),
            'name': row[3],
            'email': row[4],
            'phone': row[5],
            'created_at': row[6].strftime('%Y-%m-%d') if hasattr(row[6], 'strftime') else str(row[6] or '')
        }
        for row in rows
    ]})


@csrf_exempt
def add_receptionist(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST
    hospital_id, error = require_hospital_admin(request, require_approved=True)
    if error:
        return error
    name, email = (data.get('name') or '').strip(), (data.get('email') or '').strip()
    phone = (data.get('phone') or '').strip()
    password = (data.get('password') or '').strip()
    if not hospital_id or not name or not email or len(password) < 8:
        return JsonResponse({'status': 'error', 'message': 'Name, email, and an 8-character password are required.'}, status=400)
    if phone and not is_valid_phone(phone):
        return JsonResponse({'status': 'error', 'message': 'Enter a valid 10-digit phone number for the receptionist.'}, status=400)

    email_clean = email.lower().strip()
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1 FROM tbl_user WHERE LOWER(user_email) = LOWER(%s) LIMIT 1", [email_clean])
        if cursor.fetchone():
            return JsonResponse({'status': 'error', 'message': 'Email address is already registered.'}, status=409)

        if phone:
            phone_clean = phone.strip()
            cursor.execute("SELECT 1 FROM tbl_user WHERE user_phone = %s LIMIT 1", [phone_clean])
            if cursor.fetchone():
                return JsonResponse({'status': 'error', 'message': 'Phone number is already registered.'}, status=409)

    with connection.cursor() as cursor:
        ensure_recovery_columns()
        cursor.execute("INSERT INTO tbl_user (hospital_id, role_id, user_name, user_email, user_phone, user_password, user_is_active, must_change_password) VALUES (%s, 3, %s, %s, %s, %s, 1, 1)", [hospital_id, name, email, phone, make_password(password)])
        user_id = cursor.lastrowid
        cursor.execute("INSERT INTO tbl_receptionist (user_id, hospital_id, receptionist_is_active) VALUES (%s, %s, 1)", [user_id, hospital_id])
        receptionist_id = cursor.lastrowid
        rec_uid = f"REC{receptionist_id:03d}"
    return JsonResponse({'status': 'success', 'message': 'Receptionist added successfully.', 'receptionist': {'receptionist_id': receptionist_id, 'id': rec_uid, 'rec_uid': rec_uid}})


@csrf_exempt
def update_receptionist(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST
    hospital_id, error = require_hospital_admin(request, require_approved=True)
    if error:
        return error
    receptionist_id, name, email = data.get('receptionist_id'), (data.get('name') or '').strip(), (data.get('email') or '').strip()
    phone = (data.get('phone') or '').strip()
    if not receptionist_id or not name or not email:
        return JsonResponse({'status': 'error', 'message': 'Receptionist ID, name and email are required.'}, status=400)
    if phone and not is_valid_phone(phone):
        return JsonResponse({'status': 'error', 'message': 'Enter a valid 10-digit phone number for the receptionist.'}, status=400)

    if isinstance(receptionist_id, str):
        if receptionist_id.startswith('REC-'):
            receptionist_id = int(receptionist_id.replace('REC-', ''))
        elif receptionist_id.startswith('REC'):
            receptionist_id = int(receptionist_id.replace('REC', ''))

    email_clean = email.lower().strip()
    with connection.cursor() as cursor:
        cursor.execute("SELECT user_id FROM tbl_receptionist WHERE receptionist_id=%s AND hospital_id=%s", [receptionist_id, hospital_id])
        row = cursor.fetchone()
        if not row:
            return JsonResponse({'status': 'error', 'message': 'Receptionist not found.'}, status=404)
        user_id = row[0]

        # Validate unique email
        cursor.execute("SELECT 1 FROM tbl_user WHERE LOWER(user_email) = LOWER(%s) AND user_id != %s LIMIT 1", [email_clean, user_id])
        if cursor.fetchone():
            return JsonResponse({'status': 'error', 'message': 'Email address is already in use by another user.'}, status=409)

        # Validate unique phone
        if phone:
            phone_clean = phone.strip()
            cursor.execute("SELECT 1 FROM tbl_user WHERE user_phone = %s AND user_id != %s LIMIT 1", [phone_clean, user_id])
            if cursor.fetchone():
                return JsonResponse({'status': 'error', 'message': 'Phone number is already in use by another user.'}, status=409)

        cursor.execute("UPDATE tbl_user SET user_name=%s, user_email=%s, user_phone=%s WHERE user_id=%s", [name, email, phone, user_id])
    return JsonResponse({'status': 'success', 'message': 'Receptionist updated successfully.'})


@csrf_exempt
def delete_receptionist(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST
    hospital_id, error = require_hospital_admin(request, require_approved=True)
    if error:
        return error
    receptionist_id = data.get('receptionist_id')
    if not receptionist_id:
        return JsonResponse({'status': 'error', 'message': 'Receptionist ID is required.'}, status=400)
    if isinstance(receptionist_id, str):
        if receptionist_id.startswith('REC-'):
            receptionist_id = int(receptionist_id.replace('REC-', ''))
        elif receptionist_id.startswith('REC'):
            receptionist_id = int(receptionist_id.replace('REC', ''))
    with connection.cursor() as cursor:
        cursor.execute("SELECT user_id FROM tbl_receptionist WHERE receptionist_id=%s AND hospital_id=%s", [receptionist_id, hospital_id])
        row = cursor.fetchone()
        if not row:
            return JsonResponse({'status': 'error', 'message': 'Receptionist not found for this hospital.'}, status=404)
        cursor.execute("DELETE FROM tbl_receptionist WHERE receptionist_id=%s AND hospital_id=%s", [receptionist_id, hospital_id])
        if row:
            cursor.execute("DELETE FROM tbl_user WHERE user_id=%s", [row[0]])
    return JsonResponse({'status': 'success', 'message': 'Receptionist deleted successfully.'})


@csrf_exempt
def get_departments(request):
    if request.method != 'GET':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)
    hospital_id, error = require_hospital_admin(request)
    if error:
        return error
    with connection.cursor() as cursor:
        cursor.execute("SELECT department_id, hospital_id, department_name, department_description, department_is_active FROM tbl_department WHERE hospital_id=%s ORDER BY department_id DESC", [hospital_id])
        rows = cursor.fetchall()
    return JsonResponse({
        'status': 'success',
        'departments': [
            {
                'department_id': r[0],
                'id': f'DEP{r[0]:03d}',
                'dep_uid': f'DEP{r[0]:03d}',
                'hospital_id': r[1],
                'name': r[2],
                'description': r[3] or '',
                'is_active': bool(r[4])
            }
            for r in rows
        ]
    })


@csrf_exempt
def save_department(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST
    hospital_id, error = require_hospital_admin(request, require_approved=True)
    if error:
        return error
    department_id = data.get('department_id')
    name, description = (data.get('name') or '').strip(), (data.get('description') or '').strip()
    if not hospital_id or not name:
        return JsonResponse({'status': 'error', 'message': 'Department name is required.'}, status=400)
    with connection.cursor() as cursor:
        if department_id:
            cursor.execute("UPDATE tbl_department SET department_name=%s, department_description=%s WHERE department_id=%s AND hospital_id=%s", [name, description, department_id, hospital_id])
        else:
            cursor.execute("INSERT INTO tbl_department (hospital_id, department_name, department_description, department_is_active) VALUES (%s, %s, %s, 1)", [hospital_id, name, description])
    return JsonResponse({'status': 'success', 'message': 'Department saved successfully.'})


@csrf_exempt
def delete_department(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST
    hospital_id, error = require_hospital_admin(request, require_approved=True)
    if error:
        return error
    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM tbl_department WHERE department_id=%s AND hospital_id=%s", [data.get('department_id'), hospital_id])
    return JsonResponse({'status': 'success', 'message': 'Department deleted successfully.'})


@csrf_exempt
def request_unicare_access(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST
    hospital_id, message = data.get('hospital_id'), (data.get('message') or '').strip()
    if not hospital_id or not message:
        return JsonResponse({'status': 'error', 'message': 'Please enter a request message.'}, status=400)
    with connection.cursor() as cursor:
        cursor.execute("""CREATE TABLE IF NOT EXISTS tbl_unicare_access_request (
            request_id INT AUTO_INCREMENT PRIMARY KEY, hospital_id INT NOT NULL, request_message TEXT NOT NULL,
            request_status VARCHAR(20) NOT NULL DEFAULT 'Pending', requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )""")
        cursor.execute("INSERT INTO tbl_unicare_access_request (hospital_id, request_message) VALUES (%s, %s)", [hospital_id, message])
    return JsonResponse({'status': 'success', 'message': 'Your UniCare access request was sent to the Super Admin.'})


@csrf_exempt
def doctor_login_public(request):
    """
    Public Doctor Login endpoint.
    Doctor's ID (e.g. DOC-1001 or 1001) is used as Doctor ID & Password.
    """
    if request.method == 'OPTIONS':
        res = JsonResponse({'status': 'ok'})
        res["Access-Control-Allow-Origin"] = "*"
        res["Access-Control-Allow-Headers"] = "*"
        return res

    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST

    doctor_id_input = (data.get('doctor_id') or data.get('doc_id') or data.get('username') or '').strip()
    password_input = (data.get('password') or '').strip()

    if not doctor_id_input or not password_input:
        return JsonResponse({'status': 'error', 'message': 'Doctor ID and Password are required'}, status=400)

    raw_id_str = doctor_id_input.replace('DOC-', '').replace('doc-', '')
    try:
        doctor_id_num = int(raw_id_str)
    except ValueError:
        return JsonResponse({'status': 'error', 'message': 'Invalid Doctor ID format. Example: DOC-1001'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT d.doctor_id, u.hospital_id, d.doctor_license_no, d.doctor_specialization,
                   u.user_name, u.user_email, u.user_phone, u.user_password, h.hospital_name
            FROM tbl_doctor d
            JOIN tbl_user u ON d.user_id = u.user_id
            LEFT JOIN tbl_hospital h ON h.hospital_id = COALESCE(d.hospital_id, u.hospital_id)
            WHERE d.doctor_id = %s
        """, [doctor_id_num])
        row = cursor.fetchone()

    if not row:
        return JsonResponse({'status': 'error', 'message': 'Doctor ID not found in MySQL database.'}, status=404)

    doc_uid = f"DOC-{row[0]}"
    expected_password = row[7]

    if not verify_password_and_upgrade(row[0], password_input, expected_password):
        return JsonResponse({'status': 'error', 'message': 'Invalid password.'}, status=401)

    return JsonResponse({
        'status': 'success',
        'message': 'Doctor login successful!',
        'doctor': {
            'doctor_id': row[0],
            'doc_uid': doc_uid,
            'name': row[4],
            'email': row[5],
            'phone': row[6],
            'specialization': row[3],
            'license': row[2],
            'hospital_id': row[1],
            'hospital_name': row[8] or ''
        }
    })


@csrf_exempt
def staff_login(request):
    """Authenticates doctors and receptionists with the email/password set by their hospital admin."""
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST
    identifier, password = (data.get('identifier') or data.get('email') or '').strip(), (data.get('password') or '').strip()
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT u.user_id, u.hospital_id, u.role_id, u.user_name, u.user_email, u.user_password, h.hospital_name 
            FROM tbl_user u 
            LEFT JOIN tbl_hospital h ON h.hospital_id = u.hospital_id
            WHERE (LOWER(u.user_email)=LOWER(%s) OR LOWER(u.user_name)=LOWER(%s)) AND u.role_id IN (2,3) AND u.user_is_active=1 
            LIMIT 1
        """, [identifier, identifier])
        row = cursor.fetchone()
    if not row or not verify_password_and_upgrade(row[0], password, row[5]):
        return JsonResponse({'status': 'error', 'message': 'Invalid email/username or password.'}, status=401)
    
    role_str = 'doctor' if row[2] == 2 else 'receptionist'
    request.session['unicare_user_id'] = row[0]
    request.session['unicare_role'] = role_str
    request.session['unicare_hospital_id'] = row[1]
    if role_str == 'doctor':
        with connection.cursor() as d_cursor:
            d_cursor.execute("SELECT doctor_id FROM tbl_doctor WHERE user_id=%s LIMIT 1", [row[0]])
            d_row = d_cursor.fetchone()
            if d_row:
                request.session['unicare_doctor_id'] = d_row[0]
    request.session.modified = True

    return JsonResponse({
        'status': 'success', 
        'staff': {
            'user_id': row[0], 
            'hospital_id': row[1], 
            'role_id': row[2], 
            'name': row[3], 
            'email': row[4], 
            'role': 'Doctor' if row[2] == 2 else 'Receptionist',
            'hospital_name': row[6] or ''
        }
    })
