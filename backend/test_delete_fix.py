#!/usr/bin/env python3
"""
Simple test script to verify the listing deletion fix works
"""

import requests
import json
from uuid import UUID

# Test configuration
BASE_URL = "http://127.0.0.1:8000"
LISTING_API = f"{BASE_URL}/api/listings"

def test_delete_endpoint():
    """Test that the delete endpoint works without foreign key violations"""
    
    print("Testing listing deletion fix...")
    
    # First, get all listings to find one to delete
    print("1. Getting current listings...")
    response = requests.get(f"{LISTING_API}/debug/all")
    
    if response.status_code != 200:
        print(f"Failed to get listings: {response.status_code} - {response.text}")
        return False
    
    listings = response.json()
    print(f"Found {len(listings)} listings")
    
    if not listings:
        print("No listings found to test deletion")
        return True
    
    # Pick the first listing to delete
    test_listing = listings[0]
    listing_id = test_listing['id']
    print(f"2. Attempting to delete listing: {listing_id}")
    
    # Try to delete the listing
    delete_response = requests.delete(f"{LISTING_API}/{listing_id}")
    
    if delete_response.status_code == 200:
        print("✅ Listing deleted successfully!")
        
        # Verify the listing is marked as deleted (soft delete)
        print("3. Verifying listing is soft-deleted...")
        get_response = requests.get(f"{LISTING_API}/{listing_id}")
        
        if get_response.status_code == 404:
            print("✅ Listing correctly hidden from normal queries")
            
            # Try to get it with include_deleted=true
            get_deleted_response = requests.get(f"{LISTING_API}/{listing_id}?include_deleted=true")
            if get_deleted_response.status_code == 200:
                listing_data = get_deleted_response.json()
                if listing_data.get('status') == 'deleted':
                    print("✅ Listing correctly marked as deleted in database")
                    return True
                else:
                    print(f"❌ Listing status is {listing_data.get('status')}, expected 'deleted'")
                    return False
            else:
                print(f"❌ Could not retrieve deleted listing: {get_deleted_response.status_code}")
                return False
        else:
            print(f"❌ Listing still accessible: {get_response.status_code}")
            return False
            
    else:
        print(f"❌ Failed to delete listing: {delete_response.status_code} - {delete_response.text}")
        return False

if __name__ == "__main__":
    try:
        success = test_delete_endpoint()
        if success:
            print("\n🎉 All tests passed! The foreign key constraint issue is fixed.")
        else:
            print("\n❌ Tests failed. There may still be issues.")
    except Exception as e:
        print(f"\n💥 Test error: {e}")
        print("Make sure the backend server is running on http://127.0.0.1:8000")
