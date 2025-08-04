"""
Database models for FraudGuard
Central location for all SQLAlchemy model definitions
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey, Float
from sqlalchemy.types import DECIMAL
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base

# Create the declarative base
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_address = Column(Text, unique=True, nullable=False)
    email = Column(Text, unique=True, nullable=False)
    username = Column(Text, nullable=False)
    avatar_url = Column(Text)
    bio = Column(Text)
    reputation_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

class NFT(Base):
    __tablename__ = "nfts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    wallet_address = Column(Text, nullable=False)
    title = Column(Text, nullable=False)
    description = Column(Text)
    category = Column(Text, nullable=False)
    price = Column(DECIMAL(18, 8), nullable=False)
    image_url = Column(Text, nullable=False)
    sui_object_id = Column(Text, unique=True)
    embedding_vector = Column(Text)  # This would be vector type in production
    is_fraud = Column(Boolean, default=False)
    confidence_score = Column(Float, default=0.0)
    flag_type = Column(Integer)
    reason = Column(Text)
    evidence_url = Column(Text)
    analysis_details = Column(Text)  # This would be JSONB in production
    status = Column(Text, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

class Listing(Base):
    __tablename__ = "listings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nft_id = Column(UUID(as_uuid=True), ForeignKey("nfts.id"), nullable=False)
    seller_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    price = Column(DECIMAL(18, 8), nullable=False)
    expires_at = Column(DateTime)
    status = Column(Text, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

class FraudFlag(Base):
    __tablename__ = "flags"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nft_id = Column(UUID(as_uuid=True), ForeignKey("nfts.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
