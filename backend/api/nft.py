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
from sqlalchemy.dialects.postgresql import UUID, JSON, JSONB
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
    from models.database import User, NFT, Base, Listing, TransactionHistory, UserReputationEvent
except ImportError:
    try:
        from backend.models.database import User, NFT, Base, Listing, TransactionHistory, UserReputationEvent
    except ImportError:
        logger.error("Could not import database models")
        raise

# Request/Response Models - Updated to match database.py structure
class NFTCreationRequest(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    initial_price: Optional[float] = None
    image_url: str
    creator_wallet_address: str
    owner_wallet_address: str
    metadata_url: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None

class NFTResponse(BaseModel):
    id: str
    sui_object_id: Optional[str]
    creator_wallet_address: str
    owner_wallet_address: str
    title: str
    description: Optional[str]
    image_url: str
    metadata_url: Optional[str]
    attributes: Optional[Dict[str, Any]]
    category: Optional[str]
    initial_price: Optional[float]
    price: Optional[float] = None  # Current listing price
    is_listed: bool = False  # Whether NFT is currently listed
    is_fraud: bool = False  # Whether NFT is flagged as fraud
    confidence_score: Optional[float] = None  # Fraud detection confidence
    reason: Optional[str] = None  # Reason for fraud flag

    embedding_vector: Optional[List[float]] = None  # For similarity search
    analysis_details: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    wallet_address: Optional[str] = None  # Legacy field for frontend compatibility
    
    class Config:
        # Allow extra fields and arbitrary types to handle complex analysis_details
        arbitrary_types_allowed = True

# Import database connection
try:
    from database.connection import get_db
except ImportError:
    from backend.database.connection import get_db

# Create router
router = APIRouter(prefix="/api/nft", tags=["NFT"])

# Helper function to safely serialize analysis details
def safe_serialize_analysis_details(analysis_details: Any) -> Dict[str, Any]:
    """Safely serialize analysis details to ensure JSON compatibility"""
    if analysis_details is None:
        return {}
    
    try:
        if isinstance(analysis_details, dict):
            # Remove any non-serializable objects
            serializable_dict = {}
            for key, value in analysis_details.items():
                try:
                    json.dumps(value)
                    serializable_dict[key] = value
                except (TypeError, ValueError):
                    # Convert non-serializable objects to strings
                    serializable_dict[key] = str(value)
            return serializable_dict
        else:
            return {"raw_data": str(analysis_details)}
    except Exception as e:
        logger.warning(f"Error serializing analysis details: {e}")
        return {"error": "Serialization failed", "raw_data": str(analysis_details)}

# Helper function to create NFTResponse with legacy compatibility
def create_nft_response(nft, analysis_details=None, db=None):
    """Create NFTResponse with automatic legacy field population"""
    if analysis_details is None and nft.analysis_details:
        analysis_details = safe_serialize_analysis_details(nft.analysis_details)
    
    # Get current listing info if db is provided
    current_listing = None
    if db:
        current_listing = db.query(Listing).filter(
            and_(
                Listing.nft_id == nft.id,
                Listing.status == "active"
            )
        ).first()
    
    # Extract fraud detection info from analysis_details
    is_fraud = False
    confidence_score = None
    reason = None
    if analysis_details:
        is_fraud = analysis_details.get('is_fraud', False)
        confidence_score = analysis_details.get('confidence_score')
        reason = analysis_details.get('reason')
    
    return NFTResponse(
        id=str(nft.id),
        sui_object_id=nft.sui_object_id,
        creator_wallet_address=nft.creator_wallet_address,
        owner_wallet_address=nft.owner_wallet_address,
        title=nft.title,
        description=nft.description,
        image_url=nft.image_url,
        metadata_url=nft.metadata_url,
        attributes=nft.attributes,
        category=nft.category,
        initial_price=float(nft.initial_price) if nft.initial_price else None,
        price=float(current_listing.price) if current_listing else None,
        is_listed=nft.is_listed,
        is_fraud=is_fraud,
        confidence_score=confidence_score,
        reason=reason,
        status="minted",
        analysis_details=analysis_details,
        created_at=nft.created_at,
        updated_at=nft.updated_at,
        wallet_address=nft.creator_wallet_address  # Legacy compatibility
    )

async def analyze_nft_for_fraud_with_db_update(nft_data: NFTData, nft_id: str):
    """Helper function to run fraud analysis and update database"""
    try:
        from database.connection import get_db
        db_gen = get_db()
        db = next(db_gen)
        
        try:
            # Run fraud analysis with database update
            await analyze_nft_for_fraud(nft_data, nft_id, db)
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Error in background fraud analysis for NFT {nft_id}: {e}")

@router.post("/create")
async def create_nft(
    request: NFTCreationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Create a new NFT with fraud analysis
    Step 1 of the 8-step workflow
    """
    nft = None  # Initialize nft to None to prevent UnboundLocalError
    try:
        # Validate wallet addresses
        if not request.creator_wallet_address or not request.owner_wallet_address:
            raise HTTPException(status_code=400, detail="Creator and owner wallet addresses are required")
        
        # Check if user exists, create if not
        user = db.query(User).filter(User.wallet_address == request.creator_wallet_address).first()
        if not user:
            user = User(
                wallet_address=request.creator_wallet_address,
                username=f"User{request.creator_wallet_address[:8]}",
                reputation_score=50.0
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Create NFT data for fraud analysis
        nft_data = NFTData(
            title=request.title,
            description=request.description or "",
            image_url=request.image_url,
            category=request.category or "Uncategorized",
            price=request.initial_price or 0.0
        )
        
        # Create NFT record
        nft = NFT(
            creator_wallet_address=request.creator_wallet_address,
            owner_wallet_address=request.owner_wallet_address,
            title=request.title,
            description=request.description,
            image_url=request.image_url,
            metadata_url=request.metadata_url,
            attributes=request.attributes,
            category=request.category,
            initial_price=request.initial_price,
            is_listed=False,  # Default to unlisted after minting
            sui_object_id=f"temp_{uuid.uuid4()}",  # Temporary ID until minted on blockchain
            analysis_details={
                "status": "pending",
                "created_at": datetime.now().isoformat()
            }
        )
        
        db.add(nft)
        db.commit()
        db.refresh(nft)
        
        # Run fraud analysis in background with database update (AFTER NFT is created)
        background_tasks.add_task(analyze_nft_for_fraud_with_db_update, nft_data, str(nft.id))
        
        logger.info(f"Created NFT: {nft.id} with title: {request.title}")
        
        return {
            "success": True,
            "nft_id": str(nft.id),
            "message": "NFT created successfully. Fraud analysis in progress.",
            "status": "pending_analysis"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        nft_id_str = str(nft.id) if nft and hasattr(nft, 'id') else "N/A (NFT not created)"
        logger.error(f"Error creating NFT (ID: {nft_id_str}): {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating NFT: {str(e)}")

@router.put("/{nft_id}/confirm-mint")
async def confirm_nft_mint(
    nft_id: str,
    sui_object_id: str,
    db: Session = Depends(get_db)
):
    """
    Confirm NFT minting on blockchain
    Step 2 of the 8-step workflow
    """
    try:
        # Validate UUID format
        try:
            uuid.UUID(nft_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid NFT ID format")
        
        nft = db.query(NFT).filter(NFT.id == nft_id).first()
        if not nft:
            raise HTTPException(status_code=404, detail="NFT not found")
        
        # Update NFT with real Sui object ID (replacing temporary ID)
        nft.sui_object_id = sui_object_id
        db.commit()
        
        logger.info(f"Confirmed mint for NFT {nft_id} with Sui object ID: {sui_object_id}")
        
        return {
            "success": True,
            "nft_id": str(nft.id),
            "sui_object_id": sui_object_id,
            "message": "NFT minting confirmed"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming NFT mint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error confirming NFT mint: {str(e)}")

@router.get("/user/{wallet_address}")
async def get_user_nfts(
    wallet_address: str,
    db: Session = Depends(get_db)
):
    """
    Get all NFTs currently owned by a specific wallet address
    This only returns NFTs where the user is the current owner, not just the creator
    """
    try:
        # Get NFTs where the user is the current owner
        # Only show NFTs that the user currently owns, not ones they created but sold
        nfts = db.query(NFT).filter(
            NFT.owner_wallet_address == wallet_address
        ).all()
        
        nft_responses = []
        for nft in nfts:
            # Safely serialize analysis_details
            analysis_details = None
            if nft.analysis_details:
                analysis_details = safe_serialize_analysis_details(nft.analysis_details)
            
            # Get current listing info
            current_listing = db.query(Listing).filter(
                and_(
                    Listing.nft_id == nft.id,
                    Listing.status == "active"
                )
            ).first()
            
            # Extract fraud detection info from analysis_details
            is_fraud = False
            confidence_score = None
            reason = None
            if analysis_details:
                is_fraud = analysis_details.get('is_fraud', False)
                confidence_score = analysis_details.get('confidence_score')
                reason = analysis_details.get('reason')
            
            nft_responses.append(NFTResponse(
                id=str(nft.id),
                sui_object_id=nft.sui_object_id,
                creator_wallet_address=nft.creator_wallet_address,
                owner_wallet_address=nft.owner_wallet_address,
                title=nft.title,
                description=nft.description,
                image_url=nft.image_url,
                metadata_url=nft.metadata_url,
                attributes=nft.attributes,
                category=nft.category,
                initial_price=float(nft.initial_price) if nft.initial_price else None,
                price=float(current_listing.price) if current_listing else None,
                is_listed=nft.is_listed,
                is_fraud=is_fraud,
                confidence_score=confidence_score,
                reason=reason,
                analysis_details=analysis_details,
                created_at=nft.created_at,
                updated_at=nft.updated_at
            ))
        
        return {
            "nfts": nft_responses,
            "total": len(nft_responses),
            "wallet_address": wallet_address
        }
        
    except Exception as e:
        logger.error(f"Error getting user NFTs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting user NFTs: {str(e)}")

@router.get("/user/{wallet_address}/created")
async def get_user_created_nfts(
    wallet_address: str,
    db: Session = Depends(get_db)
):
    """
    Get all NFTs created by a specific wallet address (including ones they sold)
    This returns NFTs where the user is the creator, regardless of current ownership
    """
    try:
        # Get NFTs where the user is the creator
        nfts = db.query(NFT).filter(
            NFT.creator_wallet_address == wallet_address
        ).all()
        
        nft_responses = []
        for nft in nfts:
            # Safely serialize analysis_details
            analysis_details = None
            if nft.analysis_details:
                analysis_details = safe_serialize_analysis_details(nft.analysis_details)
            
            # Get current listing info
            current_listing = db.query(Listing).filter(
                and_(
                    Listing.nft_id == nft.id,
                    Listing.status == "active"
                )
            ).first()
            
            # Extract fraud detection info from analysis_details
            is_fraud = False
            confidence_score = None
            reason = None
            if analysis_details:
                is_fraud = analysis_details.get('is_fraud', False)
                confidence_score = analysis_details.get('confidence_score')
                reason = analysis_details.get('reason')
            
            nft_responses.append(NFTResponse(
                id=str(nft.id),
                sui_object_id=nft.sui_object_id,
                creator_wallet_address=nft.creator_wallet_address,
                owner_wallet_address=nft.owner_wallet_address,
                title=nft.title,
                description=nft.description,
                image_url=nft.image_url,
                metadata_url=nft.metadata_url,
                attributes=nft.attributes,
                category=nft.category,
                initial_price=float(nft.initial_price) if nft.initial_price else None,
                price=float(current_listing.price) if current_listing else None,
                is_listed=nft.is_listed,
                is_fraud=is_fraud,
                confidence_score=confidence_score,
                reason=reason,
                analysis_details=analysis_details,
                created_at=nft.created_at,
                updated_at=nft.updated_at
            ))
        
        return {
            "nfts": nft_responses,
            "total": len(nft_responses),
            "wallet_address": wallet_address,
            "type": "created"
        }
        
    except Exception as e:
        logger.error(f"Error getting user created NFTs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting user created NFTs: {str(e)}")

@router.get("/user/{wallet_address}/overview")
async def get_user_nft_overview(
    wallet_address: str,
    db: Session = Depends(get_db)
):
    """
    Get NFT overview for a user including owned and created NFTs with clear distinction
    """
    try:
        # Get NFTs currently owned by the user
        owned_nfts = db.query(NFT).filter(
            NFT.owner_wallet_address == wallet_address
        ).all()
        
        # Get NFTs created by the user (including sold ones)
        created_nfts = db.query(NFT).filter(
            NFT.creator_wallet_address == wallet_address
        ).all()
        
        # Calculate summary statistics
        total_owned = len(owned_nfts)
        total_created = len(created_nfts)
        
        # Count listed NFTs (from owned NFTs)
        listed_count = db.query(NFT).filter(
            and_(
                NFT.owner_wallet_address == wallet_address,
                NFT.is_listed == True
            )
        ).count()
        
        # Count sold NFTs (created by user but owned by someone else)
        sold_count = db.query(NFT).filter(
            and_(
                NFT.creator_wallet_address == wallet_address,
                NFT.owner_wallet_address != wallet_address
            )
        ).count()
        
        return {
            "wallet_address": wallet_address,
            "summary": {
                "total_owned": total_owned,
                "total_created": total_created,
                "currently_listed": listed_count,
                "sold": sold_count
            },
            "owned_nft_ids": [str(nft.id) for nft in owned_nfts],
            "created_nft_ids": [str(nft.id) for nft in created_nfts]
        }
        
    except Exception as e:
        logger.error(f"Error getting user NFT overview: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting user NFT overview: {str(e)}")

@router.get("/by-wallet/{wallet_address}")
async def get_nfts_by_wallet(
    wallet_address: str,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Get NFTs currently owned by wallet address with pagination
    This only returns NFTs where the user is the current owner, not just the creator
    """
    try:
        offset = (page - 1) * limit
        
        # Get total count of NFTs currently owned by this wallet
        total_count = db.query(NFT).filter(
            NFT.owner_wallet_address == wallet_address
        ).count()
        
        # Get paginated results of NFTs currently owned by this wallet
        nfts = db.query(NFT).filter(
            NFT.owner_wallet_address == wallet_address
        ).offset(offset).limit(limit).all()
        
        nft_responses = []
        for nft in nfts:
            # Safely serialize analysis_details
            analysis_details = None
            if nft.analysis_details:
                analysis_details = safe_serialize_analysis_details(nft.analysis_details)
            
            # Extract fraud detection info from analysis_details
            is_fraud = False
            confidence_score = None
            reason = None
            if analysis_details:
                is_fraud = analysis_details.get('is_fraud', False)
                confidence_score = analysis_details.get('confidence_score')
                reason = analysis_details.get('reason')
            
            nft_responses.append(NFTResponse(
                id=str(nft.id),
                sui_object_id=nft.sui_object_id,
                creator_wallet_address=nft.creator_wallet_address,
                owner_wallet_address=nft.owner_wallet_address,
                title=nft.title,
                description=nft.description,
                image_url=nft.image_url,
                metadata_url=nft.metadata_url,
                attributes=nft.attributes,
                category=nft.category,
                initial_price=float(nft.initial_price) if nft.initial_price else None,
                is_fraud=is_fraud,
                confidence_score=confidence_score,
                reason=reason,
                analysis_details=analysis_details,
                created_at=nft.created_at,
                updated_at=nft.updated_at,
                wallet_address=nft.creator_wallet_address  # Legacy compatibility
            ))
        
        return {
            "nfts": nft_responses,
            "total": total_count,
            "page": page,
            "limit": limit,
            "total_pages": math.ceil(total_count / limit),
            "wallet_address": wallet_address
        }
        
    except Exception as e:
        logger.error(f"Error getting NFTs by wallet: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting NFTs by wallet: {str(e)}")

@router.get("/marketplace")
async def get_marketplace_nfts(
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Get NFTs available in marketplace (with listings)
    """
    try:
        offset = (page - 1) * limit
        
        # Get NFTs that have active listings
        query = db.query(NFT).join(Listing).filter(
            Listing.status == "active"
        )
        
        total_count = query.count()
        nfts = query.offset(offset).limit(limit).all()
        
        nft_responses = []
        for nft in nfts:
            # Get the active listing for this NFT
            listing = db.query(Listing).filter(
                and_(
                    Listing.nft_id == nft.id,
                    Listing.status == "active"
                )
            ).first()
            
            # Safely serialize analysis_details
            analysis_details = None
            if nft.analysis_details:
                analysis_details = safe_serialize_analysis_details(nft.analysis_details)
            
            # Extract fraud detection info from analysis_details
            is_fraud = False
            confidence_score = None
            reason = None
            if analysis_details:
                is_fraud = analysis_details.get('is_fraud', False)
                confidence_score = analysis_details.get('confidence_score')
                reason = analysis_details.get('reason')
            
            nft_response = NFTResponse(
                id=str(nft.id),
                sui_object_id=nft.sui_object_id,
                creator_wallet_address=nft.creator_wallet_address,
                owner_wallet_address=nft.owner_wallet_address,
                title=nft.title,
                description=nft.description,
                image_url=nft.image_url,
                metadata_url=nft.metadata_url,
                attributes=nft.attributes,
                category=nft.category,
                initial_price=float(nft.initial_price) if nft.initial_price else None,
                price=float(listing.price) if listing else None,
                is_listed=nft.is_listed,
                is_fraud=is_fraud,
                confidence_score=confidence_score,
                reason=reason,
                analysis_details=analysis_details,
                created_at=nft.created_at,
                updated_at=nft.updated_at,
                wallet_address=nft.creator_wallet_address  # Legacy compatibility
            )
            
            # Add listing information
            nft_responses.append({
                "nft": nft_response,
                "listing": {
                    "id": str(listing.id) if listing else None,
                    "price": float(listing.price) if listing else None,
                    "seller": listing.seller_wallet_address if listing else None,
                    "status": listing.status if listing else None,
                    "created_at": listing.created_at if listing else None
                } if listing else None
            })
        
        return {
            "nfts": nft_responses,
            "total": total_count,
            "page": page,
            "limit": limit,
            "total_pages": math.ceil(total_count / limit)
        }
        
    except Exception as e:
        logger.error(f"Error getting marketplace NFTs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting marketplace NFTs: {str(e)}")

@router.get("/all")
async def get_all_nfts(
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get all NFTs with optional filtering
    """
    try:
        offset = (page - 1) * limit
        
        query = db.query(NFT)
        
        # Apply status filter if provided
        if status:
            # Note: status field doesn't exist in database model, so we'll filter by analysis_details status
            if status == "analyzed":
                query = query.filter(NFT.analysis_details.isnot(None))
            elif status == "pending":
                query = query.filter(
                    or_(
                        NFT.analysis_details.is_(None),
                        NFT.analysis_details.contains({"status": "pending"})
                    )
                )
        
        total_count = query.count()
        nfts = query.offset(offset).limit(limit).all()
        
        nft_responses = []
        for nft in nfts:
            # Safely serialize analysis_details
            analysis_details = None
            if nft.analysis_details:
                analysis_details = safe_serialize_analysis_details(nft.analysis_details)
            
            # Extract fraud detection info from analysis_details
            is_fraud = False
            confidence_score = None
            reason = None
            if analysis_details:
                is_fraud = analysis_details.get('is_fraud', False)
                confidence_score = analysis_details.get('confidence_score')
                reason = analysis_details.get('reason')
            
            nft_responses.append(NFTResponse(
                id=str(nft.id),
                sui_object_id=nft.sui_object_id,
                creator_wallet_address=nft.creator_wallet_address,
                owner_wallet_address=nft.owner_wallet_address,
                title=nft.title,
                description=nft.description,
                image_url=nft.image_url,
                metadata_url=nft.metadata_url,
                attributes=nft.attributes,
                category=nft.category,
                initial_price=float(nft.initial_price) if nft.initial_price else None,
                is_fraud=is_fraud,
                confidence_score=confidence_score,
                reason=reason,
                analysis_details=analysis_details,
                created_at=nft.created_at,
                updated_at=nft.updated_at,
                wallet_address=nft.creator_wallet_address  # Legacy compatibility
            ))
        
        return {
            "nfts": nft_responses,
            "total": total_count,
            "page": page,
            "limit": limit,
            "total_pages": math.ceil(total_count / limit)
        }
        
    except Exception as e:
        logger.error(f"Error getting all NFTs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting all NFTs: {str(e)}")

@router.get("/{nft_id}")
async def get_nft_details(
    nft_id: str,
    db: Session = Depends(get_db)
):
    """
    Get detailed information for a specific NFT
    """
    try:
        # Validate UUID format
        try:
            uuid.UUID(nft_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid NFT ID format")
        
        nft = db.query(NFT).filter(NFT.id == nft_id).first()
        if not nft:
            raise HTTPException(status_code=404, detail="NFT not found")
        
        # Get user information
        creator_user = db.query(User).filter(User.wallet_address == nft.creator_wallet_address).first()
        owner_user = db.query(User).filter(User.wallet_address == nft.owner_wallet_address).first()
        
        # Safely serialize analysis_details
        analysis_details = None
        if nft.analysis_details:
            analysis_details = safe_serialize_analysis_details(nft.analysis_details)
        
        # Get active listing if exists
        active_listing = db.query(Listing).filter(
            and_(
                Listing.nft_id == nft.id,
                Listing.status == "active"
            )
        ).first()
        
        # Extract fraud detection info from analysis_details
        is_fraud = False
        confidence_score = None
        reason = None
        if analysis_details:
            is_fraud = analysis_details.get('is_fraud', False)
            confidence_score = analysis_details.get('confidence_score')
            reason = analysis_details.get('reason')
        
        return {
            "nft": NFTResponse(
                id=str(nft.id),
                sui_object_id=nft.sui_object_id,
                creator_wallet_address=nft.creator_wallet_address,
                owner_wallet_address=nft.owner_wallet_address,
                title=nft.title,
                description=nft.description,
                image_url=nft.image_url,
                metadata_url=nft.metadata_url,
                attributes=nft.attributes,
                category=nft.category,
                initial_price=float(nft.initial_price) if nft.initial_price else None,
                price=float(active_listing.price) if active_listing else None,
                is_listed=nft.is_listed,
                is_fraud=is_fraud,
                confidence_score=confidence_score,
                reason=reason,
                status="minted",
                analysis_details=analysis_details,
                created_at=nft.created_at,
                updated_at=nft.updated_at,
                wallet_address=nft.creator_wallet_address  # Legacy compatibility
            ),
            "creator": {
                "wallet_address": nft.creator_wallet_address,
                "username": creator_user.username if creator_user else f"User{nft.creator_wallet_address[:8]}",
                "reputation_score": float(creator_user.reputation_score) if creator_user else 50.0
            },
            "owner": {
                "wallet_address": nft.owner_wallet_address,
                "username": owner_user.username if owner_user else f"User{nft.owner_wallet_address[:8]}",
                "reputation_score": float(owner_user.reputation_score) if owner_user else 50.0
            },
            "listing": {
                "id": str(active_listing.id),
                "price": float(active_listing.price),
                "seller": active_listing.seller_wallet_address,
                "status": active_listing.status,
                "created_at": active_listing.created_at,
                "expires_at": active_listing.expires_at
            } if active_listing else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting NFT details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting NFT details: {str(e)}")

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
            uuid.UUID(nft_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid NFT ID format")
        
        nft = db.query(NFT).filter(NFT.id == nft_id).first()
        if not nft:
            logger.warning(f"NFT not found with ID: {nft_id}")
            return {
                "nft_id": nft_id,
                "analysis_details": {},
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
            "status": analysis_details.get("status", "unknown"),
            "analyzed_at": analysis_details.get("analyzed_at") or nft.created_at.isoformat() if nft.created_at else None
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
            db.commit()
            logger.info(f"Updated existing NFT {notification.nft_id} with Sui object ID")
        else:
            # This is a new NFT minted directly on chain, analyze it
            logger.info(f"New NFT minted on chain: {notification.sui_object_id}")
            
                    # Run fraud analysis in background with database update
        background_tasks.add_task(
            analyze_external_nft_with_db_update, 
            notification
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

async def analyze_external_nft_with_db_update(notification: NFTMintedNotification):
    """Analyze NFT that was minted directly on chain (not through our frontend) with database update"""
    try:
        from database.connection import get_db
        db_gen = get_db()
        db = next(db_gen)
        
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
                creator_wallet_address=notification.creator,
                owner_wallet_address=notification.creator,
                title=notification.name,
                description=notification.description,
                image_url=notification.image_url,
                sui_object_id=notification.sui_object_id,  # External NFTs already have blockchain ID
                category="External",
                initial_price=0.0,
                is_listed=False,  # Default to unlisted for external NFTs
                analysis_details={
                    "status": "pending",
                    "created_at": datetime.now().isoformat()
                },
                embedding_vector=image_embedding,  # Store description-based embedding
            )
            
            db.add(nft)
            db.commit()
            db.refresh(nft)
            
            # Run fraud analysis with database update
            await analyze_nft_for_fraud(nft_data, str(nft.id), db)
            
            logger.info(f"Analyzed external NFT: {notification.sui_object_id}, analysis completed")
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error analyzing external NFT: {str(e)}")
        if 'db' in locals():
            db.rollback()

async def analyze_external_nft(notification: NFTMintedNotification, db: Session):
    """Legacy function - kept for backward compatibility"""
    await analyze_external_nft_with_db_update(notification)

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
                    creator_user = db.query(User).filter(User.wallet_address == nft.creator_wallet_address).first()
                    
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
                            sui_object_id=nft.sui_object_id,
                            creator_wallet_address=nft.creator_wallet_address,
                            owner_wallet_address=nft.owner_wallet_address,
                            title=nft.title,
                            description=nft.description,
                            image_url=nft.image_url,
                            metadata_url=nft.metadata_url,
                            attributes=nft.attributes,
                            category=nft.category,
                            initial_price=float(nft.initial_price) if nft.initial_price else None,
                            analysis_details=analysis_details,
                            created_at=nft.created_at,
                            updated_at=nft.updated_at
                        ),
                        "similarity_score": round(similarity_score, 4),
                        "creator": {
                            "wallet_address": nft.creator_wallet_address,
                            "username": creator_user.username if creator_user else f"User{nft.creator_wallet_address[:8]}",
                            "reputation_score": float(creator_user.reputation_score) if creator_user else 50.0
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
                        "creator": similar_nft.creator_wallet_address,
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
        
        creator_user = db.query(User).filter(User.wallet_address == nft.creator_wallet_address).first()
        
        return {
            "nft_id": str(nft.id),
            "title": nft.title,
            "sui_object_id": nft.sui_object_id,
            "analysis_details": nft.analysis_details,
            "created_at": nft.created_at,
            "creator": {
                "wallet_address": nft.creator_wallet_address,
                "username": creator_user.username if creator_user else f"User{nft.creator_wallet_address[:8]}"
            },
            "fraud_analysis": {
                "has_analysis": bool(nft.analysis_details),
                "has_embedding": nft.embedding_vector is not None
            },
            "next_steps": {
                "pending": "Mint on blockchain",
                "minted": "List for sale",
                "listed": "Ready for purchase"
            }.get(nft.analysis_details.get("status", "unknown") if nft.analysis_details else "unknown", "Unknown status")
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
            status = nft.analysis_details.get("status", "unknown") if nft.analysis_details else "unknown"
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
                    "status": nft.analysis_details.get("status", "unknown") if nft.analysis_details else "unknown",
                    "sui_object_id": nft.sui_object_id,
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
                creator_wallet_address,
                embedding_vector <=> :embedding as distance
            FROM nfts 
            WHERE embedding_vector IS NOT NULL 
            AND id != :current_nft_id
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
                        "creator_wallet_address": row.creator_wallet_address,
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

@router.post("/notify-listed")
async def notify_nft_listed(
    notification: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Frontend notifies backend when an NFT is listed on Sui blockchain
    """
    try:
        logger.info(f"Received NFT listing notification: {notification}")

        nft_id = notification.get("nft_id")
        listing_id = notification.get("listing_id")
        transaction_digest = notification.get("transaction_digest")
        price = notification.get("price")

        if not nft_id:
            raise HTTPException(status_code=400, detail="NFT ID is required")

        # Find the NFT
        nft = db.query(NFT).filter(NFT.id == nft_id).first()
        if not nft:
            raise HTTPException(status_code=404, detail="NFT not found")

        # Update NFT listing status
        nft.is_listed = True

        # Record transaction history
        transaction = TransactionHistory(
            nft_id=nft_id,
            listing_id=None,  # We'll update this when we get the listing from database
            seller_wallet_address=nft.owner_wallet_address,
            buyer_wallet_address="",  # No buyer for listing
            price=price or 0,
            transaction_type="listing",
            status="completed",
            blockchain_tx_id=transaction_digest or "",
            gas_fee=0.0
        )

        db.add(transaction)
        db.commit()

        logger.info(f"Updated NFT {nft_id} listing status after blockchain transaction")

        return {
            "success": True,
            "message": "NFT listing notification processed",
            "nft_id": nft_id,
            "transaction_digest": transaction_digest
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing NFT listing notification: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing notification: {str(e)}")

@router.post("/notify-unlisted")
async def notify_nft_unlisted(
    notification: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Frontend notifies backend when an NFT is unlisted on Sui blockchain
    """
    try:
        logger.info(f"Received NFT unlisting notification: {notification}")

        nft_id = notification.get("nft_id")
        listing_id = notification.get("listing_id")
        transaction_digest = notification.get("transaction_digest")

        if not nft_id:
            raise HTTPException(status_code=400, detail="NFT ID is required")

        # Find the NFT
        nft = db.query(NFT).filter(NFT.id == nft_id).first()
        if not nft:
            raise HTTPException(status_code=404, detail="NFT not found")

        # Find and cancel the active listing for this NFT
        active_listing = db.query(Listing).filter(
            and_(
                Listing.nft_id == nft_id,
                Listing.status == "active"
            )
        ).first()

        if active_listing:
            # Cancel the listing
            active_listing.status = "cancelled"
            active_listing.updated_at = datetime.utcnow()

            # Update NFT listing status
            nft.is_listed = False

            # Record transaction history
            transaction = TransactionHistory(
                nft_id=nft_id,
                listing_id=active_listing.id,
                seller_wallet_address=active_listing.seller_wallet_address,
                buyer_wallet_address="",  # No buyer for unlisting
                price=active_listing.price,
                transaction_type="unlisting",
                status="completed",
                blockchain_tx_id=transaction_digest or "",
                gas_fee=0.0
            )

            db.add(transaction)
            db.commit()

            logger.info(f"Unlisted NFT {nft_id} - cancelled listing {active_listing.id}")

            return {
                "success": True,
                "message": "NFT unlisting notification processed",
                "nft_id": nft_id,
                "listing_id": str(active_listing.id),
                "transaction_digest": transaction_digest
            }
        else:
            # Just update the NFT status even if no active listing found
            nft.is_listed = False
            db.commit()

            logger.warning(f"No active listing found for NFT {nft_id}, but updated NFT status")

            return {
                "success": True,
                "message": "NFT status updated (no active listing found)",
                "nft_id": nft_id,
                "transaction_digest": transaction_digest
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing NFT unlisting notification: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error processing notification: {str(e)}")

@router.put("/{nft_id}/unlist")
async def unlist_nft(
    nft_id: str,
    db: Session = Depends(get_db)
):
    """
    Unlist an NFT by cancelling its active listing
    """
    try:
        # Validate UUID format
        try:
            uuid.UUID(nft_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid NFT ID format")

        # Find the NFT
        nft = db.query(NFT).filter(NFT.id == nft_id).first()
        if not nft:
            raise HTTPException(status_code=404, detail="NFT not found")

        # Find and cancel the active listing for this NFT
        active_listing = db.query(Listing).filter(
            and_(
                Listing.nft_id == nft_id,
                Listing.status == "active"
            )
        ).first()

        if active_listing:
            # Cancel the listing
            active_listing.status = "cancelled"
            active_listing.updated_at = datetime.utcnow()

            # Update NFT listing status
            nft.is_listed = False

            # Record transaction history
            transaction = TransactionHistory(
                nft_id=nft_id,
                listing_id=active_listing.id,
                seller_wallet_address=active_listing.seller_wallet_address,
                buyer_wallet_address="",  # No buyer for unlisting
                price=active_listing.price,
                transaction_type="unlisting",
                status="completed",
                blockchain_tx_id="",  # No blockchain transaction for unlisting
                gas_fee=0.0
            )

            db.add(transaction)
            db.commit()

            logger.info(f"Unlisted NFT {nft_id} - cancelled listing {active_listing.id}")

            return {
                "success": True,
                "message": "NFT unlisted successfully",
                "nft_id": nft_id,
                "listing_id": str(active_listing.id)
            }
        else:
            raise HTTPException(status_code=404, detail="No active listing found for this NFT")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unlisting NFT {nft_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error unlisting NFT: {str(e)}")

class ObjectIdUpdateRequest(BaseModel):
    new_sui_object_id: str

@router.put("/{nft_id}/update-object-id")
async def update_nft_object_id(
    nft_id: str,
    request: ObjectIdUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Update the Sui object ID for an NFT after blockchain operations
    This is crucial after unlisting when the NFT object ID may change
    """
    try:
        # Validate UUID format
        try:
            uuid.UUID(nft_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid NFT ID format")

        # Find the NFT
        nft = db.query(NFT).filter(NFT.id == nft_id).first()
        if not nft:
            raise HTTPException(status_code=404, detail="NFT not found")

        # Update the object ID
        old_object_id = nft.sui_object_id
        nft.sui_object_id = request.new_sui_object_id
        nft.updated_at = datetime.utcnow()

        db.commit()

        logger.info(f"Updated NFT {nft_id} object ID from {old_object_id} to {request.new_sui_object_id}")

        return {
            "success": True,
            "message": "NFT object ID updated successfully",
            "nft_id": nft_id,
            "old_object_id": old_object_id,
            "new_object_id": request.new_sui_object_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating NFT {nft_id} object ID: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating object ID: {str(e)}")