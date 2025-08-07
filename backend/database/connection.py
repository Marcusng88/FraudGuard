"""
Database connection and session management for FraudGuard
"""
import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
from models.database import Base
from core.config import settings

logger = logging.getLogger(__name__)

# Database URL - using PostgreSQL/Supabase
DATABASE_URL = settings.supabase_db_url or "postgresql://postgres:password@localhost:5432/fraudguard"

# Global variables for optional database connection
engine = None
SessionLocal = None
db_available = False

# Try to create database connection
try:
    engine = create_engine(DATABASE_URL, echo=settings.debug)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db_available = True
    logger.info("Database connection established")
except Exception as e:
    logger.warning(f"Database connection failed: {e}")
    logger.info("Running in database-less mode")

def get_db():
    """Dependency to get database session"""
    if not db_available or not SessionLocal:
        logger.error("Database not available - cannot create session")
        raise Exception("Database connection not available")
    
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """Create all tables"""
    if not db_available or not engine:
        logger.warning("Skipping table creation - database not available")
        return
    
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to create tables: {e}")

def drop_tables():
    """Drop all tables (for testing only)"""
    if not db_available or not engine:
        logger.warning("Skipping table drop - database not available")
        return
    
    try:
        Base.metadata.drop_all(bind=engine)
        logger.info("Database tables dropped successfully")
    except Exception as e:
        logger.error(f"Failed to drop tables: {e}")
