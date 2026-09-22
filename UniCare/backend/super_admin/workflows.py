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
        # Ensure tbl_patient_visit has all required columns including pre-consultation vitals
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
            prescription_date DATE NULL, remarks TEXT NULL, prescription_share_flag TINYINT(1) DEFAULT 1,
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
            report_share_flag TINYINT(1) DEFAULT 1, report_is_active TINYINT(1) DEFAULT 1,
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
            'prescription_share_flag': 'TINYINT(1) DEFAULT 1',
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
            'report_share_flag': 'TINYINT(1) DEFAULT 1',
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
    user, error = require_roles(request, 'doctor', 'receptionist', 'hospital-admin')
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
    # Allergy information is strictly visible ONLY to doctors and patients, NOT receptionists or admins
    if user['role'] in ('doctor', 'patient'):
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
            " patient_dob, patient_gender, patient_blood_group, patient_address, patient_emergency_contact, allergies"
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
            'allergies': p_row[10] or '',
        }

        cursor.execute(
            "SELECT v.visit_id, v.diagnosis, v.medical_notes, v.visited_at, du.user_name, h.hospital_name,"
            " v.height, v.weight, v.blood_pressure, v.vitals_recorded_at"
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
                'height': r[6] or '',
                'weight': r[7] or '',
                'blood_pressure': r[8] or '',
                'vitals_recorded_at': str(r[9]) if r[9] else '',
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

        # Check booked slots for a specific doctor & date if queried
        doc_param = request.GET.get('doctor_id')
        date_param = request.GET.get('date') or request.GET.get('appointment_date')
        booked_slots = []
        if doc_param and date_param:
            cursor.execute(
                "SELECT appointment_time FROM tbl_appointment"
                " WHERE doctor_id=%s AND appointment_date=%s"
                " AND appointment_status IN ('Pending','Confirmed')",
                [doc_param, date_param]
            )
            booked_slots = [r[0][:5] if len(r[0]) >= 5 else r[0] for r in cursor.fetchall()]

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
    height = (data.get('height') or '').strip()
    weight = (data.get('weight') or '').strip()
    blood_pressure = (data.get('blood_pressure') or '').strip()

    if not appointment_id:
        return JsonResponse({'status': 'error', 'message': 'Appointment ID is required to record vitals.'}, status=400)
    if not (height or weight or blood_pressure):
        return JsonResponse({'status': 'error', 'message': 'At least one vital (Height, Weight, or Blood Pressure) must be provided.'}, status=400)

    import re
    if blood_pressure and not re.match(r'^\d{2,3}/\d{2,3}(\s*mmHg)?$', blood_pressure, re.IGNORECASE):
        return JsonResponse({'status': 'error', 'message': 'Blood pressure must be in SYS/DIA format (e.g. 120/80 mmHg).'}, status=400)

    with connection.cursor() as cursor:
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
                " (patient_id, doctor_id, hospital_id, appointment_id, height, weight, blood_pressure, vitals_recorded_by, vitals_recorded_at)"
                " VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())",
                [patient_id, doctor_id, appt_hospital_id, appointment_id,
                 height or None, weight or None, blood_pressure or None, user['user_id']]
            )
            visit_id = cursor.lastrowid

    return JsonResponse({
        'status': 'success',
        'message': 'Pre-consultation vitals saved successfully.',
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
    {"name": "Paracetamol", "dosage": "500mg", "frequency": "Twice daily", "duration": "3 days", "instruction": "After food with a glass of water"},
    {"name": "Amoxicillin", "dosage": "500mg", "frequency": "Thrice daily", "duration": "5 days", "instruction": "After meals at regular intervals"},
    {"name": "Azithromycin", "dosage": "500mg", "frequency": "Once daily", "duration": "3 days", "instruction": "1 hour before meals or 2 hours after"},
    {"name": "Metformin", "dosage": "500mg", "frequency": "Twice daily", "duration": "30 days", "instruction": "With or immediately after meals"},
    {"name": "Pantoprazole", "dosage": "40mg", "frequency": "Once daily", "duration": "14 days", "instruction": "Morning empty stomach, 30 min before breakfast"},
    {"name": "Cetirizine", "dosage": "10mg", "frequency": "Once daily", "duration": "5 days", "instruction": "At bedtime with water"},
    {"name": "Ibuprofen", "dosage": "400mg", "frequency": "Twice daily", "duration": "3 days", "instruction": "After food to avoid stomach irritation"},
    {"name": "Atorvastatin", "dosage": "20mg", "frequency": "Once daily", "duration": "30 days", "instruction": "At night after dinner"},
    {"name": "Amlodipine", "dosage": "5mg", "frequency": "Once daily", "duration": "30 days", "instruction": "Morning with or without food"},
    {"name": "Losartan", "dosage": "50mg", "frequency": "Once daily", "duration": "30 days", "instruction": "Once daily in the morning"},
    {"name": "Ciprofloxacin", "dosage": "500mg", "frequency": "Twice daily", "duration": "5 days", "instruction": "Drink plenty of fluids"},
    {"name": "Cefixime", "dosage": "200mg", "frequency": "Twice daily", "duration": "5 days", "instruction": "After food"},
    {"name": "Omeprazole", "dosage": "20mg", "frequency": "Once daily", "duration": "14 days", "instruction": "Empty stomach in morning"},
    {"name": "Doxycycline", "dosage": "100mg", "frequency": "Twice daily", "duration": "7 days", "instruction": "With a full glass of water, do not lie down immediately"},
    {"name": "Telmisartan", "dosage": "40mg", "frequency": "Once daily", "duration": "30 days", "instruction": "Morning with water"},
    {"name": "Montelukast", "dosage": "10mg", "frequency": "Once daily", "duration": "10 days", "instruction": "At night before sleeping"},
    {"name": "Glimepiride", "dosage": "1mg", "frequency": "Once daily", "duration": "30 days", "instruction": "Shortly before or during breakfast"},
    {"name": "Salbutamol Inhaler", "dosage": "100mcg", "frequency": "As needed", "duration": "30 days", "instruction": "2 puffs when short of breath"},
    {"name": "Hydrochlorothiazide", "dosage": "12.5mg", "frequency": "Once daily", "duration": "30 days", "instruction": "Morning with water"},
    {"name": "Clopidogrel", "dosage": "75mg", "frequency": "Once daily", "duration": "30 days", "instruction": "After food"},
    {"name": "Aspirin (Ecosprin)", "dosage": "75mg", "frequency": "Once daily", "duration": "30 days", "instruction": "After meals"},
    {"name": "Levothyroxine", "dosage": "50mcg", "frequency": "Once daily", "duration": "30 days", "instruction": "First thing in the morning empty stomach"},
    {"name": "Domperidone", "dosage": "10mg", "frequency": "Thrice daily", "duration": "5 days", "instruction": "30 minutes before food"},
    {"name": "Ondansetron", "dosage": "4mg", "frequency": "As needed", "duration": "3 days", "instruction": "For nausea or vomiting"},
    {"name": "Metronidazole", "dosage": "400mg", "frequency": "Thrice daily", "duration": "5 days", "instruction": "After meals, strictly avoid alcohol"},
    {"name": "Ranitidine", "dosage": "150mg", "frequency": "Twice daily", "duration": "7 days", "instruction": "Before meals"},
    {"name": "Amoxicillin + Clavulanic Acid (Augmentin)", "dosage": "625mg", "frequency": "Twice daily", "duration": "5 days", "instruction": "At start of meal"},
    {"name": "Levofloxacin", "dosage": "500mg", "frequency": "Once daily", "duration": "5 days", "instruction": "With water, avoid antacids"},
    {"name": "Diclofenac", "dosage": "50mg", "frequency": "Twice daily", "duration": "3 days", "instruction": "After food"},
    {"name": "Tramadol", "dosage": "50mg", "frequency": "As needed", "duration": "3 days", "instruction": "Take with food for severe pain"},
    {"name": "Prednisolone", "dosage": "10mg", "frequency": "Once daily", "duration": "5 days", "instruction": "Morning after breakfast with milk"},
    {"name": "Vitamin D3", "dosage": "60,000 IU", "frequency": "Once weekly", "duration": "8 weeks", "instruction": "After milk or fatty meal"},
    {"name": "Vitamin B Complex", "dosage": "1 capsule", "frequency": "Once daily", "duration": "30 days", "instruction": "After breakfast"},
    {"name": "Calcium + Vitamin D3", "dosage": "500mg", "frequency": "Once daily", "duration": "30 days", "instruction": "After dinner with water"}
]

@csrf_exempt
def medicines_list(request):
    """Returns matching clinical medicines for autocomplete in doctor prescription."""
    q = (request.GET.get('q') or request.GET.get('query') or '').strip().lower()
    if not q:
        matches = STANDARD_MEDICINES[:25]
    else:
        matches = [m for m in STANDARD_MEDICINES if q in m['name'].lower()]
    return JsonResponse({'status': 'success', 'medicines': matches})


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

        # Check if tbl_patient_visit already exists for this appointment_id (e.g. nurse recorded vitals)
        cursor.execute(
            "SELECT visit_id FROM tbl_patient_visit WHERE appointment_id=%s ORDER BY visit_id DESC LIMIT 1",
            [appointment_id]
        )
        existing_v = cursor.fetchone()
        if existing_v:
            cursor.execute(
                "UPDATE tbl_patient_visit"
                " SET diagnosis=%s, medical_notes=%s, doctor_id=%s, hospital_id=%s"
                " WHERE visit_id=%s",
                [(data.get('diagnosis') or '').strip(), (data.get('medical_notes') or '').strip(),
                 user['doctor_id'], user['hospital_id'], existing_v[0]]
            )
        else:
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

    return JsonResponse({'status': 'success', 'message': 'Patient visit saved successfully.'})


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
        where = []
        if user['role'] == 'patient':
            where.append("p.patient_id = %s")
            params.append(user['patient_id'])
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
                    else:
                        return JsonResponse({'status': 'success', 'prescriptions': []})
            else:
                # When no patient is specified, do not leak all patients' prescriptions; return empty list
                return JsonResponse({'status': 'success', 'prescriptions': []})

        where_clause = " WHERE " + " AND ".join(where) if where else ""
        sql = f"""
            SELECT p.prescription_id, p.patient_id, p.doctor_id, p.hospital_id, p.appointment_id, p.visit_id,
                   p.prescription_date, p.remarks, pt.patient_name, pt.patient_uid, du.user_name, h.hospital_name,
                   p.prescription_created_at
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
                    'doctor_name': r[10] or 'Dr. Practitioner',
                    'hospital_name': r[11] or 'UniCare Partner Hospital',
                    'appointment_id': r[4],
                    'appointment_uid': f"APT{r[4]:03d}" if r[4] else 'N/A',
                    'visit_id': r[5],
                    'visit_uid': f"VIS{r[5]:03d}" if r[5] else 'N/A',
                    'date': str(r[6] or (r[12].strftime('%Y-%m-%d') if r[12] else '')),
                    'remarks': r[7] or '',
                    'medicines': medicines,
                })
        return JsonResponse({'status': 'success', 'prescriptions': presc_list})

    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    if user['role'] != 'doctor':
        return JsonResponse({'status': 'error', 'message': 'Only doctors can write and issue prescriptions.'}, status=403)

    data = payload(request)
    patient_param = data.get('patient_id') or data.get('health_id')
    raw_appointment_id = data.get('appointment_id')
    raw_visit_id = data.get('visit_id')
    remarks = (data.get('remarks') or '').strip()
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

        # Verify doctor is authorized for this patient
        cursor.execute("SELECT 1 FROM tbl_appointment WHERE patient_id=%s AND doctor_id=%s AND hospital_id=%s LIMIT 1", [patient_id, user['doctor_id'], user['hospital_id']])
        if not cursor.fetchone():
            return JsonResponse({'status': 'error', 'message': 'You are not authorized to issue prescriptions for this patient.'}, status=403)

        app_id = int(raw_appointment_id) if raw_appointment_id and str(raw_appointment_id).isdigit() else None
        vis_id = int(raw_visit_id) if raw_visit_id and str(raw_visit_id).isdigit() else None

        cursor.execute(
            "INSERT INTO tbl_prescription (patient_id, doctor_id, hospital_id, appointment_id, visit_id, prescription_date, remarks, prescription_share_flag, prescription_is_active)"
            " VALUES (%s, %s, %s, %s, %s, CURRENT_DATE(), %s, 1, 1)",
            [patient_id, user['doctor_id'], user['hospital_id'], app_id, vis_id, remarks]
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

    return JsonResponse({
        'status': 'success',
        'message': 'Digital prescription generated successfully.',
        'prescription': {
            'prescription_id': presc_id,
            'id': f"PRE{presc_id:03d}",
            'prescription_uid': f"PRE{presc_id:03d}",
        }
    })


@csrf_exempt
def lab_reports(request):
    """Complete diagnostic and laboratory report management workflow."""
    user, error = require_roles(request, 'doctor', 'patient')
    if error:
        return error
    ensure_workflow_schema()

    if request.method == 'GET':
        patient_param = request.GET.get('patient_id') or request.GET.get('health_id')
        params = []
        where = []
        if user['role'] == 'patient':
            where.append("l.patient_id = %s")
            params.append(user['patient_id'])
        elif user['role'] == 'doctor':
            if patient_param:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT patient_id FROM tbl_patient WHERE patient_id=%s OR patient_uid=%s LIMIT 1", [patient_param, patient_param])
                    pr = cursor.fetchone()
                    if pr:
                        target_pid = pr[0]
                        cursor.execute("SELECT 1 FROM tbl_appointment WHERE patient_id=%s AND doctor_id=%s AND hospital_id=%s LIMIT 1", [target_pid, user['doctor_id'], user['hospital_id']])
                        if not cursor.fetchone():
                            return JsonResponse({'status': 'error', 'message': 'Not authorized to view lab reports for this patient.'}, status=403)
                        where.append("l.patient_id = %s")
                        params.append(target_pid)
                    else:
                        return JsonResponse({'status': 'success', 'reports': []})
            else:
                where.append("l.hospital_id = %s")
                params.append(user['hospital_id'])

        where_clause = " WHERE " + " AND ".join(where) if where else ""
        sql = f"""
            SELECT l.lab_report_id, l.patient_id, l.hospital_id, l.report_type, l.report_title, l.report_file,
                   l.report_uploaded_at, pt.patient_name, pt.patient_uid, h.hospital_name
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
                    'report_type': r[3] or 'Diagnostic Test',
                    'report_title': r[4] or 'Laboratory Report',
                    'report_file': r[5] or '',
                    'uploaded_at': r[6].strftime('%Y-%m-%d %H:%M') if hasattr(r[6], 'strftime') else str(r[6] or ''),
                }
                for r in rows
            ]
        return JsonResponse({'status': 'success', 'reports': reports_list})

    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)

    data = payload(request)
    patient_param = data.get('patient_id') or data.get('health_id') or (user['patient_id'] if user['role'] == 'patient' else None)
    report_type = (data.get('report_type') or 'Diagnostic Test').strip()
    report_title = (data.get('report_title') or data.get('title') or '').strip()
    report_file = (data.get('report_file') or data.get('file') or data.get('results') or '').strip()
    hospital_id = data.get('hospital_id') or user.get('hospital_id')

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

        cursor.execute(
            "INSERT INTO tbl_lab_report (patient_id, hospital_id, report_type, report_title, report_file, report_share_flag, report_is_active)"
            " VALUES (%s, %s, %s, %s, %s, 1, 1)",
            [patient_id, hospital_id, report_type, report_title, report_file]
        )
        report_id = cursor.lastrowid

    return JsonResponse({
        'status': 'success',
        'message': 'Laboratory diagnostic report saved successfully.',
        'report': {
            'report_id': report_id,
            'id': f"LAB{report_id:03d}",
            'lab_report_uid': f"LAB{report_id:03d}",
            'report_type': report_type,
            'report_title': report_title,
        }
    })
