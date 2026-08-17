from django.core.management.base import BaseCommand
from django.db import connection


def col_exists(cursor, table, col):
    cursor.execute(
        "SELECT COUNT(*) FROM information_schema.COLUMNS "
        "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s AND COLUMN_NAME=%s",
        [table, col]
    )
    return bool(cursor.fetchone()[0])


def col_type(cursor, table, col):
    cursor.execute(
        "SELECT DATA_TYPE FROM information_schema.COLUMNS "
        "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s AND COLUMN_NAME=%s",
        [table, col]
    )
    row = cursor.fetchone()
    return row[0] if row else None


def table_exists(cursor, table):
    cursor.execute(
        "SELECT COUNT(*) FROM information_schema.TABLES "
        "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s",
        [table]
    )
    return bool(cursor.fetchone()[0])


class Command(BaseCommand):
    help = 'Migrate schema: extend tbl_appointment and tbl_doctor, drop legacy tables'

    def handle(self, *args, **options):
        with connection.cursor() as c:

            self.stdout.write('== Extending tbl_appointment ==')
            if not col_exists(c, 'tbl_appointment', 'hospital_id'):
                c.execute("ALTER TABLE tbl_appointment ADD COLUMN hospital_id INT NULL AFTER patient_id")
                self.stdout.write('  + hospital_id added')
            else:
                self.stdout.write('  . hospital_id already exists')

            if not col_exists(c, 'tbl_appointment', 'department_id'):
                c.execute("ALTER TABLE tbl_appointment ADD COLUMN department_id INT NULL AFTER hospital_id")
                self.stdout.write('  + department_id added')
            else:
                self.stdout.write('  . department_id already exists')

            if not col_exists(c, 'tbl_appointment', 'reason'):
                c.execute("ALTER TABLE tbl_appointment ADD COLUMN reason VARCHAR(255) NULL AFTER appointment_time")
                self.stdout.write('  + reason added')
            else:
                self.stdout.write('  . reason already exists')

            if not col_exists(c, 'tbl_appointment', 'created_by_user_id'):
                c.execute("ALTER TABLE tbl_appointment ADD COLUMN created_by_user_id INT NULL AFTER reason")
                self.stdout.write('  + created_by_user_id added')
            else:
                self.stdout.write('  . created_by_user_id already exists')

            dtype = col_type(c, 'tbl_appointment', 'appointment_time')
            if dtype and dtype.lower() == 'time':
                c.execute("ALTER TABLE tbl_appointment MODIFY COLUMN appointment_time VARCHAR(20) NOT NULL")
                self.stdout.write('  ~ appointment_time changed TIME -> VARCHAR(20)')
            else:
                self.stdout.write(f'  . appointment_time already {dtype}')

            self.stdout.write('== Extending tbl_doctor ==')
            if not col_exists(c, 'tbl_doctor', 'hospital_id'):
                c.execute("ALTER TABLE tbl_doctor ADD COLUMN hospital_id INT NULL AFTER user_id")
                self.stdout.write('  + hospital_id added to tbl_doctor')
            else:
                self.stdout.write('  . hospital_id already exists in tbl_doctor')

            self.stdout.write('== Migrating doctor hospital links ==')
            if table_exists(c, 'tbl_doctor_hospital'):
                c.execute("SELECT doctor_id, hospital_id FROM tbl_doctor_hospital WHERE is_active=1")
                rows = c.fetchall()
                updated = 0
                for doctor_id, hosp_id in rows:
                    c.execute(
                        "UPDATE tbl_doctor SET hospital_id=%s WHERE doctor_id=%s AND (hospital_id IS NULL OR hospital_id=%s)",
                        [hosp_id, doctor_id, hosp_id]
                    )
                    updated += c.rowcount
                self.stdout.write(f'  migrated {updated} links')
            else:
                self.stdout.write('  tbl_doctor_hospital does not exist')

            c.execute(
                "UPDATE tbl_doctor d JOIN tbl_user u ON u.user_id=d.user_id "
                "SET d.hospital_id=u.hospital_id "
                "WHERE d.hospital_id IS NULL AND u.hospital_id IS NOT NULL"
            )
            self.stdout.write(f'  filled {c.rowcount} from tbl_user.hospital_id')

            self.stdout.write('== Migrating clinical appointments ==')
            if table_exists(c, 'tbl_clinical_appointment'):
                c.execute("SELECT COUNT(*) FROM tbl_clinical_appointment")
                ca_count = c.fetchone()[0]
                if ca_count > 0:
                    c.execute(
                        "INSERT IGNORE INTO tbl_appointment "
                        "(patient_id, hospital_id, department_id, doctor_id, appointment_date, appointment_time, "
                        "reason, created_by_user_id, appointment_status, appointment_is_active, appointment_created_at) "
                        "SELECT patient_id, hospital_id, department_id, doctor_id, appointment_date, appointment_time, "
                        "reason, created_by_user_id, "
                        "CASE appointment_status WHEN 'Booked' THEN 'Pending' WHEN 'Completed' THEN 'Completed' "
                        "WHEN 'Cancelled' THEN 'Cancelled' ELSE 'Pending' END, 1, created_at "
                        "FROM tbl_clinical_appointment"
                    )
                    self.stdout.write(f'  migrated {c.rowcount} rows')
                else:
                    self.stdout.write('  no rows to migrate')
            else:
                self.stdout.write('  tbl_clinical_appointment does not exist')

            self.stdout.write('== Dropping legacy tables ==')
            if table_exists(c, 'tbl_clinical_appointment'):
                c.execute("DROP TABLE tbl_clinical_appointment")
                self.stdout.write('  dropped tbl_clinical_appointment')
            else:
                self.stdout.write('  tbl_clinical_appointment already gone')

            if table_exists(c, 'tbl_doctor_hospital'):
                c.execute("DROP TABLE tbl_doctor_hospital")
                self.stdout.write('  dropped tbl_doctor_hospital')
            else:
                self.stdout.write('  tbl_doctor_hospital already gone')

        self.stdout.write('')
        self.stdout.write('== Final schema ==')
        for tbl in ['tbl_appointment', 'tbl_doctor']:
            with connection.cursor() as c:
                c.execute(f"DESCRIBE {tbl}")
                self.stdout.write(f'\n{tbl}:')
                for r in c.fetchall():
                    self.stdout.write(f'  {r}')
        self.stdout.write(self.style.SUCCESS('\nMigration complete!'))
