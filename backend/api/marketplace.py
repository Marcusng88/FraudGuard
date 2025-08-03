"""
Marketplace API endpoints for FraudGuard
Handles NFT marketplace operations including listing, filtering, and details
"""
import math
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, func
from pydantic import BaseModel

from database.connection import get_db
from models.database import (
    NFT, User, FraudFlag, Trade,
    NFTResponse, NFTDetailResponse, MarketplaceFilters, 
    MarketplaceResponse, MarketplaceStats, ThreatLevel
)

# Import fraud detection functionality
try:
    from agent.fraud_detector import analyze_nft_for_fraud, NFTData
    from agent.sui_client import sui_client
except ImportError:
    try:
        from backend.agent.fraud_detector import analyze_nft_for_fraud, NFTData
        from backend.agent.sui_client import sui_client
    except ImportError:
        # Fallback for development
        analyze_nft_for_fraud = None
        NFTData = None
        sui_client = None

# Request models
class NFTCreationRequest(BaseModel):
    """Request model for new NFT creation notification"""
    nftId: str
    name: str
    description: str
    imageUrl: str
    creator: str

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])

@router.get("/nfts", response_model=MarketplaceResponse)
async def get_marketplace_nfts(
    search: Optional[str] = Query(None, description="Search in NFT names and descriptions"),
    threat_level: Optional[ThreatLevel] = Query(None, description="Filter by threat level"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price in SUI"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price in SUI"),
    creator_verified: Optional[bool] = Query(None, description="Filter by creator verification status"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db)
):
    """
    Get marketplace NFT listings with filtering and pagination
    """
    try:
        # Base query for active listings
        query = db.query(NFT).options(
            joinedload(NFT.creator),
            joinedload(NFT.owner),
            joinedload(NFT.fraud_flags)
        ).filter(
            and_(
                NFT.listing_status == "active",
                NFT.is_listed == True
            )
        )
        
        # Apply filters
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    NFT.name.ilike(search_term),
                    NFT.description.ilike(search_term)
                )
            )
        
        if threat_level:
            query = query.filter(NFT.threat_level == threat_level.value)
        
        if min_price is not None:
            query = query.filter(NFT.price_sui >= min_price)
        
        if max_price is not None:
            query = query.filter(NFT.price_sui <= max_price)
        
        if creator_verified is not None:
            query = query.join(NFT.creator).filter(User.is_verified == creator_verified)
        
        # Get total count for pagination
        total = query.count()
        
        # Apply pagination and ordering
        query = query.order_by(desc(NFT.listed_at)).offset((page - 1) * limit).limit(limit)
        
        nfts = query.all()
        
        # Convert to response format
        nft_responses = []
        for nft in nfts:
            # Check for active fraud flags
            has_active_flags = any(flag.is_active for flag in nft.fraud_flags)
            
            nft_response = NFTResponse(
                id=str(nft.id),
                nft_id=nft.nft_id,
                name=nft.name,
                description=nft.description,
                image_url=nft.image_url,
                price_sui=float(nft.price_sui) if nft.price_sui else None,
                currency=nft.currency,
                threat_level=ThreatLevel(nft.threat_level),
                confidence_score=float(nft.confidence_score) if nft.confidence_score else None,
                created_at=nft.created_at,
                listed_at=nft.listed_at,
                creator={
                    "sui_address": nft.creator.sui_address,
                    "display_name": nft.creator.display_name,
                    "avatar_url": nft.creator.avatar_url,
                    "is_verified": nft.creator.is_verified,
                    "reputation_score": nft.creator.reputation_score
                },
                owner={
                    "sui_address": nft.owner.sui_address,
                    "display_name": nft.owner.display_name,
                    "avatar_url": nft.owner.avatar_url,
                    "is_verified": nft.owner.is_verified,
                    "reputation_score": nft.owner.reputation_score
                },
                fraud_flags=[
                    {
                        "flag_id": flag.flag_id,
                        "reason": flag.reason,
                        "flag_type": flag.flag_type,
                        "confidence": float(flag.confidence),
                        "flagged_by_address": flag.flagged_by_address,
                        "is_active": flag.is_active,
                        "created_at": flag.created_at
                    }
                    for flag in nft.fraud_flags if flag.is_active
                ],
                has_active_flags=has_active_flags
            )
            nft_responses.append(nft_response)
        
        total_pages = math.ceil(total / limit)
        
        return MarketplaceResponse(
            nfts=nft_responses,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching marketplace NFTs: {str(e)}")

@router.get("/nfts/{nft_id}", response_model=NFTDetailResponse)
async def get_nft_details(
    nft_id: str,
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific NFT
    """
    try:
        # Query NFT with all related data
        nft = db.query(NFT).options(
            joinedload(NFT.creator),
            joinedload(NFT.owner),
            joinedload(NFT.fraud_flags),
            joinedload(NFT.trades).joinedload(Trade.buyer),
            joinedload(NFT.trades).joinedload(Trade.seller)
        ).filter(NFT.nft_id == nft_id).first()
        
        if not nft:
            raise HTTPException(status_code=404, detail="NFT not found")
        
        # Check for active fraud flags
        has_active_flags = any(flag.is_active for flag in nft.fraud_flags)
        
        # Prepare trade history
        trades = []
        for trade in nft.trades:
            if trade.transaction_status == "confirmed":
                trades.append({
                    "transaction_id": trade.transaction_id,
                    "seller_address": trade.seller_address,
                    "buyer_address": trade.buyer_address,
                    "price_sui": float(trade.price_sui),
                    "currency": trade.currency,
                    "trade_type": trade.trade_type,
                    "confirmed_at": trade.confirmed_at
                })
        
        return NFTDetailResponse(
            id=str(nft.id),
            nft_id=nft.nft_id,
            name=nft.name,
            description=nft.description,
            image_url=nft.image_url,
            metadata_url=nft.metadata_url,
            price_sui=float(nft.price_sui) if nft.price_sui else None,
            currency=nft.currency,
            is_listed=nft.is_listed,
            listing_status=nft.listing_status,
            threat_level=ThreatLevel(nft.threat_level),
            confidence_score=float(nft.confidence_score) if nft.confidence_score else None,
            created_at=nft.created_at,
            listed_at=nft.listed_at,
            creator={
                "sui_address": nft.creator.sui_address,
                "display_name": nft.creator.display_name,
                "avatar_url": nft.creator.avatar_url,
                "is_verified": nft.creator.is_verified,
                "reputation_score": nft.creator.reputation_score
            },
            owner={
                "sui_address": nft.owner.sui_address,
                "display_name": nft.owner.display_name,
                "avatar_url": nft.owner.avatar_url,
                "is_verified": nft.owner.is_verified,
                "reputation_score": nft.owner.reputation_score
            },
            fraud_flags=[
                {
                    "flag_id": flag.flag_id,
                    "reason": flag.reason,
                    "flag_type": flag.flag_type,
                    "confidence": float(flag.confidence),
                    "flagged_by_address": flag.flagged_by_address,
                    "is_active": flag.is_active,
                    "created_at": flag.created_at
                }
                for flag in nft.fraud_flags if flag.is_active
            ],
            has_active_flags=has_active_flags,
            trades=trades
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching NFT details: {str(e)}")

@router.get("/stats", response_model=MarketplaceStats)
async def get_marketplace_stats(db: Session = Depends(get_db)):
    """
    Get marketplace statistics
    """
    try:
        # Calculate stats from database
        total_nfts = db.query(func.count(NFT.id)).scalar()
        active_listings = db.query(func.count(NFT.id)).filter(
            and_(NFT.listing_status == "active", NFT.is_listed == True)
        ).scalar()
        verified_nfts = db.query(func.count(NFT.id)).filter(NFT.threat_level == "safe").scalar()
        
        # Count NFTs with active fraud flags
        flagged_nfts = db.query(func.count(NFT.id.distinct())).join(FraudFlag).filter(
            FraudFlag.is_active == True
        ).scalar()
        
        # Calculate total volume from confirmed trades
        total_volume = db.query(func.sum(Trade.price_sui)).filter(
            Trade.transaction_status == "confirmed"
        ).scalar() or 0
        
        return MarketplaceStats(
            total_nfts=total_nfts,
            active_listings=active_listings,
            verified_nfts=verified_nfts,
            flagged_nfts=flagged_nfts,
            total_volume_sui=float(total_volume)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching marketplace stats: {str(e)}")

@router.get("/featured", response_model=List[NFTResponse])
async def get_featured_nfts(
    limit: int = Query(6, ge=1, le=20, description="Number of featured NFTs"),
    db: Session = Depends(get_db)
):
    """
    Get featured NFTs (high-quality, verified NFTs)
    """
    try:
        # Get verified NFTs with high confidence scores
        nfts = db.query(NFT).options(
            joinedload(NFT.creator),
            joinedload(NFT.owner),
            joinedload(NFT.fraud_flags)
        ).filter(
            and_(
                NFT.listing_status == "active",
                NFT.is_listed == True,
                NFT.threat_level == "safe",
                NFT.confidence_score >= 0.8
            )
        ).join(NFT.creator).filter(
            User.is_verified == True
        ).order_by(
            desc(NFT.confidence_score),
            desc(NFT.listed_at)
        ).limit(limit).all()
        
        # Convert to response format
        featured_nfts = []
        for nft in nfts:
            nft_response = NFTResponse(
                id=str(nft.id),
                nft_id=nft.nft_id,
                name=nft.name,
                description=nft.description,
                image_url=nft.image_url,
                price_sui=float(nft.price_sui) if nft.price_sui else None,
                currency=nft.currency,
                threat_level=ThreatLevel(nft.threat_level),
                confidence_score=float(nft.confidence_score) if nft.confidence_score else None,
                created_at=nft.created_at,
                listed_at=nft.listed_at,
                creator={
                    "sui_address": nft.creator.sui_address,
                    "display_name": nft.creator.display_name,
                    "avatar_url": nft.creator.avatar_url,
                    "is_verified": nft.creator.is_verified,
                    "reputation_score": nft.creator.reputation_score
                },
                owner={
                    "sui_address": nft.owner.sui_address,
                    "display_name": nft.owner.display_name,
                    "avatar_url": nft.owner.avatar_url,
                    "is_verified": nft.owner.is_verified,
                    "reputation_score": nft.owner.reputation_score
                },
                fraud_flags=[],
                has_active_flags=False
            )
            featured_nfts.append(nft_response)
        
        return featured_nfts
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching featured NFTs: {str(e)}")


@router.post("/nft/analyze")
async def analyze_new_nft(
    request: NFTCreationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Analyze a newly created NFT for fraud indicators
    This endpoint is called by the frontend after NFT minting
    """
    try:
        # Store NFT in database first
        # Check if user exists, create if not
        creator = db.query(User).filter(User.sui_address == request.creator).first()
        if not creator:
            creator = User(
                sui_address=request.creator,
                display_name=f"User {request.creator[:8]}...",
                reputation_score=50,  # Default reputation
                is_verified=False
            )
            db.add(creator)
            db.commit()
            db.refresh(creator)

        # Check if NFT already exists
        existing_nft = db.query(NFT).filter(NFT.nft_id == request.nftId).first()
        if existing_nft:
            return {
                "success": True,
                "message": "NFT already exists in database",
                "nft_id": request.nftId,
                "analysis_status": "skipped"
            }

        # Create NFT record
        nft = NFT(
            nft_id=request.nftId,
            name=request.name,
            description=request.description,
            image_url=request.imageUrl,
            creator_address=request.creator,
            current_owner_address=request.creator,  # Initially owned by creator
            threat_level="safe",  # Default to safe, will be updated after analysis
            confidence_score=0.0,
            is_listed=False,  # Not listed initially
            listing_status="unlisted"
        )
        
        db.add(nft)
        db.commit()
        db.refresh(nft)

        # Run fraud analysis in background
        if analyze_nft_for_fraud and NFTData:
            background_tasks.add_task(
                run_fraud_analysis,
                nft_id=request.nftId,
                nft_data=NFTData(
                    object_id=request.nftId,
                    name=request.name,
                    description=request.description,
                    image_url=request.imageUrl,
                    creator=request.creator,
                    created_at=int(datetime.now().timestamp()),
                    metadata="{}",
                    collection=""
                )
            )

        return {
            "success": True,
            "message": "NFT received and queued for analysis",
            "nft_id": request.nftId,
            "analysis_status": "queued"
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error processing NFT: {str(e)}")


async def run_fraud_analysis(nft_id: str, nft_data):
    """Background task to run fraud analysis"""
    try:
        if analyze_nft_for_fraud:
            result = await analyze_nft_for_fraud(nft_data)
            
            # Update NFT with analysis results
            # Note: This would need a proper database session in a real implementation
            print(f"Fraud analysis complete for {nft_id}: {result}")
            
    except Exception as e:
        print(f"Error in fraud analysis for {nft_id}: {e}")
