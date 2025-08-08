"""
Transaction API endpoints for FraudGuard
Handles blockchain transaction recording and status tracking
"""
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, UUID4
from datetime import datetime
from sqlalchemy.orm import Session
from database.connection import get_db
from models.database import TransactionHistory, Listing, NFT, User

router = APIRouter(prefix="/api/transactions")

class BlockchainTransactionCreate(BaseModel):
    blockchain_tx_id: str
    listing_id: UUID4
    nft_blockchain_id: str
    seller_wallet_address: str
    buyer_wallet_address: str
    price: float
    marketplace_fee: float
    seller_amount: float
    gas_fee: Optional[float] = None
    transaction_type: str = "purchase"

class BlockchainTransactionResponse(BaseModel):
    blockchain_tx_id: str
    status: str
    price: float
    marketplace_fee: float
    seller_amount: float
    gas_fee: Optional[float]
    created_at: datetime
    transaction_type: str

@router.post("/blockchain", response_model=BlockchainTransactionResponse)
async def record_blockchain_transaction(
    transaction: BlockchainTransactionCreate,
    db: Session = Depends(get_db)
):
    """Record a blockchain transaction after successful execution"""
    # Verify the listing exists and is active
    listing = db.query(Listing).filter(Listing.id == transaction.listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing.status != "active":
        raise HTTPException(status_code=400, detail="Listing is not active")

    # Verify the NFT exists (use sui_object_id which matches the database schema)
    nft = db.query(NFT).filter(NFT.sui_object_id == transaction.nft_blockchain_id).first()
    if not nft:
        # Fallback: try to find by the NFT ID associated with this listing
        nft = db.query(NFT).filter(NFT.id == listing.nft_id).first()
        if not nft:
            raise HTTPException(status_code=404, detail="NFT not found")

    # Create transaction record
    tx_record = TransactionHistory(
        blockchain_tx_id=transaction.blockchain_tx_id,
        nft_id=nft.id,  # Use nft_id which exists in the database schema
        listing_id=transaction.listing_id,
        seller_wallet_address=transaction.seller_wallet_address,
        buyer_wallet_address=transaction.buyer_wallet_address,
        price=transaction.price,
        transaction_type=transaction.transaction_type,
        gas_fee=transaction.gas_fee,
        status="completed"
    )
    
    try:
        # Update database records
        db.add(tx_record)
        
        # Update NFT ownership - this is the key fix
        nft.owner_wallet_address = transaction.buyer_wallet_address
        nft.is_listed = False  # Remove from listings since it's sold
        
        # Mark listing as sold (update status instead of non-existent fields)
        listing.status = "sold"
        listing.updated_at = datetime.utcnow()
        
        # Update user reputation scores (basic implementation)
        # Note: User model doesn't have transaction_count field, so we'll skip this for now
        # In the future, we can add user reputation events
        
        db.commit()
        
        return BlockchainTransactionResponse(
            blockchain_tx_id=transaction.blockchain_tx_id,
            status="completed",
            price=transaction.price,
            marketplace_fee=transaction.marketplace_fee,
            seller_amount=transaction.seller_amount,
            gas_fee=transaction.gas_fee,
            created_at=tx_record.created_at,
            transaction_type=transaction.transaction_type
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to record transaction: {str(e)}")

@router.get("/blockchain/{tx_id}", response_model=BlockchainTransactionResponse)
async def get_transaction_status(
    tx_id: str,
    db: Session = Depends(get_db)
):
    """Get the status of a blockchain transaction"""
    tx = db.query(TransactionHistory).filter(
        TransactionHistory.blockchain_tx_id == tx_id
    ).first()
    
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    # Calculate derived values since they're not stored in the database
    marketplace_fee = float(tx.price) * 0.025  # 2.5% marketplace fee
    seller_amount = float(tx.price) - marketplace_fee
        
    return BlockchainTransactionResponse(
        blockchain_tx_id=tx.blockchain_tx_id,
        status=tx.status,
        price=float(tx.price),
        marketplace_fee=marketplace_fee,
        seller_amount=seller_amount,
        gas_fee=float(tx.gas_fee) if tx.gas_fee else None,
        created_at=tx.created_at,
        transaction_type=tx.transaction_type
    )

@router.get("/user/{wallet_address}")
async def get_user_transactions(
    wallet_address: str,
    db: Session = Depends(get_db),
    transaction_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """Get transaction history for a user"""
    query = db.query(TransactionHistory).filter(
        (TransactionHistory.buyer_wallet_address == wallet_address) |
        (TransactionHistory.seller_wallet_address == wallet_address)
    )
    
    if transaction_type:
        query = query.filter(TransactionHistory.transaction_type == transaction_type)
    
    transactions = query.order_by(TransactionHistory.created_at.desc()).offset(offset).limit(limit).all()
    
    return {
        "transactions": transactions,
        "total": query.count(),
        "limit": limit,
        "offset": offset
    }
