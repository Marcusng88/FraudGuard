#[test_only]
module fraudguard::nft_tests {
    use fraudguard::nft;
    use sui::test_scenario;
    use std::string;

    const ADMIN: address = @0xA11CE;
    const USER1: address = @0xB0B;
    const USER2: address = @0xCAFE;

    #[test]
    fun test_mint_simple_nft() {
        let mut scenario = test_scenario::begin(ADMIN);
        let ctx = test_scenario::ctx(&mut scenario);

        // Mint NFT
        nft::mint_simple(
            b"Test NFT",
            b"A test NFT for hackathon",
            b"https://example.com/test.png",
            b"{}",
            ctx
        );

        test_scenario::end(scenario);
    }

    #[test]
    fun test_create_mint_cap() {
        let mut scenario = test_scenario::begin(ADMIN);
        let ctx = test_scenario::ctx(&mut scenario);

        // Create mint capability
        nft::create_mint_cap(
            b"Test Collection",
            100, // max supply
            ctx
        );

        test_scenario::end(scenario);
    }

    #[test]
    fun test_mint_with_cap() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Create mint cap
        {
            let ctx = test_scenario::ctx(&mut scenario);
            nft::create_mint_cap(b"Test Collection", 100, ctx);
        };

        // Get mint cap and mint NFT
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut mint_cap = test_scenario::take_from_sender<nft::NFTMintCap>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);

            nft::mint_nft(
                &mut mint_cap,
                b"Test NFT",
                b"Test Description",
                b"https://example.com/test.png",
                b"{}",
                USER1,
                ctx
            );

            test_scenario::return_to_sender(&scenario, mint_cap);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_transfer_nft() {
        let mut scenario = test_scenario::begin(USER1);
        
        // Mint NFT to USER1
        {
            let ctx = test_scenario::ctx(&mut scenario);
            nft::mint_simple(
                b"Transfer Test NFT",
                b"NFT for transfer testing",
                b"https://example.com/transfer.png",
                b"{}",
                ctx
            );
        };

        // Transfer NFT from USER1 to USER2
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let nft = test_scenario::take_from_sender<nft::NFT>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);

            nft::transfer_nft(nft, USER2, ctx);
        };

        // Verify USER2 received the NFT
        test_scenario::next_tx(&mut scenario, USER2);
        {
            assert!(test_scenario::has_most_recent_for_sender<nft::NFT>(&scenario), 0);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_nft_metadata() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Mint NFT
        {
            let ctx = test_scenario::ctx(&mut scenario);
            nft::mint_simple(
                b"Metadata Test NFT",
                b"NFT for metadata testing",
                b"https://example.com/metadata.png",
                b"{\"trait\": \"rare\"}",
                ctx
            );
        };

        // Check NFT metadata
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let nft = test_scenario::take_from_sender<nft::NFT>(&scenario);
            
            let (name, description, _url, collection) = nft::get_nft_info(&nft);
            assert!(name == string::utf8(b"Metadata Test NFT"), 0);
            assert!(description == string::utf8(b"NFT for metadata testing"), 1);
            assert!(collection == string::utf8(b"Default"), 2);
            
            let creator = nft::get_creator(&nft);
            assert!(creator == ADMIN, 3);
            
            let metadata = nft::get_metadata(&nft);
            assert!(metadata == b"{\"trait\": \"rare\"}", 4);

            test_scenario::return_to_sender(&scenario, nft);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_update_metadata() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Mint NFT
        {
            let ctx = test_scenario::ctx(&mut scenario);
            nft::mint_simple(
                b"Update Test NFT",
                b"NFT for update testing",
                b"https://example.com/update.png",
                b"{\"version\": 1}",
                ctx
            );
        };

        // Update metadata
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut nft = test_scenario::take_from_sender<nft::NFT>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);

            nft::update_metadata(&mut nft, b"{\"version\": 2}", ctx);
            
            let metadata = nft::get_metadata(&nft);
            assert!(metadata == b"{\"version\": 2}", 0);

            test_scenario::return_to_sender(&scenario, nft);
        };

        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = nft::ENotOwner)]
    fun test_update_metadata_not_owner() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Mint NFT as ADMIN
        {
            let ctx = test_scenario::ctx(&mut scenario);
            nft::mint_simple(
                b"Owner Test NFT",
                b"NFT for owner testing",
                b"https://example.com/owner.png",
                b"{}",
                ctx
            );
        };

        // Try to update metadata as USER1 (should fail)
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let mut nft = test_scenario::take_from_address<nft::NFT>(&scenario, ADMIN);
            let ctx = test_scenario::ctx(&mut scenario);

            nft::update_metadata(&mut nft, b"{\"hacked\": true}", ctx);

            test_scenario::return_to_sender(&scenario, nft);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_mint_cap_supply_limit() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Create mint cap with supply of 1
        {
            let ctx = test_scenario::ctx(&mut scenario);
            nft::create_mint_cap(b"Limited Collection", 1, ctx);
        };

        // Mint first NFT (should succeed)
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut mint_cap = test_scenario::take_from_sender<nft::NFTMintCap>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);

            assert!(nft::can_mint(&mint_cap), 0);

            nft::mint_nft(
                &mut mint_cap,
                b"First NFT",
                b"First NFT in limited collection",
                b"https://example.com/first.png",
                b"{}",
                USER1,
                ctx
            );

            assert!(!nft::can_mint(&mint_cap), 1);

            test_scenario::return_to_sender(&scenario, mint_cap);
        };

        test_scenario::end(scenario);
    }
}
