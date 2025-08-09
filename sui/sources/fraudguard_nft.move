/// Handles NFT creation with fraud detection
module fraudguard::fraudguard_nft {
    use std::string::{Self, String};
    use std::vector;
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::table::{Self, Table};
    use sui::vec_map::{Self, VecMap};

    // ===== Error Codes =====
    const EInvalidPrice: u64 = 1;
    const EInvalidNFTId: u64 = 2;

    // ===== NFT Struct =====
    public struct FraudGuardNFT has key, store {
        id: UID,
        name: String,
        description: String,
        image_url: String,
        creator: address,
        created_at: u64,
        fraud_score: u64,
        is_flagged: bool,
        flag_reason: String,
    }

    // ===== Fraud Flag Struct =====
    public struct FraudFlag has key, store {
        id: UID,
        nft_id: object::ID,
        flag_type: String,
        reason: String,
        confidence: u64,
        flagged_by: address,
        created_at: u64,
        is_active: bool,
    }

    // ===== Events =====
    /// Emitted when an NFT is minted
    public struct NFTMinted has copy, drop {
        nft_id: object::ID,
        name: String,
        creator: address,
        timestamp: u64,
    }

    /// Emitted when an NFT is flagged for fraud
    public struct NFTFlagged has copy, drop {
        nft_id: object::ID,
        flag_type: String,
        reason: String,
        confidence: u64,
        flagged_by: address,
        timestamp: u64,
    }

    /// Emitted when an NFT is unflag
    public struct NFTUnflagged has copy, drop {
        nft_id: object::ID,
        unflagged_by: address,
        timestamp: u64,
    }

    /// Emitted when marketplace statistics are updated
    public struct MarketplaceStatsUpdated has copy, drop {
        total_listings: u64,
        total_volume: u64,
        active_sellers: u64,
        timestamp: u64,
    }

    // ===== One-Time Witness =====
    public struct FRAUDGUARD_NFT has drop {}

    // ===== Global State =====
    public struct FraudGuardRegistry has key {
        id: UID,
        nfts: Table<object::ID, FraudGuardNFT>,
        fraud_flags: Table<object::ID, FraudFlag>,
    }

    // ===== Initialization =====
    fun init(witness: FRAUDGUARD_NFT, ctx: &mut TxContext) {
        let registry = FraudGuardRegistry {
            id: object::new(ctx),
            nfts: table::new(ctx),
            fraud_flags: table::new(ctx),
        };
        transfer::share_object(registry);
    }

    public fun create_registry(
        _witness: FRAUDGUARD_NFT,
        ctx: &mut TxContext
    ): FraudGuardRegistry {
        FraudGuardRegistry {
            id: object::new(ctx),
            nfts: table::new(ctx),
            fraud_flags: table::new(ctx),
        }
    }

    // ===== NFT Minting =====
    /// Mint a new NFT (regular minting without kiosk)
    public entry fun mint_nft_with_id(
        name: vector<u8>,
        description: vector<u8>,
        image_url: vector<u8>,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let nft = FraudGuardNFT {
            id: object::new(ctx),
            name: string::utf8(name),
            description: string::utf8(description),
            image_url: string::utf8(image_url),
            creator: tx_context::sender(ctx),
            created_at: tx_context::epoch_timestamp_ms(ctx),
            fraud_score: 0,
            is_flagged: false,
            flag_reason: string::utf8(b""),
        };

        let nft_id = object::id(&nft);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        // Transfer NFT to recipient
        transfer::public_transfer(nft, recipient);

        // Emit mint event
        event::emit(NFTMinted {
            nft_id,
            name: string::utf8(name),
            creator: tx_context::sender(ctx),
            timestamp,
        });
    }

    /// Mint a new NFT (simple minting)
    public entry fun mint_nft(
        name: vector<u8>,
        description: vector<u8>,
        image_url: vector<u8>,
        recipient: address,
        ctx: &mut TxContext
    ) {
        mint_nft_with_id(name, description, image_url, recipient, ctx);
    }

    // ===== Fraud Detection =====
    /// Flag an NFT for fraud
    public entry fun flag_nft_for_fraud(
        nft: &mut FraudGuardNFT,
        flag_type: vector<u8>,
        reason: vector<u8>,
        confidence: u64,
        ctx: &mut TxContext
    ) {
        nft.is_flagged = true;
        nft.fraud_score = confidence;
        nft.flag_reason = string::utf8(reason);

        let nft_id = object::id(nft);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        let flagged_by = tx_context::sender(ctx);

        // Emit flag event
        event::emit(NFTFlagged {
            nft_id,
            flag_type: string::utf8(flag_type),
            reason: string::utf8(reason),
            confidence,
            flagged_by,
            timestamp,
        });
    }

    /// Unflag an NFT
    public entry fun unflag_nft(
        nft: &mut FraudGuardNFT,
        ctx: &mut TxContext
    ) {
        nft.is_flagged = false;
        nft.fraud_score = 0;
        nft.flag_reason = string::utf8(b"");

        let nft_id = object::id(nft);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        let unflagged_by = tx_context::sender(ctx);

        // Emit unflag event
        event::emit(NFTUnflagged {
            nft_id,
            unflagged_by,
            timestamp,
        });
    }

    // ===== View Functions =====
    
    /// Get NFT ID
    public fun get_nft_id(nft: &FraudGuardNFT): object::ID {
        object::id(nft)
    }

    /// Get NFT details
    public fun get_nft_details(nft: &FraudGuardNFT): (object::ID, String, String, String, address, u64, u64, bool, String) {
        (
            object::id(nft),
            nft.name,
            nft.description,
            nft.image_url,
            nft.creator,
            nft.created_at,
            nft.fraud_score,
            nft.is_flagged,
            nft.flag_reason
        )
    }

    /// Get fraud flag details
    public fun get_fraud_flag_details(flag: &FraudFlag): (object::ID, String, String, u64, address, u64, bool) {
        (flag.nft_id, flag.flag_type, flag.reason, flag.confidence, flag.flagged_by, flag.created_at, flag.is_active)
    }

    /// Update marketplace statistics (Phase 1.4 - Analytics)
    public entry fun update_marketplace_stats(
        total_listings: u64,
        total_volume: u64,
        active_sellers: u64,
        ctx: &mut TxContext
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
}
