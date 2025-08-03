/// Fraud Flag Module for FraudGuard
/// Handles AI-powered fraud detection flags for NFTs
module fraudguard::fraud_flag {
    use sui::object;
    use sui::tx_context;
    use sui::event;
    use sui::table::{Self, Table};
    use std::string::{Self, String};
    use sui::transfer;

    // ===== Errors =====
    const ENotAuthorized: u64 = 0;
    const EInvalidFlagType: u64 = 1;
    const EInvalidConfidenceScore: u64 = 2;
    const EFlagNotActive: u64 = 3;
    // Remove unused error constant
    const ENotFlagOwner: u64 = 5;

    // ===== Constants =====
    const FLAG_TYPE_PLAGIARISM: u8 = 1;
    const FLAG_TYPE_SUSPICIOUS_ACTIVITY: u8 = 2;
    const FLAG_TYPE_FAKE_METADATA: u8 = 3;
    const FLAG_TYPE_PRICE_MANIPULATION: u8 = 4;
    const FLAG_TYPE_WASH_TRADING: u8 = 5;

    const MAX_CONFIDENCE_SCORE: u64 = 100;

    // ===== Structs =====

    /// Fraud flag object attached to NFTs
    public struct FraudFlag has key, store {
        id: UID,
        nft_id: ID,
        flag_type: u8,
        confidence_score: u64, // 0-100
        reason: String,
        evidence_url: String, // Optional URL to evidence
        flagged_by: address, // AI agent or admin address
        flagged_at: u64,
        is_active: bool,
        review_count: u64, // Number of times reviewed
    }

    /// Capability for AI agents to create fraud flags
    public struct FraudAgentCap has key, store {
        id: UID,
        agent_address: address,
        is_active: bool,
        flags_created: u64,
    }

    /// Registry to track fraud flags for NFTs
    public struct FraudRegistry has key {
        id: UID,
        admin: address,
        nft_flags: Table<ID, vector<ID>>, // NFT ID -> vector of flag IDs
        total_flags: u64,
        active_flags: u64,
    }

    // ===== Events =====

    /// Emitted when a fraud flag is created
    public struct FraudFlagCreated has copy, drop {
        flag_id: ID,
        nft_id: ID,
        flag_type: u8,
        confidence_score: u64,
        flagged_by: address,
        reason: String,
    }

    /// Emitted when a fraud flag is deactivated
    public struct FraudFlagDeactivated has copy, drop {
        flag_id: ID,
        nft_id: ID,
        deactivated_by: address,
        reason: String,
    }

    /// Emitted when fraud flag is updated
    public struct FraudFlagUpdated has copy, drop {
        flag_id: ID,
        nft_id: ID,
        updated_by: address,
        new_confidence_score: u64,
    }

    /// Emitted when agent capability is created
    public struct AgentCapCreated has copy, drop {
        agent_address: address,
        cap_id: ID,
    }

    // ===== Public Entry Functions =====

    /// Initialize fraud registry (called once)
    public entry fun init_registry(ctx: &mut TxContext) {
        let registry = FraudRegistry {
            id: object::new(ctx),
            admin: tx_context::sender(ctx),
            nft_flags: table::new(ctx),
            total_flags: 0,
            active_flags: 0,
        };

        transfer::share_object(registry);
    }

    /// Create agent capability for AI fraud detection
    public entry fun create_agent_cap(
        registry: &FraudRegistry,
        agent_address: address,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == registry.admin, ENotAuthorized);

        let cap_id = object::new(ctx);
        let cap_id_copy = object::uid_to_inner(&cap_id);

        let agent_cap = FraudAgentCap {
            id: cap_id,
            agent_address,
            is_active: true,
            flags_created: 0,
        };

        // Emit event
        event::emit(AgentCapCreated {
            agent_address,
            cap_id: cap_id_copy,
        });

        transfer::transfer(agent_cap, agent_address);
    }

    /// Create a fraud flag (AI agent or admin only)
    public entry fun create_fraud_flag(
        registry: &mut FraudRegistry,
        agent_cap: &mut FraudAgentCap,
        nft_id: ID,
        flag_type: u8,
        confidence_score: u64,
        reason: vector<u8>,
        evidence_url: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Verify authorization
        assert!(agent_cap.agent_address == sender && agent_cap.is_active, ENotAuthorized);
        
        // Validate inputs
        assert!(flag_type >= 1 && flag_type <= 5, EInvalidFlagType);
        assert!(confidence_score <= MAX_CONFIDENCE_SCORE, EInvalidConfidenceScore);

        let flag_id = object::new(ctx);
        let flag_id_copy = object::uid_to_inner(&flag_id);

        let fraud_flag = FraudFlag {
            id: flag_id,
            nft_id,
            flag_type,
            confidence_score,
            reason: string::utf8(reason),
            evidence_url: string::utf8(evidence_url),
            flagged_by: sender,
            flagged_at: tx_context::epoch_timestamp_ms(ctx),
            is_active: true,
            review_count: 0,
        };

        // Update registry
        if (table::contains(&registry.nft_flags, nft_id)) {
            let flags = table::borrow_mut(&mut registry.nft_flags, nft_id);
            vector::push_back(flags, flag_id_copy);
        } else {
            let mut new_flags = vector::empty<ID>();
            vector::push_back(&mut new_flags, flag_id_copy);
            table::add(&mut registry.nft_flags, nft_id, new_flags);
        };

        registry.total_flags = registry.total_flags + 1;
        registry.active_flags = registry.active_flags + 1;
        agent_cap.flags_created = agent_cap.flags_created + 1;

        // Emit event
        event::emit(FraudFlagCreated {
            flag_id: flag_id_copy,
            nft_id,
            flag_type,
            confidence_score,
            flagged_by: sender,
            reason: fraud_flag.reason,
        });

        transfer::share_object(fraud_flag);
    }

    /// Deactivate a fraud flag (admin or flag creator only)
    public entry fun deactivate_fraud_flag(
        registry: &mut FraudRegistry,
        flag: &mut FraudFlag,
        reason: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(
            sender == registry.admin || sender == flag.flagged_by,
            ENotAuthorized
        );
        assert!(flag.is_active, EFlagNotActive);

        flag.is_active = false;
        registry.active_flags = registry.active_flags - 1;

        // Emit event
        event::emit(FraudFlagDeactivated {
            flag_id: object::id(flag),
            nft_id: flag.nft_id,
            deactivated_by: sender,
            reason: string::utf8(reason),
        });
    }

    /// Update fraud flag confidence score (AI agent only)
    public entry fun update_fraud_score(
        flag: &mut FraudFlag,
        agent_cap: &FraudAgentCap,
        new_confidence_score: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(agent_cap.agent_address == sender && agent_cap.is_active, ENotAuthorized);
        assert!(flag.flagged_by == sender, ENotFlagOwner);
        assert!(new_confidence_score <= MAX_CONFIDENCE_SCORE, EInvalidConfidenceScore);
        assert!(flag.is_active, EFlagNotActive);

        flag.confidence_score = new_confidence_score;
        flag.review_count = flag.review_count + 1;

        // Emit event
        event::emit(FraudFlagUpdated {
            flag_id: object::id(flag),
            nft_id: flag.nft_id,
            updated_by: sender,
            new_confidence_score,
        });
    }

    /// Deactivate agent capability (admin only)
    public entry fun deactivate_agent(
        registry: &FraudRegistry,
        agent_cap: &mut FraudAgentCap,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == registry.admin, ENotAuthorized);
        agent_cap.is_active = false;
    }

    // ===== Public View Functions =====

    /// Get fraud flag info
    public fun get_fraud_flag_info(flag: &FraudFlag): (ID, u8, u64, String, address, u64, bool) {
        (
            flag.nft_id,
            flag.flag_type,
            flag.confidence_score,
            flag.reason,
            flag.flagged_by,
            flag.flagged_at,
            flag.is_active
        )
    }

    /// Get fraud flags for an NFT
    public fun get_fraud_flags_for_nft(registry: &FraudRegistry, nft_id: ID): vector<ID> {
        if (table::contains(&registry.nft_flags, nft_id)) {
            *table::borrow(&registry.nft_flags, nft_id)
        } else {
            vector::empty<ID>()
        }
    }

    /// Check if NFT is flagged
    public fun is_nft_flagged(registry: &FraudRegistry, nft_id: ID): bool {
        table::contains(&registry.nft_flags, nft_id)
    }

    /// Get registry stats
    public fun get_registry_stats(registry: &FraudRegistry): (u64, u64) {
        (registry.total_flags, registry.active_flags)
    }

    /// Get agent capability info
    public fun get_agent_info(agent_cap: &FraudAgentCap): (address, bool, u64) {
        (agent_cap.agent_address, agent_cap.is_active, agent_cap.flags_created)
    }

    /// Get flag type name
    public fun get_flag_type_name(flag_type: u8): String {
        if (flag_type == FLAG_TYPE_PLAGIARISM) {
            string::utf8(b"Plagiarism")
        } else if (flag_type == FLAG_TYPE_SUSPICIOUS_ACTIVITY) {
            string::utf8(b"Suspicious Activity")
        } else if (flag_type == FLAG_TYPE_FAKE_METADATA) {
            string::utf8(b"Fake Metadata")
        } else if (flag_type == FLAG_TYPE_PRICE_MANIPULATION) {
            string::utf8(b"Price Manipulation")
        } else if (flag_type == FLAG_TYPE_WASH_TRADING) {
            string::utf8(b"Wash Trading")
        } else {
            string::utf8(b"Unknown")
        }
    }
}
