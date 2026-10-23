import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'unicare_backend.settings')

import django
django.setup()

from django.db import connection

seed_tables = [
    'tbl_role',
    'tbl_user',
    'tbl_hospital',
    'tbl_department',
    'tbl_doctor',
    'tbl_nurse',
    'tbl_receptionist',
    'tbl_patient',
    'tbl_patient_profile',
    'tbl_appointment',
    'tbl_patient_visit',
    'tbl_medical_record',
    'tbl_prescription',
    'tbl_prescription_item',
    'tbl_lab_report'
]

cursor = connection.cursor()
lines = [
    "-- UniCare Seed Data\n",
    "SET FOREIGN_KEY_CHECKS = 0;\n\n"
]

for table in seed_tables:
    cursor.execute(f"SELECT * FROM `{table}`")
    rows = cursor.fetchall()
    if not rows:
        continue
    col_names = [d[0] for d in cursor.description]
    cols_str = ', '.join([f'`{c}`' for c in col_names])
    lines.append(f"-- Seed data for `{table}`\n")
    for row in rows:
        vals = []
        for val in row:
            if val is None:
                vals.append("NULL")
            elif isinstance(val, (int, float)):
                vals.append(str(val))
            elif isinstance(val, bool):
                vals.append("1" if val else "0")
            else:
                s = str(val).replace("\\", "\\\\").replace("'", "\\'")
                vals.append(f"'{s}'")
        vals_str = ', '.join(vals)
        lines.append(f"INSERT INTO `{table}` ({cols_str}) VALUES ({vals_str}) ON DUPLICATE KEY UPDATE `{col_names[0]}`=`{col_names[0]}`;\n")
    lines.append("\n")

lines.append("SET FOREIGN_KEY_CHECKS = 1;\n")

out_file = Path(__file__).resolve().parent.parent / "database" / "unicare_seed.sql"
out_file.parent.mkdir(parents=True, exist_ok=True)
with open(out_file, "w", encoding="utf-8") as f:
    f.writelines(lines)

print(f"Seed data successfully exported to {out_file}")
