import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/hooks/useWallet';
import { useSuiClient } from '@mysten/dapp-kit';
import { 
  createListingWithBlockchain, 
  confirmUnlisting, 
  confirmEditListing 
} from '@/lib/api';
import { Loader2, DollarSign, Edit, X, CheckCircle } from 'lucide-react';

interface NFTForCompleteFlow {
  id: string;
  sui_object_id?: string;
  title: string;
  price: number;
  is_listed: boolean;
  owner_wallet_address: string;
  blockchain_listing_id?: string; // The blockchain listing object ID
}

interface CompleteListingFlowProps {
  nft: NFTForCompleteFlow;
  onUpdate?: () => void;
}

/**
 * Complete listing/unlisting/edit flow that properly integrates with blockchain
 */
export function CompleteListingFlow({ nft, onUpdate }: CompleteListingFlowProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [newPrice, setNewPrice] = useState(nft.price.toString());
  const [isEditing, setIsEditing] = useState(false);
  const [flowStep, setFlowStep] = useState<string>('');
  
  const { 
    wallet, 
    executeListNFTTransaction, 
    executeUnlistNFTTransaction, 
    executeEditListingTransaction 
  } = useWallet();
  const suiClient = useSuiClient();
  const { toast } = useToast();

  // Complete blockchain-first listing flow
  const handleListNFT = async () => {
    if (!wallet?.address || !nft.sui_object_id) {
      toast({
        title: "Error",
        description: "Wallet not connected or NFT not minted on blockchain",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setFlowStep('Starting blockchain-first listing...');

    try {
      const price = parseFloat(newPrice);
      if (isNaN(price) || price <= 0) {
        throw new Error("Please enter a valid price");
      }

      // Step 1: Execute blockchain transaction FIRST
      setFlowStep('Step 1: Executing blockchain listing transaction...');
      toast({
        title: "Listing on blockchain...",
        description: "Please confirm the transaction in your wallet",
      });

      const txResult = await executeListNFTTransaction({
        nftObjectId: nft.sui_object_id,
        price: price,
        sellerAddress: wallet.address
      });

      if (!txResult.success) {
        throw new Error(txResult.error || 'Blockchain transaction failed');
      }

      console.log('Blockchain transaction successful:', txResult.txId);

      // Step 2: Extract blockchain listing object ID
      setFlowStep('Step 2: Extracting blockchain listing ID...');
      let blockchainListingId = txResult.blockchainListingId;
      
      if (!blockchainListingId) {
        console.warn('Listing ID not available in transaction result, using transaction digest as fallback');
        blockchainListingId = txResult.txId; // Fallback
      }

      // Step 3: Create listing in database with blockchain data
      setFlowStep('Step 3: Creating listing in database with blockchain data...');
      toast({
        title: "Saving listing...",
        description: "Updating database with blockchain transaction data",
      });

      await createListingWithBlockchain({
        nft_id: nft.id,
        price: price,
        blockchain_listing_id: blockchainListingId,
        blockchain_tx_id: txResult.txId,
        gas_fee: txResult.gasUsed || 0
      });

      setFlowStep('✅ Blockchain-first listing completed successfully!');
      toast({
        title: "NFT Listed Successfully! 🎉",
        description: `Your NFT is now listed for ${price} SUI on the blockchain`,
      });

      setIsEditing(false);
      onUpdate?.();

    } catch (error) {
      console.error('Error in blockchain-first listing:', error);
      setFlowStep(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Listing failed",
        description: error instanceof Error ? error.message : "Failed to list NFT. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setFlowStep(''), 3000);
    }
  };

  // Complete blockchain-first unlisting flow
  const handleUnlistNFT = async () => {
    if (!wallet?.address) {
      toast({
        title: "Error",
        description: "Wallet not connected",
        variant: "destructive"
      });
      return;
    }

    if (!nft.blockchain_listing_id) {
      toast({
        title: "Error",
        description: "Blockchain listing ID not found. Cannot unlist from blockchain.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setFlowStep('Starting blockchain-first unlisting...');

    try {
      // Step 1: Execute blockchain transaction FIRST
      setFlowStep('Step 1: Executing blockchain unlisting transaction...');
      toast({
        title: "Unlisting from blockchain...",
        description: "Please confirm the transaction in your wallet",
      });

      const txResult = await executeUnlistNFTTransaction({
        nftObjectId: nft.sui_object_id,
        sellerAddress: wallet.address
      });

      if (!txResult.success) {
        throw new Error(txResult.error || 'Blockchain transaction failed');
      }

      // Step 2: Confirm unlisting in database
      setFlowStep('Step 2: Confirming unlisting in database...');
      toast({
        title: "Updating database...",
        description: "Recording unlisting transaction",
      });

      await confirmUnlisting(
        nft.id, // Database NFT/listing ID
        txResult.txId,
        txResult.gasUsed || 0
      );

      setFlowStep('✅ Blockchain-first unlisting completed successfully!');
      toast({
        title: "NFT Unlisted Successfully! ✅",
        description: "Your NFT has been removed from the blockchain marketplace",
      });

      onUpdate?.();

    } catch (error) {
      console.error('Error in blockchain-first unlisting:', error);
      setFlowStep(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Unlisting failed",
        description: error instanceof Error ? error.message : "Failed to unlist NFT. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setFlowStep(''), 3000);
    }
  };

  // Complete blockchain-first edit listing flow
  const handleEditListing = async () => {
    if (!wallet?.address) {
      toast({
        title: "Error",
        description: "Wallet not connected",
        variant: "destructive"
      });
      return;
    }

    if (!nft.blockchain_listing_id) {
      toast({
        title: "Error",
        description: "Blockchain listing ID not found. Cannot edit listing on blockchain.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setFlowStep('Starting blockchain-first edit listing...');

    try {
      const price = parseFloat(newPrice);
      if (isNaN(price) || price <= 0) {
        throw new Error("Please enter a valid price");
      }

      // Step 1: Execute blockchain transaction FIRST
      setFlowStep('Step 1: Executing blockchain edit transaction...');
      toast({
        title: "Updating listing on blockchain...",
        description: "Please confirm the transaction in your wallet",
      });

      const txResult = await executeEditListingTransaction({
        nftObjectId: nft.sui_object_id,
        newPrice: price,
        sellerAddress: wallet.address
      });

      if (!txResult.success) {
        throw new Error(txResult.error || 'Blockchain transaction failed');
      }

      // Step 2: Confirm edit in database
      setFlowStep('Step 2: Confirming edit in database...');
      toast({
        title: "Updating database...",
        description: "Recording price update transaction",
      });

      await confirmEditListing(
        nft.id, // Database NFT/listing ID
        price,
        txResult.txId,
        txResult.gasUsed || 0
      );

      setFlowStep('✅ Blockchain-first edit completed successfully!');
      toast({
        title: "Listing Updated Successfully! 🎉",
        description: `Price updated to ${price} SUI on the blockchain`,
      });

      setIsEditing(false);
      onUpdate?.();

    } catch (error) {
      console.error('Error in blockchain-first edit:', error);
      setFlowStep(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Edit failed",
        description: error instanceof Error ? error.message : "Failed to edit listing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setFlowStep(''), 3000);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          Complete Blockchain Flow
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Blockchain-first listing/unlisting/edit with proper smart contract integration
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Flow Status */}
        {flowStep && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">{flowStep}</p>
          </div>
        )}

        {/* NFT Info */}
        <div className="space-y-2">
          <h3 className="font-semibold">{nft.title}</h3>
          <p className="text-sm text-muted-foreground">
            Status: {nft.is_listed ? 'Listed' : 'Unlisted'}
          </p>
          {nft.is_listed && (
            <p className="text-sm">Current Price: {nft.price} SUI</p>
          )}
          {nft.blockchain_listing_id && (
            <p className="text-xs text-muted-foreground">
              Blockchain ID: {nft.blockchain_listing_id.slice(0, 8)}...
            </p>
          )}
        </div>

        {/* Controls */}
        {!nft.is_listed ? (
          <div className="space-y-2">
            <Input
              type="number"
              placeholder="Price in SUI"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              disabled={isProcessing}
              min="0"
              step="0.01"
            />
            <Button
              onClick={handleListNFT}
              disabled={isProcessing || !wallet?.address}
              className="w-full flex items-center gap-2"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <DollarSign className="w-4 h-4" />
              )}
              {isProcessing ? 'Processing...' : 'List on Blockchain'}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {isEditing ? (
              <>
                <Input
                  type="number"
                  placeholder="New price in SUI"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  disabled={isProcessing}
                  min="0"
                  step="0.01"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleEditListing}
                    disabled={isProcessing || !nft.blockchain_listing_id}
                    className="flex-1 flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Edit className="w-4 h-4" />
                    )}
                    {isProcessing ? 'Updating...' : 'Update on Blockchain'}
                  </Button>
                  <Button
                    onClick={() => setIsEditing(false)}
                    variant="outline"
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  className="flex-1 flex items-center gap-2"
                  disabled={!nft.blockchain_listing_id}
                >
                  <Edit className="w-4 h-4" />
                  Edit Price
                </Button>
                <Button
                  onClick={handleUnlistNFT}
                  disabled={isProcessing || !nft.blockchain_listing_id}
                  variant="destructive"
                  className="flex-1 flex items-center gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  {isProcessing ? 'Processing...' : 'Unlist from Blockchain'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Blockchain Status */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Blockchain Integration:</strong> ✅ Full smart contract integration</p>
          <p><strong>Flow:</strong> Blockchain → Database (proper order)</p>
          {!nft.blockchain_listing_id && nft.is_listed && (
            <p className="text-orange-600"><strong>Warning:</strong> Missing blockchain listing ID</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
