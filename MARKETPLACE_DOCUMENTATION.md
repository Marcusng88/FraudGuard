# FraudGuard Marketplace Module Documentation

## Overview
The `marketplace` module is a comprehensive NFT marketplace implementation for the FraudGuard platform. It handles NFT listing, buying, selling, and marketplace administration with enhanced features for metadata management and batch operations.

## Error Constants

| Error Code | Name | Description |
|------------|------|-------------|
| `0` | `ENotOwner` | Thrown when a user tries to perform an action they don't have permission for |
| `2` | `EInsufficientPayment` | Thrown when payment amount is less than required price |
| `3` | `EListingNotActive` | Thrown when trying to interact with an inactive listing |
| `4` | `EMarketplaceNotActive` | Thrown when marketplace is not active |
| `5` | `EInvalidPrice` | Thrown when price is zero or negative |
| `6` | `ENotMarketplaceOwner` | Thrown when non-owner tries to perform admin actions |
| `7` | `EInvalidMetadata` | Thrown when metadata fields are empty |
| `8` | `EEmptyBatch` | Thrown when batch operation has no items |
| `9` | `EBatchSizeMismatch` | Thrown when batch arrays have different lengths |

## Data Structures

### Marketplace
The main marketplace object that tracks all marketplace operations.

**Fields:**
- `id: UID` - Unique identifier for the marketplace
- `owner: address` - Address of the marketplace owner
- `fee_percentage: u64` - Fee percentage in basis points (e.g., 250 = 2.5%)
- `total_volume: u64` - Total trading volume in SUI
- `total_sales: u64` - Total number of sales completed
- `is_active: bool` - Whether the marketplace is active
- `balance: Balance<SUI>` - Marketplace earnings balance

### Listing
Represents an individual NFT listing on the marketplace.

**Fields:**
- `id: UID` - Unique identifier for the listing
- `nft_id: ID` - ID of the NFT being listed
- `seller: address` - Address of the seller
- `price: u64` - Price in SUI
- `listed_at: u64` - Timestamp when listing was created
- `is_active: bool` - Whether the listing is active

### MarketplaceCap
Capability object that grants administrative access to the marketplace.

**Fields:**
- `id: UID` - Unique identifier for the capability
- `marketplace_id: ID` - ID of the marketplace this capability controls

### ListingMetadata
Enhanced metadata for NFT listings with detailed information.

**Fields:**
- `id: UID` - Unique identifier for the metadata
- `listing_id: ID` - ID of the associated listing
- `nft_id: ID` - ID of the NFT
- `title: String` - Title of the listing
- `description: String` - Description of the NFT
- `category: String` - Category of the NFT
- `tags: vector<String>` - Array of tags for the NFT
- `created_at: u64` - Timestamp when metadata was created
- `updated_at: u64` - Timestamp when metadata was last updated

## Events

### MarketplaceCreated
Emitted when a new marketplace is created.

**Fields:**
- `marketplace_id: ID` - ID of the created marketplace
- `owner: address` - Address of the marketplace owner
- `fee_percentage: u64` - Fee percentage set for the marketplace

### NFTListed
Emitted when an NFT is listed for sale.

**Fields:**
- `listing_id: ID` - ID of the listing
- `nft_id: ID` - ID of the listed NFT
- `seller: address` - Address of the seller
- `price: u64` - Price of the NFT
- `marketplace_id: ID` - ID of the marketplace
- `timestamp: u64` - Timestamp of the listing

### NFTPurchased
Emitted when an NFT is purchased.

**Fields:**
- `listing_id: ID` - ID of the listing
- `nft_id: ID` - ID of the purchased NFT
- `seller: address` - Address of the seller
- `buyer: address` - Address of the buyer
- `price: u64` - Price paid for the NFT
- `marketplace_fee: u64` - Fee taken by the marketplace
- `timestamp: u64` - Timestamp of the purchase

### ListingCancelled
Emitted when a listing is cancelled.

**Fields:**
- `listing_id: ID` - ID of the cancelled listing
- `nft_id: ID` - ID of the NFT
- `seller: address` - Address of the seller
- `timestamp: u64` - Timestamp of cancellation

### ListingPriceUpdated
Emitted when a listing price is updated.

**Fields:**
- `listing_id: ID` - ID of the listing
- `nft_id: ID` - ID of the NFT
- `seller: address` - Address of the seller
- `old_price: u64` - Previous price
- `new_price: u64` - New price
- `timestamp: u64` - Timestamp of the update

### ListingMetadataUpdated
Emitted when listing metadata is updated.

**Fields:**
- `listing_id: ID` - ID of the listing
- `nft_id: ID` - ID of the NFT
- `seller: address` - Address of the seller
- `title: String` - Updated title
- `description: String` - Updated description
- `category: String` - Updated category
- `timestamp: u64` - Timestamp of the update

## Public Entry Functions

### create_marketplace
Creates a new marketplace with specified fee percentage.

**Parameters:**
- `fee_percentage: u64` - Fee percentage in basis points (e.g., 250 = 2.5%)
- `ctx: &mut TxContext` - Transaction context

**Returns:** `void`
- Creates and shares a `Marketplace` object
- Creates and transfers a `MarketplaceCap` to the sender
- Emits `MarketplaceCreated` event

**Example:**
```move
create_marketplace(250, ctx); // Creates marketplace with 2.5% fee
```

### list_nft
Lists an NFT for sale with enhanced metadata.

**Parameters:**
- `marketplace: &mut Marketplace` - Reference to the marketplace
- `nft: FraudGuardNFT` - The NFT to list
- `price: u64` - Price in SUI
- `title: vector<u8>` - Title of the listing (UTF-8 bytes)
- `description: vector<u8>` - Description of the NFT (UTF-8 bytes)
- `category: vector<u8>` - Category of the NFT (UTF-8 bytes)
- `tags: vector<vector<u8>>` - Array of tag strings (UTF-8 bytes)
- `ctx: &mut TxContext` - Transaction context

**Returns:** `void`
- Creates a `Listing` object
- Creates a `ListingMetadata` object
- Shares both objects
- Emits `NFTListed` event
- Returns NFT to seller (simplified for hackathon)

**Validation:**
- Marketplace must be active
- Price must be greater than 0
- Title and category must not be empty

### buy_nft
Purchases an NFT from a listing.

**Parameters:**
- `marketplace: &mut Marketplace` - Reference to the marketplace
- `listing: Listing` - The listing to purchase from
- `payment: Coin<SUI>` - Payment coin
- `ctx: &mut TxContext` - Transaction context

**Returns:** `void`
- Calculates marketplace fee
- Splits payment between seller and marketplace
- Updates marketplace statistics
- Emits `NFTPurchased` event
- Transfers payment to seller
- Returns excess payment to buyer
- Destroys the listing

**Validation:**
- Marketplace must be active
- Listing must be active
- Payment amount must be >= listing price

### cancel_listing
Cancels an active listing.

**Parameters:**
- `listing: Listing` - The listing to cancel
- `ctx: &mut TxContext` - Transaction context

**Returns:** `void`
- Emits `ListingCancelled` event
- Destroys the listing

**Validation:**
- Sender must be the listing seller
- Listing must be active

### update_listing_price
Updates the price of an active listing.

**Parameters:**
- `listing: &mut Listing` - Reference to the listing
- `new_price: u64` - New price in SUI
- `ctx: &mut TxContext` - Transaction context

**Returns:** `void`
- Updates the listing price
- Emits `ListingPriceUpdated` event

**Validation:**
- Sender must be the listing seller
- Listing must be active
- New price must be greater than 0

### update_listing_metadata
Updates the metadata of a listing.

**Parameters:**
- `metadata: &mut ListingMetadata` - Reference to the metadata
- `title: vector<u8>` - New title (UTF-8 bytes)
- `description: vector<u8>` - New description (UTF-8 bytes)
- `category: vector<u8>` - New category (UTF-8 bytes)
- `tags: vector<vector<u8>>` - New tags array (UTF-8 bytes)
- `ctx: &mut TxContext` - Transaction context

**Returns:** `void`
- Updates all metadata fields
- Updates the `updated_at` timestamp
- Emits `ListingMetadataUpdated` event

**Validation:**
- Title and category must not be empty

### batch_list_nfts
Lists multiple NFTs in a single transaction.

**Parameters:**
- `marketplace: &mut Marketplace` - Reference to the marketplace
- `nft_ids: vector<ID>` - Array of NFT IDs
- `prices: vector<u64>` - Array of prices
- `titles: vector<vector<u8>>` - Array of titles
- `descriptions: vector<vector<u8>>` - Array of descriptions
- `categories: vector<vector<u8>>` - Array of categories
- `tags_list: vector<vector<vector<u8>>>` - Array of tag arrays
- `ctx: &mut TxContext` - Transaction context

**Returns:** `void`
- Creates listings and metadata for all NFTs
- Emits `NFTListed` event for each NFT
- Shares all created objects

**Validation:**
- All arrays must have the same length
- Batch size must be greater than 0
- All prices must be greater than 0
- All titles and categories must not be empty

### withdraw_earnings
Withdraws marketplace earnings to the owner.

**Parameters:**
- `marketplace: &mut Marketplace` - Reference to the marketplace
- `cap: &MarketplaceCap` - Marketplace capability
- `amount: u64` - Amount to withdraw
- `ctx: &mut TxContext` - Transaction context

**Returns:** `void`
- Transfers specified amount to marketplace owner

**Validation:**
- Capability must match marketplace
- Balance must be sufficient

### update_fee
Updates the marketplace fee percentage.

**Parameters:**
- `marketplace: &mut Marketplace` - Reference to the marketplace
- `cap: &MarketplaceCap` - Marketplace capability
- `new_fee_percentage: u64` - New fee percentage in basis points

**Returns:** `void`
- Updates the fee percentage

**Validation:**
- Capability must match marketplace

### toggle_marketplace
Toggles the marketplace active status.

**Parameters:**
- `marketplace: &mut Marketplace` - Reference to the marketplace
- `cap: &MarketplaceCap` - Marketplace capability

**Returns:** `void`
- Toggles the `is_active` field

**Validation:**
- Capability must match marketplace

## Public View Functions

### get_marketplace_info
Returns marketplace information.

**Parameters:**
- `marketplace: &Marketplace` - Reference to the marketplace

**Returns:** `(address, u64, u64, u64, bool)`
- `address` - Owner address
- `u64` - Fee percentage
- `u64` - Total volume
- `u64` - Total sales
- `bool` - Active status

### get_marketplace_balance
Returns the marketplace balance.

**Parameters:**
- `marketplace: &Marketplace` - Reference to the marketplace

**Returns:** `u64`
- Current balance in SUI

### get_listing_info
Returns listing information.

**Parameters:**
- `listing: &Listing` - Reference to the listing

**Returns:** `(ID, address, u64, u64, bool)`
- `ID` - NFT ID
- `address` - Seller address
- `u64` - Price
- `u64` - Listed timestamp
- `bool` - Active status

### get_listing_details
Returns detailed listing metadata.

**Parameters:**
- `metadata: &ListingMetadata` - Reference to the metadata

**Returns:** `(ID, String, String, String, vector<String>, u64, u64)`
- `ID` - NFT ID
- `String` - Title
- `String` - Description
- `String` - Category
- `vector<String>` - Tags
- `u64` - Created timestamp
- `u64` - Updated timestamp

### is_listing_active
Checks if a listing is active.

**Parameters:**
- `listing: &Listing` - Reference to the listing

**Returns:** `bool`
- True if listing is active, false otherwise

### get_listing_price
Returns the listing price.

**Parameters:**
- `listing: &Listing` - Reference to the listing

**Returns:** `u64`
- Price in SUI

### get_listing_seller
Returns the listing seller address.

**Parameters:**
- `listing: &Listing` - Reference to the listing

**Returns:** `address`
- Seller address

## Helper Functions

### calculate_fee
Calculates the marketplace fee for a given price.

**Parameters:**
- `marketplace: &Marketplace` - Reference to the marketplace
- `price: u64` - Price in SUI

**Returns:** `u64`
- Fee amount in SUI

**Formula:** `(price * fee_percentage) / 10000`

### calculate_seller_amount
Calculates the amount the seller receives after fees.

**Parameters:**
- `marketplace: &Marketplace` - Reference to the marketplace
- `price: u64` - Price in SUI

**Returns:** `u64`
- Seller amount in SUI

**Formula:** `price - calculate_fee(marketplace, price)`

## Test Functions

### test_create_marketplace
Creates a test marketplace for testing purposes.

**Parameters:**
- `ctx: &mut TxContext` - Transaction context

**Returns:** `(Marketplace, MarketplaceCap)`
- Test marketplace with 2.5% fee
- Associated capability

### test_create_listing
Creates a test listing for testing purposes.

**Parameters:**
- `nft_id: ID` - NFT ID
- `seller: address` - Seller address
- `price: u64` - Price
- `ctx: &mut TxContext` - Transaction context

**Returns:** `Listing`
- Test listing object

## Usage Examples

### Creating a Marketplace
```move
// Create marketplace with 2.5% fee
create_marketplace(250, ctx);
```

### Listing an NFT
```move
// List NFT with metadata
list_nft(
    &mut marketplace,
    nft,
    1000000, // 1 SUI
    b"Rare Cyberpunk NFT",
    b"A unique digital art piece",
    b"Art",
    vector[b"cyberpunk", b"digital-art"],
    ctx
);
```

### Buying an NFT
```move
// Buy NFT with payment
buy_nft(&mut marketplace, listing, payment, ctx);
```

### Updating Listing Price
```move
// Update price to 1.5 SUI
update_listing_price(&mut listing, 1500000, ctx);
```

### Batch Listing
```move
// List multiple NFTs
batch_list_nfts(
    &mut marketplace,
    vector[nft1_id, nft2_id],
    vector[1000000, 2000000],
    vector[b"NFT 1", b"NFT 2"],
    vector[b"Description 1", b"Description 2"],
    vector[b"Category 1", b"Category 2"],
    vector[vector[b"tag1"], vector[b"tag2"]],
    ctx
);
```

## Security Features

1. **Ownership Validation**: All admin functions require marketplace capability
2. **Active Status Checks**: Marketplace and listings must be active for operations
3. **Payment Validation**: Ensures sufficient payment for purchases
4. **Metadata Validation**: Prevents empty metadata fields
5. **Batch Size Validation**: Ensures consistent array lengths in batch operations

## Fee Structure

The marketplace uses a basis point fee system:
- 100 basis points = 1%
- 250 basis points = 2.5%
- 1000 basis points = 10%

Fees are calculated as: `(price * fee_percentage) / 10000`

## Event System

All major operations emit events for:
- Marketplace creation
- NFT listing
- NFT purchases
- Listing cancellations
- Price updates
- Metadata updates

These events enable off-chain tracking and analytics. 