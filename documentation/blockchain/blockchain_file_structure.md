# 🏗️ FraudGuard Sui Blockchain File Structure Plan

## **📁 Current Blockchain Directory Structure**

Based on your existing setup and the comprehensive blockchain plan, here's the detailed file structure for the Sui blockchain implementation:

```plaintext
sui/
|
|--- 📄 Move.toml                    # Package configuration with dependencies
|--- 📄 Move.lock                    # Dependency lock file (auto-generated)
|
|--- 📂 sources/                     # Move source files
|    |--- 📄 marketplace.move        # Core marketplace logic
|    |--- 📄 nft.move               # NFT creation and management
|    |--- 📄 fraud_flag.move        # Fraud detection flags
|    |--- 📄 admin.move             # Admin functions (optional)
|    |--- 📄 events.move            # Custom event definitions
|    |--- 📄 utils.move             # Utility functions
|
|--- 📂 tests/                      # Move unit tests
|    |--- 📄 marketplace_tests.move  # Marketplace function tests
|    |--- 📄 nft_tests.move         # NFT minting and transfer tests
|    |--- 📄 fraud_flag_tests.move  # Fraud detection tests
|    |--- 📄 integration_tests.move # End-to-end workflow tests
|
|--- 📂 scripts/                    # Deployment and utility scripts
|    |--- 📄 deploy.sh              # Deployment script for testnet/mainnet
|    |--- 📄 setup_testnet.sh       # Testnet setup and funding
|    |--- 📄 publish.js             # Node.js deployment script
|    |--- 📄 verify.js              # Contract verification script
|
|--- 📂 build/                      # Build artifacts (auto-generated)
|    |--- 📂 sui/                   # Compiled Move bytecode
|    |--- 📂 locks/                 # Build locks
|
|--- 📂 docs/                       # Documentation
|    |--- 📄 API.md                 # Smart contract API documentation
|    |--- 📄 DEPLOYMENT.md          # Deployment instructions
|    |--- 📄 TESTING.md             # Testing guide
|
|--- 📂 examples/                   # Example usage
|    |--- 📄 mint_nft.js            # Example NFT minting
|    |--- 📄 marketplace_flow.js    # Example marketplace operations
|    |--- 📄 fraud_detection.js     # Example fraud flag creation
```

---

## **📋 1. Move.toml Configuration**

### **Enhanced Package Configuration**
```toml
[package]
name = "fraudguard"
edition = "2024.beta"
license = "MIT"
authors = ["FraudGuard Team"]
description = "AI-powered fraud detection marketplace on Sui"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }

[addresses]
fraudguard = "0x0"
admin = "0x0"  # Will be set during deployment

[dev-dependencies]
# Test dependencies if needed

[dev-addresses]
fraudguard = "0x0"
admin = "0xA11CE"  # Test admin address
```

---

## **📝 2. Core Move Files Structure**

### **marketplace.move - Core Marketplace Logic**
```move
// File: sui/sources/marketplace.move
module fraudguard::marketplace {
    // Imports
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use std::string::String;

    // Structs
    struct Marketplace has key { ... }
    struct Listing has key, store { ... }
    struct MarketplaceCap has key, store { ... }

    // Events
    struct MarketplaceCreated has copy, drop { ... }
    struct NFTListed has copy, drop { ... }
    struct NFTPurchased has copy, drop { ... }

    // Functions
    public entry fun create_marketplace(ctx: &mut TxContext) { ... }
    public entry fun list_nft(...) { ... }
    public entry fun buy_nft(...) { ... }
    public entry fun cancel_listing(...) { ... }

    // Helper functions
    fun calculate_fees(...) { ... }
    fun transfer_with_fees(...) { ... }
}
```

### **nft.move - NFT Management**
```move
// File: sui/sources/nft.move
module fraudguard::nft {
    // Imports
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::url::{Self, Url};
    use std::string::String;
    use std::vector;

    // Structs
    struct NFT has key, store { ... }
    struct NFTMintCap has key, store { ... }

    // Events
    struct NFTMinted has copy, drop { ... }
    struct NFTTransferred has copy, drop { ... }

    // Functions
    public entry fun mint_nft(...) { ... }
    public entry fun transfer_nft(...) { ... }
    public entry fun update_metadata(...) { ... }

    // View functions
    public fun get_nft_info(nft: &NFT): (String, String, Url) { ... }
    public fun get_creator(nft: &NFT): address { ... }
}
```

### **fraud_flag.move - Fraud Detection**
```move
// File: sui/sources/fraud_flag.move
module fraudguard::fraud_flag {
    // Imports
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::clock::{Self, Clock};
    use std::string::String;

    // Structs
    struct FraudFlag has key, store { ... }
    struct FraudAgentCap has key, store { ... }

    // Events
    struct FraudFlagCreated has copy, drop { ... }
    struct FraudFlagDeactivated has copy, drop { ... }

    // Functions
    public entry fun create_fraud_flag(...) { ... }
    public entry fun deactivate_fraud_flag(...) { ... }
    public entry fun update_fraud_score(...) { ... }

    // View functions
    public fun get_fraud_flags_for_nft(nft_id: ID): vector<ID> { ... }
    public fun is_flagged(nft_id: ID): bool { ... }
}
```

---

## **🧪 3. Testing Structure**

### **marketplace_tests.move**
```move
// File: sui/tests/marketplace_tests.move
#[test_only]
module fraudguard::marketplace_tests {
    use fraudguard::marketplace;
    use fraudguard::nft;
    use sui::test_scenario;
    use sui::coin;

    #[test]
    fun test_create_marketplace() { ... }

    #[test]
    fun test_list_nft() { ... }

    #[test]
    fun test_buy_nft() { ... }

    #[test]
    fun test_cancel_listing() { ... }

    #[test]
    fun test_marketplace_fees() { ... }
}
```

### **integration_tests.move**
```move
// File: sui/tests/integration_tests.move
#[test_only]
module fraudguard::integration_tests {
    // Test complete workflows
    #[test]
    fun test_mint_list_buy_workflow() { ... }

    #[test]
    fun test_fraud_detection_workflow() { ... }

    #[test]
    fun test_multiple_users_scenario() { ... }
}
```

---

## **🚀 4. Deployment Scripts**

### **deploy.sh - Main Deployment Script**
```bash
#!/bin/bash
# File: sui/scripts/deploy.sh

set -e

NETWORK=${1:-testnet}
ADMIN_ADDRESS=${2}

echo "🚀 Deploying FraudGuard to $NETWORK..."

# Build the package
echo "📦 Building Move package..."
sui move build

# Publish the package
echo "📤 Publishing package..."
PACKAGE_ID=$(sui client publish --gas-budget 100000000 --json | jq -r '.objectChanges[] | select(.type == "published") | .packageId')

echo "✅ Package published with ID: $PACKAGE_ID"

# Initialize marketplace
echo "🏪 Initializing marketplace..."
sui client call \
    --package $PACKAGE_ID \
    --module marketplace \
    --function create_marketplace \
    --gas-budget 10000000

echo "✅ Deployment complete!"
echo "📋 Package ID: $PACKAGE_ID"
echo "🌐 Network: $NETWORK"
```

### **setup_testnet.sh - Testnet Setup**
```bash
#!/bin/bash
# File: sui/scripts/setup_testnet.sh

echo "🔧 Setting up Sui testnet environment..."

# Switch to testnet
sui client switch --env testnet

# Request test tokens
echo "💰 Requesting test SUI tokens..."
sui client faucet

# Show current address and balance
echo "📍 Current address:"
sui client active-address

echo "💳 Current balance:"
sui client balance

echo "✅ Testnet setup complete!"
```

### **publish.js - Node.js Deployment**
```javascript
// File: sui/scripts/publish.js
const { SuiClient, getFullnodeUrl } = require('@mysten/sui.js/client');
const { Ed25519Keypair } = require('@mysten/sui.js/keypairs/ed25519');
const { TransactionBlock } = require('@mysten/sui.js/transactions');

async function deployContracts() {
    console.log('🚀 Starting deployment...');

    // Initialize client
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });

    // Load keypair (from environment or file)
    const keypair = Ed25519Keypair.fromSecretKey(process.env.PRIVATE_KEY);

    try {
        // Build and publish package
        const { modules, dependencies } = JSON.parse(
            require('fs').readFileSync('./build/sui/bytecode_modules.json')
        );

        const tx = new TransactionBlock();
        const [upgradeCap] = tx.publish({
            modules,
            dependencies,
        });

        tx.transferObjects([upgradeCap], tx.pure(keypair.getPublicKey().toSuiAddress()));

        const result = await client.signAndExecuteTransactionBlock({
            signer: keypair,
            transactionBlock: tx,
        });

        console.log('✅ Deployment successful!');
        console.log('📦 Package ID:', result.objectChanges?.find(c => c.type === 'published')?.packageId);

    } catch (error) {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    }
}

deployContracts();
```

---

## **📚 5. Documentation Files**

### **API.md - Smart Contract API Documentation**
```markdown
# FraudGuard Smart Contract API

## Marketplace Module

### Functions
- `create_marketplace()` - Initialize a new marketplace
- `list_nft(marketplace, nft, price)` - List NFT for sale
- `buy_nft(marketplace, listing, payment)` - Purchase listed NFT
- `cancel_listing(marketplace, listing)` - Cancel NFT listing

### Events
- `MarketplaceCreated` - Emitted when marketplace is created
- `NFTListed` - Emitted when NFT is listed
- `NFTPurchased` - Emitted when NFT is purchased

## NFT Module

### Functions
- `mint_nft(name, description, image_url, metadata)` - Mint new NFT
- `transfer_nft(nft, recipient)` - Transfer NFT ownership

### View Functions
- `get_nft_info(nft)` - Get NFT metadata
- `get_creator(nft)` - Get NFT creator address
```

### **DEPLOYMENT.md - Deployment Instructions**
```markdown
# FraudGuard Deployment Guide

## Prerequisites
- Sui CLI installed and configured
- Testnet SUI tokens for gas fees
- Node.js (for JavaScript deployment scripts)

## Deployment Steps

### 1. Setup Environment
```bash
cd sui/
chmod +x scripts/setup_testnet.sh
./scripts/setup_testnet.sh
```

### 2. Deploy Contracts
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh testnet
```

### 3. Verify Deployment
```bash
node scripts/verify.js
```

## Post-Deployment
1. Update frontend contract addresses
2. Fund AI agent wallet
3. Configure backend event listeners
```

---

## **🔧 6. Example Usage Files**

### **mint_nft.js - NFT Minting Example**
```javascript
// File: sui/examples/mint_nft.js
const { SuiClient, getFullnodeUrl } = require('@mysten/sui.js/client');
const { TransactionBlock } = require('@mysten/sui.js/transactions');

async function mintNFT() {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });

    const tx = new TransactionBlock();

    tx.moveCall({
        target: `${PACKAGE_ID}::nft::mint_nft`,
        arguments: [
            tx.pure("My Awesome NFT"),
            tx.pure("A beautiful digital artwork"),
            tx.pure("https://example.com/image.png"),
            tx.pure(new Uint8Array(Buffer.from('{"trait": "rare"}', 'utf8')))
        ]
    });

    const result = await client.signAndExecuteTransactionBlock({
        signer: keypair,
        transactionBlock: tx,
    });

    console.log('NFT minted:', result.digest);
}
```

### **marketplace_flow.js - Complete Marketplace Flow**
```javascript
// File: sui/examples/marketplace_flow.js
async function completeMarketplaceFlow() {
    // 1. Mint NFT
    const nft = await mintNFT();

    // 2. List NFT
    await listNFT(nft.objectId, 1000000000); // 1 SUI

    // 3. Buy NFT (from different account)
    await buyNFT(listing.objectId);

    console.log('Complete marketplace flow executed successfully!');
}
```

---

## **⚙️ 7. Configuration and Environment**

### **Environment Variables (.env)**
```bash
# Sui Network Configuration
SUI_NETWORK=testnet
SUI_RPC_URL=https://fullnode.testnet.sui.io:443

# Contract Addresses (set after deployment)
MARKETPLACE_PACKAGE_ID=0x...
NFT_MODULE_ADDRESS=0x...::nft
FRAUD_MODULE_ADDRESS=0x...::fraud_flag

# AI Agent Configuration
AI_AGENT_PRIVATE_KEY=0x...
AI_AGENT_ADDRESS=0x...

# Admin Configuration
ADMIN_PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...
```

### **Package.json for Scripts**
```json
{
  "name": "fraudguard-sui-scripts",
  "version": "1.0.0",
  "description": "Deployment and utility scripts for FraudGuard Sui contracts",
  "scripts": {
    "deploy": "node scripts/publish.js",
    "verify": "node scripts/verify.js",
    "test-mint": "node examples/mint_nft.js",
    "test-flow": "node examples/marketplace_flow.js"
  },
  "dependencies": {
    "@mysten/sui.js": "^0.54.1"
  }
}
```

---

## **🎯 8. Integration Points with Frontend**

### **Contract Address Configuration**
```typescript
// File: frontend/src/lib/contracts.ts
export const CONTRACTS = {
  PACKAGE_ID: process.env.NEXT_PUBLIC_PACKAGE_ID!,
  MARKETPLACE: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::marketplace`,
  NFT: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::nft`,
  FRAUD_FLAG: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::fraud_flag`,
};

export const OBJECT_TYPES = {
  NFT: `${CONTRACTS.PACKAGE_ID}::nft::NFT`,
  LISTING: `${CONTRACTS.PACKAGE_ID}::marketplace::Listing`,
  FRAUD_FLAG: `${CONTRACTS.PACKAGE_ID}::fraud_flag::FraudFlag`,
  MARKETPLACE: `${CONTRACTS.PACKAGE_ID}::marketplace::Marketplace`,
};
```

### **Event Type Definitions**
```typescript
// File: frontend/src/types/sui-events.ts
export interface NFTMintedEvent {
  nft_id: string;
  creator: string;
  name: string;
  image_url: string;
}

export interface NFTListedEvent {
  listing_id: string;
  nft_id: string;
  seller: string;
  price: string;
}

export interface FraudFlagCreatedEvent {
  flag_id: string;
  nft_id: string;
  flag_type: number;
  confidence_score: number;
  reason: string;
}
```

---

## **🔄 9. Development Workflow**

### **Local Development Process**
1. **Write Move Code** - Implement smart contract logic
2. **Unit Testing** - Run `sui move test` for individual functions
3. **Integration Testing** - Test complete workflows
4. **Local Deployment** - Deploy to local Sui network
5. **Frontend Integration** - Update frontend with new contract addresses
6. **End-to-End Testing** - Test complete user flows

### **Testnet Deployment Process**
1. **Code Review** - Ensure code quality and security
2. **Final Testing** - Run all tests on local network
3. **Testnet Deployment** - Deploy to Sui testnet
4. **Verification** - Verify contract functionality
5. **Frontend Update** - Update frontend configuration
6. **AI Agent Setup** - Configure backend event listeners

### **Production Deployment Process**
1. **Security Audit** - Professional security review
2. **Mainnet Deployment** - Deploy to Sui mainnet
3. **Monitoring Setup** - Configure error tracking and monitoring
4. **Documentation** - Update all documentation
5. **Launch** - Go live with full functionality

---

## **📊 10. File Organization Best Practices**

### **Naming Conventions**
- **Move Files**: `snake_case.move`
- **Test Files**: `module_name_tests.move`
- **Scripts**: `kebab-case.sh` or `camelCase.js`
- **Documentation**: `UPPERCASE.md`

### **Code Organization**
- **One module per file** - Keep modules focused and manageable
- **Consistent imports** - Group imports logically
- **Clear documentation** - Comment complex logic
- **Error handling** - Proper error messages and codes

### **Version Control**
- **Ignore build artifacts** - Add `build/` to `.gitignore`
- **Track lock files** - Include `Move.lock` in version control
- **Environment files** - Keep `.env` files out of version control
- **Documentation updates** - Keep docs in sync with code changes

This comprehensive file structure provides a solid foundation for developing, testing, and deploying the FraudGuard Sui blockchain components while maintaining clean organization and professional development practices.