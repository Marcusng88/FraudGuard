/// NFT Module for FraudGuard Marketplace
/// Handles NFT creation, management, and metadata
module fraudguard::nft {
    use sui::object;
    use sui::tx_context;
    use sui::url::{Self, Url};
    use sui::event;
    use std::string::{Self, String};
    use sui::transfer;

    // ===== Errors =====
    const ENotOwner: u64 = 0;
    const EInvalidMetadata: u64 = 1;
    const EEmptyName: u64 = 2;

    // ===== Structs =====

    /// Main NFT object that represents a digital asset
    public struct NFT has key, store {
        id: object::UID,
        name: String,
        description: String,
        image_url: Url,
        creator: address,
        created_at: u64,
        metadata: vector<u8>, // JSON metadata as bytes
        collection: String,   // Optional collection name
    }

    /// Capability object for minting NFTs (can be transferred to others)
    public struct NFTMintCap has key, store {
        id: object::UID,
        collection_name: String,
        max_supply: u64,
        current_supply: u64,
    }

    // ===== Events =====

    /// Emitted when a new NFT is minted
    public struct NFTMinted has copy, drop {
        nft_id: object::ID,
        creator: address,
        name: String,
        image_url: String,
        collection: String,
    }

    /// Emitted when NFT is transferred
    public struct NFTTransferred has copy, drop {
        nft_id: object::ID,
        from: address,
        to: address,
    }

    /// Emitted when NFT metadata is updated
    public struct NFTMetadataUpdated has copy, drop {
        nft_id: object::ID,
        updated_by: address,
    }

    // ===== Public Entry Functions =====

    /// Create a new mint capability for a collection
    public entry fun create_mint_cap(
        collection_name: vector<u8>,
        max_supply: u64,
        ctx: &mut tx_context::TxContext
    ) {
        let mint_cap = NFTMintCap {
            id: object::new(ctx),
            collection_name: string::utf8(collection_name),
            max_supply,
            current_supply: 0,
        };

        transfer::transfer(mint_cap, tx_context::sender(ctx));
    }

    /// Mint a new NFT
    public entry fun mint_nft(
        mint_cap: &mut NFTMintCap,
        name: vector<u8>,
        description: vector<u8>,
        image_url: vector<u8>,
        metadata: vector<u8>,
        recipient: address,
        ctx: &mut tx_context::TxContext
    ) {
        // Validate inputs
        assert!(!std::vector::is_empty(&name), EEmptyName);
        assert!(mint_cap.current_supply < mint_cap.max_supply, EInvalidMetadata);

        let nft_id = object::new(ctx);
        let nft_id_copy = object::uid_to_inner(&nft_id);

        let nft = NFT {
            id: nft_id,
            name: string::utf8(name),
            description: string::utf8(description),
            image_url: url::new_unsafe_from_bytes(image_url),
            creator: tx_context::sender(ctx),
            created_at: tx_context::epoch_timestamp_ms(ctx),
            metadata,
            collection: mint_cap.collection_name,
        };

        // Update mint cap supply
        mint_cap.current_supply = mint_cap.current_supply + 1;

        // Emit event
        event::emit(NFTMinted {
            nft_id: nft_id_copy,
            creator: tx_context::sender(ctx),
            name: nft.name,
            image_url: string::utf8(image_url),
            collection: nft.collection,
        });

        // Transfer NFT to recipient
        transfer::transfer(nft, recipient);
    }

    /// Simple mint function without mint cap (for hackathon ease)
    public entry fun mint_simple(
        name: vector<u8>,
        description: vector<u8>,
        image_url: vector<u8>,
        metadata: vector<u8>,
        ctx: &mut tx_context::TxContext
    ) {
        // Validate inputs
        assert!(!std::vector::is_empty(&name), EEmptyName);

        let nft_id = object::new(ctx);
        let nft_id_copy = object::uid_to_inner(&nft_id);
        let sender = tx_context::sender(ctx);

        let nft = NFT {
            id: nft_id,
            name: string::utf8(name),
            description: string::utf8(description),
            image_url: url::new_unsafe_from_bytes(image_url),
            creator: sender,
            created_at: tx_context::epoch_timestamp_ms(ctx),
            metadata,
            collection: string::utf8(b"Default"),
        };

        // Emit event
        event::emit(NFTMinted {
            nft_id: nft_id_copy,
            creator: sender,
            name: nft.name,
            image_url: string::utf8(image_url),
            collection: nft.collection,
        });

        // Transfer NFT to sender
        transfer::transfer(nft, sender);
    }

    /// Transfer NFT to another address
    #[allow(lint(custom_state_change))]
    public entry fun transfer_nft(
        nft: NFT,
        recipient: address,
        ctx: &mut tx_context::TxContext
    ) {
        let nft_id = object::id(&nft);
        let sender = tx_context::sender(ctx);

        // Emit transfer event
        event::emit(NFTTransferred {
            nft_id,
            from: sender,
            to: recipient,
        });

        transfer::transfer(nft, recipient);
    }

    /// Update NFT metadata (only creator can update)
    public entry fun update_metadata(
        nft: &mut NFT,
        new_metadata: vector<u8>,
        ctx: &mut tx_context::TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(nft.creator == sender, ENotOwner);

        nft.metadata = new_metadata;

        // Emit update event
        event::emit(NFTMetadataUpdated {
            nft_id: object::id(nft),
            updated_by: sender,
        });
    }

    // ===== Public View Functions =====

    /// Get NFT basic information
    public fun get_nft_info(nft: &NFT): (String, String, Url, String) {
        (nft.name, nft.description, nft.image_url, nft.collection)
    }

    /// Get NFT creator
    public fun get_creator(nft: &NFT): address {
        nft.creator
    }

    /// Get NFT creation timestamp
    public fun get_created_at(nft: &NFT): u64 {
        nft.created_at
    }

    /// Get NFT metadata
    public fun get_metadata(nft: &NFT): vector<u8> {
        nft.metadata
    }

    /// Get NFT ID
    public fun get_nft_id(nft: &NFT): object::ID {
        object::id(nft)
    }

    /// Get mint cap info
    public fun get_mint_cap_info(mint_cap: &NFTMintCap): (String, u64, u64) {
        (mint_cap.collection_name, mint_cap.max_supply, mint_cap.current_supply)
    }

    /// Check if mint cap can mint more NFTs
    public fun can_mint(mint_cap: &NFTMintCap): bool {
        mint_cap.current_supply < mint_cap.max_supply
    }

    // ===== Test Functions =====

    #[test_only]
    public fun test_mint_nft(ctx: &mut tx_context::TxContext): NFT {
        let nft_id = object::new(ctx);
        NFT {
            id: nft_id,
            name: string::utf8(b"Test NFT"),
            description: string::utf8(b"Test Description"),
            image_url: url::new_unsafe_from_bytes(b"https://test.com/image.png"),
            creator: tx_context::sender(ctx),
            created_at: 0,
            metadata: b"{}",
            collection: string::utf8(b"Test Collection"),
        }
    }
}


