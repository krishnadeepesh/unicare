import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'unicare_backend.settings')

import django
django.setup()

from django.db import connection

def run_sql_file(file_path):
    print(f"Executing {file_path.name}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        sql = f.read()

    # Split on semicolons that terminate statements
    statements = [stmt.strip() for stmt in sql.split(';\n') if stmt.strip()]
    with connection.cursor() as cursor:
        for stmt in statements:
            if stmt.startswith('--') and '\n' not in stmt:
                continue
            try:
                cursor.execute(stmt)
            except Exception as e:
                # Ignore duplicate or non-fatal warnings
                print(f"Notice on statement: {e}")

    print(f"Finished {file_path.name} successfully.")

if __name__ == '__main__':
    db_dir = Path(__file__).resolve().parent
    schema_file = db_dir / "unicare_schema.sql"
    seed_file = db_dir / "unicare_seed.sql"

    if schema_file.exists():
        run_sql_file(schema_file)
    if seed_file.exists():
        run_sql_file(seed_file)
    print("Database initialization complete!")
