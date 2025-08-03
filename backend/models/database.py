"""
Database models for FraudGuard
SQLAlchemy models for NFT marketplace with fraud detection
"""
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import Column, String, Text, Boolean, Integer, DECIMAL, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field
from enum import Enum

Base = declarative_base()

class ThreatLevel(str, Enum):
    SAFE = "safe"
    WARNING = "warning"
    DANGER = "danger"

class ListingStatus(str, Enum):
    UNLISTED = "unlisted"
    ACTIVE = "active"
    SOLD = "sold"
    CANCELLED = "cancelled"

class FlagType(str, Enum):
    PLAGIARISM = "plagiarism"
    SUSPICIOUS_BEHAVIOR = "suspicious_behavior"
    COPYRIGHT_VIOLATION = "copyright_violation"
    FAKE_METADATA = "fake_metadata"
    PRICE_MANIPULATION = "price_manipulation"

# SQLAlchemy Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sui_address = Column(String(66), unique=True, nullable=False)
    display_name = Column(String(100))
    avatar_url = Column(Text)
    provider = Column(String(20))
    is_verified = Column(Boolean, default=False)
    reputation_score = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    created_nfts = relationship("NFT", foreign_keys="NFT.creator_address", back_populates="creator")
    owned_nfts = relationship("NFT", foreign_keys="NFT.current_owner_address", back_populates="owner")
    
    __table_args__ = (
        CheckConstraint("provider IN ('google', 'twitch', 'facebook')", name="check_provider"),
    )

class NFT(Base):
    __tablename__ = "nfts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nft_id = Column(String(100), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    image_url = Column(Text, nullable=False)
    metadata_url = Column(Text)
    creator_address = Column(String(66), ForeignKey("users.sui_address"), nullable=False)
    current_owner_address = Column(String(66), ForeignKey("users.sui_address"), nullable=False)
    price_sui = Column(DECIMAL(20, 9))
    currency = Column(String(10), default="SUI")
    is_listed = Column(Boolean, default=False)
    listing_status = Column(String(20), default="unlisted")
    threat_level = Column(String(20), default="safe")
    confidence_score = Column(DECIMAL(5, 4))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    listed_at = Column(DateTime)
    
    # Relationships
    creator = relationship("User", foreign_keys=[creator_address], back_populates="created_nfts")
    owner = relationship("User", foreign_keys=[current_owner_address], back_populates="owned_nfts")
    fraud_flags = relationship("FraudFlag", back_populates="nft")
    trades = relationship("Trade", back_populates="nft")
    
    __table_args__ = (
        CheckConstraint("listing_status IN ('unlisted', 'active', 'sold', 'cancelled')", name="check_listing_status"),
        CheckConstraint("threat_level IN ('safe', 'warning', 'danger')", name="check_threat_level"),
    )

class FraudFlag(Base):
    __tablename__ = "fraud_flags"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    flag_id = Column(String(100), unique=True, nullable=False)
    nft_id = Column(UUID(as_uuid=True), ForeignKey("nfts.id"), nullable=False)
    reason = Column(Text, nullable=False)
    flag_type = Column(String(50), nullable=False)
    confidence = Column(DECIMAL(5, 4), nullable=False)
    flagged_by_address = Column(String(66), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime)
    
    # Relationships
    nft = relationship("NFT", back_populates="fraud_flags")
    
    __table_args__ = (
        CheckConstraint("flag_type IN ('plagiarism', 'suspicious_behavior', 'copyright_violation', 'fake_metadata', 'price_manipulation')", name="check_flag_type"),
    )

class Trade(Base):
    __tablename__ = "trades"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id = Column(String(100), unique=True, nullable=False)
    nft_id = Column(UUID(as_uuid=True), ForeignKey("nfts.id"), nullable=False)
    seller_address = Column(String(66), ForeignKey("users.sui_address"), nullable=False)
    buyer_address = Column(String(66), ForeignKey("users.sui_address"), nullable=False)
    price_sui = Column(DECIMAL(20, 9), nullable=False)
    currency = Column(String(10), default="SUI")
    trade_type = Column(String(20), default="purchase")
    transaction_status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    confirmed_at = Column(DateTime)
    
    # Relationships
    nft = relationship("NFT", back_populates="trades")
    seller = relationship("User", foreign_keys=[seller_address])
    buyer = relationship("User", foreign_keys=[buyer_address])
    
    __table_args__ = (
        CheckConstraint("trade_type IN ('purchase', 'transfer', 'mint')", name="check_trade_type"),
        CheckConstraint("transaction_status IN ('pending', 'confirmed', 'failed')", name="check_transaction_status"),
    )

# Pydantic Models for API
class UserResponse(BaseModel):
    sui_address: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_verified: bool = False
    reputation_score: int = 0
    
    class Config:
        from_attributes = True

class FraudFlagResponse(BaseModel):
    flag_id: str
    reason: str
    flag_type: FlagType
    confidence: float
    flagged_by_address: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class NFTResponse(BaseModel):
    id: str
    nft_id: str
    name: str
    description: Optional[str] = None
    image_url: str
    price_sui: Optional[float] = None
    currency: str = "SUI"
    threat_level: ThreatLevel
    confidence_score: Optional[float] = None
    created_at: datetime
    listed_at: Optional[datetime] = None
    creator: UserResponse
    owner: UserResponse
    fraud_flags: List[FraudFlagResponse] = []
    has_active_flags: bool = False
    
    class Config:
        from_attributes = True

class NFTDetailResponse(NFTResponse):
    metadata_url: Optional[str] = None
    listing_status: ListingStatus
    is_listed: bool
    trades: List[dict] = []  # We'll expand this later if needed

class MarketplaceFilters(BaseModel):
    search: Optional[str] = None
    threat_level: Optional[ThreatLevel] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    creator_verified: Optional[bool] = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)

class MarketplaceResponse(BaseModel):
    nfts: List[NFTResponse]
    total: int
    page: int
    limit: int
    total_pages: int
    
class MarketplaceStats(BaseModel):
    total_nfts: int
    active_listings: int
    verified_nfts: int
    flagged_nfts: int
    total_volume_sui: float
