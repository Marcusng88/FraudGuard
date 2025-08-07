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
    
    if not listing.is_active:
        raise HTTPException(status_code=400, detail="Listing is not active")

    # Create transaction record
    tx_record = TransactionHistory(
        blockchain_tx_id=transaction.blockchain_tx_id,
        listing_id=transaction.listing_id,
        nft_blockchain_id=transaction.nft_blockchain_id,
        seller_wallet_address=transaction.seller_wallet_address,
        buyer_wallet_address=transaction.buyer_wallet_address,
        price=transaction.price,
        marketplace_fee=transaction.marketplace_fee,
        seller_amount=transaction.seller_amount,
        gas_fee=transaction.gas_fee,
        transaction_type=transaction.transaction_type,
        status="completed"
    )
    
    try:
        # Update database records
        db.add(tx_record)
        
        # Update NFT ownership
        nft = db.query(NFT).filter(NFT.blockchain_id == transaction.nft_blockchain_id).first()
        if nft:
            nft.owner_wallet_address = transaction.buyer_wallet_address
            
        # Mark listing as sold
        listing.is_active = False
        listing.sold_at = datetime.utcnow()
        listing.transaction_id = transaction.blockchain_tx_id
        
        # Update user reputation scores (basic implementation)
        buyer = db.query(User).filter(User.wallet_address == transaction.buyer_wallet_address).first()
        seller = db.query(User).filter(User.wallet_address == transaction.seller_wallet_address).first()
        
        if buyer:
            buyer.transaction_count += 1
        if seller:
            seller.transaction_count += 1
        
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
        
    return BlockchainTransactionResponse(
        blockchain_tx_id=tx.blockchain_tx_id,
        status=tx.status,
        price=tx.price,
        marketplace_fee=tx.marketplace_fee,
        seller_amount=tx.seller_amount,
        gas_fee=tx.gas_fee,
        created_at=tx.created_at,
        transaction_type=tx.transaction_type
    )
