"""
Database models for FraudGuard
Central location for all SQLAlchemy model definitions
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey, Float
from sqlalchemy.types import DECIMAL
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.ext.declarative import declarative_base

# Import pgvector for vector support
try:
    import pgvector.sqlalchemy
    from pgvector.sqlalchemy import Vector
except ImportError:
    # Fallback if pgvector is not installed
    print("Warning: pgvector is not installed. Vector functionality will be limited.")
    Vector = Text

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
    embedding_vector = Column(Vector(768))  # pgvector vector type for embeddings
    is_fraud = Column(Boolean, default=False)
    confidence_score = Column(Float, default=0.0)
    flag_type = Column(Integer)
    reason = Column(Text)
    evidence_url = Column(Text)
    analysis_details = Column(JSON)  # JSONB type for analysis details
    status = Column(Text, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Phase 2: Enhanced NFT columns
    is_listed = Column(Boolean, default=False)
    listing_price = Column(DECIMAL(18, 8))
    last_listed_at = Column(DateTime)
    listing_id = Column(Text)
    kiosk_id = Column(Text)
    listing_status = Column(Text, default="inactive")

class Listing(Base):
    __tablename__ = "listings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nft_id = Column(UUID(as_uuid=True), ForeignKey("nfts.id"), nullable=False)
    seller_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    price = Column(DECIMAL(18, 8), nullable=False)
    expires_at = Column(DateTime)
    status = Column(Text, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Phase 2: Enhanced Listing columns
    kiosk_id = Column(Text)
    blockchain_tx_id = Column(Text)
    listing_id = Column(Text, unique=True)
    updated_at = Column(DateTime, default=datetime.utcnow)
    listing_metadata = Column(JSON)  # JSONB type for listing metadata

class FraudFlag(Base):
    __tablename__ = "flags"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nft_id = Column(UUID(as_uuid=True), ForeignKey("nfts.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class UserKioskMap(Base):
    __tablename__ = "user_kiosk_map"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    kiosk_id = Column(Text, nullable=False, unique=True)
    kiosk_owner_cap_id = Column(Text)
    sync_status = Column(Text, default="synced")
    last_synced_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

# Phase 2: Enhanced Models

class ListingHistory(Base):
    __tablename__ = "listing_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("listings.id"), nullable=False)
    nft_id = Column(UUID(as_uuid=True), ForeignKey("nfts.id"), nullable=False)
    action = Column(Text, nullable=False)  # 'created', 'updated', 'deleted', 'expired'
    old_price = Column(DECIMAL(18, 8))
    new_price = Column(DECIMAL(18, 8))
    seller_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    kiosk_id = Column(Text)
    blockchain_tx_id = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

class TransactionHistory(Base):
    __tablename__ = "transaction_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nft_id = Column(UUID(as_uuid=True), ForeignKey("nfts.id"), nullable=False)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("listings.id"))
    seller_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    buyer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    price = Column(DECIMAL(18, 8), nullable=False)
    blockchain_tx_id = Column(Text, nullable=False)
    transaction_type = Column(Text, nullable=False)  # 'purchase', 'listing', 'delisting', 'price_update'
    status = Column(Text, default="completed")
    gas_fee = Column(DECIMAL(18, 8))
    timestamp = Column(DateTime, default=datetime.utcnow)

class MarketplaceAnalytics(Base):
    __tablename__ = "marketplace_analytics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    total_listings = Column(Integer, default=0)
    total_volume = Column(DECIMAL(18, 8), default=0)
    active_sellers = Column(Integer, default=0)
    total_transactions = Column(Integer, default=0)
    average_price = Column(DECIMAL(18, 8), default=0)
    fraud_detection_rate = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

class BlockchainEvent(Base):
    __tablename__ = "blockchain_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type = Column(Text, nullable=False)  # 'NFTListed', 'NFTUnlisted', 'NFTPurchased', 'KioskCreated', etc.
    nft_id = Column(Text)
    kiosk_id = Column(Text)
    seller_address = Column(Text)
    buyer_address = Column(Text)
    price = Column(DECIMAL(18, 8))
    listing_id = Column(Text)
    blockchain_tx_id = Column(Text, nullable=False)
    block_number = Column(Integer)
    event_data = Column(JSON)  # JSONB type for event data
    processed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class UserActivity(Base):
    __tablename__ = "user_activity"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    activity_type = Column(Text, nullable=False)  # 'login', 'nft_mint', 'listing_created', 'purchase', 'fraud_report'
    nft_id = Column(UUID(as_uuid=True), ForeignKey("nfts.id"))
    listing_id = Column(UUID(as_uuid=True), ForeignKey("listings.id"))
    details = Column(JSON)  # JSONB type for activity details
    ip_address = Column(Text)
    user_agent = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
