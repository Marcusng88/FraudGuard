import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { createNetworkConfig, SuiClientProvider, WalletProvider as SuiWalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import '@mysten/dapp-kit/dist/index.css';

import { WalletProvider } from './hooks/useWallet';
import Index from "./pages/Index";
import Marketplace from "./pages/Marketplace";
import CreateNft from "./pages/CreateNft";
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
      <SuiWalletProvider 
        autoConnect={true}
        slushWallet={{
          name: 'FraudGuard',
          origin: window.location.origin
        }}
      >
        <WalletProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/nft/:nftId" element={<NFTDetail />} />
                <Route path="/create" element={<CreateNft />} />
                <Route path="/profile" element={<Profile />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </WalletProvider>
      </SuiWalletProvider>
    </SuiClientProvider>
  </QueryClientProvider>
);

export default App;
