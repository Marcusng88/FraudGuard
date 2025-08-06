"""
Marketplace API endpoints for FraudGuard
Handles NFT marketplace operations including listing, filtering, and details
"""
import math
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, func
from pydantic import BaseModel
from enum import Enum
import logging

logger = logging.getLogger(__name__)

# Import database connection and models
try:
    from database.connection import get_db
    from models.database import User, NFT, Listing, FraudFlag
except ImportError:
    try:
        from backend.database.connection import get_db
        from backend.models.database import User, NFT, Listing, FraudFlag
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
        
        # Fallback model imports
        from models.database import User, NFT, Listing, FraudFlag

# Response Models
class ThreatLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

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
    analysis_details: Optional[Dict[str, Any]] = None

class NFTDetailResponse(BaseModel):
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
    flag_type: Optional[int]
    reason: Optional[str]
    status: str
    created_at: datetime
    analysis_details: Optional[Dict[str, Any]] = None

class MarketplaceResponse(BaseModel):
    nfts: List[NFTResponse]
    total: int
    page: int
    limit: int
    total_pages: int

class MarketplaceStats(BaseModel):
    total_nfts: int
    total_volume: float
    average_price: float
    fraud_detection_rate: float

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
    title: str
    description: str
    category: str
    price: float
    image_url: str
    wallet_address: str
    sui_object_id: Optional[str] = None

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
        # Base query for NFTs with status 'minted' or 'active'
        # For hackathon: show all NFTs including flagged ones
        query = db.query(NFT).filter(
            NFT.status.in_(["minted", "active"])
        )
        
        # Note: For production, you might want to filter out high-confidence fraud NFTs
        # query = query.filter(NFT.is_fraud == False)
        
        # Apply filters
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    NFT.title.ilike(search_term),
                    NFT.description.ilike(search_term)
                )
            )
        
        if min_price is not None:
            query = query.filter(NFT.price >= min_price)
        
        if max_price is not None:
            query = query.filter(NFT.price <= max_price)
        
        # Get total count for pagination
        total = query.count()
        
        # Apply pagination and ordering
        query = query.order_by(desc(NFT.created_at)).offset((page - 1) * limit).limit(limit)
        
        nfts = query.all()
        
        # Convert to response format
        nft_responses = []
        for nft in nfts:
            # Safely serialize analysis_details if it exists
            analysis_details = nft.analysis_details
            if analysis_details is not None:
                try:
                    # Import the safe serialization function
                    from api.nft import safe_serialize_analysis_details
                    analysis_details = safe_serialize_analysis_details(analysis_details)
                except ImportError:
                    # Fallback if import fails
                    if not isinstance(analysis_details, dict):
                        analysis_details = {"raw_result": str(analysis_details)}
                except Exception as serialization_error:
                    logger.error(f"Error serializing analysis_details: {serialization_error}")
                    # Fallback to a safe default
                    analysis_details = {
                        "error": f"Serialization failed: {str(serialization_error)}",
                        "raw_data": str(analysis_details)
                    }
            
            nft_response = NFTResponse(
                id=str(nft.id),
                title=nft.title,
                description=nft.description,
                category=nft.category,
                price=float(nft.price),
                image_url=nft.image_url,
                wallet_address=nft.wallet_address,
                sui_object_id=nft.sui_object_id,
                is_fraud=nft.is_fraud,
                confidence_score=nft.confidence_score,
                status=nft.status,
                created_at=nft.created_at,
                analysis_details=analysis_details
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
        # Query NFT by ID
        nft = db.query(NFT).filter(NFT.id == nft_id).first()
        
        if not nft:
            raise HTTPException(status_code=404, detail="NFT not found")
        
        # Safely serialize analysis_details if it exists
        analysis_details = nft.analysis_details
        if analysis_details is not None:
            try:
                # Import the safe serialization function
                from api.nft import safe_serialize_analysis_details
                analysis_details = safe_serialize_analysis_details(analysis_details)
            except ImportError:
                # Fallback if import fails
                if not isinstance(analysis_details, dict):
                    analysis_details = {"raw_result": str(analysis_details)}
        
        return NFTDetailResponse(
            id=str(nft.id),
            title=nft.title,
            description=nft.description,
            category=nft.category,
            price=float(nft.price),
            image_url=nft.image_url,
            wallet_address=nft.wallet_address,
            sui_object_id=nft.sui_object_id,
            is_fraud=nft.is_fraud,
            confidence_score=nft.confidence_score,
            flag_type=nft.flag_type,
            reason=nft.reason,
            status=nft.status,
            created_at=nft.created_at,
            analysis_details=analysis_details
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
        
        # Count safe NFTs (not flagged as fraud)
        safe_nfts = db.query(func.count(NFT.id)).filter(NFT.is_fraud == False).scalar()
        
        # Count flagged NFTs
        flagged_nfts = db.query(func.count(NFT.id)).filter(NFT.is_fraud == True).scalar()
        
        # Calculate average price
        avg_price = db.query(func.avg(NFT.price)).scalar() or 0
        
        # Calculate fraud detection rate
        fraud_detection_rate = (flagged_nfts / total_nfts * 100) if total_nfts > 0 else 0
        
        return MarketplaceStats(
            total_nfts=total_nfts,
            total_volume=0.0,  # No trade history in current schema
            average_price=float(avg_price),
            fraud_detection_rate=fraud_detection_rate
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
        # Get NFTs that are not fraud with high confidence scores
        nfts = db.query(NFT).filter(
            and_(
                NFT.status.in_(["minted", "active"]),
                NFT.is_fraud == False,
                NFT.confidence_score >= 0.8
            )
        ).order_by(
            desc(NFT.confidence_score),
            desc(NFT.created_at)
        ).limit(limit).all()
        
        # Convert to response format
        featured_nfts = []
        for nft in nfts:
            # Safely serialize analysis_details if it exists
            analysis_details = nft.analysis_details
            if analysis_details is not None:
                try:
                    # Import the safe serialization function
                    from api.nft import safe_serialize_analysis_details
                    analysis_details = safe_serialize_analysis_details(analysis_details)
                except ImportError:
                    # Fallback if import fails
                    if not isinstance(analysis_details, dict):
                        analysis_details = {"raw_result": str(analysis_details)}
                except Exception as serialization_error:
                    logging.error(f"Error serializing analysis_details: {serialization_error}")
                    # Fallback to a safe default
                    analysis_details = {
                        "error": f"Serialization failed: {str(serialization_error)}",
                        "raw_data": str(analysis_details)
                    }
            
            nft_response = NFTResponse(
                id=str(nft.id),
                title=nft.title,
                description=nft.description,
                category=nft.category,
                price=float(nft.price),
                image_url=nft.image_url,
                wallet_address=nft.wallet_address,
                sui_object_id=nft.sui_object_id,
                is_fraud=nft.is_fraud,
                confidence_score=nft.confidence_score,
                status=nft.status,
                created_at=nft.created_at,
                analysis_details=analysis_details
            )
            featured_nfts.append(nft_response)
        
        return featured_nfts
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching featured NFTs: {str(e)}")


@router.post("/nft/create")
async def create_nft(
    request: NFTCreationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Create a new NFT record and analyze for fraud
    This endpoint is called by the frontend after NFT data preparation
    """
    try:
        # Check if user exists, create if not
        user = db.query(User).filter(User.wallet_address == request.wallet_address).first()
        if not user:
            # Create a default user profile
            user = User(
                wallet_address=request.wallet_address,
                email=f"{request.wallet_address[:8]}@temp.com",  # Temporary email
                username=f"User{request.wallet_address[:8]}",
                reputation_score=50.0
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Create NFT record in database
        nft = NFT(
            owner_id=user.id,
            wallet_address=request.wallet_address,
            title=request.title,
            description=request.description,
            category=request.category,
            price=request.price,
            image_url=request.image_url,
            sui_object_id=request.sui_object_id,
            status="pending"  # Will be updated to "minted" after blockchain confirmation
        )
        
        db.add(nft)
        db.commit()
        db.refresh(nft)

        # Run fraud analysis in background
        background_tasks.add_task(
            run_fraud_analysis,
            nft_id=str(nft.id),
            image_url=request.image_url,
            title=request.title,
            description=request.description
        )

        return {
            "success": True,
            "message": "NFT created and queued for analysis. Will be automatically listed in marketplace after minting.",
            "nft_id": str(nft.id),
            "analysis_status": "queued",
            "auto_list_enabled": True
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating NFT: {str(e)}")


@router.put("/nft/{nft_id}/confirm-mint")
async def confirm_nft_mint(
    nft_id: str,
    sui_object_id: str,
    db: Session = Depends(get_db)
):
    """
    Confirm NFT has been minted on blockchain and update status
    Automatically lists the NFT in marketplace (restores previous behavior)
    """
    try:
        nft = db.query(NFT).filter(NFT.id == nft_id).first()
        if not nft:
            raise HTTPException(status_code=404, detail="NFT not found")
        
        nft.sui_object_id = sui_object_id
        nft.status = "minted"
        # Automatically list the NFT in marketplace when minted
        nft.is_listed = True
        nft.listing_price = nft.price
        nft.last_listed_at = datetime.utcnow()
        nft.listing_status = "active"
        
        db.commit()

        return {
            "success": True,
            "message": "NFT mint confirmed and automatically listed in marketplace",
            "nft_id": nft_id,
            "sui_object_id": sui_object_id,
            "is_listed": True
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error confirming mint: {str(e)}")


@router.get("/nfts/recent", response_model=List[NFTResponse])
async def get_recent_nfts(
    limit: int = Query(10, ge=1, le=50, description="Number of recent NFTs to return"),
    db: Session = Depends(get_db)
):
    """
    Get recently created NFTs for marketplace display
    This endpoint shows NFTs that have been newly minted and are available for trading
    """
    try:
        # Query for recently created NFTs that are listed for sale, ordered by creation date
        recent_nfts = db.query(NFT).filter(
            NFT.status.in_(["minted", "active", "listed"]),
            NFT.is_listed == True  # Only show NFTs that are listed for sale
        ).order_by(desc(NFT.created_at)).limit(limit).all()
        
        # Convert to response format
        nft_responses = []
        for nft in recent_nfts:
            # Get latest fraud analysis if available
            latest_fraud_flag = db.query(FraudFlag).filter(
                FraudFlag.nft_id == nft.id
            ).order_by(desc(FraudFlag.flagged_at)).first()
            
            is_fraud = latest_fraud_flag.confidence_score > 60 if latest_fraud_flag else False
            confidence_score = latest_fraud_flag.confidence_score / 100.0 if latest_fraud_flag else 0.0
            
            # Safely serialize analysis_details if it exists
            analysis_details = nft.analysis_details
            if analysis_details is not None:
                try:
                    # Import the safe serialization function
                    from api.nft import safe_serialize_analysis_details
                    analysis_details = safe_serialize_analysis_details(analysis_details)
                except ImportError:
                    # Fallback if import fails
                    if not isinstance(analysis_details, dict):
                        analysis_details = {"raw_result": str(analysis_details)}
                except Exception as serialization_error:
                    logging.error(f"Error serializing analysis_details: {serialization_error}")
                    # Fallback to a safe default
                    analysis_details = {
                        "error": f"Serialization failed: {str(serialization_error)}",
                        "raw_data": str(analysis_details)
                    }
            
            nft_responses.append(NFTResponse(
                id=nft.id,
                title=nft.title,
                description=nft.description,
                category=nft.category,
                price=nft.price,
                image_url=nft.image_url,
                wallet_address=nft.wallet_address,
                sui_object_id=nft.sui_object_id,
                is_fraud=is_fraud,
                confidence_score=confidence_score,
                status=nft.status,
                created_at=nft.created_at,
                analysis_details=analysis_details
            ))
        
        return nft_responses
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching recent NFTs: {str(e)}")


@router.post("/nfts/{nft_id}/analyze")
async def trigger_nft_analysis(
    nft_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Trigger fraud analysis for a specific NFT
    This endpoint allows manual triggering of fraud analysis for newly created NFTs
    """
    try:
        # Get NFT from database
        nft = db.query(NFT).filter(NFT.id == nft_id).first()
        if not nft:
            raise HTTPException(status_code=404, detail="NFT not found")
        
        # Add background task for fraud analysis
        background_tasks.add_task(
            run_fraud_analysis_and_update_db,
            nft_id=nft.id,
            image_url=nft.image_url,
            title=nft.title,
            description=nft.description or "",
            db_session=db
        )
        
        return {
            "message": "Fraud analysis started",
            "nft_id": nft_id,
            "status": "processing"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting analysis: {str(e)}")


async def run_fraud_analysis_and_update_db(
    nft_id: str, 
    image_url: str, 
    title: str, 
    description: str,
    db_session: Session
):
    """
    Enhanced background task to run fraud analysis and update database
    """
    try:
        if analyze_nft_for_fraud and NFTData:
            # Create NFTData object for analysis
            nft_data = NFTData(
                title=title,
                description=description,
                image_url=image_url,
                category="art",  # Default category
                price=0.0  # Price not needed for analysis
            )
            
            # Run fraud analysis
            result = await analyze_nft_for_fraud(nft_data)
            
            # Store fraud analysis results in database
            if result.get("is_fraud", False) or result.get("confidence_score", 0.0) > 0.3:
                fraud_flag = FraudFlag(
                    id=str(uuid.uuid4()),
                    nft_id=nft_id,
                    flag_type=result.get("flag_type", 1),
                    confidence_score=int(result.get("confidence_score", 0.0) * 100),
                    reason=result.get("reason", "Automated fraud detection"),
                    flagged_by="fraud_detection_agent",
                    flagged_at=int(datetime.now().timestamp()),
                    is_active=True
                )
                
                db_session.add(fraud_flag)
                db_session.commit()
                
                print(f"Fraud flag created for NFT {nft_id}: confidence={result.get('confidence_score', 0.0):.2f}")
            else:
                print(f"NFT {nft_id} passed fraud analysis: confidence={result.get('confidence_score', 0.0):.2f}")
            
    except Exception as e:
        print(f"Error in fraud analysis for {nft_id}: {e}")
        db_session.rollback()


async def run_fraud_analysis(nft_id: str, image_url: str, title: str, description: str):
    """Background task to run fraud analysis"""
    try:
        if analyze_nft_for_fraud and NFTData:
            nft_data = NFTData(
                title=title,
                description=description,
                image_url=image_url,
                category="art",
                price=0.0
            )
            result = await analyze_nft_for_fraud(nft_data)
            
            # Update NFT with analysis results
            # Note: This would need a proper database session in a real implementation
            print(f"Fraud analysis complete for {nft_id}: {result}")
            
    except Exception as e:
        print(f"Error in fraud analysis for {nft_id}: {e}")
