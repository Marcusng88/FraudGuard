"""
Blockchain listing operations for FraudGuard
Handles the integration between backend database and blockchain marketplace
Works with existing database schema using listing_metadata field
"""
import logging
import uuid
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_

# Import models
try:
    from models.database import NFT, Listing, TransactionHistory
    from database.connection import get_db
except ImportError:
    try:
        from backend.models.database import NFT, Listing, TransactionHistory
        from backend.database.connection import get_db
    except ImportError:
        pass

logger = logging.getLogger(__name__)

class BlockchainListingService:
    """Service for managing blockchain listing operations using existing DB schema"""
    
    def __init__(self, db: Session):
        self.db = db

    def _resolve_nft_uuid(self, identifier: str) -> uuid.UUID:
        """
        Resolve an NFT identifier to a UUID primary key.
        Accepts either a UUID string (database id) or a Sui object id string (sui_object_id).
        Returns the UUID of the NFT if found, raises ValueError otherwise.
        """
        # Try parse as UUID first
        try:
            nft_uuid = uuid.UUID(str(identifier))
            # Verify it exists
            nft = self.db.query(NFT).filter(NFT.id == nft_uuid).first()
            if nft:
                return nft.id
        except Exception:
            pass

        # Fallback: treat as Sui object id
        nft = self.db.query(NFT).filter(NFT.sui_object_id == identifier).first()
        if nft:
            return nft.id

        raise ValueError(f"NFT not found for identifier: {identifier}")
    
    async def create_listing_with_blockchain(
        self,
        nft_id: str,
        seller_wallet_address: str,
        price: float,
        blockchain_tx_id: str,
        marketplace_object_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a listing in the database after successful blockchain transaction
        Uses existing listing_metadata field to store blockchain data
        """
        try:
            # Resolve identifier and fetch NFT
            resolved_nft_id = self._resolve_nft_uuid(nft_id)
            nft = self.db.query(NFT).filter(NFT.id == resolved_nft_id).first()

            if nft.owner_wallet_address != seller_wallet_address:
                raise ValueError(f"NFT is not owned by seller {seller_wallet_address}")

            # Check if NFT is already listed
            existing_listing = self.db.query(Listing).filter(
                and_(
                    Listing.nft_id == resolved_nft_id,
                    Listing.status == 'active'
                )
            ).first()

            # If a listing already exists (DB-first flow), update its metadata instead of erroring
            if existing_listing:
                logger.info(
                    f"Active listing already exists for NFT {nft_id} ({existing_listing.id}). "
                    "Updating listing_metadata with blockchain data."
                )

                # Ensure metadata dict exists and merge
                existing_listing.listing_metadata = existing_listing.listing_metadata or {}
                existing_listing.listing_metadata.update({
                    'blockchain_tx_id': blockchain_tx_id,
                    'marketplace_object_id': marketplace_object_id,
                    'listing_type': 'escrow',
                    'blockchain_status': 'active',
                    'created_via': 'blockchain_transaction'
                })

                # Optionally sync price from blockchain payload if provided
                if price is not None:
                    try:
                        existing_price = float(existing_listing.price) if existing_listing.price is not None else None
                    except Exception:
                        existing_price = None
                    if existing_price != price:
                        existing_listing.price = price

                # Keep NFT marked as listed
                nft.is_listed = True

                # Record transaction history for the listing confirmation (idempotent safe)
                transaction = TransactionHistory(
                    nft_id=resolved_nft_id,
                    listing_id=existing_listing.id,
                    seller_wallet_address=seller_wallet_address,
                    buyer_wallet_address=seller_wallet_address,  # Same as seller for listing
                    price=existing_listing.price,
                    transaction_type='listing',
                    blockchain_tx_id=blockchain_tx_id,
                    status='completed'
                )

                self.db.add(transaction)
                self.db.commit()
                self.db.refresh(existing_listing)

                logger.info(
                    f"Updated existing listing {existing_listing.id} with blockchain data for NFT {nft_id}"
                )

                return {
                    'success': True,
                    'listing_id': str(existing_listing.id),
                    'nft_id': str(resolved_nft_id),
                    'seller_wallet_address': seller_wallet_address,
                    'price': float(existing_listing.price) if existing_listing.price is not None else price,
                    'status': existing_listing.status,
                    'blockchain_tx_id': blockchain_tx_id,
                    'marketplace_object_id': marketplace_object_id
                }

            # Create blockchain metadata
            blockchain_metadata = {
                'blockchain_tx_id': blockchain_tx_id,
                'marketplace_object_id': marketplace_object_id,
                'listing_type': 'escrow',
                'blockchain_status': 'active',
                'created_via': 'blockchain_transaction'
            }

            # Create new listing
            listing = Listing(
                nft_id=resolved_nft_id,
                seller_wallet_address=seller_wallet_address,
                price=price,
                status='active',
                listing_metadata=blockchain_metadata
            )

            self.db.add(listing)
            # Ensure listing.id is available for transaction_history FK
            self.db.flush()

            # Update NFT status
            nft.is_listed = True

            # Create transaction history
            transaction = TransactionHistory(
                nft_id=resolved_nft_id,
                listing_id=listing.id,
                seller_wallet_address=seller_wallet_address,
                buyer_wallet_address=seller_wallet_address,  # Same as seller for listing
                price=price,
                transaction_type='listing',
                blockchain_tx_id=blockchain_tx_id,
                status='completed'
            )

            self.db.add(transaction)
            self.db.commit()
            self.db.refresh(listing)

            logger.info(f"Successfully created blockchain listing {listing.id} for NFT {nft_id}")

            return {
                'success': True,
                'listing_id': str(listing.id),
                'nft_id': str(resolved_nft_id),
                'seller_wallet_address': seller_wallet_address,
                'price': price,
                'status': 'active',
                'blockchain_tx_id': blockchain_tx_id,
                'marketplace_object_id': marketplace_object_id
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating blockchain listing: {e}")
            raise
    
    async def complete_purchase_with_blockchain(
        self,
        nft_id: str,
        buyer_wallet_address: str,
        seller_wallet_address: str,
        price: float,
        blockchain_tx_id: str,
        marketplace_fee: float,
        gas_fee: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Complete a purchase in the database after successful blockchain transaction
        """
        try:
            # Resolve identifier and find the active listing
            resolved_nft_id = self._resolve_nft_uuid(nft_id)
            listing = self.db.query(Listing).filter(
                and_(
                    Listing.nft_id == resolved_nft_id,
                    Listing.seller_wallet_address == seller_wallet_address,
                    Listing.status == 'active'
                )
            ).first()
            
            if not listing:
                raise ValueError(f"No active listing found for NFT {nft_id}")
            
            # Get the NFT
            nft = self.db.query(NFT).filter(NFT.id == resolved_nft_id).first()
            if not nft:
                raise ValueError(f"NFT with id {nft_id} not found")
            
            # Update listing status and metadata
            listing.status = 'sold'
            if listing.listing_metadata:
                listing.listing_metadata['purchase_tx_id'] = blockchain_tx_id
                listing.listing_metadata['blockchain_status'] = 'sold'
                listing.listing_metadata['buyer_wallet_address'] = buyer_wallet_address
            
            # Update NFT ownership and listing status
            nft.owner_wallet_address = buyer_wallet_address
            nft.is_listed = False
            
            # Create transaction history
            transaction = TransactionHistory(
                nft_id=resolved_nft_id,
                listing_id=listing.id,
                seller_wallet_address=seller_wallet_address,
                buyer_wallet_address=buyer_wallet_address,
                price=price,
                transaction_type='purchase',
                blockchain_tx_id=blockchain_tx_id,
                gas_fee=gas_fee,
                status='completed'
            )
            
            self.db.add(transaction)
            self.db.commit()
            self.db.refresh(transaction)
            
            logger.info(f"Successfully completed purchase of NFT {nft_id} by {buyer_wallet_address}")
            
            return {
                'success': True,
                'transaction_id': str(transaction.id),
                'nft_id': str(resolved_nft_id),
                'buyer_wallet_address': buyer_wallet_address,
                'seller_wallet_address': seller_wallet_address,
                'price': price,
                'marketplace_fee': marketplace_fee,
                'blockchain_tx_id': blockchain_tx_id,
                'gas_fee': gas_fee
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error completing blockchain purchase: {e}")
            raise
    
    async def cancel_listing_with_blockchain(
        self,
        nft_id: str,
        seller_wallet_address: str,
        blockchain_tx_id: str
    ) -> Dict[str, Any]:
        """
        Cancel a listing in the database after successful blockchain transaction
        """
        try:
            # Resolve identifier and find the active listing
            resolved_nft_id = self._resolve_nft_uuid(nft_id)
            listing = self.db.query(Listing).filter(
                and_(
                    Listing.nft_id == resolved_nft_id,
                    Listing.seller_wallet_address == seller_wallet_address,
                    Listing.status == 'active'
                )
            ).first()
            
            if not listing:
                raise ValueError(f"No active listing found for NFT {nft_id}")
            
            # Get the NFT
            nft = self.db.query(NFT).filter(NFT.id == resolved_nft_id).first()
            if not nft:
                raise ValueError(f"NFT with id {nft_id} not found")
            
            # Update listing status and metadata
            listing.status = 'cancelled'
            if listing.listing_metadata:
                listing.listing_metadata['unlist_tx_id'] = blockchain_tx_id
                listing.listing_metadata['blockchain_status'] = 'cancelled'
            
            # Update NFT listing status
            nft.is_listed = False
            
            # Create transaction history
            transaction = TransactionHistory(
                nft_id=resolved_nft_id,
                listing_id=listing.id,
                seller_wallet_address=seller_wallet_address,
                buyer_wallet_address=seller_wallet_address,  # Same as seller for unlisting
                price=listing.price,
                transaction_type='unlisting',
                blockchain_tx_id=blockchain_tx_id,
                status='completed'
            )
            
            self.db.add(transaction)
            self.db.commit()
            self.db.refresh(transaction)
            
            logger.info(f"Successfully cancelled listing for NFT {nft_id}")
            
            return {
                'success': True,
                'nft_id': str(resolved_nft_id),
                'seller_wallet_address': seller_wallet_address,
                'blockchain_tx_id': blockchain_tx_id,
                'status': 'cancelled'
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error cancelling blockchain listing: {e}")
            raise
    
    async def update_listing_price_with_blockchain(
        self,
        nft_id: str,
        seller_wallet_address: str,
        new_price: float,
        blockchain_tx_id: str
    ) -> Dict[str, Any]:
        """
        Update listing price in the database after successful blockchain transaction
        """
        try:
            # Resolve identifier and find the active listing
            resolved_nft_id = self._resolve_nft_uuid(nft_id)
            listing = self.db.query(Listing).filter(
                and_(
                    Listing.nft_id == resolved_nft_id,
                    Listing.seller_wallet_address == seller_wallet_address,
                    Listing.status == 'active'
                )
            ).first()
            
            if not listing:
                raise ValueError(f"No active listing found for NFT {nft_id}")
            
            old_price = listing.price
            listing.price = new_price
            
            # Update metadata
            if not listing.listing_metadata:
                listing.listing_metadata = {}
            listing.listing_metadata['price_update_tx_id'] = blockchain_tx_id
            listing.listing_metadata['previous_price'] = float(old_price)
            listing.listing_metadata['price_updated_at'] = blockchain_tx_id
            
            # Create transaction history
            transaction = TransactionHistory(
                nft_id=resolved_nft_id,
                listing_id=listing.id,
                seller_wallet_address=seller_wallet_address,
                buyer_wallet_address=seller_wallet_address,  # Same as seller for price update
                price=new_price,
                transaction_type='edit_listing',
                blockchain_tx_id=blockchain_tx_id,
                status='completed'
            )
            
            self.db.add(transaction)
            self.db.commit()
            self.db.refresh(transaction)
            
            logger.info(f"Successfully updated listing price for NFT {nft_id} from {old_price} to {new_price}")
            
            return {
                'success': True,
                'nft_id': str(resolved_nft_id),
                'seller_wallet_address': seller_wallet_address,
                'old_price': float(old_price),
                'new_price': new_price,
                'blockchain_tx_id': blockchain_tx_id
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating blockchain listing price: {e}")
            raise

    def get_listing_by_nft_id(self, nft_id: str) -> Optional[Dict[str, Any]]:
        """
        Get active listing information for an NFT
        Returns blockchain metadata if available
        """
        try:
            resolved_nft_id = self._resolve_nft_uuid(nft_id)
            listing = self.db.query(Listing).filter(
                and_(
                    Listing.nft_id == resolved_nft_id,
                    Listing.status == 'active'
                )
            ).first()
            
            if not listing:
                return None
            
            return {
                'id': str(listing.id),
                'nft_id': str(resolved_nft_id),
                'seller_wallet_address': listing.seller_wallet_address,
                'price': float(listing.price),
                'status': listing.status,
                'created_at': listing.created_at.isoformat(),
                'blockchain_metadata': listing.listing_metadata or {},
                'is_blockchain_listing': bool(listing.listing_metadata and 
                                           listing.listing_metadata.get('blockchain_tx_id'))
            }
            
        except Exception as e:
            logger.error(f"Error getting listing for NFT {nft_id}: {e}")
            return None


def get_blockchain_listing_service(db: Session) -> BlockchainListingService:
    """Get blockchain listing service instance"""
    return BlockchainListingService(db)
