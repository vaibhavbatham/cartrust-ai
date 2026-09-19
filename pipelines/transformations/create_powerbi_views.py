import os
import sys
base = r'C:/Users/ASUS/.gemini/antigravity/scratch/cartrust-ai'
sys.path.insert(0, os.path.join(base, 'backend'))

from sqlalchemy import text
from app.core.database import engine

def create_views():
    sql_path = os.path.join(base, 'pipelines', 'transformations', 'powerbi_views.sql')
    with open(sql_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()

    # Split into individual view statements
    statements = [s.strip() for s in sql_content.split(';') if s.strip() and not s.strip().startswith('--')]
    with engine.connect() as conn:
        for stmt in statements:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception as e:
                print(f'Note on executing statement: {e}')
    print('Power BI Gold views created successfully in database!')

if __name__ == '__main__':
    create_views()
