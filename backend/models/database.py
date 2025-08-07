"""
Database models for FraudGuard
Central location for all SQLAlchemy model definitions
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey, Float, Numeric
from sqlalchemy.types import DECIMAL
from sqlalchemy.dialects.postgresql import UUID, JSON, JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session

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
    username = Column(Text, nullable=True)
    bio = Column(Text, nullable=True)
    email = Column(Text, nullable=True)
    reputation_score = Column(Numeric, default=0.00)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class NFT(Base):
    __tablename__ = "nfts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sui_object_id = Column(Text, unique=True, nullable=True)  # Changed to nullable=True - set after minting
    creator_wallet_address = Column(Text, nullable=False)
    owner_wallet_address = Column(Text, nullable=False)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(Text, nullable=False)
    metadata_url = Column(Text, nullable=True)
    attributes = Column(JSONB, nullable=True)
    category = Column(Text, nullable=True)
    initial_price = Column(Numeric, nullable=True)
    is_listed = Column(Boolean, default=False, nullable=False)
    embedding_vector = Column(Vector(768), nullable=True)  # pgvector vector type for embeddings
    analysis_details = Column(JSONB, nullable=True)  # JSONB type for analysis details
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    @classmethod
    def find_similar_nfts(cls, db: Session, target_embedding, similarity_threshold: float = 0.8, limit_count: int = 10):
        """
        Find NFTs similar to the given embedding vector using the Supabase function.
        
        Args:
            db: Database session
            target_embedding: Vector embedding to compare against
            similarity_threshold: Minimum similarity score (0-1, default 0.8)
            limit_count: Maximum number of results (default 10)
            
        Returns:
            List of tuples: (nft_id, title, similarity_score)
        """
        query = f"""
        SELECT * FROM find_similar_nfts(
            '{target_embedding}'::vector,
            {similarity_threshold},
            {limit_count}
        )
        """
        result = db.execute(query)
        return result.fetchall()
    
    @classmethod
    def find_similar_by_nft_id(cls, db: Session, nft_id: str, similarity_threshold: float = 0.8, limit_count: int = 10):
        """
        Find NFTs similar to a specific NFT by its ID.
        
        Args:
            db: Database session
            nft_id: UUID of the NFT to find similar ones for
            similarity_threshold: Minimum similarity score (0-1, default 0.8)
            limit_count: Maximum number of results (default 10)
            
        Returns:
            List of tuples: (nft_id, title, similarity_score)
        """
        # First get the embedding of the target NFT
        target_nft = db.query(cls).filter(cls.id == nft_id).first()
        if not target_nft or not target_nft.embedding_vector:
            return []
        
        return cls.find_similar_nfts(db, target_nft.embedding_vector, similarity_threshold, limit_count)

class Listing(Base):
    __tablename__ = "listings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nft_id = Column(UUID(as_uuid=True), ForeignKey("nfts.id"), nullable=True)
    seller_wallet_address = Column(Text, nullable=False)
    price = Column(Numeric, nullable=False)
    status = Column(Text, default="active")
    listing_metadata = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

class TransactionHistory(Base):
    __tablename__ = "transaction_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nft_id = Column(UUID(as_uuid=True), ForeignKey("nfts.id"), nullable=True)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("listings.id"), nullable=True)
    seller_wallet_address = Column(Text, nullable=False)
    buyer_wallet_address = Column(Text, nullable=False)
    price = Column(Numeric, nullable=False)
    transaction_type = Column(Text, nullable=False)  # 'mint', 'purchase', 'listing', 'unlisting', 'edit_listing'
    blockchain_tx_id = Column(Text, nullable=True)
    gas_fee = Column(Numeric, nullable=True)
    status = Column(Text, default="completed")
    created_at = Column(DateTime, default=datetime.utcnow)

class UserReputationEvent(Base):
    __tablename__ = "user_reputation_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    event_type = Column(Text, nullable=False)  # 'fraud_detected', 'successful_sale', 'fraud_report', 'positive_review'
    nft_id = Column(UUID(as_uuid=True), ForeignKey("nfts.id"), nullable=True)
    points_change = Column(Integer, nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
