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

from .views import verify_password_and_upgrade


def payload(request):
    try:
        return json.loads(request.body.decode('utf-8'))
    except Exception:
        return request.POST


def ensure_workflow_schema():
    """Ensure only the patient_profile and patient_visit support tables exist.
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
            " r.role_name FROM tbl_user u JOIN tbl_role r ON r.role_id=u.role_id"
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
        'superadmin': 'super-admin',
    }.get(normalized)
    if not role:
        return JsonResponse({'status': 'error', 'message': 'This account has no supported portal role.'}, status=403)

    profile = {
        'user_id': row[0], 'hospital_id': row[1],
        'name': row[3], 'email': row[4], 'phone': row[5], 'role': role,
    }

    with connection.cursor() as cursor:
        if role == 'doctor':
            cursor.execute(
                "SELECT d.doctor_id, d.doctor_specialization, d.doctor_license_no, d.doctor_experience, d.hospital_id"
                " FROM tbl_doctor d WHERE d.user_id=%s",
                [row[0]]
            )
            doctor = cursor.fetchone()
            if not doctor:
                return JsonResponse({'status': 'error', 'message': 'Doctor profile was not found.'}, status=404)
            # Resolve the hospital: prefer tbl_doctor.hospital_id, fall back to tbl_user.hospital_id
            doc_hospital_id = doctor[4] or row[1]
            profile.update({
                'doctor_id': doctor[0],
                'specialization': doctor[1],
                'license': doctor[2],
                'experience': doctor[3] or '',
            })
            # Build the hospital list from tbl_doctor.hospital_id + tbl_user.hospital_id
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

        elif role == 'patient':
            cursor.execute(
                "SELECT patient_id, health_id FROM tbl_patient_profile WHERE user_id=%s",
                [row[0]]
            )
            patient = cursor.fetchone()
            if not patient:
                return JsonResponse({'status': 'error', 'message': 'Patient profile was not found.'}, status=404)
            profile.update({'patient_id': patient[0], 'health_id': patient[1]})

    request.session.update({
        'unicare_user_id': row[0],
        'unicare_role': role,
        'unicare_hospital_id': row[1],
    })
    if role == 'doctor':
        request.session['unicare_doctor_id'] = profile['doctor_id']
    if role == 'patient':
        request.session['unicare_patient_id'] = profile['patient_id']
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
                "SELECT user_name, user_email, user_phone FROM tbl_user WHERE user_id=%s",
                [user['user_id']]
            )
            row = cursor.fetchone()
            result = {'name': row[0], 'email': row[1], 'phone': row[2], 'role': user['role']}
            if user['role'] == 'doctor':
                cursor.execute(
                    "SELECT doctor_specialization, doctor_license_no, doctor_experience FROM tbl_doctor WHERE doctor_id=%s",
                    [user['doctor_id']]
                )
                d = cursor.fetchone()
                result.update({'specialization': d[0], 'license': d[1], 'experience': d[2] or ''})
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
    if len(new) < 8:
        return JsonResponse({'status': 'error', 'message': 'New password must contain at least 8 characters.'}, status=400)
    with connection.cursor() as cursor:
        cursor.execute("SELECT user_password FROM tbl_user WHERE user_id=%s", [user['user_id']])
        row = cursor.fetchone()
        if not row or not verify_password_and_upgrade(user['user_id'], current, row[0]):
            return JsonResponse({'status': 'error', 'message': 'Current password is incorrect.'}, status=400)
        cursor.execute("UPDATE tbl_user SET user_password=%s WHERE user_id=%s", [make_password(new), user['user_id']])
    return JsonResponse({'status': 'success', 'message': 'Password changed successfully.'})


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
    user, error = require_roles(request, 'receptionist')
    if error:
        return error
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid HTTP method.'}, status=405)
    ensure_workflow_schema()
    data = payload(request)
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip()
    phone = (data.get('phone') or '').strip()
    password = (data.get('password') or '').strip()
    if not name or not (email or phone) or len(password) < 8:
        return JsonResponse({'status': 'error', 'message': 'Name, email or phone, and an 8-character password are required.'}, status=400)

    with transaction.atomic(), connection.cursor() as cursor:
        cursor.execute(
            "SELECT 1 FROM tbl_user WHERE (LOWER(user_email)=LOWER(%s) AND %s<>'') OR (user_phone=%s AND %s<>'') LIMIT 1",
            [email, email, phone, phone]
        )
        if cursor.fetchone():
            return JsonResponse({'status': 'error', 'message': 'An account with this email or phone already exists.'}, status=409)

        cursor.execute("SELECT role_id FROM tbl_role WHERE LOWER(REPLACE(role_name,' ',''))='patient' LIMIT 1")
        role = cursor.fetchone()
        if not role:
            return JsonResponse({'status': 'error', 'message': 'Patient role is not configured in tbl_role.'}, status=500)

        cursor.execute(
            "INSERT INTO tbl_user (hospital_id, role_id, user_name, user_email, user_phone, user_password, user_is_active)"
            " VALUES (%s,%s,%s,%s,%s,%s,1)",
            [user['hospital_id'], role[0], name, email, phone, make_password(password)]
        )
        user_id = cursor.lastrowid
        health_id = f"HC-{date.today().strftime('%Y%m%d')}-{user_id:06d}"
        cursor.execute(
            "INSERT INTO tbl_patient_profile (user_id, health_id, date_of_birth, gender, address) VALUES (%s,%s,%s,%s,%s)",
            [user_id, health_id, data.get('date_of_birth') or None,
             (data.get('gender') or '').strip() or None,
             (data.get('address') or '').strip() or None]
        )
        patient_id = cursor.lastrowid
    return JsonResponse({'status': 'success', 'patient': {
        'patient_id': patient_id, 'health_id': health_id,
        'name': name, 'email': email, 'phone': phone,
    }})


def patient_lookup(request):
    user, error = require_roles(request, 'doctor', 'receptionist')
    if error:
        return error
    health_id = (request.GET.get('health_id') or '').strip()
    if not health_id:
        return JsonResponse({'status': 'error', 'message': 'Health ID is required.'}, status=400)
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT p.patient_id,p.health_id,u.user_name,u.user_email,u.user_phone,p.date_of_birth,p.gender"
            " FROM tbl_patient_profile p JOIN tbl_user u ON u.user_id=p.user_id"
            " WHERE p.health_id=%s AND p.patient_is_active=1",
            [health_id]
        )
        row = cursor.fetchone()
        if not row:
            return JsonResponse({'status': 'error', 'message': 'Patient not found.'}, status=404)

        if user['role'] == 'doctor':
            # Doctor can only view a patient who has an appointment with them at their current hospital
            cursor.execute(
                "SELECT 1 FROM tbl_appointment WHERE patient_id=%s AND doctor_id=%s AND hospital_id=%s",
                [row[0], user['doctor_id'], user['hospital_id']]
            )
            if not cursor.fetchone():
                return JsonResponse({'status': 'error', 'message': 'You are not authorized to view this patient.'}, status=403)

    return JsonResponse({'status': 'success', 'patient': {
        'patient_id': row[0], 'health_id': row[1], 'name': row[2],
        'email': row[3], 'phone': row[4], 'date_of_birth': row[5], 'gender': row[6],
    }})


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
        departments = [{'department_id': r[0], 'name': r[1]} for r in cursor.fetchall()]
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
        doctors = [{'doctor_id': r[0], 'name': r[1], 'specialization': r[2] or '', 'department_id': r[3]} for r in cursor.fetchall()]
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
                " h.hospital_name, dep.department_name, du.user_name, p.health_id, pu.user_name"
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
                'appointment_id': r[0], 'date': str(r[1]), 'time': r[2],
                'reason': r[3] or '', 'status': r[4], 'hospital': r[5] or '',
                'department': r[6] or '', 'doctor': r[7], 'health_id': r[8], 'patient': r[9],
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
    patient_id = data.get('patient_id')
    appointment_id = data.get('appointment_id')
    if not patient_id:
        return JsonResponse({'status': 'error', 'message': 'Patient is required.'}, status=400)

    with connection.cursor() as cursor:
        # Verify the appointment belongs to this doctor and hospital
        sql = (
            "SELECT 1 FROM tbl_appointment WHERE patient_id=%s AND doctor_id=%s AND hospital_id=%s"
            + (" AND appointment_id=%s" if appointment_id else "")
        )
        params = [patient_id, user['doctor_id'], user['hospital_id']]
        if appointment_id:
            params.append(appointment_id)
        cursor.execute(sql, params)
        if not cursor.fetchone():
            return JsonResponse({'status': 'error', 'message': 'The visit must be linked to one of your hospital appointments.'}, status=403)

        cursor.execute(
            "INSERT INTO tbl_patient_visit (patient_id, doctor_id, hospital_id, appointment_id, diagnosis, medical_notes)"
            " VALUES (%s,%s,%s,%s,%s,%s)",
            [patient_id, user['doctor_id'], user['hospital_id'], appointment_id,
             (data.get('diagnosis') or '').strip(), (data.get('medical_notes') or '').strip()]
        )
        if appointment_id:
            cursor.execute(
                "UPDATE tbl_appointment SET appointment_status='Completed'"
                " WHERE appointment_id=%s AND doctor_id=%s AND hospital_id=%s",
                [appointment_id, user['doctor_id'], user['hospital_id']]
            )
    return JsonResponse({'status': 'success', 'message': 'Patient visit saved successfully.'})
