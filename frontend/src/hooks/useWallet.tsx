import React, { createContext, useContext, useEffect, useState } from 'react';
import { useCurrentWallet, useCurrentAccount, useConnectWallet, useDisconnectWallet, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { 
  executeBuyTransaction, 
  executeSellTransaction, 
  validateSufficientBalance,
  BuyNFTParams,
  SellNFTParams,
  TransactionResult,
  calculateMarketplaceFee,
  calculateSellerAmount
} from '@/lib/blockchain-utils';

interface Wallet {
  address: string;
  isConnected: boolean;
  balance?: number;
}

interface WalletContextType {
  wallet: Wallet | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isLoading: boolean;
  // Blockchain transaction methods
  executeBuyTransaction: (params: BuyNFTParams) => Promise<TransactionResult>;
  executeSellTransaction: (params: SellNFTParams) => Promise<TransactionResult>;
  validateSufficientBalance: (amount: number) => Promise<{ sufficient: boolean; currentBalance: number; required: number }>;
  calculateMarketplaceFee: (price: number) => number;
  calculateSellerAmount: (price: number) => number;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Initialize Sui client
const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function WalletProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Use dapp-kit hooks
  const currentWallet = useCurrentWallet();
  const currentAccount = useCurrentAccount();
  const connectWallet = useConnectWallet();
  const disconnectWallet = useDisconnectWallet();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  // Create user in backend when wallet connects
  const createUserInBackend = async (walletAddress: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/listings/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
        }),
      });

      if (!response.ok) {
        console.error('Failed to create user in backend:', response.statusText);
      } else {
        console.log('User created/retrieved in backend successfully');
      }
    } catch (error) {
      console.error('Error creating user in backend:', error);
    }
  };

  // Update wallet state when current wallet changes
  useEffect(() => {
    if (currentWallet.isConnected && currentAccount) {
      // Create user in backend
      createUserInBackend(currentAccount.address);
      
      // Get balance for the connected account
      const getBalance = async () => {
        try {
          const balance = await suiClient.getBalance({
            owner: currentAccount.address,
            coinType: '0x2::sui::SUI'
          });
          
          const walletData: Wallet = {
            address: currentAccount.address,
            isConnected: true,
            balance: Number(balance.totalBalance) / 1000000000, // Convert from MIST to SUI
          };
          
          setWallet(walletData);
          localStorage.setItem('wallet', JSON.stringify(walletData));
        } catch (error) {
          console.error('Failed to get balance:', error);
          // Set wallet without balance if balance fetch fails
          const walletData: Wallet = {
            address: currentAccount.address,
            isConnected: true,
          };
          setWallet(walletData);
          localStorage.setItem('wallet', JSON.stringify(walletData));
        }
      };
      
      getBalance();
    } else if (currentWallet.isDisconnected) {
      setWallet(null);
      localStorage.removeItem('wallet');
    }
  }, [currentWallet.isConnected, currentWallet.isDisconnected, currentAccount]);

  const connect = async () => {
    setIsLoading(true);
    try {
      // Get available wallets
      const wallets = currentWallet.currentWallet ? [currentWallet.currentWallet] : [];
      
      if (wallets.length > 0) {
        // Connect to the first available wallet
        await connectWallet.mutateAsync({
          wallet: wallets[0],
        });
      } else {
        console.warn('No wallets available');
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = async () => {
    try {
      await disconnectWallet.mutateAsync();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  // Blockchain transaction methods
  const handleBuyTransaction = async (params: BuyNFTParams): Promise<TransactionResult> => {
    if (!wallet?.address) {
      throw new Error('Wallet not connected');
    }

    const wrappedSignAndExecute = async (transaction: Transaction) => {
      const result = await signAndExecuteTransaction({ transaction });
      // Return a properly typed result
      return {
        digest: result.digest,
        effects: result.effects,
      } as { digest: string; effects?: { status?: { status: string; error?: string }; gasUsed?: { computationCost: number } } };
    };

    return executeBuyTransaction(params, wrappedSignAndExecute);
  };

  const handleSellTransaction = async (params: SellNFTParams): Promise<TransactionResult> => {
    if (!wallet?.address) {
      throw new Error('Wallet not connected');
    }

    const wrappedSignAndExecute = async (transaction: Transaction) => {
      const result = await signAndExecuteTransaction({ transaction });
      // Return a properly typed result
      return {
        digest: result.digest,
        effects: result.effects,
      } as { digest: string; effects?: { status?: { status: string; error?: string }; gasUsed?: { computationCost: number } } };
    };

    return executeSellTransaction(params, wrappedSignAndExecute);
  };

  const handleValidateSufficientBalance = async (amount: number) => {
    if (!wallet?.address) {
      throw new Error('Wallet not connected');
    }

    return validateSufficientBalance(wallet.address, amount);
  };

  // Check for existing wallet connection on mount
  useEffect(() => {
    const savedWallet = localStorage.getItem('wallet');
    if (savedWallet && !currentWallet.isConnected) {
      try {
        const parsedWallet = JSON.parse(savedWallet);
        // Only restore if we have a valid wallet address
        if (parsedWallet.address && parsedWallet.address.startsWith('0x')) {
          setWallet(parsedWallet);
        }
      } catch (error) {
        console.error('Failed to parse saved wallet:', error);
        localStorage.removeItem('wallet');
      }
    }
  }, [currentWallet.isConnected]);

  return (
    <WalletContext.Provider value={{ 
      wallet, 
      connect, 
      disconnect, 
      isLoading: isLoading || connectWallet.isPending || disconnectWallet.isPending,
      // Blockchain methods
      executeBuyTransaction: handleBuyTransaction,
      executeSellTransaction: handleSellTransaction,
      validateSufficientBalance: handleValidateSufficientBalance,
      calculateMarketplaceFee,
      calculateSellerAmount,
    }}>
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