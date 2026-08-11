import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import connection
from .models import SuperAdmin, Hospital
from django.contrib.auth.hashers import check_password

@csrf_exempt
def super_admin_login(request):
    """
    Super Admin Login API
    Validates email and password against tbl_super_admin.
    Checks admin_is_active = TRUE.
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
    # Debug: log received credentials (development only)
    print(f'DEBUG: Received email={email}, password={password}')

    # Field Validations
    if not email:
        return JsonResponse({'status': 'error', 'message': 'Email Required'}, status=400)
    if not password:
        return JsonResponse({'status': 'error', 'message': 'Password Required'}, status=400)

    try:
        # Step 1: Search tbl_super_admin using admin_email (case-insensitive)
        admin_qs = SuperAdmin.objects.filter(admin_email__iexact=email)
        if not admin_qs.exists():
            # User not found → Invalid Email or Password
            return JsonResponse({'status': 'error', 'message': 'Invalid Email or Password'}, status=401)
        admin = admin_qs.first()
        # Debug: log admin fields (development only)
        print(f'DEBUG: admin.id={admin.admin_id}, name={admin.admin_name}, email={admin.admin_email}, is_active={admin.admin_is_active}, password={admin.admin_password}')
        # Debug: log stored password (only in development)
        print(f'DEBUG: Retrieved SuperAdmin password hash/value: {admin.admin_password}')
    except SuperAdmin.DoesNotExist:
        # User not found -> Invalid Email or Password
        return JsonResponse({'status': 'error', 'message': 'Invalid Email or Password'}, status=401)

    # Step 2: Verify admin_password using Django's password hasher
    stored_pass = admin.admin_password.strip()
    password_valid = check_password(password, stored_pass)
    # Fallback to plain comparison if hashing fails
    if not password_valid and stored_pass == password:
        password_valid = True
    # Debug: print verification result
    print(f'DEBUG: password_valid={password_valid}, provided={password}, stored={stored_pass}')

    if not password_valid:
        return JsonResponse({'status': 'error', 'message': 'Invalid Email or Password'}, status=401)

    # Step 3: Check admin_is_active = TRUE
    if not admin.admin_is_active:
        return JsonResponse({'status': 'error', 'message': 'Account is inactive. Please contact system administrator.'}, status=403)

    # Login succeeds -> Create user session
    request.session['admin_id'] = admin.admin_id
    request.session['admin_name'] = admin.admin_name
    request.session.modified = True

    return JsonResponse({
        'status': 'success',
        'message': 'Login successful',
        'admin_id': admin.admin_id,
        'admin_name': admin.admin_name,
        'admin_email': admin.admin_email
    })


@csrf_exempt
def super_admin_logout(request):
    """
    Destroys session and logs out super admin.
    """
    request.session.flush()
    return JsonResponse({'status': 'success', 'message': 'Session destroyed successfully.'})


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
        first_admin = SuperAdmin.objects.filter(admin_is_active=True).first()
        if first_admin:
            admin_name = first_admin.admin_name
            admin_id = first_admin.admin_id
        else:
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
            SELECT hospital_id, hospital_uid, hospital_name, hospital_email, 
                   hospital_phone, hospital_address, hospital_status, hospital_is_active, hospital_created_at
            FROM tbl_hospital
            WHERE hospital_status = 'Pending'
            ORDER BY hospital_id DESC
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

    with connection.cursor() as cursor:
        cursor.execute("SELECT COALESCE(MAX(hospital_id), 1000) FROM tbl_hospital")
        max_id = cursor.fetchone()[0]
        new_uid = f"HOSP-{max_id + 1}"

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
    Public hospital registration endpoint.
    Inserts hospital into tbl_hospital with hospital_status='Pending' and hospital_is_active=0.
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

    name = (data.get('hospital_name') or data.get('name') or '').strip()
    email = (data.get('adminEmail') or data.get('admin_email') or data.get('hospital_email') or data.get('email') or '').strip()
    phone = (data.get('contactNumber') or data.get('hospital_phone') or data.get('phone') or data.get('contact') or data.get('adminPhone') or '').strip()
    address = (data.get('hospital_address') or data.get('address') or '').strip()
    password = (data.get('adminPassword') or data.get('password') or '').strip()

    if not name:
        return JsonResponse({'status': 'error', 'message': 'Hospital Name is required'}, status=400)
    if not email:
        return JsonResponse({'status': 'error', 'message': 'Admin Email is required'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute("SELECT COALESCE(MAX(hospital_id), 1000) FROM tbl_hospital")
        max_id = cursor.fetchone()[0]
        new_uid = f"HOSP-{max_id + 1}"

        cursor.execute("""
            INSERT INTO tbl_hospital (hospital_uid, hospital_name, hospital_email, hospital_phone, hospital_address, hospital_status, hospital_is_active)
            VALUES (%s, %s, %s, %s, %s, 'Pending', 0)
        """, [new_uid, name, email, phone, address])
        
        hospital_id = cursor.lastrowid

    return JsonResponse({
        'status': 'success',
        'message': 'Hospital registration submitted successfully! Sent to Super Admin for approval.',
        'hospital': {
            'id': new_uid,
            'hospital_id': hospital_id,
            'hospital_uid': new_uid,
            'name': name,
            'hospital_name': name,
            'adminEmail': email,
            'email': email,
            'password': password,
            'phone': phone,
            'address': address,
            'status': 'Pending',
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
def get_doctors(request):
    """
    Retrieves doctors from MySQL (tbl_doctor JOIN tbl_user).
    """
    if request.method != 'GET':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    hospital_id = request.GET.get('hospital_id')

    sql = """
        SELECT d.doctor_id, d.hospital_id, d.doctor_license_no, d.specialization, d.doctor_is_active,
               u.user_name, u.user_email, u.user_phone, u.user_password, d.doctor_created_at
        FROM tbl_doctor d
        JOIN tbl_user u ON d.user_id = u.user_id
    """
    params = []
    if hospital_id and hospital_id != 'null' and hospital_id != 'undefined':
        sql += " WHERE d.hospital_id = %s"
        params.append(hospital_id)
    
    sql += " ORDER BY d.doctor_id DESC"

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = cursor.fetchall()

    doctors_list = []
    for r in rows:
        doc_uid = f"DOC-{r[0]}"
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
            'name': r[5],
            'email': r[6],
            'phone': r[7],
            'password': doc_uid, # Doctor's ID is the password for doctor login
            'created_at': r[9].strftime('%Y-%m-%d') if r[9] else ''
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

    hospital_id_param = data.get('hospital_id')
    name = (data.get('name') or data.get('docName') or '').strip()
    email = (data.get('email') or data.get('docEmail') or '').strip()
    phone = (data.get('phone') or data.get('docPhone') or '').strip()
    specialization = (data.get('specialization') or data.get('department') or 'General Medicine').strip()
    license_no = (data.get('license') or data.get('license_no') or '').strip()

    if not name or not email:
        return JsonResponse({'status': 'error', 'message': 'Doctor Name and Email are required'}, status=400)

    if not license_no:
        license_no = f"LIC-{name[:3].upper()}-001"

    # Resolve valid hospital_id integer from tbl_hospital
    valid_hospital_id = None
    with connection.cursor() as cursor:
        if hospital_id_param:
            cursor.execute("""
                SELECT hospital_id FROM tbl_hospital 
                WHERE hospital_id = %s OR hospital_uid = %s 
                LIMIT 1
            """, [hospital_id_param if str(hospital_id_param).isdigit() else -1, str(hospital_id_param)])
            row = cursor.fetchone()
            if row:
                valid_hospital_id = row[0]

        if not valid_hospital_id:
            cursor.execute("SELECT hospital_id FROM tbl_hospital ORDER BY hospital_id DESC LIMIT 1")
            last_row = cursor.fetchone()
            if last_row:
                valid_hospital_id = last_row[0]

    with connection.cursor() as cursor:
        # Step 1: Create user record in tbl_user
        cursor.execute("""
            INSERT INTO tbl_user (hospital_id, role_id, user_name, user_email, user_phone, user_password, user_is_active)
            VALUES (%s, 2, %s, %s, %s, 'PENDING_DOC_ID', 1)
        """, [valid_hospital_id, name, email, phone])
        user_id = cursor.lastrowid

        # Step 2: Create doctor record in tbl_doctor
        # Ensure default department exists in tbl_department
        cursor.execute("SELECT department_id FROM tbl_department LIMIT 1")
        dept_row = cursor.fetchone()
        dept_id = dept_row[0] if dept_row else 1

        cursor.execute("""
            INSERT INTO tbl_doctor (user_id, hospital_id, department_id, doctor_license_no, specialization, doctor_is_active)
            VALUES (%s, %s, %s, %s, %s, 1)
        """, [user_id, valid_hospital_id or 1, dept_id, license_no, specialization])
        doctor_id = cursor.lastrowid

        # Step 3: Set doctor's ID as the password for doctor login (e.g. DOC-1001)
        doc_uid = f"DOC-{doctor_id}"
        cursor.execute("UPDATE tbl_user SET user_password = %s WHERE user_id = %s", [doc_uid, user_id])

    return JsonResponse({
        'status': 'success',
        'message': f'Doctor registered in MySQL! Doctor ID & Password: {doc_uid}',
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
            'password': doc_uid
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

    doctor_id = data.get('doctor_id') or data.get('id')
    if not doctor_id:
        return JsonResponse({'status': 'error', 'message': 'Doctor ID required'}, status=400)

    if isinstance(doctor_id, str) and doctor_id.startswith('DOC-'):
        doctor_id = int(doctor_id.replace('DOC-', ''))

    with connection.cursor() as cursor:
        cursor.execute("SELECT user_id FROM tbl_doctor WHERE doctor_id = %s", [doctor_id])
        row = cursor.fetchone()
        user_id = row[0] if row else None

        cursor.execute("DELETE FROM tbl_doctor WHERE doctor_id = %s", [doctor_id])
        if user_id:
            cursor.execute("DELETE FROM tbl_user WHERE user_id = %s", [user_id])

    return JsonResponse({
        'status': 'success',
        'message': 'Doctor deleted successfully from MySQL.'
    })


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
            SELECT d.doctor_id, d.hospital_id, d.doctor_license_no, d.specialization,
                   u.user_name, u.user_email, u.user_phone, u.user_password
            FROM tbl_doctor d
            JOIN tbl_user u ON d.user_id = u.user_id
            WHERE d.doctor_id = %s
        """, [doctor_id_num])
        row = cursor.fetchone()

    if not row:
        return JsonResponse({'status': 'error', 'message': 'Doctor ID not found in MySQL database.'}, status=404)

@csrf_exempt
def super_admin_debug(request):
    """Debug endpoint: return admin data for given email (development only)."""
    if request.method != 'GET':
        return JsonResponse({'status':'error','message':'Invalid HTTP method.'},status=405)
    email = request.GET.get('email','').strip()
    if not email:
        return JsonResponse({'status':'error','message':'Email required'},status=400)
    try:
        admin = SuperAdmin.objects.get(admin_email=email)
        return JsonResponse({
            'status':'success',
            'admin_id':admin.admin_id,
            'admin_name':admin.admin_name,
            'admin_email':admin.admin_email,
            'password':admin.password,
            'admin_is_active':admin.admin_is_active,
        })
    except SuperAdmin.DoesNotExist:
        return JsonResponse({'status':'error','message':'Admin not found'},status=404)

    doc_uid = f"DOC-{row[0]}"
    expected_password = row[7]

    if password_input != doc_uid and password_input != expected_password and password_input != str(row[0]):
        return JsonResponse({'status': 'error', 'message': 'Invalid Password. Use your Doctor ID as your password.'}, status=401)

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
            'license': row[2]
        }
    })



