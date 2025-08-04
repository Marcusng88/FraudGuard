#!/bin/bash

# Deploy updated FraudGuard smart contracts
echo "🚀 Deploying updated FraudGuard smart contracts..."

# Set environment variables
export SUI_NETWORK=testnet
export PACKAGE_NAME=fraudguard

# Build the package
echo "📦 Building package..."
sui move build

# Deploy the package
echo "🚀 Deploying to testnet..."
sui client publish --gas-budget 100000000

echo "✅ Deployment complete!"
echo "📋 Package ID: (check output above)"
echo "🔗 View on Sui Explorer: https://testnet.suivision.xyz" 