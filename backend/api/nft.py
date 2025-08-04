"""
NFT API endpoints for FraudGuard
Handles NFT creation, fraud detection, and basic operations following the 8-step workflow
"""
import uuid
import math
import json
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey, DECIMAL
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel
import asyncio
import httpx
import logging

# Import pgvector for storing embeddings
try:
    import pgvector.sqlalchemy
    from pgvector.sqlalchemy import Vector
except ImportError:
    # Fallback if pgvector is not installed
    print("Warning: pgvector is not installed. Vector functionality will be limited.")
    Vector = Text

# Configure logging
logger = logging.getLogger(__name__)

Base = declarative_base()

# Import AI services
try:
    from agent.fraud_detector import analyze_nft_for_fraud, NFTData
    from agent.supabase_client import supabase_client
    from agent.clip_embeddings import get_embedding_service
except ImportError:
    try:
        from backend.agent.fraud_detector import analyze_nft_for_fraud, NFTData
        from backend.agent.supabase_client import supabase_client
        from backend.agent.clip_embeddings import get_embedding_service
    except ImportError:
        logger.warning("Could not import AI services - running in mock mode")
        def analyze_nft_for_fraud(nft_data):
            return {
                "is_fraud": False,
                "confidence_score": 0.15,
                "flag_type": None,
                "reason": None,
                "analysis_details": {}
            }
        supabase_client = None
        def get_embedding_service():
            return None

# Database Models (matching your schema)
class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_address = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    username = Column(String, nullable=False)
    avatar_url = Column(String)
    bio = Column(Text)
    reputation_score = Column(DECIMAL(5, 2), default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

class NFT(Base):
    __tablename__ = "nfts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    wallet_address = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    category = Column(String, nullable=False)
    price = Column(DECIMAL(18, 8), nullable=False)
    image_url = Column(String, nullable=False)
    sui_object_id = Column(String, unique=True)
    is_fraud = Column(Boolean, default=False)
    confidence_score = Column(DECIMAL(5, 2), default=0.0)
    flag_type = Column(Integer)
    reason = Column(Text)
    evidence_url = Column(Text)
    analysis_details = Column(JSON)  # Use JSON type instead of Text for proper JSON storage
    embedding_vector = Column(Vector(768))  # imgbeddings generates 768-dimensional embeddings
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

# Request/Response Models
class NFTCreationRequest(BaseModel):
    title: str
    description: str
    category: str
    price: float
    image_url: str
    wallet_address: str

class NFTResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    category: str
    price: float
    image_url: str
    wallet_address: str
    sui_object_id: Optional[str]
    is_fraud: bool
    confidence_score: float
    status: str
    created_at: datetime

# Import database connection
try:
    from database.connection import get_db
except ImportError:
    try:
        from backend.database.connection import get_db
    except ImportError:
        # Fallback for development
        def get_db():
            from sqlalchemy import create_engine
            from sqlalchemy.orm import sessionmaker
            import os
            
            DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost/fraudguard")
            engine = create_engine(DATABASE_URL)
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            db = SessionLocal()
            try:
                yield db
            finally:
                db.close()

router = APIRouter(prefix="/api/nft", tags=["nft"])

@router.post("/create")
async def create_nft(
    request: NFTCreationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Create a new NFT following the 8-step workflow:
    1. User Inputs (handled by frontend)
    2. Upload Image to Walrus (handled by /api/upload-walrus endpoint)
    3. AI Fraud Detection (this function)
    4. Supabase: Store Metadata & Embedding (this function)
    5. Mint NFT on Sui (handled by frontend + confirm-mint endpoint)
    6. List NFT for Sale (handled by frontend)
    7. Buyer Purchases NFT (handled by frontend)
    8. Sync Supabase with Chain (handled by webhook/indexer)
    """
    try:
        # Check if user exists, create if not
        user = db.query(User).filter(User.wallet_address == request.wallet_address).first()
        if not user:
            # Create a default user profile
            user = User(
                wallet_address=request.wallet_address,
                email=f"{request.wallet_address[:8]}@temp.com",
                username=f"User{request.wallet_address[:8]}",
                reputation_score=50.0
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Step 3: AI Fraud Detection
        logger.info(f"Running fraud analysis for NFT: {request.title}")
        
        nft_data = NFTData(
            title=request.title,
            description=request.description or "",
            image_url=request.image_url,
            category=request.category,
            price=request.price
        )
        
        # Run fraud analysis (synchronous for immediate results)
        fraud_result = analyze_nft_for_fraud(nft_data)
        
        # Generate image embedding for similarity search
        logger.info(f"Generating image embedding for image: {request.image_url}")
        embedding_service = get_embedding_service()
        image_embedding = None
        
        if embedding_service:
            # First, generate the embedding for local storage
            image_embedding = embedding_service.get_image_embedding(request.image_url)
            
            if image_embedding:
                logger.info(f"Successfully generated image embedding with dimension: {len(image_embedding)}")
            else:
                logger.warning("Failed to generate image embedding, using None")
        else:
            logger.warning("Image embedding service not available, storing without embedding")
        
        # Step 4: Supabase: Store Metadata & Embedding
        nft = NFT(
            owner_id=user.id,
            wallet_address=request.wallet_address,
            title=request.title,
            description=request.description,
            category=request.category,
            price=request.price,
            image_url=request.image_url,
            is_fraud=fraud_result.get("is_fraud", False),
            confidence_score=fraud_result.get("confidence_score", 0.0),
            flag_type=fraud_result.get("flag_type"),
            reason=fraud_result.get("reason"),
            analysis_details=fraud_result.get("analysis_details", {}),  # Store as JSON object
            embedding_vector=image_embedding,  # Store CLIP embedding as vector
            status="analyzed"  # Ready for minting
        )
        
        db.add(nft)
        db.commit()
        db.refresh(nft)

        # Store the embedding in Supabase for vector search
        if embedding_service and image_embedding and supabase_client:
            metadata = {
                "name": request.title,
                "creator": request.wallet_address,
                "image_url": request.image_url,
                "nft_id": str(nft.id)
            }
            
            # Store the embedding in Supabase using the actual NFT ID
            background_tasks.add_task(
                embedding_service.get_image_embedding_and_store,
                request.image_url, 
                str(nft.id), 
                metadata
            )
            logger.info(f"Scheduled embedding storage in Supabase for NFT {nft.id}")

        # Log successful creation
        logger.info(f"NFT created successfully: {nft.id}")

        return {
            "success": True,
            "message": "NFT created and analyzed successfully",
            "nft_id": str(nft.id),
            "fraud_analysis": {
                "is_fraud": fraud_result.get("is_fraud", False),
                "confidence_score": fraud_result.get("confidence_score", 0.0),
                "flag_type": fraud_result.get("flag_type"),
                "reason": fraud_result.get("reason")
            },
            "status": "analyzed"
        }

    except Exception as e:
        logger.error(f"Error creating NFT: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating NFT: {str(e)}")

@router.put("/{nft_id}/confirm-mint")
async def confirm_nft_mint(
    nft_id: str,
    sui_object_id: str,
    db: Session = Depends(get_db)
):
    """
    Confirm NFT has been minted on blockchain
    """
    try:
        nft = db.query(NFT).filter(NFT.id == nft_id).first()
        if not nft:
            raise HTTPException(status_code=404, detail="NFT not found")
        
        nft.sui_object_id = sui_object_id
        nft.status = "minted"
        db.commit()

        return {
            "success": True,
            "message": "NFT mint confirmed",
            "nft_id": nft_id,
            "sui_object_id": sui_object_id
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error confirming mint: {str(e)}")

@router.get("/marketplace")
async def get_marketplace_nfts(
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Get all NFTs for marketplace display
    """
    try:
        offset = (page - 1) * limit
        
        nfts = db.query(NFT).filter(
            NFT.status == "minted"
        ).offset(offset).limit(limit).all()
        
        total = db.query(NFT).filter(NFT.status == "minted").count()
        
        nft_list = []
        for nft in nfts:
            nft_list.append(NFTResponse(
                id=str(nft.id),
                title=nft.title,
                description=nft.description,
                category=nft.category,
                price=float(nft.price),
                image_url=nft.image_url,
                wallet_address=nft.wallet_address,
                sui_object_id=nft.sui_object_id,
                is_fraud=nft.is_fraud,
                confidence_score=float(nft.confidence_score or 0.0),
                status=nft.status,
                created_at=nft.created_at
            ))
        
        return {
            "nfts": nft_list,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": math.ceil(total / limit) if total > 0 else 0
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching marketplace NFTs: {str(e)}")

@router.get("/{nft_id}")
async def get_nft_details(
    nft_id: str,
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific NFT
    """
    try:
        nft = db.query(NFT).filter(NFT.id == nft_id).first()
        if not nft:
            raise HTTPException(status_code=404, detail="NFT not found")
        
        user = db.query(User).filter(User.id == nft.owner_id).first()
        
        return {
            "nft": NFTResponse(
                id=str(nft.id),
                title=nft.title,
                description=nft.description,
                category=nft.category,
                price=float(nft.price),
                image_url=nft.image_url,
                wallet_address=nft.wallet_address,
                sui_object_id=nft.sui_object_id,
                is_fraud=nft.is_fraud,
                confidence_score=float(nft.confidence_score or 0.0),
                status=nft.status,
                created_at=nft.created_at
            ),
            "owner": {
                "wallet_address": user.wallet_address if user else nft.wallet_address,
                "username": user.username if user else f"User{nft.wallet_address[:8]}",
                "reputation_score": float(user.reputation_score) if user else 50.0
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching NFT details: {str(e)}")


# New model for frontend notifications
class NFTMintedNotification(BaseModel):
    nft_id: str
    sui_object_id: str
    name: str
    description: str
    image_url: str
    creator: str
    transaction_digest: str


@router.post("/notify-minted")
async def notify_nft_minted(
    notification: NFTMintedNotification,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Frontend notifies backend when an NFT is minted on Sui
    This triggers additional fraud analysis and updates the database
    """
    try:
        logger.info(f"Received minted NFT notification: {notification.nft_id}")
        
        # Check if this is an existing NFT in our database
        existing_nft = db.query(NFT).filter(NFT.id == notification.nft_id).first()
        
        if existing_nft:
            # Update existing NFT with Sui object ID
            existing_nft.sui_object_id = notification.sui_object_id
            existing_nft.status = "minted"
            db.commit()
            logger.info(f"Updated existing NFT {notification.nft_id} with Sui object ID")
        else:
            # This is a new NFT minted directly on chain, analyze it
            logger.info(f"New NFT minted on chain: {notification.sui_object_id}")
            
            # Run fraud analysis in background
            background_tasks.add_task(
                analyze_external_nft, 
                notification, 
                db
            )
        
        return {
            "success": True,
            "message": "NFT minting notification received",
            "sui_object_id": notification.sui_object_id,
            "status": "processing"
        }
        
    except Exception as e:
        logger.error(f"Error processing minted NFT notification: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing notification: {str(e)}")


async def analyze_external_nft(notification: NFTMintedNotification, db: Session):
    """Analyze NFT that was minted directly on chain (not through our frontend)"""
    try:
        # Create user if not exists
        user = db.query(User).filter(User.wallet_address == notification.creator).first()
        if not user:
            user = User(
                wallet_address=notification.creator,
                email=f"{notification.creator[:8]}@external.com",
                username=f"External{notification.creator[:8]}",
                reputation_score=50.0
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Run fraud analysis
        nft_data = NFTData(
            title=notification.name,
            description=notification.description,
            image_url=notification.image_url,
            category="Unknown",  # External NFTs don't have category
            price=0.0  # External NFTs don't have price set by us
        )
        
        fraud_result = analyze_nft_for_fraud(nft_data)
        
        # Generate image embedding
        logger.info(f"Generating image embedding for external NFT: {notification.image_url}")
        embedding_service = get_embedding_service()
        image_embedding = None
        
        if embedding_service:
            image_embedding = embedding_service.get_image_embedding(notification.image_url)
            if image_embedding:
                logger.info(f"Successfully generated image embedding for external NFT")
            else:
                logger.warning("Failed to generate CLIP embedding for external NFT")
        
        # Create NFT record
        nft = NFT(
            owner_id=user.id,
            wallet_address=notification.creator,
            title=notification.name,
            description=notification.description,
            category="External",
            price=0.0,
            image_url=notification.image_url,
            sui_object_id=notification.sui_object_id,
            is_fraud=fraud_result.get("is_fraud", False),
            confidence_score=fraud_result.get("confidence_score", 0.0),
            flag_type=fraud_result.get("flag_type"),
            reason=fraud_result.get("reason"),
            analysis_details=fraud_result.get("analysis_details", {}),
            embedding_vector=image_embedding,  # Store CLIP embedding
            status="minted"
        )
        
        db.add(nft)
        db.commit()
        
        logger.info(f"Analyzed external NFT: {notification.sui_object_id}, fraud: {fraud_result.get('is_fraud')}")
        
    except Exception as e:
        logger.error(f"Error analyzing external NFT: {str(e)}")
        db.rollback()


@router.post("/search-similar")
async def search_similar_nfts(
    image_url: str,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Search for similar NFTs based on image embeddings using CLIP
    """
    try:
        # Generate embedding for query image
        embedding_service = get_embedding_service()
        if not embedding_service:
            raise HTTPException(status_code=500, detail="Image embedding service not available")
        
        query_embedding = embedding_service.get_image_embedding(image_url)
        if not query_embedding:
            raise HTTPException(status_code=400, detail="Failed to generate embedding for query image")
        
        # Use Supabase to find similar images directly
        similar_results = await embedding_service.find_similar_images(
            query_embedding,
            threshold=0.7,
            limit=limit
        )
        
        # Get NFT details for similar results
        similar_nfts = []
        for nft_id, similarity_score in similar_results:
            nft = db.query(NFT).filter(NFT.id == nft_id).first()
            if nft:
                user = db.query(User).filter(User.id == nft.owner_id).first()
                similar_nfts.append({
                    "nft": NFTResponse(
                        id=str(nft.id),
                        title=nft.title,
                        description=nft.description,
                        category=nft.category,
                        price=float(nft.price),
                        image_url=nft.image_url,
                        wallet_address=nft.wallet_address,
                        sui_object_id=nft.sui_object_id,
                        is_fraud=nft.is_fraud,
                        confidence_score=float(nft.confidence_score or 0.0),
                        status=nft.status,
                        created_at=nft.created_at
                    ),
                    "similarity_score": round(similarity_score, 4),
                    "owner": {
                        "wallet_address": user.wallet_address if user else nft.wallet_address,
                        "username": user.username if user else f"User{nft.wallet_address[:8]}",
                        "reputation_score": float(user.reputation_score) if user else 50.0
                    }
                })
        
        return {
            "similar_nfts": similar_nfts,
            "total": len(similar_nfts),
            "query_image_url": image_url
        }
        
    except Exception as e:
        logger.error(f"Error in similarity search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error searching similar NFTs: {str(e)}")


@router.get("/analyze-duplicates/{nft_id}")
async def analyze_potential_duplicates(
    nft_id: str,
    threshold: float = 0.85,  # High similarity threshold for potential duplicates
    db: Session = Depends(get_db)
):
    """
    Analyze if an NFT has potential duplicates based on image similarity
    """
    try:
        # Get the target NFT
        target_nft = db.query(NFT).filter(NFT.id == nft_id).first()
        if not target_nft:
            raise HTTPException(status_code=404, detail="NFT not found")
        
        if not target_nft.embedding_vector:
            raise HTTPException(status_code=400, detail="NFT does not have image embedding")
        
        # Find similar NFTs
        embedding_service = get_embedding_service()
        if not embedding_service:
            raise HTTPException(status_code=500, detail="Image embedding service not available")
        
        # Use Supabase to find similar images directly
        similar_results = await embedding_service.find_similar_images(
            target_nft.embedding_vector,
            threshold=threshold,
            limit=20  # Check more results for duplicate analysis
        )
        
        # Process results
        potential_duplicates = []
        for result in similar_results:
            similar_nft = db.query(NFT).filter(NFT.id == result["nft_id"]).first()
            if similar_nft:
                potential_duplicates.append({
                    "nft_id": str(similar_nft.id),
                    "title": similar_nft.title,
                    "image_url": similar_nft.image_url,
                    "owner": similar_nft.wallet_address,
                    "similarity_score": round(result["similarity"], 4),
                    "created_at": similar_nft.created_at
                })
        
        return {
            "target_nft_id": nft_id,
            "target_nft_title": target_nft.title,
            "potential_duplicates": potential_duplicates,
            "total_duplicates": len(potential_duplicates),
            "similarity_threshold": threshold
        }
        
    except Exception as e:
        logger.error(f"Error analyzing duplicates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing duplicates: {str(e)}")
