import os
import sys

# Add backend directory to sys.path
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'unicare_backend.settings')

import django
django.setup()

from django.db import connection
from django.contrib.auth.hashers import make_password

def setup_selenium_fixtures():
    """Ensure baseline test accounts exist for automated Selenium testing."""
    with connection.cursor() as cursor:
        # 1. Check/create hospital
        cursor.execute("SELECT hospital_id FROM tbl_hospital WHERE hospital_uid = 'HOS001'")
        hosp = cursor.fetchone()
        hospital_id = hosp[0] if hosp else 1

        # 2. Check/create department
        cursor.execute("SELECT department_id FROM tbl_department WHERE hospital_id = %s", [hospital_id])
        dept = cursor.fetchone()
        dept_id = dept[0] if dept else 1

        # 3. Ensure Super Admin exists: superadmin@unicare.com / Admin@123
        cursor.execute("SELECT user_id FROM tbl_user WHERE user_email = 'superadmin@unicare.com'")
        admin = cursor.fetchone()
        if not admin:
            cursor.execute("""
                INSERT INTO tbl_user (role_id, user_name, user_email, user_phone, user_password, user_is_active)
                VALUES (5, 'Super Admin', 'superadmin@unicare.com', '9876543210', %s, 1)
            """, [make_password('Admin@123')])
        else:
            cursor.execute("UPDATE tbl_user SET user_password=%s, user_is_active=1 WHERE user_id=%s", 
                           [make_password('Admin@123'), admin[0]])

        # 4. Ensure Doctor exists: anu@sunrise.com / Doctor@123
        cursor.execute("SELECT user_id FROM tbl_user WHERE user_email = 'anu@sunrise.com'")
        doc = cursor.fetchone()
        if doc:
            cursor.execute("UPDATE tbl_user SET user_password=%s, must_change_password=0, user_is_active=1 WHERE user_id=%s",
                           [make_password('Doctor@123'), doc[0]])
        else:
            cursor.execute("""
                INSERT INTO tbl_user (hospital_id, role_id, user_name, user_email, user_phone, user_password, user_is_active, must_change_password)
                VALUES (%s, 2, 'Dr. Anu', 'anu@sunrise.com', '8966978568', %s, 1, 0)
            """, [hospital_id, make_password('Doctor@123')])
            new_doc_uid = cursor.lastrowid
            cursor.execute("""
                INSERT INTO tbl_doctor (user_id, hospital_id, department_id, doctor_license_no, doctor_specialization, doctor_is_active)
                VALUES (%s, %s, %s, 'MED-KL-2899', 'Cardiology', 1)
            """, [new_doc_uid, hospital_id, dept_id])

        # 5. Ensure Patient exists: arjun@gmail.com / Patient@123
        cursor.execute("SELECT user_id FROM tbl_user WHERE user_email = 'arjun@gmail.com'")
        pat = cursor.fetchone()
        if pat:
            cursor.execute("UPDATE tbl_user SET user_password=%s, must_change_password=0, user_is_active=1 WHERE user_id=%s",
                           [make_password('Patient@123'), pat[0]])
        else:
            cursor.execute("""
                INSERT INTO tbl_user (hospital_id, role_id, user_name, user_email, user_phone, user_password, user_is_active, must_change_password)
                VALUES (%s, 4, 'Arjun', 'arjun@gmail.com', '9632574107', %s, 1, 0)
            """, [hospital_id, make_password('Patient@123')])
            new_pat_uid = cursor.lastrowid
            cursor.execute("""
                INSERT INTO tbl_patient (user_id, patient_uid, patient_name, patient_dob, patient_gender, patient_phone, patient_email, patient_is_active)
                VALUES (%s, 'PTA001', 'Arjun', '1995-06-15', 'Male', '9632574107', 'arjun@gmail.com', 1)
            """, [new_pat_uid])

    print("Test fixtures successfully verified and configured.")

if __name__ == '__main__':
    setup_selenium_fixtures()
