#[test_only]
module fraudguard::kiosk_tests {
    use sui::test_scenario::{Self as test, Scenario};
    use fraudguard::fraudguard_nft::{Self, FraudGuardNFT, ListingMetadata};
    use sui::kiosk::{Self, Kiosk, KioskOwnerCap};
    use sui::object;
    use sui::tx_context;
    use sui::transfer_policy::{Self, TransferPolicy};
    use sui::package;
    use fraudguard::marketplace::{Self, Marketplace, Listing, ListingMetadata as MarketplaceListingMetadata};

    const USER: address = @0xA1;
    const ADMIN: address = @0xB1;

    #[test]
    fun test_create_kiosk_if_not_exists() {
        let scenario = test::begin(USER);
        
        // Test kiosk creation
        test::next_tx(&mut scenario, USER);
        {
            fraudguard_nft::create_kiosk_if_not_exists(test::ctx(&mut scenario));
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_list_nft() {
        let scenario = test::begin(USER);
        
        // Create kiosk
        test::next_tx(&mut scenario, USER);
        {
            fraudguard_nft::create_kiosk_if_not_exists(test::ctx(&mut scenario));
        };
        
        // Mint NFT to kiosk
        test::next_tx(&mut scenario, USER);
        {
            let kiosk = test::take_from_sender<Kiosk>(&scenario);
            let cap = test::take_from_sender<KioskOwnerCap>(&scenario);
            
            fraudguard_nft::mint_to_kiosk(
                &mut kiosk,
                &cap,
                b"Test NFT",
                b"Test Description",
                b"https://example.com/image.jpg",
                test::ctx(&mut scenario)
            );
            
            test::return_to_sender(&scenario, kiosk);
            test::return_to_sender(&scenario, cap);
        };
        
        // List NFT
        test::next_tx(&mut scenario, USER);
        {
            let kiosk = test::take_from_sender<Kiosk>(&scenario);
            let cap = test::take_from_sender<KioskOwnerCap>(&scenario);
            
            fraudguard_nft::list_nft(
                &mut kiosk,
                &cap,
                object::id_from_address(USER), // Mock NFT ID
                1000, // Price
                test::ctx(&mut scenario)
            );
            
            test::return_to_sender(&scenario, kiosk);
            test::return_to_sender(&scenario, cap);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_delist_nft() {
        let scenario = test::begin(USER);
        
        // Create kiosk and list NFT (setup)
        test::next_tx(&mut scenario, USER);
        {
            fraudguard_nft::create_kiosk_if_not_exists(test::ctx(&mut scenario));
        };
        
        test::next_tx(&mut scenario, USER);
        {
            let kiosk = test::take_from_sender<Kiosk>(&scenario);
            let cap = test::take_from_sender<KioskOwnerCap>(&scenario);
            
            fraudguard_nft::mint_to_kiosk(
                &mut kiosk,
                &cap,
                b"Test NFT",
                b"Test Description",
                b"https://example.com/image.jpg",
                test::ctx(&mut scenario)
            );
            
            fraudguard_nft::list_nft(
                &mut kiosk,
                &cap,
                object::id_from_address(USER),
                1000,
                test::ctx(&mut scenario)
            );
            
            test::return_to_sender(&scenario, kiosk);
            test::return_to_sender(&scenario, cap);
        };
        
        // Delist NFT
        test::next_tx(&mut scenario, USER);
        {
            let kiosk = test::take_from_sender<Kiosk>(&scenario);
            let cap = test::take_from_sender<KioskOwnerCap>(&scenario);
            
            fraudguard_nft::delist_nft(
                &mut kiosk,
                &cap,
                object::id_from_address(USER),
                test::ctx(&mut scenario)
            );
            
            test::return_to_sender(&scenario, kiosk);
            test::return_to_sender(&scenario, cap);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_update_listing_price() {
        let scenario = test::begin(USER);
        
        // Setup: Create kiosk and list NFT
        test::next_tx(&mut scenario, USER);
        {
            fraudguard_nft::create_kiosk_if_not_exists(test::ctx(&mut scenario));
        };
        
        test::next_tx(&mut scenario, USER);
        {
            let kiosk = test::take_from_sender<Kiosk>(&scenario);
            let cap = test::take_from_sender<KioskOwnerCap>(&scenario);
            
            fraudguard_nft::mint_to_kiosk(
                &mut kiosk,
                &cap,
                b"Test NFT",
                b"Test Description",
                b"https://example.com/image.jpg",
                test::ctx(&mut scenario)
            );
            
            fraudguard_nft::list_nft(
                &mut kiosk,
                &cap,
                object::id_from_address(USER),
                1000,
                test::ctx(&mut scenario)
            );
            
            test::return_to_sender(&scenario, kiosk);
            test::return_to_sender(&scenario, cap);
        };
        
        // Update listing price
        test::next_tx(&mut scenario, USER);
        {
            let kiosk = test::take_from_sender<Kiosk>(&scenario);
            let cap = test::take_from_sender<KioskOwnerCap>(&scenario);
            
            fraudguard_nft::update_listing_price(
                &mut kiosk,
                &cap,
                object::id_from_address(USER),
                1500, // New price
                test::ctx(&mut scenario)
            );
            
            test::return_to_sender(&scenario, kiosk);
            test::return_to_sender(&scenario, cap);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_create_listing_metadata() {
        let scenario = test::begin(USER);
        
        test::next_tx(&mut scenario, USER);
        {
            let nft_id = object::id_from_address(USER);
            let title = b"Amazing NFT";
            let description = b"This is an amazing NFT";
            let category = b"Art";
            let tags = vector[b"art", b"digital", b"unique"];
            
            fraudguard_nft::create_listing_metadata(
                nft_id,
                title,
                description,
                category,
                tags,
                test::ctx(&mut scenario)
            );
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_update_listing_metadata() {
        let scenario = test::begin(USER);
        
        // Create initial metadata
        test::next_tx(&mut scenario, USER);
        {
            let nft_id = object::id_from_address(USER);
            let title = b"Amazing NFT";
            let description = b"This is an amazing NFT";
            let category = b"Art";
            let tags = vector[b"art", b"digital"];
            
            fraudguard_nft::create_listing_metadata(
                nft_id,
                title,
                description,
                category,
                tags,
                test::ctx(&mut scenario)
            );
        };
        
        // Update metadata
        test::next_tx(&mut scenario, USER);
        {
            let metadata = test::take_shared<ListingMetadata>(&scenario);
            
            fraudguard_nft::update_listing_metadata(
                &mut metadata,
                b"Updated Amazing NFT",
                b"This is an updated amazing NFT",
                b"Digital Art",
                vector[b"art", b"digital", b"updated"],
                test::ctx(&mut scenario)
            );
            
            test::return_to_sender(&scenario, metadata);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_batch_list_nfts() {
        let scenario = test::begin(USER);
        
        // Create kiosk
        test::next_tx(&mut scenario, USER);
        {
            fraudguard_nft::create_kiosk_if_not_exists(test::ctx(&mut scenario));
        };
        
        // Batch list NFTs
        test::next_tx(&mut scenario, USER);
        {
            let kiosk = test::take_from_sender<Kiosk>(&scenario);
            let cap = test::take_from_sender<KioskOwnerCap>(&scenario);
            
            let nft_ids = vector[object::id_from_address(USER), object::id_from_address(ADMIN)];
            let prices = vector[1000, 2000];
            
            fraudguard_nft::batch_list_nfts(
                &mut kiosk,
                &cap,
                nft_ids,
                prices,
                test::ctx(&mut scenario)
            );
            
            test::return_to_sender(&scenario, kiosk);
            test::return_to_sender(&scenario, cap);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_marketplace_listing() {
        let scenario = test::begin(USER);
        
        // Create marketplace
        test::next_tx(&mut scenario, USER);
        {
            marketplace::create_marketplace(250, test::ctx(&mut scenario)); // 2.5% fee
        };
        
        // List NFT on marketplace
        test::next_tx(&mut scenario, USER);
        {
            let marketplace = test::take_shared<Marketplace>(&scenario);
            let nft = fraudguard_nft::mint_nft(
                b"Marketplace NFT",
                b"Test marketplace listing",
                b"https://example.com/marketplace.jpg",
                USER,
                test::ctx(&mut scenario)
            );
            
            marketplace::list_nft(
                &mut marketplace,
                nft,
                1000,
                b"Marketplace NFT",
                b"Test marketplace listing",
                b"Art",
                vector[b"marketplace", b"test"],
                test::ctx(&mut scenario)
            );
            
            test::return_to_sender(&scenario, marketplace);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_marketplace_batch_listing() {
        let scenario = test::begin(USER);
        
        // Create marketplace
        test::next_tx(&mut scenario, USER);
        {
            marketplace::create_marketplace(250, test::ctx(&mut scenario));
        };
        
        // Batch list NFTs on marketplace
        test::next_tx(&mut scenario, USER);
        {
            let marketplace = test::take_shared<Marketplace>(&scenario);
            
            let nfts = vector[
                fraudguard_nft::mint_nft(b"NFT 1", b"First NFT", b"https://example.com/1.jpg", USER, test::ctx(&mut scenario)),
                fraudguard_nft::mint_nft(b"NFT 2", b"Second NFT", b"https://example.com/2.jpg", USER, test::ctx(&mut scenario))
            ];
            let prices = vector[1000, 2000];
            let titles = vector[b"NFT 1", b"NFT 2"];
            let descriptions = vector[b"First NFT", b"Second NFT"];
            let categories = vector[b"Art", b"Digital"];
            let tags_list = vector[
                vector[b"art", b"first"],
                vector[b"digital", b"second"]
            ];
            
            marketplace::batch_list_nfts(
                &mut marketplace,
                nfts,
                prices,
                titles,
                descriptions,
                categories,
                tags_list,
                test::ctx(&mut scenario)
            );
            
            test::return_to_sender(&scenario, marketplace);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_marketplace_update_price() {
        let scenario = test::begin(USER);
        
        // Create marketplace and listing
        test::next_tx(&mut scenario, USER);
        {
            marketplace::create_marketplace(250, test::ctx(&mut scenario));
        };
        
        test::next_tx(&mut scenario, USER);
        {
            let marketplace = test::take_shared<Marketplace>(&scenario);
            let nft = fraudguard_nft::mint_nft(
                b"Price Test NFT",
                b"Test price updates",
                b"https://example.com/price.jpg",
                USER,
                test::ctx(&mut scenario)
            );
            
            marketplace::list_nft(
                &mut marketplace,
                nft,
                1000,
                b"Price Test NFT",
                b"Test price updates",
                b"Art",
                vector[b"price", b"test"],
                test::ctx(&mut scenario)
            );
            
            test::return_to_sender(&scenario, marketplace);
        };
        
        // Update listing price
        test::next_tx(&mut scenario, USER);
        {
            let listing = test::take_shared<Listing>(&scenario);
            
            marketplace::update_listing_price(
                &mut listing,
                1500, // New price
                test::ctx(&mut scenario)
            );
            
            test::return_to_sender(&scenario, listing);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_marketplace_update_metadata() {
        let scenario = test::begin(USER);
        
        // Create marketplace and listing
        test::next_tx(&mut scenario, USER);
        {
            marketplace::create_marketplace(250, test::ctx(&mut scenario));
        };
        
        test::next_tx(&mut scenario, USER);
        {
            let marketplace = test::take_shared<Marketplace>(&scenario);
            let nft = fraudguard_nft::mint_nft(
                b"Metadata Test NFT",
                b"Test metadata updates",
                b"https://example.com/metadata.jpg",
                USER,
                test::ctx(&mut scenario)
            );
            
            marketplace::list_nft(
                &mut marketplace,
                nft,
                1000,
                b"Metadata Test NFT",
                b"Test metadata updates",
                b"Art",
                vector[b"metadata", b"test"],
                test::ctx(&mut scenario)
            );
            
            test::return_to_sender(&scenario, marketplace);
        };
        
        // Update metadata
        test::next_tx(&mut scenario, USER);
        {
            let metadata = test::take_shared<MarketplaceListingMetadata>(&scenario);
            
            marketplace::update_listing_metadata(
                &mut metadata,
                b"Updated Metadata Test NFT",
                b"Updated test metadata",
                b"Digital Art",
                vector[b"updated", b"metadata", b"test"],
                test::ctx(&mut scenario)
            );
            
            test::return_to_sender(&scenario, metadata);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_get_listing_details() {
        let scenario = test::begin(USER);
        
        // Create metadata
        test::next_tx(&mut scenario, USER);
        {
            let nft_id = object::id_from_address(USER);
            let title = b"Test NFT";
            let description = b"Test description";
            let category = b"Art";
            let tags = vector[b"art", b"test"];
            
            fraudguard_nft::create_listing_metadata(
                nft_id,
                title,
                description,
                category,
                tags,
                test::ctx(&mut scenario)
            );
        };
        
        // Test getting listing details
        test::next_tx(&mut scenario, USER);
        {
            let metadata = test::take_shared<ListingMetadata>(&scenario);
            let (nft_id, title, description, category, tags, created_at, updated_at) = 
                fraudguard_nft::get_listing_details(&metadata);
            
            // Verify the details
            assert!(nft_id == object::id_from_address(USER), 0);
            assert!(title == "Test NFT", 1);
            assert!(description == "Test description", 2);
            assert!(category == "Art", 3);
            assert!(std::vector::length(&tags) == 2, 4);
            
            test::return_to_sender(&scenario, metadata);
        };
        
        test::end(scenario);
    }
} 