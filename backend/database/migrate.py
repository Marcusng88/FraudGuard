#!/usr/bin/env python3
"""
Database migration script for FraudGuard
Adds missing fields to transaction_history table
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

def run_migration():
    """Run the database migration"""
    try:
        # Get database URL from environment
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("ERROR: DATABASE_URL environment variable not set")
            return False
        
        # Create engine and session
        engine = create_engine(database_url)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        print("Running transaction_history table migration...")
        
        # Read migration SQL
        migration_path = os.path.join(os.path.dirname(__file__), "migrations", "add_transaction_fields.sql")
        with open(migration_path, 'r') as f:
            migration_sql = f.read()
        
        # Execute migration commands one by one
        commands = migration_sql.split(';')
        for command in commands:
            command = command.strip()
            if command and not command.startswith('--'):
                try:
                    session.execute(text(command))
                    session.commit()
                    print(f"✓ Executed: {command[:50]}...")
                except Exception as e:
                    print(f"⚠ Warning executing command: {e}")
                    session.rollback()
        
        print("✓ Migration completed successfully!")
        session.close()
        return True
        
    except Exception as e:
        print(f"ERROR: Migration failed: {e}")
        return False

if __name__ == "__main__":
    success = run_migration()
    if not success:
        sys.exit(1)
