"""
Database connection and session management for FraudGuard
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
from models.database import Base
from core.config import settings
import logging

logger = logging.getLogger(__name__)

# Database URL - using PostgreSQL/Supabase
DATABASE_URL = settings.supabase_db_url or "postgresql://postgres:password@localhost:5432/fraudguard"
logger.info(f"Database URL: {DATABASE_URL}")
# Create engine
engine = create_engine(DATABASE_URL, echo=settings.debug)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """Create all tables"""
    Base.metadata.create_all(bind=engine)

def drop_tables():
    """Drop all tables (for testing only)"""
    Base.metadata.drop_all(bind=engine)
