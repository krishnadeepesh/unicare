"""Role-scoped clinical workflow APIs for the legacy UniCare schema.

These views use the core MySQL tables: tbl_appointment, tbl_doctor,
tbl_patient_profile, and tbl_patient_visit.  The removed tables
(tbl_clinical_appointment, tbl_doctor_hospital) have been consolidated
into tbl_appointment (with hospital_id/department_id columns) and
tbl_doctor (with a hospital_id column).
"""
import json
from datetime import date

from django.contrib.auth.hashers import make_password
from django.db import connection, transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .views import is_valid_phone, verify_password_and_upgrade


def payload(request):
    try:
        return json.loads(request.body.decode('utf-8'))
    except Exception:
        return request.POST


def _ensure_columns(cursor, table, columns):
    """Add any missing columns to an existing table."""
    cursor.execute(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s",
        [table]
    )
    existing = {row[0] for row in cursor.fetchall()}
    for col, definition in columns.items():
        if col not in existing:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {definition}")


def ensure_workflow_schema():
    """Ensure the patient_profile and patient_visit support tables exist with the required columns.
    tbl_appointment and tbl_doctor already have the required columns after migration.
    """
    with connection.cursor() as cursor:
        cursor.execute("""CREATE TABLE IF NOT EXISTS tbl_patient_profile (
            patient_id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL UNIQUE,
            health_id VARCHAR(40) NOT NULL UNIQUE, date_of_birth DATE NULL,
            gender VARCHAR(30) NULL, address TEXT NULL, patient_is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )""")
        cursor.execute("""CREATE TABLE IF NOT EXISTS tbl_patient_visit (
            visit_id INT AUTO_INCREMENT PRIMARY KEY, patient_id INT NOT NULL, doctor_id INT NOT NULL,
            hospital_id INT NOT NULL, appointment_id INT NULL, diagnosis TEXT NULL, medical_notes TEXT NULL,
            visited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )""")
        # Ensure tbl_patient_profile has all required columns (table may pre-exist with a different schema)
        _ensure_columns(cursor, 'tbl_patient_profile', {
            'user_id': 'INT NOT NULL UNIQUE',
            'health_id': 'VARCHAR(40) NOT NULL UNIQUE',
            'date_of_birth': 'DATE NULL',
            'gender': 'VARCHAR(30) NULL',
            'address': 'TEXT NULL',
            'patient_is_active': 'TINYINT(1) NOT NULL DEFAULT 1',
            'created_at': 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
        })
        # Ensure tbl_patient_visit has all required columns (table may pre-exist with a different schema)
        _ensure_columns(cursor, 'tbl_patient_visit', {
            'patient_id': 'INT NOT NULL',
            'doctor_id': 'INT NOT NULL',
            'hospital_id': 'INT NOT NULL',
            'appointment_id': 'INT NULL',
            'diagnosis': 'TEXT NULL',
            'medical_notes': 'TEXT NULL',
            'visited_at': 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
        })
        _ensure_columns(cursor, 'tbl_user', {
            'user_recovery_question': 'VARCHAR(255) NULL',
            'user_recovery_answer': 'VARCHAR(255) NULL',
            'must_change_password': 'TINYINT(1) NOT NULL DEFAULT 0',
        })
        # Ensure doctor_experience column exists (added during schema extension)
        cursor.execute("""SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tbl_doctor' AND COLUMN_NAME='doctor_experience'""")
        if not cursor.fetchone()[0]:
            cursor.execute("ALTER TABLE tbl_doctor ADD COLUMN doctor_experience VARCHAR(100) NULL")
        # Ensure tbl_doctor.hospital_id exists
        cursor.execute("""SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tbl_doctor' AND COLUMN_NAME='hospital_id'""")
        if not cursor.fetchone()[0]:
            cursor.execute("ALTER TABLE tbl_doctor ADD COLUMN hospital_id INT NULL AFTER user_id")


def session_user(request):
    user_id = request.session.get('unicare_user_id')
    role = request.session.get('unicare_role')
    hospital_id = request.session.get('unicare_hospital_id')
    if not user_id or not role:
        admin_uid = request.session.get('hospital_admin_user_id')
        if admin_uid:
            user_id = admin_uid
            role = 'hospital-admin'
            hospital_id = request.session.get('hospital_admin_hospital_id')
    if not user_id or not role:
        return None, JsonResponse({'status': 'error', 'message': 'Please sign in.'}, status=401)
    return {
        'user_id': user_id,
        'role': role,
        'hospital_id': hospital_id,
        'doctor_id': request.session.get('unicare_doctor_id'),
        'patient_id': request.session.get('unicare_patient_id'),
    }, None


def require_roles(request, *roles):
    user, error = session_user(request)
    if error:
        return None, error
    if user['role'] not in roles:
        return None, JsonResponse({'status': 'error', 'message': 'You are not authorized for this action.'}, status=403)
    return user, None


@csrf_exempt
def unified_login(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)
    ensure_workflow_schema()
    data = payload(request)
    identifier = (data.get('identifier') or data.get('email') or data.get('phone') or '').strip()
    password = (data.get('password') or '').strip()
    if not identifier or not password:
        return JsonResponse({'status': 'error', 'message': 'Email or phone number and password are required.'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT u.user_id, u.hospital_id, u.role_id, u.user_name, u.user_email, u.user_phone, u.user_password,"
            " r.role_name, COALESCE(u.must_change_password, 0), u.user_recovery_question, u.user_recovery_answer"
            " FROM tbl_user u JOIN tbl_role r ON r.role_id=u.role_id"
            " WHERE (LOWER(u.user_email)=LOWER(%s) OR u.user_phone=%s) AND u.user_is_active=1 LIMIT 1",
            [identifier, identifier]
        )
        row = cursor.fetchone()

    if not row or not verify_password_and_upgrade(row[0], password, row[6]):
        return JsonResponse({'status': 'error', 'message': 'Invalid email/phone number or password.'}, status=401)

    normalized = (row[7] or '').lower().replace(' ', '').replace('_', '')
    role = {
        'doctor': 'doctor',
        'receptionist': 'receptionist',
        'patient': 'patient',
        'hospitaladmin': 'hospital-admin',
        'hospitaladministrator': 'hospital-admin',
        'superadmin': 'super-admin',
    }.get(normalized)
    if not role:
        return JsonResponse({'status': 'error', 'message': 'This account has no supported portal role.'}, status=403)

    profile = {
        'user_id': row[0],
        'hospital_id': row[1],
        'name': row[3],
        'email': row[4],
        'phone': row[5],
        'role': role,
        'must_change_password': bool(row[8]),
        'has_recovery_question': bool(row[9] and row[10]),
        'recovery_question': row[9] or '',
    }

    with connection.cursor() as cursor:
        if role == 'super-admin':
            request.session['admin_id'] = row[0]
            request.session['admin_name'] = row[3]
            request.session['admin_email'] = row[4]

        elif role == 'hospital-admin':
            cursor.execute(
                "SELECT hospital_id, hospital_uid, hospital_name, hospital_email, hospital_phone, hospital_address, hospital_status, hospital_is_active"
                " FROM tbl_hospital WHERE hospital_id=%s",
                [row[1]]
            )
            h = cursor.fetchone()
            if h:
                profile['hospital'] = {
                    'hospital_id': h[0],
                    'hospital_uid': h[1],
                    'id': h[1],
                    'hospital_name': h[2],
                    'name': h[2],
                    'hospital_email': h[3],
                    'hospital_phone': h[4],
                    'hospital_address': h[5],
                    'status': h[6],
                    'hospital_status': h[6],
                    'is_active': bool(h[7]),
                    'approved': h[6] == 'Approved',
                    'role': 'Hospital Administrator',
                    'username': row[3],
                    'user_name': row[3],
                    'user_email': row[4],
                }
                profile['hospital_name'] = h[2]
            request.session['hospital_admin_user_id'] = row[0]
            request.session['hospital_admin_hospital_id'] = row[1]
            request.session['hospital_admin_role_id'] = row[2]
            request.session['hospital_admin_email'] = row[4]
            request.session['hospital_admin_username'] = row[3]

        elif role == 'doctor':
            cursor.execute(
                "SELECT d.doctor_id, d.doctor_specialization, d.doctor_license_no, d.doctor_experience, d.hospital_id"
                " FROM tbl_doctor d WHERE d.user_id=%s",
                [row[0]]
            )
            doctor = cursor.fetchone()
            if not doctor:
                return JsonResponse({'status': 'error', 'message': 'Doctor profile was not found.'}, status=404)
            doc_hospital_id = doctor[4] or row[1]
            profile.update({
                'doctor_id': doctor[0],
                'specialization': doctor[1],
                'license': doctor[2],
                'experience': doctor[3] or '',
            })
            hospitals = []
            for hid in set(filter(None, [doc_hospital_id, row[1]])):
                cursor.execute(
                    "SELECT hospital_id, hospital_name FROM tbl_hospital"
                    " WHERE hospital_id=%s AND hospital_status='Approved' AND hospital_is_active=1",
                    [hid]
                )
                h = cursor.fetchone()
                if h:
                    hospitals.append({'hospital_id': h[0], 'hospital_name': h[1]})
            profile['hospitals'] = hospitals
            if hospitals:
                profile['hospital_id'] = hospitals[0]['hospital_id']
                profile['hospital_name'] = hospitals[0]['hospital_name']
                request.session['unicare_hospital_id'] = hospitals[0]['hospital_id']
            request.session['unicare_doctor_id'] = doctor[0]

        elif role == 'receptionist':
            if row[1]:
                cursor.execute("SELECT hospital_name FROM tbl_hospital WHERE hospital_id=%s", [row[1]])
                h_name = cursor.fetchone()
                if h_name:
                    profile['hospital_name'] = h_name[0]

        elif role == 'patient':
            cursor.execute(
                "SELECT patient_id, patient_uid FROM tbl_patient WHERE user_id=%s",
                [row[0]]
            )
            p_row = cursor.fetchone()
            if not p_row:
                cursor.execute("SELECT patient_id, health_id FROM tbl_patient_profile WHERE user_id=%s", [row[0]])
                p_row = cursor.fetchone()
            if not p_row:
                return JsonResponse({'status': 'error', 'message': 'Patient profile was not found.'}, status=404)
            profile.update({'patient_id': p_row[0], 'health_id': p_row[1], 'patient_uid': p_row[1]})
            request.session['unicare_patient_id'] = p_row[0]

    request.session.update({
        'unicare_user_id': row[0],
        'unicare_role': role,
        'unicare_hospital_id': profile.get('hospital_id') or row[1],
    })
    request.session.modified = True
    return JsonResponse({'status': 'success', 'user': profile})


@csrf_exempt
def logout(request):
    request.session.flush()
    return JsonResponse({'status': 'success'})


@csrf_exempt
def profile(request):
    user, error = session_user(request)
    if error:
        return error
    if request.method == 'GET':
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT u.user_name, u.user_email, u.user_phone, h.hospital_name, h.hospital_id, COALESCE(u.must_change_password, 0), u.user_recovery_question, u.user_recovery_answer"
                " FROM tbl_user u"
                " LEFT JOIN tbl_hospital h ON h.hospital_id = u.hospital_id"
                " WHERE u.user_id=%s",
                [user['user_id']]
            )
            row = cursor.fetchone()
            result = {
                'name': row[0], 'email': row[1], 'phone': row[2],
                'role': user['role'],
                'hospital_name': row[3] or '',
                'hospital_id': row[4],
                'must_change_password': bool(row[5]),
                'has_recovery_question': bool(row[6] and row[7]),
                'recovery_question': row[6] or '',
            }
            if user['role'] == 'doctor':
                cursor.execute(
                    "SELECT d.doctor_specialization, d.doctor_license_no, d.doctor_experience,"
                    " COALESCE(h2.hospital_name, h.hospital_name) AS hospital_name"
                    " FROM tbl_doctor d"
                    " JOIN tbl_user u ON u.user_id=d.user_id"
                    " LEFT JOIN tbl_hospital h ON h.hospital_id=u.hospital_id"
                    " LEFT JOIN tbl_hospital h2 ON h2.hospital_id=d.hospital_id"
                    " WHERE d.doctor_id=%s",
                    [user['doctor_id']]
                )
                d = cursor.fetchone()
                if d:
                    result.update({
                        'specialization': d[0], 'license': d[1], 'experience': d[2] or '',
                        'hospital_name': d[3] or result.get('hospital_name', ''),
                    })
        return JsonResponse({'status': 'success', 'profile': result})

    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    data = payload(request)
    name = (data.get('name') or '').strip()
    phone = (data.get('phone') or '').strip()
    if not name:
        return JsonResponse({'status': 'error', 'message': 'Name is required.'}, status=400)
    with connection.cursor() as cursor:
        cursor.execute(
            "UPDATE tbl_user SET user_name=%s, user_phone=%s WHERE user_id=%s",
            [name, phone, user['user_id']]
        )
        if user['role'] == 'doctor':
            cursor.execute(
                "UPDATE tbl_doctor SET doctor_experience=%s WHERE doctor_id=%s",
                [(data.get('experience') or '').strip(), user['doctor_id']]
            )
    return JsonResponse({'status': 'success', 'message': 'Profile updated successfully.'})


@csrf_exempt
def change_password(request):
    user, error = session_user(request)
    if error:
        return error
    data = payload(request)
    current = (data.get('current_password') or '').strip()
    new = (data.get('new_password') or '').strip()
    recovery_question = (data.get('recovery_question') or '').strip()
    recovery_answer = (data.get('recovery_answer') or '').strip()

    if len(new) < 8:
        return JsonResponse({'status': 'error', 'message': 'New password must contain at least 8 characters.'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute("SELECT user_password, user_recovery_question FROM tbl_user WHERE user_id=%s", [user['user_id']])
        row = cursor.fetchone()
        if not row or not verify_password_and_upgrade(user['user_id'], current, row[0]):
            return JsonResponse({'status': 'error', 'message': 'Current password is incorrect.'}, status=400)

        # If user does not have a recovery question set, or if they passed a new one, require recovery fields
        existing_question = row[1]
        if not existing_question or recovery_question:
            if not recovery_question:
                return JsonResponse({'status': 'error', 'message': 'A recovery question is required for account security.'}, status=400)
            if not recovery_answer:
                return JsonResponse({'status': 'error', 'message': 'A recovery answer is required.'}, status=400)

        hashed_new_pass = make_password(new)
        if recovery_question and recovery_answer:
            hashed_answer = make_password(recovery_answer.lower())
            cursor.execute(
                "UPDATE tbl_user SET user_password=%s, user_recovery_question=%s, user_recovery_answer=%s, must_change_password=0 WHERE user_id=%s",
                [hashed_new_pass, recovery_question, hashed_answer, user['user_id']]
            )
        else:
            cursor.execute(
                "UPDATE tbl_user SET user_password=%s, must_change_password=0 WHERE user_id=%s",
                [hashed_new_pass, user['user_id']]
            )

    return JsonResponse({'status': 'success', 'message': 'Password and security recovery settings updated successfully.'})


@csrf_exempt
def doctor_hospitals(request):
    """A doctor can see the hospital they are assigned to and optionally switch context."""
    user, error = require_roles(request, 'doctor')
    if error:
        return error
    doctor_id = user['doctor_id']

    if request.method == 'GET':
        with connection.cursor() as cursor:
            # Primary hospital from tbl_doctor.hospital_id
            cursor.execute(
                "SELECT h.hospital_id, h.hospital_name, dep.department_name"
                " FROM tbl_doctor d"
                " JOIN tbl_hospital h ON h.hospital_id=d.hospital_id"
                " LEFT JOIN tbl_department dep ON dep.department_id=d.department_id"
                " WHERE d.doctor_id=%s AND h.hospital_status='Approved' AND h.hospital_is_active=1",
                [doctor_id]
            )
            items = [{'hospital_id': r[0], 'hospital_name': r[1], 'department': r[2] or ''} for r in cursor.fetchall()]
            # Also include the user's original hospital if different
            if user['hospital_id'] and not any(i['hospital_id'] == user['hospital_id'] for i in items):
                cursor.execute(
                    "SELECT hospital_id, hospital_name FROM tbl_hospital"
                    " WHERE hospital_id=%s AND hospital_status='Approved' AND hospital_is_active=1",
                    [user['hospital_id']]
                )
                h = cursor.fetchone()
                if h:
                    items.insert(0, {'hospital_id': h[0], 'hospital_name': h[1], 'department': ''})
        return JsonResponse({'status': 'success', 'hospitals': items})

    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    hospital_id = payload(request).get('hospital_id')
    with connection.cursor() as cursor:
        # Verify the doctor belongs to this hospital
        cursor.execute(
            "SELECT 1 FROM tbl_doctor d"
            " JOIN tbl_user u ON u.user_id=d.user_id"
            " WHERE d.doctor_id=%s AND (d.hospital_id=%s OR u.hospital_id=%s)",
            [doctor_id, hospital_id, hospital_id]
        )
        if not cursor.fetchone():
            return JsonResponse({'status': 'error', 'message': 'This hospital is not assigned to you.'}, status=403)

    request.session['unicare_hospital_id'] = int(hospital_id)
    request.session.modified = True
    return JsonResponse({'status': 'success', 'hospital_id': int(hospital_id)})


@csrf_exempt
def register_patient(request):
    user, error = require_roles(request, 'receptionist', 'hospital-admin')
    if error:
        return error
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)
    ensure_workflow_schema()
    data = payload(request)

    name    = (data.get('name') or '').strip()
    email   = (data.get('email') or '').strip()
    phone   = (data.get('phone') or '').strip()
    password       = (data.get('password') or '').strip()
    dob            = data.get('date_of_birth') or data.get('patient_dob') or None
    gender         = (data.get('gender') or data.get('patient_gender') or '').strip() or None
    blood_group    = (data.get('blood_group') or data.get('patient_blood_group') or '').strip() or None
    address        = (data.get('address') or data.get('patient_address') or '').strip() or None
    emergency_contact = (data.get('emergency_contact') or data.get('patient_emergency_contact') or '').strip() or None

    if not name:
        return JsonResponse({'status': 'error', 'message': 'Patient name is required.'}, status=400)
    if not (email or phone):
        return JsonResponse({'status': 'error', 'message': 'Email or phone number is required.'}, status=400)
    if phone and not is_valid_phone(phone):
        return JsonResponse({'status': 'error', 'message': 'Enter a valid 10-digit phone number.'}, status=400)
    if emergency_contact and not is_valid_phone(emergency_contact):
        return JsonResponse({'status': 'error', 'message': 'Enter a valid 10-digit emergency contact number.'}, status=400)

    with transaction.atomic(), connection.cursor() as cursor:
        # If patient already exists, return existing global patient record
        existing_row = None
        if email:
            cursor.execute(
                "SELECT p.patient_id, p.patient_uid, p.patient_name, p.patient_email, p.patient_phone,"
                " p.patient_dob, p.patient_gender, p.patient_blood_group, p.patient_address, p.patient_emergency_contact"
                " FROM tbl_patient p WHERE LOWER(p.patient_email)=LOWER(%s) LIMIT 1",
                [email]
            )
            existing_row = cursor.fetchone()
        if not existing_row and phone:
            cursor.execute(
                "SELECT p.patient_id, p.patient_uid, p.patient_name, p.patient_email, p.patient_phone,"
                " p.patient_dob, p.patient_gender, p.patient_blood_group, p.patient_address, p.patient_emergency_contact"
                " FROM tbl_patient p WHERE p.patient_phone=%s LIMIT 1",
                [phone]
            )
            existing_row = cursor.fetchone()

        if existing_row:
            return JsonResponse({
                'status': 'success',
                'existing': True,
                'message': 'Patient already registered in UniCare. Linked existing global record.',
                'patient': {
                    'patient_id': existing_row[0],
                    'patient_uid': existing_row[1],
                    'health_id': existing_row[1],
                    'name': existing_row[2],
                    'email': existing_row[3] or '',
                    'phone': existing_row[4] or '',
                    'date_of_birth': str(existing_row[5]) if existing_row[5] else '',
                    'gender': existing_row[6] or '',
                    'blood_group': existing_row[7] or '',
                    'address': existing_row[8] or '',
                    'emergency_contact': existing_row[9] or '',
                }
            })

        if len(password) < 8:
            return JsonResponse({'status': 'error', 'message': 'Password must be at least 8 characters.'}, status=400)
        if not dob:
            return JsonResponse({'status': 'error', 'message': 'Date of birth is required.'}, status=400)
        if not gender:
            return JsonResponse({'status': 'error', 'message': 'Gender is required.'}, status=400)

        # Role lookup
        cursor.execute("SELECT role_id FROM tbl_role WHERE LOWER(REPLACE(role_name,' ',''))='patient' LIMIT 1")
        role_row = cursor.fetchone()
        role_id = role_row[0] if role_row else 4

        # Generate unique patient_uid: format PT{LETTER}{3-DIGITS}, e.g. PTA001
        cursor.execute("SELECT patient_uid FROM tbl_patient ORDER BY patient_id DESC LIMIT 1")
        last_row = cursor.fetchone()
        patient_uid = _next_patient_uid(last_row[0] if last_row else None, cursor)

        # Insert into tbl_user
        cursor.execute(
            "INSERT INTO tbl_user (hospital_id, role_id, user_name, user_email, user_phone, user_password, user_is_active, must_change_password)"
            " VALUES (%s,%s,%s,%s,%s,%s,1,1)",
            [user['hospital_id'], role_id, name, email or None, phone or None, make_password(password)]
        )
        user_id = cursor.lastrowid

        # Insert into tbl_patient
        cursor.execute(
            "INSERT INTO tbl_patient"
            " (user_id, patient_uid, patient_name, patient_dob, patient_gender,"
            "  patient_phone, patient_email, patient_blood_group, patient_address,"
            "  patient_emergency_contact, patient_is_active)"
            " VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,1)",
            [user_id, patient_uid, name, dob, gender,
             phone or None, email or None, blood_group, address, emergency_contact]
        )
        tbl_patient_id = cursor.lastrowid

        # Insert into tbl_patient_profile for backward compatibility
        cursor.execute(
            "INSERT INTO tbl_patient_profile (user_id, health_id, date_of_birth, gender, address)"
            " VALUES (%s,%s,%s,%s,%s)",
            [user_id, patient_uid, dob, gender, address]
        )

    return JsonResponse({'status': 'success', 'patient': {
        'patient_id': tbl_patient_id,
        'patient_uid': patient_uid,
        'health_id': patient_uid,
        'name': name,
        'email': email,
        'phone': phone,
        'date_of_birth': dob,
        'gender': gender,
        'blood_group': blood_group,
        'address': address,
        'emergency_contact': emergency_contact,
    }})


def _next_patient_uid(last_uid, cursor):
    """Generate the next globally-unique patient UID in format PT{LETTER}{3-DIGITS}.
    Examples: PTA001, PTA002 … PTA999, PTB001 …
    """
    import string
    LETTERS = string.ascii_uppercase  # A-Z

    def uid_to_parts(uid):
        if uid and len(uid) == 6 and uid.startswith('PT') and uid[2].isalpha() and uid[3:].isdigit():
            return LETTERS.index(uid[2].upper()), int(uid[3:])
        return None

    parts = uid_to_parts(last_uid)
    letter_idx, number = (0, 0) if parts is None else parts

    for _ in range(26 * 999):
        number += 1
        if number > 999:
            number = 1
            letter_idx = (letter_idx + 1) % 26
        candidate = f"PT{LETTERS[letter_idx]}{number:03d}"
        cursor.execute("SELECT 1 FROM tbl_patient WHERE patient_uid=%s LIMIT 1", [candidate])
        if not cursor.fetchone():
            return candidate
    raise RuntimeError("Could not generate a unique patient_uid — space exhausted.")


def patient_lookup(request):
    user, error = require_roles(request, 'doctor', 'receptionist', 'hospital-admin')
    if error:
        return error
    health_id = (request.GET.get('health_id') or request.GET.get('patient_uid') or '').strip()
    if not health_id:
        return JsonResponse({'status': 'error', 'message': 'Health ID is required.'}, status=400)
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT p.patient_id, p.patient_uid, p.patient_name, p.patient_email, p.patient_phone,"
            " p.patient_dob, p.patient_gender, p.patient_blood_group, p.patient_address, p.patient_emergency_contact"
            " FROM tbl_patient p WHERE (LOWER(p.patient_uid)=LOWER(%s) OR LOWER(p.patient_email)=LOWER(%s) OR p.patient_phone=%s)",
            [health_id, health_id, health_id]
        )
        row = cursor.fetchone()
        if not row:
            cursor.execute(
                "SELECT p.patient_id, p.health_id, u.user_name, u.user_email, u.user_phone, p.date_of_birth, p.gender"
                " FROM tbl_patient_profile p JOIN tbl_user u ON u.user_id=p.user_id"
                " WHERE LOWER(p.health_id)=LOWER(%s) AND p.patient_is_active=1",
                [health_id]
            )
            prof_row = cursor.fetchone()
            if not prof_row:
                return JsonResponse({'status': 'error', 'message': 'Patient not found.'}, status=404)
            row = (prof_row[0], prof_row[1], prof_row[2], prof_row[3], prof_row[4], prof_row[5], prof_row[6], '', '', '')

        if user['role'] == 'doctor':
            cursor.execute(
                "SELECT 1 FROM tbl_appointment WHERE patient_id=%s AND doctor_id=%s AND hospital_id=%s LIMIT 1",
                [row[0], user['doctor_id'], user['hospital_id']]
            )
            if not cursor.fetchone():
                return JsonResponse({'status': 'error', 'message': 'You are not authorized to view this patient.'}, status=403)

    return JsonResponse({'status': 'success', 'patient': {
        'patient_id': row[0], 'patient_uid': row[1], 'health_id': row[1],
        'name': row[2], 'email': row[3] or '', 'phone': row[4] or '',
        'date_of_birth': str(row[5]) if row[5] else '', 'gender': row[6] or '',
        'blood_group': row[7] or '', 'address': row[8] or '', 'emergency_contact': row[9] or '',
    }})


@csrf_exempt
def doctor_patient_suggestions(request):
    """Live suggestions for Doctor search: ONLY patients having appointments with doctor at current hospital."""
    user, error = require_roles(request, 'doctor')
    if error:
        return error
    query = (request.GET.get('query') or request.GET.get('q') or '').strip().lower()
    if not query:
        return JsonResponse({'status': 'success', 'patients': []})

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT DISTINCT p.patient_id, p.patient_uid, p.patient_name, p.patient_email, p.patient_phone,"
            " p.patient_dob, p.patient_gender"
            " FROM tbl_patient p"
            " JOIN tbl_appointment a ON a.patient_id = p.patient_id"
            " WHERE a.doctor_id = %s AND a.hospital_id = %s"
            " AND (LOWER(p.patient_name) LIKE %s OR LOWER(p.patient_uid) LIKE %s)"
            " LIMIT 10",
            [user['doctor_id'], user['hospital_id'], f'%{query}%', f'%{query}%']
        )
        rows = cursor.fetchall()
        patients = [
            {
                'patient_id': r[0],
                'patient_uid': r[1],
                'health_id': r[1],
                'name': r[2],
                'email': r[3] or '',
                'phone': r[4] or '',
                'date_of_birth': str(r[5]) if r[5] else '',
                'gender': r[6] or '',
            }
            for r in rows
        ]
    return JsonResponse({'status': 'success', 'patients': patients})


@csrf_exempt
def receptionist_patient_suggestions(request):
    """Live suggestions for Receptionist search: ALL registered UniCare patients."""
    user, error = require_roles(request, 'receptionist', 'hospital-admin')
    if error:
        return error
    query = (request.GET.get('query') or request.GET.get('q') or '').strip().lower()
    if not query:
        return JsonResponse({'status': 'success', 'patients': []})

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT DISTINCT p.patient_id, p.patient_uid, p.patient_name, p.patient_email, p.patient_phone,"
            " p.patient_dob, p.patient_gender, p.patient_blood_group, p.patient_address, p.patient_emergency_contact"
            " FROM tbl_patient p"
            " WHERE (LOWER(p.patient_name) LIKE %s OR LOWER(p.patient_uid) LIKE %s OR p.patient_phone LIKE %s)"
            " LIMIT 10",
            [f'%{query}%', f'%{query}%', f'%{query}%']
        )
        rows = cursor.fetchall()
        patients = [
            {
                'patient_id': r[0],
                'patient_uid': r[1],
                'health_id': r[1],
                'name': r[2],
                'email': r[3] or '',
                'phone': r[4] or '',
                'date_of_birth': str(r[5]) if r[5] else '',
                'gender': r[6] or '',
                'blood_group': r[7] or '',
                'address': r[8] or '',
                'emergency_contact': r[9] or '',
            }
            for r in rows
        ]
    return JsonResponse({'status': 'success', 'patients': patients})


@csrf_exempt
def patient_history(request):
    """Authorized patient history endpoint for Doctor."""
    user, error = require_roles(request, 'doctor')
    if error:
        return error
    patient_param = request.GET.get('patient_id') or request.GET.get('health_id')
    if not patient_param:
        return JsonResponse({'status': 'error', 'message': 'Patient ID or Health ID is required.'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT patient_id, patient_uid, patient_name, patient_email, patient_phone,"
            " patient_dob, patient_gender, patient_blood_group, patient_address, patient_emergency_contact"
            " FROM tbl_patient WHERE patient_id=%s OR patient_uid=%s LIMIT 1",
            [patient_param, patient_param]
        )
        p_row = cursor.fetchone()
        if not p_row:
            return JsonResponse({'status': 'error', 'message': 'Patient record not found.'}, status=404)

        patient_id = p_row[0]

        cursor.execute(
            "SELECT 1 FROM tbl_appointment WHERE patient_id=%s AND doctor_id=%s AND hospital_id=%s LIMIT 1",
            [patient_id, user['doctor_id'], user['hospital_id']]
        )
        if not cursor.fetchone():
            return JsonResponse({'status': 'error', 'message': 'You are not authorized to view this patient history.'}, status=403)

        patient = {
            'patient_id': p_row[0],
            'patient_uid': p_row[1],
            'health_id': p_row[1],
            'name': p_row[2],
            'email': p_row[3] or '',
            'phone': p_row[4] or '',
            'date_of_birth': str(p_row[5]) if p_row[5] else '',
            'gender': p_row[6] or '',
            'blood_group': p_row[7] or '',
            'address': p_row[8] or '',
            'emergency_contact': p_row[9] or '',
        }

        cursor.execute(
            "SELECT v.visit_id, v.diagnosis, v.medical_notes, v.visited_at, du.user_name, h.hospital_name"
            " FROM tbl_patient_visit v"
            " JOIN tbl_doctor d ON d.doctor_id = v.doctor_id"
            " JOIN tbl_user du ON du.user_id = d.user_id"
            " JOIN tbl_hospital h ON h.hospital_id = v.hospital_id"
            " WHERE v.patient_id = %s"
            " ORDER BY v.visited_at DESC",
            [patient_id]
        )
        v_rows = cursor.fetchall()
        visits = [
            {
                'visit_id': r[0],
                'id': f"VIS{r[0]:03d}",
                'vis_uid': f"VIS{r[0]:03d}",
                'visit_uid': f"VIS{r[0]:03d}",
                'diagnosis': r[1] or '',
                'medical_notes': r[2] or '',
                'visited_at': str(r[3]),
                'doctor_name': r[4],
                'hospital_name': r[5],
            }
            for r in v_rows
        ]
    return JsonResponse({'status': 'success', 'patient': patient, 'history': visits, 'visits': visits})


def booking_options(request):
    """Public, non-sensitive approved-hospital directory used by patient booking."""
    hospital_id = request.GET.get('hospital_id')
    if not hospital_id:
        return JsonResponse({'status': 'error', 'message': 'Hospital is required.'}, status=400)
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT department_id,department_name FROM tbl_department"
            " WHERE hospital_id=%s AND department_is_active=1 ORDER BY department_name",
            [hospital_id]
        )
        departments = [{'department_id': r[0], 'id': f"DEP{r[0]:03d}", 'name': r[1]} for r in cursor.fetchall()]
        # Doctors who belong to this hospital via tbl_doctor.hospital_id OR tbl_user.hospital_id
        cursor.execute(
            "SELECT DISTINCT d.doctor_id, u.user_name, d.doctor_specialization, d.department_id"
            " FROM tbl_doctor d"
            " JOIN tbl_user u ON u.user_id=d.user_id"
            " WHERE (d.hospital_id=%s OR u.hospital_id=%s)"
            " AND d.doctor_is_active=1 AND u.user_is_active=1"
            " ORDER BY u.user_name",
            [hospital_id, hospital_id]
        )
        doctors = [{'doctor_id': r[0], 'id': f"DOC{r[0]:03d}", 'name': r[1], 'specialization': r[2] or '', 'department_id': r[3]} for r in cursor.fetchall()]
    return JsonResponse({'status': 'success', 'departments': departments, 'doctors': doctors})


@csrf_exempt
def appointments(request):
    user, error = require_roles(request, 'patient', 'doctor', 'receptionist')
    if error:
        return error

    if request.method == 'GET':
        filters = []
        params = []
        if user['role'] == 'patient':
            filters.append('a.patient_id=%s')
            params.append(user['patient_id'])
        elif user['role'] == 'doctor':
            filters.extend(['a.doctor_id=%s', 'a.hospital_id=%s'])
            params.extend([user['doctor_id'], user['hospital_id']])
        else:
            filters.append('a.hospital_id=%s')
            params.append(user['hospital_id'])

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.reason, a.appointment_status,"
                " h.hospital_name, dep.department_name, du.user_name, p.health_id, pu.user_name, a.patient_id"
                " FROM tbl_appointment a"
                " LEFT JOIN tbl_hospital h ON h.hospital_id=a.hospital_id"
                " LEFT JOIN tbl_department dep ON dep.department_id=a.department_id"
                " JOIN tbl_doctor dr ON dr.doctor_id=a.doctor_id"
                " JOIN tbl_user du ON du.user_id=dr.user_id"
                " JOIN tbl_patient_profile p ON p.patient_id=a.patient_id"
                " JOIN tbl_user pu ON pu.user_id=p.user_id"
                " WHERE " + ' AND '.join(filters) +
                " ORDER BY a.appointment_date DESC, a.appointment_time DESC",
                params
            )
            rows = cursor.fetchall()
        return JsonResponse({'status': 'success', 'appointments': [
            {
                'appointment_id': r[0],
                'id': f"APT{r[0]:03d}",
                'apt_uid': f"APT{r[0]:03d}",
                'appointment_uid': f"APT{r[0]:03d}",
                'date': str(r[1]), 'time': r[2],
                'reason': r[3] or '', 'status': r[4], 'hospital': r[5] or '',
                'department': r[6] or '', 'doctor': r[7], 'health_id': r[8], 'patient': r[9],
                'patient_id': r[10],
            }
            for r in rows
        ]})

    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    data = payload(request)
    hospital_id = data.get('hospital_id') or user['hospital_id']
    doctor_id = data.get('doctor_id')
    department_id = data.get('department_id') or None
    patient_id = user['patient_id'] if user['role'] == 'patient' else data.get('patient_id')

    if not patient_id or not doctor_id or not data.get('appointment_date') or not data.get('appointment_time'):
        return JsonResponse({'status': 'error', 'message': 'Patient, doctor, date and time are required.'}, status=400)

    with connection.cursor() as cursor:
        if user['role'] == 'receptionist' and str(hospital_id) != str(user['hospital_id']):
            return JsonResponse({'status': 'error', 'message': 'Appointments must belong to your hospital.'}, status=403)

        # Verify the doctor belongs to this hospital
        cursor.execute(
            "SELECT 1 FROM tbl_doctor d"
            " JOIN tbl_user u ON u.user_id=d.user_id"
            " WHERE d.doctor_id=%s AND (d.hospital_id=%s OR u.hospital_id=%s)"
            " AND d.doctor_is_active=1",
            [doctor_id, hospital_id, hospital_id]
        )
        if not cursor.fetchone():
            return JsonResponse({'status': 'error', 'message': 'Doctor is not available at this hospital.'}, status=400)

        # Prevent double-booking
        cursor.execute(
            "SELECT 1 FROM tbl_appointment WHERE doctor_id=%s AND appointment_date=%s"
            " AND appointment_time=%s AND appointment_status IN ('Pending','Confirmed')",
            [doctor_id, data['appointment_date'], data['appointment_time']]
        )
        if cursor.fetchone():
            return JsonResponse({'status': 'error', 'message': 'This appointment time is no longer available.'}, status=409)

        cursor.execute(
            "INSERT INTO tbl_appointment"
            " (patient_id, hospital_id, department_id, doctor_id, appointment_date,"
            " appointment_time, reason, created_by_user_id, appointment_status)"
            " VALUES (%s,%s,%s,%s,%s,%s,%s,%s,'Pending')",
            [patient_id, hospital_id, department_id, doctor_id,
             data['appointment_date'], data['appointment_time'],
             (data.get('reason') or '').strip(), user['user_id']]
        )
    return JsonResponse({'status': 'success', 'message': 'Appointment booked successfully.'})


@csrf_exempt
def visits(request):
    user, error = require_roles(request, 'doctor')
    if error:
        return error
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)
    ensure_workflow_schema()
    data = payload(request)
    patient_param = data.get('patient_id') or data.get('health_id')
    raw_appointment_id = data.get('appointment_id')

    appointment_id = None
    if raw_appointment_id and str(raw_appointment_id).strip() not in ('', 'null', 'undefined', 'None', '0'):
        try:
            appointment_id = int(raw_appointment_id)
        except (ValueError, TypeError):
            appointment_id = None

    if not patient_param:
        return JsonResponse({'status': 'error', 'message': 'Patient is required.'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT patient_id FROM tbl_patient WHERE patient_id=%s OR patient_uid=%s LIMIT 1",
            [patient_param, patient_param]
        )
        p_row = cursor.fetchone()
        if not p_row:
            return JsonResponse({'status': 'error', 'message': 'Patient record not found.'}, status=404)
        patient_id = p_row[0]

        # If an explicit appointment_id was provided, verify it belongs to this doctor & hospital
        if appointment_id:
            cursor.execute(
                "SELECT appointment_id FROM tbl_appointment WHERE appointment_id=%s AND doctor_id=%s AND hospital_id=%s",
                [appointment_id, user['doctor_id'], user['hospital_id']]
            )
            if not cursor.fetchone():
                appointment_id = None

        # If no valid appointment_id was found/passed, look for any existing appointment for this patient with this doctor at this hospital
        if not appointment_id:
            cursor.execute(
                "SELECT appointment_id FROM tbl_appointment WHERE patient_id=%s AND doctor_id=%s AND hospital_id=%s"
                " ORDER BY (appointment_status IN ('Pending','Confirmed')) DESC, appointment_id DESC LIMIT 1",
                [patient_id, user['doctor_id'], user['hospital_id']]
            )
            app_row = cursor.fetchone()
            if app_row:
                appointment_id = app_row[0]

        # If still no appointment exists (e.g. direct walk-in consultation), auto-create an appointment record
        if not appointment_id:
            cursor.execute(
                "INSERT INTO tbl_appointment (patient_id, hospital_id, doctor_id, appointment_date, appointment_time, reason, created_by_user_id, appointment_status)"
                " VALUES (%s, %s, %s, CURRENT_DATE(), DATE_FORMAT(NOW(), '%%H:%%i'), %s, %s, 'Completed')",
                [patient_id, user['hospital_id'], user['doctor_id'], (data.get('diagnosis') or 'Walk-in Visit').strip(), user['user_id']]
            )
            appointment_id = cursor.lastrowid

        # Insert clinical visit record
        cursor.execute(
            "INSERT INTO tbl_patient_visit (patient_id, doctor_id, hospital_id, appointment_id, diagnosis, medical_notes)"
            " VALUES (%s,%s,%s,%s,%s,%s)",
            [patient_id, user['doctor_id'], user['hospital_id'], appointment_id,
             (data.get('diagnosis') or '').strip(), (data.get('medical_notes') or '').strip()]
        )

        # Mark appointment as completed
        cursor.execute(
            "UPDATE tbl_appointment SET appointment_status='Completed'"
            " WHERE appointment_id=%s AND doctor_id=%s AND hospital_id=%s",
            [appointment_id, user['doctor_id'], user['hospital_id']]
        )

    return JsonResponse({'status': 'success', 'message': 'Patient visit saved successfully.'})
