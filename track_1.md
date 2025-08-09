# FraudGuard Technical Workflow - Track 1

## 1. Application Bootstrap & Wallet Registration

### System Initialization
- React app starts and immediately imports Slush registration module
- `registerSlushWallet()` function executes during module loading
- Slush wallet gets registered with Mysten's dapp-kit as available wallet option
- Wallet becomes discoverable by Sui dapp ecosystem

### Provider Hierarchy Setup
- **QueryClient** initializes for React Query state management
- **SuiClientProvider** establishes connection to Sui testnet RPC endpoints
- **SuiWalletProvider** makes wallet connection hooks available throughout app
- **Custom WalletProvider** wraps Sui providers to add marketplace-specific functionality
- **AuthProvider** creates simplified authentication context based on wallet connection

## 2. OAuth Configuration & Environment Setup

### Configuration Loading
- Environment variables load for each OAuth provider (Google, GitHub, Facebook)
- Each provider gets unique client ID and redirect URI configuration
- Slush config object centralizes all OAuth provider settings
- Sui network configuration points to testnet by default

### Fallback Handling
- Default placeholder values provided for missing environment variables
- Network configuration includes testnet, devnet, and localnet options
- Error boundaries handle missing or invalid configuration gracefully

## 3. zkLogin Authentication Technical Process

### Phase A: OAuth Initiation
1. User selects OAuth provider through UI interface
2. System redirects user to provider's authorization server
3. Provider displays consent screen for application permissions
4. User grants access and gets redirected back with authorization code

### Phase B: Token Exchange
1. Authorization code exchanged for access token and ID token (JWT)
2. JWT contains user identity claims (email, user ID, issuer info)
3. Token validation occurs against provider's public keys
4. Slush wallet receives and processes the validated JWT

### Phase C: zkLogin Proof Generation
1. Slush extracts user identifier from JWT (typically email or user ID)
2. Ephemeral key pair generated client-side for this session
3. Zero-knowledge proof created linking OAuth identity to ephemeral public key
4. Proof demonstrates user controls OAuth account without revealing private details

### Phase D: Sui Address Derivation
1. Hash function applied to OAuth issuer + user identifier
2. Combined with ephemeral public key to create deterministic address
3. Same OAuth account always generates same Sui address
4. Address becomes user's blockchain identity for transactions
## 4. Wallet Connection State Management

### Connection Detection
- `useCurrentWallet` hook monitors wallet connection status
- `useCurrentAccount` hook tracks authenticated account details
- State changes trigger React re-renders throughout application
- Connection status persisted in localStorage for session continuity

### Balance Synchronization
- Automatic balance query to Sui RPC when wallet connects
- SUI balance retrieved from network (coinType: `'0x2::sui::SUI'`)
- Conversion from MIST (smallest unit) to SUI for display
- Balance updates stored in wallet context and localStorage

### Backend Integration
- User creation API call triggered automatically on first connection
- Sui address sent to backend for user record establishment
- Backend links blockchain address to user profile and transaction history
- Error handling for failed backend calls doesn't block wallet functionality

## 5. Transaction Execution Technical Flow

### Transaction Preparation
1. Transaction object created using Sui's Transaction builder
2. Smart contract function calls added to transaction
3. Parameters serialized and attached (NFT IDs, prices, addresses)
4. Gas budget calculated and set for transaction execution

### Signing Process
1. Transaction serialized to bytes for signing
2. Slush wallet signs using ephemeral private key
3. zkLogin proof attached as additional authentication
4. Signature format compatible with Sui network requirements

### Network Submission
1. Signed transaction broadcast to Sui network via RPC
2. Network validates transaction signature and zkLogin proof
3. Smart contract execution occurs if all validations pass
4. Transaction hash returned for tracking and confirmation

### Confirmation & Updates
1. Transaction status monitored via RPC polling
2. Success/failure status updated in UI
3. Balance refresh triggered after confirmed transactions
4. Backend notified of transaction results for record keeping
## 6. Smart Contract Interaction Patterns

### Marketplace Contract Calls
- Buy transactions call marketplace purchase functions
- NFT ownership transfer handled by smart contract logic
- Payment distribution between seller and marketplace fee
- Event emission for transaction logging and indexing

### Fee Calculation Logic
- Marketplace fee calculated client-side (2.5% default)
- Fee percentage stored in basis points (250 = 2.5%)
- Seller amount calculated as total price minus marketplace fee
- Gas fees separate from marketplace fees

### Error Handling
- Insufficient balance detection before transaction submission
- Gas estimation to prevent failed transactions
- Smart contract error parsing and user-friendly messaging
- Retry mechanisms for temporary network issues

## 7. Session Persistence & Recovery

### State Persistence
- Wallet connection status stored in localStorage
- User address and balance cached locally
- Authentication state maintained across browser sessions
- Automatic reconnection attempted on application reload

### Recovery Mechanisms
- Stale balance detection and automatic refresh
- Network reconnection handling for offline scenarios
- OAuth token refresh if supported by provider
- Graceful degradation when backend services unavailable

## 8. Security Model & Cryptographic Operations

### Key Management
- No long-term private keys stored anywhere
- Ephemeral keys generated per session
- zkLogin proofs time-limited for security
- OAuth tokens handled by Slush, never exposed to application

### Privacy Protection
- OAuth providers can't see blockchain transactions
- Blockchain observers can't link to OAuth identities without zkLogin proof
- User transactions pseudonymous on Sui network
- No personal data stored on blockchain

### Non-Custodial Architecture
- Users maintain full control of blockchain assets
- Slush can't access or freeze user funds
- OAuth provider downtime doesn't affect blockchain access
- No central authority can prevent user transactions
## 9. Network Communication Patterns

### RPC Interactions
- Direct connection to Sui testnet RPC endpoints
- Balance queries, transaction submission, and status checking
- WebSocket connections for real-time updates (if implemented)
- Rate limiting and retry logic for API calls

### Backend API Integration
- RESTful APIs for user management and transaction history
- Authentication via wallet address verification
- Metadata storage for NFT listings and user profiles
- Fraud detection system integration for marketplace safety

### Error Propagation
- Network errors caught and displayed to users
- Backend errors logged but don't block wallet functionality
- Blockchain errors parsed for actionable user guidance
- Fallback mechanisms for service degradation

---

## Summary

This technical workflow creates a seamless bridge between Web2 user experience and Web3 blockchain functionality, handling the complex cryptographic and network operations transparently while maintaining security and user control.
