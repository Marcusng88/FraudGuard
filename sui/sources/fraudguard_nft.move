/// FraudGuard NFT Module
/// Handles NFT creation with Kiosk integration and fraud detection
module fraudguard::fraudguard_nft {
    use sui::object;
    use sui::tx_context;
    use sui::url::{Self, Url};
    use sui::event;
    use std::string::{Self, String};
    use sui::kiosk::{Self, Kiosk, KioskOwnerCap};
    use sui::coin::Coin;
    use sui::sui::SUI;
    use sui::transfer_policy::{Self, TransferPolicy};
    use sui::transfer;
    use sui::package;

    // ===== Errors =====
    const EEmptyName: u64 = 1;
    const EInvalidPrice: u64 = 2;

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

    // ===== Events =====

    /// Emitted when a new NFT is minted
    public struct NFTMinted has copy, drop {
        nft_id: object::ID,
        creator: address,
        name: String,
        image_url: String,
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
        
        let nft = FraudGuardNFT {
            id: nft_id,
            name: string::utf8(name),
            description: string::utf8(description),
            image_url: url::new_unsafe_from_bytes(image_url),
            creator,
            created_at: tx_context::epoch_timestamp_ms(ctx),
        };

        // Place the NFT in the kiosk
        kiosk::place(kiosk, cap, nft);

        // Emit event
        event::emit(NFTMinted {
            nft_id: nft_id_copy,
            creator,
            name: string::utf8(name),
            image_url: string::utf8(image_url),
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
        
        let nft = FraudGuardNFT {
            id: nft_id,
            name: string::utf8(name),
            description: string::utf8(description),
            image_url: url::new_unsafe_from_bytes(image_url),
            creator,
            created_at: tx_context::epoch_timestamp_ms(ctx),
        };

        // Transfer to recipient
        transfer::public_transfer(nft, recipient);

        // Emit event
        event::emit(NFTMinted {
            nft_id: nft_id_copy,
            creator,
            name: string::utf8(name),
            image_url: string::utf8(image_url),
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

    /// List an NFT for sale in a kiosk
    public entry fun list_nft(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        nft_id: object::ID,
        price: u64,
        _ctx: &mut tx_context::TxContext
    ) {
        assert!(price > 0, EInvalidPrice);
        kiosk::list<FraudGuardNFT>(kiosk, cap, nft_id, price);
    }

    /// Delist an NFT from a kiosk
    public entry fun delist_nft(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        nft_id: object::ID,
        _ctx: &mut tx_context::TxContext
    ) {
        kiosk::delist<FraudGuardNFT>(kiosk, cap, nft_id);
    }

    /// Purchase an NFT from a kiosk
    public entry fun purchase_nft(
        kiosk: &mut Kiosk,
        nft_id: object::ID,
        payment: Coin<SUI>,
        policy: &TransferPolicy<FraudGuardNFT>,
        ctx: &mut tx_context::TxContext
    ) {
        let (nft, transfer_request) = kiosk::purchase<FraudGuardNFT>(kiosk, nft_id, payment);
        let purchaser = tx_context::sender(ctx);
        
        // Confirm the transfer request with the policy
        transfer_policy::confirm_request<FraudGuardNFT>(policy, transfer_request);
        
        // Transfer the NFT to the purchaser
        transfer::public_transfer(nft, purchaser);
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
    public fun get_fraud_flag_details(flag: &FraudFlag): (ID, String, String, u64, address, u64, bool) {
        (flag.nft_id, flag.flag_type, flag.reason, flag.confidence, flag.flagged_by, flag.created_at, flag.is_active)
    }
}
