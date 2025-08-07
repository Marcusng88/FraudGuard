# Buy & Sell Implementation Plan for FraudGuard NFT Marketplace

## Current Database Structure Analysis

### Existing Tables:
1. **users** - User profiles with wallet-based authentication
2. **nfts** - NFT metadata with on-chain references and AI analysis
3. **listings** - Off-chain listing management for marketplace
4. **transaction_history** - Off-chain transaction tracking
5. **user_reputation_events** - Reputation scoring for fraud detection

### Current Blockchain Structure:
- **marketplace.move** - Handles NFT listing, buying, and marketplace operations
- **fraudguard_nft.move** - NFT contract with fraud detection capabilities
- **fraud_flag.move** - Fraud detection and flagging system

## Implementation Plan

### Phase 1: Database Schema Enhancements

#### 1.1 Add Blockchain Fields to Transaction History

**transaction_history table enhancements:**
```sql
-- Add blockchain-specific fields for buy/sell transactions
ALTER TABLE transaction_history ADD COLUMN marketplace_fee NUMERIC;
ALTER TABLE transaction_history ADD COLUMN seller_amount NUMERIC;
ALTER TABLE transaction_history ADD COLUMN listing_blockchain_id TEXT;
ALTER TABLE transaction_history ADD COLUMN nft_blockchain_id TEXT;
ALTER TABLE transaction_history ADD COLUMN gas_fee NUMERIC;
ALTER TABLE transaction_history ADD COLUMN blockchain_status TEXT DEFAULT 'pending';
```

#### 1.2 Create New Tables for Enhanced Tracking

**blockchain_events table:**
```sql
CREATE TABLE blockchain_events (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    event_type TEXT NOT NULL,
    blockchain_tx_id TEXT,
    event_data JSONB,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**marketplace_config table:**
```sql
CREATE TABLE marketplace_config (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    fee_percentage NUMERIC DEFAULT 2.5,
    marketplace_address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Phase 2: Buy/Sell Blockchain Integration Flow

#### 2.1 Buy Flow (Purchasing NFT)

**Frontend → Blockchain → Backend Flow:**

1. **Frontend (User initiates buy):**
   - User selects listing to purchase
   - Frontend validates user has sufficient balance
   - Frontend calls `buy_nft` Move function with listing data

2. **Blockchain (Sui Move execution):**
   - Validates listing is active
   - Transfers SUI from buyer to seller
   - Transfers NFT from seller to buyer
   - Calculates and collects marketplace fee
   - Emits `NFTPurchased` event
   - Destroys listing object

3. **Frontend receives blockchain response:**
   - Gets transaction ID and purchase details
   - Calls backend API with blockchain metadata

4. **Backend (Database update):**
   - Records transaction in database
   - Updates NFT ownership
   - Marks listing as sold
   - Updates user reputation scores

**API Endpoints needed:**
- `POST /api/transactions/blockchain` - Record blockchain purchase
- `GET /api/transactions/blockchain/{tx_id}` - Get transaction status

#### 2.2 Sell Flow (Selling NFT)

**Note: This is for when a user wants to sell an NFT they own, not listing it**

1. **Frontend (User initiates sell):**
   - User selects NFT to sell
   - User sets price and metadata
   - Frontend calls `list_nft` Move function

2. **Blockchain (Sui Move execution):**
   - Validates NFT ownership
   - Creates listing object on-chain
   - Emits `NFTListed` event
   - Returns transaction metadata

3. **Frontend receives blockchain response:**
   - Gets transaction ID and listing details
   - Calls backend API with blockchain metadata

4. **Backend (Database update):**
   - Records listing in database
   - Updates NFT listing status
   - Creates transaction history entry

### Phase 3: API Implementation

#### 3.1 New API Endpoints for Blockchain Transactions

**Blockchain Transaction Management:**
```python
# POST /api/transactions/blockchain
class BlockchainTransactionCreate(BaseModel):
    blockchain_tx_id: str
    listing_id: UUID  # Reference to existing listing
    nft_blockchain_id: str
    seller_wallet_address: str
    buyer_wallet_address: str
    price: float
    marketplace_fee: float
    seller_amount: float
    gas_fee: Optional[float] = None
    transaction_type: str = "purchase"  # or "sale"

# GET /api/transactions/blockchain/{tx_id}
class BlockchainTransactionResponse(BaseModel):
    blockchain_tx_id: str
    status: str
    price: float
    marketplace_fee: float
    seller_amount: float
    gas_fee: Optional[float]
    created_at: datetime
    transaction_type: str
```

#### 3.2 Enhanced Existing Endpoints

**Update transaction history endpoints:**
- Include blockchain transaction IDs
- Add marketplace fee calculations
- Track gas fees and blockchain status
- Add blockchain status to transaction queries

**Update listings endpoints:**
- Add blockchain status tracking for sold listings
- Include blockchain transaction data in listing responses

### Phase 4: Frontend Integration

#### 4.1 Enhanced Wallet Integration

**Update useWallet hook:**
```typescript
interface Wallet {
  address: string;
  isConnected: boolean;
  balance?: number;
  // Add blockchain interaction methods
  executeBuyTransaction: (listingId: string, payment: number) => Promise<any>;
  executeSellTransaction: (nftId: string, price: number, metadata: any) => Promise<any>;
}
```

**Add blockchain transaction utilities:**
```typescript
// lib/blockchain-utils.ts
export const executeBuyTransaction = async (
  listingId: string,
  payment: number
) => {
  // Call Move function buy_nft
  // Return transaction metadata
};

export const executeSellTransaction = async (
  nftId: string,
  price: number,
  metadata: any
) => {
  // Call Move function list_nft
  // Return transaction metadata
};
```

#### 4.2 Enhanced Components

**Update Marketplace component:**
- Add "Buy Now" button for each listing
- Show transaction status and gas fees
- Handle blockchain errors gracefully
- Display real-time transaction updates

**Update NFTDetail component:**
- Add "Sell NFT" functionality
- Show blockchain transaction progress
- Handle ownership validation

### Phase 5: Error Handling & Validation

#### 5.1 Blockchain Error Handling

**Common blockchain errors:**
- Insufficient balance for purchase
- NFT not owned by seller
- Listing already sold
- Transaction failed
- Gas fee estimation errors

**Error handling strategy:**
- Frontend validates before blockchain call
- Blockchain returns detailed error messages
- Backend logs all blockchain interactions
- User-friendly error messages

#### 5.2 Data Consistency

**Database-Blockchain sync:**
- Regular blockchain event polling
- Transaction status verification
- Automatic retry mechanisms
- Manual reconciliation tools

### Phase 6: Testing & Deployment

#### 6.1 Testing Strategy

**Unit Tests:**
- Blockchain transaction simulation
- API endpoint testing
- Database consistency checks

**Integration Tests:**
- End-to-end buy/sell flow
- Blockchain event processing
- Error scenario handling

**Manual Testing:**
- Testnet deployment
- Real transaction testing
- Performance monitoring

#### 6.2 Deployment Checklist

**Pre-deployment:**
- [ ] Database migrations applied
- [ ] Blockchain contracts deployed
- [ ] API endpoints tested
- [ ] Frontend integration complete
- [ ] Error handling implemented

**Post-deployment:**
- [ ] Monitor blockchain events
- [ ] Verify database consistency
- [ ] Test real transactions
- [ ] Monitor performance metrics

## Implementation Questions

### Clarifying Questions:

1. **Gas Fee Handling:**
   - Should gas fees be paid by the user or included in the transaction?
   - How should we handle failed transactions due to insufficient gas?

2. **Transaction Confirmation:**
   - How long should we wait for blockchain confirmation?
   - Should we implement retry mechanisms for failed transactions?

3. **Marketplace Fees:**
   - Should fees be calculated on-chain or off-chain?
   - How should we handle fee collection and distribution?

4. **Error Recovery:**
   - What happens if blockchain transaction succeeds but database update fails?
   - Should we implement automatic reconciliation?

5. **Real-time Updates:**
   - Should we implement WebSocket connections for real-time transaction updates?
   - How should we handle blockchain event polling?

6. **Security Considerations:**
   - How should we validate user permissions before blockchain calls?
   - Should we implement rate limiting for blockchain transactions?

## Next Steps

1. **Review and approve this plan**
2. **Answer clarifying questions**
3. **Implement database schema changes**
4. **Update blockchain contracts if needed**
5. **Implement API endpoints**
6. **Update frontend integration**
7. **Test and deploy**

This plan focuses specifically on implementing buy and sell logic using blockchain while keeping the existing listing/delisting functionality in the backend.
