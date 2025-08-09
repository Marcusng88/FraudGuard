# NFT Listing/Unlisting/Edit Implementation Guide

This document describes the complete implementation of NFT listing, unlisting, and edit listing functionality that follows the same pattern as NFT minting and matches the backend database structure.

## Overview

The implementation follows the exact same flow pattern as NFT minting:

1. **Frontend** creates/prepares record in database
2. **Frontend** calls smart contract on blockchain
3. **Smart contract** emits events with transaction data
4. **Frontend** processes transaction results
5. **Frontend** calls backend confirmation endpoint to update database

## Database Structure

The implementation matches the existing database structure:

### Listings Table
```sql
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nft_id UUID REFERENCES nfts(id) ON DELETE CASCADE,
    seller_wallet_address TEXT NOT NULL,
    price DECIMAL(18,8) NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled', 'expired')),
    listing_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);
```

### Transaction History Table
```sql
CREATE TABLE transaction_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nft_id UUID REFERENCES nfts(id),
    listing_id UUID REFERENCES listings(id),
    seller_wallet_address TEXT NOT NULL,
    buyer_wallet_address TEXT NOT NULL,
    price DECIMAL(18,8) NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('mint', 'purchase', 'listing', 'unlisting', 'edit_listing')),
    blockchain_tx_id TEXT,
    gas_fee DECIMAL(18,8),
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Smart Contract Implementation

### Enhanced Events

Added new events that match the database structure:

```move
/// Emitted when NFT is unlisted (for backend database sync)
public struct NFTUnlisted has copy, drop {
    listing_id: ID,
    nft_id: ID,
    seller: address,
    marketplace_id: ID,
    timestamp: u64,
    transaction_digest: vector<u8>,
}

/// Emitted when listing is edited (for backend database sync)
public struct ListingEdited has copy, drop {
    listing_id: ID,
    nft_id: ID,
    seller: address,
    old_price: u64,
    new_price: u64,
    marketplace_id: ID,
    timestamp: u64,
    transaction_digest: vector<u8>,
}
```

### New Functions

Added functions that follow the same pattern as NFT minting:

```move
/// List an NFT for sale with database sync (follows NFT minting pattern)
public entry fun list_nft_with_sync(
    nft: FraudGuardNFT,
    price: u64,
    ctx: &mut TxContext
)

/// Unlist an NFT with database sync (follows NFT minting pattern)
public entry fun unlist_nft_with_sync(
    listing: Listing,
    ctx: &mut TxContext
)

/// Edit listing price with database sync (follows NFT minting pattern)
public entry fun edit_listing_price_with_sync(
    listing: &mut Listing,
    new_price: u64,
    ctx: &mut TxContext
)
```

## Backend API Implementation

### New Confirmation Endpoints

Following the same pattern as `/api/nft/{nft_id}/confirm-mint`:

```python
@router.put("/{listing_id}/confirm-listing")
async def confirm_listing(
    listing_id: str,
    confirm_data: ListingConfirm,
    db: Session = Depends(get_db)
)

@router.put("/{listing_id}/confirm-unlisting")
async def confirm_unlisting(
    listing_id: str,
    confirm_data: UnlistingConfirm,
    db: Session = Depends(get_db)
)

@router.put("/{listing_id}/confirm-edit")
async def confirm_edit_listing(
    listing_id: str,
    confirm_data: EditListingConfirm,
    db: Session = Depends(get_db)
)
```

### Request Models

```python
class ListingConfirm(BaseModel):
    listing_id: UUID
    blockchain_tx_id: str
    blockchain_listing_id: Optional[str] = None
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
```

## Frontend Implementation

### Blockchain Utils

Updated blockchain utilities to call the new smart contract functions:

```typescript
// Updated to call list_nft_with_sync
export async function executeListNFTTransaction(
  params: SellNFTParams,
  signAndExecuteTransaction: (transaction: Transaction) => Promise<SuiTransactionResult>
): Promise<TransactionResult>

// Updated to call unlist_nft_with_sync
export async function executeUnlistNFTTransaction(
  params: UnlistNFTParams,
  signAndExecuteTransaction: (transaction: Transaction) => Promise<SuiTransactionResult>
): Promise<TransactionResult>

// New function for edit_listing_price_with_sync
export async function executeEditListingTransaction(
  params: { listingId: string; newPrice: number },
  signAndExecuteTransaction: (transaction: Transaction) => Promise<SuiTransactionResult>
): Promise<TransactionResult>
```

### API Functions

Added confirmation functions following the NFT minting pattern:

```typescript
export async function confirmListing(listingId: string, blockchainTxId: string, blockchainListingId?: string, gasFee?: number): Promise<any>
export async function confirmUnlisting(listingId: string, blockchainTxId: string, gasFee?: number): Promise<any>
export async function confirmEditListing(listingId: string, newPrice: number, blockchainTxId: string, gasFee?: number): Promise<any>
```

## Complete Flow Examples

### Listing Flow (Same as NFT Minting)

```typescript
// Step 1: Create listing record in database
const listingResponse = await createListing({
  nft_id: nft.id,
  price: price,
  expires_at: null,
  listing_metadata: { title: nft.title }
});

// Step 2: Execute blockchain transaction
const txResult = await executeListNFTTransaction({
  nftId: nft.sui_object_id,
  price: price,
  sellerAddress: wallet.address
});

// Step 3: Smart contract emits events (automatic)

// Step 4: Confirm listing in database
await confirmListing(
  listingResponse.id,
  txResult.txId,
  undefined, // blockchain_listing_id
  0 // gas_fee
);
```

### Unlisting Flow

```typescript
// Step 1: Execute blockchain transaction
const txResult = await executeUnlistNFTTransaction({
  listingId: nft.id,
  sellerAddress: wallet.address
});

// Step 2: Smart contract emits events (automatic)

// Step 3: Confirm unlisting in database
await confirmUnlisting(
  nft.id,
  txResult.txId,
  0 // gas_fee
);
```

### Edit Listing Flow

```typescript
// Step 1: Execute blockchain transaction
const txResult = await executeEditListingTransaction({
  listingId: nft.id,
  newPrice: price
});

// Step 2: Smart contract emits events (automatic)

// Step 3: Confirm edit in database
await confirmEditListing(
  nft.id,
  price,
  txResult.txId,
  0 // gas_fee
);
```

## Demo Component

Created `ListingFlowDemo.tsx` component that demonstrates the complete flow with step-by-step progress tracking, showing exactly how the implementation follows the NFT minting pattern.

## Key Features

1. **Consistent Flow**: All operations follow the same pattern as NFT minting
2. **Database Sync**: All blockchain operations are properly synced with the database
3. **Event Emission**: Smart contract emits events with all necessary data
4. **Error Handling**: Comprehensive error handling at each step
5. **Transaction History**: All operations are recorded in transaction_history table
6. **Type Safety**: Full TypeScript support with proper interfaces

## Testing

Use the `ListingFlowDemo` component to test the complete flow:

1. Import and use the component with an NFT object
2. Test listing an unlisted NFT
3. Test editing the price of a listed NFT
4. Test unlisting a listed NFT
5. Verify database updates after each operation

The implementation ensures that the frontend-blockchain-backend flow works seamlessly and matches the existing database structure.
