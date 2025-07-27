# 🏗️ FraudGuard Frontend File Structure Plan

## **Current Issues with Basic Structure**
Your current frontend structure is very basic and missing essential Web3 components. For a hackathon-winning NFT marketplace, we need a more sophisticated, scalable architecture.

## **🎯 Improved Frontend File Structure**

```plaintext
frontend/
|
|--- 📄 package.json              # Enhanced with Web3 dependencies
|--- 📄 next.config.ts            # Optimized for Web3 and images
|--- 📄 tailwind.config.ts        # Custom design system
|--- 📄 tsconfig.json
|--- 📄 .env.local               # Environment variables
|
|--- 📂 public/
|    |--- 📄 favicon.ico
|    |--- 📂 icons/              # Custom icons for fraud warnings, wallet, etc.
|    |--- 📂 images/             # Landing page images, backgrounds
|    |--- 📂 sounds/             # Optional: notification sounds for warnings
|
|--- 📂 src/
     |
     |--- 📂 app/                 # Next.js 14+ App Router
     |    |--- 📄 layout.tsx      # Root layout with Web3 providers
     |    |--- 📄 page.tsx        # Landing page
     |    |--- 📄 globals.css     # Global styles with custom variables
     |    |--- 📄 loading.tsx     # Global loading component
     |    |--- 📄 error.tsx       # Global error boundary
     |    |
     |    |--- 📂 marketplace/    # Main marketplace pages ✅ COMPLETED
     |    |    |--- 📄 page.tsx   # Browse all NFTs ✅ COMPLETED
     |    |    |--- 📂 [id]/      # Individual NFT details ✅ COMPLETED
     |    |         |--- 📄 page.tsx # NFT details with fraud analysis ✅ COMPLETED
     |    |
     |    |--- 📂 profile/        # User profile section ✅ COMPLETED
     |    |    |--- 📄 page.tsx   # User's NFTs, transactions ✅ COMPLETED
     |    |    |--- 📂 create/    # Mint new NFT ✅ COMPLETED
     |    |         |--- 📄 page.tsx # Step-by-step NFT creation ✅ COMPLETED
     |    |
     |    |--- 📂 admin/          # Admin dashboard (future)
     |         |--- 📄 page.tsx   # Fraud detection dashboard
     |
     |--- 📂 components/
     |    |
     |    |--- 📂 ui/             # Reusable UI components (shadcn/ui style)
     |    |    |--- 📄 button.tsx
     |    |    |--- 📄 card.tsx
     |    |    |--- 📄 modal.tsx
     |    |    |--- 📄 input.tsx
     |    |    |--- 📄 badge.tsx
     |    |    |--- 📄 skeleton.tsx
     |    |    |--- 📄 toast.tsx
     |    |    |--- 📄 spinner.tsx
     |    |
     |    |--- 📂 layout/         # Layout components
     |    |    |--- 📄 Header.tsx
     |    |    |--- 📄 Navigation.tsx
     |    |
     |    |--- 📂 web3/           # Web3 specific components
     |    |    |--- 📄 WalletConnection.tsx
     |    |    |--- 📄 WalletButton.tsx
     |    |    |--- 📄 NetworkStatus.tsx
     |    |    |--- 📄 TransactionStatus.tsx
     |    |    |--- 📄 GasEstimator.tsx
     |    |
     |    |--- 📂 nft/            # NFT specific components
     |    |    |--- 📄 NftCard.tsx        # Enhanced with fraud indicators
     |    |    |--- 📄 NftGrid.tsx        # Responsive grid layout
     |    |    |--- 📄 NftDetails.tsx     # Detailed NFT view
     |    |    |--- 📄 NftMinter.tsx      # Minting interface
     |    |    |--- 📄 NftPreview.tsx     # Preview during minting
     |    |
     |    |--- 📂 marketplace/    # Marketplace components
     |    |    |--- 📄 MarketplaceGrid.tsx
     |    |    |--- 📄 FilterSidebar.tsx
     |    |    |--- 📄 SearchBar.tsx
     |    |    |--- 📄 SortOptions.tsx
     |    |    |--- 📄 PriceFilter.tsx
     |    |    |--- 📄 CategoryFilter.tsx
     |    |
     |    |--- 📂 fraud/          # Fraud detection UI
     |    |    |--- 📄 FraudWarningBanner.tsx
     |    |    |--- 📄 FraudIndicator.tsx
     |    |    |--- 📄 FraudScore.tsx
     |    |    |--- 📄 ReportModal.tsx
     |    |    |--- 📄 FraudHistory.tsx
     |    |
     |    |--- 📂 forms/          # Form components
     |         |--- 📄 CreateNftForm.tsx
     |         |--- 📄 BidForm.tsx
     |         |--- 📄 ReportForm.tsx
     |
     |--- 📂 hooks/               # Custom React hooks
     |    |--- 📄 useSuiWallet.ts      # Wallet connection logic
     |    |--- 📄 useSuiNfts.ts        # NFT data fetching
     |    |--- 📄 useMarketplace.ts    # Marketplace interactions
     |    |--- 📄 useFraudDetection.ts # Fraud data management
     |    |--- 📄 useTransactions.ts   # Transaction management
     |    |--- 📄 useNotifications.ts  # Toast notifications
     |    |--- 📄 useLocalStorage.ts   # Local storage utilities
     |
     |--- 📂 lib/                 # Utility libraries
     |    |--- 📄 sui.ts              # Sui client configuration
     |    |--- 📄 contracts.ts        # Smart contract interfaces
     |    |--- 📄 api.ts              # API client for backend
     |    |--- 📄 utils.ts            # General utilities
     |    |--- 📄 constants.ts        # App constants
     |    |--- 📄 validations.ts      # Form validations
     |    |--- 📄 formatters.ts       # Data formatting utilities
     |
     |--- 📂 types/               # TypeScript type definitions
     |    |--- 📄 index.ts            # Main types export
     |    |--- 📄 nft.ts              # NFT related types
     |    |--- 📄 marketplace.ts      # Marketplace types
     |    |--- 📄 fraud.ts            # Fraud detection types
     |    |--- 📄 wallet.ts           # Wallet types
     |    |--- 📄 api.ts              # API response types
     |
     |--- 📂 styles/              # Styling
     |    |--- 📄 globals.css         # Global styles
     |    |--- 📄 components.css      # Component-specific styles
     |    |--- 📄 animations.css      # Custom animations
     |
     |--- 📂 providers/           # React Context Providers
     |    |--- 📄 Web3Provider.tsx    # Sui wallet provider
     |    |--- 📄 ThemeProvider.tsx   # Dark/light theme
     |    |--- 📄 NotificationProvider.tsx # Toast notifications
     |    |--- 📄 FraudProvider.tsx   # Fraud detection context
     |
     |--- 📂 store/               # State management (if needed)
          |--- 📄 index.ts            # Store configuration
          |--- 📄 nftSlice.ts         # NFT state
          |--- 📄 walletSlice.ts      # Wallet state
```

## **🎨 Key Frontend Architecture Decisions**

### **1. Enhanced Package.json Dependencies**
```json
{
  "dependencies": {
    // Current
    "react": "19.1.0",
    "react-dom": "19.1.0", 
    "next": "15.4.4",
    
    // Web3 Essential
    "@mysten/sui.js": "^0.54.1",           // Sui SDK
    "@mysten/dapp-kit": "^0.14.0",         // Sui wallet integration
    "@mysten/wallet-adapter": "^0.9.0",    // Wallet connections
    
    // UI & Styling
    "@radix-ui/react-dialog": "^1.0.5",    // Modal components
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-toast": "^1.1.5",     // Notifications
    "framer-motion": "^10.16.16",          // Smooth animations
    "lucide-react": "^0.294.0",            // Icons
    "class-variance-authority": "^0.7.0",   // Component variants
    "clsx": "^2.0.0",                      // Conditional classes
    
    // Data Management
    "@tanstack/react-query": "^5.8.4",     // Server state management
    "zustand": "^4.4.7",                   // Client state (lightweight)
    
    // Forms & Validation
    "react-hook-form": "^7.48.2",          // Form handling
    "zod": "^3.22.4",                      // Schema validation
    "@hookform/resolvers": "^3.3.2",       // Form validation
    
    // Utils
    "date-fns": "^2.30.0",                 // Date formatting
    "recharts": "^2.8.0"                   // Charts for fraud metrics
  }
}
```

### **2. Design System Philosophy**
- **Glassmorphism UI**: Modern, transparent cards with blur effects
- **Dark Mode First**: Professional look for Web3 audience
- **Fraud-Aware Colors**: Red/orange for warnings, green for verified
- **Responsive Design**: Mobile-first approach
- **Micro-interactions**: Smooth hover effects and loading states

### **3. Web3 Integration Strategy**
- **Progressive Enhancement**: Works without wallet, enhanced with wallet
- **Multi-Wallet Support**: Sui Wallet, Ethos, Suiet wallets
- **Gas Fee Display**: Show estimated costs before transactions
- **Transaction Feedback**: Clear success/error states
- **Offline Handling**: Graceful degradation when network is down

### **4. Fraud Detection UX**
- **Visual Indicators**: Clear fraud scores and warning badges
- **Non-Blocking Warnings**: Inform but don't prevent purchases
- **Educational Tooltips**: Explain what fraud indicators mean
- **Report Functionality**: Let users report suspicious NFTs

### **5. Performance Optimizations**
- **Image Optimization**: Next.js Image component with IPFS support
- **Lazy Loading**: Components and images load as needed
- **Caching Strategy**: React Query for API data, localStorage for preferences
- **Bundle Splitting**: Route-based code splitting

## **🚀 Development Priority Order**

1. **Phase 1: Foundation** (Day 1)
   - Set up Web3 providers and wallet connection
   - Basic layout components (Header, Footer, Navigation)
   - Core UI components (Button, Card, Modal)

2. **Phase 2: Core Features** (Day 2)
   - NFT display components with fraud indicators
   - Marketplace grid and filtering
   - Basic minting interface

3. **Phase 3: Polish** (Day 3)
   - Advanced fraud detection UI
   - Animations and micro-interactions
   - Mobile responsiveness
   - Error handling and edge cases

## **🎯 Competitive Advantages**

1. **Fraud-First Design**: Unlike other marketplaces, fraud detection is prominently displayed
2. **Educational UX**: Help users understand Web3 and fraud risks
3. **Performance**: Fast loading with optimized images and caching
4. **Accessibility**: WCAG compliant, keyboard navigation
5. **Mobile Excellence**: Many Web3 apps ignore mobile - we won't

This structure sets you up for a hackathon-winning frontend that's both visually impressive and functionally robust for Web3 users.