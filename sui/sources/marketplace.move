/// Marketplace Module for FraudGuard
/// Handles NFT listing, buying, and marketplace operations
module fraudguard::marketplace {
    use sui::object::{Self, UID, ID};
    use sui::tx_context;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use sui::balance::{Self, Balance};
    use sui::transfer;
    use std::string::{Self, String};
    use fraudguard::fraudguard_nft::{Self, FraudGuardNFT};

    // ===== Errors =====
    const ENotOwner: u64 = 0;
    const EInsufficientPayment: u64 = 2;
    const EListingNotActive: u64 = 3;
    const EMarketplaceNotActive: u64 = 4;
    const EInvalidPrice: u64 = 5;
    const ENotMarketplaceOwner: u64 = 6;
    const EInvalidMetadata: u64 = 7;
    const EEmptyBatch: u64 = 8;
    const EBatchSizeMismatch: u64 = 9;

    // ===== Structs =====

    /// Main marketplace object
    public struct Marketplace has key {
        id: UID,
        owner: address,
        fee_percentage: u64, // Fee in basis points (e.g., 250 = 2.5%)
        total_volume: u64,
        total_sales: u64,
        is_active: bool,
        balance: Balance<SUI>, // Marketplace earnings
    }

    /// Individual NFT listing
    public struct Listing has key, store {
        id: UID,
        nft_id: ID,
        seller: address,
        price: u64,
        listed_at: u64,
        is_active: bool,
    }

    /// Marketplace admin capability
    public struct MarketplaceCap has key, store {
        id: UID,
        marketplace_id: ID,
    }

    /// Enhanced listing metadata
    public struct ListingMetadata has key, store {
        id: UID,
        listing_id: ID,
        nft_id: ID,
        title: string::String,
        description: string::String,
        category: string::String,
        tags: vector<string::String>,
        created_at: u64,
        updated_at: u64,
    }

    // ===== Events =====

    /// Emitted when marketplace is created
    public struct MarketplaceCreated has copy, drop {
        marketplace_id: ID,
        owner: address,
        fee_percentage: u64,
    }

    /// Emitted when NFT is listed
    public struct NFTListed has copy, drop {
        listing_id: ID,
        nft_id: ID,
        seller: address,
        price: u64,
        marketplace_id: ID,
        timestamp: u64,
    }

    /// Emitted when NFT is purchased
    public struct NFTPurchased has copy, drop {
        listing_id: ID,
        nft_id: ID,
        seller: address,
        buyer: address,
        price: u64,
        marketplace_fee: u64,
        timestamp: u64,
    }

    /// Emitted when listing is cancelled/unlisted
    public struct ListingCancelled has copy, drop {
        listing_id: ID,
        nft_id: ID,
        seller: address,
        timestamp: u64,
    }

    /// Emitted when NFT is unlisted (for backend database sync)
    public struct NFTUnlisted has copy, drop {
        listing_id: ID,
        nft_id: ID,
        seller: address,
        marketplace_id: ID,
        timestamp: u64,
        transaction_digest: vector<u8>,
    }

    // ===== Public Functions =====

    /// Buy a listed NFT (non-entry function for internal use)
    public fun buy_nft_internal(
        marketplace: &mut Marketplace,
        listing: &mut Listing,
        mut payment: Coin<SUI>,
        ctx: &mut TxContext
    ): (Coin<SUI>, Coin<SUI>, NFTPurchased) {
        // Validate listing is active
        assert!(listing.is_active, EListingNotActive);
        
        // Validate marketplace is active
        assert!(marketplace.is_active, EMarketplaceNotActive);
        
        // Check payment amount matches price
        let payment_amount = coin::value(&payment);
        assert!(payment_amount >= listing.price, EInsufficientPayment);
        
        // Calculate marketplace fee
        let fee_amount = (listing.price * marketplace.fee_percentage) / 10000;
        let seller_amount = listing.price - fee_amount;
        
        // Split payment into marketplace fee and seller payment
        let marketplace_fee = coin::split(&mut payment, fee_amount, ctx);
        let seller_payment = if (seller_amount > 0) {
            coin::split(&mut payment, seller_amount, ctx)
        } else {
            coin::zero(ctx)
        };
        
        // Add marketplace fee to marketplace balance
        let fee_balance = coin::into_balance(marketplace_fee);
        balance::join(&mut marketplace.balance, fee_balance);
        
        // Update marketplace stats
        marketplace.total_volume = marketplace.total_volume + listing.price;
        marketplace.total_sales = marketplace.total_sales + 1;
        
        // Mark listing as inactive
        listing.is_active = false;
        
        // Create purchase event
        let purchase_event = NFTPurchased {
            listing_id: object::id(listing),
            nft_id: listing.nft_id,
            seller: listing.seller,
            buyer: tx_context::sender(ctx),
            price: listing.price,
            marketplace_fee: fee_amount,
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        };
        
        // Return seller payment, any remaining payment, and event
        (seller_payment, payment, purchase_event)
    }

    // ===== Events (continued) =====

    /// Emitted when listing price is updated
    public struct ListingPriceUpdated has copy, drop {
        listing_id: ID,
        nft_id: ID,
        seller: address,
        old_price: u64,
        new_price: u64,
        timestamp: u64,
    }

    /// Emitted when listing metadata is updated
    public struct ListingMetadataUpdated has copy, drop {
        listing_id: ID,
        nft_id: ID,
        seller: address,
        title: string::String,
        description: string::String,
        category: string::String,
        timestamp: u64,
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

    // ===== Public Entry Functions =====

    /// Create a new marketplace
    public entry fun create_marketplace(
        fee_percentage: u64,
        ctx: &mut TxContext
    ) {
        let marketplace_id = object::new(ctx);
        let marketplace_id_copy = object::uid_to_inner(&marketplace_id);
        let owner = tx_context::sender(ctx);

        let marketplace = Marketplace {
            id: marketplace_id,
            owner,
            fee_percentage,
            total_volume: 0,
            total_sales: 0,
            is_active: true,
            balance: balance::zero(),
        };

        let cap = MarketplaceCap {
            id: object::new(ctx),
            marketplace_id: marketplace_id_copy,
        };

        // Emit event
        event::emit(MarketplaceCreated {
            marketplace_id: marketplace_id_copy,
            owner,
            fee_percentage,
        });

        transfer::share_object(marketplace);
        transfer::transfer(cap, owner);
    }

    /// List an NFT for sale (Simplified - no marketplace object required)
    public entry fun list_nft_simple(
        nft: FraudGuardNFT,
        price: u64,
        ctx: &mut TxContext
    ) {
        assert!(price > 0, EInvalidPrice);

        let seller = tx_context::sender(ctx);
        let nft_id = fraudguard_nft::get_nft_id(&nft);
        let listing_id = object::new(ctx);
        let listing_id_copy = object::uid_to_inner(&listing_id);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        let listing = Listing {
            id: listing_id,
            nft_id,
            seller,
            price,
            listed_at: timestamp,
            is_active: true,
        };

        // Emit listing event
        event::emit(NFTListed {
            listing_id: listing_id_copy,
            nft_id,
            seller,
            price,
            marketplace_id: object::id_from_address(@0x0), // Use zero address since no marketplace
            timestamp,
        });

        // Share listing object
        transfer::share_object(listing);

        // Keep NFT with seller for now (simplified for hackathon)
        transfer::public_transfer(nft, seller);
    }

    /// List an NFT for sale with database sync (follows NFT minting pattern)
    public entry fun list_nft_with_sync(
        nft: FraudGuardNFT,
        price: u64,
        ctx: &mut TxContext
    ) {
        assert!(price > 0, EInvalidPrice);

        let seller = tx_context::sender(ctx);
        let nft_id = fraudguard_nft::get_nft_id(&nft);
        let listing_id = object::new(ctx);
        let listing_id_copy = object::uid_to_inner(&listing_id);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        let listing = Listing {
            id: listing_id,
            nft_id,
            seller,
            price,
            listed_at: timestamp,
            is_active: true,
        };

        // Emit listing event with transaction digest for backend sync
        event::emit(NFTListed {
            listing_id: listing_id_copy,
            nft_id,
            seller,
            price,
            marketplace_id: object::id_from_address(@0x0), // Use zero address since no marketplace
            timestamp,
        });

        // Share listing object
        transfer::share_object(listing);

        // Keep NFT with seller for now (simplified for hackathon)
        transfer::public_transfer(nft, seller);
    }

    /// List an NFT for sale (Enhanced with better validation and events)
    public entry fun list_nft(
        marketplace: &mut Marketplace,
        nft: FraudGuardNFT,
        price: u64,
        title: vector<u8>,
        description: vector<u8>,
        category: vector<u8>,
        tags: vector<vector<u8>>,
        ctx: &mut TxContext
    ) {
        assert!(marketplace.is_active, EMarketplaceNotActive);
        assert!(price > 0, EInvalidPrice);
        assert!(!std::vector::is_empty(&title), EInvalidMetadata);
        assert!(!std::vector::is_empty(&category), EInvalidMetadata);

        let seller = tx_context::sender(ctx);
        let nft_id = fraudguard_nft::get_nft_id(&nft);
        let listing_id = object::new(ctx);
        let listing_id_copy = object::uid_to_inner(&listing_id);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        let listing = Listing {
            id: listing_id,
            nft_id,
            seller,
            price,
            listed_at: timestamp,
            is_active: true,
        };

        // Create metadata
        let mut metadata = ListingMetadata {
            id: object::new(ctx),
            listing_id: listing_id_copy,
            nft_id,
            title: string::utf8(title),
            description: string::utf8(description),
            category: string::utf8(category),
            tags: std::vector::empty(),
            created_at: timestamp,
            updated_at: timestamp,
        };

        // Add tags
        let mut i = 0;
        while (i < std::vector::length(&tags)) {
            let tag = std::vector::borrow(&tags, i);
            std::vector::push_back(&mut metadata.tags, string::utf8(*tag));
            i = i + 1;
        };

        // Emit listing event
        event::emit(NFTListed {
            listing_id: listing_id_copy,
            nft_id,
            seller,
            price,
            marketplace_id: object::id(marketplace),
            timestamp,
        });

        // Share objects
        transfer::share_object(listing);
        transfer::share_object(metadata);

        // Keep NFT with seller for now (simplified for hackathon)
        transfer::public_transfer(nft, seller);
    }

    /// Buy an NFT from a listing (Enhanced with proper NFT transfer handling)
    public entry fun buy_nft(
        marketplace: &mut Marketplace,
        listing: &mut Listing,
        nft: FraudGuardNFT,
        mut payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        assert!(marketplace.is_active, EMarketplaceNotActive);
        assert!(listing.is_active, EListingNotActive);
        
        let payment_amount = coin::value(&payment);
        assert!(payment_amount >= listing.price, EInsufficientPayment);

        let buyer = tx_context::sender(ctx);
        let listing_id = object::id(listing);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        
        // Calculate marketplace fee
        let marketplace_fee = (listing.price * marketplace.fee_percentage) / 10000;
        let seller_amount = listing.price - marketplace_fee;

        // Split payment
        let marketplace_payment = coin::split(&mut payment, marketplace_fee, ctx);
        let seller_payment = if (seller_amount > 0) {
            coin::split(&mut payment, seller_amount, ctx)
        } else {
            coin::zero(ctx)
        };

        // Add marketplace fee to balance
        balance::join(&mut marketplace.balance, coin::into_balance(marketplace_payment));

        // Update marketplace stats
        marketplace.total_volume = marketplace.total_volume + listing.price;
        marketplace.total_sales = marketplace.total_sales + 1;

        // Mark listing as inactive
        listing.is_active = false;

        // Emit purchase event
        event::emit(NFTPurchased {
            listing_id,
            nft_id: listing.nft_id,
            seller: listing.seller,
            buyer,
            price: listing.price,
            marketplace_fee,
            timestamp,
        });

        // Transfer NFT to buyer
        transfer::public_transfer(nft, buyer);

        // Transfer payment to seller
        transfer::public_transfer(seller_payment, listing.seller);
        
        // Return any excess payment to buyer
        if (coin::value(&payment) > 0) {
            transfer::public_transfer(payment, buyer);
        } else {
            coin::destroy_zero(payment);
        };
    }

    /// Cancel a listing (Simplified)
    public entry fun cancel_listing_simple(
        listing: Listing,
        ctx: &mut TxContext
    ) {
        assert!(listing.seller == tx_context::sender(ctx), ENotOwner);
        assert!(listing.is_active, EListingNotActive);

        let listing_id = object::id(&listing);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        // Emit cancellation event
        event::emit(ListingCancelled {
            listing_id,
            nft_id: listing.nft_id,
            seller: listing.seller,
            timestamp,
        });

        // Destroy the listing
        let Listing { id, nft_id: _, seller: _, price: _, listed_at: _, is_active: _ } = listing;
        object::delete(id);
    }

    /// Unlist an NFT with database sync (follows NFT minting pattern)
    public entry fun unlist_nft_with_sync(
        listing: Listing,
        ctx: &mut TxContext
    ) {
        assert!(listing.seller == tx_context::sender(ctx), ENotOwner);
        assert!(listing.is_active, EListingNotActive);

        let listing_id = object::id(&listing);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        // Emit unlisting event for backend sync
        event::emit(NFTUnlisted {
            listing_id,
            nft_id: listing.nft_id,
            seller: listing.seller,
            marketplace_id: object::id_from_address(@0x0), // Use zero address since no marketplace
            timestamp,
            transaction_digest: b"", // Will be filled by transaction processor
        });

        // Also emit the standard cancellation event
        event::emit(ListingCancelled {
            listing_id,
            nft_id: listing.nft_id,
            seller: listing.seller,
            timestamp,
        });

        // Destroy the listing
        let Listing { id, nft_id: _, seller: _, price: _, listed_at: _, is_active: _ } = listing;
        object::delete(id);
    }

    /// Cancel a listing (Enhanced with events)
    public entry fun cancel_listing(
        listing: Listing,
        ctx: &mut TxContext
    ) {
        assert!(listing.seller == tx_context::sender(ctx), ENotOwner);
        assert!(listing.is_active, EListingNotActive);

        let listing_id = object::id(&listing);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        // Emit cancellation event
        event::emit(ListingCancelled {
            listing_id,
            nft_id: listing.nft_id,
            seller: listing.seller,
            timestamp,
        });

        // Destroy the listing
        let Listing { id, nft_id: _, seller: _, price: _, listed_at: _, is_active: _ } = listing;
        object::delete(id);
    }

    /// Update listing price (New function for Phase 1.2)
    public entry fun update_listing_price(
        listing: &mut Listing,
        new_price: u64,
        ctx: &mut TxContext
    ) {
        assert!(listing.seller == tx_context::sender(ctx), ENotOwner);
        assert!(listing.is_active, EListingNotActive);
        assert!(new_price > 0, EInvalidPrice);

        let old_price = listing.price;
        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        // Update price
        listing.price = new_price;

        // Emit price update event
        event::emit(ListingPriceUpdated {
            listing_id: object::id(listing),
            nft_id: listing.nft_id,
            seller: listing.seller,
            old_price,
            new_price,
            timestamp,
        });
    }

    /// Edit listing price with database sync (follows NFT minting pattern)
    public entry fun edit_listing_price_with_sync(
        listing: &mut Listing,
        new_price: u64,
        ctx: &mut TxContext
    ) {
        assert!(listing.seller == tx_context::sender(ctx), ENotOwner);
        assert!(listing.is_active, EListingNotActive);
        assert!(new_price > 0, EInvalidPrice);

        let old_price = listing.price;
        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        // Update price
        listing.price = new_price;

        // Emit edit event for backend sync
        event::emit(ListingEdited {
            listing_id: object::id(listing),
            nft_id: listing.nft_id,
            seller: listing.seller,
            old_price,
            new_price,
            marketplace_id: object::id_from_address(@0x0), // Use zero address since no marketplace
            timestamp,
            transaction_digest: b"", // Will be filled by transaction processor
        });

        // Also emit the standard price update event
        event::emit(ListingPriceUpdated {
            listing_id: object::id(listing),
            nft_id: listing.nft_id,
            seller: listing.seller,
            old_price,
            new_price,
            timestamp,
        });
    }

    /// Update listing metadata (New function for Phase 1.3)
    public entry fun update_listing_metadata(
        metadata: &mut ListingMetadata,
        title: vector<u8>,
        description: vector<u8>,
        category: vector<u8>,
        tags: vector<vector<u8>>,
        ctx: &mut TxContext
    ) {
        assert!(!std::vector::is_empty(&title), EInvalidMetadata);
        assert!(!std::vector::is_empty(&category), EInvalidMetadata);

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
            listing_id: metadata.listing_id,
            nft_id: metadata.nft_id,
            seller: tx_context::sender(ctx),
            title: string::utf8(title),
            description: string::utf8(description),
            category: string::utf8(category),
            timestamp,
        });
    }

    /// Batch list multiple NFTs (New function for Phase 1.3)
    public entry fun batch_list_nfts(
        marketplace: &mut Marketplace,
        nft_ids: vector<ID>,
        prices: vector<u64>,
        titles: vector<vector<u8>>,
        descriptions: vector<vector<u8>>,
        categories: vector<vector<u8>>,
        tags_list: vector<vector<vector<u8>>>,
        ctx: &mut TxContext
    ) {
        let batch_size = std::vector::length(&nft_ids);
        assert!(batch_size > 0, EEmptyBatch);
        assert!(batch_size == std::vector::length(&prices), EBatchSizeMismatch);
        assert!(batch_size == std::vector::length(&titles), EBatchSizeMismatch);
        assert!(batch_size == std::vector::length(&descriptions), EBatchSizeMismatch);
        assert!(batch_size == std::vector::length(&categories), EBatchSizeMismatch);
        assert!(batch_size == std::vector::length(&tags_list), EBatchSizeMismatch);

        let seller = tx_context::sender(ctx);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        let mut i = 0;
        while (i < batch_size) {
            let nft_id = *std::vector::borrow(&nft_ids, i);
            let price = *std::vector::borrow(&prices, i);
            let title = *std::vector::borrow(&titles, i);
            let description = *std::vector::borrow(&descriptions, i);
            let category = *std::vector::borrow(&categories, i);
            let tags = *std::vector::borrow(&tags_list, i);

            assert!(price > 0, EInvalidPrice);
            assert!(!std::vector::is_empty(&title), EInvalidMetadata);
            assert!(!std::vector::is_empty(&category), EInvalidMetadata);

            let listing_id = object::new(ctx);
            let listing_id_copy = object::uid_to_inner(&listing_id);

            let listing = Listing {
                id: listing_id,
                nft_id,
                seller,
                price,
                listed_at: timestamp,
                is_active: true,
            };

            // Create metadata
            let mut metadata = ListingMetadata {
                id: object::new(ctx),
                listing_id: listing_id_copy,
                nft_id,
                title: string::utf8(title),
                description: string::utf8(description),
                category: string::utf8(category),
                tags: std::vector::empty(),
                created_at: timestamp,
                updated_at: timestamp,
            };

            // Add tags
            let mut j = 0;
            while (j < std::vector::length(&tags)) {
                let tag = std::vector::borrow(&tags, j);
                std::vector::push_back(&mut metadata.tags, string::utf8(*tag));
                j = j + 1;
            };

            // Emit individual listing event
            event::emit(NFTListed {
                listing_id: listing_id_copy,
                nft_id,
                seller,
                price,
                marketplace_id: object::id(marketplace),
                timestamp,
            });

            // Share objects
            transfer::share_object(listing);
            transfer::share_object(metadata);

            i = i + 1;
        };
    }

    /// Withdraw marketplace earnings (owner only)
    public entry fun withdraw_earnings(
        marketplace: &mut Marketplace,
        cap: &MarketplaceCap,
        amount: u64,
        ctx: &mut TxContext
    ) {
        assert!(cap.marketplace_id == object::id(marketplace), ENotMarketplaceOwner);
        assert!(balance::value(&marketplace.balance) >= amount, EInsufficientPayment);

        let withdrawn = coin::take(&mut marketplace.balance, amount, ctx);
        transfer::public_transfer(withdrawn, marketplace.owner);
    }

    /// Update marketplace fee (owner only)
    public entry fun update_fee(
        marketplace: &mut Marketplace,
        cap: &MarketplaceCap,
        new_fee_percentage: u64,
    ) {
        assert!(cap.marketplace_id == object::id(marketplace), ENotMarketplaceOwner);
        marketplace.fee_percentage = new_fee_percentage;
    }

    /// Toggle marketplace active status (owner only)
    public entry fun toggle_marketplace(
        marketplace: &mut Marketplace,
        cap: &MarketplaceCap,
    ) {
        assert!(cap.marketplace_id == object::id(marketplace), ENotMarketplaceOwner);
        marketplace.is_active = !marketplace.is_active;
    }

    // ===== Public View Functions =====

    /// Get marketplace info
    public fun get_marketplace_info(marketplace: &Marketplace): (address, u64, u64, u64, bool) {
        (
            marketplace.owner,
            marketplace.fee_percentage,
            marketplace.total_volume,
            marketplace.total_sales,
            marketplace.is_active
        )
    }

    /// Get marketplace balance
    public fun get_marketplace_balance(marketplace: &Marketplace): u64 {
        balance::value(&marketplace.balance)
    }

    /// Get listing info
    public fun get_listing_info(listing: &Listing): (ID, address, u64, u64, bool) {
        (
            listing.nft_id,
            listing.seller,
            listing.price,
            listing.listed_at,
            listing.is_active
        )
    }

    /// Get listing details (New function for Phase 1.3)
    public fun get_listing_details(metadata: &ListingMetadata): (ID, string::String, string::String, string::String, vector<string::String>, u64, u64) {
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

    /// Check if listing is active
    public fun is_listing_active(listing: &Listing): bool {
        listing.is_active
    }

    /// Get listing price
    public fun get_listing_price(listing: &Listing): u64 {
        listing.price
    }

    /// Get listing seller
    public fun get_listing_seller(listing: &Listing): address {
        listing.seller
    }

    // ===== Helper Functions =====

    /// Calculate marketplace fee for a given price
    public fun calculate_fee(marketplace: &Marketplace, price: u64): u64 {
        (price * marketplace.fee_percentage) / 10000
    }

    /// Calculate seller amount after fee
    public fun calculate_seller_amount(marketplace: &Marketplace, price: u64): u64 {
        price - calculate_fee(marketplace, price)
    }

    // ===== Test Functions =====

    #[test_only]
    public fun test_create_marketplace(ctx: &mut TxContext): (Marketplace, MarketplaceCap) {
        let marketplace_id = object::new(ctx);
        let marketplace_id_copy = object::uid_to_inner(&marketplace_id);

        let marketplace = Marketplace {
            id: marketplace_id,
            owner: tx_context::sender(ctx),
            fee_percentage: 250, // 2.5%
            total_volume: 0,
            total_sales: 0,
            is_active: true,
            balance: balance::zero(),
        };

        let cap = MarketplaceCap {
            id: object::new(ctx),
            marketplace_id: marketplace_id_copy,
        };

        (marketplace, cap)
    }

    #[test_only]
    public fun test_create_listing(
        nft_id: ID,
        seller: address,
        price: u64,
        ctx: &mut TxContext
    ): Listing {
        Listing {
            id: object::new(ctx),
            nft_id,
            seller,
            price,
            listed_at: 0,
            is_active: true,
        }
    }
}
