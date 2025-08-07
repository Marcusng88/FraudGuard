# 🎨 Frontend Implementation Plan - FraudGuard

## **📋 Overview**
This plan outlines the frontend implementation following the current mock flow while integrating real zkLogin authentication, Sui blockchain interactions, and backend API integration for AI-powered fraud detection.

## **🔗 Core Integration Points**

### **1. zkLogin Authentication System**
```typescript
// Current: Mock user placeholder
// Implementation: Real zkLogin integration

interface User {
  // Placeholder for current user metadata
  zkProof?: string;
  suiAddress?: string;
  provider?: 'google' | 'twitch' | 'facebook';
  displayName?: string;
  avatar?: string;
  isVerified?: boolean;
  // Add more fields as zkLogin implementation evolves
}
```

**Pages to Update:**
- **Navigation Component**: Replace "Connect Wallet" with zkLogin authentication
- **Profile Page**: Display real user data from zkLogin
- **All Pages**: Add authentication guards and user state management

### **2. Real-time Data Integration**

#### **A. Marketplace Data Flow**
```typescript
// Replace mock data with API calls
interface NFTData {
  nft_id: string;
  owner: string;
  price: string;
  image_url: string;
  name: string;
  description: string;
  creator: string;
  fraud_flag?: FraudFlag;
  threat_level: 'safe' | 'warning' | 'danger';
  confidence_score?: number;
  created_at: string;
  listing_status: 'active' | 'sold' | 'flagged';
}

interface FraudFlag {
  flag_id: string;
  nft_id: string;
  reason: string;
  confidence: number;
  flagged_by: string; // AI agent address
  timestamp: string;
  flag_type: 'plagiarism' | 'suspicious_behavior' | 'copyright_violation';
}
```

#### **B. API Endpoints Integration**
- `GET /api/marketplace/nfts` - Fetch marketplace listings
- `GET /api/nfts/{nft_id}/fraud-status` - Get fraud analysis
- `POST /api/nfts/mint` - Mint new NFT
- `POST /api/nfts/{nft_id}/purchase` - Buy NFT
- `GET /api/user/profile` - User profile data
- `GET /api/alerts/active` - Active fraud alerts

## **📱 Page-by-Page Implementation Plan**

### **1. Dashboard (Index.tsx) - Enhanced**

**Current Features to Keep:**
- Fraud detection stats widget
- Active alerts display
- Protected marketplace preview
- Cyber-themed animations

**New Integrations:**
```typescript
// Real-time stats from backend
const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.getDashboardStats(),
    refetchInterval: 30000 // Update every 30 seconds
  });
};

// Real alerts from Supabase
const useActiveAlerts = () => {
  return useQuery({
    queryKey: ['active-alerts'],
    queryFn: () => api.getActiveAlerts(),
    refetchInterval: 10000 // Update every 10 seconds
  });
};
```

### **2. Marketplace (Marketplace.tsx) - Production Ready**

**Current Features to Keep:**
- Search and filter functionality
- Grid/List view toggle
- Threat level filtering
- Cyber-themed UI

**Backend Integration:**
```typescript
// Replace mock data with real API calls
const useMarketplaceNFTs = (filters: MarketplaceFilters) => {
  return useQuery({
    queryKey: ['marketplace-nfts', filters],
    queryFn: () => api.getMarketplaceNFTs(filters),
    keepPreviousData: true
  });
};

// Real-time fraud flag updates
const useFraudFlags = (nftIds: string[]) => {
  return useQuery({
    queryKey: ['fraud-flags', nftIds],
    queryFn: () => api.getFraudFlags(nftIds),
    refetchInterval: 5000
  });
};
```

**Enhanced Features:**
- **Real Pagination**: Backend-driven pagination
- **Advanced Filtering**: Price range, creator verification status
- **Real-time Updates**: WebSocket for live fraud flag updates
- **Purchase Flow**: Integrate Sui transaction signing

### **3. Create NFT (CreateNft.tsx) - AI Integration**

**Current Features to Keep:**
- Image upload UI
- Form fields for metadata
- Upload progress tracking
- AI analysis preview

**Backend Integration:**
```typescript
// Real IPFS upload
const useIPFSUpload = () => {
  return useMutation({
    mutationFn: (file: File) => api.uploadToIPFS(file),
    onSuccess: (ipfsUrl) => {
      // Trigger AI analysis
      triggerAIAnalysis(ipfsUrl);
    }
  });
};

// Real AI analysis
const useAIAnalysis = () => {
  return useMutation({
    mutationFn: (imageUrl: string) => api.analyzeImage(imageUrl),
    onSuccess: (analysis) => {
      setAnalysisResult(analysis);
    }
  });
};

// Sui NFT minting
const useMintNFT = () => {
  return useMutation({
    mutationFn: (nftData: NFTMintData) => sui.mintNFT(nftData),
    onSuccess: () => {
      // Redirect to marketplace or profile
    }
  });
};
```

### **4. Profile (Profile.tsx) - User Data**

**Current Features to Keep:**
- User stats display
- Trading history
- Reputation system
- Activity timeline

**zkLogin Integration:**
```typescript
// Real user data from zkLogin + backend
const useUserProfile = () => {
  const { user } = useZkLogin();
  return useQuery({
    queryKey: ['user-profile', user?.suiAddress],
    queryFn: () => api.getUserProfile(user?.suiAddress),
    enabled: !!user?.suiAddress
  });
};

// Real trading history
const useUserTradingHistory = () => {
  const { user } = useZkLogin();
  return useQuery({
    queryKey: ['trading-history', user?.suiAddress],
    queryFn: () => api.getUserTradingHistory(user?.suiAddress),
    enabled: !!user?.suiAddress
  });
};
```

## **🔧 State Management Architecture**

### **1. Authentication State**
```typescript
// Context for zkLogin user state
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (provider: LoginProvider) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}
```

### **2. App State Structure**
```typescript
// Global app state using Zustand or Context
interface AppState {
  // Authentication
  user: User | null;
  isAuthenticated: boolean;
  
  // UI State
  theme: 'cyber' | 'light' | 'dark';
  sidebarOpen: boolean;
  
  // Real-time data
  activeAlerts: FraudAlert[];
  marketplaceFilters: MarketplaceFilters;
  
  // Notifications
  notifications: AppNotification[];
}
```

## **🚀 New Components to Build**

### **1. Authentication Components**
- `<ZkLoginProvider />` - Wrap entire app
- `<LoginModal />` - zkLogin authentication modal
- `<UserAvatar />` - Display user info in navigation
- `<ProtectedRoute />` - Route guards for authenticated pages

### **2. NFT Transaction Components**
- `<PurchaseModal />` - Handle NFT purchases with Sui
- `<MintingProgress />` - Real-time minting status
- `<TransactionStatus />` - Show transaction pending/success/error
- `<GasEstimator />` - Display transaction costs

### **3. Fraud Detection Components**
- `<FraudWarning />` - Enhanced fraud warnings with details
- `<ThreatIndicator />` - Real-time threat level indicators
- `<AnalysisDetails />` - Detailed AI analysis results
- `<ReportFraud />` - User reporting functionality

### **4. Real-time Components**
- `<LiveUpdates />` - WebSocket connection for real-time data
- `<AlertsProvider />` - Global alert state management
- `<NotificationCenter />` - In-app notifications

## **📡 API Integration Layer**

### **1. API Client Setup**
```typescript
// api/client.ts
export const apiClient = {
  // Marketplace
  getMarketplaceNFTs: (filters: MarketplaceFilters) => Promise<NFTData[]>,
  getNFTDetails: (nftId: string) => Promise<NFTData>,
  
  // User
  getUserProfile: (address: string) => Promise<UserProfile>,
  getUserTradingHistory: (address: string) => Promise<TradeHistory[]>,
  
  // Fraud Detection
  getFraudFlags: (nftIds: string[]) => Promise<FraudFlag[]>,
  getActiveAlerts: () => Promise<FraudAlert[]>,
  
  // NFT Operations
  uploadToIPFS: (file: File) => Promise<string>,
  analyzeImage: (imageUrl: string) => Promise<AIAnalysis>,
  mintNFT: (data: NFTMintData) => Promise<string>,
};
```

### **2. WebSocket Integration**
```typescript
// Real-time updates for fraud alerts and marketplace changes
const useWebSocket = () => {
  useEffect(() => {
    const ws = new WebSocket(WS_ENDPOINT);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'fraud_flag_added':
          updateNFTFraudStatus(data.nft_id, data.flag);
          break;
        case 'new_listing':
          invalidateMarketplaceQuery();
          break;
        case 'nft_sold':
          updateNFTStatus(data.nft_id, 'sold');
          break;
      }
    };
    
    return () => ws.close();
  }, []);
};
```

## **🔐 Security & Error Handling**

### **1. Authentication Guards**
```typescript
// Protect sensitive routes
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  return <>{children}</>;
};
```

### **2. Error Boundaries**
```typescript
// Handle errors gracefully
<ErrorBoundary fallback={<ErrorFallback />}>
  <App />
</ErrorBoundary>
```

### **3. Transaction Safety**
```typescript
// Validate transactions before signing
const validateTransaction = (txData: TransactionData) => {
  // Check gas fees, validate recipient, etc.
};
```

## **🎯 Implementation Priority**

### **Phase 1: Core Integration (Week 1)**
1. Set up zkLogin authentication system
2. Replace mock data with API calls
3. Implement basic Sui transaction signing
4. Add error handling and loading states

### **Phase 2: Enhanced Features (Week 2)**
1. Real-time WebSocket integration
2. Advanced fraud detection UI
3. Enhanced transaction flows
4. Performance optimization

### **Phase 3: Polish & Testing (Week 3)**
1. End-to-end testing
2. UI/UX improvements
3. Security auditing
4. Performance monitoring

## **📊 Success Metrics**

### **Technical Metrics**
- Page load time < 2 seconds
- Real-time update latency < 1 second
- Transaction success rate > 99%
- Error rate < 1%

### **User Experience Metrics**
- Authentication success rate > 95%
- NFT browsing to purchase conversion
- Fraud detection accuracy feedback
- User retention after first transaction

---

**Next Steps:**
1. Review and approve this frontend plan
2. Create detailed database schema plan
3. Begin Phase 1 implementation
4. Set up development environment with zkLogin sandbox

**Questions for Clarification:**
1. Do you want to maintain the current cyber theme styling?
2. Should we implement a notification system for fraud alerts?
3. What's the preferred error handling strategy for failed transactions?
4. Do you need offline functionality or always-online assumption?