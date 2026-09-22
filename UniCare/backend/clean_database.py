import os
import sys

backend_dir = r"d:\MINI PROJECT\UniCare\backend"
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'unicare_backend.settings')

import django
django.setup()

from django.db import connection

def clean_and_normalize_database():
    with connection.cursor() as cursor:
        print("1. Identifying all test users and test patients...")
        test_user_ids = [41, 42, 45, 46, 48, 49, 51, 52, 53]
        test_patient_uids = ['PTA004', 'PTA005', 'PTA006', 'PTA007', 'PTA008', 'PTA009', 'PTA010', 'PTA011']

        # Remove visits associated with test appointments or test patients
        cursor.execute("""
            DELETE FROM tbl_patient_visit 
            WHERE appointment_id IN (7, 8, 9, 10) 
               OR patient_id IN (SELECT patient_id FROM tbl_patient WHERE patient_uid IN %s OR user_id IN %s)
        """, [tuple(test_patient_uids), tuple(test_user_ids)])
        print(f"   Deleted test visits: {cursor.rowcount}")

        # Remove test appointments
        cursor.execute("""
            DELETE FROM tbl_appointment 
            WHERE appointment_id IN (7, 8, 9, 10) 
               OR patient_id IN (SELECT patient_id FROM tbl_patient WHERE patient_uid IN %s OR user_id IN %s)
        """, [tuple(test_patient_uids), tuple(test_user_ids)])
        print(f"   Deleted test appointments: {cursor.rowcount}")

        # Remove test patient profiles
        cursor.execute("""
            DELETE FROM tbl_patient_profile 
            WHERE user_id IN %s OR health_id IN %s
        """, [tuple(test_user_ids), tuple(test_patient_uids)])
        print(f"   Deleted test patient profiles: {cursor.rowcount}")

        # Remove test patients
        cursor.execute("""
            DELETE FROM tbl_patient 
            WHERE user_id IN %s OR patient_uid IN %s
        """, [tuple(test_user_ids), tuple(test_patient_uids)])
        print(f"   Deleted test patients: {cursor.rowcount}")

        # Remove any test doctor rows
        cursor.execute("DELETE FROM tbl_doctor WHERE user_id IN %s", [tuple(test_user_ids)])
        print(f"   Deleted test doctors: {cursor.rowcount}")

        # Remove test users
        cursor.execute("""
            DELETE FROM tbl_user 
            WHERE user_id IN %s 
               OR user_email LIKE '%%@selenium.test' 
               OR user_name LIKE '%%Selenium%%'
               OR user_email LIKE '%%1790002%%'
               OR user_email LIKE '%%example.com'
        """, [tuple(test_user_ids)])
        print(f"   Deleted test users: {cursor.rowcount}")

        print("\n2. Updating testing names to authentic original names...")

        # Update Dr. Secondary Specialist -> Dr. Rajesh Sharma
        cursor.execute("""
            UPDATE tbl_user 
            SET user_name = 'Dr. Rajesh Sharma', 
                user_email = 'rajesh.sharma@sunrise.com',
                hospital_id = 1
            WHERE user_id = 35
        """)
        cursor.execute("""
            UPDATE tbl_doctor 
            SET doctor_license_no = 'MED-KL-4015',
                hospital_id = 1
            WHERE user_id = 35
        """)
        print("   Updated Dr. Secondary Specialist -> Dr. Rajesh Sharma (MED-KL-4015, rajesh.sharma@sunrise.com)")

        # Update Nurse Jane Doe -> Nurse Sarah Kurian
        cursor.execute("""
            UPDATE tbl_user 
            SET user_name = 'Sarah Kurian', 
                user_email = 'sarah.kurian@sunrise.com'
            WHERE user_id = 50
        """)
        print("   Updated Nurse Jane Doe -> Sarah Kurian (sarah.kurian@sunrise.com)")

        # Fix St. Mary's encoding in hospital table
        cursor.execute("""
            UPDATE tbl_hospital 
            SET hospital_name = \"St. Mary's Multispeciality Hospital\",
                hospital_address = \"M.C. Road, Kottayam, Kerala - 686001\"
            WHERE hospital_id = 2
        """)
        print("   Fixed St. Mary's Hospital name encoding")

        # Ensure Dr. Anu has full prefix
        cursor.execute("""
            UPDATE tbl_user
            SET user_name = 'Dr. Anu'
            WHERE user_id = 26 AND user_name = 'Anu'
        """)
        print("   Normalized Dr. Anu name")

    print("\nDatabase cleanup and name normalization complete!")

if __name__ == '__main__':
    clean_and_normalize_database()
