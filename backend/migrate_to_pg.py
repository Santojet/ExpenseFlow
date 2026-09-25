import os
from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import text
import urllib.parse

def migrate():
    # 1. Connect to local SQLite
    sqlite_uri = "sqlite:///instance/expenseflow.db"
    sqlite_engine = create_engine(sqlite_uri)
    
    # 2. Connect to Remote Postgres
    pg_uri = "postgresql://neondb_owner:npg_mcUXeEzs0W2Q@ep-broad-smoke-b56bmc34-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require"
    pg_engine = create_engine(pg_uri)
    
    # 3. Reflect metadata
    meta = MetaData()
    meta.reflect(bind=sqlite_engine)
    
    # Order of tables to respect foreign keys
    tables_order = ['organizations', 'users', 'categories', 'expenses', 'salaries', 'budgets', 'savings_goals', 'debts', 'alembic_version']
    
    with pg_engine.connect() as pg_conn:
        with sqlite_engine.connect() as sq_conn:
            # Disable triggers/constraints temporarily on Postgres if possible, 
            # or just rely on correct insertion order.
            
            for table_name in tables_order:
                if table_name in meta.tables:
                    table = meta.tables[table_name]
                    print(f"Migrating table: {table_name}")
                    
                    # Read all rows from SQLite
                    rows = sq_conn.execute(table.select()).fetchall()
                    if not rows:
                        print(f"  -> No data in {table_name}")
                        continue
                    
                    # Delete existing data in PG to avoid conflicts
                    try:
                        pg_conn.execute(table.delete())
                        pg_conn.commit()
                    except Exception as e:
                        print(f"  -> Could not delete {table_name}: {e}")
                        pg_conn.rollback()
                    
                    # Insert into PG
                    # Fetching columns for bulk insert
                    columns = table.columns.keys()
                    
                    # Create list of dicts
                    data_to_insert = []
                    for row in rows:
                        row_dict = dict(zip(columns, row))
                        data_to_insert.append(row_dict)
                    
                    if data_to_insert:
                        try:
                            pg_conn.execute(table.insert(), data_to_insert)
                            print(f"  -> Inserted {len(data_to_insert)} rows into {table_name}")
                            pg_conn.commit()
                        except Exception as e:
                            print(f"  -> Error inserting into {table_name}: {e}")
                            pg_conn.rollback()
                        
                        # Update Postgres Sequence
                        # In Postgres, the sequence is usually named tablename_id_seq
                        try:
                            pg_conn.execute(text(f"SELECT setval('{table_name}_id_seq', COALESCE((SELECT MAX(id)+1 FROM {table_name}), 1), false)"))
                            print(f"  -> Reset sequence for {table_name}")
                            pg_conn.commit()
                        except Exception as e:
                            print(f"  -> Could not reset sequence for {table_name}: {e}")
                            pg_conn.rollback()

if __name__ == "__main__":
    migrate()
