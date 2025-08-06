"""
Listings API Module
Handles listing management, history tracking, and marketplace analytics
"""
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

try:
    from database.connection import get_db
    from models.database import Listing, ListingHistory, TransactionHistory, User, NFT
    from agent.sui_client import sui_client
    from agent.supabase_client import supabase_client
except ImportError:
    from backend.database.connection import get_db
    from backend.models.database import Listing, ListingHistory, TransactionHistory, User, NFT
    from backend.agent.sui_client import sui_client
    from backend.agent.supabase_client import supabase_client

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/listings", tags=["listings"])

# Pydantic Models
class ListingCreate(BaseModel):
    nft_id: UUID
    price: float
    expires_at: Optional[datetime] = None
    listing_metadata: Optional[Dict[str, Any]] = None

class ListingUpdate(BaseModel):
    price: Optional[float] = None
    expires_at: Optional[datetime] = None
    listing_metadata: Optional[Dict[str, Any]] = None

class ListingResponse(BaseModel):
    id: UUID
    nft_id: UUID
    seller_id: UUID
    price: float
    expires_at: Optional[datetime] = None
    status: str
    kiosk_id: Optional[str] = None
    listing_id: Optional[str] = None
    blockchain_tx_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    listing_metadata: Optional[Dict[str, Any]] = None
    nft_title: Optional[str] = None
    nft_image_url: Optional[str] = None
    seller_username: Optional[str] = None
    
    class Config:
        # Allow extra fields and arbitrary types to handle complex metadata
        extra = "allow"
        arbitrary_types_allowed = True

class ListingHistoryResponse(BaseModel):
    id: UUID
    listing_id: UUID
    nft_id: UUID
    action: str
    old_price: Optional[float] = None
    new_price: Optional[float] = None
    seller_id: UUID
    kiosk_id: Optional[str] = None
    blockchain_tx_id: Optional[str] = None
    timestamp: datetime

class MarketplaceStatsResponse(BaseModel):
    total_listings: int
    active_sellers: int
    total_volume: float
    average_price: float
    total_transactions: int
    fraud_detection_rate: float
    last_updated: datetime

class TransactionHistoryResponse(BaseModel):
    id: UUID
    nft_id: UUID
    listing_id: Optional[UUID] = None
    seller_id: UUID
    buyer_id: UUID
    price: float
    blockchain_tx_id: str
    transaction_type: str
    status: str
    gas_fee: Optional[float] = None
    timestamp: datetime

class UserCreateRequest(BaseModel):
    wallet_address: str
    username: Optional[str] = None
    email: Optional[str] = None

class UserResponse(BaseModel):
    id: UUID
    wallet_address: str
    username: str
    email: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    reputation_score: float
    created_at: datetime

class MarketplaceAnalyticsResponse(BaseModel):
    time_period: str
    total_listings: int
    new_listings: int
    completed_sales: int
    total_volume: float
    average_price: float
    price_change_percent: float
    active_users: int
    fraud_incidents: int
    fraud_rate: float
    top_categories: List[Dict[str, Any]]
    price_trends: List[Dict[str, Any]]
    generated_at: datetime

# Background task functions
async def sync_listing_to_blockchain(listing_id: UUID):
    """Sync listing to blockchain"""
    try:
        logger.info(f"Syncing listing {listing_id} to blockchain")
        # Use the listing sync service
        from agent.listing_sync_service import get_listing_sync_service
        sync_service = await get_listing_sync_service()
        if sync_service:
            await sync_service._sync_single_listing(listing_id, None)
    except Exception as e:
        logger.error(f"Error syncing listing to blockchain: {e}")

async def sync_listing_update_to_blockchain(listing_id: UUID):
    """Sync listing update to blockchain"""
    try:
        logger.info(f"Syncing listing update {listing_id} to blockchain")
        # Use the listing sync service
        from agent.listing_sync_service import get_listing_sync_service
        sync_service = await get_listing_sync_service()
        if sync_service:
            # Get the new price from the listing
            db = next(get_db())
            listing = db.query(Listing).filter(Listing.id == listing_id).first()
            if listing:
                await sync_service.sync_listing_update(listing_id, float(listing.price))
            db.close()
    except Exception as e:
        logger.error(f"Error syncing listing update to blockchain: {e}")

async def sync_listing_deletion_to_blockchain(listing_id: UUID):
    """Sync listing deletion to blockchain"""
    try:
        logger.info(f"Syncing listing deletion {listing_id} to blockchain")
        # Use the listing sync service
        from agent.listing_sync_service import get_listing_sync_service
        sync_service = await get_listing_sync_service()
        if sync_service:
            await sync_service.sync_listing_deletion(listing_id)
    except Exception as e:
        logger.error(f"Error syncing listing deletion to blockchain: {e}")

# API Routes
@router.post("/", response_model=ListingResponse)
async def create_listing(
    listing_data: ListingCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Create a new listing"""
    try:
        # Verify NFT exists and user owns it
        nft = db.query(NFT).filter(NFT.id == listing_data.nft_id).first()
        if not nft:
            raise HTTPException(status_code=404, detail="NFT not found")
        
        # Create listing in database
        listing = Listing(
            nft_id=listing_data.nft_id,
            seller_id=nft.owner_id,
            price=listing_data.price,
            expires_at=listing_data.expires_at,
            listing_metadata=listing_data.listing_metadata,
            status="active"
        )
        
        db.add(listing)
        db.commit()
        db.refresh(listing)
        
        # Update NFT listing status
        nft.is_listed = True
        nft.listing_price = listing_data.price
        nft.last_listed_at = datetime.utcnow()
        nft.listing_status = "active"
        db.commit()
        
        # Background task to sync with blockchain
        background_tasks.add_task(sync_listing_to_blockchain, listing.id)
        
        return listing
        
    except Exception as e:
        logger.error(f"Error creating listing: {e}")
        raise HTTPException(status_code=500, detail="Failed to create listing")

@router.get("/debug/all", response_model=List[Dict])
async def debug_all_listings(db: Session = Depends(get_db)):
    """Debug endpoint to see all listings in database"""
    try:
        listings = db.query(Listing).all()
        debug_info = []
        for listing in listings:
            debug_info.append({
                "id": str(listing.id),
                "nft_id": str(listing.nft_id),
                "seller_id": str(listing.seller_id),
                "price": float(listing.price) if listing.price else 0.0,
                "status": listing.status,
                "created_at": listing.created_at.isoformat() if listing.created_at else None
            })
        logger.info(f"Found {len(debug_info)} listings in database")
        return debug_info
    except Exception as e:
        logger.error(f"Error in debug endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[ListingResponse])
async def get_listings(
    status: Optional[str] = Query(None, description="Filter by status"),
    seller_id: Optional[UUID] = Query(None, description="Filter by seller"),
    category: Optional[str] = Query(None, description="Filter by category"),
    min_price: Optional[float] = Query(None, description="Minimum price"),
    max_price: Optional[float] = Query(None, description="Maximum price"),
    include_deleted: bool = Query(False, description="Include deleted listings"),
    limit: int = Query(50, description="Number of listings to return"),
    offset: int = Query(0, description="Number of listings to skip"),
    db: Session = Depends(get_db)
):
    """Get all listings with optional filters"""
    try:
        query = db.query(Listing).join(NFT).join(User)
        
        # Exclude deleted listings by default
        if not include_deleted:
            query = query.filter(Listing.status != "deleted")
        
        if status:
            query = query.filter(Listing.status == status)
        if seller_id:
            query = query.filter(Listing.seller_id == seller_id)
        if category:
            query = query.filter(NFT.category == category)
        if min_price is not None:
            query = query.filter(Listing.price >= min_price)
        if max_price is not None:
            query = query.filter(Listing.price <= max_price)
        
        listings = query.offset(offset).limit(limit).all()
        
        # Convert to response format
        response_listings = []
        for listing in listings:
            nft = db.query(NFT).filter(NFT.id == listing.nft_id).first()
            seller = db.query(User).filter(User.id == listing.seller_id).first()
            
            response_listings.append(ListingResponse(
                id=listing.id,
                nft_id=listing.nft_id,
                seller_id=listing.seller_id,
                price=listing.price,
                expires_at=listing.expires_at,
                status=listing.status,
                kiosk_id=listing.kiosk_id,
                listing_id=listing.listing_id,
                blockchain_tx_id=listing.blockchain_tx_id,
                created_at=listing.created_at,
                updated_at=listing.updated_at,
                listing_metadata=listing.listing_metadata,
                nft_title=nft.title if nft else None,
                nft_image_url=nft.image_url if nft else None,
                seller_username=seller.username if seller else None
            ))
        
        return response_listings
        
    except Exception as e:
        logger.error(f"Error fetching listings: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch listings")

# ===== Marketplace Endpoint (must come before parameterized routes) =====

@router.get("/marketplace", response_model=List[ListingResponse])
async def get_marketplace_listings(
    category: Optional[str] = Query(None, description="Filter by NFT category"),
    min_price: Optional[float] = Query(None, description="Minimum price filter"),
    max_price: Optional[float] = Query(None, description="Maximum price filter"),
    seller_username: Optional[str] = Query(None, description="Filter by seller username"),
    sort_by: str = Query("created_at", description="Sort by field (created_at, price, title)"),
    sort_order: str = Query("desc", description="Sort order (asc, desc)"),
    limit: int = Query(50, description="Number of listings to return"),
    offset: int = Query(0, description="Number of listings to skip"),
    db: Session = Depends(get_db)
):
    """
    Get marketplace listings with advanced filtering and sorting
    This endpoint provides the main marketplace view
    """
    try:
        # Start with active listings
        query = db.query(Listing).filter(Listing.status == "active")
        
        # Join with NFT and User tables for filtering
        query = query.join(NFT, Listing.nft_id == NFT.id)
        query = query.join(User, Listing.seller_id == User.id)
        
        # Apply filters
        if category:
            query = query.filter(NFT.category == category)
        
        if min_price is not None:
            query = query.filter(Listing.price >= min_price)
        
        if max_price is not None:
            query = query.filter(Listing.price <= max_price)
        
        if seller_username:
            query = query.filter(User.username.ilike(f"%{seller_username}%"))
        
        # Apply sorting
        if sort_by == "price":
            if sort_order == "asc":
                query = query.order_by(Listing.price.asc())
            else:
                query = query.order_by(Listing.price.desc())
        elif sort_by == "title":
            if sort_order == "asc":
                query = query.order_by(NFT.title.asc())
            else:
                query = query.order_by(NFT.title.desc())
        else:  # created_at (default)
            if sort_order == "asc":
                query = query.order_by(Listing.created_at.asc())
            else:
                query = query.order_by(Listing.created_at.desc())
        
        # Get listings with pagination
        listings = query.offset(offset).limit(limit).all()
        
        # Enhance listings with NFT and user information
        listing_responses = []
        for listing in listings:
            try:
                # Get NFT information
                nft = db.query(NFT).filter(NFT.id == listing.nft_id).first()
                
                # Get seller information
                seller = db.query(User).filter(User.id == listing.seller_id).first()
                
                # Safely handle price conversion
                try:
                    price = float(listing.price) if listing.price is not None else 0.0
                except (TypeError, ValueError):
                    price = 0.0
                
                # Safely handle listing_metadata
                listing_metadata = None
                if listing.listing_metadata:
                    try:
                        if isinstance(listing.listing_metadata, dict):
                            listing_metadata = listing.listing_metadata
                        else:
                            listing_metadata = str(listing.listing_metadata)
                    except Exception:
                        listing_metadata = None
                
                listing_response = ListingResponse(
                    id=listing.id,
                    nft_id=listing.nft_id,
                    seller_id=listing.seller_id,
                    price=price,
                    expires_at=listing.expires_at,
                    status=listing.status or "unknown",
                    kiosk_id=listing.kiosk_id,
                    listing_id=listing.listing_id,
                    blockchain_tx_id=listing.blockchain_tx_id,
                    created_at=listing.created_at,
                    updated_at=listing.updated_at,
                    listing_metadata=listing_metadata,
                    nft_title=nft.title if nft else None,
                    nft_image_url=nft.image_url if nft else None,
                    seller_username=seller.username if seller else None
                )
                listing_responses.append(listing_response)
            except Exception as e:
                logger.error(f"Error processing listing {listing.id}: {e}")
                # Skip problematic listings instead of failing the entire request
                continue
        
        return listing_responses
        
    except Exception as e:
        logger.error(f"Error getting marketplace listings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting marketplace listings: {str(e)}")

@router.get("/user/{wallet_address}", response_model=List[ListingResponse])
async def get_user_listings(
    wallet_address: str,
    status: Optional[str] = Query(None, description="Filter by listing status"),
    include_deleted: bool = Query(False, description="Include deleted listings"),
    limit: int = Query(50, description="Number of listings to return"),
    offset: int = Query(0, description="Number of listings to skip"),
    db: Session = Depends(get_db)
):
    """Get listings for a specific user by wallet address"""
    try:
        # First find the user by wallet address
        user = db.query(User).filter(User.wallet_address == wallet_address).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Query listings for this user
        query = db.query(Listing).filter(Listing.seller_id == user.id)
        
        # Exclude deleted listings by default
        if not include_deleted:
            query = query.filter(Listing.status != "deleted")
        
        if status:
            query = query.filter(Listing.status == status)
        
        listings = query.order_by(Listing.created_at.desc()).offset(offset).limit(limit).all()
        
        # Convert to response format
        listing_responses = []
        for listing in listings:
            nft = db.query(NFT).filter(NFT.id == listing.nft_id).first()
            
            # Safely handle price conversion
            try:
                price = float(listing.price) if listing.price is not None else 0.0
            except (TypeError, ValueError):
                price = 0.0
            
            # Safely handle listing_metadata
            listing_metadata = None
            if listing.listing_metadata:
                try:
                    if isinstance(listing.listing_metadata, dict):
                        listing_metadata = listing.listing_metadata
                    else:
                        listing_metadata = str(listing.listing_metadata)
                except Exception:
                    listing_metadata = None
            
            listing_response = ListingResponse(
                id=listing.id,
                nft_id=listing.nft_id,
                seller_id=listing.seller_id,
                price=price,
                expires_at=listing.expires_at,
                status=listing.status or "unknown",
                kiosk_id=listing.kiosk_id,
                listing_id=listing.listing_id,
                blockchain_tx_id=listing.blockchain_tx_id,
                created_at=listing.created_at,
                updated_at=listing.updated_at,
                listing_metadata=listing_metadata,
                nft_title=nft.title if nft else None,
                nft_image_url=nft.image_url if nft else None,
                seller_username=user.username
            )
            listing_responses.append(listing_response)
        
        return listing_responses
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user listings for {wallet_address}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting user listings: {str(e)}")

@router.get("/marketplace/analytics", response_model=MarketplaceAnalyticsResponse)
async def get_marketplace_analytics(
    time_period: str = Query("24h", description="Time period: 24h, 7d, 30d, all"),
    db: Session = Depends(get_db)
):
    """Get marketplace analytics for specified time period"""
    try:
        # Calculate time filter based on period
        now = datetime.utcnow()
        if time_period == "24h":
            start_time = now - timedelta(hours=24)
        elif time_period == "7d":
            start_time = now - timedelta(days=7)
        elif time_period == "30d":
            start_time = now - timedelta(days=30)
        else:  # "all"
            start_time = datetime.min
        
        # Get current period data
        current_listings = db.query(Listing).filter(
            Listing.created_at >= start_time
        ).all()
        
        total_listings = len(current_listings)
        new_listings = len([l for l in current_listings if l.created_at >= start_time])
        
        # Get completed sales (transactions) in period
        completed_sales_query = db.query(TransactionHistory).filter(
            TransactionHistory.timestamp >= start_time,
            TransactionHistory.status == "completed"
        )
        completed_sales = completed_sales_query.count()
        
        # Calculate total volume and average price
        sales_data = completed_sales_query.all()
        total_volume = sum([sale.price for sale in sales_data]) if sales_data else 0.0
        average_price = total_volume / len(sales_data) if sales_data else 0.0
        
        # Calculate price change (compare with previous period)
        prev_start = start_time - (now - start_time) if time_period != "all" else datetime.min
        prev_sales = db.query(TransactionHistory).filter(
            TransactionHistory.timestamp >= prev_start,
            TransactionHistory.timestamp < start_time,
            TransactionHistory.status == "completed"
        ).all()
        
        prev_avg_price = sum([sale.price for sale in prev_sales]) / len(prev_sales) if prev_sales else 0.0
        price_change_percent = ((average_price - prev_avg_price) / prev_avg_price * 100) if prev_avg_price > 0 else 0.0
        
        # Get active users count
        active_users = db.query(Listing.seller_id).filter(
            Listing.created_at >= start_time
        ).distinct().count()
        
        # Get fraud incidents (placeholder calculation)
        fraud_incidents = int(total_listings * 0.02)  # Assume 2% fraud rate
        fraud_rate = fraud_incidents / total_listings * 100 if total_listings > 0 else 0.0
        
        # Get top categories
        category_data = db.query(NFT.category, func.count(Listing.id).label('count')).join(
            Listing, NFT.id == Listing.nft_id
        ).filter(
            Listing.created_at >= start_time
        ).group_by(NFT.category).order_by(func.count(Listing.id).desc()).limit(5).all()
        
        top_categories = [
            {"category": cat[0] or "Unknown", "count": cat[1]}
            for cat in category_data
        ]
        
        # Generate price trends (simplified - daily averages for the period)
        if time_period == "24h":
            # Hourly trends for 24h
            price_trends = []
            for i in range(24):
                hour_start = now - timedelta(hours=i+1)
                hour_end = now - timedelta(hours=i)
                hour_sales = db.query(TransactionHistory).filter(
                    TransactionHistory.timestamp >= hour_start,
                    TransactionHistory.timestamp < hour_end,
                    TransactionHistory.status == "completed"
                ).all()
                
                hour_avg = sum([sale.price for sale in hour_sales]) / len(hour_sales) if hour_sales else 0.0
                price_trends.append({
                    "timestamp": hour_start.isoformat(),
                    "average_price": hour_avg,
                    "volume": len(hour_sales)
                })
        else:
            # Daily trends for longer periods
            days = 7 if time_period == "7d" else (30 if time_period == "30d" else 30)
            price_trends = []
            for i in range(days):
                day_start = (now - timedelta(days=i+1)).replace(hour=0, minute=0, second=0, microsecond=0)
                day_end = day_start + timedelta(days=1)
                day_sales = db.query(TransactionHistory).filter(
                    TransactionHistory.timestamp >= day_start,
                    TransactionHistory.timestamp < day_end,
                    TransactionHistory.status == "completed"
                ).all()
                
                day_avg = sum([sale.price for sale in day_sales]) / len(day_sales) if day_sales else 0.0
                price_trends.append({
                    "timestamp": day_start.isoformat(),
                    "average_price": day_avg,
                    "volume": len(day_sales)
                })
        
        return MarketplaceAnalyticsResponse(
            time_period=time_period,
            total_listings=total_listings,
            new_listings=new_listings,
            completed_sales=completed_sales,
            total_volume=total_volume,
            average_price=average_price,
            price_change_percent=price_change_percent,
            active_users=active_users,
            fraud_incidents=fraud_incidents,
            fraud_rate=fraud_rate,
            top_categories=top_categories,
            price_trends=price_trends,
            generated_at=now
        )
        
    except Exception as e:
        logger.error(f"Error getting marketplace analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting marketplace analytics: {str(e)}")

# ===== Parameterized Routes (must come after specific routes) =====

@router.get("/{listing_id}", response_model=ListingResponse)
async def get_listing(
    listing_id: UUID,
    include_deleted: bool = Query(False, description="Include deleted listings"),
    db: Session = Depends(get_db)
):
    """Get a specific listing by ID"""
    try:
        query = db.query(Listing).filter(Listing.id == listing_id)
        
        # Exclude deleted listings by default
        if not include_deleted:
            query = query.filter(Listing.status != "deleted")
        
        listing = query.first()
        if not listing:
            # Enhanced debugging: log all available listing IDs
            all_listings = db.query(Listing).all()
            available_ids = [str(l.id) for l in all_listings]
            logger.error(f"Listing {listing_id} not found. Available listings: {available_ids[:10]}")
            raise HTTPException(status_code=404, detail=f"Listing not found with ID: {listing_id}")
        
        nft = db.query(NFT).filter(NFT.id == listing.nft_id).first()
        seller = db.query(User).filter(User.id == listing.seller_id).first()
        
        return ListingResponse(
            id=listing.id,
            nft_id=listing.nft_id,
            seller_id=listing.seller_id,
            price=listing.price,
            expires_at=listing.expires_at,
            status=listing.status,
            kiosk_id=listing.kiosk_id,
            listing_id=listing.listing_id,
            blockchain_tx_id=listing.blockchain_tx_id,
            created_at=listing.created_at,
            updated_at=listing.updated_at,
            listing_metadata=listing.listing_metadata,
            nft_title=nft.title if nft else None,
            nft_image_url=nft.image_url if nft else None,
            seller_username=seller.username if seller else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching listing {listing_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch listing")

@router.put("/{listing_id}", response_model=ListingResponse)
async def update_listing(
    listing_id: UUID,
    listing_data: ListingUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Update a listing"""
    try:
        logger.info(f"Attempting to update listing with ID: {listing_id}")
        listing = db.query(Listing).filter(Listing.id == listing_id).first()
        if not listing:
            # Enhanced debugging: log all available listing IDs
            all_listings = db.query(Listing).all()
            available_ids = [str(l.id) for l in all_listings]
            logger.error(f"Listing {listing_id} not found. Available listings: {available_ids[:10]}")
            raise HTTPException(status_code=404, detail=f"Listing not found with ID: {listing_id}")
        
        # Record old values for history
        old_price = listing.price
        
        # Update listing
        if listing_data.price is not None:
            listing.price = listing_data.price
        if listing_data.expires_at is not None:
            listing.expires_at = listing_data.expires_at
        if listing_data.listing_metadata is not None:
            listing.listing_metadata = listing_data.listing_metadata
        
        listing.updated_at = datetime.utcnow()
        
        # Create history record
        history = ListingHistory(
            listing_id=listing_id,
            nft_id=listing.nft_id,
            action="updated",
            old_price=old_price,
            new_price=listing.price,
            seller_id=listing.seller_id,
            kiosk_id=listing.kiosk_id,
            blockchain_tx_id=listing.blockchain_tx_id
        )
        
        db.add(history)
        db.commit()
        db.refresh(listing)
        
        # Background task to sync with blockchain
        background_tasks.add_task(sync_listing_update_to_blockchain, listing.id)
        
        return listing
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating listing {listing_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update listing")

@router.delete("/{listing_id}")
async def delete_listing(
    listing_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Delete a listing (soft delete - marks as deleted rather than removing from database)"""
    try:
        logger.info(f"Attempting to delete listing with ID: {listing_id}")
        listing = db.query(Listing).filter(Listing.id == listing_id).first()
        if not listing:
            # Enhanced debugging: log all available listing IDs
            all_listings = db.query(Listing).all()
            available_ids = [str(l.id) for l in all_listings]
            logger.error(f"Listing {listing_id} not found. Available listings: {available_ids[:10]}")
            raise HTTPException(status_code=404, detail=f"Listing not found with ID: {listing_id}")
        
        # Check if already deleted
        if listing.status == "deleted":
            raise HTTPException(status_code=400, detail="Listing is already deleted")
        
        # Create history record
        history = ListingHistory(
            listing_id=listing_id,
            nft_id=listing.nft_id,
            action="deleted",
            old_price=listing.price,
            seller_id=listing.seller_id,
            kiosk_id=listing.kiosk_id,
            blockchain_tx_id=listing.blockchain_tx_id
        )
        
        db.add(history)
        
        # Update NFT listing status
        nft = db.query(NFT).filter(NFT.id == listing.nft_id).first()
        if nft:
            nft.is_listed = False
            nft.listing_status = "inactive"
        
        # Soft delete: Mark listing as deleted instead of removing it
        listing.status = "deleted"
        listing.updated_at = datetime.utcnow()
        
        db.commit()
        
        # Background task to sync with blockchain
        background_tasks.add_task(sync_listing_deletion_to_blockchain, listing_id)
        
        return {"message": "Listing deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting listing {listing_id}: {e}")
        db.rollback()  # Rollback on error
        raise HTTPException(status_code=500, detail="Failed to delete listing")

@router.get("/{listing_id}/history", response_model=List[ListingHistoryResponse])
async def get_listing_history(
    listing_id: UUID,
    db: Session = Depends(get_db)
):
    """Get history for a specific listing"""
    try:
        history = db.query(ListingHistory).filter(
            ListingHistory.listing_id == listing_id
        ).order_by(ListingHistory.timestamp.desc()).all()
        
        return history
        
    except Exception as e:
        logger.error(f"Error fetching listing history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch listing history")

@router.get("/marketplace/stats", response_model=MarketplaceStatsResponse)
async def get_marketplace_stats(
    db: Session = Depends(get_db)
):
    """Get marketplace statistics"""
    try:
        # Get active listings count
        active_listings = db.query(Listing).filter(Listing.status == "active").count()
        
        # Get active sellers count
        active_sellers = db.query(Listing.seller_id).filter(
            Listing.status == "active"
        ).distinct().count()
        
        # Get total volume
        total_volume = db.query(Listing.price).filter(
            Listing.status == "active"
        ).all()
        total_volume = sum([price[0] for price in total_volume]) if total_volume else 0
        
        # Get average price
        avg_price = db.query(Listing.price).filter(
            Listing.status == "active"
        ).all()
        avg_price = sum([price[0] for price in avg_price]) / len(avg_price) if avg_price else 0
        
        # Get total transactions
        total_transactions = db.query(TransactionHistory).count()
        
        # Get fraud detection rate (placeholder)
        fraud_rate = 0.05  # 5% placeholder
        
        return MarketplaceStatsResponse(
            total_listings=active_listings,
            active_sellers=active_sellers,
            total_volume=total_volume,
            average_price=avg_price,
            total_transactions=total_transactions,
            fraud_detection_rate=fraud_rate,
            last_updated=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Error fetching marketplace stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch marketplace stats")

@router.get("/transactions/history", response_model=List[TransactionHistoryResponse])
async def get_transaction_history(
    nft_id: Optional[UUID] = Query(None, description="Filter by NFT ID"),
    seller_id: Optional[UUID] = Query(None, description="Filter by seller"),
    buyer_id: Optional[UUID] = Query(None, description="Filter by buyer"),
    transaction_type: Optional[str] = Query(None, description="Filter by transaction type"),
    limit: int = Query(50, description="Number of transactions to return"),
    offset: int = Query(0, description="Number of transactions to skip"),
    db: Session = Depends(get_db)
):
    """Get transaction history with optional filters"""
    try:
        query = db.query(TransactionHistory)
        
        if nft_id:
            query = query.filter(TransactionHistory.nft_id == nft_id)
        if seller_id:
            query = query.filter(TransactionHistory.seller_id == seller_id)
        if buyer_id:
            query = query.filter(TransactionHistory.buyer_id == buyer_id)
        if transaction_type:
            query = query.filter(TransactionHistory.transaction_type == transaction_type)
        
        transactions = query.order_by(TransactionHistory.timestamp.desc()).offset(offset).limit(limit).all()
        
        return transactions
        
    except Exception as e:
        logger.error(f"Error fetching transaction history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch transaction history")
