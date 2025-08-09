# Blockchain Listing Integration

This document describes the implementation of on-chain listing and unlisting functionality for the FraudGuard NFT marketplace.

## Overview

The system now supports full blockchain integration for NFT listing and unlisting operations, following the same event-driven pattern as NFT minting. The flow ensures that all listing operations are recorded on the Sui blockchain before being stored in the database.

## Architecture

### 1. Move Contract Updates

**File**: `sui/sources/marketplace.move`

Added simplified listing functions:
- `list_nft_simple(nft, price, ctx)` - Simplified listing without marketplace object dependency
- `cancel_listing_simple(listing, ctx)` - Simplified unlisting function

These functions emit events that can be captured by the frontend.

### 2. Frontend Blockchain Integration

**Files**: 
- `frontend/src/lib/blockchain-utils.ts`
- `frontend/src/hooks/useWallet.tsx`

New functions added:
- `executeListNFTTransaction(params, signAndExecuteTransaction)` - Execute listing on blockchain
- `executeUnlistNFTTransaction(params, signAndExecuteTransaction)` - Execute unlisting on blockchain
- `extractListingId(effects)` - Extract listing ID from transaction effects
- `extractListingEventData(effects)` - Extract event data from transaction
- `extractUnlistingEventData(effects)` - Extract unlisting event data

### 3. Frontend Component Updates

**Files**:
- `frontend/src/components/ListingManager.tsx`
- `frontend/src/components/MyNFTs.tsx`

Updated to follow the blockchain-first flow:
1. Execute blockchain transaction
2. Extract event data from transaction
3. Notify backend of blockchain transaction
4. Update database

### 4. Backend API Updates

**Files**:
- `backend/api/nft.py`
- `backend/api/listings.py`

New endpoints:
- `POST /api/nft/notify-listed` - Process blockchain listing notifications
- `POST /api/nft/notify-unlisted` - Process blockchain unlisting notifications

Updated endpoints:
- `POST /api/listings/` - Now accepts blockchain transaction data

## Flow Diagrams

### Listing Flow

```
User clicks "List NFT"
    ↓
Frontend calls executeListNFTTransaction()
    ↓
Sui blockchain executes list_nft_simple()
    ↓
Transaction emits NFTListed event
    ↓
Frontend extracts listing data from transaction
    ↓
Frontend calls notifyNFTListed() API
    ↓
Backend updates NFT.is_listed = true
    ↓
Frontend calls createListing() API
    ↓
Backend creates Listing record in database
    ↓
Frontend refreshes UI
```

### Unlisting Flow

```
User clicks "Unlist NFT"
    ↓
Frontend calls executeUnlistNFTTransaction()
    ↓
Sui blockchain executes cancel_listing_simple()
    ↓
Transaction emits ListingCancelled event
    ↓
Frontend extracts unlisting data from transaction
    ↓
Frontend calls notifyNFTUnlisted() API
    ↓
Backend updates NFT.is_listed = false
    ↓
Backend cancels active Listing record
    ↓
Frontend refreshes UI
```

## Key Features

### 1. Blockchain-First Approach
- All listing operations must succeed on blockchain before database updates
- Ensures data consistency between blockchain and database
- Follows web3.0 principles

### 2. Event-Driven Architecture
- Uses Sui blockchain events to communicate transaction results
- Similar pattern to existing NFT minting flow
- Robust error handling and fallback mechanisms

### 3. Transaction History
- All blockchain transactions are recorded in TransactionHistory table
- Includes transaction digests for verification
- Supports audit trails and analytics

### 4. Error Handling
- Graceful handling of blockchain transaction failures
- Database rollback on errors
- User-friendly error messages

## Configuration

### Environment Variables

Make sure the following environment variables are set:

```bash
# Frontend (.env)
VITE_MARKETPLACE_PACKAGE_ID=0x65f6775cba9a3aa8dcb9271d34edad52afae9a32e56e3d23da1a6dd9e2b890c2

# Backend (.env)
DATABASE_URL=your_database_url
```

### Package ID

The system uses the deployed FraudGuard package ID. Update `MARKETPLACE_PACKAGE_ID` in `blockchain-utils.ts` if you deploy a new version.

## Testing

### Manual Testing Steps

1. **Setup**:
   - Ensure wallet is connected
   - Have some test NFTs in your wallet
   - Ensure sufficient SUI balance for gas

2. **Test Listing**:
   - Go to "My NFTs" or "Listing Manager"
   - Click "List" on an unlisted NFT
   - Set a price and confirm
   - Verify blockchain transaction in Sui explorer
   - Verify NFT appears as listed in UI
   - Check database for Listing record

3. **Test Unlisting**:
   - Click "Unlist" on a listed NFT
   - Confirm transaction
   - Verify blockchain transaction in Sui explorer
   - Verify NFT appears as unlisted in UI
   - Check database for cancelled Listing record

### Verification

- Check Sui explorer for transaction details
- Verify events are emitted correctly
- Confirm database records match blockchain state
- Test error scenarios (insufficient gas, network issues)

## Future Enhancements

1. **Listing ID Storage**: Store blockchain listing IDs in database for direct unlisting
2. **Batch Operations**: Support batch listing/unlisting operations
3. **Price Updates**: Support on-chain price updates
4. **Marketplace Fees**: Integrate marketplace fee collection
5. **Advanced Metadata**: Support rich listing metadata on-chain

## Troubleshooting

### Common Issues

1. **Transaction Fails**: Check gas balance and network connectivity
2. **Database Inconsistency**: Use notification endpoints to sync state
3. **Missing Events**: Verify contract deployment and event emission
4. **UI Not Updating**: Check React Query cache invalidation

### Debug Tools

- Browser console for frontend logs
- Backend logs for API debugging
- Sui explorer for blockchain verification
- Database queries for state verification
