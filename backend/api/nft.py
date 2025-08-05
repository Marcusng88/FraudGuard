"""
NFT API endpoints for FraudGuard
Handles NFT creation, fraud detection, and basic operations following the 8-step workflow
"""
import uuid
import math
import json
import os
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey, DECIMAL, text
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
        logger.warning("Could not import AI services - analysis will not be available")
        def analyze_nft_for_fraud(nft_data):
            return {
                "is_fraud": False,
                "confidence_score": 0.0,
                "flag_type": None,
                "reason": "AI services not available",
                "analysis_details": {
                    "error": "AI services not available",
                    "analysis_timestamp": datetime.now().isoformat()
                }
            }
        supabase_client = None
        def get_embedding_service():
            return None

# Import database models
try:
    from models.database import User, NFT, Base
except ImportError:
    try:
        from backend.models.database import User, NFT, Base
    except ImportError:
        # Fallback models if import fails
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
            evidence_url = Column(Text)  # Store as JSON string for evidence URLs
            analysis_details = Column(JSON)  # Use JSON type instead of Text for proper JSON storage
            embedding_vector = Column(Vector(768))  # Gemini description embeddings are 768-dimensional
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
    analysis_details: Optional[Dict[str, Any]] = None  # Add analysis_details field

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
        
        # Run fraud analysis (async call) with better error handling
        try:
            fraud_result = await analyze_nft_for_fraud(nft_data)
            logger.info(f"Fraud analysis completed: is_fraud={fraud_result.get('is_fraud')}, confidence={fraud_result.get('confidence_score')}")
        except Exception as fraud_error:
            logger.error(f"Fraud analysis failed: {fraud_error}")
            # Use safe defaults if fraud analysis fails
            fraud_result = {
                "is_fraud": False,
                "confidence_score": 0.1,
                "flag_type": None,
                "reason": f"Fraud analysis error: {str(fraud_error)}",
                "analysis_details": {"error": str(fraud_error)}
            }
        
        # Generate image embedding for similarity search using Gemini description analysis
        logger.info(f"Generating description-based embedding for image: {request.image_url}")
        embedding_service = get_embedding_service()
        image_embedding = None
        
        if embedding_service:
            try:
                # Use Gemini to analyze image and generate description, then embed the description
                image_embedding = await embedding_service.get_image_embedding(request.image_url)
                
                if image_embedding:
                    logger.info(f"Successfully generated description-based embedding with dimension: {len(image_embedding)}")
                else:
                    logger.warning("Failed to generate description-based embedding, using None")
            except Exception as embed_error:
                logger.error(f"Error generating embedding: {embed_error}")
                image_embedding = None
        else:
            logger.warning("Description embedding service not available, storing without embedding")
        
        # Step 4: Supabase: Store Metadata & Embedding
        # Ensure fraud_result has required fields
        if not isinstance(fraud_result, dict):
            fraud_result = {
                "is_fraud": False,
                "confidence_score": 0.1,
                "flag_type": None,
                "reason": "Invalid fraud analysis result",
                "analysis_details": {}
            }
        
        # Validate and sanitize fraud result fields
        is_fraud = bool(fraud_result.get("is_fraud", False))
        confidence_score = float(fraud_result.get("confidence_score", 0.0))
        flag_type = fraud_result.get("flag_type")
        reason = str(fraud_result.get("reason", "Analysis completed"))
        analysis_details = fraud_result.get("analysis_details", {})
        
        # Ensure analysis_details is a dict
        if not isinstance(analysis_details, dict):
            analysis_details = {"raw_result": str(analysis_details)}
        
        # Extract evidence URLs from similarity results for storage in evidence_url field
        evidence_urls = []
        if analysis_details.get("similarity_results") and analysis_details["similarity_results"].get("evidence_urls"):
            evidence_urls = analysis_details["similarity_results"]["evidence_urls"]
        
        # Store evidence URLs as JSON array in evidence_url field
        evidence_url_json = json.dumps(evidence_urls) if evidence_urls else None
        
        # Create NFT with status "pending" initially
        nft = NFT(
            owner_id=user.id,
            wallet_address=request.wallet_address,
            title=request.title,
            description=request.description,
            category=request.category,
            price=request.price,
            image_url=request.image_url,
            is_fraud=is_fraud,
            confidence_score=confidence_score,
            flag_type=flag_type,
            reason=reason,
            evidence_url=evidence_url_json,  # Store evidence URLs as JSON array
            analysis_details=analysis_details,  # Store as JSON object
            embedding_vector=image_embedding,  # Store description-based embedding as vector
            status="pending"  # Start with pending status
        )
        
        logger.info(f"About to add NFT to database: {nft.title}")
        db.add(nft)
        
        logger.info(f"About to commit NFT to database: {nft.title}")
        try:
            db.commit()
            logger.info(f"Successfully committed NFT to database: {nft.title}")
        except Exception as commit_error:
            logger.error(f"Failed to commit NFT to database: {commit_error}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database commit failed: {str(commit_error)}")
        
        logger.info(f"About to refresh NFT from database: {nft.title}")
        try:
            db.refresh(nft)
            logger.info(f"Successfully refreshed NFT from database: {nft.title}")
        except Exception as refresh_error:
            logger.error(f"Failed to refresh NFT from database: {refresh_error}")
            # Don't fail the request if refresh fails, but log the issue
            logger.warning(f"Continuing without refresh - NFT ID: {nft.id}")
        
        # Verify the NFT was actually committed by querying it back
        try:
            verification_nft = db.query(NFT).filter(NFT.id == nft.id).first()
            if verification_nft:
                logger.info(f"Verified NFT exists in database: {verification_nft.id} with status: {verification_nft.status}")
            else:
                logger.error(f"CRITICAL: NFT not found in database after commit! ID: {nft.id}")
        except Exception as verify_error:
            logger.error(f"Failed to verify NFT in database: {verify_error}")
        
        # Check database session status
        try:
            # Check if session is still active
            from sqlalchemy import text
            db.execute(text("SELECT 1"))
            logger.info("Database session is still active")
        except Exception as session_error:
            logger.error(f"Database session error: {session_error}")

        # Log successful creation before any background tasks
        logger.info(f"NFT created successfully: {nft.id} with status: {nft.status}")
        
        # Prepare response data
        response_data = {
            "success": True,
            "message": "NFT created and analyzed successfully",
            "nft_id": str(nft.id),
            "fraud_analysis": {
                "is_fraud": is_fraud,
                "confidence_score": confidence_score,
                "flag_type": flag_type,
                "reason": reason
            },
            "status": "pending",  # Return current status
            "next_step": "mint_on_blockchain"  # Guide frontend on next step
        }
        
        # Schedule background task for Supabase embedding storage (optional)
        if embedding_service and image_embedding and supabase_client:
            metadata = {
                "name": request.title,
                "creator": request.wallet_address,
                "image_url": request.image_url,
                "nft_id": str(nft.id)
            }
            
            try:
                # Schedule the background task without blocking the response
                background_tasks.add_task(
                    embedding_service.get_image_embedding_and_store,
                    request.image_url, 
                    str(nft.id), 
                    metadata
                )
                logger.info(f"Scheduled embedding storage in Supabase for NFT {nft.id}")
            except Exception as bg_error:
                logger.warning(f"Failed to schedule background task: {bg_error}")
                # Don't fail the request if background task scheduling fails

        return response_data

    except Exception as e:
        logger.error(f"Error creating NFT: {str(e)}")
        try:
            db.rollback()
        except:
            pass  # Ignore rollback errors
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
        # Validate input
        if not nft_id or not sui_object_id:
            raise HTTPException(status_code=400, detail="nft_id and sui_object_id are required")
        
        # Find the NFT
        nft = db.query(NFT).filter(NFT.id == nft_id).first()
        if not nft:
            raise HTTPException(status_code=404, detail=f"NFT not found with ID: {nft_id}")
        
        logger.info(f"Confirming mint for NFT {nft_id} with Sui object ID: {sui_object_id}")
        
        # Check current status
        if nft.status == "minted":
            logger.info(f"NFT {nft_id} already minted, returning existing data")
            return {
                "success": True,
                "message": "NFT already minted",
                "nft_id": nft_id,
                "sui_object_id": nft.sui_object_id,
                "status": "minted"
            }
        
        # Update NFT with Sui object ID and change status to minted
        try:
            nft.sui_object_id = sui_object_id
            nft.status = "minted"
            db.commit()
            db.refresh(nft)
            
            logger.info(f"NFT mint confirmed successfully: {nft_id} -> {sui_object_id}")

            return {
                "success": True,
                "message": "NFT mint confirmed",
                "nft_id": nft_id,
                "sui_object_id": sui_object_id,
                "status": "minted",
                "fraud_analysis": {
                    "is_fraud": nft.is_fraud,
                    "confidence_score": float(nft.confidence_score or 0.0),
                    "flag_type": nft.flag_type,
                    "reason": nft.reason
                }
            }
            
        except Exception as commit_error:
            logger.error(f"Database commit error: {commit_error}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {str(commit_error)}")

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error confirming mint for {nft_id}: {str(e)}")
        try:
            db.rollback()
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Error confirming mint: {str(e)}")


@router.get("/by-wallet/{wallet_address}")
async def get_nfts_by_wallet(
    wallet_address: str,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Get all NFTs owned by a specific wallet address
    """
    try:
        offset = (page - 1) * limit
        
        nfts = db.query(NFT).filter(
            NFT.wallet_address == wallet_address
        ).order_by(NFT.created_at.desc()).offset(offset).limit(limit).all()
        
        total = db.query(NFT).filter(NFT.wallet_address == wallet_address).count()
        
        nft_list = []
        for nft in nfts:
            nft_list.append({
                "id": str(nft.id),
                "title": nft.title,
                "description": nft.description,
                "category": nft.category,
                "price": float(nft.price),
                "image_url": nft.image_url,
                "wallet_address": nft.wallet_address,
                "sui_object_id": nft.sui_object_id,
                "is_fraud": nft.is_fraud,
                "confidence_score": float(nft.confidence_score or 0.0),
                "flag_type": nft.flag_type,
                "reason": nft.reason,
                "status": nft.status,
                "created_at": nft.created_at,
                "analysis_details": nft.analysis_details
            })
        
        return {
            "wallet_address": wallet_address,
            "nfts": nft_list,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": math.ceil(total / limit) if total > 0 else 0
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching NFTs for wallet: {str(e)}")


@router.get("/marketplace")
async def get_marketplace_nfts(
    page: int = 1,
    limit: int = 20,
    include_flagged: bool = False,
    include_pending: bool = False,
    db: Session = Depends(get_db)
):
    """
    Get all NFTs for marketplace display
    """
    try:
        offset = (page - 1) * limit
        
        # Base query - include both minted and optionally pending NFTs
        if include_pending:
            # Include both pending and minted NFTs
            query = db.query(NFT).filter(NFT.status.in_(["minted", "pending"]))
        else:
            # Only minted NFTs (default behavior)
            query = db.query(NFT).filter(NFT.status == "minted")
        
        # Optionally exclude fraud-flagged NFTs from marketplace
        if not include_flagged:
            query = query.filter(NFT.is_fraud == False)
        
        nfts = query.order_by(NFT.created_at.desc()).offset(offset).limit(limit).all()
        total = query.count()
        
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
                created_at=nft.created_at,
                analysis_details=nft.analysis_details
            ))
        
        return {
            "nfts": nft_list,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": math.ceil(total / limit) if total > 0 else 0,
            "include_flagged": include_flagged,
            "include_pending": include_pending,
            "status_filter": "minted" if not include_pending else "minted,pending"
        }

    except Exception as e:
        logger.error(f"Error fetching marketplace NFTs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching marketplace NFTs: {str(e)}")


@router.get("/all")
async def get_all_nfts(
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get all NFTs (for debugging and admin purposes)
    """
    try:
        offset = (page - 1) * limit
        
        query = db.query(NFT)
        if status:
            query = query.filter(NFT.status == status)
        
        nfts = query.order_by(NFT.created_at.desc()).offset(offset).limit(limit).all()
        total = query.count()
        
        nft_list = []
        for nft in nfts:
            nft_list.append({
                "id": str(nft.id),
                "title": nft.title,
                "description": nft.description,
                "category": nft.category,
                "price": float(nft.price),
                "image_url": nft.image_url,
                "wallet_address": nft.wallet_address,
                "sui_object_id": nft.sui_object_id,
                "is_fraud": nft.is_fraud,
                "confidence_score": float(nft.confidence_score or 0.0),
                "flag_type": nft.flag_type,
                "reason": nft.reason,
                "status": nft.status,
                "created_at": nft.created_at
            })
        
        return {
            "nfts": nft_list,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": math.ceil(total / limit) if total > 0 else 0,
            "filter_status": status
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching all NFTs: {str(e)}")

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
                created_at=nft.created_at,
                analysis_details=None  # Don't include full analysis details in main response
            ),
            "owner": {
                "wallet_address": user.wallet_address if user else nft.wallet_address,
                "username": user.username if user else f"User{nft.wallet_address[:8]}",
                "reputation_score": float(user.reputation_score) if user else 50.0
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching NFT details: {str(e)}")

@router.get("/{nft_id}/analysis")
async def get_nft_analysis_details(
    nft_id: str,
    db: Session = Depends(get_db)
):
    """
    Get detailed analysis information for a specific NFT
    This endpoint returns the full analysis details without embedding vectors
    """
    try:
        # Validate UUID format
        try:
            import uuid
            uuid.UUID(nft_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid NFT ID format")
        
        nft = db.query(NFT).filter(NFT.id == nft_id).first()
        if not nft:
            logger.warning(f"NFT not found with ID: {nft_id}")
            return {
                "nft_id": nft_id,
                "analysis_details": {},
                "is_fraud": False,
                "confidence_score": 0.0,
                "flag_type": None,
                "reason": "NFT not found",
                "status": "not_found",
                "analyzed_at": None,
                "message": "NFT not found"
            }
        
        # Return only the analysis details, not the full NFT object
        analysis_details = nft.analysis_details or {}
        
        # Ensure we don't include embedding vectors in the analysis details
        if isinstance(analysis_details, dict):
            # Remove any embedding-related fields if they exist
            analysis_details.pop('embedding_vector', None)
            analysis_details.pop('embedding', None)
            analysis_details.pop('vector', None)
        
        return {
            "nft_id": str(nft.id),
            "analysis_details": analysis_details,
            "is_fraud": nft.is_fraud,
            "confidence_score": float(nft.confidence_score or 0.0),
            "flag_type": nft.flag_type,
            "reason": nft.reason,
            "status": nft.status,
            "analyzed_at": nft.created_at.isoformat() if nft.created_at else None
        }

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error fetching NFT analysis details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching NFT analysis details: {str(e)}")


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
        
        fraud_result = await analyze_nft_for_fraud(nft_data)
        
        # Generate image embedding using Gemini description analysis
        logger.info(f"Generating description-based embedding for external NFT: {notification.image_url}")
        embedding_service = get_embedding_service()
        image_embedding = None
        
        if embedding_service:
            image_embedding = await embedding_service.get_image_embedding(notification.image_url)
            if image_embedding:
                logger.info(f"Successfully generated description-based embedding for external NFT")
            else:
                logger.warning("Failed to generate description-based embedding for external NFT")
        
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
            embedding_vector=image_embedding,  # Store description-based embedding
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
    Search for similar NFTs based on description embeddings using Gemini analysis
    """
    try:
        # Generate embedding for query image
        embedding_service = get_embedding_service()
        if not embedding_service:
            raise HTTPException(status_code=500, detail="Image embedding service not available")
        
        query_embedding = await embedding_service.get_image_embedding(image_url)
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
        
        if target_nft.embedding_vector is None or len(target_nft.embedding_vector) == 0:
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

@router.get("/status/{nft_id}")
async def get_nft_status(
    nft_id: str,
    db: Session = Depends(get_db)
):
    """
    Get detailed status information for an NFT (for debugging)
    """
    try:
        nft = db.query(NFT).filter(NFT.id == nft_id).first()
        if not nft:
            raise HTTPException(status_code=404, detail="NFT not found")
        
        user = db.query(User).filter(User.id == nft.owner_id).first()
        
        return {
            "nft_id": str(nft.id),
            "title": nft.title,
            "status": nft.status,
            "sui_object_id": nft.sui_object_id,
            "is_fraud": nft.is_fraud,
            "confidence_score": float(nft.confidence_score or 0.0),
            "flag_type": nft.flag_type,
            "reason": nft.reason,
            "created_at": nft.created_at,
            "owner": {
                "wallet_address": user.wallet_address if user else nft.wallet_address,
                "username": user.username if user else f"User{nft.wallet_address[:8]}"
            },
            "fraud_analysis": {
                "is_fraud": nft.is_fraud,
                "confidence_score": float(nft.confidence_score or 0.0),
                "flag_type": nft.flag_type,
                "reason": nft.reason,
                "has_embedding": nft.embedding_vector is not None
            },
            "next_steps": {
                "pending": "Mint on blockchain",
                "minted": "List for sale",
                "listed": "Ready for purchase"
            }.get(nft.status, "Unknown status")
        }
        
    except Exception as e:
        logger.error(f"Error getting NFT status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting NFT status: {str(e)}")

@router.get("/debug/status-summary")
async def get_status_summary(db: Session = Depends(get_db)):
    """
    Debug endpoint to get status summary of all NFTs
    """
    try:
        nfts = db.query(NFT).all()
        
        status_counts = {}
        sui_object_id_counts = {}
        embedding_counts = {}
        
        for nft in nfts:
            status = nft.status or "unknown"
            status_counts[status] = status_counts.get(status, 0) + 1
            
            if nft.sui_object_id:
                sui_object_id_counts["with_sui_id"] = sui_object_id_counts.get("with_sui_id", 0) + 1
            else:
                sui_object_id_counts["without_sui_id"] = sui_object_id_counts.get("without_sui_id", 0) + 1
            
            if nft.embedding_vector is not None and len(nft.embedding_vector) > 0:
                embedding_counts["with_embedding"] = embedding_counts.get("with_embedding", 0) + 1
            else:
                embedding_counts["without_embedding"] = embedding_counts.get("without_embedding", 0) + 1
        
        return {
            "total_nfts": len(nfts),
            "status_counts": status_counts,
            "sui_object_id_counts": sui_object_id_counts,
            "embedding_counts": embedding_counts,
            "recent_nfts": [
                {
                    "id": str(nft.id),
                    "title": nft.title,
                    "status": nft.status,
                    "sui_object_id": nft.sui_object_id,
                    "is_fraud": nft.is_fraud,
                    "has_embedding": nft.embedding_vector is not None and len(nft.embedding_vector) > 0,
                    "has_analysis_details": bool(nft.analysis_details),
                    "created_at": nft.created_at.isoformat() if nft.created_at else None
                }
                for nft in sorted(nfts, key=lambda x: x.created_at or datetime.min, reverse=True)[:10]
            ]
        }
    except Exception as e:
        logger.error(f"Error in status summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/debug/embedding-status")
async def get_embedding_status():
    """
    Debug endpoint to check embedding service status
    """
    try:
        from agent.clip_embeddings import get_embedding_service
        from agent.gemini_image_analyzer import get_gemini_analyzer
        from core.config import settings
        
        # Check configuration
        config_status = {
            "google_api_key": bool(settings.google_api_key),
            "google_model": settings.google_model or "Not set",
            "embedding_model": settings.gemini_embedding_model or "Not set",
            "database_url": bool(settings.supabase_db_url)
        }
        
        # Check embedding service
        embedding_service = get_embedding_service()
        embedding_status = {
            "available": embedding_service is not None,
            "initialized": embedding_service.initialized if embedding_service else False
        }
        
        # Check Gemini analyzer
        gemini_analyzer = await get_gemini_analyzer()
        gemini_status = {
            "available": gemini_analyzer is not None,
            "initialized": gemini_analyzer.initialized if gemini_analyzer else False,
            "chat_model": gemini_analyzer.gemini_chat is not None if gemini_analyzer else False,
            "embeddings_model": gemini_analyzer.embeddings is not None if gemini_analyzer else False
        }
        
        return {
            "configuration": config_status,
            "embedding_service": embedding_status,
            "gemini_analyzer": gemini_status
        }
        
    except Exception as e:
        logger.error(f"Error checking embedding status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{nft_id}/similar")
async def get_similar_nfts(
    nft_id: str,
    limit: int = 5,
    db: Session = Depends(get_db)
):
    """
    Get similar NFTs for a given NFT ID
    """
    try:
        # Validate UUID format
        try:
            import uuid
            uuid.UUID(nft_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid NFT ID format")
        
        # Get the target NFT
        target_nft = db.query(NFT).filter(NFT.id == nft_id).first()
        if not target_nft:
            logger.warning(f"NFT not found with ID: {nft_id}")
            return {
                "similar_nfts": [],
                "total": 0,
                "message": "NFT not found",
                "target_nft_id": nft_id
            }
        
        if target_nft.embedding_vector is None or len(target_nft.embedding_vector) == 0:
            return {
                "similar_nfts": [],
                "total": 0,
                "message": "No embedding available for similarity search",
                "target_nft_id": nft_id,
                "target_nft_title": target_nft.title
            }
        
        # Search for similar NFTs using vector similarity
        query = text("""
            SELECT 
                id,
                title,
                image_url,
                wallet_address,
                embedding_vector <=> :embedding as distance
            FROM nfts 
            WHERE embedding_vector IS NOT NULL 
            AND id != :current_nft_id
            AND status = 'minted'
            ORDER BY embedding_vector <=> :embedding
            LIMIT :limit
        """)
        
        # Convert embedding to PostgreSQL vector format
        embedding_str = f"[{','.join(map(str, target_nft.embedding_vector))}]"
        
        result = db.execute(query, {
            "embedding": embedding_str,
            "current_nft_id": nft_id,
            "limit": limit
        })
        
        similar_nfts = []
        for row in result:
            # Convert distance to similarity (1 - distance)
            distance = float(row.distance)
            similarity = 1.0 - distance
            
            if similarity >= 0.7:  # Threshold for similar NFTs
                similar_nft = {
                    "nft_id": str(row.id),
                    "title": row.title,
                    "image_url": row.image_url,
                    "wallet_address": row.wallet_address,
                    "similarity": similarity
                }
                similar_nfts.append(similar_nft)
        
        return {
            "similar_nfts": similar_nfts,
            "total": len(similar_nfts),
            "target_nft_id": nft_id,
            "target_nft_title": target_nft.title
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error getting similar NFTs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting similar NFTs: {str(e)}")
