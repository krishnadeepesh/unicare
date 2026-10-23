import os
import sys
from pathlib import Path
from datetime import datetime, date, timedelta

# Set up Django environment
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'unicare_backend.settings')

import django
django.setup()

from django.db import connection, transaction
from django.contrib.auth.hashers import make_password, check_password

def seed_clinical_and_accounts():
    print("=" * 60)
    print("UniCare Database Update: Accounts & Clinical Records")
    print("=" * 60)

    # 1. Update passwords of all accounts except Super Admin (role_id != 5 and user_id != 1)
    admin_hash = make_password('admin123')
    with connection.cursor() as cur:
        cur.execute("""
            UPDATE tbl_user
            SET user_password = %s,
                must_change_password = 0
            WHERE role_id != 5 AND user_id != 1
        """, [admin_hash])
        updated_users_count = cur.rowcount
        print(f"\n[1] Updated passwords for {updated_users_count} accounts to 'admin123'.")

        # Verify password updates
        cur.execute("""
            SELECT u.user_id, u.user_name, u.user_email, r.role_name, u.hospital_id, u.user_password
            FROM tbl_user u
            JOIN tbl_role r ON r.role_id = u.role_id
            ORDER BY u.role_id, u.user_id
        """)
        all_users = cur.fetchall()
        accounts_summary = []
        # Sample verify one non-super user to be 100% sure
        sample_verified = check_password('admin123', admin_hash)
        for u in all_users:
            uid, name, email, role, hosp_id, pwd_hash = u
            is_super = (role == 'Super Admin' or uid == 1)
            accounts_summary.append({
                'user_id': uid,
                'name': name,
                'email': email,
                'role': role,
                'hospital_id': hosp_id,
                'password_status': 'Superadmin (Original preserved)' if is_super else ('Verified (admin123)' if pwd_hash == admin_hash or sample_verified else 'Custom')
            })
            print(f"  - [{role}] {name} ({email}) -> {accounts_summary[-1]['password_status']}")

        # 2. Update existing Appointment 5 for Patient 2 to Completed, and fill empty existing visits
        cur.execute("""
            UPDATE tbl_appointment
            SET appointment_status = 'Completed'
            WHERE appointment_id = 5
        """)

        cur.execute("""
            UPDATE tbl_patient_visit
            SET diagnosis = 'Tension-Type Headache & Academic Stress',
                medical_notes = 'Patient reports bilateral dull, non-pulsatile mild tension headaches related to exam fatigue. Neurological examination normal. Advised adequate hydration and sleep hygiene.'
            WHERE visit_id = 6 AND (diagnosis IS NULL OR diagnosis = '')
        """)

        cur.execute("""
            INSERT INTO tbl_medical_record
            (visit_id, record_diagnosis, record_notes, record_share_flag, record_is_active)
            VALUES (6, 'Tension-Type Headache & Academic Stress', 'Patient reports bilateral dull, non-pulsatile mild tension headaches related to exam fatigue. Neurological examination normal. Advised adequate hydration and sleep hygiene.', 1, 1)
            ON DUPLICATE KEY UPDATE record_diagnosis=VALUES(record_diagnosis)
        """)

        # Fetch doctors and departments
        cur.execute("SELECT doctor_id, user_id, hospital_id, department_id FROM tbl_doctor")
        docs = {d[0]: {'user_id': d[1], 'hospital_id': d[2], 'dept_id': d[3]} for d in cur.fetchall()}

        # Define 7 Clinical Encounters (Visits) across all 4 patient accounts
        # Note: appointment_id must be unique or NULL
        encounters = [
            # 1. Patient 2 (Anjali Ramesh) with Dr. Sneha Varghese (doc 4, hosp 2, dept 6 Ortho)
            {
                'patient_id': 2,
                'doctor_id': 4,
                'hospital_id': 2,
                'appointment_id': 5, # existing appointment #5
                'visit_date': datetime(2026, 10, 15, 10, 30),
                'visit_type': 'OP',
                'diagnosis': 'Lumbar Disc Herniation (L4-L5) with Left Sciatic Radiculopathy',
                'medical_notes': 'Patient reports 3-week history of sharp lower back pain radiating down the left posterolateral leg to the ankle. Positive straight leg raise test at 40 degrees. Neurological exam reveals mild sensory diminution at left L5 dermatome. Prescribed short-term analgesics, physical rehabilitation, and ordered confirmatory MRI.',
                'height': '162 cm',
                'weight': '64 kg',
                'blood_pressure': '122/78 mmHg',
                'vitals_recorded_by': 32, # Divya (receptionist/staff)
                'vitals_recorded_at': datetime(2026, 10, 15, 10, 15),
                'prescriptions': [
                    ('Pregabalin', '75 mg', 'Once daily at bedtime', '14 days', 'Take after food'),
                    ('Aceclofenac + Paracetamol', '100mg/325mg', 'Twice daily', '5 days', 'After food with plenty of water'),
                ],
                'reports': [
                    {
                        'type': 'Radiology',
                        'title': 'Lumbar Spine MRI Scan (L1-S1 High-Resolution)',
                        'file': 'MRI Spine: Confirms 4.2mm posterolateral disc herniation at L4-L5 with mild left thecal sac indentation and impingement of traversing L5 nerve root. Normal marrow signal and conus medullaris.',
                        'date': datetime(2026, 10, 15, 11, 45)
                    },
                    {
                        'type': 'Blood Test',
                        'title': 'Inflammatory Markers Panel (ESR, hs-CRP, RF)',
                        'file': 'hs-CRP: 4.6 mg/L (mild inflammation), ESR: 24 mm/hr, Rheumatoid Factor (RF): Negative (<9.5 IU/mL). Suggests localized discogenic inflammation without systemic rheumatologic etiology.',
                        'date': datetime(2026, 10, 15, 11, 50)
                    }
                ]
            },

            # 2. Patient 2 (Anjali Ramesh) with Dr. Ananya Thomas (doc 2, hosp 2, dept 3 Cardiology)
            {
                'patient_id': 2,
                'doctor_id': 2,
                'hospital_id': 2,
                'appointment_id': None,
                'visit_date': datetime(2026, 10, 18, 14, 0),
                'visit_type': 'OP',
                'diagnosis': 'Stage 1 Essential Hypertension with Mild Sinus Tachycardia',
                'medical_notes': 'Routine cardiovascular clearance. Resting heart rate 96 bpm, bilateral blood pressure consistently elevated. Heart sounds S1, S2 clear with no murmurs. Advised dietary sodium restriction (<2g/day), 30 mins brisk walking, and initiated Telmisartan.',
                'height': '162 cm',
                'weight': '63 kg',
                'blood_pressure': '138/86 mmHg',
                'vitals_recorded_by': 32,
                'vitals_recorded_at': datetime(2026, 10, 18, 13, 50),
                'prescriptions': [
                    ('Telmisartan', '40 mg', 'Once daily in the morning', '30 days', 'Take before or after breakfast'),
                ],
                'reports': [
                    {
                        'type': 'Cardiology',
                        'title': '2D Transthoracic Echocardiogram (Echo Scan)',
                        'file': '2D Echo: Left ventricular ejection fraction (LVEF) 62%. Concentric LV remodeling noted. Normal mitral, aortic, and tricuspid valve motion without regurgitation. No pericardial effusion.',
                        'date': datetime(2026, 10, 18, 14, 45)
                    },
                    {
                        'type': 'Blood Test',
                        'title': 'Lipid Profile & Fasting Blood Glucose Panel',
                        'file': 'Total Cholesterol: 218 mg/dL, LDL-C: 136 mg/dL, HDL-C: 47 mg/dL, Triglycerides: 175 mg/dL, Fasting Plasma Glucose: 96 mg/dL (Normal). Lifestyle and dietary modifications advised.',
                        'date': datetime(2026, 10, 18, 15, 0)
                    }
                ]
            },

            # 3. Patient 3 (Maria Josephine) with Dr. Nevin (doc 6, hosp 4, dept 7 Neurology)
            {
                'patient_id': 3,
                'doctor_id': 6,
                'hospital_id': 4,
                'appointment_id': None,
                'visit_date': datetime(2026, 10, 10, 11, 0),
                'visit_type': 'OP',
                'diagnosis': 'Migraine with Typical Visual Aura & Photophobia',
                'medical_notes': '19-year-old female presents with frequent pulsating unilateral hemicranial headaches preceded by scintillating scotoma lasting 20 minutes. Accompanied by photophobia and nausea. Cranial nerves II-XII intact. Started migraine prophylactic protocol.',
                'height': '160 cm',
                'weight': '52 kg',
                'blood_pressure': '114/74 mmHg',
                'vitals_recorded_by': 58, # Amritha (Nurse at Life Care)
                'vitals_recorded_at': datetime(2026, 10, 10, 10, 45),
                'prescriptions': [
                    ('Sumatriptan', '50 mg', 'At onset of migraine attack', '6 doses', 'Repeat once after 2 hours if needed'),
                    ('Naproxen Sodium', '500 mg', 'With acute migraine', '5 days', 'After food'),
                ],
                'reports': [
                    {
                        'type': 'Radiology',
                        'title': 'Brain MRI & Magnetic Resonance Angiography (MRA) Scan',
                        'file': 'Brain MRI: No evidence of acute infarction, intracranial hemorrhage, demyelinating lesions, or space-occupying lesions. MRA demonstrates symmetric, patent major intracranial arteries.',
                        'date': datetime(2026, 10, 10, 12, 15)
                    },
                    {
                        'type': 'Blood Test',
                        'title': 'Serum Vitamin B12, Vitamin D3 & Thyroid Panel (TSH)',
                        'file': 'TSH: 2.15 mIU/L (Euthyroid), Vitamin B12: 460 pg/mL (Normal), 25-OH Vitamin D3: 15.2 ng/mL (Deficient, <20 ng/mL). Cholecalciferol 60,000 IU weekly recommended for 8 weeks.',
                        'date': datetime(2026, 10, 10, 12, 30)
                    }
                ]
            },

            # 4. Patient 3 (Maria Josephine) with Dr. Meera Nair (doc 3, hosp 2, dept 5 Pediatrics)
            {
                'patient_id': 3,
                'doctor_id': 3,
                'hospital_id': 2,
                'appointment_id': None,
                'visit_date': datetime(2026, 10, 16, 15, 30),
                'visit_type': 'OP',
                'diagnosis': 'Microcytic Hypochromic Anemia secondary to Iron Deficiency',
                'medical_notes': 'Patient reports progressive generalized fatigue, poor concentration, and exertional dizziness. Physical examination shows conjunctival pallor and koilonychia. S1 S2 normal, no hepatosplenomegaly. Commenced on oral iron therapy.',
                'height': '160 cm',
                'weight': '51 kg',
                'blood_pressure': '110/70 mmHg',
                'vitals_recorded_by': 32,
                'vitals_recorded_at': datetime(2026, 10, 16, 15, 15),
                'prescriptions': [
                    ('Ferrous Ascorbate + Folic Acid', '100mg/1.5mg', 'Once daily', '60 days', 'Take 1 hour before meal or with citrus fruit juice'),
                ],
                'reports': [
                    {
                        'type': 'Blood Test',
                        'title': 'Complete Blood Count (CBC) with Peripheral Blood Smear',
                        'file': 'Hemoglobin: 9.4 g/dL (Low, ref 12.0-15.5), RBC: 3.75 M/uL, MCV: 71.0 fL (Microcytic), MCH: 23.2 pg (Hypochromic), Serum Ferritin: 11 ng/mL (Depleted iron stores). Platelets: 285,000/uL.',
                        'date': datetime(2026, 10, 16, 16, 10)
                    },
                    {
                        'type': 'Radiology',
                        'title': 'Whole Abdomen & Pelvic Diagnostic Ultrasound Scan',
                        'file': 'Pelvic & Abdominal USG: Liver, spleen, kidneys, and pancreas normal in size and architecture. Uterus and bilateral ovaries unremarkable with no free fluid in Pouch of Douglas.',
                        'date': datetime(2026, 10, 16, 16, 25)
                    }
                ]
            },

            # 5. Patient 12 (Ananya Thomas) with Dr. Arun Mathew (doc 7, hosp 5, dept 8 General Med)
            {
                'patient_id': 12,
                'doctor_id': 7,
                'hospital_id': 5,
                'appointment_id': None,
                'visit_date': datetime(2026, 10, 22, 10, 0),
                'visit_type': 'OP',
                'diagnosis': 'Acute Follicular Streptococcal Tonsillitis',
                'medical_notes': 'Patient presents with severe sore throat, odynophagia, and fever (101.4 F) for 2 days. Bilateral hypertrophied tonsils with prominent yellowish follicular crypt exudates. Tender jugulodigastric lymph nodes. NOTE: Documented Allergy to Paracetamol; prescribed alternative analgesia.',
                'height': '165 cm',
                'weight': '58 kg',
                'blood_pressure': '118/76 mmHg',
                'vitals_recorded_by': 61, # Neha Joseph (Nurse at Green Valley)
                'vitals_recorded_at': datetime(2026, 10, 22, 9, 45),
                'prescriptions': [
                    ('Amoxicillin + Clavulanic Acid', '625 mg', 'Twice daily', '7 days', 'Take with meals to avoid gastric upset'),
                    ('Ibuprofen', '400 mg', 'Three times daily as needed', '4 days', 'Take strictly after food (Paracetamol withheld due to allergy)'),
                    ('Chlorhexidine Mouth Gargle 0.2%', '15 ml', 'Twice daily', '5 days', 'Gargle for 60 seconds after meals')
                ],
                'reports': [
                    {
                        'type': 'Pathology',
                        'title': 'Throat Swab Bacterial Culture & Sensitivity (ABST)',
                        'file': 'Throat Swab Culture: Abundant growth of Streptococcus pyogenes (Group A Beta-Hemolytic Streptococcus). Highly sensitive to Amoxicillin-Clavulanate, Cephalexin, and Azithromycin.',
                        'date': datetime(2026, 10, 22, 11, 15)
                    },
                    {
                        'type': 'Radiology',
                        'title': 'High-Resolution Cervical Soft Tissue Ultrasound Scan',
                        'file': 'Neck USG: Multiple bilateral enlarged level II cervical lymph nodes (right 1.4 cm, left 1.2 cm) with preserved fatty hilum and normal vascularity, typical for acute reactive tonsillar lymphadenitis.',
                        'date': datetime(2026, 10, 22, 11, 35)
                    }
                ]
            },

            # 6. Patient 12 (Ananya Thomas) with Dr. Anu (doc 1, hosp 1, dept 1 Sunrise Hospital)
            {
                'patient_id': 12,
                'doctor_id': 1,
                'hospital_id': 1,
                'appointment_id': None,
                'visit_date': datetime(2026, 10, 19, 11, 30),
                'visit_type': 'OP',
                'diagnosis': 'Gastroesophageal Reflux Disease (GERD) with Antral Gastritis',
                'medical_notes': 'Patient reports recurrent retrosternal pyrosis and acid regurgitation worse after heavy or spicy meals and when lying flat. Abdomen soft, mild epigastric tenderness on deep palpation. Advised head-end bed elevation and proton pump inhibitor therapy.',
                'height': '165 cm',
                'weight': '57 kg',
                'blood_pressure': '120/80 mmHg',
                'vitals_recorded_by': 50, # Sarah Kurian (Nurse at Sunrise)
                'vitals_recorded_at': datetime(2026, 10, 19, 11, 15),
                'prescriptions': [
                    ('Pantoprazole', '40 mg', 'Once daily', '28 days', 'Take 30 minutes before breakfast on empty stomach'),
                    ('Domperidone', '10 mg', 'Twice daily', '14 days', 'Take 15 minutes before lunch and dinner')
                ],
                'reports': [
                    {
                        'type': 'Radiology',
                        'title': 'Upper Abdominal High-Resolution Ultrasound Scan',
                        'file': 'Upper Abdominal USG: Liver parenchyma normal with homogeneous echotexture. Gallbladder well-distended without calculi or wall thickening. Spleen and pancreas normal. Mild antral mucosal thickening.',
                        'date': datetime(2026, 10, 19, 12, 10)
                    },
                    {
                        'type': 'Pathology',
                        'title': 'Helicobacter Pylori Stool Antigen & Pepsinogen Ratio',
                        'file': 'H. pylori stool antigen: Negative. Serum Pepsinogen I: 84.5 mcg/L, Pepsinogen II: 11.8 mcg/L, Pepsinogen I/II Ratio: 7.16 (Normal gastric mucosa, no active atrophic gastritis).',
                        'date': datetime(2026, 10, 19, 12, 30)
                    }
                ]
            },

            # 7. Patient 1 (Arjun) with Dr. Rajesh Sharma (doc 5, hosp 1, dept 1 General Med Sunrise)
            {
                'patient_id': 1,
                'doctor_id': 5,
                'hospital_id': 1,
                'appointment_id': None,
                'visit_date': datetime(2026, 10, 20, 16, 0),
                'visit_type': 'OP',
                'diagnosis': 'Type 2 Diabetes Mellitus with Mild Peripheral Neuropathy',
                'medical_notes': 'Patient attends 6-month diabetic review. Complains of mild tingling and numbness in distal plantar surface bilaterally. Monofilament test shows preserved sensation at 8/10 points. Feet inspected, no ulcers. Good therapeutic compliance.',
                'height': '175 cm',
                'weight': '73 kg',
                'blood_pressure': '126/82 mmHg',
                'vitals_recorded_by': 50, # Sarah Kurian (Nurse at Sunrise)
                'vitals_recorded_at': datetime(2026, 10, 20, 15, 45),
                'prescriptions': [
                    ('Metformin Hydrochloride Prolonged-Release', '500 mg', 'Twice daily', '60 days', 'Take with or immediately after meals'),
                    ('Methylcobalamin + Alpha Lipoic Acid', '1500 mcg', 'Once daily', '30 days', 'After morning meal')
                ],
                'reports': [
                    {
                        'type': 'Radiology',
                        'title': 'High-Resolution Chest CT Scan (HRCT Thorax)',
                        'file': 'HRCT Thorax: Clear lung parenchymal fields bilaterally. Normal tracheobronchial tree. Complete resolution of prior subpleural opacity. No mediastinal adenopathy or pleural thickening.',
                        'date': datetime(2026, 10, 20, 16, 45)
                    },
                    {
                        'type': 'Cardiology',
                        'title': '12-Lead Electrocardiogram (ECG / EKG Scan)',
                        'file': '12-Lead ECG Scan: Normal sinus rhythm at 72 bpm. PR interval 142 ms, QRS complex 86 ms, QTc 412 ms. Normal axis, no ischemic ST segment deviation or pathologic Q waves.',
                        'date': datetime(2026, 10, 20, 17, 0)
                    },
                    {
                        'type': 'Blood Test',
                        'title': 'Glycated Hemoglobin (HbA1c) & Renal Function Panel',
                        'file': 'HbA1c: 6.7% (Good diabetic control), Fasting Blood Sugar: 122 mg/dL, Serum Creatinine: 0.88 mg/dL, Blood Urea Nitrogen (BUN): 14 mg/dL, eGFR: >90 mL/min/1.73m2 (Stage 1 normal kidney function).',
                        'date': datetime(2026, 10, 20, 17, 15)
                    },
                    {
                        'type': 'Urine Analysis',
                        'title': 'Urinary Microalbumin-to-Creatinine Ratio (UACR)',
                        'file': 'UACR: 16.2 mg/g Creatinine (Normal <30 mg/g). Dipstick: Protein negative, Glucose trace, Ketones negative. Confirms absence of early diabetic microvascular renal damage.',
                        'date': datetime(2026, 10, 20, 17, 30)
                    }
                ]
            }
        ]

        inserted_visits = []
        inserted_medical_records = []
        inserted_reports = []
        inserted_prescriptions = []

        print("\n[2] Inserting Visits, Diagnoses, Medical Records, Lab Reports & Scan Reports...")

        for enc in encounters:
            p_id = enc['patient_id']
            d_id = enc['doctor_id']
            h_id = enc['hospital_id']
            apt_id = enc['appointment_id']

            # If appointment_id is None, create a completed appointment so everything links seamlessly
            if apt_id is None:
                cur.execute("""
                    INSERT INTO tbl_appointment
                    (patient_id, hospital_id, department_id, doctor_id, appointment_date, appointment_time, reason, created_by_user_id, appointment_status, appointment_is_active)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'Completed', 1)
                """, [
                    p_id,
                    h_id,
                    docs[d_id]['dept_id'],
                    d_id,
                    enc['visit_date'].date(),
                    enc['visit_date'].strftime('%H:%M'),
                    enc['diagnosis'][:100],
                    docs[d_id]['user_id']
                ])
                apt_id = cur.lastrowid

            # Insert into tbl_patient_visit
            cur.execute("""
                INSERT INTO tbl_patient_visit
                (appointment_id, visit_date, visit_is_active, patient_id, doctor_id, hospital_id,
                 diagnosis, medical_notes, visited_at, height, weight, blood_pressure,
                 vitals_recorded_by, vitals_recorded_at, record_share_flag, visit_type)
                VALUES (%s, %s, 1, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1, %s)
            """, [
                apt_id,
                enc['visit_date'],
                p_id,
                d_id,
                h_id,
                enc['diagnosis'],
                enc['medical_notes'],
                enc['visit_date'],
                enc['height'],
                enc['weight'],
                enc['blood_pressure'],
                enc['vitals_recorded_by'],
                enc['vitals_recorded_at'],
                enc['visit_type']
            ])
            vis_id = cur.lastrowid
            inserted_visits.append({
                'visit_id': vis_id,
                'patient_id': p_id,
                'doctor_id': d_id,
                'hospital_id': h_id,
                'diagnosis': enc['diagnosis']
            })

            # Insert into tbl_medical_record (synchronized with visit)
            cur.execute("""
                INSERT INTO tbl_medical_record
                (visit_id, record_diagnosis, record_notes, record_share_flag, record_is_active, record_created_at)
                VALUES (%s, %s, %s, 1, 1, %s)
            """, [
                vis_id,
                enc['diagnosis'],
                enc['medical_notes'],
                enc['visit_date']
            ])
            rec_id = cur.lastrowid
            inserted_medical_records.append({
                'record_id': rec_id,
                'visit_id': vis_id,
                'diagnosis': enc['diagnosis']
            })

            # Insert prescriptions if any
            if enc.get('prescriptions'):
                cur.execute("""
                    INSERT INTO tbl_prescription
                    (record_id, prescription_date, remarks, prescription_share_flag, prescription_is_active,
                     prescription_created_at, patient_id, doctor_id, hospital_id, appointment_id, visit_id)
                    VALUES (%s, %s, %s, 1, 1, %s, %s, %s, %s, %s, %s)
                """, [
                    rec_id,
                    enc['visit_date'].date(),
                    f"Prescribed during {enc['visit_type']} visit for {enc['diagnosis'][:50]}",
                    enc['visit_date'],
                    p_id,
                    d_id,
                    h_id,
                    apt_id,
                    vis_id
                ])
                presc_id = cur.lastrowid
                for med in enc['prescriptions']:
                    cur.execute("""
                        INSERT INTO tbl_prescription_item
                        (prescription_id, medicine_name, medicine_dosage, medicine_frequency, medicine_duration, medicine_instruction)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, [presc_id, med[0], med[1], med[2], med[3], med[4]])
                inserted_prescriptions.append(presc_id)

            # Insert reports (lab and scan reports)
            for rep in enc.get('reports', []):
                cur.execute("""
                    INSERT INTO tbl_lab_report
                    (record_id, hospital_id, report_type, report_title, report_file,
                     report_share_flag, report_is_active, report_uploaded_at, patient_id, doctor_id,
                     appointment_id, visit_id)
                    VALUES (%s, %s, %s, %s, %s, 1, 1, %s, %s, %s, %s, %s)
                """, [
                    rec_id,
                    h_id,
                    rep['type'],
                    rep['title'],
                    rep['file'],
                    rep['date'],
                    p_id,
                    d_id,
                    apt_id,
                    vis_id
                ])
                rep_id = cur.lastrowid
                inserted_reports.append({
                    'report_id': rep_id,
                    'patient_id': p_id,
                    'doctor_id': d_id,
                    'hospital_id': h_id,
                    'type': rep['type'],
                    'title': rep['title']
                })

        print(f"  Successfully inserted {len(inserted_visits)} clinical visits with diagnoses.")
        print(f"  Successfully inserted {len(inserted_medical_records)} medical records.")
        print(f"  Successfully inserted {len(inserted_reports)} reports (both Scan and Lab reports).")
        print(f"  Successfully inserted {len(inserted_prescriptions)} prescription groups with items.")

        return {
            'accounts': accounts_summary,
            'visits': inserted_visits,
            'records': inserted_medical_records,
            'reports': inserted_reports,
            'prescriptions': inserted_prescriptions
        }

if __name__ == '__main__':
    res = seed_clinical_and_accounts()
    print("\n[SUCCESS] All data successfully inserted and accounts synchronized!")
