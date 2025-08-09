import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { createNetworkConfig, SuiClientProvider, WalletProvider as SuiWalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import '@mysten/dapp-kit/dist/index.css';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CustomerServiceChatbox } from './components/CustomerServiceChatbox';

import { WalletProvider } from './hooks/useWallet';
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Marketplace from "./pages/Marketplace";
import CreateNft from "./pages/CreateNft";
import ListNft from "./pages/ListNft";
import UnlistNft from "./pages/UnlistNft";
import EditListing from "./pages/EditListing";
import Profile from "./pages/Profile";
import NFTDetail from "./pages/NFTDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Configure Sui networks
const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl('testnet') },
  devnet: { url: getFullnodeUrl('devnet') },
  localnet: { url: getFullnodeUrl('localnet') },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
      <SuiWalletProvider>
        <WalletProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
                  <Route path="/nft/:nftId" element={<ProtectedRoute><NFTDetail /></ProtectedRoute>} />
                  <Route path="/create" element={<ProtectedRoute><CreateNft /></ProtectedRoute>} />
                  <Route path="/list/:nftId" element={<ProtectedRoute><ListNft /></ProtectedRoute>} />
                <Route path="/unlist/:listingId" element={<ProtectedRoute><UnlistNft /></ProtectedRoute>} />
                <Route path="/edit-listing/:listingId" element={<ProtectedRoute><EditListing /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                {/* Customer Service Chatbox - appears on all pages */}
                <CustomerServiceChatbox />
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </WalletProvider>
      </SuiWalletProvider>
    </SuiClientProvider>
  </QueryClientProvider>
);

export default App;
