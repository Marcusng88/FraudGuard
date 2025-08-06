#!/bin/bash

# FraudGuard Contract Deployment Script
# This script deploys the FraudGuard NFT contracts to Sui testnet

echo "🚀 Starting FraudGuard contract deployment..."

# Check if sui CLI is installed
if ! command -v sui &> /dev/null; then
    echo "❌ Sui CLI is not installed. Please install it first."
    echo "Visit: https://docs.sui.io/build/install"
    exit 1
fi

# Check if we're in the sui directory
if [ ! -f "Move.toml" ]; then
    echo "❌ Move.toml not found. Please run this script from the sui directory."
    exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf build/

# Build the package
echo "🔨 Building the Move package..."
sui move build --skip-fetch-latest-git-deps

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check your Move code for errors."
    exit 1
fi

echo "✅ Build successful!"

# Check current active address
ACTIVE_ADDRESS=$(sui client active-address)
echo "📍 Active address: $ACTIVE_ADDRESS"

# Check balance
echo "💰 Checking SUI balance..."
sui client gas

# Deploy to testnet
echo "🚀 Deploying to Sui testnet..."
DEPLOY_OUTPUT=$(sui client publish --gas-budget 200000000)

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed."
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo "✅ Deployment successful!"
echo "$DEPLOY_OUTPUT"

# Extract package ID from output
PACKAGE_ID=$(echo "$DEPLOY_OUTPUT" | grep -oE "packageId.*0x[a-f0-9]+" | head -1 | grep -oE "0x[a-f0-9]+")

if [ -n "$PACKAGE_ID" ]; then
    echo ""
    echo "📦 Package ID: $PACKAGE_ID"
    echo ""
    echo "⚡ Next steps:"
    echo "1. Update the PACKAGE_ID in frontend/src/lib/sui-utils.ts"
    echo "2. Replace '0x0' with '$PACKAGE_ID'"
    echo "3. Restart your frontend development server"
    echo ""
    
    # Try to automatically update the frontend file
    FRONTEND_FILE="../frontend/src/lib/sui-utils.ts"
    if [ -f "$FRONTEND_FILE" ]; then
        echo "🔄 Updating frontend package ID..."
        sed -i.bak "s/export const PACKAGE_ID = '0x0';/export const PACKAGE_ID = '$PACKAGE_ID';/" "$FRONTEND_FILE"
        
        if [ $? -eq 0 ]; then
            echo "✅ Frontend package ID updated automatically!"
            rm "$FRONTEND_FILE.bak" 2>/dev/null
        else
            echo "⚠️  Could not update frontend automatically. Please update manually."
            rm "$FRONTEND_FILE.bak" 2>/dev/null
        fi
    else
        echo "⚠️  Frontend file not found. Please update the package ID manually."
    fi
    
    echo ""
    echo "🔗 View your contract on Sui Explorer:"
    echo "https://testnet.suivision.xyz/package/$PACKAGE_ID"
    
else
    echo "⚠️  Could not extract package ID from deployment output."
    echo "Please manually copy the package ID and update frontend/src/lib/sui-utils.ts"
fi

echo ""
echo "🎉 Deployment complete!"
