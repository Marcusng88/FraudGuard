/// Escrow-based Marketplace Module for FraudGuard
/// NFTs are held in escrow by the marketplace when listed
module fraudguard::escrow_marketplace {
    use sui::transfer;
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use sui::table::{Self, Table};
    use sui::dynamic_field as df;
    use fraudguard::fraudguard_nft::{Self, FraudGuardNFT};

    // Error codes
    const ENotListed: u64 = 1;
    const EAlreadyListed: u64 = 2;
    const EInvalidOwner: u64 = 3;
    const EInsufficientPayment: u64 = 4;
    const EListingNotFound: u64 = 5;
    const EInvalidSeller: u64 = 6;
    const EInvalidPrice: u64 = 7;

    // Marketplace fee (0.25%)
    const MARKETPLACE_FEE_BASIS_POINTS: u64 = 25;
    const FEE_DENOMINATOR: u64 = 10000;

    // Structs
    public struct EscrowMarketplace has key {
        id: UID,
        listings: Table<ID, ListingInfo>,
        admin: address,
        fee_recipient: address,
        total_volume: u64,
        total_listings: u64,
        is_active: bool,
    }

    public struct ListingInfo has store {
        nft_id: ID,
        seller: address,
        price: u64,
        created_at: u64,
        is_active: bool,
    }

    public struct MarketplaceCap has key, store {
        id: UID,
    }

    // Events
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

    // Initialize marketplace
    fun init(ctx: &mut TxContext) {
        let admin = tx_context::sender(ctx);
        
        let marketplace = EscrowMarketplace {
            id: object::new(ctx),
            listings: table::new(ctx),
            admin,
            fee_recipient: admin,
            total_volume: 0,
            total_listings: 0,
            is_active: true,
        };

        let cap = MarketplaceCap {
            id: object::new(ctx),
        };

        transfer::share_object(marketplace);
        transfer::transfer(cap, admin);
    }

    // List NFT for sale (NFT goes into escrow)
    public entry fun list_nft(
        marketplace: &mut EscrowMarketplace,
        nft: FraudGuardNFT,
        price: u64,
        ctx: &mut TxContext
    ) {
        assert!(marketplace.is_active, EInvalidOwner);
        assert!(price > 0, EInvalidPrice);
        
        let sender = tx_context::sender(ctx);
        let nft_id = object::id(&nft);
        
        // Verify the sender owns the NFT
        assert!(fraudguard_nft::get_owner(&nft) == sender, EInvalidOwner);
        
        // Check if already listed
        assert!(!table::contains(&marketplace.listings, nft_id), EAlreadyListed);
        
        // Create listing info
        let listing_info = ListingInfo {
            nft_id,
            seller: sender,
            price,
            created_at: tx_context::epoch_timestamp_ms(ctx),
            is_active: true,
        };

        // Store listing info
        table::add(&mut marketplace.listings, nft_id, listing_info);
        marketplace.total_listings = marketplace.total_listings + 1;

        // Store NFT in marketplace using dynamic field (escrow)
        df::add(&mut marketplace.id, nft_id, nft);

        // Emit event
        event::emit(NFTListed {
            nft_id,
            seller: sender,
            price,
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        });
    }

    // Unlist NFT (return from escrow to owner)
    public entry fun unlist_nft(
        marketplace: &mut EscrowMarketplace,
        nft_id: ID,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Check if NFT is listed
        assert!(table::contains(&marketplace.listings, nft_id), ENotListed);
        
        let listing_info = table::borrow_mut(&mut marketplace.listings, nft_id);
        
        // Verify the sender is the seller
        assert!(listing_info.seller == sender, EInvalidSeller);
        assert!(listing_info.is_active, ENotListed);

        // Mark as inactive
        listing_info.is_active = false;

        // Remove NFT from escrow and return to seller
        let nft: FraudGuardNFT = df::remove(&mut marketplace.id, nft_id);
        transfer::public_transfer(nft, sender);

        // Remove listing info
        table::remove(&mut marketplace.listings, nft_id);

        // Emit event
        event::emit(NFTUnlisted {
            nft_id,
            seller: sender,
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        });
    }

    // Purchase NFT from marketplace escrow
    public entry fun purchase_nft(
        marketplace: &mut EscrowMarketplace,
        nft_id: ID,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        assert!(marketplace.is_active, EInvalidOwner);
        
        let buyer = tx_context::sender(ctx);
        
        // Check if NFT is listed
        assert!(table::contains(&marketplace.listings, nft_id), ENotListed);
        
        let listing_info = table::borrow(&marketplace.listings, nft_id);
        assert!(listing_info.is_active, ENotListed);
        
        let price = listing_info.price;
        let seller = listing_info.seller;
        
        // Verify payment amount
        let payment_amount = coin::value(&payment);
        assert!(payment_amount >= price, EInsufficientPayment);

        // Calculate marketplace fee
        let marketplace_fee = (price * MARKETPLACE_FEE_BASIS_POINTS) / FEE_DENOMINATOR;
        let seller_amount = price - marketplace_fee;

        // Split payment
        let mut payment = payment;
        let fee_coin = coin::split(&mut payment, marketplace_fee, ctx);
        let seller_coin = coin::split(&mut payment, seller_amount, ctx);

        // Send payments
        transfer::public_transfer(fee_coin, marketplace.fee_recipient);
        transfer::public_transfer(seller_coin, seller);
        
        // Return any excess payment to buyer
        if (coin::value(&payment) > 0) {
            transfer::public_transfer(payment, buyer);
        } else {
            coin::destroy_zero(payment);
        };

        // Remove NFT from escrow
        let mut nft: FraudGuardNFT = df::remove(&mut marketplace.id, nft_id);
        
        // Update NFT ownership and transfer to buyer
        fraudguard_nft::transfer_ownership(&mut nft, buyer);
        transfer::public_transfer(nft, buyer);

        // Remove listing
        table::remove(&mut marketplace.listings, nft_id);

        // Update marketplace stats
        marketplace.total_volume = marketplace.total_volume + price;

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

    // Update listing price
    public entry fun update_listing_price(
        marketplace: &mut EscrowMarketplace,
        nft_id: ID,
        new_price: u64,
        ctx: &mut TxContext
    ) {
        assert!(new_price > 0, EInvalidPrice);
        
        let sender = tx_context::sender(ctx);
        
        // Check if NFT is listed
        assert!(table::contains(&marketplace.listings, nft_id), ENotListed);
        
        let listing_info = table::borrow_mut(&mut marketplace.listings, nft_id);
        
        // Verify the sender is the seller
        assert!(listing_info.seller == sender, EInvalidSeller);
        assert!(listing_info.is_active, ENotListed);

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

    // View functions
    public fun is_listed(marketplace: &EscrowMarketplace, nft_id: ID): bool {
        if (!table::contains(&marketplace.listings, nft_id)) {
            return false
        };
        let listing_info = table::borrow(&marketplace.listings, nft_id);
        listing_info.is_active
    }

    public fun get_listing_info(marketplace: &EscrowMarketplace, nft_id: ID): (address, u64, u64, bool) {
        assert!(table::contains(&marketplace.listings, nft_id), ENotListed);
        let listing_info = table::borrow(&marketplace.listings, nft_id);
        (listing_info.seller, listing_info.price, listing_info.created_at, listing_info.is_active)
    }

    public fun get_marketplace_stats(marketplace: &EscrowMarketplace): (u64, u64, bool) {
        (marketplace.total_volume, marketplace.total_listings, marketplace.is_active)
    }

    public fun get_marketplace_fee(): u64 {
        MARKETPLACE_FEE_BASIS_POINTS
    }

    // Admin functions
    public entry fun update_fee_recipient(
        marketplace: &mut EscrowMarketplace,
        _cap: &MarketplaceCap,
        new_recipient: address,
    ) {
        marketplace.fee_recipient = new_recipient;
    }

    public entry fun set_marketplace_active(
        marketplace: &mut EscrowMarketplace,
        _cap: &MarketplaceCap,
        active: bool,
    ) {
        marketplace.is_active = active;
    }
}
