/// Marketplace Module for FraudGuard
/// Handles NFT listing, buying, and marketplace operations
module fraudguard::marketplace {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use sui::balance::{Self, Balance};
    // Remove unused string import
    use fraudguard::nft::{Self, NFT};

    // ===== Errors =====
    const ENotOwner: u64 = 0;
    // Remove unused error constant
    const EInsufficientPayment: u64 = 2;
    const EListingNotActive: u64 = 3;
    const EMarketplaceNotActive: u64 = 4;
    const EInvalidPrice: u64 = 5;
    const ENotMarketplaceOwner: u64 = 6;

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
    }

    /// Emitted when NFT is purchased
    public struct NFTPurchased has copy, drop {
        listing_id: ID,
        nft_id: ID,
        seller: address,
        buyer: address,
        price: u64,
        marketplace_fee: u64,
    }

    /// Emitted when listing is cancelled
    public struct ListingCancelled has copy, drop {
        listing_id: ID,
        nft_id: ID,
        seller: address,
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

    /// List an NFT for sale
    public entry fun list_nft(
        marketplace: &mut Marketplace,
        nft: NFT,
        price: u64,
        ctx: &mut TxContext
    ) {
        assert!(marketplace.is_active, EMarketplaceNotActive);
        assert!(price > 0, EInvalidPrice);

        let seller = tx_context::sender(ctx);
        let nft_id = nft::get_nft_id(&nft);
        let listing_id = object::new(ctx);
        let listing_id_copy = object::uid_to_inner(&listing_id);

        let listing = Listing {
            id: listing_id,
            nft_id,
            seller,
            price,
            listed_at: tx_context::epoch_timestamp_ms(ctx),
            is_active: true,
        };

        // Emit event
        event::emit(NFTListed {
            listing_id: listing_id_copy,
            nft_id,
            seller,
            price,
        });

        // For hackathon simplicity, we'll use public_transfer and handle escrow in frontend
        transfer::public_transfer(nft, seller); // Keep with seller for now
        transfer::share_object(listing);
    }

    /// Buy an NFT from a listing
    public entry fun buy_nft(
        marketplace: &mut Marketplace,
        listing: Listing,
        mut payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        assert!(marketplace.is_active, EMarketplaceNotActive);
        assert!(listing.is_active, EListingNotActive);
        
        let payment_amount = coin::value(&payment);
        assert!(payment_amount >= listing.price, EInsufficientPayment);

        let buyer = tx_context::sender(ctx);
        let listing_id = object::id(&listing);
        
        // Calculate marketplace fee
        let marketplace_fee = (listing.price * marketplace.fee_percentage) / 10000;
        let seller_amount = listing.price - marketplace_fee;

        // Split payment
        let marketplace_payment = coin::split(&mut payment, marketplace_fee, ctx);
        let seller_payment = coin::split(&mut payment, seller_amount, ctx);

        // Add marketplace fee to balance
        balance::join(&mut marketplace.balance, coin::into_balance(marketplace_payment));

        // Update marketplace stats
        marketplace.total_volume = marketplace.total_volume + listing.price;
        marketplace.total_sales = marketplace.total_sales + 1;

        // Emit event
        event::emit(NFTPurchased {
            listing_id,
            nft_id: listing.nft_id,
            seller: listing.seller,
            buyer,
            price: listing.price,
            marketplace_fee,
        });

        // Transfer payment to seller
        transfer::public_transfer(seller_payment, listing.seller);
        
        // Return any excess payment to buyer
        if (coin::value(&payment) > 0) {
            transfer::public_transfer(payment, buyer);
        } else {
            coin::destroy_zero(payment);
        };

        // Transfer NFT to buyer (this is simplified - in practice you'd need to handle the escrow)
        // For hackathon purposes, we'll emit the event and handle NFT transfer in frontend
        
        // Destroy the listing
        let Listing { id, nft_id: _, seller: _, price: _, listed_at: _, is_active: _ } = listing;
        object::delete(id);
    }

    /// Cancel a listing
    public entry fun cancel_listing(
        listing: Listing,
        ctx: &mut TxContext
    ) {
        assert!(listing.seller == tx_context::sender(ctx), ENotOwner);
        assert!(listing.is_active, EListingNotActive);

        let listing_id = object::id(&listing);

        // Emit event
        event::emit(ListingCancelled {
            listing_id,
            nft_id: listing.nft_id,
            seller: listing.seller,
        });

        // Return NFT to seller (simplified for hackathon)
        // In practice, you'd retrieve the NFT from escrow
        
        // Destroy the listing
        let Listing { id, nft_id: _, seller: _, price: _, listed_at: _, is_active: _ } = listing;
        object::delete(id);
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
