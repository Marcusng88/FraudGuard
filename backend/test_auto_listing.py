#!/usr/bin/env python3
"""
Test script to verify auto-listing functionality works correctly
"""

import requests
import json
import time
from typing import Dict, Any

# Test configuration
BASE_URL = "http://127.0.0.1:8000"
NFT_API = f"{BASE_URL}/api/nft"
MARKETPLACE_API = f"{BASE_URL}/api/marketplace"

def test_auto_listing():
    """Test that NFTs are automatically listed when minted"""
    
    print("🧪 Testing Auto-Listing Functionality")
    print("=" * 50)
    
    # Test wallet address
    test_wallet = "0x1234567890abcdef1234567890abcdef12345678"
    
    # 1. Create NFT record (simulating frontend NFT creation)
    print("1. Creating NFT record...")
    nft_data = {
        "title": "Test Auto-List NFT",
        "description": "Testing automatic marketplace listing",
        "category": "Art",
        "price": 1.5,
        "image_url": "https://example.com/test-image.jpg",
        "wallet_address": test_wallet,
        "sui_object_id": None
    }
    
    response = requests.post(f"{MARKETPLACE_API}/nft/create", json=nft_data)
    
    if response.status_code != 200:
        print(f"❌ Failed to create NFT: {response.status_code} - {response.text}")
        return False
    
    create_result = response.json()
    nft_id = create_result.get("nft_id")
    print(f"✅ NFT created with ID: {nft_id}")
    print(f"   Message: {create_result.get('message')}")
    print(f"   Auto-list enabled: {create_result.get('auto_list_enabled')}")
    
    # 2. Simulate minting confirmation (what happens after blockchain mint)
    print("\n2. Confirming NFT mint (simulating blockchain confirmation)...")
    sui_object_id = "0xabcdef1234567890abcdef1234567890abcdef12"
    
    response = requests.put(f"{NFT_API}/{nft_id}/confirm-mint", params={"sui_object_id": sui_object_id})
    
    if response.status_code != 200:
        print(f"❌ Failed to confirm mint: {response.status_code} - {response.text}")
        return False
    
    confirm_result = response.json()
    print(f"✅ NFT mint confirmed")
    print(f"   Message: {confirm_result.get('message')}")
    print(f"   Auto-listed: {confirm_result.get('is_listed')}")
    
    # 3. Check if NFT appears in marketplace
    print("\n3. Checking if NFT appears in marketplace...")
    time.sleep(1)  # Give database a moment to sync
    
    response = requests.get(f"{MARKETPLACE_API}/nfts", params={"limit": 50})
    
    if response.status_code != 200:
        print(f"❌ Failed to get marketplace NFTs: {response.status_code} - {response.text}")
        return False
    
    marketplace_result = response.json()
    marketplace_nfts = marketplace_result.get("nfts", [])
    
    # Look for our NFT in the marketplace
    our_nft = None
    for nft in marketplace_nfts:
        if nft.get("id") == nft_id:
            our_nft = nft
            break
    
    if our_nft:
        print(f"✅ NFT found in marketplace!")
        print(f"   Title: {our_nft.get('title')}")
        print(f"   Price: {our_nft.get('price')} SUI")
        print(f"   Status: {our_nft.get('status')}")
    else:
        print(f"❌ NFT not found in marketplace")
        print(f"   Total NFTs in marketplace: {len(marketplace_nfts)}")
        return False
    
    # 4. Verify NFT is marked as listed in database
    print("\n4. Verifying NFT listing status...")
    response = requests.get(f"{NFT_API}/user/{test_wallet}")
    
    if response.status_code != 200:
        print(f"❌ Failed to get user NFTs: {response.status_code} - {response.text}")
        return False
    
    user_nfts = response.json()
    our_user_nft = None
    for nft in user_nfts:
        if nft.get("id") == nft_id:
            our_user_nft = nft
            break
    
    if our_user_nft and our_user_nft.get("is_listed"):
        print(f"✅ NFT correctly marked as listed in database")
        print(f"   is_listed: {our_user_nft.get('is_listed')}")
        print(f"   listing_status: {our_user_nft.get('listing_status', 'N/A')}")
    else:
        print(f"❌ NFT not properly marked as listed")
        print(f"   Found NFT: {our_user_nft is not None}")
        print(f"   is_listed: {our_user_nft.get('is_listed') if our_user_nft else 'N/A'}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 All tests passed! Auto-listing is working correctly.")
    print("✅ NFTs are automatically listed in marketplace when minted")
    return True

def cleanup_test_data():
    """Clean up test data if needed"""
    print("\n🧹 Cleaning up test data...")
    # Note: In a real implementation, you might want to add cleanup endpoints
    # For now, we'll leave the test data as it demonstrates the functionality
    print("   Test data left for manual verification")

if __name__ == "__main__":
    try:
        success = test_auto_listing()
        if success:
            print("\n✅ Auto-listing test completed successfully!")
        else:
            print("\n❌ Auto-listing test failed!")
            exit(1)
    except Exception as e:
        print(f"\n💥 Test failed with exception: {e}")
        exit(1)
    finally:
        cleanup_test_data()
