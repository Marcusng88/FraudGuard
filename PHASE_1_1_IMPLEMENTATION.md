# Phase 1.1 Implementation: Kiosk Management Functions

## Overview
This document outlines the implementation of Phase 1.1 from the NFT Marketplace Plan, which focuses on **Kiosk Management Functions** for the FraudGuard application.

## What Was Implemented

### 1. Database Schema Updates
- **Added `user_kiosk_map` table** to track kiosk ownership and sync status
- **Indexes** for efficient kiosk lookups by user and kiosk ID
- **Sync status tracking** to monitor blockchain synchronization

### 2. Smart Contract Enhancements
- **`create_kiosk_if_not_exists()`** - Creates a kiosk for users who don't have one
- **`get_user_kiosk_address()`** - View function to get user's kiosk address
- **`check_kiosk_ownership()`** - Helper function to verify kiosk ownership
- **`list_nft_with_kiosk()`** - Simplified listing with automatic kiosk creation

### 3. Backend API Extensions
- **`POST /api/marketplace/kiosk/create`** - Create kiosk for user
- **`GET /api/marketplace/kiosk/user/{wallet_address}`** - Get user's kiosk info
- **`POST /api/marketplace/kiosk/check-ownership`** - Verify kiosk ownership

### 4. Frontend Integration
- **`useKiosk` hook** - React Query hooks for kiosk management
- **`KioskManager` component** - Transparent kiosk management UI
- **`useKioskForListing` hook** - Easy integration for listing flows

## Key Features

### Automatic Kiosk Creation
- Users don't need to manually create kiosks
- Kiosk creation happens transparently during listing
- Database caching reduces blockchain queries

### Error Handling
- Graceful handling of kiosk creation failures
- Specific error messages for gas issues
- Retry mechanisms for failed operations

### Database Caching
- Kiosk information cached in database
- Periodic sync with blockchain state
- Reduces gas costs and improves performance

## Usage Examples

### Backend API Usage
```python
# Create kiosk for user
response = await create_kiosk({"wallet_address": "0x123..."})

# Get user's kiosk
kiosk = await get_user_kiosk("0x123...")

# Check ownership
ownership = await check_kiosk_ownership("0x123...", "0xkiosk...")
```

### Frontend Usage
```typescript
// Automatic kiosk management in listing flow
const { kioskId, isLoading, prepareForListing } = useKioskForListing(walletAddress);

// Transparent kiosk manager component
<KioskManager 
  walletAddress={walletAddress}
  onKioskReady={(kioskId) => console.log('Kiosk ready:', kioskId)}
  showDetails={true}
/>
```

### Smart Contract Usage
```move
// Create kiosk if user doesn't have one
fraudguard_nft::create_kiosk_if_not_exists(ctx);

// List NFT with automatic kiosk handling
fraudguard_nft::list_nft_with_kiosk(nft_id, price, ctx);
```

## Database Schema

### New Table: `user_kiosk_map`
```sql
CREATE TABLE public.user_kiosk_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kiosk_id text NOT NULL UNIQUE,
  kiosk_owner_cap_id text,
  sync_status text NOT NULL DEFAULT 'synced',
  last_synced_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
```

## Testing

### Smart Contract Tests
- `test_create_kiosk_if_not_exists()` - Tests kiosk creation
- `test_list_nft_with_kiosk()` - Tests listing with kiosk
- `test_check_kiosk_ownership()` - Tests ownership verification
- `test_mint_to_kiosk()` - Tests direct minting to kiosk

### API Tests
- Kiosk creation endpoint
- User kiosk retrieval
- Ownership verification

## Next Steps (Phase 1.2)
1. **Listing Functions Enhancement** - Improve existing listing/unlisting functions
2. **Metadata Management** - Add functions for updating listing metadata
3. **Event System** - Implement events for frontend tracking
4. **Batch Operations** - Add support for multiple NFT operations

## Files Modified/Created

### Database
- `database_schema.sql` - Added user_kiosk_map table

### Smart Contracts
- `sui/sources/fraudguard_nft.move` - Added kiosk management functions
- `sui/tests/kiosk_tests.move` - Added comprehensive tests

### Backend
- `backend/models/database.py` - Added UserKioskMap model
- `backend/api/marketplace.py` - Added kiosk management endpoints

### Frontend
- `frontend/src/lib/api.ts` - Added kiosk management API functions
- `frontend/src/hooks/useKiosk.ts` - Created kiosk management hooks
- `frontend/src/components/KioskManager.tsx` - Created kiosk manager component

## Benefits Achieved

1. **Simplified UX** - Users don't need to understand kiosks
2. **Automatic Management** - Kiosk creation happens transparently
3. **Performance** - Database caching reduces blockchain queries
4. **Error Resilience** - Proper error handling and retry mechanisms
5. **Scalability** - Efficient database schema with proper indexing

## Deployment Notes

1. **Database Migration** - Run the updated schema to create user_kiosk_map table
2. **Smart Contract Deployment** - Deploy updated fraudguard_nft.move
3. **Backend Restart** - Restart backend to load new API endpoints
4. **Frontend Build** - Rebuild frontend to include new components

This implementation provides a solid foundation for Phase 1.2 and beyond, with transparent kiosk management that enhances user experience while maintaining security and performance. 