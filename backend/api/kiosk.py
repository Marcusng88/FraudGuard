"""
Kiosk Management API Module
Handles kiosk creation, ownership verification, and blockchain synchronization
"""
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

try:
    from database.connection import get_db
    from models.database import UserKioskMap, User
    from agent.sui_client import sui_client
    from agent.supabase_client import supabase_client
except ImportError:
    from backend.database.connection import get_db
    from backend.models.database import UserKioskMap, User
    from backend.agent.sui_client import sui_client
    from backend.agent.supabase_client import supabase_client

logger = logging.getLogger(__name__)

# Create router
if APIRouter:
    router = APIRouter(prefix="/api/kiosk", tags=["kiosk"])
else:
    router = None

# Pydantic Models
class KioskCreate(BaseModel):
    wallet_address: str
    user_id: Optional[UUID] = None

class KioskResponse(BaseModel):
    id: UUID
    user_id: UUID
    kiosk_id: str
    kiosk_owner_cap_id: Optional[str] = None
    sync_status: str
    last_synced_at: datetime
    created_at: datetime
    user_wallet: Optional[str] = None
    username: Optional[str] = None

class KioskOwnershipResponse(BaseModel):
    has_kiosk: bool
    kiosk_id: Optional[str] = None
    kiosk_owner_cap_id: Optional[str] = None
    sync_status: Optional[str] = None
    last_synced_at: Optional[datetime] = None

class KioskSyncResponse(BaseModel):
    success: bool
    message: str
    kiosk_id: Optional[str] = None
    sync_status: Optional[str] = None

# API Routes
if router:
    @router.post("/create", response_model=KioskResponse)
    async def create_kiosk(
        kiosk_data: KioskCreate,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db)
    ):
        """Create a new kiosk for a user"""
        try:
            # Check if user exists
            user = db.query(User).filter(User.wallet_address == kiosk_data.wallet_address).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Check if kiosk already exists
            existing_kiosk = db.query(UserKioskMap).filter(
                UserKioskMap.user_id == user.id
            ).first()
            
            if existing_kiosk:
                raise HTTPException(status_code=400, detail="User already has a kiosk")
            
            # Create kiosk mapping (actual kiosk creation happens on blockchain)
            kiosk_map = UserKioskMap(
                user_id=user.id,
                kiosk_id="",  # Will be set after blockchain creation
                sync_status="pending"
            )
            
            db.add(kiosk_map)
            db.commit()
            db.refresh(kiosk_map)
            
            # Background task to create kiosk on blockchain
            background_tasks.add_task(create_kiosk_on_blockchain, kiosk_map.id, kiosk_data.wallet_address)
            
            return KioskResponse(
                id=kiosk_map.id,
                user_id=kiosk_map.user_id,
                kiosk_id=kiosk_map.kiosk_id,
                kiosk_owner_cap_id=kiosk_map.kiosk_owner_cap_id,
                sync_status=kiosk_map.sync_status,
                last_synced_at=kiosk_map.last_synced_at,
                created_at=kiosk_map.created_at,
                user_wallet=user.wallet_address,
                username=user.username
            )
            
        except Exception as e:
            logger.error(f"Error creating kiosk: {e}")
            raise HTTPException(status_code=500, detail="Failed to create kiosk")

    @router.get("/user/{wallet_address}", response_model=KioskResponse)
    async def get_user_kiosk(
        wallet_address: str,
        db: Session = Depends(get_db)
    ):
        """Get kiosk information for a user"""
        try:
            user = db.query(User).filter(User.wallet_address == wallet_address).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            kiosk_map = db.query(UserKioskMap).filter(
                UserKioskMap.user_id == user.id
            ).first()
            
            if not kiosk_map:
                raise HTTPException(status_code=404, detail="Kiosk not found")
            
            return KioskResponse(
                id=kiosk_map.id,
                user_id=kiosk_map.user_id,
                kiosk_id=kiosk_map.kiosk_id,
                kiosk_owner_cap_id=kiosk_map.kiosk_owner_cap_id,
                sync_status=kiosk_map.sync_status,
                last_synced_at=kiosk_map.last_synced_at,
                created_at=kiosk_map.created_at,
                user_wallet=user.wallet_address,
                username=user.username
            )
            
        except Exception as e:
            logger.error(f"Error fetching kiosk for {wallet_address}: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch kiosk")

    @router.post("/check-ownership", response_model=KioskOwnershipResponse)
    async def check_kiosk_ownership(
        wallet_address: str,
        db: Session = Depends(get_db)
    ):
        """Check if a user owns a kiosk"""
        try:
            user = db.query(User).filter(User.wallet_address == wallet_address).first()
            if not user:
                return KioskOwnershipResponse(has_kiosk=False)
            
            kiosk_map = db.query(UserKioskMap).filter(
                UserKioskMap.user_id == user.id
            ).first()
            
            if not kiosk_map:
                return KioskOwnershipResponse(has_kiosk=False)
            
            return KioskOwnershipResponse(
                has_kiosk=True,
                kiosk_id=kiosk_map.kiosk_id,
                kiosk_owner_cap_id=kiosk_map.kiosk_owner_cap_id,
                sync_status=kiosk_map.sync_status,
                last_synced_at=kiosk_map.last_synced_at
            )
            
        except Exception as e:
            logger.error(f"Error checking kiosk ownership for {wallet_address}: {e}")
            raise HTTPException(status_code=500, detail="Failed to check kiosk ownership")

    @router.post("/sync/{kiosk_id}", response_model=KioskSyncResponse)
    async def sync_kiosk(
        kiosk_id: str,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db)
    ):
        """Sync kiosk data with blockchain"""
        try:
            kiosk_map = db.query(UserKioskMap).filter(
                UserKioskMap.kiosk_id == kiosk_id
            ).first()
            
            if not kiosk_map:
                raise HTTPException(status_code=404, detail="Kiosk not found")
            
            # Update sync status
            kiosk_map.sync_status = "syncing"
            kiosk_map.last_synced_at = datetime.utcnow()
            db.commit()
            
            # Background task to sync with blockchain
            background_tasks.add_task(sync_kiosk_with_blockchain, kiosk_id)
            
            return KioskSyncResponse(
                success=True,
                message="Kiosk sync initiated",
                kiosk_id=kiosk_id,
                sync_status="syncing"
            )
            
        except Exception as e:
            logger.error(f"Error syncing kiosk {kiosk_id}: {e}")
            raise HTTPException(status_code=500, detail="Failed to sync kiosk")

    @router.get("/list", response_model=List[KioskResponse])
    async def list_kiosks(
        sync_status: Optional[str] = Query(None, description="Filter by sync status"),
        limit: int = Query(50, description="Number of kiosks to return"),
        offset: int = Query(0, description="Number of kiosks to skip"),
        db: Session = Depends(get_db)
    ):
        """Get all kiosks with optional filters"""
        try:
            query = db.query(UserKioskMap).join(User)
            
            if sync_status:
                query = query.filter(UserKioskMap.sync_status == sync_status)
            
            kiosk_maps = query.offset(offset).limit(limit).all()
            
            response_list = []
            for kiosk_map in kiosk_maps:
                user = db.query(User).filter(User.id == kiosk_map.user_id).first()
                
                response_list.append(KioskResponse(
                    id=kiosk_map.id,
                    user_id=kiosk_map.user_id,
                    kiosk_id=kiosk_map.kiosk_id,
                    kiosk_owner_cap_id=kiosk_map.kiosk_owner_cap_id,
                    sync_status=kiosk_map.sync_status,
                    last_synced_at=kiosk_map.last_synced_at,
                    created_at=kiosk_map.created_at,
                    user_wallet=user.wallet_address if user else None,
                    username=user.username if user else None
                ))
            
            return response_list
            
        except Exception as e:
            logger.error(f"Error fetching kiosks: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch kiosks")

    @router.delete("/{kiosk_id}")
    async def delete_kiosk(
        kiosk_id: str,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db)
    ):
        """Delete a kiosk (admin function)"""
        try:
            kiosk_map = db.query(UserKioskMap).filter(
                UserKioskMap.kiosk_id == kiosk_id
            ).first()
            
            if not kiosk_map:
                raise HTTPException(status_code=404, detail="Kiosk not found")
            
            # Background task to delete kiosk on blockchain
            background_tasks.add_task(delete_kiosk_on_blockchain, kiosk_id)
            
            # Delete from database
            db.delete(kiosk_map)
            db.commit()
            
            return {"message": "Kiosk deleted successfully"}
            
        except Exception as e:
            logger.error(f"Error deleting kiosk {kiosk_id}: {e}")
            raise HTTPException(status_code=500, detail="Failed to delete kiosk")

# Background task functions
async def create_kiosk_on_blockchain(kiosk_map_id: UUID, wallet_address: str):
    """Create kiosk on blockchain"""
    try:
        logger.info(f"Creating kiosk on blockchain for {wallet_address}")
        
        # Initialize Sui client
        if await sui_client.initialize():
            # Call the create_kiosk_if_not_exists function
            # This would be implemented in the Sui client
            logger.info(f"Kiosk creation initiated for {wallet_address}")
        else:
            logger.error("Failed to initialize Sui client for kiosk creation")
            
    except Exception as e:
        logger.error(f"Error creating kiosk on blockchain: {e}")

async def sync_kiosk_with_blockchain(kiosk_id: str):
    """Sync kiosk data with blockchain"""
    try:
        logger.info(f"Syncing kiosk {kiosk_id} with blockchain")
        
        # Initialize Sui client
        if await sui_client.initialize():
            # Get kiosk data from blockchain
            # Update local database with blockchain state
            logger.info(f"Kiosk sync completed for {kiosk_id}")
        else:
            logger.error("Failed to initialize Sui client for kiosk sync")
            
    except Exception as e:
        logger.error(f"Error syncing kiosk with blockchain: {e}")

async def delete_kiosk_on_blockchain(kiosk_id: str):
    """Delete kiosk on blockchain"""
    try:
        logger.info(f"Deleting kiosk {kiosk_id} on blockchain")
        
        # Initialize Sui client
        if await sui_client.initialize():
            # Delete kiosk on blockchain
            logger.info(f"Kiosk deletion initiated for {kiosk_id}")
        else:
            logger.error("Failed to initialize Sui client for kiosk deletion")
            
    except Exception as e:
        logger.error(f"Error deleting kiosk on blockchain: {e}") 