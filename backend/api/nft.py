"""
NFT API endpoints for FraudGuard
Handles NFT creation, fraud detection, and basic operations following the 8-step workflow
"""
import uuid
import math
import json
import os
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey, DECIMAL, text, and_, or_, desc, func
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel
import asyncio
import httpx
import logging
from enum import Enum

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
    from models.database import User, NFT, Base, Listing, FraudFlag, ListingHistory
except ImportError:
    try:
        from backend.models.database import User, NFT, Base, Listing, FraudFlag, ListingHistory
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
            
            # Phase 2: Enhanced NFT columns
            is_listed = Column(Boolean, default=False)
            listing_price = Column(DECIMAL(18, 8))
            last_listed_at = Column(DateTime)
            listing_id = Column(Text)
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
            blockchain_tx_id = Column(Text)
            listing_id = Column(Text, unique=True)
            updated_at = Column(DateTime, default=datetime.utcnow)
            metadata = Column(JSON)  # JSONB type for metadata
            listing_metadata = Column(JSON)  # JSONB type for listing metadata

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
    
    class Config:
        # Allow extra fields and arbitrary types to handle complex analysis_details
        extra = "allow"
        arbitrary_types_allowed = True

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
        
        # Safely serialize analysis_details to ensure JSON compatibility
        try:
            analysis_details = safe_serialize_analysis_details(analysis_details)
        except Exception as serialization_error:
            logger.error(f"Error serializing analysis_details: {serialization_error}")
            # Fallback to a safe default
            analysis_details = {
                "error": f"Serialization failed: {str(serialization_error)}",
                "raw_data": str(analysis_details)
            }
        
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
        # DEFAULT IS UNLISTED (changed from automatic listing)
        try:
            nft.sui_object_id = sui_object_id
            nft.status = "minted"
            # NFT is unlisted by default when minted
            nft.is_listed = False
            nft.listing_price = None
            nft.last_listed_at = None
            nft.listing_status = "inactive"
            
            db.commit()
            db.refresh(nft)
            
            logger.info(f"NFT mint confirmed and set as unlisted by default: {nft_id} -> {sui_object_id}")

            return {
                "success": True,
                "message": "NFT mint confirmed and set as unlisted by default",
                "nft_id": nft_id,
                "sui_object_id": sui_object_id,
                "status": "minted",
                "is_listed": False,
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

@router.get("/user/{wallet_address}")
async def get_user_nfts(
    wallet_address: str,
    db: Session = Depends(get_db)
):
    """Get all NFTs owned by a user (for My NFTs tab)"""
    try:
        logger.info(f"Fetching NFTs for wallet: {wallet_address}")
        
        # Find user by wallet address
        user = db.query(User).filter(User.wallet_address == wallet_address).first()
        if not user:
            logger.warning(f"User not found for wallet: {wallet_address}")
            return {
                "wallet_address": wallet_address,
                "user_found": False,
                "nfts": [],
                "total": 0,
                "message": "User not found"
            }
        
        logger.info(f"Found user {user.id} for wallet: {wallet_address}")
        
        # Get user's NFTs
        nfts = db.query(NFT).filter(NFT.owner_id == user.id).all()
        logger.info(f"Found {len(nfts)} NFTs for user {user.id}")
        
        # Convert to serializable format
        nft_list = []
        for nft in nfts:
            try:
                # Safely handle analysis_details
                analysis_details = None
                if nft.analysis_details:
                    try:
                        analysis_details = safe_serialize_analysis_details(nft.analysis_details)
                    except Exception as e:
                        logger.warning(f"Error serializing analysis_details for NFT {nft.id}: {e}")
                        analysis_details = {"error": "Serialization failed"}
                
                nft_dict = {
                    "id": str(nft.id),
                    "title": nft.title,
                    "description": nft.description,
                    "category": nft.category,
                    "price": float(nft.price) if nft.price else 0.0,
                    "image_url": nft.image_url,
                    "wallet_address": nft.wallet_address,
                    "sui_object_id": nft.sui_object_id,
                    "is_fraud": nft.is_fraud,
                    "is_listed": nft.is_listed,  # Include listing status
                    "confidence_score": float(nft.confidence_score or 0.0),
                    "flag_type": nft.flag_type,
                    "reason": nft.reason,
                    "status": nft.status,
                    "created_at": nft.created_at.isoformat() if nft.created_at else None,
                    "analysis_details": analysis_details
                }
                nft_list.append(nft_dict)
                logger.debug(f"Added NFT {nft.id} - {nft.title} to response")
            except Exception as e:
                logger.error(f"Error processing NFT {nft.id}: {e}")
                continue
        
        logger.info(f"Returning {len(nft_list)} NFTs for wallet {wallet_address}")
        
        return {
            "wallet_address": wallet_address,
            "user_found": True,
            "nfts": nft_list,
            "total": len(nft_list)
        }
        
    except Exception as e:
        logger.error(f"Error fetching NFTs for user {wallet_address}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user NFTs")

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
            try:
                # Safely handle analysis_details
                analysis_details = None
                if nft.analysis_details:
                    try:
                        analysis_details = safe_serialize_analysis_details(nft.analysis_details)
                    except Exception as e:
                        logger.warning(f"Error serializing analysis_details for NFT {nft.id}: {e}")
                        analysis_details = {"error": "Serialization failed"}
                
                nft_list.append({
                    "id": str(nft.id),
                    "title": nft.title,
                    "description": nft.description,
                    "category": nft.category,
                    "price": float(nft.price) if nft.price else 0.0,
                    "image_url": nft.image_url,
                    "wallet_address": nft.wallet_address,
                    "sui_object_id": nft.sui_object_id,
                    "is_fraud": nft.is_fraud,
                    "confidence_score": float(nft.confidence_score or 0.0),
                    "flag_type": nft.flag_type,
                    "reason": nft.reason,
                    "status": nft.status,
                    "created_at": nft.created_at,
                    "analysis_details": analysis_details
                })
            except Exception as e:
                logger.error(f"Error processing NFT {nft.id}: {e}")
                continue
        
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
            # Include both pending and minted NFTs that are listed
            query = db.query(NFT).filter(
                NFT.status.in_(["minted", "pending"]),
                NFT.is_listed == True  # Only show listed NFTs
            )
        else:
            # Only minted NFTs that are listed for sale (default behavior)
            query = db.query(NFT).filter(
                NFT.status == "minted",
                NFT.is_listed == True  # Only show listed NFTs
            )
        
        # Optionally exclude fraud-flagged NFTs from marketplace
        if not include_flagged:
            query = query.filter(NFT.is_fraud == False)
        
        nfts = query.order_by(NFT.created_at.desc()).offset(offset).limit(limit).all()
        total = query.count()
        
        nft_list = []
        for nft in nfts:
            try:
                # Safely handle analysis_details
                analysis_details = None
                if nft.analysis_details:
                    try:
                        analysis_details = safe_serialize_analysis_details(nft.analysis_details)
                    except Exception as e:
                        logger.warning(f"Error serializing analysis_details for NFT {nft.id}: {e}")
                        analysis_details = {"error": "Serialization failed"}
                
                nft_response = NFTResponse(
                    id=str(nft.id),
                    title=nft.title,
                    description=nft.description,
                    category=nft.category,
                    price=float(nft.price) if nft.price else 0.0,
                    image_url=nft.image_url,
                    wallet_address=nft.wallet_address,
                    sui_object_id=nft.sui_object_id,
                    is_fraud=nft.is_fraud,
                    confidence_score=float(nft.confidence_score or 0.0),
                    status=nft.status,
                    created_at=nft.created_at,
                    analysis_details=analysis_details
                )
                nft_list.append(nft_response)
            except Exception as e:
                logger.error(f"Error processing NFT {nft.id}: {e}")
                continue
        
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
            try:
                nft_list.append({
                    "id": str(nft.id),
                    "title": nft.title,
                    "description": nft.description,
                    "category": nft.category,
                    "price": float(nft.price) if nft.price else 0.0,
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
            except Exception as e:
                logger.error(f"Error processing NFT {nft.id}: {e}")
                continue
        
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
        
        # Safely handle analysis_details
        analysis_details = None
        if nft.analysis_details:
            try:
                analysis_details = safe_serialize_analysis_details(nft.analysis_details)
            except Exception as e:
                logger.warning(f"Error serializing analysis_details for NFT {nft.id}: {e}")
                analysis_details = {"error": "Serialization failed"}
        
        return {
            "nft": NFTResponse(
                id=str(nft.id),
                title=nft.title,
                description=nft.description,
                category=nft.category,
                price=float(nft.price) if nft.price else 0.0,
                image_url=nft.image_url,
                wallet_address=nft.wallet_address,
                sui_object_id=nft.sui_object_id,
                is_fraud=nft.is_fraud,
                confidence_score=float(nft.confidence_score or 0.0),
                status=nft.status,
                created_at=nft.created_at,
                analysis_details=analysis_details
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
        
        # Safely serialize analysis_details to ensure JSON compatibility
        analysis_details = safe_serialize_analysis_details(analysis_details)
        
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
            try:
                nft = db.query(NFT).filter(NFT.id == nft_id).first()
                if nft:
                    user = db.query(User).filter(User.id == nft.owner_id).first()
                    
                    # Safely handle analysis_details
                    analysis_details = None
                    if nft.analysis_details:
                        try:
                            analysis_details = safe_serialize_analysis_details(nft.analysis_details)
                        except Exception as e:
                            logger.warning(f"Error serializing analysis_details for similar NFT {nft.id}: {e}")
                            analysis_details = {"error": "Serialization failed"}
                    
                    similar_nfts.append({
                        "nft": NFTResponse(
                            id=str(nft.id),
                            title=nft.title,
                            description=nft.description,
                            category=nft.category,
                            price=float(nft.price) if nft.price else 0.0,
                            image_url=nft.image_url,
                            wallet_address=nft.wallet_address,
                            sui_object_id=nft.sui_object_id,
                            is_fraud=nft.is_fraud,
                            confidence_score=float(nft.confidence_score or 0.0),
                            status=nft.status,
                            created_at=nft.created_at,
                            analysis_details=analysis_details
                        ),
                        "similarity_score": round(similarity_score, 4),
                        "owner": {
                            "wallet_address": user.wallet_address if user else nft.wallet_address,
                            "username": user.username if user else f"User{nft.wallet_address[:8]}",
                            "reputation_score": float(user.reputation_score) if user else 50.0
                        }
                    })
            except Exception as e:
                logger.error(f"Error processing similar NFT {nft_id}: {e}")
                continue
        
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
            try:
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
            except Exception as e:
                logger.error(f"Error processing potential duplicate {result.get('nft_id')}: {e}")
                continue
        
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
        
        result = {
            "total_nfts": len(nfts),
            "status_counts": status_counts,
            "sui_object_id_counts": sui_object_id_counts,
            "embedding_counts": embedding_counts,
            "recent_nfts": []
        }
        
        # Process recent NFTs with error handling
        sorted_nfts = sorted(nfts, key=lambda x: x.created_at or datetime.min, reverse=True)[:10]
        for nft in sorted_nfts:
            try:
                recent_nft = {
                    "id": str(nft.id),
                    "title": nft.title,
                    "status": nft.status,
                    "sui_object_id": nft.sui_object_id,
                    "is_fraud": nft.is_fraud,
                    "has_embedding": nft.embedding_vector is not None and len(nft.embedding_vector) > 0,
                    "has_analysis_details": bool(nft.analysis_details),
                    "created_at": nft.created_at.isoformat() if nft.created_at else None
                }
                result["recent_nfts"].append(recent_nft)
            except Exception as e:
                logger.error(f"Error processing recent NFT {nft.id}: {e}")
                continue
        
        return result
        
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
                try:
                    similar_nft = {
                        "nft_id": str(row.id),
                        "title": row.title,
                        "image_url": row.image_url,
                        "wallet_address": row.wallet_address,
                        "similarity": similarity
                    }
                    similar_nfts.append(similar_nft)
                except Exception as e:
                    logger.error(f"Error processing similar NFT {row.id}: {e}")
                    continue
        
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

# ===== Phase 3.1: Enhanced NFT Endpoints for Listing Management =====

class NFTListingRequest(BaseModel):
    """Request model for listing an NFT"""
    price: float
    expires_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None

class NFTListingResponse(BaseModel):
    """Response model for NFT listing operations"""
    nft_id: str
    listing_id: Optional[str] = None
    price: float
    status: str
    blockchain_tx_id: Optional[str] = None
    message: str

@router.put("/{nft_id}/list", response_model=NFTListingResponse)
async def list_nft_for_sale(
    nft_id: str,
    listing_data: NFTListingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    List an NFT for sale on the marketplace
    """
    try:
        # Validate NFT exists and is owned by the user
        nft = db.query(NFT).filter(NFT.id == nft_id).first()
        if not nft:
            raise HTTPException(status_code=404, detail="NFT not found")
        
        # Check if NFT is already listed
        if nft.is_listed:
            raise HTTPException(status_code=400, detail="NFT is already listed for sale")
        
        # Check if NFT is minted
        if nft.status != "minted":
            raise HTTPException(status_code=400, detail="NFT must be minted before listing")
        
        # Get user
        user = db.query(User).filter(User.id == nft.owner_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="NFT owner not found")
        
        # Create listing record
        listing = Listing(
            nft_id=nft.id,
            seller_id=user.id,
            price=listing_data.price,
            expires_at=listing_data.expires_at,
            metadata=listing_data.metadata,
            status="active"
        )
        
        db.add(listing)
        
        # Update NFT listing status
        nft.is_listed = True
        nft.listing_price = listing_data.price
        nft.last_listed_at = datetime.utcnow()
        nft.listing_status = "active"
        nft.listing_id = str(listing.id)
        
        db.commit()
        db.refresh(listing)
        
        # Background task to sync with blockchain
        background_tasks.add_task(sync_listing_to_blockchain, listing.id)
        
        return NFTListingResponse(
            nft_id=str(nft.id),
            listing_id=str(listing.id),
            price=listing_data.price,
            status="active",
            blockchain_tx_id=None,  # Will be set after blockchain sync
            message="NFT listed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing NFT {nft_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error listing NFT: {str(e)}")

@router.put("/{nft_id}/unlist", response_model=NFTListingResponse)
async def unlist_nft(
    nft_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Unlist an NFT from the marketplace
    """
    try:
        # Validate NFT exists
        nft = db.query(NFT).filter(NFT.id == nft_id).first()
        if not nft:
            raise HTTPException(status_code=404, detail="NFT not found")
        
        # Check if NFT is listed
        if not nft.is_listed:
            raise HTTPException(status_code=400, detail="NFT is not currently listed")
        
        # Get the active listing
        listing = db.query(Listing).filter(
            Listing.nft_id == nft.id,
            Listing.status == "active"
        ).first()
        
        if not listing:
            raise HTTPException(status_code=404, detail="Active listing not found")
        
        # Update listing status
        listing.status = "inactive"
        listing.updated_at = datetime.utcnow()
        
        # Update NFT listing status
        nft.is_listed = False
        nft.listing_status = "inactive"
        nft.listing_price = None
        nft.last_listed_at = None
        
        db.commit()
        
        # Background task to sync with blockchain
        background_tasks.add_task(sync_listing_deletion_to_blockchain, listing.id)
        
        return NFTListingResponse(
            nft_id=str(nft.id),
            listing_id=str(listing.id),
            price=float(listing.price),
            status="inactive",
            blockchain_tx_id=listing.blockchain_tx_id,
            message="NFT unlisted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unlisting NFT {nft_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error unlisting NFT: {str(e)}")

@router.get("/{nft_id}/listing-status", response_model=Dict[str, Any])
async def get_nft_listing_status(
    nft_id: str,
    db: Session = Depends(get_db)
):
    """
    Get the current listing status of an NFT
    """
    try:
        # Validate NFT exists
        nft = db.query(NFT).filter(NFT.id == nft_id).first()
        if not nft:
            raise HTTPException(status_code=404, detail="NFT not found")
        
        # Get listing information
        listing = db.query(Listing).filter(
            Listing.nft_id == nft.id,
            Listing.status == "active"
        ).first()
        
        if not listing:
            return {
                "nft_id": str(nft.id),
                "is_listed": False,
                "listing_status": "not_listed",
                "message": "NFT is not currently listed"
            }
        
        return {
            "nft_id": str(nft.id),
            "is_listed": True,
            "listing_id": str(listing.id),
            "price": float(listing.price),
            "status": listing.status,
            "blockchain_tx_id": listing.blockchain_tx_id,
            "created_at": listing.created_at,
            "expires_at": listing.expires_at,
            "metadata": listing.metadata
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting listing status for NFT {nft_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting listing status: {str(e)}")

@router.get("/user/{wallet_address}/listings")
async def get_user_listings(
    wallet_address: str,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Get all listings for a specific user
    """
    try:
        # Find user
        user = db.query(User).filter(User.wallet_address == wallet_address).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get user's listings
        query = db.query(Listing).filter(Listing.seller_id == user.id)
        
        if status:
            query = query.filter(Listing.status == status)
        
        offset = (page - 1) * limit
        listings = query.order_by(Listing.created_at.desc()).offset(offset).limit(limit).all()
        total = query.count()
        
        listing_list = []
        for listing in listings:
            nft = db.query(NFT).filter(NFT.id == listing.nft_id).first()
            if nft:
                listing_list.append({
                    "listing_id": str(listing.id),
                    "nft_id": str(listing.nft_id),
                    "nft_title": nft.title,
                    "nft_image_url": nft.image_url,
                    "price": float(listing.price),
                    "status": listing.status,
                    "blockchain_tx_id": listing.blockchain_tx_id,
                    "created_at": listing.created_at,
                    "updated_at": listing.updated_at,
                    "expires_at": listing.expires_at,
                    "metadata": listing.metadata
                })
        
        return {
            "wallet_address": wallet_address,
            "listings": listing_list,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": math.ceil(total / limit) if total > 0 else 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting listings for user {wallet_address}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting user listings: {str(e)}")

# Background task functions for blockchain sync
async def sync_listing_to_blockchain(listing_id: str):
    """Sync listing to blockchain"""
    try:
        logger.info(f"Syncing listing {listing_id} to blockchain")
        # Implementation would call Sui client to create listing
        # For now, just log the action
        await asyncio.sleep(1)  # Simulate blockchain operation
        logger.info(f"Listing {listing_id} synced to blockchain")
    except Exception as e:
        logger.error(f"Error syncing listing to blockchain: {e}")

async def sync_listing_deletion_to_blockchain(listing_id: str):
    """Sync listing deletion to blockchain"""
    try:
        logger.info(f"Syncing listing deletion {listing_id} to blockchain")
        # Implementation would call Sui client to delete listing
        # For now, just log the action
        await asyncio.sleep(1)  # Simulate blockchain operation
        logger.info(f"Listing deletion {listing_id} synced to blockchain")
    except Exception as e:
        logger.error(f"Error syncing listing deletion to blockchain: {e}")

# ===== Phase 3.3: Enhanced NFT Endpoints with Advanced Features =====

class NFTBulkListingRequest(BaseModel):
    """Request model for bulk listing operations"""
    nft_ids: List[str]
    price: float
    expires_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None

class NFTBulkListingResponse(BaseModel):
    """Response model for bulk listing operations"""
    successful_listings: List[Dict[str, Any]]
    failed_listings: List[Dict[str, Any]]
    total_processed: int
    total_successful: int
    total_failed: int

class NFTListingUpdateRequest(BaseModel):
    """Request model for updating NFT listing details"""
    price: Optional[float] = None
    expires_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None
    auto_relist: Optional[bool] = False

class NFTListingAnalytics(BaseModel):
    """Response model for NFT listing analytics"""
    nft_id: str
    total_listings: int
    total_sales: int
    average_price: float
    highest_price: float
    lowest_price: float
    total_volume: float
    listing_duration_avg: float
    success_rate: float
    last_listed_at: Optional[datetime] = None
    current_status: str

@router.post("/bulk-list", response_model=NFTBulkListingResponse)
async def bulk_list_nfts(
    bulk_request: NFTBulkListingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Bulk list multiple NFTs for sale
    This endpoint allows users to list multiple NFTs at once with the same price
    """
    try:
        successful_listings = []
        failed_listings = []
        
        for nft_id in bulk_request.nft_ids:
            try:
                # Validate NFT exists
                nft = db.query(NFT).filter(NFT.id == nft_id).first()
                if not nft:
                    failed_listings.append({
                        "nft_id": nft_id,
                        "error": "NFT not found"
                    })
                    continue
                
                # Check if NFT is already listed
                if nft.is_listed:
                    failed_listings.append({
                        "nft_id": nft_id,
                        "error": "NFT is already listed"
                    })
                    continue
                
                # Check if NFT is minted
                if nft.status != "minted":
                    failed_listings.append({
                        "nft_id": nft_id,
                        "error": "NFT must be minted before listing"
                    })
                    continue
                
                # Get user
                user = db.query(User).filter(User.id == nft.owner_id).first()
                if not user:
                    failed_listings.append({
                        "nft_id": nft_id,
                        "error": "NFT owner not found"
                    })
                    continue
                
                # Create listing record
                listing = Listing(
                    nft_id=nft.id,
                    seller_id=user.id,
                    price=bulk_request.price,
                    expires_at=bulk_request.expires_at,
                    metadata=bulk_request.metadata,
                    status="active"
                )
                
                db.add(listing)
                
                # Update NFT listing status
                nft.is_listed = True
                nft.listing_price = bulk_request.price
                nft.last_listed_at = datetime.utcnow()
                nft.listing_status = "active"
                nft.listing_id = str(listing.id)
                
                db.commit()
                db.refresh(listing)
                
                # Background task to sync with blockchain
                background_tasks.add_task(sync_listing_to_blockchain, listing.id)
                
                successful_listings.append({
                    "nft_id": nft_id,
                    "listing_id": str(listing.id),
                    "price": bulk_request.price,
                    "status": "active"
                })
                
            except Exception as e:
                logger.error(f"Error listing NFT {nft_id}: {str(e)}")
                failed_listings.append({
                    "nft_id": nft_id,
                    "error": str(e)
                })
        
        return NFTBulkListingResponse(
            successful_listings=successful_listings,
            failed_listings=failed_listings,
            total_processed=len(bulk_request.nft_ids),
            total_successful=len(successful_listings),
            total_failed=len(failed_listings)
        )
        
    except Exception as e:
        logger.error(f"Error in bulk listing operation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error in bulk listing operation: {str(e)}")

@router.put("/{nft_id}/update-listing", response_model=NFTListingResponse)
async def update_nft_listing(
    nft_id: str,
    update_data: NFTListingUpdateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Update an existing NFT listing with new details
    This endpoint allows users to modify listing price, expiration, and metadata
    """
    try:
        # Validate NFT exists
        nft = db.query(NFT).filter(NFT.id == nft_id).first()
        if not nft:
            raise HTTPException(status_code=404, detail="NFT not found")
        
        # Check if NFT is listed
        if not nft.is_listed:
            raise HTTPException(status_code=400, detail="NFT is not currently listed")
        
        # Get the active listing
        listing = db.query(Listing).filter(
            Listing.nft_id == nft.id,
            Listing.status == "active"
        ).first()
        
        if not listing:
            raise HTTPException(status_code=404, detail="Active listing not found")
        
        # Record old values for history
        old_price = listing.price
        old_expires_at = listing.expires_at
        old_metadata = listing.metadata
        
        # Update listing
        if update_data.price is not None:
            listing.price = update_data.price
            nft.listing_price = update_data.price
        
        if update_data.expires_at is not None:
            listing.expires_at = update_data.expires_at
        
        if update_data.metadata is not None:
            listing.metadata = update_data.metadata
        
        listing.updated_at = datetime.utcnow()
        
        # Create history record
        history = ListingHistory(
            listing_id=listing.id,
            nft_id=listing.nft_id,
            action="updated",
            old_price=old_price,
            new_price=listing.price,
            seller_id=listing.seller_id,
            blockchain_tx_id=listing.blockchain_tx_id
        )
        
        db.add(history)
        db.commit()
        db.refresh(listing)
        
        # Background task to sync with blockchain
        background_tasks.add_task(sync_listing_update_to_blockchain, listing.id)
        
        return NFTListingResponse(
            nft_id=str(nft.id),
            listing_id=str(listing.id),
            price=float(listing.price),
            status="active",
            blockchain_tx_id=listing.blockchain_tx_id,
            message="NFT listing updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating NFT listing {nft_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating NFT listing: {str(e)}")

@router.get("/{nft_id}/listing-analytics", response_model=NFTListingAnalytics)
async def get_nft_listing_analytics(
    nft_id: str,
    db: Session = Depends(get_db)
):
    """
    Get detailed analytics for an NFT's listing history
    This endpoint provides insights into listing performance
    """
    try:
        # Validate NFT exists
        nft = db.query(NFT).filter(NFT.id == nft_id).first()
        if not nft:
            raise HTTPException(status_code=404, detail="NFT not found")
        
        # Get all listings for this NFT
        listings = db.query(Listing).filter(Listing.nft_id == nft.id).all()
        
        if not listings:
            return NFTListingAnalytics(
                nft_id=nft_id,
                total_listings=0,
                total_sales=0,
                average_price=0.0,
                highest_price=0.0,
                lowest_price=0.0,
                total_volume=0.0,
                listing_duration_avg=0.0,
                success_rate=0.0,
                last_listed_at=None,
                current_status="never_listed"
            )
        
        # Calculate analytics
        prices = [float(listing.price) for listing in listings]
        total_listings = len(listings)
        total_sales = len([l for l in listings if l.status == "sold"])
        average_price = sum(prices) / len(prices) if prices else 0.0
        highest_price = max(prices) if prices else 0.0
        lowest_price = min(prices) if prices else 0.0
        total_volume = sum(prices)
        
        # Calculate average listing duration
        durations = []
        for listing in listings:
            if listing.created_at and listing.updated_at:
                duration = (listing.updated_at - listing.created_at).total_seconds() / 3600  # hours
                durations.append(duration)
        
        listing_duration_avg = sum(durations) / len(durations) if durations else 0.0
        
        # Calculate success rate
        success_rate = (total_sales / total_listings * 100) if total_listings > 0 else 0.0
        
        # Get last listed date
        last_listed = max(listings, key=lambda x: x.created_at) if listings else None
        last_listed_at = last_listed.created_at if last_listed else None
        
        # Get current status
        current_listing = db.query(Listing).filter(
            Listing.nft_id == nft.id,
            Listing.status == "active"
        ).first()
        current_status = current_listing.status if current_listing else "not_listed"
        
        return NFTListingAnalytics(
            nft_id=nft_id,
            total_listings=total_listings,
            total_sales=total_sales,
            average_price=average_price,
            highest_price=highest_price,
            lowest_price=lowest_price,
            total_volume=total_volume,
            listing_duration_avg=listing_duration_avg,
            success_rate=success_rate,
            last_listed_at=last_listed_at,
            current_status=current_status
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting listing analytics for NFT {nft_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting listing analytics: {str(e)}")

@router.post("/{nft_id}/auto-relist")
async def auto_relist_nft(
    nft_id: str,
    relist_data: NFTListingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Automatically relist an NFT after it expires or is unlisted
    This endpoint provides automatic relisting functionality
    """
    try:
        # Validate NFT exists
        nft = db.query(NFT).filter(NFT.id == nft_id).first()
        if not nft:
            raise HTTPException(status_code=404, detail="NFT not found")
        
        # Check if NFT is currently listed
        if nft.is_listed:
            raise HTTPException(status_code=400, detail="NFT is already listed")
        
        # Check if NFT is minted
        if nft.status != "minted":
            raise HTTPException(status_code=400, detail="NFT must be minted before listing")
        
        # Get user
        user = db.query(User).filter(User.id == nft.owner_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="NFT owner not found")
        
        # Create new listing
        listing = Listing(
            nft_id=nft.id,
            seller_id=user.id,
            price=relist_data.price,
            expires_at=relist_data.expires_at,
            metadata=relist_data.metadata,
            status="active"
        )
        
        db.add(listing)
        
        # Update NFT listing status
        nft.is_listed = True
        nft.listing_price = relist_data.price
        nft.last_listed_at = datetime.utcnow()
        nft.listing_status = "active"
        nft.listing_id = str(listing.id)
        
        db.commit()
        db.refresh(listing)
        
        # Background task to sync with blockchain
        background_tasks.add_task(sync_listing_to_blockchain, listing.id)
        
        return NFTListingResponse(
            nft_id=str(nft.id),
            listing_id=str(listing.id),
            price=relist_data.price,
            status="active",
            blockchain_tx_id=None,
            message="NFT auto-relisted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error auto-relisting NFT {nft_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error auto-relisting NFT: {str(e)}")

@router.get("/{nft_id}/listing-history")
async def get_nft_listing_history(
    nft_id: str,
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Get detailed listing history for an NFT
    This endpoint provides a complete audit trail of listing activities
    """
    try:
        # Validate NFT exists
        nft = db.query(NFT).filter(NFT.id == nft_id).first()
        if not nft:
            raise HTTPException(status_code=404, detail="NFT not found")
        
        # Get listing history
        history = db.query(ListingHistory).filter(
            ListingHistory.nft_id == nft.id
        ).order_by(ListingHistory.timestamp.desc()).offset(offset).limit(limit).all()
        
        history_list = []
        for record in history:
            try:
                history_list.append({
                    "id": str(record.id),
                    "action": record.action,
                    "old_price": float(record.old_price) if record.old_price else None,
                    "new_price": float(record.new_price) if record.new_price else None,
                    "seller_id": str(record.seller_id),
                    "blockchain_tx_id": record.blockchain_tx_id,
                    "timestamp": record.timestamp
                })
            except Exception as e:
                logger.error(f"Error processing history record {record.id}: {e}")
                continue
        
        return {
            "nft_id": nft_id,
            "nft_title": nft.title,
            "history": history_list,
            "total_records": len(history_list)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting listing history for NFT {nft_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting listing history: {str(e)}")

# ===== Phase 3.3: Enhanced Blockchain Sync Functions =====

async def sync_listing_update_to_blockchain(listing_id: str):
    """Sync listing update to blockchain"""
    try:
        logger.info(f"Syncing listing update {listing_id} to blockchain")
        # Implementation would call Sui client to update listing
        # For now, just log the action
        await asyncio.sleep(1)  # Simulate blockchain operation
        logger.info(f"Listing update {listing_id} synced to blockchain")
    except Exception as e:
        logger.error(f"Error syncing listing update to blockchain: {e}")

def safe_serialize_analysis_details(analysis_details: Any) -> Dict[str, Any]:
    """
    Safely serialize analysis_details to ensure JSON compatibility
    """
    if analysis_details is None:
        return {}
    
    if isinstance(analysis_details, dict):
        # Recursively process dictionary
        serialized = {}
        for key, value in analysis_details.items():
            try:
                if isinstance(value, (dict, list)):
                    serialized[key] = safe_serialize_analysis_details(value)
                elif hasattr(value, '__dict__') and not isinstance(value, (str, int, float, bool)):
                    # Convert objects with __dict__ to dictionaries, but exclude basic types
                    try:
                        serialized[key] = safe_serialize_analysis_details(vars(value))
                    except (TypeError, ValueError):
                        serialized[key] = str(value)
                elif hasattr(value, 'isoformat'):
                    # Convert datetime objects
                    serialized[key] = value.isoformat()
                elif hasattr(value, '__dataclass_fields__'):
                    # Handle dataclasses
                    try:
                        serialized[key] = safe_serialize_analysis_details(vars(value))
                    except (TypeError, ValueError):
                        serialized[key] = str(value)
                elif isinstance(value, (str, int, float, bool)):
                    # Basic types can be serialized directly
                    serialized[key] = value
                else:
                    # Try to serialize directly
                    try:
                        json.dumps(value)
                        serialized[key] = value
                    except (TypeError, ValueError):
                        serialized[key] = str(value)
            except Exception as e:
                # If any error occurs during serialization, convert to string
                logger.warning(f"Error serializing key '{key}': {e}")
                serialized[key] = str(value)
        return serialized
    
    elif isinstance(analysis_details, list):
        # Recursively process list
        serialized_list = []
        for item in analysis_details:
            try:
                serialized_list.append(safe_serialize_analysis_details(item))
            except Exception as e:
                logger.warning(f"Error serializing list item: {e}")
                serialized_list.append(str(item))
        return serialized_list
    
    elif hasattr(analysis_details, '__dict__') and not isinstance(analysis_details, (str, int, float, bool)):
        # Convert objects to dictionaries, but exclude basic types
        try:
            return safe_serialize_analysis_details(vars(analysis_details))
        except (TypeError, ValueError):
            return str(analysis_details)
    
    elif hasattr(analysis_details, '__dataclass_fields__'):
        # Handle dataclasses specifically
        try:
            return safe_serialize_analysis_details(vars(analysis_details))
        except (TypeError, ValueError):
            return str(analysis_details)
    
    elif hasattr(analysis_details, 'isoformat'):
        # Convert datetime objects
        return analysis_details.isoformat()
    
    elif isinstance(analysis_details, (str, int, float, bool)):
        # Basic types can be serialized directly
        return analysis_details
    
    else:
        # Try to serialize directly
        try:
            json.dumps(analysis_details)
            return analysis_details
        except (TypeError, ValueError):
            return str(analysis_details)
