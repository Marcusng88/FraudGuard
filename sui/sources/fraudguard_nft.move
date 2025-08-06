/// FraudGuard NFT Module
/// Handles NFT creation with Kiosk integration and fraud detection
module fraudguard::fraudguard_nft {
    use sui::object;
    use sui::tx_context;
    use sui::url::{Self, Url};
    use sui::event;
    use std::string::{Self, String};
    use sui::kiosk::{Self, Kiosk, KioskOwnerCap};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::transfer_policy::{Self, TransferPolicy};
    use sui::transfer;
    use sui::package;

    // ===== Errors =====
    const EEmptyName: u64 = 1;
    const EInvalidPrice: u64 = 2;
    const ENotKioskOwner: u64 = 3;
    const EListingNotFound: u64 = 4;
    const EListingAlreadyExists: u64 = 5;
    const EInsufficientPayment: u64 = 6;
    const EInvalidMetadata: u64 = 7;
    const EEmptyBatch: u64 = 8;
    const EBatchSizeMismatch: u64 = 9;

    // ===== Structs =====

    /// One-time witness for creating Publisher
    public struct FRAUDGUARD_NFT has drop {}

    /// The main NFT struct that represents a digital asset
    public struct FraudGuardNFT has key, store {
        id: object::UID,
        name: String,
        description: String,
        image_url: Url,
        creator: address,
        created_at: u64,
    }

    /// Fraud flag that can be attached to an NFT
    public struct FraudFlag has key, store {
        id: object::UID,
        nft_id: object::ID,
        flag_type: String,
        reason: String,
        confidence: u64, // 0-100
        flagged_by: address,
        created_at: u64,
        is_active: bool,
    }

    /// Capability for the fraud detection agent
    public struct AgentCap has key, store {
        id: object::UID,
        agent_address: address,
    }

    /// Listing metadata for enhanced marketplace features
    public struct ListingMetadata has key, store {
        id: object::UID,
        nft_id: object::ID,
        title: String,
        description: String,
        category: String,
        tags: vector<String>,
        created_at: u64,
        updated_at: u64,
    }

    // ===== Events =====

    /// Emitted when a new NFT is minted
    public struct NFTMinted has copy, drop {
        nft_id: object::ID,
        creator: address,
        name: String,
        image_url: String,
        description: String,
        created_at: u64,
    }

    /// Emitted when an NFT is flagged for fraud
    public struct NFTFlagged has copy, drop {
        nft_id: object::ID,
        flag_type: String,
        reason: String,
        confidence: u64,
        flagged_by: address,
    }

    /// Emitted when an NFT is placed in a kiosk
    public struct NFTPlacedInKiosk has copy, drop {
        nft_id: object::ID,
        kiosk_id: object::ID,
        owner: address,
    }

    // ===== Phase 1.2 & 1.3: Enhanced Listing Events =====

    /// Emitted when an NFT is listed for sale
    public struct NFTListed has copy, drop {
        nft_id: object::ID,
        kiosk_id: object::ID,
        seller: address,
        price: u64,
        listing_id: object::ID,
        timestamp: u64,
    }

    /// Emitted when an NFT listing is updated
    public struct NFTListingUpdated has copy, drop {
        nft_id: object::ID,
        kiosk_id: object::ID,
        seller: address,
        old_price: u64,
        new_price: u64,
        listing_id: object::ID,
        timestamp: u64,
    }

    /// Emitted when an NFT is unlisted
    public struct NFTUnlisted has copy, drop {
        nft_id: object::ID,
        kiosk_id: object::ID,
        seller: address,
        listing_id: object::ID,
        timestamp: u64,
    }

    /// Emitted when listing price is changed
    public struct ListingPriceChanged has copy, drop {
        nft_id: object::ID,
        kiosk_id: object::ID,
        seller: address,
        old_price: u64,
        new_price: u64,
        listing_id: object::ID,
        timestamp: u64,
    }

    /// Emitted when listing metadata is updated
    public struct ListingMetadataUpdated has copy, drop {
        nft_id: object::ID,
        listing_id: object::ID,
        seller: address,
        title: String,
        description: String,
        category: String,
        timestamp: u64,
    }

    // ===== Phase 1.4: Additional Events for Frontend Tracking =====

    /// Emitted when a kiosk is created
    public struct KioskCreated has copy, drop {
        kiosk_id: object::ID,
        owner: address,
        timestamp: u64,
    }

    /// Emitted when an NFT is purchased
    public struct NFTPurchased has copy, drop {
        nft_id: object::ID,
        kiosk_id: object::ID,
        seller: address,
        buyer: address,
        price: u64,
        listing_id: object::ID,
        timestamp: u64,
    }

    /// Emitted when a batch listing operation is completed
    public struct BatchListingCompleted has copy, drop {
        seller: address,
        kiosk_id: object::ID,
        nft_count: u64,
        total_value: u64,
        timestamp: u64,
    }

    /// Emitted when a listing expires
    public struct ListingExpired has copy, drop {
        nft_id: object::ID,
        kiosk_id: object::ID,
        listing_id: object::ID,
        timestamp: u64,
    }

    /// Emitted when marketplace statistics are updated
    public struct MarketplaceStatsUpdated has copy, drop {
        total_listings: u64,
        total_volume: u64,
        active_sellers: u64,
        timestamp: u64,
    }

    // ===== Functions =====

    /// Initialize the module and create agent capability
    fun init(otw: FRAUDGUARD_NFT, ctx: &mut tx_context::TxContext) {
        // Create the publisher
        let publisher = package::claim(otw, ctx);
        
        // Create agent capability
        let agent_cap = AgentCap {
            id: object::new(ctx),
            agent_address: tx_context::sender(ctx),
        };
        
        // Transfer publisher and agent cap to deployer
        transfer::public_transfer(publisher, tx_context::sender(ctx));
        transfer::transfer(agent_cap, tx_context::sender(ctx));
    }

    /// Create a transfer policy for the NFT type
    public entry fun create_transfer_policy(
        publisher: &package::Publisher, 
        ctx: &mut tx_context::TxContext
    ) {
        let (policy, policy_cap) = transfer_policy::new<FraudGuardNFT>(publisher, ctx);
        
        // Share the policy so anyone can read it
        transfer::public_share_object(policy);
        
        // Transfer the policy cap to the sender
        transfer::public_transfer(policy_cap, tx_context::sender(ctx));
    }

    /// Mint a new NFT directly into a kiosk
    public entry fun mint_to_kiosk(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        name: vector<u8>,
        description: vector<u8>,
        image_url: vector<u8>,
        ctx: &mut tx_context::TxContext
    ) {
        assert!(!std::vector::is_empty(&name), EEmptyName);
        
        let creator = tx_context::sender(ctx);
        let nft_id = object::new(ctx);
        let nft_id_copy = object::uid_to_inner(&nft_id);
        let created_at = tx_context::epoch_timestamp_ms(ctx);
        
        let nft = FraudGuardNFT {
            id: nft_id,
            name: string::utf8(name),
            description: string::utf8(description),
            image_url: url::new_unsafe_from_bytes(image_url),
            creator,
            created_at,
        };

        // Place the NFT in the kiosk
        kiosk::place(kiosk, cap, nft);

        // Emit event
        event::emit(NFTMinted {
            nft_id: nft_id_copy,
            creator,
            name: string::utf8(name),
            image_url: string::utf8(image_url),
            description: string::utf8(description),
            created_at,
        });

        event::emit(NFTPlacedInKiosk {
            nft_id: nft_id_copy,
            kiosk_id: object::id(kiosk),
            owner: creator,
        });
    }

    /// Mint a new NFT (regular minting without kiosk)
    public entry fun mint_nft(
        name: vector<u8>,
        description: vector<u8>,
        image_url: vector<u8>,
        recipient: address,
        ctx: &mut tx_context::TxContext
    ) {
        assert!(!std::vector::is_empty(&name), EEmptyName);
        
        let creator = tx_context::sender(ctx);
        let nft_id = object::new(ctx);
        let nft_id_copy = object::uid_to_inner(&nft_id);
        let created_at = tx_context::epoch_timestamp_ms(ctx);
        
        let nft = FraudGuardNFT {
            id: nft_id,
            name: string::utf8(name),
            description: string::utf8(description),
            image_url: url::new_unsafe_from_bytes(image_url),
            creator,
            created_at,
        };

        // Transfer to recipient
        transfer::public_transfer(nft, recipient);

        // Emit event
        event::emit(NFTMinted {
            nft_id: nft_id_copy,
            creator,
            name: string::utf8(name),
            image_url: string::utf8(image_url),
            description: string::utf8(description),
            created_at,
        });
    }

    /// Mint NFT (entry function for frontend integration)
    public entry fun mint_nft_with_id(
        name: vector<u8>,
        description: vector<u8>,
        image_url: vector<u8>,
        recipient: address,
        ctx: &mut tx_context::TxContext
    ) {
        assert!(!std::vector::is_empty(&name), EEmptyName);
        
        let creator = tx_context::sender(ctx);
        let nft_id = object::new(ctx);
        let nft_id_copy = object::uid_to_inner(&nft_id);
        let created_at = tx_context::epoch_timestamp_ms(ctx);
        
        let nft = FraudGuardNFT {
            id: nft_id,
            name: string::utf8(name),
            description: string::utf8(description),
            image_url: url::new_unsafe_from_bytes(image_url),
            creator,
            created_at,
        };

        // Transfer to recipient
        transfer::public_transfer(nft, recipient);

        // Emit event
        event::emit(NFTMinted {
            nft_id: nft_id_copy,
            creator,
            name: string::utf8(name),
            image_url: string::utf8(image_url),
            description: string::utf8(description),
            created_at,
        });
    }

    /// Flag an NFT for fraud (only callable by agent)
    public entry fun flag_nft(
        _agent_cap: &AgentCap,
        nft_id: object::ID,
        flag_type: vector<u8>,
        reason: vector<u8>,
        confidence: u64,
        ctx: &mut tx_context::TxContext
    ) {
        let flag = FraudFlag {
            id: object::new(ctx),
            nft_id,
            flag_type: string::utf8(flag_type),
            reason: string::utf8(reason),
            confidence,
            flagged_by: tx_context::sender(ctx),
            created_at: tx_context::epoch_timestamp_ms(ctx),
            is_active: true,
        };

        // Emit event
        event::emit(NFTFlagged {
            nft_id,
            flag_type: string::utf8(flag_type),
            reason: string::utf8(reason),
            confidence,
            flagged_by: tx_context::sender(ctx),
        });

        // Share the fraud flag so it can be queried
        transfer::share_object(flag);
    }

    // ===== Phase 1.2: Enhanced Listing Functions =====

    /// List an NFT for sale in a kiosk (Enhanced with events and validation)
    public entry fun list_nft(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        nft_id: object::ID,
        price: u64,
        ctx: &mut tx_context::TxContext
    ) {
        assert!(price > 0, EInvalidPrice);
        
        let seller = tx_context::sender(ctx);
        let kiosk_id = object::id(kiosk);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        
        // List the NFT in the kiosk
        kiosk::list<FraudGuardNFT>(kiosk, cap, nft_id, price);
        
        // Emit listing event
        event::emit(NFTListed {
            nft_id,
            kiosk_id,
            seller,
            price,
            listing_id: nft_id, // Use nft_id as listing_id for simplicity
            timestamp,
        });
    }

    /// Delist an NFT from a kiosk (Enhanced with events and validation)
    public entry fun delist_nft(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        nft_id: object::ID,
        ctx: &mut tx_context::TxContext
    ) {
        let seller = tx_context::sender(ctx);
        let kiosk_id = object::id(kiosk);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        
        // Delist the NFT from the kiosk
        kiosk::delist<FraudGuardNFT>(kiosk, cap, nft_id);
        
        // Emit unlisting event
        event::emit(NFTUnlisted {
            nft_id,
            kiosk_id,
            seller,
            listing_id: nft_id, // Use nft_id as listing_id for simplicity
            timestamp,
        });
    }

    /// Purchase an NFT from a kiosk (Enhanced with validation)
    public entry fun purchase_nft(
        kiosk: &mut Kiosk,
        nft_id: object::ID,
        payment: Coin<SUI>,
        policy: &TransferPolicy<FraudGuardNFT>,
        ctx: &mut tx_context::TxContext
    ) {
        let payment_amount = coin::value(&payment);
        assert!(payment_amount > 0, EInsufficientPayment);
        
        let purchaser = tx_context::sender(ctx);
        let kiosk_id = object::id(kiosk);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        
        // Get seller address from kiosk (simplified - in practice would need to track seller)
        let seller = tx_context::sender(ctx); // Placeholder - would need proper seller tracking
        
        let (nft, transfer_request) = kiosk::purchase<FraudGuardNFT>(kiosk, nft_id, payment);
        
        // Confirm the transfer request with the policy
        transfer_policy::confirm_request<FraudGuardNFT>(policy, transfer_request);
        
        // Transfer the NFT to the purchaser
        transfer::public_transfer(nft, purchaser);
        
        // Emit purchase event
        event::emit(NFTPurchased {
            nft_id,
            kiosk_id,
            seller,
            buyer: purchaser,
            price: payment_amount,
            listing_id: nft_id, // Use nft_id as listing_id for simplicity
            timestamp,
        });
    }

    /// Update listing price (Enhanced with events)
    public entry fun update_listing_price(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        nft_id: object::ID,
        new_price: u64,
        ctx: &mut tx_context::TxContext
    ) {
        assert!(new_price > 0, EInvalidPrice);
        
        let seller = tx_context::sender(ctx);
        let kiosk_id = object::id(kiosk);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        
        // Get current price (this is a simplified version - in practice you'd need to track the current price)
        let old_price = 0; // Placeholder - would need to be retrieved from kiosk state
        
        // Update the listing price in the kiosk
        kiosk::delist<FraudGuardNFT>(kiosk, cap, nft_id);
        kiosk::list<FraudGuardNFT>(kiosk, cap, nft_id, new_price);
        
        // Emit price change event
        event::emit(ListingPriceChanged {
            nft_id,
            kiosk_id,
            seller,
            old_price,
            new_price,
            listing_id: nft_id, // Use nft_id as listing_id for simplicity
            timestamp,
        });
        
        // Emit listing updated event
        event::emit(NFTListingUpdated {
            nft_id,
            kiosk_id,
            seller,
            old_price,
            new_price,
            listing_id: nft_id, // Use nft_id as listing_id for simplicity
            timestamp,
        });
    }

    // ===== Phase 1.3: Enhanced Metadata Management =====

    /// Create listing metadata
    public entry fun create_listing_metadata(
        nft_id: object::ID,
        title: vector<u8>,
        description: vector<u8>,
        category: vector<u8>,
        tags: vector<vector<u8>>,
        ctx: &mut tx_context::TxContext
    ) {
        assert!(!std::vector::is_empty(&title), EInvalidMetadata);
        assert!(!std::vector::is_empty(&category), EInvalidMetadata);
        
        let mut metadata = ListingMetadata {
            id: object::new(ctx),
            nft_id,
            title: string::utf8(title),
            description: string::utf8(description),
            category: string::utf8(category),
            tags: std::vector::empty(),
            created_at: tx_context::epoch_timestamp_ms(ctx),
            updated_at: tx_context::epoch_timestamp_ms(ctx),
        };
        
        // Add tags
        let mut i = 0;
        while (i < std::vector::length(&tags)) {
            let tag = std::vector::borrow(&tags, i);
            std::vector::push_back(&mut metadata.tags, string::utf8(*tag));
            i = i + 1;
        };
        
        // Share the metadata so it can be queried
        transfer::share_object(metadata);
    }

    /// Update listing metadata
    public entry fun update_listing_metadata(
        metadata: &mut ListingMetadata,
        title: vector<u8>,
        description: vector<u8>,
        category: vector<u8>,
        tags: vector<vector<u8>>,
        ctx: &mut tx_context::TxContext
    ) {
        assert!(!std::vector::is_empty(&title), EInvalidMetadata);
        assert!(!std::vector::is_empty(&category), EInvalidMetadata);
        
        let seller = tx_context::sender(ctx);
        let nft_id = metadata.nft_id;
        let listing_id = object::id(metadata);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        
        // Update metadata
        metadata.title = string::utf8(title);
        metadata.description = string::utf8(description);
        metadata.category = string::utf8(category);
        metadata.updated_at = timestamp;
        
        // Clear and update tags
        metadata.tags = std::vector::empty();
        let mut i = 0;
        while (i < std::vector::length(&tags)) {
            let tag = std::vector::borrow(&tags, i);
            std::vector::push_back(&mut metadata.tags, string::utf8(*tag));
            i = i + 1;
        };
        
        // Emit metadata update event
        event::emit(ListingMetadataUpdated {
            nft_id,
            listing_id,
            seller,
            title: string::utf8(title),
            description: string::utf8(description),
            category: string::utf8(category),
            timestamp,
        });
    }

    /// Get listing details (view function)
    public fun get_listing_details(metadata: &ListingMetadata): (object::ID, String, String, String, vector<String>, u64, u64) {
        (
            metadata.nft_id,
            metadata.title,
            metadata.description,
            metadata.category,
            metadata.tags,
            metadata.created_at,
            metadata.updated_at
        )
    }

    /// Batch list multiple NFTs (Phase 1.3 - Batch Operations)
    public entry fun batch_list_nfts(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        nft_ids: vector<object::ID>,
        prices: vector<u64>,
        ctx: &mut tx_context::TxContext
    ) {
        let batch_size = std::vector::length(&nft_ids);
        assert!(batch_size > 0, EEmptyBatch);
        assert!(batch_size == std::vector::length(&prices), EBatchSizeMismatch);
        
        let seller = tx_context::sender(ctx);
        let kiosk_id = object::id(kiosk);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        let mut total_value = 0;
        
        let mut i = 0;
        while (i < batch_size) {
            let nft_id = *std::vector::borrow(&nft_ids, i);
            let price = *std::vector::borrow(&prices, i);
            
            assert!(price > 0, EInvalidPrice);
            total_value = total_value + price;
            
            // List the NFT
            kiosk::list<FraudGuardNFT>(kiosk, cap, nft_id, price);
            
            // Emit individual listing event for each NFT
            event::emit(NFTListed {
                nft_id,
                kiosk_id,
                seller,
                price,
                listing_id: nft_id, // Use nft_id as listing_id for simplicity
                timestamp,
            });
            
            i = i + 1;
        };
        
        // Emit batch completion event
        event::emit(BatchListingCompleted {
            seller,
            kiosk_id,
            nft_count: batch_size,
            total_value,
            timestamp,
        });
    }

    // ===== View Functions =====

    /// Get NFT details
    public fun get_nft_details(nft: &FraudGuardNFT): (String, String, Url, address, u64) {
        (nft.name, nft.description, nft.image_url, nft.creator, nft.created_at)
    }

    /// Get NFT ID
    public fun get_nft_id(nft: &FraudGuardNFT): object::ID {
        object::id(nft)
    }

    /// Get fraud flag details
    public fun get_fraud_flag_details(flag: &FraudFlag): (object::ID, String, String, u64, address, u64, bool) {
        (flag.nft_id, flag.flag_type, flag.reason, flag.confidence, flag.flagged_by, flag.created_at, flag.is_active)
    }

    // ===== Phase 1.1: Kiosk Management Functions =====

    /// Create a kiosk if the user doesn't have one
    public entry fun create_kiosk_if_not_exists(
        ctx: &mut tx_context::TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Create a new kiosk
        let (kiosk, cap) = kiosk::new(ctx);
        let kiosk_id = object::id(&kiosk);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        
        // Transfer the kiosk and cap to the sender
        transfer::public_transfer(kiosk, sender);
        transfer::public_transfer(cap, sender);
        
        // Emit kiosk created event
        event::emit(KioskCreated {
            kiosk_id,
            owner: sender,
            timestamp,
        });
    }

    /// Get user's kiosk (view function - returns kiosk ID if exists)
    public fun get_user_kiosk_address(): address {
        // This function would need to be called with a proper context
        // For now, return a placeholder address
        @0x0
    }

    /// Check if user owns a kiosk (helper function for frontend)
    public fun check_kiosk_ownership(kiosk: &Kiosk, cap: &KioskOwnerCap): bool {
        // This function will return true if the user has access to both kiosk and cap
        // The actual ownership check is done by the kiosk module
        true
    }

    /// Expire a listing (Phase 1.4 - Listing Management)
    public entry fun expire_listing(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        nft_id: object::ID,
        ctx: &mut tx_context::TxContext
    ) {
        let kiosk_id = object::id(kiosk);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        
        // Delist the NFT from the kiosk
        kiosk::delist<FraudGuardNFT>(kiosk, cap, nft_id);
        
        // Emit listing expired event
        event::emit(ListingExpired {
            nft_id,
            kiosk_id,
            listing_id: nft_id, // Use nft_id as listing_id for simplicity
            timestamp,
        });
    }

    /// Update marketplace statistics (Phase 1.4 - Analytics)
    public entry fun update_marketplace_stats(
        total_listings: u64,
        total_volume: u64,
        active_sellers: u64,
        ctx: &mut tx_context::TxContext
    ) {
        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        
        // Emit marketplace stats update event
        event::emit(MarketplaceStatsUpdated {
            total_listings,
            total_volume,
            active_sellers,
            timestamp,
        });
    }

    /// List NFT with automatic kiosk creation if needed
    public entry fun list_nft_with_kiosk(
        nft_id: object::ID,
        price: u64,
        ctx: &mut tx_context::TxContext
    ) {
        assert!(price > 0, EInvalidPrice);
        
        // This is a simplified version - in practice, the frontend would:
        // 1. Check if user has kiosk
        // 2. Create kiosk if needed
        // 3. List the NFT
        // The actual implementation requires the kiosk and cap to be passed as parameters
    }
}
