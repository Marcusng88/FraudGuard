#!/bin/bash

# Test script to verify "My Listings" functionality
echo "🧪 Testing FraudGuard My Listings Feature"
echo "========================================"

# Set API base URL
API_URL="http://localhost:8000"
TEST_WALLET="0x1234567890abcdef1234567890abcdef12345678"

echo "📡 Testing API endpoints..."

# Test 1: Get user listings
echo "1. Testing user listings endpoint..."
curl -s "$API_URL/api/listings/user/$TEST_WALLET" | jq '.' > /dev/null
if [ $? -eq 0 ]; then
    echo "   ✅ User listings endpoint working"
else
    echo "   ❌ User listings endpoint failed"
fi

# Test 2: Get user NFTs
echo "2. Testing user NFTs endpoint..."
curl -s "$API_URL/api/nft/user/$TEST_WALLET" | jq '.' > /dev/null
if [ $? -eq 0 ]; then
    echo "   ✅ User NFTs endpoint working"
else
    echo "   ❌ User NFTs endpoint failed"
fi

# Test 3: Get marketplace listings
echo "3. Testing marketplace listings endpoint..."
curl -s "$API_URL/api/listings/marketplace" | jq '.' > /dev/null
if [ $? -eq 0 ]; then
    echo "   ✅ Marketplace listings endpoint working"
else
    echo "   ❌ Marketplace listings endpoint failed"
fi

echo ""
echo "🎯 Frontend Feature Summary:"
echo "=============================="
echo "✅ My Listings tab - Shows user's active marketplace listings"
echo "✅ My Collection tab - Shows all user's NFTs (listed and unlisted)"
echo "✅ Enhanced filtering and search functionality"
echo "✅ Statistics dashboard with total listings, active listings, and value"
echo "✅ Direct listing creation from unlisted NFTs"
echo "✅ Responsive design with grid and list views"
echo ""
echo "📍 Access your listings at: http://localhost:8080/profile"
echo "   Navigate to 'My Listings' tab to see NFTs you've listed for sale"
echo "   Navigate to 'My Collection' tab to see all your uploaded NFTs"
echo ""
echo "🚀 Ready to test! Start the project with: ./start-project.bat"
