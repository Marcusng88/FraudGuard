"""
Listings API Module
Handles listing management, history tracking, and marketplace analytics
"""
import logging
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from uuid import UUID
import uuid

from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

try:
    from database.connection import get_db
    from models.database import Listing, TransactionHistory, User, NFT
    from agent.sui_client import sui_client
    from agent.supabase_client import supabase_client
except ImportError:
    from backend.database.connection import get_db
    from backend.models.database import Listing, TransactionHistory, User, NFT
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
    blockchain_tx_id: Optional[str] = None  # Add blockchain transaction ID
    blockchain_listing_id: Optional[str] = None  # Add blockchain listing ID

class ListingConfirm(BaseModel):
    listing_id: UUID
    blockchain_tx_id: str
    blockchain_listing_id: Optional[str] = None
    gas_fee: Optional[float] = None

class BlockchainListingCreate(BaseModel):
    nft_id: UUID
    price: float
    blockchain_listing_id: str
    blockchain_tx_id: str
    gas_fee: Optional[float] = None

class UnlistingConfirm(BaseModel):
    listing_id: UUID
    blockchain_tx_id: str
    gas_fee: Optional[float] = None

class EditListingConfirm(BaseModel):
    listing_id: UUID
    new_price: float
    blockchain_tx_id: str
    gas_fee: Optional[float] = None

class ListingUpdate(BaseModel):
    price: Optional[float] = None
    expires_at: Optional[datetime] = None
    listing_metadata: Optional[Dict[str, Any]] = None

class ListingResponse(BaseModel):
    id: UUID
    nft_id: UUID
    seller_wallet_address: str  # Matches database field
    price: float
    expires_at: Optional[datetime] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    listing_metadata: Optional[Dict[str, Any]] = None
    # Extra fields from joins
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
    seller_wallet_address: str  # Changed from seller_id to match database
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
    seller_wallet_address: str  # Changed from seller_id to match database
    buyer_wallet_address: str   # Changed from buyer_id to match database
    price: float
    blockchain_tx_id: str
    transaction_type: str
    status: str
    gas_fee: Optional[float] = None
    created_at: datetime  # Changed from timestamp to match database

class UserCreateRequest(BaseModel):
    wallet_address: str
    username: Optional[str] = None
    email: Optional[str] = None

class UserResponse(BaseModel):
    id: UUID
    wallet_address: str
    username: str
    email: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None  # This will be handled in frontend, not stored in DB
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

# API Routes
@router.post("/user", response_model=UserResponse)
async def create_user(
    user_data: UserCreateRequest,
    db: Session = Depends(get_db)
):
    """Create a new user or get existing user by wallet address"""
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.wallet_address == user_data.wallet_address).first()
        
        if existing_user:
            # Return existing user
            return UserResponse(
                id=existing_user.id,
                wallet_address=existing_user.wallet_address,
                username=existing_user.username,
                email=existing_user.email,
                bio=existing_user.bio,
                avatar_url=None,  # Not stored in database
                reputation_score=existing_user.reputation_score,
                created_at=existing_user.created_at
            )
        
        # Create new user
        new_user = User(
            wallet_address=user_data.wallet_address,
            username=user_data.username or f"user_{user_data.wallet_address[:8]}",
            email=user_data.email or f"{user_data.wallet_address[:8]}@fraudguard.com"
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        return UserResponse(
            id=new_user.id,
            wallet_address=new_user.wallet_address,
            username=new_user.username,
            email=new_user.email,
            bio=new_user.bio,
            avatar_url=None,  # Not stored in database
            reputation_score=new_user.reputation_score,
            created_at=new_user.created_at
        )
        
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail="Failed to create user")

@router.get("/user/{wallet_address}/profile", response_model=UserResponse)
async def get_user_profile(
    wallet_address: str,
    db: Session = Depends(get_db)
):
    """Get user profile by wallet address, create if doesn't exist"""
    try:
        user = db.query(User).filter(User.wallet_address == wallet_address).first()
        if not user:
            # Auto-create user if doesn't exist (similar to other endpoints)
            logger.info(f"Creating new user profile for wallet: {wallet_address}")
            user = User(
                wallet_address=wallet_address,
                username=f"User{wallet_address[:8]}",  # Default username
                bio=None,
                email=None,
                reputation_score=50.0  # Default reputation
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        return UserResponse(
            id=user.id,
            wallet_address=user.wallet_address,
            username=user.username or f"User{wallet_address[:8]}",
            email=user.email or "",
            bio=user.bio,
            avatar_url=None,  # Not stored in database
            reputation_score=float(user.reputation_score) if user.reputation_score else 50.0,
            created_at=user.created_at
        )
        
    except Exception as e:
        logger.error(f"Error getting user profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user profile")

class UserUpdateRequest(BaseModel):
    username: Optional[str] = None
    bio: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None

@router.put("/user/{wallet_address}/profile", response_model=UserResponse)
async def update_user_profile(
    wallet_address: str,
    user_data: UserUpdateRequest,
    db: Session = Depends(get_db)
):
    """Update user profile"""
    try:
        user = db.query(User).filter(User.wallet_address == wallet_address).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update fields if provided (avatar_url is ignored as it's not stored in DB)
        if user_data.username is not None:
            user.username = user_data.username
        if user_data.bio is not None:
            user.bio = user_data.bio
        if user_data.email is not None:
            user.email = user_data.email
        # Note: avatar_url is not stored in database
        
        user.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(user)
        
        return UserResponse(
            id=user.id,
            wallet_address=user.wallet_address,
            username=user.username,
            email=user.email,
            bio=user.bio,
            avatar_url=None,  # Not stored in database
            reputation_score=user.reputation_score,
            created_at=user.created_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user profile")

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
        
        # Check if there's already an active listing for this NFT
        existing_active_listing = db.query(Listing).filter(
            and_(
                Listing.nft_id == listing_data.nft_id,
                Listing.status == "active"
            )
        ).first()
        
        if existing_active_listing:
            raise HTTPException(
                status_code=400, 
                detail="NFT is already listed. Please unlist the current listing before creating a new one."
            )
        
        # Check if there's a cancelled listing for this NFT that we can reactivate
        existing_cancelled_listing = db.query(Listing).filter(
            and_(
                Listing.nft_id == listing_data.nft_id,
                Listing.status == "cancelled"
            )
        ).first()
        
        if existing_cancelled_listing:
            # Reactivate the cancelled listing with new price and metadata
            logger.info(f"Found cancelled listing {existing_cancelled_listing.id} for NFT {listing_data.nft_id}, reactivating...")
            
            existing_cancelled_listing.price = listing_data.price
            existing_cancelled_listing.expires_at = listing_data.expires_at
            existing_cancelled_listing.listing_metadata = listing_data.listing_metadata
            existing_cancelled_listing.status = "active"
            existing_cancelled_listing.updated_at = datetime.utcnow()
            
            # Update NFT listing status
            nft.is_listed = True
            
            db.commit()
            db.refresh(existing_cancelled_listing)
            
            logger.info(f"Successfully reactivated cancelled listing {existing_cancelled_listing.id} for NFT {listing_data.nft_id}")
            
            return existing_cancelled_listing
        else:
            # Create new listing in database
            listing = Listing(
                nft_id=listing_data.nft_id,
                seller_wallet_address=nft.owner_wallet_address,
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

            # Record transaction history if blockchain data is provided
            if listing_data.blockchain_tx_id:
                transaction = TransactionHistory(
                    nft_id=listing_data.nft_id,
                    listing_id=listing.id,
                    seller_wallet_address=nft.owner_wallet_address,
                    buyer_wallet_address="",  # No buyer for listing
                    price=listing_data.price,
                    transaction_type="listing",
                    status="completed",
                    blockchain_tx_id=listing_data.blockchain_tx_id,
                    gas_fee=0.0
                )
                db.add(transaction)

            db.commit()

            logger.info(f"Created listing {listing.id} for NFT {listing_data.nft_id} with blockchain tx: {listing_data.blockchain_tx_id}")

            return listing
        
    except Exception as e:
        logger.error(f"Error creating listing: {e}")
        raise HTTPException(status_code=500, detail="Failed to create listing")

@router.put("/{listing_id}/confirm-listing")
async def confirm_listing(
    listing_id: str,
    confirm_data: ListingConfirm,
    db: Session = Depends(get_db)
):
    """
    Confirm listing has been created on blockchain and update status
    Follows the same pattern as NFT minting confirmation
    """
    try:
        # Validate UUID format
        try:
            uuid.UUID(listing_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid listing ID format")

        listing = db.query(Listing).filter(Listing.id == listing_id).first()
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")

        # Update listing with blockchain transaction data
        listing.listing_metadata = listing.listing_metadata or {}
        
        # Always store the transaction ID
        listing.listing_metadata.update({
            "blockchain_tx_id": confirm_data.blockchain_tx_id,
            "confirmed_at": datetime.utcnow().isoformat()
        })
        
        # Only store blockchain_listing_id if it's not None
        if confirm_data.blockchain_listing_id:
            listing.listing_metadata["blockchain_listing_id"] = confirm_data.blockchain_listing_id
            logger.info(f"Stored blockchain listing ID: {confirm_data.blockchain_listing_id}")
        else:
            logger.warning(f"No blockchain listing ID provided for listing {listing_id}, transaction: {confirm_data.blockchain_tx_id}")
            # Store the transaction ID as a fallback for unlisting
            listing.listing_metadata["fallback_for_unlisting"] = "use_transaction_id"
        listing.updated_at = datetime.utcnow()

        # Record transaction history
        transaction = TransactionHistory(
            nft_id=listing.nft_id,
            listing_id=listing.id,
            seller_wallet_address=listing.seller_wallet_address,
            buyer_wallet_address="",  # No buyer for listing
            price=listing.price,
            transaction_type="listing",
            status="completed",
            blockchain_tx_id=confirm_data.blockchain_tx_id,
            gas_fee=confirm_data.gas_fee or 0.0
        )
        db.add(transaction)

        db.commit()

        logger.info(f"Confirmed listing {listing_id} with blockchain tx: {confirm_data.blockchain_tx_id}")

        return {
            "success": True,
            "listing_id": str(listing.id),
            "blockchain_tx_id": confirm_data.blockchain_tx_id,
            "message": "Listing confirmed on blockchain"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming listing: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error confirming listing: {str(e)}")

@router.put("/{listing_id}/update-blockchain-id")
async def update_blockchain_listing_id(
    listing_id: str,
    update_data: dict,
    db: Session = Depends(get_db)
):
    """
    Update the blockchain listing ID for a listing (recovery function)
    """
    try:
        # Validate UUID format
        try:
            uuid.UUID(listing_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid listing ID format")

        listing = db.query(Listing).filter(Listing.id == listing_id).first()
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")

        # Update listing metadata with blockchain listing ID
        blockchain_listing_id = update_data.get('blockchain_listing_id')
        if not blockchain_listing_id:
            raise HTTPException(status_code=400, detail="blockchain_listing_id is required")

        listing.listing_metadata = listing.listing_metadata or {}
        listing.listing_metadata["blockchain_listing_id"] = blockchain_listing_id
        listing.listing_metadata["blockchain_id_updated_at"] = datetime.utcnow().isoformat()
        listing.updated_at = datetime.utcnow()

        db.commit()

        logger.info(f"Updated blockchain listing ID for listing {listing_id}: {blockchain_listing_id}")

        return {
            "success": True,
            "message": "Blockchain listing ID updated successfully",
            "listing_id": listing_id,
            "blockchain_listing_id": blockchain_listing_id
        }
        
    except Exception as e:
        logger.error(f"Error updating blockchain listing ID: {e}")
        raise HTTPException(status_code=500, detail="Failed to update blockchain listing ID")

@router.get("/nft/{nft_id}/active")
async def get_active_listing_for_nft(
    nft_id: str,
    db: Session = Depends(get_db)
):
    """
    Get the active listing for a specific NFT
    """
    try:
        # Validate UUID format
        try:
            uuid.UUID(nft_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid NFT ID format")

        listing = db.query(Listing).filter(
            Listing.nft_id == nft_id,
            Listing.status == 'active'
        ).first()
        
        if not listing:
            raise HTTPException(status_code=404, detail="No active listing found for this NFT")

        return {
            "id": str(listing.id),
            "nft_id": str(listing.nft_id),
            "seller_wallet_address": listing.seller_wallet_address,
            "price": float(listing.price),
            "status": listing.status,
            "listing_metadata": listing.listing_metadata,
            "created_at": listing.created_at.isoformat(),
            "updated_at": listing.updated_at.isoformat() if listing.updated_at else None,
            "expires_at": listing.expires_at.isoformat() if listing.expires_at else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting active listing for NFT {nft_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get active listing")

@router.put("/{listing_id}/confirm-unlisting")
async def confirm_unlisting(
    listing_id: str,
    confirm_data: UnlistingConfirm,
    db: Session = Depends(get_db)
):
    """
    Confirm listing has been unlisted on blockchain and update status
    """
    try:
        # Validate UUID format
        try:
            uuid.UUID(listing_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid listing ID format")

        listing = db.query(Listing).filter(Listing.id == listing_id).first()
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")

        # Update listing status to cancelled
        listing.status = "cancelled"
        listing.updated_at = datetime.utcnow()

        # Update NFT listing status
        nft = db.query(NFT).filter(NFT.id == listing.nft_id).first()
        if nft:
            nft.is_listed = False

        # Record transaction history
        transaction = TransactionHistory(
            nft_id=listing.nft_id,
            listing_id=listing.id,
            seller_wallet_address=listing.seller_wallet_address,
            buyer_wallet_address="",  # No buyer for unlisting
            price=listing.price,
            transaction_type="unlisting",
            status="completed",
            blockchain_tx_id=confirm_data.blockchain_tx_id,
            gas_fee=confirm_data.gas_fee or 0.0
        )
        db.add(transaction)

        db.commit()

        logger.info(f"Confirmed unlisting {listing_id} with blockchain tx: {confirm_data.blockchain_tx_id}")

        return {
            "success": True,
            "listing_id": str(listing.id),
            "blockchain_tx_id": confirm_data.blockchain_tx_id,
            "message": "Unlisting confirmed on blockchain"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming unlisting: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error confirming unlisting: {str(e)}")

@router.put("/{listing_id}/confirm-edit")
async def confirm_edit_listing(
    listing_id: str,
    confirm_data: EditListingConfirm,
    db: Session = Depends(get_db)
):
    """
    Confirm listing has been edited on blockchain and update status
    """
    try:
        # Validate UUID format
        try:
            uuid.UUID(listing_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid listing ID format")

        listing = db.query(Listing).filter(Listing.id == listing_id).first()
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")

        # Store old price for transaction history
        old_price = listing.price

        # Update listing with new price
        listing.price = confirm_data.new_price
        listing.updated_at = datetime.utcnow()

        # Record transaction history
        transaction = TransactionHistory(
            nft_id=listing.nft_id,
            listing_id=listing.id,
            seller_wallet_address=listing.seller_wallet_address,
            buyer_wallet_address="",  # No buyer for edit listing
            price=confirm_data.new_price,
            transaction_type="edit_listing",
            status="completed",
            blockchain_tx_id=confirm_data.blockchain_tx_id,
            gas_fee=confirm_data.gas_fee or 0.0
        )
        db.add(transaction)

        db.commit()

        logger.info(f"Confirmed edit listing {listing_id} from {old_price} to {confirm_data.new_price} with blockchain tx: {confirm_data.blockchain_tx_id}")

        return {
            "success": True,
            "listing_id": str(listing.id),
            "old_price": float(old_price),
            "new_price": confirm_data.new_price,
            "blockchain_tx_id": confirm_data.blockchain_tx_id,
            "message": "Listing edit confirmed on blockchain"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming edit listing: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error confirming edit listing: {str(e)}")

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
                "seller_wallet_address": listing.seller_wallet_address,
                "price": float(listing.price) if listing.price else 0.0,
                "status": listing.status,
                "created_at": listing.created_at.isoformat() if listing.created_at else None
            })
        logger.info(f"Found {len(debug_info)} listings in database")
        return debug_info
    except Exception as e:
        logger.error(f"Error in debug endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-with-blockchain")
async def create_listing_with_blockchain(
    listing_data: BlockchainListingCreate,
    db: Session = Depends(get_db)
):
    """
    Create a listing with blockchain data (blockchain-first approach)
    """
    try:
        # Validate NFT exists
        nft = db.query(NFT).filter(NFT.id == listing_data.nft_id).first()
        if not nft:
            raise HTTPException(status_code=404, detail="NFT not found")

        # Check if NFT is already listed
        existing_listing = db.query(Listing).filter(
            and_(
                Listing.nft_id == listing_data.nft_id,
                Listing.status == "active"
            )
        ).first()

        if existing_listing:
            raise HTTPException(status_code=400, detail="NFT is already listed")

        # Create listing with blockchain data
        listing = Listing(
            nft_id=listing_data.nft_id,
            seller_wallet_address=nft.owner_wallet_address,
            price=listing_data.price,
            status="active",
            listing_metadata={
                "blockchain_listing_id": listing_data.blockchain_listing_id,
                "blockchain_tx_id": listing_data.blockchain_tx_id,
                "created_via": "blockchain_first_flow"
            }
        )

        db.add(listing)

        # Update NFT listing status
        nft.is_listed = True
        nft.price = listing_data.price

        # Record transaction history
        transaction = TransactionHistory(
            nft_id=listing_data.nft_id,
            listing_id=listing.id,
            seller_wallet_address=nft.owner_wallet_address,
            buyer_wallet_address="",
            price=listing_data.price,
            transaction_type="listing",
            status="completed",
            blockchain_tx_id=listing_data.blockchain_tx_id,
            gas_fee=listing_data.gas_fee or 0.0
        )
        db.add(transaction)

        db.commit()

        logger.info(f"Created listing with blockchain data: {listing.id}")

        return {
            "success": True,
            "listing_id": str(listing.id),
            "blockchain_listing_id": listing_data.blockchain_listing_id,
            "blockchain_tx_id": listing_data.blockchain_tx_id,
            "message": "Listing created with blockchain data"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating listing with blockchain data: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating listing: {str(e)}")

@router.get("/", response_model=List[ListingResponse])
async def get_listings(
    status: Optional[str] = Query(None, description="Filter by status"),
    seller_wallet_address: Optional[str] = Query(None, description="Filter by seller wallet address"),
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
        
        # Exclude cancelled listings by default
        if not include_deleted:
            query = query.filter(Listing.status != "cancelled")
        
        if status:
            query = query.filter(Listing.status == status)
        if seller_wallet_address:
            query = query.filter(Listing.seller_wallet_address == seller_wallet_address)
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
            seller = db.query(User).filter(User.wallet_address == listing.seller_wallet_address).first()
            
            response_listings.append(ListingResponse(
                id=listing.id,
                nft_id=listing.nft_id,
                seller_wallet_address=listing.seller_wallet_address,
                price=listing.price,
                expires_at=listing.expires_at,
                status=listing.status,
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
    This endpoint provides the main marketplace view - only shows active listings
    """
    try:
        # Start with active listings only
        query = db.query(Listing).filter(Listing.status == "active")
        
        # Join with NFT and User tables for filtering
        query = query.join(NFT, Listing.nft_id == NFT.id)
        query = query.join(User, Listing.seller_wallet_address == User.wallet_address)
        
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
                seller = db.query(User).filter(User.wallet_address == listing.seller_wallet_address).first()
                
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
                    seller_wallet_address=listing.seller_wallet_address,
                    price=price,
                    expires_at=listing.expires_at,
                    status=listing.status or "unknown",
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
        
        # Query listings for this user by wallet address
        query = db.query(Listing).filter(Listing.seller_wallet_address == wallet_address)
        
        # Exclude cancelled listings by default
        if not include_deleted:
            query = query.filter(Listing.status != "cancelled")
        
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
                seller_wallet_address=listing.seller_wallet_address,
                price=price,
                expires_at=listing.expires_at,
                status=listing.status or "unknown",
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
        # Calculate time filter based on period - ensure timezone awareness
        now = datetime.utcnow().replace(tzinfo=None)  # Make timezone-naive for comparison
        if time_period == "24h":
            start_time = now - timedelta(hours=24)
        elif time_period == "7d":
            start_time = now - timedelta(days=7)
        elif time_period == "30d":
            start_time = now - timedelta(days=30)
        else:  # "all"
            start_time = datetime.min
        
        # Get current period data - convert database timestamps to timezone-naive for comparison
        current_listings = db.query(Listing).filter(
            Listing.created_at >= start_time
        ).all()
        
        total_listings = len(current_listings)
        new_listings = len([l for l in current_listings if l.created_at.replace(tzinfo=None) >= start_time])
        
        # Get completed sales (transactions) in period  
        completed_sales_query = db.query(TransactionHistory).filter(
            TransactionHistory.created_at >= start_time
        )
        completed_sales = completed_sales_query.count()
        
        # Calculate total volume and average price with safe handling
        sales_data = completed_sales_query.all()
        total_volume = 0.0
        average_price = 0.0
        
        if sales_data:
            try:
                total_volume = sum([float(sale.price) if sale.price is not None else 0.0 for sale in sales_data])
                average_price = total_volume / len(sales_data) if len(sales_data) > 0 else 0.0
            except (TypeError, ValueError) as e:
                logger.warning(f"Error calculating sales data: {e}")
                total_volume = 0.0
                average_price = 0.0
        
        # Calculate price change (compare with previous period)
        prev_start = start_time - (now - start_time) if time_period != "all" else datetime.min
        prev_sales = db.query(TransactionHistory).filter(
            TransactionHistory.created_at >= prev_start,
            TransactionHistory.created_at < start_time,
            TransactionHistory.status == "completed"
        ).all()
        
        prev_avg_price = 0.0
        if prev_sales:
            try:
                prev_total = sum([float(sale.price) if sale.price is not None else 0.0 for sale in prev_sales])
                prev_avg_price = prev_total / len(prev_sales) if len(prev_sales) > 0 else 0.0
            except (TypeError, ValueError) as e:
                logger.warning(f"Error calculating previous sales data: {e}")
                prev_avg_price = 0.0
        
        price_change_percent = 0.0
        if prev_avg_price > 0:
            price_change_percent = ((average_price - prev_avg_price) / prev_avg_price * 100)
        
        # Get active users count (by wallet address, not seller_id)
        active_users = db.query(Listing.seller_wallet_address).filter(
            Listing.created_at >= start_time
        ).distinct().count()
        
        # Get fraud incidents (placeholder calculation)
        fraud_incidents = int(total_listings * 0.02)  # Assume 2% fraud rate
        fraud_rate = (fraud_incidents / total_listings * 100) if total_listings > 0 else 0.0
        
        # Get top categories with safe handling
        try:
            category_data = db.query(NFT.category, func.count(Listing.id).label('count')).join(
                Listing, NFT.id == Listing.nft_id
            ).filter(
                Listing.created_at >= start_time
            ).group_by(NFT.category).order_by(func.count(Listing.id).desc()).limit(5).all()
            
            top_categories = [
                {"category": cat[0] or "Unknown", "count": int(cat[1])}
                for cat in category_data
            ]
        except Exception as e:
            logger.warning(f"Error getting category data: {e}")
            top_categories = []
        
        # Generate price trends (simplified - daily averages for the period)
        price_trends = []
        try:
            if time_period == "24h":
                # Hourly trends for 24h
                for i in range(24):
                    hour_start = now - timedelta(hours=i+1)
                    hour_end = now - timedelta(hours=i)
                    hour_sales = db.query(TransactionHistory).filter(
                        TransactionHistory.created_at >= hour_start,
                        TransactionHistory.created_at < hour_end,
                        TransactionHistory.status == "completed"
                    ).all()
                    
                    hour_avg = 0.0
                    if hour_sales:
                        try:
                            hour_total = sum([float(sale.price) if sale.price is not None else 0.0 for sale in hour_sales])
                            hour_avg = hour_total / len(hour_sales) if len(hour_sales) > 0 else 0.0
                        except (TypeError, ValueError):
                            hour_avg = 0.0
                    
                    price_trends.append({
                        "timestamp": hour_start.isoformat(),
                        "average_price": hour_avg,
                        "volume": len(hour_sales)
                    })
            else:
                # Daily trends for longer periods
                days = 7 if time_period == "7d" else (30 if time_period == "30d" else 30)
                for i in range(days):
                    day_start = (now - timedelta(days=i+1)).replace(hour=0, minute=0, second=0, microsecond=0)
                    day_end = day_start + timedelta(days=1)
                    day_sales = db.query(TransactionHistory).filter(
                        TransactionHistory.created_at >= day_start,
                        TransactionHistory.created_at < day_end,
                        TransactionHistory.status == "completed"
                    ).all()
                    
                    day_avg = 0.0
                    if day_sales:
                        try:
                            day_total = sum([float(sale.price) if sale.price is not None else 0.0 for sale in day_sales])
                            day_avg = day_total / len(day_sales) if len(day_sales) > 0 else 0.0
                        except (TypeError, ValueError):
                            day_avg = 0.0
                    
                    price_trends.append({
                        "timestamp": day_start.isoformat(),
                        "average_price": day_avg,
                        "volume": len(day_sales)
                    })
        except Exception as e:
            logger.warning(f"Error generating price trends: {e}")
            price_trends = []
        
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
        
        # Exclude cancelled listings by default
        if not include_deleted:
            query = query.filter(Listing.status != "cancelled")
        
        listing = query.first()
        if not listing:
            # Enhanced debugging: log all available listing IDs
            all_listings = db.query(Listing).all()
            available_ids = [str(l.id) for l in all_listings]
            logger.error(f"Listing {listing_id} not found. Available listings: {available_ids[:10]}")
            raise HTTPException(status_code=404, detail=f"Listing not found with ID: {listing_id}")
        
        nft = db.query(NFT).filter(NFT.id == listing.nft_id).first()
        seller = db.query(User).filter(User.wallet_address == listing.seller_wallet_address).first()
        
        return ListingResponse(
            id=listing.id,
            nft_id=listing.nft_id,
            seller_wallet_address=listing.seller_wallet_address,
            price=listing.price,
            expires_at=listing.expires_at,
            status=listing.status,
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
        
        # Record old values for history (log only since ListingHistory model doesn't exist)
        old_price = listing.price
        logger.info(f"Updating listing {listing_id}: old_price={old_price}, new_price={listing_data.price}")
        
        # Update listing
        if listing_data.price is not None:
            listing.price = listing_data.price
        if listing_data.expires_at is not None:
            listing.expires_at = listing_data.expires_at
        if listing_data.listing_metadata is not None:
            listing.listing_metadata = listing_data.listing_metadata
        
        listing.updated_at = datetime.utcnow()
        
        # Log the update (since ListingHistory model doesn't exist)
        logger.info(f"Listing {listing_id} updated successfully")
        
        db.commit()
        db.refresh(listing)
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
    """Cancel a listing (soft delete - marks as cancelled rather than removing from database)"""
    try:
        logger.info(f"Attempting to delete listing with ID: {listing_id}")
        listing = db.query(Listing).filter(Listing.id == listing_id).first()
        if not listing:
            # Enhanced debugging: log all available listing IDs
            all_listings = db.query(Listing).all()
            available_ids = [str(l.id) for l in all_listings]
            logger.error(f"Listing {listing_id} not found. Available listings: {available_ids[:10]}")
            raise HTTPException(status_code=404, detail=f"Listing not found with ID: {listing_id}")
        
        # Check if already cancelled
        if listing.status == "cancelled":
            raise HTTPException(status_code=400, detail="Listing is already cancelled")
        
        # Log the deletion (since ListingHistory model doesn't exist)
        logger.info(f"Cancelling listing {listing_id}: price={listing.price}")
        
        # Update NFT listing status
        nft = db.query(NFT).filter(NFT.id == listing.nft_id).first()
        if nft:
            nft.is_listed = False
            logger.info(f"Updated NFT {nft.id} listing status to inactive")
        
        # Soft delete: Mark listing as cancelled instead of removing it
        listing.status = "cancelled"
        listing.updated_at = datetime.utcnow()
        
        db.commit()
        
        return {"message": "Listing cancelled successfully"}
        
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
    """Get history for a specific listing (placeholder - ListingHistory model doesn't exist)"""
    try:
        # Since ListingHistory model doesn't exist, return empty list with warning
        logger.warning(f"ListingHistory model not available. Returning empty history for listing {listing_id}")
        return []
        
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
        
        # Get active sellers count (by wallet address)
        active_sellers = db.query(Listing.seller_wallet_address).filter(
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
    seller_wallet_address: Optional[str] = Query(None, description="Filter by seller wallet address"),
    buyer_wallet_address: Optional[str] = Query(None, description="Filter by buyer wallet address"),
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
        if seller_wallet_address:
            query = query.filter(TransactionHistory.seller_wallet_address == seller_wallet_address)
        if buyer_wallet_address:
            query = query.filter(TransactionHistory.buyer_wallet_address == buyer_wallet_address)
        if transaction_type:
            query = query.filter(TransactionHistory.transaction_type == transaction_type)
        
        transactions = query.order_by(TransactionHistory.created_at.desc()).offset(offset).limit(limit).all()
        
        return transactions
        
    except Exception as e:
        logger.error(f"Error fetching transaction history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch transaction history")
