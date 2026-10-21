"""Role-scoped clinical workflow APIs for the legacy UniCare schema.

These views use the core MySQL tables: tbl_appointment, tbl_doctor,
tbl_patient_profile, and tbl_patient_visit.  The removed tables
(tbl_clinical_appointment, tbl_doctor_hospital) have been consolidated
into tbl_appointment (with hospital_id/department_id columns) and
tbl_doctor (with a hospital_id column).
"""
import json
from datetime import datetime, date

# pyrefly: ignore [missing-import]
from django.contrib.auth.hashers import make_password  # type: ignore
from django.db import connection, transaction  # type: ignore
from django.http import JsonResponse  # type: ignore
from django.views.decorators.csrf import csrf_exempt  # type: ignore

from .views import is_valid_phone, is_valid_email, verify_password_and_upgrade  # type: ignore



def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip or '127.0.0.1'


def log_audit(user_id, action, module, ip_address='127.0.0.1'):
    """Record an immutable audit event in tbl_audit_log."""
    if not user_id:
        return
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO tbl_audit_log (user_id, audit_action, audit_module, audit_ip_address, audit_datetime) "
                "VALUES (%s, %s, %s, %s, %s)",
                [user_id, str(action)[:200], str(module)[:100], str(ip_address)[:50], datetime.now()]
            )
    except Exception:
        pass


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
    """Ensure the patient_profile, patient_visit, audit_log, and support tables exist with required columns."""
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
        cursor.execute("""CREATE TABLE IF NOT EXISTS tbl_audit_log (
            audit_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            audit_action VARCHAR(200) NOT NULL,
            audit_module VARCHAR(100) NOT NULL,
            audit_ip_address VARCHAR(50) NULL,
            audit_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )""")
        # Ensure tbl_patient and tbl_patient_profile have allergies column
        _ensure_columns(cursor, 'tbl_patient', {
            'allergies': 'TEXT NULL',
        })
        # Ensure tbl_patient_profile has all required columns (table may pre-exist with a different schema)
        _ensure_columns(cursor, 'tbl_patient_profile', {
            'user_id': 'INT NULL',
            'health_id': 'VARCHAR(40) NULL',
            'date_of_birth': 'DATE NULL',
            'gender': 'VARCHAR(30) NULL',
            'address': 'TEXT NULL',
            'allergies': 'TEXT NULL',
            'patient_is_active': 'TINYINT(1) NOT NULL DEFAULT 1',
            'created_at': 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
        })
        try:
            cursor.execute("ALTER TABLE tbl_patient MODIFY COLUMN patient_email VARCHAR(100) NULL")
        except Exception:
            pass
        # Ensure tbl_patient_visit has all required columns including pre-consultation vitals and share flag
        _ensure_columns(cursor, 'tbl_patient_visit', {
            'patient_id': 'INT NOT NULL',
            'doctor_id': 'INT NOT NULL',
            'hospital_id': 'INT NOT NULL',
            'appointment_id': 'INT NULL',
            'diagnosis': 'TEXT NULL',
            'medical_notes': 'TEXT NULL',
            'visited_at': 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
            'height': 'VARCHAR(20) NULL',
            'weight': 'VARCHAR(20) NULL',
            'blood_pressure': 'VARCHAR(30) NULL',
            'vitals_recorded_by': 'INT NULL',
            'vitals_recorded_at': 'DATETIME NULL',
            'record_share_flag': 'TINYINT(1) DEFAULT 0',
            'visit_type': "VARCHAR(20) NOT NULL DEFAULT 'OP'",
            'admission_id': 'INT NULL',
        })
        try:
            cursor.execute("ALTER TABLE tbl_patient_visit MODIFY COLUMN appointment_id INT NULL DEFAULT NULL")
        except Exception:
            pass
        cursor.execute("""CREATE TABLE IF NOT EXISTS tbl_admission (
            admission_id INT AUTO_INCREMENT PRIMARY KEY,
            admission_uid VARCHAR(30) NULL,
            patient_id INT NOT NULL,
            hospital_id INT NOT NULL,
            admitting_doctor_id INT NOT NULL,
            admission_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            admission_status VARCHAR(30) NOT NULL DEFAULT 'Admitted',
            discharge_date DATETIME NULL,
            ward_bed VARCHAR(50) NULL,
            admission_reason TEXT NULL,
            discharge_summary TEXT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )""")
        _ensure_columns(cursor, 'tbl_admission', {
            'admission_uid': 'VARCHAR(30) NULL',
            'ward_bed': 'VARCHAR(50) NULL',
            'admission_reason': 'TEXT NULL',
            'discharge_summary': 'TEXT NULL',
            'discharge_date': 'DATETIME NULL',
            'admission_status': "VARCHAR(30) NOT NULL DEFAULT 'Admitted'",
        })
        _ensure_columns(cursor, 'tbl_prescription', {
            'admission_id': 'INT NULL',
        })
        _ensure_columns(cursor, 'tbl_lab_report', {
            'admission_id': 'INT NULL',
            'visit_id': 'INT NULL',
        })
        _ensure_columns(cursor, 'tbl_user', {
            'user_recovery_question': 'VARCHAR(255) NULL',
            'user_recovery_answer': 'VARCHAR(255) NULL',
            'must_change_password': 'TINYINT(1) NOT NULL DEFAULT 0',
        })
        # Ensure Nurse role exists in tbl_role
        try:
            cursor.execute("SELECT role_id FROM tbl_role WHERE LOWER(REPLACE(role_name,' ',''))='nurse' LIMIT 1")
            if not cursor.fetchone():
                cursor.execute("INSERT INTO tbl_role (role_name, role_is_active) VALUES ('Nurse', 1)")
        except Exception:
            pass

        # Ensure tbl_nurse exists
        cursor.execute("""CREATE TABLE IF NOT EXISTS tbl_nurse (
            nurse_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            hospital_id INT NOT NULL,
            department_id INT NULL,
            nurse_is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )""")

        # Drop UNIQUE constraints on tbl_patient.patient_phone and tbl_user.user_phone to allow shared family phone numbers
        try:
            cursor.execute("""
                SELECT INDEX_NAME FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tbl_patient'
                AND COLUMN_NAME='patient_phone' AND NON_UNIQUE=0
            """)
            p_rows = cursor.fetchall()
            for r in p_rows:
                if r[0] != 'PRIMARY':
                    cursor.execute(f"ALTER TABLE tbl_patient DROP INDEX `{r[0]}`")
            # Ensure non-unique index exists for performance
            cursor.execute("""
                SELECT 1 FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tbl_patient'
                AND COLUMN_NAME='patient_phone' LIMIT 1
            """)
            if not cursor.fetchone():
                cursor.execute("ALTER TABLE tbl_patient ADD INDEX idx_patient_phone (patient_phone)")
        except Exception:
            pass

        try:
            cursor.execute("""
                SELECT INDEX_NAME FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tbl_user'
                AND COLUMN_NAME='user_phone' AND NON_UNIQUE=0
            """)
            u_rows = cursor.fetchall()
            for r in u_rows:
                if r[0] != 'PRIMARY':
                    cursor.execute(f"ALTER TABLE tbl_user DROP INDEX `{r[0]}`")
            # Ensure non-unique index exists for performance
            cursor.execute("""
                SELECT 1 FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tbl_user'
                AND COLUMN_NAME='user_phone' LIMIT 1
            """)
            if not cursor.fetchone():
                cursor.execute("ALTER TABLE tbl_user ADD INDEX idx_user_phone (user_phone)")
        except Exception:
            pass

        # Ensure doctor_experience column exists (added during schema extension)
        cursor.execute("""SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tbl_doctor' AND COLUMN_NAME='doctor_experience'""")
        if not cursor.fetchone()[0]:
            cursor.execute("ALTER TABLE tbl_doctor ADD COLUMN doctor_experience VARCHAR(100) NULL")
        cursor.execute("""CREATE TABLE IF NOT EXISTS tbl_prescription (
            prescription_id INT AUTO_INCREMENT PRIMARY KEY, patient_id INT NULL, doctor_id INT NULL,
            hospital_id INT NULL, appointment_id INT NULL, visit_id INT NULL, record_id INT NULL,
            prescription_date DATE NULL, remarks TEXT NULL, prescription_share_flag TINYINT(1) DEFAULT 0,
            prescription_is_active TINYINT(1) DEFAULT 1, prescription_created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )""")
        cursor.execute("""CREATE TABLE IF NOT EXISTS tbl_prescription_item (
            prescription_item_id INT AUTO_INCREMENT PRIMARY KEY, prescription_id INT NOT NULL,
            medicine_name VARCHAR(100) NOT NULL, medicine_dosage VARCHAR(50) NULL,
            medicine_frequency VARCHAR(50) NULL, medicine_duration VARCHAR(50) NULL, medicine_instruction TEXT NULL
        )""")
        cursor.execute("""CREATE TABLE IF NOT EXISTS tbl_lab_report (
            lab_report_id INT AUTO_INCREMENT PRIMARY KEY, patient_id INT NULL, doctor_id INT NULL,
            hospital_id INT NULL, appointment_id INT NULL, record_id INT NULL,
            report_type VARCHAR(100) NOT NULL, report_title VARCHAR(150) NOT NULL, report_file LONGTEXT NULL,
            report_share_flag TINYINT(1) DEFAULT 0, report_is_active TINYINT(1) DEFAULT 1,
            report_uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )""")
        # Ensure tbl_prescription and tbl_lab_report support columns exist
        _ensure_columns(cursor, 'tbl_prescription', {
            'patient_id': 'INT NULL',
            'doctor_id': 'INT NULL',
            'hospital_id': 'INT NULL',
            'appointment_id': 'INT NULL',
            'visit_id': 'INT NULL',
            'record_id': 'INT NULL',
            'prescription_date': 'DATE NULL',
            'remarks': 'TEXT NULL',
            'prescription_share_flag': 'TINYINT(1) DEFAULT 0',
            'prescription_is_active': 'TINYINT(1) DEFAULT 1',
            'prescription_created_at': 'DATETIME DEFAULT CURRENT_TIMESTAMP',
        })
        try:
            cursor.execute("ALTER TABLE tbl_prescription MODIFY COLUMN record_id INT NULL DEFAULT NULL")
        except Exception:
            pass
        _ensure_columns(cursor, 'tbl_prescription_item', {
            'prescription_id': 'INT NOT NULL',
            'medicine_name': 'VARCHAR(100) NOT NULL',
            'medicine_dosage': 'VARCHAR(50) NULL',
            'medicine_frequency': 'VARCHAR(50) NULL',
            'medicine_duration': 'VARCHAR(50) NULL',
            'medicine_instruction': 'TEXT NULL',
        })
        _ensure_columns(cursor, 'tbl_lab_report', {
            'patient_id': 'INT NULL',
            'doctor_id': 'INT NULL',
            'hospital_id': 'INT NULL',
            'appointment_id': 'INT NULL',
            'record_id': 'INT NULL',
            'report_type': 'VARCHAR(100) NOT NULL',
            'report_title': 'VARCHAR(150) NOT NULL',
            'report_file': 'LONGTEXT NULL',
            'report_share_flag': 'TINYINT(1) DEFAULT 0',
            'report_is_active': 'TINYINT(1) DEFAULT 1',
            'report_uploaded_at': 'DATETIME DEFAULT CURRENT_TIMESTAMP',
        })
        try:
            cursor.execute("ALTER TABLE tbl_lab_report MODIFY COLUMN record_id INT NULL DEFAULT NULL")
        except Exception:
            pass


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
        else:
            admin_id = request.session.get('admin_id')
            if admin_id:
                user_id = admin_id
                role = 'super-admin'
                hospital_id = None
    if not user_id or not role:
        return None, JsonResponse({'status': 'error', 'message': 'Please sign in.'}, status=401)

    doctor_id = request.session.get('unicare_doctor_id')
    patient_id = request.session.get('unicare_patient_id')
    nurse_id = request.session.get('unicare_nurse_id')

    if role == 'patient' and not patient_id:
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT patient_id FROM tbl_patient WHERE user_id=%s LIMIT 1", [user_id])
                pr = cursor.fetchone()
                if pr:
                    patient_id = pr[0]
                    request.session['unicare_patient_id'] = patient_id
        except Exception:
            pass

    if role == 'doctor' and not doctor_id:
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT doctor_id FROM tbl_doctor WHERE user_id=%s LIMIT 1", [user_id])
                dr = cursor.fetchone()
                if dr:
                    doctor_id = dr[0]
                    request.session['unicare_doctor_id'] = doctor_id
        except Exception:
            pass

    if role == 'nurse' and not nurse_id:
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT nurse_id FROM tbl_nurse WHERE user_id=%s LIMIT 1", [user_id])
                nr = cursor.fetchone()
                if nr:
                    nurse_id = nr[0]
                    request.session['unicare_nurse_id'] = nurse_id
        except Exception:
            pass

    return {
        'user_id': user_id,
        'role': role,
        'hospital_id': hospital_id,
        'doctor_id': doctor_id,
        'patient_id': patient_id,
        'nurse_id': nurse_id,
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
    identifier = (data.get('identifier') or data.get('email') or data.get('phone') or data.get('health_id') or '').strip()
    password = (data.get('password') or '').strip()
    if not identifier or not password:
        return JsonResponse({'status': 'error', 'message': 'Email, Health ID, or phone number and password are required.'}, status=400)

    with connection.cursor() as cursor:
        # Check if identifier matches a patient Health ID / patient_uid
        cursor.execute("SELECT user_id FROM tbl_patient WHERE LOWER(patient_uid)=LOWER(%s) LIMIT 1", [identifier])
        p_row = cursor.fetchone()
        if not p_row:
            try:
                cursor.execute("SELECT user_id FROM tbl_patient_profile WHERE LOWER(health_id)=LOWER(%s) LIMIT 1", [identifier])
                p_row = cursor.fetchone()
            except Exception:
                pass

        if p_row:
            cursor.execute(
                "SELECT u.user_id, u.hospital_id, u.role_id, u.user_name, u.user_email, u.user_phone, u.user_password,"
                " r.role_name, COALESCE(u.must_change_password, 0), u.user_recovery_question, u.user_recovery_answer"
                " FROM tbl_user u JOIN tbl_role r ON r.role_id=u.role_id"
                " WHERE u.user_id=%s AND u.user_is_active=1 LIMIT 1",
                [p_row[0]]
            )
            row = cursor.fetchone()
        else:
            cursor.execute(
                "SELECT u.user_id, u.hospital_id, u.role_id, u.user_name, u.user_email, u.user_phone, u.user_password,"
                " r.role_name, COALESCE(u.must_change_password, 0), u.user_recovery_question, u.user_recovery_answer"
                " FROM tbl_user u JOIN tbl_role r ON r.role_id=u.role_id"
                " WHERE (LOWER(u.user_email)=LOWER(%s) OR u.user_phone=%s) AND u.user_is_active=1 LIMIT 1",
                [identifier, identifier]
            )
            row = cursor.fetchone()
            if row:
                norm_role = (row[7] or '').lower().replace(' ', '').replace('_', '')
                if norm_role == 'patient' and (is_valid_phone(identifier) or identifier.isdigit()):
                    return JsonResponse({
                        'status': 'error',
                        'message': 'Patient accounts must log in using your unique Health ID (e.g. PTA001) and Password. Phone number login is disabled for shared family accounts.'
                    }, status=400)

    if not row or not verify_password_and_upgrade(row[0], password, row[6]):
        return JsonResponse({'status': 'error', 'message': 'Invalid login credentials.'}, status=401)

    normalized = (row[7] or '').lower().replace(' ', '').replace('_', '')
    role = {
        'doctor': 'doctor',
        'receptionist': 'receptionist',
        'nurse': 'nurse',
        'clinicalstaff': 'nurse',
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

        elif role == 'nurse':
            cursor.execute(
                "SELECT nurse_id, hospital_id, department_id FROM tbl_nurse WHERE user_id=%s",
                [row[0]]
            )
            n_row = cursor.fetchone()
            n_hosp_id = (n_row[1] if n_row else None) or row[1]
            profile['nurse_id'] = n_row[0] if n_row else None
            profile['hospital_id'] = n_hosp_id
            request.session['unicare_nurse_id'] = n_row[0] if n_row else None
            request.session['unicare_hospital_id'] = n_hosp_id
            if n_hosp_id:
                cursor.execute("SELECT hospital_name FROM tbl_hospital WHERE hospital_id=%s", [n_hosp_id])
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
    log_audit(row[0], f"User signed in successfully as {role}", "Authentication", get_client_ip(request))
    return JsonResponse({'status': 'success', 'user': profile})


@csrf_exempt
def logout(request):
    u_id = request.session.get('unicare_user_id') or request.session.get('hospital_admin_user_id') or request.session.get('admin_id')
    if u_id:
        log_audit(u_id, "User signed out", "Authentication", get_client_ip(request))
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
                        'doctor_id': user['doctor_id'],
                        'specialization': d[0], 'license': d[1], 'experience': d[2] or '',
                        'hospital_name': d[3] or result.get('hospital_name', ''),
                    })
                else:
                    result['doctor_id'] = user['doctor_id']
            elif user['role'] == 'nurse':
                result['nurse_id'] = user.get('nurse_id')
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
        if cursor.fetchone():
            continue
        try:
            cursor.execute("SELECT 1 FROM tbl_patient_profile WHERE health_id=%s LIMIT 1", [candidate])
            if cursor.fetchone():
                continue
        except Exception:
            pass
        return candidate
    raise RuntimeError("Could not generate a unique patient_uid — space exhausted.")


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
    if email and not is_valid_email(email):
        return JsonResponse({'status': 'error', 'message': 'Enter a valid email address.'}, status=400)
    if phone and not is_valid_phone(phone):
        return JsonResponse({'status': 'error', 'message': 'Enter a valid 10-digit phone number.'}, status=400)
    if emergency_contact and not is_valid_phone(emergency_contact):
        return JsonResponse({'status': 'error', 'message': 'Enter a valid 10-digit emergency contact number.'}, status=400)
    if not dob:
        return JsonResponse({'status': 'error', 'message': 'Date of birth is required.'}, status=400)
    try:
        dob_val = date.fromisoformat(str(dob))
        if dob_val > date.today():
            return JsonResponse({'status': 'error', 'message': 'Date of birth cannot be in the future.'}, status=400)
    except (ValueError, TypeError):
        return JsonResponse({'status': 'error', 'message': 'Invalid date of birth format. Use YYYY-MM-DD.'}, status=400)
    if not gender or gender not in ('Male', 'Female', 'Other'):
        return JsonResponse({'status': 'error', 'message': 'Gender must be Male, Female, or Other.'}, status=400)
    if blood_group and blood_group not in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'):
        return JsonResponse({'status': 'error', 'message': 'Invalid blood group selected.'}, status=400)

    try:
        with transaction.atomic(), connection.cursor() as cursor:
            # 1. Identify unique individual using Name + Date of Birth + Gender
            cursor.execute(
                "SELECT p.patient_id, p.patient_uid, p.patient_name, p.patient_email, p.patient_phone,"
                " p.patient_dob, p.patient_gender, p.patient_blood_group, p.patient_address, p.patient_emergency_contact"
                " FROM tbl_patient p"
                " WHERE LOWER(TRIM(p.patient_name))=LOWER(TRIM(%s)) AND p.patient_dob=%s AND p.patient_gender=%s LIMIT 1",
                [name, dob, gender]
            )
            existing_row = cursor.fetchone()

            # If not matched by Name+DOB+Gender, also check if email matches an existing patient
            if not existing_row and email:
                cursor.execute(
                    "SELECT p.patient_id, p.patient_uid, p.patient_name, p.patient_email, p.patient_phone,"
                    " p.patient_dob, p.patient_gender, p.patient_blood_group, p.patient_address, p.patient_emergency_contact"
                    " FROM tbl_patient p WHERE LOWER(p.patient_email)=LOWER(%s) LIMIT 1",
                    [email]
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

            # 2. Check if phone is shared with another existing patient (family sharing)
            if phone:
                cursor.execute("SELECT 1 FROM tbl_patient WHERE patient_phone=%s LIMIT 1", [phone])
                if cursor.fetchone():
                    confirm_shared_phone = bool(data.get('confirm_shared_phone'))
                    if not confirm_shared_phone:
                        return JsonResponse({
                            'status': 'confirm_required',
                            'shared_phone': True,
                            'message': 'This contact number is already registered under an existing family member. Would you like to register this individual as a new family member under this shared contact number?'
                        })

            # Check if email is used by an existing user in tbl_user
            if email:
                cursor.execute("SELECT user_id, user_name, role_id FROM tbl_user WHERE LOWER(user_email)=LOWER(%s) LIMIT 1", [email])
                existing_user = cursor.fetchone()
                if existing_user:
                    return JsonResponse({'status': 'error', 'message': f"A user account with email '{email}' already exists in the system."}, status=400)

            # Ensure phone is not registered to a hospital staff/doctor/admin
            if phone:
                cursor.execute(
                    "SELECT u.user_id, r.role_name FROM tbl_user u"
                    " JOIN tbl_role r ON r.role_id=u.role_id"
                    " WHERE u.user_phone=%s AND LOWER(REPLACE(r.role_name,' ',''))!='patient' LIMIT 1",
                    [phone]
                )
                existing_staff_phone = cursor.fetchone()
                if existing_staff_phone:
                    return JsonResponse({'status': 'error', 'message': f"Phone number '{phone}' is registered to a staff account ({existing_staff_phone[1]}). Please provide a patient contact number."}, status=400)

            if not password:
                password = 'Patient@123'
            elif len(password) < 8:
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
            last_uid = last_row[0] if last_row else None
            if not last_uid:
                try:
                    cursor.execute("SELECT health_id FROM tbl_patient_profile ORDER BY patient_id DESC LIMIT 1")
                    prof_row = cursor.fetchone()
                    if prof_row:
                        last_uid = prof_row[0]
                except Exception:
                    pass
            patient_uid = _next_patient_uid(last_uid, cursor)

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

        log_audit(user['user_id'], f"Registered new patient ({name}, Health ID: {patient_uid})", "Patient Registration", get_client_ip(request))

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
    except Exception as exc:
        import traceback
        traceback.print_exc()
        msg = str(exc)
        if 'Duplicate entry' in msg:
            if 'user_email' in msg or 'patient_email' in msg:
                return JsonResponse({'status': 'error', 'message': f"A patient or user with email '{email}' already exists."}, status=400)
            if 'user_phone' in msg or 'patient_phone' in msg:
                return JsonResponse({'status': 'error', 'message': f"A patient or user with phone '{phone}' already exists."}, status=400)
            return JsonResponse({'status': 'error', 'message': 'Duplicate record detected with provided details.'}, status=400)
        return JsonResponse({'status': 'error', 'message': f'Failed to register patient: {msg}'}, status=500)


def patient_lookup(request):
    user, error = require_roles(request, 'doctor', 'receptionist', 'hospital-admin', 'nurse', 'super-admin')
    if error:
        return error
    health_id = (request.GET.get('health_id') or request.GET.get('patient_uid') or '').strip()
    if not health_id:
        return JsonResponse({'status': 'error', 'message': 'Health ID is required.'}, status=400)
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT p.patient_id, p.patient_uid, p.patient_name, p.patient_email, p.patient_phone,"
            " p.patient_dob, p.patient_gender, p.patient_blood_group, p.patient_address, p.patient_emergency_contact, p.allergies"
            " FROM tbl_patient p WHERE (LOWER(p.patient_uid)=LOWER(%s) OR LOWER(p.patient_email)=LOWER(%s) OR p.patient_phone=%s)",
            [health_id, health_id, health_id]
        )
        row = cursor.fetchone()
        if not row:
            cursor.execute(
                "SELECT p.patient_id, p.health_id, u.user_name, u.user_email, u.user_phone, p.date_of_birth, p.gender, p.allergies"
                " FROM tbl_patient_profile p JOIN tbl_user u ON u.user_id=p.user_id"
                " WHERE LOWER(p.health_id)=LOWER(%s) AND p.patient_is_active=1",
                [health_id]
            )
            prof_row = cursor.fetchone()
            if not prof_row:
                return JsonResponse({'status': 'error', 'message': 'Patient not found.'}, status=404)
            row = (prof_row[0], prof_row[1], prof_row[2], prof_row[3], prof_row[4], prof_row[5], prof_row[6], '', '', '', prof_row[7] if len(prof_row) > 7 else '')

        if user['role'] == 'doctor':
            cursor.execute(
                "SELECT 1 FROM tbl_appointment WHERE patient_id=%s AND doctor_id=%s AND hospital_id=%s LIMIT 1",
                [row[0], user['doctor_id'], user['hospital_id']]
            )
            if not cursor.fetchone():
                return JsonResponse({'status': 'error', 'message': 'You are not authorized to view this patient.'}, status=403)

    patient_data = {
        'patient_id': row[0], 'patient_uid': row[1], 'health_id': row[1],
        'name': row[2], 'email': row[3] or '', 'phone': row[4] or '',
        'date_of_birth': str(row[5]) if row[5] else '', 'gender': row[6] or '',
        'blood_group': row[7] or '', 'address': row[8] or '', 'emergency_contact': row[9] or '',
    }
    # Allergy information is strictly visible to clinical staff (doctors, nurses) and patients
    if user['role'] in ('doctor', 'patient', 'nurse'):
        patient_data['allergies'] = row[10] or ''

    return JsonResponse({'status': 'success', 'patient': patient_data})


@csrf_exempt
def get_all_patients(request):
    """Retrieve full list or filtered list of patients for the receptionist patient roster / directory."""
    user, error = require_roles(request, 'receptionist', 'hospital-admin')
    if error:
        return error

    query = (request.GET.get('query') or request.GET.get('q') or '').strip().lower()

    with connection.cursor() as cursor:
        if query:
            cursor.execute(
                "SELECT p.patient_id, p.patient_uid, p.patient_name, p.patient_email, p.patient_phone,"
                " p.patient_dob, p.patient_gender, p.patient_blood_group, p.patient_address, p.patient_emergency_contact"
                " FROM tbl_patient p"
                " WHERE p.patient_is_active = 1"
                " AND (LOWER(p.patient_name) LIKE %s OR LOWER(p.patient_uid) LIKE %s OR p.patient_phone LIKE %s)"
                " ORDER BY p.patient_id DESC LIMIT 50",
                [f'%{query}%', f'%{query}%', f'%{query}%']
            )
        else:
            cursor.execute(
                "SELECT p.patient_id, p.patient_uid, p.patient_name, p.patient_email, p.patient_phone,"
                " p.patient_dob, p.patient_gender, p.patient_blood_group, p.patient_address, p.patient_emergency_contact"
                " FROM tbl_patient p"
                " WHERE p.patient_is_active = 1"
                " ORDER BY p.patient_id DESC LIMIT 100"
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
def update_patient(request):
    """Allows receptionist or hospital admin to edit and update patient demographic details."""
    user, error = require_roles(request, 'receptionist', 'hospital-admin')
    if error:
        return error
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    data = payload(request)
    patient_id = data.get('patient_id')
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip()
    phone = (data.get('phone') or '').strip()
    dob = (data.get('date_of_birth') or '').strip() or None
    gender = (data.get('gender') or '').strip() or None
    blood_group = (data.get('blood_group') or '').strip() or None
    address = (data.get('address') or '').strip() or None
    emergency_contact = (data.get('emergency_contact') or '').strip() or None

    if not patient_id:
        return JsonResponse({'status': 'error', 'message': 'Patient ID is required.'}, status=400)
    if not name or len(name) < 3:
        return JsonResponse({'status': 'error', 'message': 'Patient full name is required (minimum 3 characters).'}, status=400)
    if not phone or not is_valid_phone(phone):
        return JsonResponse({'status': 'error', 'message': 'A valid 10-digit primary phone number is required.'}, status=400)
    if email and not is_valid_email(email):
        return JsonResponse({'status': 'error', 'message': 'Please provide a valid email address.'}, status=400)
    if not dob:
        return JsonResponse({'status': 'error', 'message': 'Date of birth is required.'}, status=400)

    try:
        parsed_dob = datetime.strptime(dob, '%Y-%m-%d').date()
        if parsed_dob > date.today():
            return JsonResponse({'status': 'error', 'message': 'Date of birth cannot be a future date.'}, status=400)
    except (ValueError, TypeError):
        return JsonResponse({'status': 'error', 'message': 'Enter a valid date of birth (YYYY-MM-DD).'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute("SELECT user_id, patient_uid, patient_gender, patient_blood_group FROM tbl_patient WHERE patient_id = %s", [patient_id])
        p_row = cursor.fetchone()
        if not p_row:
            return JsonResponse({'status': 'error', 'message': 'Patient not found.'}, status=404)

        user_id, patient_uid, existing_gender, existing_blood_group = p_row
        gender = gender or existing_gender or 'Other'
        blood_group = blood_group or existing_blood_group

        # Check unique email/phone against other users
        if email:
            cursor.execute("SELECT user_id FROM tbl_user WHERE LOWER(user_email) = LOWER(%s) AND user_id != %s LIMIT 1", [email, user_id])
            if cursor.fetchone():
                return JsonResponse({'status': 'error', 'message': f"A user with email '{email}' already exists."}, status=400)

        cursor.execute("SELECT user_id FROM tbl_user WHERE user_phone = %s AND user_id != %s LIMIT 1", [phone, user_id])
        if cursor.fetchone():
            return JsonResponse({'status': 'error', 'message': f"A user with phone '{phone}' already exists."}, status=400)

        # Update tbl_patient
        cursor.execute("""
            UPDATE tbl_patient
            SET patient_name = %s, patient_email = %s, patient_phone = %s,
                patient_dob = %s, patient_gender = %s, patient_blood_group = %s,
                patient_address = %s, patient_emergency_contact = %s
            WHERE patient_id = %s
        """, [name, email or None, phone, dob, gender, blood_group, address, emergency_contact, patient_id])

        # Update corresponding tbl_user
        if user_id:
            cursor.execute("""
                UPDATE tbl_user
                SET user_name = %s, user_email = %s, user_phone = %s
                WHERE user_id = %s
            """, [name, email or None, phone, user_id])

    return JsonResponse({
        'status': 'success',
        'message': f"Patient '{name}' ({patient_uid}) updated successfully!",
        'patient': {
            'patient_id': patient_id,
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
        }
    })


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
    """Authorized comprehensive patient history endpoint for Doctor, Nurse, and Clinical Staff."""
    user, error = require_roles(request, 'doctor', 'nurse', 'hospital-admin', 'super-admin')
    if error:
        return error
    patient_param = request.GET.get('patient_id') or request.GET.get('health_id')
    if not patient_param:
        return JsonResponse({'status': 'error', 'message': 'Patient ID or Health ID is required.'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT patient_id, patient_uid, patient_name, patient_email, patient_phone,"
            " patient_dob, patient_gender, patient_blood_group, patient_address, patient_emergency_contact, allergies"
            " FROM tbl_patient WHERE patient_id=%s OR patient_uid=%s LIMIT 1",
            [patient_param, patient_param]
        )
        p_row = cursor.fetchone()
        if not p_row:
            return JsonResponse({'status': 'error', 'message': 'Patient record not found.'}, status=404)

        patient_id = p_row[0]

        # Authorization check: verify clinical relationship with patient or hospital
        if user['role'] == 'doctor':
            cursor.execute(
                "SELECT 1 FROM tbl_appointment WHERE patient_id=%s AND doctor_id=%s AND hospital_id=%s LIMIT 1",
                [patient_id, user['doctor_id'], user['hospital_id']]
            )
            if not cursor.fetchone():
                cursor.execute(
                    "SELECT 1 FROM tbl_admission WHERE patient_id=%s AND (admitting_doctor_id=%s OR hospital_id=%s) LIMIT 1",
                    [patient_id, user['doctor_id'], user['hospital_id']]
                )
                if not cursor.fetchone():
                    return JsonResponse({'status': 'error', 'message': 'You are not authorized to view this patient history.'}, status=403)
        elif user['role'] == 'nurse':
            # Nurse must belong to same hospital where patient has appointment, admission, or visit
            cursor.execute(
                "SELECT 1 FROM tbl_appointment WHERE patient_id=%s AND hospital_id=%s "
                "UNION SELECT 1 FROM tbl_admission WHERE patient_id=%s AND hospital_id=%s "
                "UNION SELECT 1 FROM tbl_patient_visit WHERE patient_id=%s AND hospital_id=%s LIMIT 1",
                [patient_id, user['hospital_id'], patient_id, user['hospital_id'], patient_id, user['hospital_id']]
            )
            if not cursor.fetchone():
                # Also allow if record is shared across network
                cursor.execute(
                    "SELECT 1 FROM tbl_patient_visit WHERE patient_id=%s AND record_share_flag=1 LIMIT 1",
                    [patient_id]
                )
                if not cursor.fetchone():
                    return JsonResponse({'status': 'error', 'message': 'Patient has no clinical history at your hospital facility.'}, status=403)

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
            'allergies': p_row[10] or '',
        }

        # 1. Fetch visits (both OP and IP consultations)
        cursor.execute(
            "SELECT v.visit_id, v.diagnosis, v.medical_notes, v.visited_at, du.user_name, h.hospital_name,"
            " v.height, v.weight, v.blood_pressure, v.vitals_recorded_at, v.doctor_id, COALESCE(v.record_share_flag, 1),"
            " COALESCE(v.visit_type, 'OP') AS visit_type, v.admission_id,"
            " COALESCE(adm.admission_uid, CONCAT('ADM', LPAD(adm.admission_id, 3, '0'))) AS admission_uid,"
            " adm.admission_status, adm.ward_bed"
            " FROM tbl_patient_visit v"
            " JOIN tbl_doctor d ON d.doctor_id = v.doctor_id"
            " JOIN tbl_user du ON du.user_id = d.user_id"
            " JOIN tbl_hospital h ON h.hospital_id = v.hospital_id"
            " LEFT JOIN tbl_admission adm ON adm.admission_id = v.admission_id"
            " WHERE v.patient_id = %s"
            " AND (COALESCE(v.record_share_flag, 1) = 1 OR v.hospital_id = %s)"
            " ORDER BY v.visited_at DESC",
            [patient_id, user.get('hospital_id')]
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
                'visited_at': r[3].strftime('%Y-%m-%d %H:%M') if hasattr(r[3], 'strftime') else str(r[3]),
                'date': r[3].strftime('%Y-%m-%d %H:%M') if hasattr(r[3], 'strftime') else str(r[3]),
                'raw_date': r[3].isoformat() if hasattr(r[3], 'isoformat') else str(r[3]),
                'doctor_name': r[4],
                'hospital_name': r[5],
                'height': r[6] or '',
                'weight': r[7] or '',
                'blood_pressure': r[8] or '',
                'vitals_recorded_at': str(r[9]) if r[9] else '',
                'has_vitals': bool(r[6] or r[7] or r[8]),
                'doctor_id': r[10],
                'is_shared': bool(r[11]),
                'visit_type': r[12] or 'OP',
                'admission_id': r[13],
                'admission_uid': r[14] if r[13] else None,
                'admission_status': r[15] if r[13] else None,
                'ward_bed': r[16] if r[13] else None,
            }
            for r in v_rows
        ]

        # 2. Fetch patient admissions (Inpatient Records)
        cursor.execute(
            "SELECT a.admission_id, COALESCE(a.admission_uid, CONCAT('ADM', LPAD(a.admission_id, 3, '0'))) AS admission_uid,"
            " a.admission_date, a.admission_status, a.discharge_date, a.ward_bed, a.admission_reason, a.discharge_summary,"
            " du.user_name AS doctor_name, h.hospital_name,"
            " (SELECT COUNT(*) FROM tbl_patient_visit pv WHERE pv.admission_id = a.admission_id) AS visit_count"
            " FROM tbl_admission a"
            " LEFT JOIN tbl_doctor d ON d.doctor_id = a.admitting_doctor_id"
            " LEFT JOIN tbl_user du ON du.user_id = d.user_id"
            " LEFT JOIN tbl_hospital h ON h.hospital_id = a.hospital_id"
            " WHERE a.patient_id = %s"
            " AND (a.hospital_id = %s OR EXISTS (SELECT 1 FROM tbl_patient_visit pv2 WHERE pv2.admission_id = a.admission_id AND pv2.record_share_flag = 1))"
            " ORDER BY a.admission_date DESC",
            [patient_id, user.get('hospital_id')]
        )
        a_rows = cursor.fetchall()
        admissions = [
            {
                'admission_id': ar[0],
                'id': ar[1],
                'admission_uid': ar[1],
                'admission_date': ar[2].strftime('%Y-%m-%d %H:%M') if hasattr(ar[2], 'strftime') else str(ar[2]),
                'date': ar[2].strftime('%Y-%m-%d %H:%M') if hasattr(ar[2], 'strftime') else str(ar[2]),
                'raw_date': ar[2].isoformat() if hasattr(ar[2], 'isoformat') else str(ar[2]),
                'admission_status': ar[3] or 'Admitted',
                'is_active': (ar[3] or '').lower() == 'admitted',
                'discharge_date': ar[4].strftime('%Y-%m-%d %H:%M') if (ar[4] and hasattr(ar[4], 'strftime')) else (str(ar[4]) if ar[4] else ''),
                'ward_bed': ar[5] or 'General Ward',
                'admission_reason': ar[6] or '',
                'discharge_summary': ar[7] or '',
                'doctor_name': ar[8] or 'Attending Doctor',
                'hospital_name': ar[9] or 'Hospital Facility',
                'visit_count': ar[10] or 0,
            }
            for ar in a_rows
        ]

        # 3. Assemble unified Chronological Timeline (newest first)
        timeline = []
        for v in visits:
            timeline.append({
                'record_type': v['visit_type'],
                'record_type_label': 'Inpatient Consultation' if v['visit_type'] == 'IP' else 'Outpatient Visit',
                'id': v['id'],
                'date': v['date'],
                'raw_date': v['raw_date'],
                'doctor_name': v['doctor_name'],
                'hospital_name': v['hospital_name'],
                'diagnosis': v['diagnosis'],
                'medical_notes': v['medical_notes'],
                'height': v['height'],
                'weight': v['weight'],
                'blood_pressure': v['blood_pressure'],
                'has_vitals': v['has_vitals'],
                'visit_id': v['visit_id'],
                'admission_id': v['admission_id'],
                'admission_uid': v['admission_uid'],
                'admission_status': v['admission_status'],
                'ward_bed': v['ward_bed'],
                'is_shared': v['is_shared'],
            })
        for adm in admissions:
            timeline.append({
                'record_type': 'ADMISSION',
                'record_type_label': f"Inpatient Admission ({adm['admission_status']})",
                'id': adm['id'],
                'date': adm['date'],
                'raw_date': adm['raw_date'],
                'doctor_name': adm['doctor_name'],
                'hospital_name': adm['hospital_name'],
                'admission_id': adm['admission_id'],
                'admission_uid': adm['admission_uid'],
                'admission_status': adm['admission_status'],
                'is_active': adm['is_active'],
                'ward_bed': adm['ward_bed'],
                'admission_reason': adm['admission_reason'],
                'discharge_date': adm['discharge_date'],
                'discharge_summary': adm['discharge_summary'],
                'visit_count': adm['visit_count'],
            })
        timeline.sort(key=lambda x: x.get('raw_date', ''), reverse=True)

    return JsonResponse({
        'status': 'success',
        'patient': patient,
        'history': visits,
        'visits': visits,
        'admissions': admissions,
        'timeline': timeline,
        'chronological_records': timeline
    })


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

        # Check booked slots for a specific doctor & date if queried
        doc_param = request.GET.get('doctor_id')
        date_param = request.GET.get('date') or request.GET.get('appointment_date')
        booked_slots = []
        if doc_param and date_param:
            doc_id_val = str(doc_param).upper().replace('DOC', '').lstrip('0') or '0'
            try:
                doc_id_int = int(doc_id_val)
            except ValueError:
                doc_id_int = doc_param

            cursor.execute(
                "SELECT appointment_time FROM tbl_appointment"
                " WHERE (doctor_id=%s OR doctor_id=%s) AND appointment_date=%s"
                " AND appointment_status NOT IN ('Cancelled', 'Rejected')",
                [doc_param, doc_id_int, date_param]
            )
            raw_slots = cursor.fetchall()
            for r in raw_slots:
                if r and r[0] is not None:
                    val = r[0]
                    formatted = None
                    if hasattr(val, 'strftime'):
                        formatted = val.strftime('%H:%M')
                    elif hasattr(val, 'total_seconds'):
                        total_sec = int(val.total_seconds())
                        h = (total_sec // 3600) % 24
                        m = (total_sec % 3600) // 60
                        formatted = f"{h:02d}:{m:02d}"
                    else:
                        s = str(val).strip()
                        if ':' in s:
                            parts = s.split(':')
                            try:
                                formatted = f"{int(parts[0]):02d}:{int(parts[1]):02d}"
                            except Exception:
                                formatted = s[:5]
                        elif s:
                            formatted = s
                    if formatted and formatted not in booked_slots:
                        booked_slots.append(formatted)

    return JsonResponse({'status': 'success', 'departments': departments, 'doctors': doctors, 'booked_slots': booked_slots})


@csrf_exempt
def appointments(request):
    user, error = require_roles(request, 'patient', 'doctor', 'receptionist', 'nurse', 'hospital-admin')
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
                " h.hospital_name, dep.department_name, du.user_name,"
                " COALESCE(p.patient_uid, pp.health_id, CONCAT('PTA', LPAD(a.patient_id, 3, '0'))) AS health_id,"
                " COALESCE(p.patient_name, pu.user_name, 'Patient') AS patient_name,"
                " a.patient_id, p.patient_phone, p.patient_gender, p.patient_dob, p.patient_blood_group, p.patient_address, p.patient_emergency_contact,"
                " p.allergies,"
                " pv.visit_id, pv.height, pv.weight, pv.blood_pressure, pv.vitals_recorded_at, nu.user_name AS vitals_recorded_by_name"
                " FROM tbl_appointment a"
                " LEFT JOIN tbl_hospital h ON h.hospital_id=a.hospital_id"
                " LEFT JOIN tbl_department dep ON dep.department_id=a.department_id"
                " JOIN tbl_doctor dr ON dr.doctor_id=a.doctor_id"
                " JOIN tbl_user du ON du.user_id=dr.user_id"
                " LEFT JOIN tbl_patient p ON p.patient_id=a.patient_id"
                " LEFT JOIN tbl_patient_profile pp ON pp.patient_id=a.patient_id"
                " LEFT JOIN tbl_user pu ON pu.user_id=pp.user_id"
                " LEFT JOIN tbl_patient_visit pv ON pv.appointment_id=a.appointment_id"
                " LEFT JOIN tbl_user nu ON nu.user_id=pv.vitals_recorded_by"
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
                'department': r[6] or '', 'doctor': r[7],
                'health_id': r[8],
                'patient_uid': r[8],
                'patient': r[9],
                'patient_name': r[9],
                'patient_id': r[10],
                'phone': r[11] or '',
                'gender': r[12] or '',
                'date_of_birth': str(r[13]) if r[13] else '',
                'blood_group': r[14] or '',
                'address': r[15] or '',
                'emergency_contact': r[16] or '',
                'visit_id': r[18],
                'has_vitals': bool(r[19] or r[20] or r[21]),
                'height': r[19] or '',
                'weight': r[20] or '',
                'blood_pressure': r[21] or '',
                'vitals_recorded_at': str(r[22]) if r[22] else '',
                'vitals_recorded_by': r[23] or '',
                **({'allergies': r[17] or ''} if user['role'] in ('doctor', 'patient') else {})
            }
            for r in rows
        ]})

    if request.method == 'PATCH':
        data = payload(request)
        appointment_id = data.get('appointment_id')
        new_status = data.get('status')
        if not appointment_id or not new_status:
            return JsonResponse({'status': 'error', 'message': 'appointment_id and status are required.'}, status=400)
        if new_status not in ('Pending', 'Confirmed', 'Completed', 'Cancelled'):
            return JsonResponse({'status': 'error', 'message': 'Invalid appointment status.'}, status=400)

        with connection.cursor() as cursor:
            if user['role'] in ('receptionist', 'nurse', 'hospital-admin'):
                cursor.execute(
                    "UPDATE tbl_appointment SET appointment_status=%s WHERE appointment_id=%s AND hospital_id=%s",
                    [new_status, appointment_id, user['hospital_id']]
                )
            elif user['role'] == 'doctor':
                cursor.execute(
                    "UPDATE tbl_appointment SET appointment_status=%s WHERE appointment_id=%s AND doctor_id=%s AND hospital_id=%s",
                    [new_status, appointment_id, user['doctor_id'], user['hospital_id']]
                )
            else:
                cursor.execute(
                    "UPDATE tbl_appointment SET appointment_status=%s WHERE appointment_id=%s AND patient_id=%s",
                    [new_status, appointment_id, user['patient_id']]
                )
            if cursor.rowcount == 0:
                return JsonResponse({'status': 'error', 'message': 'Appointment not found or unauthorized.'}, status=404)
        log_audit(user['user_id'], f"Updated appointment APT{int(appointment_id):03d} status to {new_status}", "Appointments", get_client_ip(request))
        return JsonResponse({'status': 'success', 'message': f'Appointment marked as {new_status}.'})

    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    data = payload(request)
    hospital_id = data.get('hospital_id') or user['hospital_id']
    doctor_id = data.get('doctor_id')
    department_id = data.get('department_id') or None
    patient_id = user['patient_id'] if user['role'] == 'patient' else data.get('patient_id')

    appt_date = str(data.get('appointment_date') or '').strip()
    appt_time = str(data.get('appointment_time') or '').strip()
    if not patient_id or not doctor_id or not appt_date or not appt_time:
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

        # 1. Prevent double-booking for the doctor on this date and time
        cursor.execute(
            "SELECT 1 FROM tbl_appointment WHERE doctor_id=%s AND appointment_date=%s"
            " AND (appointment_time=%s OR LEFT(appointment_time, 5)=%s)"
            " AND appointment_status IN ('Pending','Confirmed')",
            [doctor_id, appt_date, appt_time, appt_time[:5]]
        )
        if cursor.fetchone():
            return JsonResponse({'status': 'error', 'message': 'This doctor is already booked for the selected date and time slot. Please choose another slot.'}, status=409)

        # 2. Prevent simultaneous double-booking for the patient on this date and time
        cursor.execute(
            "SELECT a.appointment_id, du.user_name FROM tbl_appointment a"
            " JOIN tbl_doctor dr ON dr.doctor_id=a.doctor_id"
            " JOIN tbl_user du ON du.user_id=dr.user_id"
            " WHERE a.patient_id=%s AND a.appointment_date=%s"
            " AND (a.appointment_time=%s OR LEFT(a.appointment_time, 5)=%s)"
            " AND a.appointment_status IN ('Pending','Confirmed')",
            [patient_id, appt_date, appt_time, appt_time[:5]]
        )
        p_conflict = cursor.fetchone()
        if p_conflict:
            return JsonResponse({
                'status': 'error',
                'message': f'This patient already has an active appointment with Dr. {p_conflict[1]} at {appt_time} on {appt_date}. Please choose a different time slot for the additional doctor consultation.'
            }, status=409)

        cursor.execute(
            "INSERT INTO tbl_appointment"
            " (patient_id, hospital_id, department_id, doctor_id, appointment_date,"
            " appointment_time, reason, created_by_user_id, appointment_status)"
            " VALUES (%s,%s,%s,%s,%s,%s,%s,%s,'Pending')",
            [patient_id, hospital_id, department_id, doctor_id,
             appt_date, appt_time,
             (data.get('reason') or '').strip(), user['user_id']]
        )
        appt_id = cursor.lastrowid

    log_audit(user['user_id'], f"Booked appointment APT{appt_id:03d} (Patient: {patient_id}, Doctor: {doctor_id}, Date: {appt_date} {appt_time})", "Appointments", get_client_ip(request))
    return JsonResponse({'status': 'success', 'message': 'Appointment booked successfully.', 'appointment_id': appt_id})


@csrf_exempt
def nurse_visits(request):
    """Returns patient visits/appointments for the Nurse clinical vitals queue."""
    user, error = require_roles(request, 'nurse', 'hospital-admin')
    if error:
        return error
    hospital_id = user['hospital_id']
    date_filter = request.GET.get('date')

    with connection.cursor() as cursor:
        query = """
            SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.reason, a.appointment_status,
                   COALESCE(p.patient_uid, pp.health_id, CONCAT('PTA', LPAD(a.patient_id, 3, '0'))) AS health_id,
                   COALESCE(p.patient_name, pu.user_name, 'Patient') AS patient_name,
                   a.patient_id, p.patient_phone, p.patient_gender, p.patient_dob, p.patient_blood_group,
                   du.user_name AS doctor_name, dep.department_name,
                   pv.visit_id, pv.height, pv.weight, pv.blood_pressure, pv.vitals_recorded_at,
                   nu.user_name AS vitals_recorded_by_name
            FROM tbl_appointment a
            JOIN tbl_doctor dr ON dr.doctor_id = a.doctor_id
            JOIN tbl_user du ON du.user_id = dr.user_id
            LEFT JOIN tbl_department dep ON dep.department_id = a.department_id
            LEFT JOIN tbl_patient p ON p.patient_id = a.patient_id
            LEFT JOIN tbl_patient_profile pp ON pp.patient_id = a.patient_id
            LEFT JOIN tbl_user pu ON pu.user_id = pp.user_id
            LEFT JOIN tbl_patient_visit pv ON pv.appointment_id = a.appointment_id
            LEFT JOIN tbl_user nu ON nu.user_id = pv.vitals_recorded_by
            WHERE a.hospital_id = %s
        """
        params = [hospital_id]
        if date_filter:
            query += " AND a.appointment_date = %s"
            params.append(date_filter)
        query += " ORDER BY a.appointment_date DESC, a.appointment_time ASC"

        cursor.execute(query, params)
        rows = cursor.fetchall()

    visits_list = []
    for r in rows:
        has_vitals = bool(r[15] or r[16] or r[17])
        visits_list.append({
            'appointment_id': r[0],
            'id': f"APT{r[0]:03d}",
            'apt_uid': f"APT{r[0]:03d}",
            'appointment_uid': f"APT{r[0]:03d}",
            'date': str(r[1]),
            'time': r[2],
            'reason': r[3] or '',
            'status': r[4],
            'health_id': r[5],
            'patient_uid': r[5],
            'patient_name': r[6],
            'patient_id': r[7],
            'phone': r[8] or '',
            'gender': r[9] or '',
            'date_of_birth': str(r[10]) if r[10] else '',
            'blood_group': r[11] or '',
            'doctor_name': r[12] or '',
            'department_name': r[13] or '',
            'visit_id': r[14],
            'has_vitals': has_vitals,
            'height': r[15] or '',
            'weight': r[16] or '',
            'blood_pressure': r[17] or '',
            'vitals_recorded_at': str(r[18]) if r[18] else '',
            'vitals_recorded_by': r[19] or '',
        })
    return JsonResponse({'status': 'success', 'visits': visits_list})


@csrf_exempt
def record_vitals(request):
    """Record pre-consultation vitals (Height, Weight, Blood Pressure) for an appointment/visit."""
    user, error = require_roles(request, 'nurse', 'doctor')
    if error:
        return error
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)
    ensure_workflow_schema()
    data = payload(request)
    appointment_id = data.get('appointment_id')
    raw_admission_id = data.get('admission_id')
    admission_id = int(raw_admission_id) if raw_admission_id and str(raw_admission_id).isdigit() else None
    height = (data.get('height') or '').strip()
    weight = (data.get('weight') or '').strip()
    blood_pressure = (data.get('blood_pressure') or '').strip()

    if not appointment_id and not admission_id:
        return JsonResponse({'status': 'error', 'message': 'Appointment ID or Admission ID is required to record vitals.'}, status=400)
    if not (height or weight or blood_pressure):
        return JsonResponse({'status': 'error', 'message': 'At least one vital (Height, Weight, or Blood Pressure) must be provided.'}, status=400)

    import re
    if blood_pressure and not re.match(r'^\d{2,3}/\d{2,3}(\s*mmHg)?$', blood_pressure, re.IGNORECASE):
        return JsonResponse({'status': 'error', 'message': 'Blood pressure must be in SYS/DIA format (e.g. 120/80 mmHg).'}, status=400)

    with connection.cursor() as cursor:
        if appointment_id:
            cursor.execute(
                "SELECT patient_id, doctor_id, hospital_id FROM tbl_appointment WHERE appointment_id=%s",
                [appointment_id]
            )
            appt_row = cursor.fetchone()
            if not appt_row:
                return JsonResponse({'status': 'error', 'message': 'Appointment not found.'}, status=404)
            patient_id, doctor_id, appt_hospital_id = appt_row

            cursor.execute(
                "SELECT visit_id FROM tbl_patient_visit WHERE appointment_id=%s ORDER BY visit_id DESC LIMIT 1",
                [appointment_id]
            )
            v_row = cursor.fetchone()
            if v_row:
                visit_id = v_row[0]
                cursor.execute(
                    "UPDATE tbl_patient_visit"
                    " SET height=%s, weight=%s, blood_pressure=%s, vitals_recorded_by=%s, vitals_recorded_at=NOW()"
                    " WHERE visit_id=%s",
                    [height or None, weight or None, blood_pressure or None, user['user_id'], visit_id]
                )
            else:
                cursor.execute(
                    "INSERT INTO tbl_patient_visit"
                    " (patient_id, doctor_id, hospital_id, appointment_id, height, weight, blood_pressure, vitals_recorded_by, vitals_recorded_at, visit_type, admission_id)"
                    " VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), 'OP', %s)",
                    [patient_id, doctor_id, appt_hospital_id, appointment_id,
                     height or None, weight or None, blood_pressure or None, user['user_id'], admission_id]
                )
                visit_id = cursor.lastrowid
            log_context = f"Appointment: APT{int(appointment_id):03d}"
        else:
            cursor.execute(
                "SELECT patient_id, hospital_id, admitting_doctor_id FROM tbl_admission WHERE admission_id=%s",
                [admission_id]
            )
            adm_row = cursor.fetchone()
            if not adm_row:
                return JsonResponse({'status': 'error', 'message': 'Inpatient admission record not found.'}, status=404)
            patient_id, appt_hospital_id, doctor_id = adm_row

            cursor.execute(
                "INSERT INTO tbl_patient_visit"
                " (patient_id, doctor_id, hospital_id, admission_id, visit_type, height, weight, blood_pressure, vitals_recorded_by, vitals_recorded_at)"
                " VALUES (%s, %s, %s, %s, 'IP', %s, %s, %s, %s, NOW())",
                [patient_id, doctor_id, appt_hospital_id, admission_id,
                 height or None, weight or None, blood_pressure or None, user['user_id']]
            )
            visit_id = cursor.lastrowid
            log_context = f"Admission: ADM{int(admission_id):03d}"

    log_audit(user['user_id'], f"Recorded patient vitals ({log_context}, BP: {blood_pressure or 'N/A'}, W: {weight or 'N/A'} kg, H: {height or 'N/A'} cm)", "Nurse Station", get_client_ip(request))

    return JsonResponse({
        'status': 'success',
        'message': 'Vitals saved successfully.',
        'visit_id': visit_id,
        'vitals': {
            'height': height,
            'weight': weight,
            'blood_pressure': blood_pressure,
        }
    })


@csrf_exempt
def vitals_history(request):
    """Retrieve chronological vitals recorded per visit for a given patient."""
    user, error = require_roles(request, 'nurse', 'doctor', 'patient', 'receptionist', 'hospital-admin')
    if error:
        return error
    patient_param = request.GET.get('patient_id') or request.GET.get('health_id')
    if user['role'] == 'patient':
        patient_param = user['patient_id']
    if not patient_param:
        return JsonResponse({'status': 'error', 'message': 'Patient ID is required.'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute("SELECT patient_id FROM tbl_patient WHERE patient_id=%s OR patient_uid=%s LIMIT 1", [patient_param, patient_param])
        p_row = cursor.fetchone()
        if not p_row:
            return JsonResponse({'status': 'success', 'history': []})
        patient_id = p_row[0]

        cursor.execute(
            "SELECT pv.visit_id, pv.height, pv.weight, pv.blood_pressure, pv.vitals_recorded_at, pv.visited_at,"
            " du.user_name AS doctor_name, h.hospital_name, nu.user_name AS recorded_by_name"
            " FROM tbl_patient_visit pv"
            " LEFT JOIN tbl_doctor d ON d.doctor_id = pv.doctor_id"
            " LEFT JOIN tbl_user du ON du.user_id = d.user_id"
            " LEFT JOIN tbl_hospital h ON h.hospital_id = pv.hospital_id"
            " LEFT JOIN tbl_user nu ON nu.user_id = pv.vitals_recorded_by"
            " WHERE pv.patient_id = %s AND (pv.height IS NOT NULL OR pv.weight IS NOT NULL OR pv.blood_pressure IS NOT NULL)"
            " ORDER BY COALESCE(pv.vitals_recorded_at, pv.visited_at) DESC",
            [patient_id]
        )
        rows = cursor.fetchall()

    history = [
        {
            'visit_id': r[0],
            'height': r[1] or '',
            'weight': r[2] or '',
            'blood_pressure': r[3] or '',
            'recorded_at': str(r[4] or r[5]),
            'doctor_name': r[6] or 'General Practitioner',
            'hospital_name': r[7] or '',
            'recorded_by': r[8] or 'Clinical Staff',
        }
        for r in rows
    ]
    return JsonResponse({'status': 'success', 'history': history})


STANDARD_MEDICINES = [
    {"name": "Paracetamol 500mg", "dosage": "500mg", "frequency": "Twice daily", "duration": "3 days", "instruction": "After food with a glass of water"},
    {"name": "Amoxicillin 500mg", "dosage": "500mg", "frequency": "Thrice daily", "duration": "5 days", "instruction": "After meals at regular intervals"},
    {"name": "Azithromycin 500mg", "dosage": "500mg", "frequency": "Once daily", "duration": "3 days", "instruction": "1 hour before meals or 2 hours after"},
    {"name": "Aerocort Inhaler (Levosalbutamol + Beclomethasone)", "dosage": "2 puffs", "frequency": "Twice daily", "duration": "30 days", "instruction": "Rinse mouth thoroughly after inhalation"},
    {"name": "Aerolin Inhaler 100mcg (Salbutamol)", "dosage": "2 puffs", "frequency": "As needed", "duration": "30 days", "instruction": "Inhale when experiencing acute breathlessness"},
    {"name": "Aerodil Syrup (Terbutaline + Bromhexine)", "dosage": "10ml", "frequency": "Thrice daily", "duration": "5 days", "instruction": "After food for productive cough"},
    {"name": "Aerozest Inhaler", "dosage": "1 puff", "frequency": "Twice daily", "duration": "30 days", "instruction": "Use as maintenance inhaler"},
    {"name": "Aethoxysklerol 1% Injection", "dosage": "2ml", "frequency": "Single dose", "duration": "1 day", "instruction": "Administer under specialist clinical supervision"},
    {"name": "Aequamen 100mg", "dosage": "100mg", "frequency": "Once daily", "duration": "10 days", "instruction": "Take with breakfast"},
    {"name": "Aceclofenac 100mg", "dosage": "100mg", "frequency": "Twice daily", "duration": "3 days", "instruction": "After food with full glass of water"},
    {"name": "Aceclofenac + Paracetamol", "dosage": "100mg/325mg", "frequency": "Twice daily", "duration": "3 days", "instruction": "After meals for pain relief"},
    {"name": "Albendazole 400mg", "dosage": "400mg", "frequency": "Single dose", "duration": "1 day", "instruction": "Chew thoroughly at bedtime"},
    {"name": "Allopurinol 100mg", "dosage": "100mg", "frequency": "Once daily", "duration": "30 days", "instruction": "After meal with abundant water"},
    {"name": "Metformin 500mg", "dosage": "500mg", "frequency": "Twice daily", "duration": "30 days", "instruction": "With or immediately after meals"},
    {"name": "Pantoprazole 40mg", "dosage": "40mg", "frequency": "Once daily", "duration": "14 days", "instruction": "Morning empty stomach, 30 min before breakfast"},
    {"name": "Cetirizine 10mg", "dosage": "10mg", "frequency": "Once daily", "duration": "5 days", "instruction": "At bedtime with water"},
    {"name": "Ibuprofen 400mg", "dosage": "400mg", "frequency": "Twice daily", "duration": "3 days", "instruction": "After food to avoid stomach irritation"},
    {"name": "Atorvastatin 20mg", "dosage": "20mg", "frequency": "Once daily", "duration": "30 days", "instruction": "At night after dinner"},
    {"name": "Amlodipine 5mg", "dosage": "5mg", "frequency": "Once daily", "duration": "30 days", "instruction": "Morning with or without food"},
    {"name": "Losartan 50mg", "dosage": "50mg", "frequency": "Once daily", "duration": "30 days", "instruction": "Once daily in the morning"},
    {"name": "Ciprofloxacin 500mg", "dosage": "500mg", "frequency": "Twice daily", "duration": "5 days", "instruction": "Drink plenty of fluids"},
    {"name": "Cefixime 200mg", "dosage": "200mg", "frequency": "Twice daily", "duration": "5 days", "instruction": "After food"},
    {"name": "Omeprazole 20mg", "dosage": "20mg", "frequency": "Once daily", "duration": "14 days", "instruction": "Empty stomach in morning"},
    {"name": "Doxycycline 100mg", "dosage": "100mg", "frequency": "Twice daily", "duration": "7 days", "instruction": "With a full glass of water, do not lie down immediately"},
    {"name": "Telmisartan 40mg", "dosage": "40mg", "frequency": "Once daily", "duration": "30 days", "instruction": "Morning with water"},
    {"name": "Montelukast 10mg", "dosage": "10mg", "frequency": "Once daily", "duration": "10 days", "instruction": "At night before sleeping"},
    {"name": "Glimepiride 1mg", "dosage": "1mg", "frequency": "Once daily", "duration": "30 days", "instruction": "Shortly before or during breakfast"},
    {"name": "Salbutamol Inhaler 100mcg", "dosage": "100mcg", "frequency": "As needed", "duration": "30 days", "instruction": "2 puffs when short of breath"},
    {"name": "Hydrochlorothiazide 12.5mg", "dosage": "12.5mg", "frequency": "Once daily", "duration": "30 days", "instruction": "Morning with water"},
    {"name": "Clopidogrel 75mg", "dosage": "75mg", "frequency": "Once daily", "duration": "30 days", "instruction": "After food"},
    {"name": "Aspirin (Ecosprin 75mg)", "dosage": "75mg", "frequency": "Once daily", "duration": "30 days", "instruction": "After meals"},
    {"name": "Levothyroxine 50mcg", "dosage": "50mcg", "frequency": "Once daily", "duration": "30 days", "instruction": "First thing in the morning empty stomach"},
    {"name": "Domperidone 10mg", "dosage": "10mg", "frequency": "Thrice daily", "duration": "5 days", "instruction": "30 minutes before food"},
    {"name": "Ondansetron 4mg", "dosage": "4mg", "frequency": "As needed", "duration": "3 days", "instruction": "For nausea or vomiting"},
    {"name": "Metronidazole 400mg", "dosage": "400mg", "frequency": "Thrice daily", "duration": "5 days", "instruction": "After meals, strictly avoid alcohol"},
    {"name": "Ranitidine 150mg", "dosage": "150mg", "frequency": "Twice daily", "duration": "7 days", "instruction": "Before meals"},
    {"name": "Amoxicillin + Clavulanic Acid 625mg", "dosage": "625mg", "frequency": "Twice daily", "duration": "5 days", "instruction": "At start of meal"},
    {"name": "Levofloxacin 500mg", "dosage": "500mg", "frequency": "Once daily", "duration": "5 days", "instruction": "With water, avoid antacids"},
    {"name": "Diclofenac 50mg", "dosage": "50mg", "frequency": "Twice daily", "duration": "3 days", "instruction": "After food"},
    {"name": "Tramadol 50mg", "dosage": "50mg", "frequency": "As needed", "duration": "3 days", "instruction": "Take with food for severe pain"},
    {"name": "Prednisolone 10mg", "dosage": "10mg", "frequency": "Once daily", "duration": "5 days", "instruction": "Morning after breakfast with milk"},
    {"name": "Vitamin D3 60,000 IU", "dosage": "60,000 IU", "frequency": "Once weekly", "duration": "8 weeks", "instruction": "After milk or fatty meal"},
    {"name": "Vitamin B Complex", "dosage": "1 capsule", "frequency": "Once daily", "duration": "30 days", "instruction": "After breakfast"},
    {"name": "Calcium + Vitamin D3", "dosage": "500mg", "frequency": "Once daily", "duration": "30 days", "instruction": "After dinner with water"}
]

@csrf_exempt
def medicines_list(request):
    """Returns matching clinical medicines for autocomplete in doctor prescription, prioritizing prefix matches."""
    import re
    q = (request.GET.get('q') or request.GET.get('query') or '').strip().lower()
    if not q:
        matches = STANDARD_MEDICINES[:25]
    else:
        starts = [m for m in STANDARD_MEDICINES if m['name'].lower().startswith(q)]
        word_starts = [m for m in STANDARD_MEDICINES if not m['name'].lower().startswith(q) and re.search(r'\b' + re.escape(q), m['name'].lower())]
        contains = [m for m in STANDARD_MEDICINES if not m['name'].lower().startswith(q) and not re.search(r'\b' + re.escape(q), m['name'].lower()) and q in m['name'].lower()]
        matches = (starts + word_starts + contains)[:25]
    return JsonResponse({'status': 'success', 'medicines': matches})


@csrf_exempt
def visits(request):
    user, error = require_roles(request, 'doctor')
    if error:
        return error

    if request.method == 'DELETE':
        visit_param = request.GET.get('visit_id') or payload(request).get('visit_id')
        if not visit_param:
            return JsonResponse({'status': 'error', 'message': 'visit_id is required.'}, status=400)
        try:
            visit_id = int(visit_param)
        except (ValueError, TypeError):
            return JsonResponse({'status': 'error', 'message': 'Invalid visit_id format.'}, status=400)

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT doctor_id, height, weight, blood_pressure FROM tbl_patient_visit WHERE visit_id=%s",
                [visit_id]
            )
            v_row = cursor.fetchone()
            if not v_row:
                return JsonResponse({'status': 'error', 'message': 'Visit record not found.'}, status=404)
            if v_row[0] != user['doctor_id']:
                return JsonResponse({'status': 'error', 'message': 'You can only delete your own clinical notes and visit records.'}, status=403)

            # If nurse vitals exist on this record, clear diagnosis and notes to preserve pre-consult vitals; otherwise delete record
            if v_row[1] or v_row[2] or v_row[3]:
                cursor.execute(
                    "UPDATE tbl_patient_visit SET diagnosis=NULL, medical_notes=NULL WHERE visit_id=%s",
                    [visit_id]
                )
            else:
                cursor.execute("DELETE FROM tbl_patient_visit WHERE visit_id=%s", [visit_id])

        log_audit(user['user_id'], f"Deleted clinical consultation visit record (Visit: VIS{visit_id:03d})", "Clinical Consultations", get_client_ip(request))
        return JsonResponse({'status': 'success', 'message': 'Clinical consultation record deleted successfully.'})

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

    is_shared = 0
    if 'is_shared' in data:
        is_shared = 1 if data.get('is_shared') else 0
    elif 'record_share_flag' in data:
        is_shared = 1 if data.get('record_share_flag') else 0

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT patient_id FROM tbl_patient WHERE patient_id=%s OR patient_uid=%s LIMIT 1",
            [patient_param, patient_param]
        )
        p_row = cursor.fetchone()
        if not p_row:
            return JsonResponse({'status': 'error', 'message': 'Patient record not found.'}, status=404)
        patient_id = p_row[0]

        # Determine visit type (OP vs IP) and link admission if applicable
        visit_type = (data.get('visit_type') or 'OP').strip().upper()
        if visit_type not in ('OP', 'IP'):
            visit_type = 'OP'

        # If an explicit appointment_id was provided, verify it belongs to this doctor & hospital
        if appointment_id:
            cursor.execute(
                "SELECT appointment_id FROM tbl_appointment WHERE appointment_id=%s AND doctor_id=%s AND hospital_id=%s",
                [appointment_id, user['doctor_id'], user['hospital_id']]
            )
            if not cursor.fetchone():
                appointment_id = None

        if visit_type == 'OP':
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
        else:
            if not raw_appointment_id:
                appointment_id = None

        admission_id = None
        if visit_type == 'IP':
            raw_admission_id = data.get('admission_id')
            if raw_admission_id and str(raw_admission_id).isdigit():
                admission_id = int(raw_admission_id)
            else:
                cursor.execute(
                    "SELECT admission_id FROM tbl_admission WHERE patient_id=%s AND hospital_id=%s AND admission_status='Admitted' ORDER BY admission_id DESC LIMIT 1",
                    [patient_id, user['hospital_id']]
                )
                adm_row = cursor.fetchone()
                if adm_row:
                    admission_id = adm_row[0]
                else:
                    ward_bed = (data.get('ward_bed') or 'General Ward').strip()
                    admission_reason = (data.get('admission_reason') or data.get('diagnosis') or 'Inpatient Admission').strip()
                    cursor.execute(
                        "INSERT INTO tbl_admission (patient_id, hospital_id, admitting_doctor_id, admission_date, admission_status, ward_bed, admission_reason)"
                        " VALUES (%s, %s, %s, CURRENT_DATE(), 'Admitted', %s, %s)",
                        [patient_id, user['hospital_id'], user['doctor_id'], ward_bed, admission_reason]
                    )
                    admission_id = cursor.lastrowid
                    cursor.execute(
                        "UPDATE tbl_admission SET admission_uid=%s WHERE admission_id=%s",
                        [f"ADM{admission_id:03d}", admission_id]
                    )
                    log_audit(user['user_id'], f"Created inpatient admission ADM{admission_id:03d} (Ward/Bed: {ward_bed})", "Inpatient Management", get_client_ip(request))

            if data.get('discharge_patient') in (True, 'true', 1, '1'):
                discharge_summary = (data.get('discharge_summary') or data.get('medical_notes') or 'Patient condition stable. Discharged.').strip()
                cursor.execute(
                    "UPDATE tbl_admission SET admission_status='Discharged', discharge_date=CURRENT_DATE(), discharge_summary=%s WHERE admission_id=%s",
                    [discharge_summary, admission_id]
                )
                log_audit(user['user_id'], f"Discharged inpatient admission ADM{admission_id:03d}", "Inpatient Management", get_client_ip(request))

        # Check if updating an existing visit or linking to a pre-consult intake record
        raw_visit_id = data.get('visit_id')
        existing_v = None
        if raw_visit_id and str(raw_visit_id).isdigit():
            cursor.execute("SELECT visit_id FROM tbl_patient_visit WHERE visit_id=%s", [int(raw_visit_id)])
            existing_v = cursor.fetchone()
        elif appointment_id:
            cursor.execute(
                "SELECT visit_id FROM tbl_patient_visit WHERE appointment_id=%s ORDER BY visit_id DESC LIMIT 1",
                [appointment_id]
            )
            existing_v = cursor.fetchone()
        elif visit_type == 'IP' and admission_id:
            # Inpatient stays support multiple visits/rounds. Only update if a pre-consult visit exists without diagnosis
            cursor.execute(
                "SELECT visit_id FROM tbl_patient_visit WHERE admission_id=%s AND (diagnosis IS NULL OR diagnosis='') ORDER BY visit_id DESC LIMIT 1",
                [admission_id]
            )
            existing_v = cursor.fetchone()

        # If not updating an existing visit but an appointment_id is present, ensure it's not already used
        if not existing_v and appointment_id:
            cursor.execute("SELECT visit_id FROM tbl_patient_visit WHERE appointment_id=%s", [appointment_id])
            if cursor.fetchone():
                appointment_id = None

        if existing_v:
            visit_id = existing_v[0]
            cursor.execute(
                "UPDATE tbl_patient_visit"
                " SET diagnosis=%s, medical_notes=%s, doctor_id=%s, hospital_id=%s, record_share_flag=%s, visit_type=%s, admission_id=%s"
                " WHERE visit_id=%s",
                [(data.get('diagnosis') or '').strip(), (data.get('medical_notes') or '').strip(),
                 user['doctor_id'], user['hospital_id'], is_shared, visit_type, admission_id, visit_id]
            )
        else:
            cursor.execute(
                "INSERT INTO tbl_patient_visit (patient_id, doctor_id, hospital_id, appointment_id, diagnosis, medical_notes, record_share_flag, visit_type, admission_id)"
                " VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                [patient_id, user['doctor_id'], user['hospital_id'], appointment_id,
                 (data.get('diagnosis') or '').strip(), (data.get('medical_notes') or '').strip(), is_shared, visit_type, admission_id]
            )
            visit_id = cursor.lastrowid

        # Mark appointment as completed if linked
        if appointment_id:
            cursor.execute(
                "UPDATE tbl_appointment SET appointment_status='Completed'"
                " WHERE appointment_id=%s AND doctor_id=%s AND hospital_id=%s",
                [appointment_id, user['doctor_id'], user['hospital_id']]
            )

        # Update patient allergies across all doctors if provided/modified in consultation
        if 'allergies' in data:
            allergies_val = (data.get('allergies') or '').strip()
            cursor.execute(
                "UPDATE tbl_patient SET allergies=%s WHERE patient_id=%s",
                [allergies_val, patient_id]
            )
            try:
                cursor.execute(
                    "UPDATE tbl_patient_profile SET allergies=%s WHERE patient_id=%s",
                    [allergies_val, patient_id]
                )
            except Exception:
                pass

        log_audit(user['user_id'], f"Recorded clinical consultation visit ({visit_type}: VIS{visit_id:03d}, Patient: {patient_id}, Shared: {bool(is_shared)})", "Clinical Consultations", get_client_ip(request))

    return JsonResponse({
        'status': 'success',
        'message': 'Patient visit saved successfully.',
        'visit_id': visit_id,
        'appointment_id': appointment_id,
        'patient_id': patient_id,
        'is_shared': bool(is_shared),
        'visit_type': visit_type,
        'admission_id': admission_id,
        'admission_uid': f"ADM{admission_id:03d}" if admission_id else None,
    })


@csrf_exempt
def update_patient_allergies(request):
    """Allows doctors and patients to update allergy details. Restricts access from receptionists and admins."""
    user, error = require_roles(request, 'doctor', 'patient')
    if error:
        return error
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    ensure_workflow_schema()
    data = payload(request)
    patient_param = user['patient_id'] if user['role'] == 'patient' else (data.get('patient_id') or data.get('health_id'))
    allergies = (data.get('allergies') or '').strip()

    if not patient_param:
        return JsonResponse({'status': 'error', 'message': 'Patient is required.'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT patient_id FROM tbl_patient WHERE patient_id=%s OR patient_uid=%s LIMIT 1",
            [patient_param, patient_param]
        )
        row = cursor.fetchone()
        if not row:
            return JsonResponse({'status': 'error', 'message': 'Patient record not found.'}, status=404)
        patient_id = row[0]

        cursor.execute("UPDATE tbl_patient SET allergies=%s WHERE patient_id=%s", [allergies, patient_id])
        try:
            cursor.execute("UPDATE tbl_patient_profile SET allergies=%s WHERE patient_id=%s", [allergies, patient_id])
        except Exception:
            pass

    return JsonResponse({'status': 'success', 'message': 'Allergies updated successfully.', 'allergies': allergies})


@csrf_exempt
def prescriptions(request):
    """Complete digital prescription workflow for Doctor and Patient."""
    user, error = require_roles(request, 'doctor', 'patient')
    if error:
        return error
    ensure_workflow_schema()

    if request.method == 'GET':
        patient_param = request.GET.get('patient_id') or request.GET.get('health_id')
        params = []
        where = ["p.prescription_is_active = 1"]
        if user['role'] == 'patient':
            where.append("p.patient_id = %s")
            params.append(user['patient_id'])
            # Only return prescriptions explicitly allowed/shared by the doctor
            where.append("p.prescription_share_flag = 1")
        elif user['role'] == 'doctor':
            if patient_param:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT patient_id FROM tbl_patient WHERE patient_id=%s OR patient_uid=%s LIMIT 1", [patient_param, patient_param])
                    pr = cursor.fetchone()
                    if pr:
                        target_pid = pr[0]
                        cursor.execute("SELECT 1 FROM tbl_appointment WHERE patient_id=%s AND doctor_id=%s AND hospital_id=%s LIMIT 1", [target_pid, user['doctor_id'], user['hospital_id']])
                        if not cursor.fetchone():
                            return JsonResponse({'status': 'error', 'message': 'Not authorized to view prescriptions for this patient.'}, status=403)
                        where.append("p.patient_id = %s")
                        params.append(target_pid)
                        # Hide medicines from other doctors who haven't prescribed that medicine
                        where.append("p.doctor_id = %s")
                        params.append(user['doctor_id'])
                    else:
                        return JsonResponse({'status': 'success', 'prescriptions': []})
            else:
                # When no patient is specified, do not leak all patients' prescriptions; return empty list
                return JsonResponse({'status': 'success', 'prescriptions': []})

        adm_param = request.GET.get('admission_id')
        if adm_param and str(adm_param).isdigit():
            where.append("p.admission_id = %s")
            params.append(int(adm_param))

        where_clause = " WHERE " + " AND ".join(where) if where else ""
        sql = f"""
            SELECT p.prescription_id, p.patient_id, p.doctor_id, p.hospital_id, p.appointment_id, p.visit_id,
                   p.prescription_date, p.remarks, pt.patient_name, pt.patient_uid, du.user_name, h.hospital_name,
                   p.prescription_created_at, COALESCE(p.prescription_share_flag, 1), p.admission_id
            FROM tbl_prescription p
            LEFT JOIN tbl_patient pt ON pt.patient_id = p.patient_id
            LEFT JOIN tbl_doctor d ON d.doctor_id = p.doctor_id
            LEFT JOIN tbl_user du ON du.user_id = d.user_id
            LEFT JOIN tbl_hospital h ON h.hospital_id = p.hospital_id
            {where_clause}
            ORDER BY p.prescription_id DESC
        """
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            presc_list = []
            for r in rows:
                presc_id = r[0]
                cursor.execute(
                    "SELECT medicine_name, medicine_dosage, medicine_frequency, medicine_duration, medicine_instruction"
                    " FROM tbl_prescription_item WHERE prescription_id = %s",
                    [presc_id]
                )
                med_rows = cursor.fetchall()
                medicines = [
                    {
                        'medicine_name': m[0],
                        'dosage': m[1] or '',
                        'frequency': m[2] or '',
                        'duration': m[3] or '',
                        'instruction': m[4] or '',
                    }
                    for m in med_rows
                ]
                presc_list.append({
                    'prescription_id': presc_id,
                    'id': f"PRE{presc_id:03d}",
                    'prescription_uid': f"PRE{presc_id:03d}",
                    'patient_id': r[1],
                    'patient_name': r[8] or '',
                    'patient_uid': r[9] or f"PTA{r[1]:03d}",
                    'health_id': r[9] or f"PTA{r[1]:03d}",
                    'doctor_id': r[2],
                    'doctor_name': r[10] or 'Dr. Practitioner',
                    'hospital_name': r[11] or 'UniCare Partner Hospital',
                    'appointment_id': r[4],
                    'appointment_uid': f"APT{r[4]:03d}" if r[4] else 'N/A',
                    'visit_id': r[5],
                    'visit_uid': f"VIS{r[5]:03d}" if r[5] else 'N/A',
                    'admission_id': r[14],
                    'admission_uid': f"ADM{r[14]:03d}" if r[14] else None,
                    'date': str(r[6] or (r[12].strftime('%Y-%m-%d') if r[12] else '')),
                    'remarks': r[7] or '',
                    'is_shared': bool(r[13]),
                    'prescription_share_flag': r[13],
                    'medicines': medicines,
                })
        return JsonResponse({'status': 'success', 'prescriptions': presc_list})

    if request.method == 'DELETE':
        if user['role'] != 'doctor':
            return JsonResponse({'status': 'error', 'message': 'Only doctors can delete prescriptions.'}, status=403)
        presc_param = request.GET.get('prescription_id') or payload(request).get('prescription_id')
        if not presc_param:
            return JsonResponse({'status': 'error', 'message': 'prescription_id is required.'}, status=400)
        try:
            presc_id = int(presc_param)
        except (ValueError, TypeError):
            return JsonResponse({'status': 'error', 'message': 'Invalid prescription_id format.'}, status=400)

        with connection.cursor() as cursor:
            cursor.execute("SELECT doctor_id FROM tbl_prescription WHERE prescription_id = %s", [presc_id])
            p_row = cursor.fetchone()
            if not p_row:
                return JsonResponse({'status': 'error', 'message': 'Prescription not found.'}, status=404)
            if p_row[0] != user['doctor_id']:
                return JsonResponse({'status': 'error', 'message': 'You can only delete prescriptions authored by yourself.'}, status=403)

            cursor.execute("DELETE FROM tbl_prescription_item WHERE prescription_id = %s", [presc_id])
            cursor.execute("DELETE FROM tbl_prescription WHERE prescription_id = %s", [presc_id])

        log_audit(user['user_id'], f"Deleted prescription PRE{presc_id:03d}", "Pharmacy & Prescriptions", get_client_ip(request))
        return JsonResponse({'status': 'success', 'message': 'Prescription deleted successfully.'})

    if request.method == 'PATCH':
        if user['role'] != 'doctor':
            return JsonResponse({'status': 'error', 'message': 'Only doctors can update prescription sharing.'}, status=403)
        data = payload(request)
        presc_param = data.get('prescription_id')
        if not presc_param:
            return JsonResponse({'status': 'error', 'message': 'prescription_id is required.'}, status=400)
        try:
            presc_id = int(presc_param)
        except (ValueError, TypeError):
            return JsonResponse({'status': 'error', 'message': 'Invalid prescription_id format.'}, status=400)

        is_shared_flag = 1 if data.get('is_shared', True) else 0

        with connection.cursor() as cursor:
            cursor.execute("SELECT doctor_id FROM tbl_prescription WHERE prescription_id = %s", [presc_id])
            p_row = cursor.fetchone()
            if not p_row:
                return JsonResponse({'status': 'error', 'message': 'Prescription not found.'}, status=404)
            if p_row[0] != user['doctor_id']:
                return JsonResponse({'status': 'error', 'message': 'You can only manage sharing for your own prescriptions.'}, status=403)

            cursor.execute("UPDATE tbl_prescription SET prescription_share_flag = %s WHERE prescription_id = %s", [is_shared_flag, presc_id])

        log_audit(user['user_id'], f"Updated prescription PRE{presc_id:03d} sharing to {'Shared' if is_shared_flag else 'Internal'}", "Pharmacy & Prescriptions", get_client_ip(request))
        return JsonResponse({'status': 'success', 'message': f"Prescription sharing updated ({'Shared with Patient' if is_shared_flag else 'Internal Only'}).", 'is_shared': bool(is_shared_flag)})

    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    if user['role'] != 'doctor':
        return JsonResponse({'status': 'error', 'message': 'Only doctors can write and issue prescriptions.'}, status=403)

    data = payload(request)
    patient_param = data.get('patient_id') or data.get('health_id')
    raw_appointment_id = data.get('appointment_id')
    raw_visit_id = data.get('visit_id')
    raw_adm_id = data.get('admission_id')
    remarks = (data.get('remarks') or '').strip()
    is_shared = 1 if data.get('is_shared', False) else 0
    medicines = data.get('medicines') or []

    if not patient_param:
        return JsonResponse({'status': 'error', 'message': 'Patient is required.'}, status=400)
    if not medicines or not isinstance(medicines, list):
        return JsonResponse({'status': 'error', 'message': 'At least one medicine item is required.'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute("SELECT patient_id FROM tbl_patient WHERE patient_id=%s OR patient_uid=%s LIMIT 1", [patient_param, patient_param])
        p_row = cursor.fetchone()
        if not p_row:
            return JsonResponse({'status': 'error', 'message': 'Patient record not found.'}, status=404)
        patient_id = p_row[0]

        # Verify doctor is authorized for this patient (via appointment, admission, or hospital)
        cursor.execute("SELECT 1 FROM tbl_appointment WHERE patient_id=%s AND doctor_id=%s AND hospital_id=%s LIMIT 1", [patient_id, user['doctor_id'], user['hospital_id']])
        if not cursor.fetchone():
            cursor.execute("SELECT 1 FROM tbl_admission WHERE patient_id=%s AND (admitting_doctor_id=%s OR hospital_id=%s) LIMIT 1", [patient_id, user['doctor_id'], user['hospital_id']])
            if not cursor.fetchone():
                return JsonResponse({'status': 'error', 'message': 'You are not authorized to issue prescriptions for this patient.'}, status=403)

        app_id = int(raw_appointment_id) if raw_appointment_id and str(raw_appointment_id).isdigit() else None
        vis_id = int(raw_visit_id) if raw_visit_id and str(raw_visit_id).isdigit() else None
        adm_id = int(raw_adm_id) if raw_adm_id and str(raw_adm_id).isdigit() else None
        if not adm_id and vis_id:
            cursor.execute("SELECT admission_id FROM tbl_patient_visit WHERE visit_id = %s", [vis_id])
            v_adm = cursor.fetchone()
            if v_adm and v_adm[0]:
                adm_id = v_adm[0]

        cursor.execute(
            "INSERT INTO tbl_prescription (patient_id, doctor_id, hospital_id, appointment_id, visit_id, admission_id, prescription_date, remarks, prescription_share_flag, prescription_is_active)"
            " VALUES (%s, %s, %s, %s, %s, %s, CURRENT_DATE(), %s, %s, 1)",
            [patient_id, user['doctor_id'], user['hospital_id'], app_id, vis_id, adm_id, remarks, is_shared]
        )
        presc_id = cursor.lastrowid

        for m in medicines:
            m_name = (m.get('medicine_name') or m.get('name') or '').strip()
            if m_name:
                cursor.execute(
                    "INSERT INTO tbl_prescription_item (prescription_id, medicine_name, medicine_dosage, medicine_frequency, medicine_duration, medicine_instruction)"
                    " VALUES (%s, %s, %s, %s, %s, %s)",
                    [presc_id, m_name, (m.get('dosage') or '').strip(), (m.get('frequency') or '').strip(), (m.get('duration') or '').strip(), (m.get('instruction') or '').strip()]
                )

        log_audit(user['user_id'], f"Issued digital prescription PRE{presc_id:03d} (Patient: {patient_id}, Shared: {bool(is_shared)})", "Pharmacy & Prescriptions", get_client_ip(request))

    return JsonResponse({
        'status': 'success',
        'message': 'Digital prescription generated successfully.',
        'prescription': {
            'prescription_id': presc_id,
            'id': f"PRE{presc_id:03d}",
            'prescription_uid': f"PRE{presc_id:03d}",
            'is_shared': bool(is_shared),
        }
    })


@csrf_exempt
def lab_reports(request):
    """Complete diagnostic and laboratory report management workflow for all clinical roles."""
    user, error = require_roles(request, 'doctor', 'patient', 'nurse', 'hospital-admin', 'super-admin')
    if error:
        return error
    ensure_workflow_schema()

    if request.method == 'GET':
        patient_param = request.GET.get('patient_id') or request.GET.get('health_id')
        params = []
        where = ["l.report_is_active = 1"]

        if user['role'] == 'patient':
            where.append("l.patient_id = %s")
            params.append(user['patient_id'])
            # Patient only views reports explicitly shared across the network or patient portal
            where.append("l.report_share_flag = 1")
        elif user['role'] in ('doctor', 'nurse'):
            if patient_param:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT patient_id FROM tbl_patient WHERE patient_id=%s OR patient_uid=%s LIMIT 1", [patient_param, patient_param])
                    pr = cursor.fetchone()
                    if pr:
                        target_pid = pr[0]
                        where.append("l.patient_id = %s")
                        params.append(target_pid)
                        # Interoperability: Shared reports visible across hospitals; local reports stay within this hospital
                        where.append("(l.report_share_flag = 1 OR l.hospital_id = %s)")
                        params.append(user['hospital_id'])
                    else:
                        return JsonResponse({'status': 'success', 'reports': []})
            else:
                where.append("l.hospital_id = %s")
                params.append(user['hospital_id'])
        elif user['role'] == 'hospital-admin':
            if patient_param:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT patient_id FROM tbl_patient WHERE patient_id=%s OR patient_uid=%s LIMIT 1", [patient_param, patient_param])
                    pr = cursor.fetchone()
                    if pr:
                        where.append("l.patient_id = %s")
                        params.append(pr[0])
            where.append("l.hospital_id = %s")
            params.append(user['hospital_id'])
        elif user['role'] == 'super-admin':
            if patient_param:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT patient_id FROM tbl_patient WHERE patient_id=%s OR patient_uid=%s LIMIT 1", [patient_param, patient_param])
                    pr = cursor.fetchone()
                    if pr:
                        where.append("l.patient_id = %s")
                        params.append(pr[0])

        adm_param = request.GET.get('admission_id')
        if adm_param and str(adm_param).isdigit():
            where.append("l.admission_id = %s")
            params.append(int(adm_param))

        where_clause = " WHERE " + " AND ".join(where) if where else ""
        sql = f"""
            SELECT l.lab_report_id, l.patient_id, l.hospital_id, l.report_type, l.report_title, l.report_file,
                   l.report_uploaded_at, pt.patient_name, pt.patient_uid, h.hospital_name, COALESCE(l.report_share_flag, 1),
                   l.admission_id, l.visit_id
            FROM tbl_lab_report l
            LEFT JOIN tbl_patient pt ON pt.patient_id = l.patient_id
            LEFT JOIN tbl_hospital h ON h.hospital_id = l.hospital_id
            {where_clause}
            ORDER BY l.lab_report_id DESC
        """
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            reports_list = [
                {
                    'report_id': r[0],
                    'id': f"LAB{r[0]:03d}",
                    'lab_report_uid': f"LAB{r[0]:03d}",
                    'patient_id': r[1],
                    'patient_name': r[7] or '',
                    'patient_uid': r[8] or f"PTA{r[1]:03d}",
                    'health_id': r[8] or f"PTA{r[1]:03d}",
                    'hospital_name': r[9] or 'UniCare Diagnostic Lab',
                    'hospital_id': r[2],
                    'report_type': r[3] or 'Diagnostic Test',
                    'report_title': r[4] or 'Laboratory Report',
                    'report_file': r[5] or '',
                    'uploaded_at': r[6].strftime('%Y-%m-%d %H:%M') if hasattr(r[6], 'strftime') else str(r[6] or ''),
                    'is_shared': bool(r[10]),
                    'report_share_flag': r[10],
                    'admission_id': r[11],
                    'admission_uid': f"ADM{r[11]:03d}" if r[11] else None,
                    'visit_id': r[12],
                    'visit_uid': f"VIS{r[12]:03d}" if r[12] else None,
                }
                for r in rows
            ]
        return JsonResponse({'status': 'success', 'reports': reports_list})

    if request.method == 'PATCH':
        if user['role'] not in ('doctor', 'nurse', 'hospital-admin', 'super-admin'):
            return JsonResponse({'status': 'error', 'message': 'Only clinical staff can update report sharing.'}, status=403)
        data = payload(request)
        report_param = data.get('report_id')
        if not report_param:
            return JsonResponse({'status': 'error', 'message': 'report_id is required.'}, status=400)
        try:
            report_id = int(report_param)
        except (ValueError, TypeError):
            return JsonResponse({'status': 'error', 'message': 'Invalid report_id format.'}, status=400)

        is_shared_flag = 1 if data.get('is_shared', True) else 0

        with connection.cursor() as cursor:
            cursor.execute("SELECT hospital_id, report_title FROM tbl_lab_report WHERE lab_report_id = %s", [report_id])
            l_row = cursor.fetchone()
            if not l_row:
                return JsonResponse({'status': 'error', 'message': 'Lab report not found.'}, status=404)
            if user['role'] not in ('super-admin') and user.get('hospital_id') and l_row[0] != user['hospital_id']:
                return JsonResponse({'status': 'error', 'message': 'You can only manage reports from your hospital.'}, status=403)

            cursor.execute("UPDATE tbl_lab_report SET report_share_flag = %s WHERE lab_report_id = %s", [is_shared_flag, report_id])

        log_audit(user['user_id'], f"Updated lab report LAB{report_id:03d} sharing to {'Shared' if is_shared_flag else 'Local'}", "Laboratory", get_client_ip(request))
        return JsonResponse({'status': 'success', 'message': f"Report sharing updated ({'Shared Across Network' if is_shared_flag else 'Local to Facility'}).", 'is_shared': bool(is_shared_flag)})

    if request.method == 'DELETE':
        if user['role'] not in ('doctor', 'nurse', 'hospital-admin', 'super-admin'):
            return JsonResponse({'status': 'error', 'message': 'Only clinical staff can delete reports.'}, status=403)
        report_param = request.GET.get('report_id') or payload(request).get('report_id')
        if not report_param:
            return JsonResponse({'status': 'error', 'message': 'report_id is required.'}, status=400)
        try:
            report_id = int(report_param)
        except (ValueError, TypeError):
            return JsonResponse({'status': 'error', 'message': 'Invalid report_id format.'}, status=400)

        with connection.cursor() as cursor:
            cursor.execute("SELECT hospital_id FROM tbl_lab_report WHERE lab_report_id = %s", [report_id])
            l_row = cursor.fetchone()
            if not l_row:
                return JsonResponse({'status': 'error', 'message': 'Lab report not found.'}, status=404)
            if user['role'] not in ('super-admin') and user.get('hospital_id') and l_row[0] != user['hospital_id']:
                return JsonResponse({'status': 'error', 'message': 'You can only delete reports from your hospital.'}, status=403)

            cursor.execute("UPDATE tbl_lab_report SET report_is_active = 0 WHERE lab_report_id = %s", [report_id])

        log_audit(user['user_id'], f"Deactivated lab report LAB{report_id:03d}", "Laboratory", get_client_ip(request))
        return JsonResponse({'status': 'success', 'message': 'Lab report removed successfully.'})

    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    data = payload(request)
    patient_param = data.get('patient_id') or data.get('health_id') or (user['patient_id'] if user['role'] == 'patient' else None)
    report_type = (data.get('report_type') or 'Diagnostic Test').strip()
    report_title = (data.get('report_title') or data.get('title') or '').strip()
    report_file = (data.get('report_file') or data.get('file') or data.get('results') or '').strip()
    hospital_id = data.get('hospital_id') or user.get('hospital_id')
    is_shared = 1 if data.get('is_shared', False) else 0
    raw_admission_id = data.get('admission_id')
    raw_visit_id = data.get('visit_id')
    adm_id = int(raw_admission_id) if raw_admission_id and str(raw_admission_id).isdigit() else None
    vis_id = int(raw_visit_id) if raw_visit_id and str(raw_visit_id).isdigit() else None

    if not report_title:
        return JsonResponse({'status': 'error', 'message': 'Report title is required.'}, status=400)
    if not patient_param:
        return JsonResponse({'status': 'error', 'message': 'Patient is required.'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute("SELECT patient_id FROM tbl_patient WHERE patient_id=%s OR patient_uid=%s LIMIT 1", [patient_param, patient_param])
        p_row = cursor.fetchone()
        if not p_row:
            return JsonResponse({'status': 'error', 'message': 'Patient record not found.'}, status=404)
        patient_id = p_row[0]

        if not adm_id and vis_id:
            cursor.execute("SELECT admission_id FROM tbl_patient_visit WHERE visit_id = %s", [vis_id])
            v_adm = cursor.fetchone()
            if v_adm and v_adm[0]:
                adm_id = v_adm[0]

        doc_id = user.get('doctor_id') or None
        cursor.execute(
            "INSERT INTO tbl_lab_report (patient_id, doctor_id, hospital_id, visit_id, admission_id, report_type, report_title, report_file, report_share_flag, report_is_active)"
            " VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 1)",
            [patient_id, doc_id, hospital_id, vis_id, adm_id, report_type, report_title, report_file, is_shared]
        )
        report_id = cursor.lastrowid

        log_audit(user['user_id'], f"Uploaded lab report LAB{report_id:03d} ({report_title}, Patient: {patient_id}, Shared: {bool(is_shared)})", "Laboratory", get_client_ip(request))

    return JsonResponse({
        'status': 'success',
        'message': 'Laboratory diagnostic report saved successfully.',
        'report': {
            'report_id': report_id,
            'id': f"LAB{report_id:03d}",
            'lab_report_uid': f"LAB{report_id:03d}",
            'report_type': report_type,
            'report_title': report_title,
            'admission_id': adm_id,
            'admission_uid': f"ADM{adm_id:03d}" if adm_id else None,
            'visit_id': vis_id,
            'is_shared': bool(is_shared),
        }
    })


@csrf_exempt
def audit_logs(request):
    """Immutable audit trail log view for Super Admin and Hospital Admin."""
    user, error = session_user(request)
    if error:
        if not request.session.get('admin_id'):
            return error
        user = {'user_id': request.session.get('admin_id'), 'role': 'super-admin', 'hospital_id': None}

    if user['role'] not in ('super-admin', 'hospital-admin'):
        return JsonResponse({'status': 'error', 'message': 'Access denied.'}, status=403)

    search = (request.GET.get('search') or request.GET.get('q') or '').strip().lower()
    module_filter = (request.GET.get('module') or '').strip()

    where = []
    params = []
    if module_filter and module_filter != 'all':
        where.append("a.audit_module = %s")
        params.append(module_filter)
    if search:
        where.append("(LOWER(a.audit_action) LIKE %s OR LOWER(COALESCE(u.user_name, '')) LIKE %s OR LOWER(COALESCE(u.user_email, '')) LIKE %s OR LOWER(COALESCE(r.role_name, '')) LIKE %s)")
        params.extend([f"%{search}%", f"%{search}%", f"%{search}%", f"%{search}%"])

    where_clause = " WHERE " + " AND ".join(where) if where else ""
    sql = f"""
        SELECT a.audit_id, a.user_id, a.audit_action, a.audit_module, a.audit_ip_address, a.audit_datetime,
               COALESCE(u.user_name, 'System Administrator') AS user_name,
               COALESCE(u.user_email, '') AS user_email,
               COALESCE(r.role_name, 'Administrator') AS role_name
        FROM tbl_audit_log a
        LEFT JOIN tbl_user u ON a.user_id = u.user_id
        LEFT JOIN tbl_role r ON u.role_id = r.role_id
        {where_clause}
        ORDER BY a.audit_datetime DESC, a.audit_id DESC
        LIMIT 200
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        logs = [
            {
                'audit_id': r[0],
                'id': f"AUD{r[0]:04d}",
                'user_id': r[1],
                'action': r[2],
                'module': r[3],
                'ip_address': r[4] or '127.0.0.1',
                'timestamp': r[5].strftime('%Y-%m-%d %H:%M:%S') if hasattr(r[5], 'strftime') else str(r[5]),
                'user_name': r[6],
                'user_email': r[7],
                'role_name': r[8],
            }
            for r in rows
        ]

    return JsonResponse({'status': 'success', 'logs': logs, 'count': len(logs)})


@csrf_exempt
def admissions(request):
    """Inpatient Admissions Management endpoint for Doctor, Nurse, Hospital Admin, Super Admin."""
    user, error = require_roles(request, 'doctor', 'nurse', 'hospital-admin', 'super-admin')
    if error:
        return error
    ensure_workflow_schema()

    if request.method == 'GET':
        status_filter = (request.GET.get('status') or 'all').strip()
        date_filter = (request.GET.get('date') or '').strip()
        search = (request.GET.get('search') or request.GET.get('q') or '').strip().lower()
        patient_param = request.GET.get('patient_id') or request.GET.get('health_id')
        doctor_param = request.GET.get('doctor_id')

        where = []
        params = []

        if user['role'] != 'super-admin' and user.get('hospital_id'):
            where.append("a.hospital_id = %s")
            params.append(user['hospital_id'])

        if status_filter and status_filter != 'all':
            where.append("a.admission_status = %s")
            params.append(status_filter)

        if date_filter:
            where.append("a.admission_date = %s")
            params.append(date_filter)

        if doctor_param and str(doctor_param).isdigit():
            where.append("a.admitting_doctor_id = %s")
            params.append(int(doctor_param))

        if patient_param:
            where.append("(p.patient_id = %s OR p.patient_uid = %s)")
            params.extend([patient_param, patient_param])

        if search:
            where.append("(LOWER(p.patient_name) LIKE %s OR LOWER(COALESCE(p.patient_uid, '')) LIKE %s OR LOWER(COALESCE(a.admission_uid, '')) LIKE %s OR LOWER(COALESCE(a.ward_bed, '')) LIKE %s)")
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%", f"%{search}%"])

        where_clause = " WHERE " + " AND ".join(where) if where else ""
        sql = f"""
            SELECT a.admission_id, COALESCE(a.admission_uid, CONCAT('ADM', LPAD(a.admission_id, 3, '0'))) AS admission_uid,
                   a.patient_id, p.patient_name, p.patient_uid, p.patient_gender, p.patient_blood_group, p.patient_phone,
                   a.hospital_id, h.hospital_name,
                   a.admitting_doctor_id, COALESCE(du.user_name, 'Attending Physician') AS doctor_name,
                   a.admission_date, a.admission_status, a.discharge_date, a.ward_bed, a.admission_reason, a.discharge_summary,
                   a.created_at,
                   (SELECT COUNT(*) FROM tbl_patient_visit pv WHERE pv.admission_id = a.admission_id) AS visits_count,
                   (SELECT COUNT(*) FROM tbl_prescription pr WHERE pr.admission_id = a.admission_id) AS prescriptions_count,
                   (SELECT COUNT(*) FROM tbl_lab_report lr WHERE lr.admission_id = a.admission_id) AS lab_reports_count
            FROM tbl_admission a
            JOIN tbl_patient p ON p.patient_id = a.patient_id
            JOIN tbl_hospital h ON h.hospital_id = a.hospital_id
            LEFT JOIN tbl_doctor d ON d.doctor_id = a.admitting_doctor_id
            LEFT JOIN tbl_user du ON du.user_id = d.user_id
            {where_clause}
            ORDER BY a.admission_date DESC, a.admission_id DESC
        """
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            admissions_list = [
                {
                    'admission_id': r[0],
                    'id': r[1],
                    'admission_uid': r[1],
                    'patient_id': r[2],
                    'patient_name': r[3],
                    'patient_uid': r[4] or f"PTA{r[2]:03d}",
                    'health_id': r[4] or f"PTA{r[2]:03d}",
                    'patient_gender': r[5] or '',
                    'gender': r[5] or '',
                    'patient_blood_group': r[6] or '',
                    'blood_group': r[6] or '',
                    'patient_phone': r[7] or '',
                    'phone': r[7] or '',
                    'hospital_id': r[8],
                    'hospital_name': r[9],
                    'doctor_id': r[10],
                    'admitting_doctor_id': r[10],
                    'doctor_name': r[11],
                    'admission_date': str(r[12]) if r[12] else '',
                    'raw_date': r[12].isoformat() if hasattr(r[12], 'isoformat') else str(r[12] or ''),
                    'admission_status': r[13] or 'Admitted',
                    'status': r[13] or 'Admitted',
                    'discharge_date': str(r[14]) if r[14] else '',
                    'ward_bed': r[15] or 'General Ward',
                    'admission_reason': r[16] or '',
                    'discharge_summary': r[17] or '',
                    'created_at': r[18].strftime('%Y-%m-%d %H:%M') if hasattr(r[18], 'strftime') else str(r[18] or ''),
                    'visits_count': r[19],
                    'prescriptions_count': r[20],
                    'lab_reports_count': r[21],
                }
                for r in rows
            ]
        return JsonResponse({'status': 'success', 'admissions': admissions_list, 'count': len(admissions_list)})

    if request.method == 'POST':
        if user['role'] not in ('doctor', 'nurse', 'hospital-admin'):
            return JsonResponse({'status': 'error', 'message': 'Only clinical staff can create inpatient admissions.'}, status=403)
        data = payload(request)
        patient_param = data.get('patient_id') or data.get('health_id')
        ward_bed = (data.get('ward_bed') or 'General Ward').strip()
        admission_reason = (data.get('admission_reason') or 'Inpatient Care').strip()
        doctor_id = data.get('doctor_id') or user.get('doctor_id')
        admission_date = data.get('admission_date') or None

        if not patient_param:
            return JsonResponse({'status': 'error', 'message': 'Patient ID or Health ID is required.'}, status=400)

        with connection.cursor() as cursor:
            cursor.execute("SELECT patient_id, patient_name FROM tbl_patient WHERE patient_id=%s OR patient_uid=%s LIMIT 1", [patient_param, patient_param])
            p_row = cursor.fetchone()
            if not p_row:
                return JsonResponse({'status': 'error', 'message': 'Patient record not found.'}, status=404)
            patient_id, patient_name = p_row

            # Check if patient already has an active admission at this hospital
            cursor.execute("SELECT admission_id, admission_uid FROM tbl_admission WHERE patient_id=%s AND hospital_id=%s AND admission_status='Admitted' LIMIT 1", [patient_id, user['hospital_id']])
            existing_adm = cursor.fetchone()
            if existing_adm:
                return JsonResponse({
                    'status': 'error',
                    'message': f"Patient already has an active admission ({existing_adm[1] or ('ADM' + str(existing_adm[0]))}) at this hospital.",
                    'admission_id': existing_adm[0]
                }, status=400)

            date_sql = "%s" if admission_date else "CURRENT_DATE()"
            insert_params = [patient_id, user['hospital_id'], doctor_id]
            if admission_date:
                insert_params.append(admission_date)
            insert_params.extend([ward_bed, admission_reason])

            cursor.execute(
                f"INSERT INTO tbl_admission (patient_id, hospital_id, admitting_doctor_id, admission_date, admission_status, ward_bed, admission_reason)"
                f" VALUES (%s, %s, %s, {date_sql}, 'Admitted', %s, %s)",
                insert_params
            )
            admission_id = cursor.lastrowid
            adm_uid = f"ADM{admission_id:03d}"
            cursor.execute("UPDATE tbl_admission SET admission_uid=%s WHERE admission_id=%s", [adm_uid, admission_id])

            log_audit(user['user_id'], f"Admitted patient {patient_name} (ID: {patient_id}) to {ward_bed} ({adm_uid})", "Inpatient Management", get_client_ip(request))

        return JsonResponse({
            'status': 'success',
            'message': f'Inpatient admission created successfully ({adm_uid}).',
            'admission': {
                'admission_id': admission_id,
                'admission_uid': adm_uid,
                'patient_id': patient_id,
                'ward_bed': ward_bed,
                'admission_status': 'Admitted'
            }
        })

    if request.method == 'PATCH':
        if user['role'] not in ('doctor', 'nurse', 'hospital-admin'):
            return JsonResponse({'status': 'error', 'message': 'Only clinical staff can update admissions.'}, status=403)
        data = payload(request)
        adm_param = data.get('admission_id')
        if not adm_param:
            return JsonResponse({'status': 'error', 'message': 'admission_id is required.'}, status=400)
        try:
            admission_id = int(adm_param)
        except (ValueError, TypeError):
            return JsonResponse({'status': 'error', 'message': 'Invalid admission_id format.'}, status=400)

        action = data.get('action') or ('discharge' if data.get('discharge_summary') or data.get('admission_status') == 'Discharged' else 'update')

        with connection.cursor() as cursor:
            cursor.execute("SELECT hospital_id, admission_status, admission_uid, patient_id FROM tbl_admission WHERE admission_id=%s", [admission_id])
            adm = cursor.fetchone()
            if not adm:
                return JsonResponse({'status': 'error', 'message': 'Admission not found.'}, status=404)
            if user['role'] != 'super-admin' and user.get('hospital_id') and adm[0] != user['hospital_id']:
                return JsonResponse({'status': 'error', 'message': 'You can only update admissions in your hospital facility.'}, status=403)

            adm_uid = adm[2] or f"ADM{admission_id:03d}"

            if action == 'discharge':
                summary = (data.get('discharge_summary') or data.get('medical_notes') or 'Patient condition improved. Discharged.').strip()
                cursor.execute(
                    "UPDATE tbl_admission SET admission_status='Discharged', discharge_date=CURRENT_DATE(), discharge_summary=%s WHERE admission_id=%s",
                    [summary, admission_id]
                )
                log_audit(user['user_id'], f"Discharged inpatient {adm_uid} (Patient: {adm[3]})", "Inpatient Management", get_client_ip(request))
                return JsonResponse({'status': 'success', 'message': f'Patient admission {adm_uid} has been marked as Discharged.'})
            else:
                updates = []
                u_params = []
                if 'ward_bed' in data:
                    updates.append("ward_bed = %s")
                    u_params.append(data['ward_bed'])
                if 'admission_reason' in data:
                    updates.append("admission_reason = %s")
                    u_params.append(data['admission_reason'])
                if 'admission_status' in data:
                    updates.append("admission_status = %s")
                    u_params.append(data['admission_status'])
                if updates:
                    u_params.append(admission_id)
                    cursor.execute(f"UPDATE tbl_admission SET {', '.join(updates)} WHERE admission_id=%s", u_params)
                log_audit(user['user_id'], f"Updated inpatient admission details for {adm_uid}", "Inpatient Management", get_client_ip(request))
                return JsonResponse({'status': 'success', 'message': f'Admission {adm_uid} updated successfully.'})

    return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)


@csrf_exempt
def admission_detail(request):
    """Retrieve full inpatient admission file with all linked visits, vitals, prescriptions, and lab reports."""
    user, error = require_roles(request, 'doctor', 'nurse', 'hospital-admin', 'super-admin', 'patient')
    if error:
        return error
    ensure_workflow_schema()

    adm_param = request.GET.get('admission_id') or request.GET.get('id')
    if not adm_param:
        return JsonResponse({'status': 'error', 'message': 'admission_id is required.'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT a.admission_id, COALESCE(a.admission_uid, CONCAT('ADM', LPAD(a.admission_id, 3, '0'))) AS admission_uid,"
            " a.patient_id, p.patient_name, p.patient_uid, p.patient_gender, p.patient_blood_group, p.patient_phone,"
            " p.patient_dob, p.allergies, p.patient_emergency_contact,"
            " a.hospital_id, h.hospital_name,"
            " a.admitting_doctor_id, COALESCE(du.user_name, 'Attending Physician') AS doctor_name,"
            " a.admission_date, a.admission_status, a.discharge_date, a.ward_bed, a.admission_reason, a.discharge_summary,"
            " a.created_at"
            " FROM tbl_admission a"
            " JOIN tbl_patient p ON p.patient_id = a.patient_id"
            " JOIN tbl_hospital h ON h.hospital_id = a.hospital_id"
            " LEFT JOIN tbl_doctor d ON d.doctor_id = a.admitting_doctor_id"
            " LEFT JOIN tbl_user du ON du.user_id = d.user_id"
            " WHERE a.admission_id=%s OR a.admission_uid=%s LIMIT 1",
            [adm_param, adm_param]
        )
        adm_row = cursor.fetchone()
        if not adm_row:
            return JsonResponse({'status': 'error', 'message': 'Inpatient admission not found.'}, status=404)

        if user['role'] == 'patient' and user.get('patient_id') != adm_row[2]:
            return JsonResponse({'status': 'error', 'message': 'Access denied.'}, status=403)
        if user['role'] != 'super-admin' and user['role'] != 'patient' and user.get('hospital_id') and adm_row[11] != user['hospital_id']:
            return JsonResponse({'status': 'error', 'message': 'Access restricted to originating hospital facility.'}, status=403)

        admission_id = adm_row[0]
        patient_id = adm_row[2]

        admission = {
            'admission_id': admission_id,
            'id': adm_row[1],
            'admission_uid': adm_row[1],
            'patient_id': patient_id,
            'patient_name': adm_row[3],
            'patient_uid': adm_row[4] or f"PTA{patient_id:03d}",
            'health_id': adm_row[4] or f"PTA{patient_id:03d}",
            'gender': adm_row[5] or '',
            'blood_group': adm_row[6] or '',
            'phone': adm_row[7] or '',
            'date_of_birth': str(adm_row[8]) if adm_row[8] else '',
            'allergies': adm_row[9] or 'None recorded',
            'emergency_contact': adm_row[10] or '',
            'hospital_id': adm_row[11],
            'hospital_name': adm_row[12],
            'admitting_doctor_id': adm_row[13],
            'doctor_name': adm_row[14],
            'admission_date': str(adm_row[15]) if adm_row[15] else '',
            'admission_status': adm_row[16] or 'Admitted',
            'status': adm_row[16] or 'Admitted',
            'discharge_date': str(adm_row[17]) if adm_row[17] else '',
            'ward_bed': adm_row[18] or 'General Ward',
            'admission_reason': adm_row[19] or '',
            'discharge_summary': adm_row[20] or '',
            'created_at': adm_row[21].strftime('%Y-%m-%d %H:%M') if hasattr(adm_row[21], 'strftime') else str(adm_row[21] or ''),
        }

        # 1. Linked Visits & Consultations during this admission
        cursor.execute(
            "SELECT pv.visit_id, pv.diagnosis, pv.medical_notes, pv.visited_at,"
            " COALESCE(du.user_name, 'Attending Doctor') AS doctor_name,"
            " pv.height, pv.weight, pv.blood_pressure, pv.vitals_recorded_at, nu.user_name AS vitals_by_name"
            " FROM tbl_patient_visit pv"
            " LEFT JOIN tbl_doctor d ON d.doctor_id = pv.doctor_id"
            " LEFT JOIN tbl_user du ON du.user_id = d.user_id"
            " LEFT JOIN tbl_user nu ON nu.user_id = pv.vitals_recorded_by"
            " WHERE pv.admission_id = %s"
            " ORDER BY pv.visited_at DESC, pv.visit_id DESC",
            [admission_id]
        )
        v_rows = cursor.fetchall()
        visits_list = []
        visit_ids = []
        for v in v_rows:
            visit_ids.append(v[0])
            height_m = None
            bmi = None
            if v[5] and v[6]:
                try:
                    height_m = float(v[5]) / 100.0
                    weight_kg = float(v[6])
                    if height_m > 0:
                        bmi = round(weight_kg / (height_m ** 2), 1)
                except Exception:
                    pass
            visits_list.append({
                'visit_id': v[0],
                'id': f"VIS{v[0]:03d}",
                'visit_uid': f"VIS{v[0]:03d}",
                'diagnosis': v[1] or 'Inpatient Round / Daily Assessment',
                'medical_notes': v[2] or '',
                'visited_at': v[3].strftime('%Y-%m-%d %H:%M') if hasattr(v[3], 'strftime') else str(v[3] or ''),
                'doctor_name': v[4],
                'height': v[5] or '',
                'weight': v[6] or '',
                'blood_pressure': v[7] or '',
                'bmi': bmi,
                'vitals_recorded_at': v[8].strftime('%Y-%m-%d %H:%M') if hasattr(v[8], 'strftime') else str(v[8] or ''),
                'vitals_by_name': v[9] or '',
            })

        # 2. Linked Prescriptions
        in_clause = ','.join(['%s'] * len(visit_ids)) if visit_ids else '0'
        presc_sql = f"""
            SELECT p.prescription_id, p.prescription_date, p.remarks, du.user_name AS doctor_name, p.prescription_share_flag
            FROM tbl_prescription p
            LEFT JOIN tbl_doctor d ON d.doctor_id = p.doctor_id
            LEFT JOIN tbl_user du ON du.user_id = d.user_id
            WHERE p.prescription_is_active = 1 AND (p.admission_id = %s OR p.visit_id IN ({in_clause}))
            ORDER BY p.prescription_date DESC, p.prescription_id DESC
        """
        presc_params = [admission_id] + (visit_ids if visit_ids else [])
        cursor.execute(presc_sql, presc_params)
        p_rows = cursor.fetchall()
        prescriptions_list = []
        for pr in p_rows:
            presc_id = pr[0]
            cursor.execute(
                "SELECT medicine_name, medicine_dosage, medicine_frequency, medicine_duration, medicine_instruction"
                " FROM tbl_prescription_item WHERE prescription_id = %s",
                [presc_id]
            )
            med_rows = cursor.fetchall()
            prescriptions_list.append({
                'prescription_id': presc_id,
                'id': f"PRE{presc_id:03d}",
                'prescription_uid': f"PRE{presc_id:03d}",
                'date': str(pr[1]) if pr[1] else '',
                'remarks': pr[2] or '',
                'doctor_name': pr[3] or 'Attending Doctor',
                'is_shared': bool(pr[4]),
                'medicines': [
                    {
                        'medicine_name': m[0],
                        'dosage': m[1] or '',
                        'frequency': m[2] or '',
                        'duration': m[3] or '',
                        'instruction': m[4] or '',
                    }
                    for m in med_rows
                ]
            })

        # 3. Linked Diagnostic Lab Reports
        rep_sql = f"""
            SELECT lr.lab_report_id, lr.report_type, lr.report_title, lr.report_file, lr.report_uploaded_at, lr.report_share_flag
            FROM tbl_lab_report lr
            WHERE lr.report_is_active = 1 AND (lr.admission_id = %s OR lr.visit_id IN ({in_clause}))
            ORDER BY lr.report_uploaded_at DESC, lr.lab_report_id DESC
        """
        rep_params = [admission_id] + (visit_ids if visit_ids else [])
        cursor.execute(rep_sql, rep_params)
        l_rows = cursor.fetchall()
        reports_list = [
            {
                'report_id': lr[0],
                'id': f"LAB{lr[0]:03d}",
                'lab_report_uid': f"LAB{lr[0]:03d}",
                'report_type': lr[1] or 'Diagnostic Report',
                'report_title': lr[2] or 'Laboratory Test',
                'report_file': lr[3] or '',
                'uploaded_at': lr[4].strftime('%Y-%m-%d %H:%M') if hasattr(lr[4], 'strftime') else str(lr[4] or ''),
                'is_shared': bool(lr[5]),
            }
            for lr in l_rows
        ]

    return JsonResponse({
        'status': 'success',
        'admission': admission,
        'visits': visits_list,
        'prescriptions': prescriptions_list,
        'lab_reports': reports_list,
    })


@csrf_exempt
def clinical_records(request):
    """Unified date-sorted Inpatient and Outpatient clinical records for Nurse and Doctor modules."""
    user, error = require_roles(request, 'nurse', 'doctor', 'hospital-admin', 'super-admin')
    if error:
        return error
    ensure_workflow_schema()

    record_type = (request.GET.get('type') or 'all').strip().upper()  # 'ALL', 'OP', 'IP'
    date_filter = (request.GET.get('date') or '').strip()
    search = (request.GET.get('search') or request.GET.get('q') or '').strip().lower()
    doctor_param = request.GET.get('doctor_id')
    status_filter = (request.GET.get('status') or 'all').strip()

    op_records = []
    ip_records = []

    with connection.cursor() as cursor:
        # Fetch Outpatient Visits if requested
        if record_type in ('ALL', 'OP'):
            where_op = ["(pv.visit_type = 'OP' OR pv.visit_type IS NULL)"]
            params_op = []
            if user['role'] != 'super-admin' and user.get('hospital_id'):
                where_op.append("pv.hospital_id = %s")
                params_op.append(user['hospital_id'])
            if date_filter:
                where_op.append("DATE(pv.visited_at) = %s")
                params_op.append(date_filter)
            if doctor_param and str(doctor_param).isdigit():
                where_op.append("pv.doctor_id = %s")
                params_op.append(int(doctor_param))
            if search:
                where_op.append("(LOWER(p.patient_name) LIKE %s OR LOWER(COALESCE(p.patient_uid, '')) LIKE %s OR LOWER(COALESCE(pv.diagnosis, '')) LIKE %s)")
                params_op.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

            where_op_clause = " WHERE " + " AND ".join(where_op)
            sql_op = f"""
                SELECT pv.visit_id, pv.patient_id, p.patient_name, p.patient_uid, p.patient_gender, p.patient_phone,
                       pv.doctor_id, COALESCE(du.user_name, 'Practicing Doctor') AS doctor_name,
                       COALESCE(dept.department_name, 'General Medicine') AS department_name,
                       pv.hospital_id, h.hospital_name,
                       pv.visited_at, pv.diagnosis, pv.medical_notes,
                       pv.height, pv.weight, pv.blood_pressure, pv.vitals_recorded_at,
                       COALESCE(nu.user_name, '') AS vitals_by_name,
                       pv.appointment_id, COALESCE(pv.record_share_flag, 1),
                       (SELECT COUNT(*) FROM tbl_prescription pr WHERE pr.visit_id = pv.visit_id) AS presc_count,
                       (SELECT COUNT(*) FROM tbl_lab_report lr WHERE lr.visit_id = pv.visit_id) AS rep_count
                FROM tbl_patient_visit pv
                JOIN tbl_patient p ON p.patient_id = pv.patient_id
                JOIN tbl_hospital h ON h.hospital_id = pv.hospital_id
                LEFT JOIN tbl_doctor d ON d.doctor_id = pv.doctor_id
                LEFT JOIN tbl_user du ON du.user_id = d.user_id
                LEFT JOIN tbl_department dept ON dept.department_id = d.department_id
                LEFT JOIN tbl_user nu ON nu.user_id = pv.vitals_recorded_by
                {where_op_clause}
                ORDER BY pv.visited_at DESC, pv.visit_id DESC
                LIMIT 300
            """
            cursor.execute(sql_op, params_op)
            for r in cursor.fetchall():
                height_m = None
                bmi = None
                if r[14] and r[15]:
                    try:
                        height_m = float(r[14]) / 100.0
                        weight_kg = float(r[15])
                        if height_m > 0:
                            bmi = round(weight_kg / (height_m ** 2), 1)
                    except Exception:
                        pass
                op_records.append({
                    'record_type': 'OP',
                    'visit_id': r[0],
                    'id': f"VIS{r[0]:03d}",
                    'visit_uid': f"VIS{r[0]:03d}",
                    'patient_id': r[1],
                    'patient_name': r[2],
                    'patient_uid': r[3] or f"PTA{r[1]:03d}",
                    'health_id': r[3] or f"PTA{r[1]:03d}",
                    'gender': r[4] or '',
                    'phone': r[5] or '',
                    'doctor_id': r[6],
                    'doctor_name': r[7],
                    'department_name': r[8],
                    'hospital_id': r[9],
                    'hospital_name': r[10],
                    'visit_date': r[11].strftime('%Y-%m-%d %H:%M') if hasattr(r[11], 'strftime') else str(r[11] or ''),
                    'raw_date': r[11].isoformat() if hasattr(r[11], 'isoformat') else str(r[11] or ''),
                    'diagnosis': r[12] or 'General Outpatient Visit',
                    'medical_notes': r[13] or '',
                    'vitals': {
                        'height': r[14] or '',
                        'weight': r[15] or '',
                        'blood_pressure': r[16] or '',
                        'bmi': bmi,
                        'recorded_at': r[17].strftime('%Y-%m-%d %H:%M') if hasattr(r[17], 'strftime') else str(r[17] or ''),
                        'recorded_by': r[18],
                    },
                    'appointment_id': r[19],
                    'appointment_uid': f"APT{r[19]:03d}" if r[19] else 'N/A',
                    'is_shared': bool(r[20]),
                    'prescriptions_count': r[21],
                    'lab_reports_count': r[22],
                })

        # Fetch Inpatient Admissions if requested
        if record_type in ('ALL', 'IP'):
            where_ip = []
            params_ip = []
            if user['role'] != 'super-admin' and user.get('hospital_id'):
                where_ip.append("a.hospital_id = %s")
                params_ip.append(user['hospital_id'])
            if date_filter:
                where_ip.append("a.admission_date = %s")
                params_ip.append(date_filter)
            if status_filter and status_filter != 'all':
                where_ip.append("a.admission_status = %s")
                params_ip.append(status_filter)
            if doctor_param and str(doctor_param).isdigit():
                where_ip.append("a.admitting_doctor_id = %s")
                params_ip.append(int(doctor_param))
            if search:
                where_ip.append("(LOWER(p.patient_name) LIKE %s OR LOWER(COALESCE(p.patient_uid, '')) LIKE %s OR LOWER(COALESCE(a.admission_uid, '')) LIKE %s OR LOWER(COALESCE(a.ward_bed, '')) LIKE %s)")
                params_ip.extend([f"%{search}%", f"%{search}%", f"%{search}%", f"%{search}%"])

            where_ip_clause = " WHERE " + " AND ".join(where_ip) if where_ip else ""
            sql_ip = f"""
                SELECT a.admission_id, COALESCE(a.admission_uid, CONCAT('ADM', LPAD(a.admission_id, 3, '0'))) AS admission_uid,
                       a.patient_id, p.patient_name, p.patient_uid, p.patient_gender, p.patient_phone,
                       a.hospital_id, h.hospital_name,
                       a.admitting_doctor_id, COALESCE(du.user_name, 'Attending Physician') AS doctor_name,
                       COALESCE(dept.department_name, 'Inpatient Care') AS department_name,
                       a.admission_date, a.admission_status, a.discharge_date, a.ward_bed, a.admission_reason, a.discharge_summary,
                       a.created_at,
                       (SELECT COUNT(*) FROM tbl_patient_visit pv WHERE pv.admission_id = a.admission_id) AS visits_count,
                       (SELECT COUNT(*) FROM tbl_prescription pr WHERE pr.admission_id = a.admission_id) AS prescriptions_count,
                       (SELECT COUNT(*) FROM tbl_lab_report lr WHERE lr.admission_id = a.admission_id) AS lab_reports_count
                FROM tbl_admission a
                JOIN tbl_patient p ON p.patient_id = a.patient_id
                JOIN tbl_hospital h ON h.hospital_id = a.hospital_id
                LEFT JOIN tbl_doctor d ON d.doctor_id = a.admitting_doctor_id
                LEFT JOIN tbl_user du ON du.user_id = d.user_id
                LEFT JOIN tbl_department dept ON dept.department_id = d.department_id
                {where_ip_clause}
                ORDER BY a.admission_date DESC, a.admission_id DESC
                LIMIT 300
            """
            cursor.execute(sql_ip, params_ip)
            for r in cursor.fetchall():
                ip_records.append({
                    'record_type': 'IP',
                    'admission_id': r[0],
                    'id': r[1],
                    'admission_uid': r[1],
                    'patient_id': r[2],
                    'patient_name': r[3],
                    'patient_uid': r[4] or f"PTA{r[2]:03d}",
                    'health_id': r[4] or f"PTA{r[2]:03d}",
                    'gender': r[5] or '',
                    'phone': r[6] or '',
                    'hospital_id': r[7],
                    'hospital_name': r[8],
                    'doctor_id': r[9],
                    'admitting_doctor_id': r[9],
                    'doctor_name': r[10],
                    'department_name': r[11],
                    'admission_date': str(r[12]) if r[12] else '',
                    'raw_date': r[12].isoformat() if hasattr(r[12], 'isoformat') else str(r[12] or ''),
                    'admission_status': r[13] or 'Admitted',
                    'status': r[13] or 'Admitted',
                    'discharge_date': str(r[14]) if r[14] else '',
                    'ward_bed': r[15] or 'General Ward',
                    'admission_reason': r[16] or '',
                    'discharge_summary': r[17] or '',
                    'created_at': r[18].strftime('%Y-%m-%d %H:%M') if hasattr(r[18], 'strftime') else str(r[18] or ''),
                    'visits_count': r[19],
                    'prescriptions_count': r[20],
                    'lab_reports_count': r[21],
                })

    # Assemble unified timeline sorted strictly by raw_date descending (newest first)
    timeline = sorted(
        op_records + ip_records,
        key=lambda x: str(x.get('raw_date') or ''),
        reverse=True
    )

    return JsonResponse({
        'status': 'success',
        'op_records': op_records,
        'ip_records': ip_records,
        'timeline': timeline,
        'total_count': len(timeline),
    })

