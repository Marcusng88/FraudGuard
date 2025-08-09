/// Simple Marketplace Module for FraudGuard
/// Handles NFT listing, unlisting, price updates, and purchases with escrow
module fraudguard::marketplace {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use sui::transfer;
    use sui::table::{Self, Table};
    use sui::dynamic_field as df;
    use fraudguard::fraudguard_nft::{Self, FraudGuardNFT};

    // ===== Errors =====
    const ENotOwner: u64 = 1;
    const EInsufficientPayment: u64 = 2;
    const EListingNotFound: u64 = 3;
    const EAlreadyListed: u64 = 4;
    const EInvalidPrice: u64 = 5;
    const EMarketplaceNotActive: u64 = 6;

    // ===== Constants =====
    const MARKETPLACE_FEE_BASIS_POINTS: u64 = 25; // 0.25%
    const FEE_DENOMINATOR: u64 = 10000;

    // ===== Structs =====

    /// Main marketplace object
    public struct Marketplace has key {
        id: UID,
        owner: address,
        fee_recipient: address,
        total_volume: u64,
        total_sales: u64,
        is_active: bool,
        // Store NFT listings in a table
        listings: Table<ID, ListingInfo>,
    }

    /// Listing information stored in the marketplace
    public struct ListingInfo has store, drop {
        seller: address,
        price: u64,
        created_at: u64,
    }

    /// Marketplace admin capability
    public struct MarketplaceCap has key, store {
        id: UID,
    }

    // ===== Events =====

    public struct NFTListed has copy, drop {
        nft_id: ID,
        seller: address,
        price: u64,
        timestamp: u64,
    }

    public struct NFTUnlisted has copy, drop {
        nft_id: ID,
        seller: address,
        timestamp: u64,
    }

    public struct NFTPurchased has copy, drop {
        nft_id: ID,
        seller: address,
        buyer: address,
        price: u64,
        marketplace_fee: u64,
        timestamp: u64,
    }

    public struct PriceUpdated has copy, drop {
        nft_id: ID,
        seller: address,
        old_price: u64,
        new_price: u64,
        timestamp: u64,
    }

    // ===== Functions =====

    /// Initialize the marketplace
    fun init(ctx: &mut TxContext) {
        let owner = tx_context::sender(ctx);
        let marketplace = Marketplace {
            id: object::new(ctx),
            owner,
            fee_recipient: owner,
            total_volume: 0,
            total_sales: 0,
            is_active: true,
            listings: table::new(ctx),
        };

        let cap = MarketplaceCap {
            id: object::new(ctx),
        };

        transfer::share_object(marketplace);
        transfer::transfer(cap, owner);
    }

    /// List an NFT for sale (puts NFT in escrow)
    public entry fun list_nft(
        marketplace: &mut Marketplace,
        nft: FraudGuardNFT,
        price: u64,
        ctx: &mut TxContext
    ) {
        assert!(marketplace.is_active, EMarketplaceNotActive);
        assert!(price > 0, EInvalidPrice);

        let seller = tx_context::sender(ctx);
        let nft_id = object::id(&nft);

        // Verify ownership by checking if sender is the current owner (NFT is in their possession)
        // In Sui, if you can pass the NFT object, you own it

        // Check if already listed
        assert!(!table::contains(&marketplace.listings, nft_id), EAlreadyListed);

        // Store listing info
        let listing_info = ListingInfo {
            seller,
            price,
            created_at: tx_context::epoch_timestamp_ms(ctx),
        };
        table::add(&mut marketplace.listings, nft_id, listing_info);

        // Store NFT in marketplace as a dynamic field (escrow)
        df::add(&mut marketplace.id, nft_id, nft);

        // Emit event
        event::emit(NFTListed {
            nft_id,
            seller,
            price,
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        });
    }

    /// Unlist an NFT (returns from escrow to owner)
    public entry fun unlist_nft(
        marketplace: &mut Marketplace,
        nft_id: ID,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);

        // Check if listed
        assert!(table::contains(&marketplace.listings, nft_id), EListingNotFound);

        let listing_info = table::borrow(&marketplace.listings, nft_id);

        // Verify ownership
        assert!(listing_info.seller == sender, ENotOwner);

        // Remove listing
        table::remove(&mut marketplace.listings, nft_id);

        // Return NFT from escrow to seller
        let nft: FraudGuardNFT = df::remove(&mut marketplace.id, nft_id);
        transfer::public_transfer(nft, sender);

        // Emit event
        event::emit(NFTUnlisted {
            nft_id,
            seller: sender,
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        });
    }

    /// Purchase an NFT from the marketplace
    public entry fun purchase_nft(
        marketplace: &mut Marketplace,
        nft_id: ID,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        assert!(marketplace.is_active, EMarketplaceNotActive);

        let buyer = tx_context::sender(ctx);

        // Check if listed
        assert!(table::contains(&marketplace.listings, nft_id), EListingNotFound);

        let listing_info = table::remove(&mut marketplace.listings, nft_id);
        let seller = listing_info.seller;
        let price = listing_info.price;

        // Verify payment
        assert!(coin::value(&payment) >= price, EInsufficientPayment);

        // Calculate fees
        let marketplace_fee = (price * MARKETPLACE_FEE_BASIS_POINTS) / FEE_DENOMINATOR;
        let seller_amount = price - marketplace_fee;

        // Split payment
        let mut payment = payment;
        let fee_coin = coin::split(&mut payment, marketplace_fee, ctx);
        let seller_coin = coin::split(&mut payment, seller_amount, ctx);

        // Transfer payments
        transfer::public_transfer(fee_coin, marketplace.fee_recipient);
        transfer::public_transfer(seller_coin, seller);

        // Return excess payment to buyer
        if (coin::value(&payment) > 0) {
            transfer::public_transfer(payment, buyer);
        } else {
            coin::destroy_zero(payment);
        };

        // Transfer NFT from escrow to buyer
        let nft: FraudGuardNFT = df::remove(&mut marketplace.id, nft_id);
        transfer::public_transfer(nft, buyer);

        // Update marketplace stats
        marketplace.total_volume = marketplace.total_volume + price;
        marketplace.total_sales = marketplace.total_sales + 1;

        // Emit event
        event::emit(NFTPurchased {
            nft_id,
            seller,
            buyer,
            price,
            marketplace_fee,
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        });
    }

    /// Update the price of a listed NFT
    public entry fun update_listing_price(
        marketplace: &mut Marketplace,
        nft_id: ID,
        new_price: u64,
        ctx: &mut TxContext
    ) {
        assert!(new_price > 0, EInvalidPrice);

        let sender = tx_context::sender(ctx);

        // Check if listed
        assert!(table::contains(&marketplace.listings, nft_id), EListingNotFound);

        let listing_info = table::borrow_mut(&mut marketplace.listings, nft_id);

        // Verify ownership
        assert!(listing_info.seller == sender, ENotOwner);

        let old_price = listing_info.price;
        listing_info.price = new_price;

        // Emit event
        event::emit(PriceUpdated {
            nft_id,
            seller: sender,
            old_price,
            new_price,
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        });
    }

    // ===== View Functions =====

    /// Check if an NFT is listed
    public fun is_listed(marketplace: &Marketplace, nft_id: ID): bool {
        table::contains(&marketplace.listings, nft_id)
    }

    /// Get listing information
    public fun get_listing_info(marketplace: &Marketplace, nft_id: ID): (address, u64, u64) {
        assert!(table::contains(&marketplace.listings, nft_id), EListingNotFound);
        let listing_info = table::borrow(&marketplace.listings, nft_id);
        (listing_info.seller, listing_info.price, listing_info.created_at)
    }

    /// Get marketplace statistics
    public fun get_marketplace_stats(marketplace: &Marketplace): (u64, u64) {
        (marketplace.total_volume, marketplace.total_sales)
    }

    /// Get marketplace fee
    public fun get_marketplace_fee(): u64 {
        MARKETPLACE_FEE_BASIS_POINTS
    }

    // ===== Admin Functions =====

    /// Update fee recipient (admin only)
    public entry fun update_fee_recipient(
        marketplace: &mut Marketplace,
        _cap: &MarketplaceCap,
        new_recipient: address,
    ) {
        marketplace.fee_recipient = new_recipient;
    }

    /// Set marketplace active status (admin only)
    public entry fun set_marketplace_active(
        marketplace: &mut Marketplace,
        _cap: &MarketplaceCap,
        active: bool,
    ) {
        marketplace.is_active = active;
    }
}
