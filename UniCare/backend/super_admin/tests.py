import json
from django.test import TransactionTestCase, Client
from django.contrib.auth.hashers import make_password
from django.db import connection
from super_admin.views import ensure_recovery_columns
from super_admin.workflows import ensure_workflow_schema

class PasswordAndRecoveryTestCase(TransactionTestCase):
    def setUp(self):
        self.client = Client()
        with connection.cursor() as cursor:
            cursor.execute("""CREATE TABLE IF NOT EXISTS tbl_role (
                role_id INT PRIMARY KEY,
                role_name VARCHAR(50) NOT NULL
            )""")
            cursor.execute("""CREATE TABLE IF NOT EXISTS tbl_user (
                user_id INT AUTO_INCREMENT PRIMARY KEY,
                hospital_id INT NULL,
                role_id INT NOT NULL,
                user_name VARCHAR(100) NOT NULL,
                user_email VARCHAR(100) NULL,
                user_phone VARCHAR(20) NULL,
                user_password VARCHAR(255) NOT NULL,
                user_recovery_question VARCHAR(255) NULL,
                user_recovery_answer VARCHAR(255) NULL,
                must_change_password TINYINT(1) NOT NULL DEFAULT 0,
                user_is_active TINYINT(1) NOT NULL DEFAULT 1,
                user_created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )""")
            cursor.execute("""CREATE TABLE IF NOT EXISTS tbl_hospital (
                hospital_id INT AUTO_INCREMENT PRIMARY KEY,
                hospital_uid VARCHAR(20) NOT NULL UNIQUE,
                hospital_name VARCHAR(100) NOT NULL,
                hospital_email VARCHAR(100) NULL,
                hospital_phone VARCHAR(15) NOT NULL,
                hospital_address TEXT NULL,
                hospital_status VARCHAR(20) DEFAULT 'Approved',
                hospital_is_active TINYINT(1) DEFAULT 1,
                hospital_created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )""")
            cursor.execute("""CREATE TABLE IF NOT EXISTS tbl_doctor (
                doctor_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                hospital_id INT NULL,
                department_id INT NULL,
                doctor_license_no VARCHAR(100) NOT NULL,
                doctor_specialization VARCHAR(100) NOT NULL,
                doctor_experience VARCHAR(100) NULL,
                doctor_is_active TINYINT(1) DEFAULT 1
            )""")
            cursor.execute("""CREATE TABLE IF NOT EXISTS tbl_patient (
                patient_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                patient_uid VARCHAR(40) NOT NULL UNIQUE,
                patient_name VARCHAR(100) NOT NULL,
                patient_dob DATE NULL,
                patient_gender VARCHAR(30) NULL,
                patient_phone VARCHAR(20) NULL,
                patient_email VARCHAR(100) NULL,
                patient_blood_group VARCHAR(10) NULL,
                patient_address TEXT NULL,
                patient_emergency_contact VARCHAR(20) NULL,
                patient_is_active TINYINT(1) DEFAULT 1
            )""")
            cursor.execute("""CREATE TABLE IF NOT EXISTS tbl_appointment (
                appointment_id INT AUTO_INCREMENT PRIMARY KEY,
                patient_id INT NOT NULL,
                hospital_id INT NOT NULL,
                department_id INT NULL,
                doctor_id INT NOT NULL,
                appointment_date DATE NOT NULL,
                appointment_time VARCHAR(20) NOT NULL,
                reason TEXT NULL,
                created_by_user_id INT NULL,
                appointment_status VARCHAR(20) NOT NULL DEFAULT 'Pending',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )""")

        ensure_workflow_schema()
        ensure_recovery_columns()

        with connection.cursor() as cursor:
            # Clean up prior test data if existing
            cursor.execute("DELETE FROM tbl_patient WHERE patient_uid LIKE 'PTT%'")
            cursor.execute("DELETE FROM tbl_doctor WHERE doctor_license_no LIKE 'LIC-TEMP%'")
            cursor.execute("DELETE FROM tbl_user WHERE user_email LIKE '%@test.com'")
            cursor.execute("DELETE FROM tbl_hospital WHERE hospital_id = 9000")

            cursor.execute("INSERT INTO tbl_role (role_id, role_name) VALUES (2, 'doctor') ON DUPLICATE KEY UPDATE role_name='doctor'")
            cursor.execute("INSERT INTO tbl_role (role_id, role_name) VALUES (3, 'receptionist') ON DUPLICATE KEY UPDATE role_name='receptionist'")
            cursor.execute("INSERT INTO tbl_role (role_id, role_name) VALUES (4, 'patient') ON DUPLICATE KEY UPDATE role_name='patient'")

            # Create test hospital
            cursor.execute("INSERT INTO tbl_hospital (hospital_id, hospital_uid, hospital_name, hospital_email, hospital_phone, hospital_status, hospital_is_active) VALUES (9000, 'HOSP-TEST', 'Test Hospital', 'hospital@test.com', '9999999999', 'Approved', 1)")

            # Doctor with temporary password
            cursor.execute("""
                INSERT INTO tbl_user (hospital_id, role_id, user_name, user_email, user_phone, user_password, user_is_active, must_change_password)
                VALUES (9000, 2, 'Dr. Temp Test', 'doctor_temp@test.com', '9876543210', %s, 1, 1)
            """, [make_password('TempPass123!')])
            self.doctor_user_id = cursor.lastrowid
            cursor.execute("INSERT INTO tbl_doctor (user_id, hospital_id, doctor_license_no, doctor_specialization) VALUES (%s, 9000, 'LIC-TEMP-1', 'General')", [self.doctor_user_id])

            # Patient with temporary password
            cursor.execute("""
                INSERT INTO tbl_user (hospital_id, role_id, user_name, user_email, user_phone, user_password, user_is_active, must_change_password)
                VALUES (9000, 4, 'Patient Temp Test', 'patient_temp@test.com', '9876543211', %s, 1, 1)
            """, [make_password('TempPass123!')])
            self.patient_user_id = cursor.lastrowid
            cursor.execute("INSERT INTO tbl_patient (user_id, patient_uid, patient_name) VALUES (%s, 'PTT001', 'Patient Temp Test')", [self.patient_user_id])

    def test_login_returns_must_change_password_flag(self):
        response = self.client.post(
            '/api/super-admin/auth/login/',
            data=json.dumps({'identifier': 'doctor_temp@test.com', 'password': 'TempPass123!'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'success')
        self.assertTrue(data['user']['must_change_password'])

    def test_password_change_with_recovery_question(self):
        # 1. Login
        self.client.post(
            '/api/super-admin/auth/login/',
            data=json.dumps({'identifier': 'doctor_temp@test.com', 'password': 'TempPass123!'}),
            content_type='application/json'
        )
        # 2. Change password and set recovery question
        res = self.client.post(
            '/api/super-admin/profile/change-password/',
            data=json.dumps({
                'current_password': 'TempPass123!',
                'new_password': 'NewStrongPassword123!',
                'recovery_question': 'What city were you born in?',
                'recovery_answer': 'NewYork'
            }),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['status'], 'success')

        # 3. Verify must_change_password flag is now 0
        with connection.cursor() as cursor:
            cursor.execute("SELECT must_change_password, user_recovery_question FROM tbl_user WHERE user_id=%s", [self.doctor_user_id])
            row = cursor.fetchone()
            self.assertEqual(row[0], 0)
            self.assertEqual(row[1], 'What city were you born in?')

    def test_forgot_password_recovery_flow(self):
        # 1. First set up recovery for patient
        self.client.post(
            '/api/super-admin/auth/login/',
            data=json.dumps({'identifier': 'patient_temp@test.com', 'password': 'TempPass123!'}),
            content_type='application/json'
        )
        self.client.post(
            '/api/super-admin/profile/change-password/',
            data=json.dumps({
                'current_password': 'TempPass123!',
                'new_password': 'PatientNewPass123!',
                'recovery_question': 'What is the name of your first pet?',
                'recovery_answer': 'Fluffy'
            }),
            content_type='application/json'
        )

        # 2. Test lookup via /api/super-admin/recovery/lookup/
        lookup_res = self.client.post(
            '/api/super-admin/recovery/lookup/',
            data=json.dumps({'identifier': 'patient_temp@test.com'}),
            content_type='application/json'
        )
        self.assertEqual(lookup_res.status_code, 200)
        self.assertEqual(lookup_res.json()['recovery_question'], 'What is the name of your first pet?')

        # 3. Test verification and reset via /api/super-admin/recovery/verify/
        verify_res = self.client.post(
            '/api/super-admin/recovery/verify/',
            data=json.dumps({
                'answer': 'Fluffy',
                'password': 'RecoveredPass123!',
                'confirmPassword': 'RecoveredPass123!'
            }),
            content_type='application/json'
        )
        self.assertEqual(verify_res.status_code, 200)
        self.assertEqual(verify_res.json()['status'], 'success')

        # 4. Verify login with recovered password succeeds
        login_res = self.client.post(
            '/api/super-admin/auth/login/',
            data=json.dumps({'identifier': 'patient_temp@test.com', 'password': 'RecoveredPass123!'}),
            content_type='application/json'
        )
        self.assertEqual(login_res.status_code, 200)
        self.assertEqual(login_res.json()['status'], 'success')

    def test_doctor_record_visit_flow(self):
        # 1. Doctor login
        doc_login = self.client.post(
            '/api/super-admin/auth/login/',
            data=json.dumps({'identifier': 'doctor_temp@test.com', 'password': 'TempPass123!'}),
            content_type='application/json'
        )
        self.assertEqual(doc_login.status_code, 200)

        # 2. Setup appointment between Doctor and Patient
        with connection.cursor() as cursor:
            cursor.execute("SELECT doctor_id FROM tbl_doctor WHERE user_id=%s", [self.doctor_user_id])
            doc_id = cursor.fetchone()[0]
            cursor.execute("SELECT patient_id FROM tbl_patient WHERE user_id=%s", [self.patient_user_id])
            pat_id = cursor.fetchone()[0]

            cursor.execute("""
                INSERT INTO tbl_appointment (patient_id, hospital_id, doctor_id, appointment_date, appointment_time, appointment_status)
                VALUES (%s, 9000, %s, '2026-08-30', '10:00', 'Confirmed')
            """, [pat_id, doc_id])
            app_id = cursor.lastrowid

        # 3. Post visit record with empty appointment_id string (verifying empty string cleaning fix)
        visit_res = self.client.post(
            '/api/super-admin/visits/',
            data=json.dumps({
                'patient_id': 'PTT001',
                'appointment_id': '',
                'diagnosis': 'Seasonal Allergies',
                'medical_notes': 'Prescribed antihistamines.'
            }),
            content_type='application/json'
        )
        self.assertEqual(visit_res.status_code, 200)
        self.assertEqual(visit_res.json()['status'], 'success')

        # 4. Fetch patient history via health_id
        hist_res = self.client.get('/api/super-admin/patient-history/?health_id=PTT001')
        self.assertEqual(hist_res.status_code, 200)
        self.assertEqual(hist_res.json()['status'], 'success')
        self.assertEqual(len(hist_res.json()['history']), 1)
        self.assertEqual(hist_res.json()['history'][0]['diagnosis'], 'Seasonal Allergies')

    def test_doctor_digital_prescription_flow(self):
        # 1. Doctor login
        self.client.post(
            '/api/super-admin/auth/login/',
            data=json.dumps({'identifier': 'doctor_temp@test.com', 'password': 'TempPass123!'}),
            content_type='application/json'
        )

        # 2. Setup appointment
        with connection.cursor() as cursor:
            cursor.execute("SELECT doctor_id FROM tbl_doctor WHERE user_id=%s", [self.doctor_user_id])
            doc_id = cursor.fetchone()[0]
            cursor.execute("SELECT patient_id FROM tbl_patient WHERE user_id=%s", [self.patient_user_id])
            pat_id = cursor.fetchone()[0]
            cursor.execute("""
                INSERT INTO tbl_appointment (patient_id, hospital_id, doctor_id, appointment_date, appointment_time, appointment_status)
                VALUES (%s, 9000, %s, '2026-08-30', '11:00', 'Confirmed')
            """, [pat_id, doc_id])

        # 3. Issue prescription
        presc_res = self.client.post(
            '/api/super-admin/prescriptions/',
            data=json.dumps({
                'patient_id': 'PTT001',
                'remarks': 'Take with water after lunch',
                'medicines': [
                    {
                        'medicine_name': 'Amoxicillin',
                        'dosage': '500mg',
                        'frequency': 'Twice daily',
                        'duration': '5 days',
                        'instruction': 'After food'
                    }
                ]
            }),
            content_type='application/json'
        )
        self.assertEqual(presc_res.status_code, 200)
        data = presc_res.json()
        self.assertEqual(data['status'], 'success')
        self.assertTrue(data['prescription']['prescription_uid'].startswith('PRE'))

        # 4. Patient logs in and fetches prescriptions
        self.client.post(
            '/api/super-admin/auth/login/',
            data=json.dumps({'identifier': 'patient_temp@test.com', 'password': 'TempPass123!'}),
            content_type='application/json'
        )
        patient_presc = self.client.get('/api/super-admin/prescriptions/')
        self.assertEqual(patient_presc.status_code, 200)
        p_data = patient_presc.json()
        self.assertEqual(p_data['status'], 'success')
        self.assertEqual(len(p_data['prescriptions']), 1)
        self.assertEqual(p_data['prescriptions'][0]['medicines'][0]['medicine_name'], 'Amoxicillin')

    def test_patient_and_doctor_lab_reports_flow(self):
        # 1. Patient login and upload lab report
        self.client.post(
            '/api/super-admin/auth/login/',
            data=json.dumps({'identifier': 'patient_temp@test.com', 'password': 'TempPass123!'}),
            content_type='application/json'
        )
        upload_res = self.client.post(
            '/api/super-admin/lab-reports/',
            data=json.dumps({
                'report_type': 'Blood Test',
                'report_title': 'Complete Blood Count (CBC)',
                'report_file': 'Hemoglobin 14.5 g/dL, Normal range',
                'hospital_id': 9000
            }),
            content_type='application/json'
        )
        self.assertEqual(upload_res.status_code, 200)
        u_data = upload_res.json()
        self.assertEqual(u_data['status'], 'success')
        self.assertTrue(u_data['report']['lab_report_uid'].startswith('LAB'))

        # 2. Patient reads own reports
        p_reports = self.client.get('/api/super-admin/lab-reports/')
        self.assertEqual(p_reports.status_code, 200)
        self.assertEqual(len(p_reports.json()['reports']), 1)
        self.assertEqual(p_reports.json()['reports'][0]['report_title'], 'Complete Blood Count (CBC)')


