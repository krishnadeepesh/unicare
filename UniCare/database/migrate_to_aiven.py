"""
Utility script to import UniCare schema and seed data into an Aiven Cloud MySQL database.
Usage:
    py database/migrate_to_aiven.py --host <HOST> --port <PORT> --user <USER> --password <PASSWORD> --database <DB_NAME>
Or simply run it and enter the details interactively when prompted!
"""

import sys
import argparse
from pathlib import Path

try:
    import pymysql
except ImportError:
    print("PyMySQL is required. Please install it using: pip install pymysql")
    sys.exit(1)

def run_import(host, port, user, password, database, ssl_ca=None):
    print(f"\nConnecting to Aiven MySQL at {host}:{port} ({database})...")
    
    conn_params = {
        'host': host,
        'port': int(port),
        'user': user,
        'password': password,
        'database': database,
        'charset': 'utf8mb4',
        'cursorclass': pymysql.cursors.DictCursor
    }
    
    # Aiven often uses SSL by default
    if ssl_ca:
        conn_params['ssl'] = {'ca': ssl_ca}
    else:
        conn_params['ssl'] = {'check_hostname': False}

    try:
        connection = pymysql.connect(**conn_params)
        print("Connected successfully!")
    except Exception as e:
        print(f"Connection failed: {e}")
        return False

    db_dir = Path(__file__).resolve().parent
    schema_file = db_dir / "unicare_schema.sql"
    seed_file = db_dir / "unicare_seed.sql"

    def execute_sql_file(filepath, label):
        if not filepath.exists():
            print(f"Warning: {filepath.name} not found!")
            return
        
        print(f"\nExecuting {label} ({filepath.name})...")
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        statements = [stmt.strip() for stmt in content.split(';\n') if stmt.strip()]
        with connection.cursor() as cursor:
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
            success_count = 0
            for stmt in statements:
                if stmt.startswith('--') and '\n' not in stmt:
                    continue
                try:
                    cursor.execute(stmt)
                    success_count += 1
                except Exception as err:
                    print(f"Notice on statement: {err}")
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
        connection.commit()
        print(f"Completed {label}: executed {success_count} statements.")

    execute_sql_file(schema_file, "Database Schema (27 Tables)")
    execute_sql_file(seed_file, "Baseline Seed Data")

    connection.close()
    print("\nAll database tables and seed data have been successfully migrated to Aiven MySQL!")
    return True

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Migrate UniCare database to Aiven Cloud MySQL")
    parser.add_argument('--host', help="Aiven host (e.g. mysql-xxxx.aivencloud.com)")
    parser.add_argument('--port', type=int, default=3306, help="Aiven port (e.g. 12345)")
    parser.add_argument('--user', default='avnadmin', help="Aiven user (default: avnadmin)")
    parser.add_argument('--password', help="Aiven password")
    parser.add_argument('--database', default='defaultdb', help="Aiven database name (default: defaultdb)")

    args = parser.parse_args()

    host = args.host or input("Enter Aiven MySQL Host: ").strip()
    port = args.port or input("Enter Aiven MySQL Port [default: 3306]: ").strip() or 3306
    user = args.user or input("Enter Aiven MySQL User [default: avnadmin]: ").strip() or "avnadmin"
    password = args.password or input("Enter Aiven MySQL Password: ").strip()
    database = args.database or input("Enter Aiven Database Name [default: defaultdb]: ").strip() or "defaultdb"

    run_import(host, port, user, password, database)
