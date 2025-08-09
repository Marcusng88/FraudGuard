import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useCurrentWallet, useCurrentAccount, useConnectWallet, useDisconnectWallet, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import {
  createListNFTTransaction,
  createPurchaseNFTTransaction,
  createUnlistNFTTransaction,
  createUpdatePriceTransaction,
  notifyBackendListing,
  notifyBackendCancellation,
  notifyBackendPriceUpdate,
  getUserSUICoins,
  parseBlockchainError,
  ListingParams,
  PurchaseParams,
  UnlistParams,
  UpdatePriceParams
} from '@/lib/blockchain/marketplace-utils';

interface Wallet {
  address: string;
  isConnected: boolean;
  balance?: number;
}

// Updated type definitions to match marketplace-utils
export interface MarketplaceTransactionResult {
  success: boolean;
  txId: string;
  error?: string;
  blockchainListingId?: string;
  gasUsed?: number;
}

interface WalletContextType {
  wallet: Wallet | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  executeBuyTransaction: (params: PurchaseParams) => Promise<MarketplaceTransactionResult>;
  executeListNFTTransaction: (params: ListingParams) => Promise<MarketplaceTransactionResult>;
  executeUnlistNFTTransaction: (params: UnlistParams) => Promise<MarketplaceTransactionResult>;
  executeEditListingTransaction: (params: UpdatePriceParams) => Promise<MarketplaceTransactionResult>;
  validateSufficientBalance: (amount: number) => Promise<{ sufficient: boolean; currentBalance: number; required: number }>;
  calculateMarketplaceFee: (price: number) => number;
  calculateSellerAmount: (price: number) => number;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Initialize Sui client
const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Marketplace configuration - No longer need MARKETPLACE_ID as it's handled in marketplace-utils
const MARKETPLACE_FEE_RATE = 0.025; // 2.5% marketplace fee

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { currentWallet } = useCurrentWallet();
  const currentAccount = useCurrentAccount();
  const { mutateAsync: connectWallet } = useConnectWallet();
  const { mutateAsync: disconnectWallet } = useDisconnectWallet();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Refresh wallet balance
  const refreshBalance = useCallback(async () => {
    if (!currentAccount?.address) {
      return;
    }

    try {
      const balance = await suiClient.getBalance({
        owner: currentAccount.address,
        coinType: '0x2::sui::SUI',
      });

      const balanceInSui = parseInt(balance.totalBalance) / 1e9;
      setWallet(prev => prev ? { ...prev, balance: balanceInSui } : null);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  }, [currentAccount?.address]);

  // Update wallet state when account changes
  useEffect(() => {
    if (currentAccount?.address) {
      setWallet({
        address: currentAccount.address,
        isConnected: true,
        balance: 0,
      });
      refreshBalance();
    } else {
      setWallet(null);
    }
  }, [currentAccount, refreshBalance]);

  // Connect wallet function
  const connect = async () => {
    try {
      setIsLoading(true);
      if (!currentWallet) {
        throw new Error('No wallet available');
      }
      await connectWallet({ wallet: currentWallet });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect wallet function
  const disconnect = async () => {
    try {
      setIsLoading(true);
      await disconnectWallet();
      setWallet(null);
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle buy NFT transaction using marketplace-utils
  const handleBuyTransaction = async (params: PurchaseParams): Promise<MarketplaceTransactionResult> => {
    if (!signAndExecuteTransaction || !currentAccount?.address) {
      throw new Error('Wallet not connected');
    }

    try {
      // Get user's SUI coins for payment
      const coins = await getUserSUICoins(suiClient, currentAccount.address, params.price);
      if (coins.length === 0) {
        return { success: false, txId: '', error: 'Insufficient SUI balance' };
      }

      // Create purchase transaction
      const tx = createPurchaseNFTTransaction(params, coins[0]);
      
      // Execute transaction
      const result = await signAndExecuteTransaction({ transaction: tx });
      
      // Note: Backend notification will be handled by the calling component
      // to avoid complex blockchain service dependencies

      return { 
        success: true, 
        txId: result.digest,
        gasUsed: 0 // Gas usage will be calculated by backend
      };
    } catch (error) {
      console.error('Buy transaction failed:', error);
      return { 
        success: false, 
        txId: '', 
        error: parseBlockchainError(error) 
      };
    }
  };

  // Handle list NFT transaction using marketplace-utils
  const handleListNFTTransaction = async (params: ListingParams): Promise<MarketplaceTransactionResult> => {
    if (!signAndExecuteTransaction || !currentAccount?.address) {
      throw new Error('Wallet not connected');
    }

    try {
      // Create listing transaction
      const tx = createListNFTTransaction(params);
      
      // Execute transaction
      const result = await signAndExecuteTransaction({ transaction: tx });
      
      // Notify backend of successful listing
      await notifyBackendListing(
        params.nftObjectId,
        params.sellerAddress,
        params.price,
        result.digest
        // No longer need marketplace ID parameter
      );

      return { 
        success: true, 
        txId: result.digest,
        blockchainListingId: result.digest // Use transaction digest as listing identifier
      };
    } catch (error) {
      console.error('List transaction failed:', error);
      return { 
        success: false, 
        txId: '', 
        error: parseBlockchainError(error) 
      };
    }
  };

  // Handle unlist NFT transaction using marketplace-utils
  const handleUnlistNFTTransaction = async (params: UnlistParams): Promise<MarketplaceTransactionResult> => {
    if (!signAndExecuteTransaction || !currentAccount?.address) {
      throw new Error('Wallet not connected');
    }

    try {
      // Create unlist transaction
      const tx = createUnlistNFTTransaction(params);
      
      // Execute transaction
      const result = await signAndExecuteTransaction({ transaction: tx });
      
      // Notify backend of successful unlisting
      await notifyBackendCancellation(
        params.nftObjectId,
        params.sellerAddress,
        result.digest
      );

      return { 
        success: true, 
        txId: result.digest 
      };
    } catch (error) {
      console.error('Unlist transaction failed:', error);
      return { 
        success: false, 
        txId: '', 
        error: parseBlockchainError(error) 
      };
    }
  };

  // Handle edit listing transaction using marketplace-utils
  const handleEditListingTransaction = async (params: UpdatePriceParams): Promise<MarketplaceTransactionResult> => {
    if (!signAndExecuteTransaction || !currentAccount?.address) {
      throw new Error('Wallet not connected');
    }

    try {
      // Create price update transaction
      const tx = createUpdatePriceTransaction(params);
      
      // Execute transaction
      const result = await signAndExecuteTransaction({ transaction: tx });
      
      // Notify backend of successful price update
      await notifyBackendPriceUpdate(
        params.nftObjectId,
        params.sellerAddress,
        params.newPrice,
        result.digest
      );

      return { 
        success: true, 
        txId: result.digest 
      };
    } catch (error) {
      console.error('Edit listing transaction failed:', error);
      return { 
        success: false, 
        txId: '', 
        error: parseBlockchainError(error) 
      };
    }
  };

  // Validate sufficient balance
  const handleValidateSufficientBalance = async (amount: number) => {
    if (!wallet?.address) {
      throw new Error('Wallet not connected');
    }

    const currentBalance = wallet.balance || 0;
    const sufficient = currentBalance >= amount;
    
    return {
      sufficient,
      currentBalance,
      required: amount
    };
  };

  // Calculate marketplace fee
  const calculateMarketplaceFee = (price: number): number => {
    return price * MARKETPLACE_FEE_RATE;
  };

  // Calculate seller amount after fee
  const calculateSellerAmount = (price: number): number => {
    return price * (1 - MARKETPLACE_FEE_RATE);
  };

  const contextValue: WalletContextType = {
    wallet,
    isConnected: !!wallet?.isConnected,
    connect,
    disconnect,
    refreshBalance,
    executeBuyTransaction: handleBuyTransaction,
    executeListNFTTransaction: handleListNFTTransaction,
    executeUnlistNFTTransaction: handleUnlistNFTTransaction,
    executeEditListingTransaction: handleEditListingTransaction,
    validateSufficientBalance: handleValidateSufficientBalance,
    calculateMarketplaceFee,
    calculateSellerAmount,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
