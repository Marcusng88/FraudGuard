import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/hooks/useWallet';
import { confirmListing, confirmUnlisting, confirmEditListing, createListing } from '@/lib/api';
import { Loader2, DollarSign, Edit, X, CheckCircle } from 'lucide-react';

interface NFTForDemo {
  id: string;
  sui_object_id?: string;
  title: string;
  price: number;
  is_listed: boolean;
  owner_wallet_address: string;
}

interface ListingFlowDemoProps {
  nft: NFTForDemo;
  onUpdate?: () => void;
}

/**
 * Demonstration component showing the complete listing/unlisting/edit flow
 * that follows the same pattern as NFT minting:
 * 1. Frontend creates record in database
 * 2. Frontend calls smart contract
 * 3. Smart contract emits events
 * 4. Frontend processes transaction results
 * 5. Frontend calls backend to confirm with blockchain data
 */
export function ListingFlowDemo({ nft, onUpdate }: ListingFlowDemoProps) {
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
  const { toast } = useToast();

  // Complete listing flow following NFT minting pattern
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
    setFlowStep('Starting listing flow...');

    try {
      const price = parseFloat(newPrice);
      if (isNaN(price) || price <= 0) {
        throw new Error("Please enter a valid price");
      }

      // Step 1: Create listing record in database (same as NFT creation step)
      setFlowStep('Step 1: Creating listing in database...');
      toast({
        title: "Creating listing...",
        description: "Preparing listing in database",
      });

      const listingResponse = await createListing({
        nft_id: nft.id,
        price: price,
        expires_at: null,
        listing_metadata: {
          title: nft.title,
          created_via: "listing_flow_demo"
        }
      });

      // Step 2: Execute blockchain transaction (same as NFT minting step)
      setFlowStep('Step 2: Executing blockchain transaction...');
      toast({
        title: "Listing on blockchain...",
        description: "Please confirm the transaction in your wallet",
      });

      const txResult = await executeListNFTTransaction({
        nftId: nft.sui_object_id,
        price: price,
        sellerAddress: wallet.address
      });

      if (!txResult.success) {
        throw new Error(txResult.error || 'Blockchain transaction failed');
      }

      // Step 3: Smart contract emits events (automatic)
      setFlowStep('Step 3: Smart contract emitted events');

      // Step 4: Process transaction results (same as NFT minting step)
      setFlowStep('Step 4: Processing transaction results...');

      // Step 5: Confirm listing in database (same as NFT mint confirmation)
      setFlowStep('Step 5: Confirming listing with blockchain data...');
      toast({
        title: "Confirming listing...",
        description: "Updating database with blockchain transaction data",
      });

      await confirmListing(
        listingResponse.id,
        txResult.txId,
        txResult.blockchainListingId, // Pass the extracted blockchain listing ID
        txResult.gasUsed || 0 // Use actual gas used from transaction
      );

      setFlowStep('✅ Listing flow completed successfully!');
      toast({
        title: "NFT Listed Successfully! 🎉",
        description: `Your NFT is now listed for ${price} SUI`,
      });

      setIsEditing(false);
      onUpdate?.();

    } catch (error) {
      console.error('Error in listing flow:', error);
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

  // Complete unlisting flow
  const handleUnlistNFT = async () => {
    if (!wallet?.address) {
      toast({
        title: "Error",
        description: "Wallet not connected",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setFlowStep('Starting unlisting flow...');

    try {
      // Step 1: Execute blockchain transaction
      setFlowStep('Step 1: Executing blockchain unlisting...');
      toast({
        title: "Unlisting from blockchain...",
        description: "Please confirm the transaction in your wallet",
      });

      const txResult = await executeUnlistNFTTransaction({
        listingId: nft.id, // In production, this would be the blockchain listing ID
        sellerAddress: wallet.address
      });

      if (!txResult.success) {
        throw new Error(txResult.error || 'Blockchain transaction failed');
      }

      // Step 2: Smart contract emits events (automatic)
      setFlowStep('Step 2: Smart contract emitted events');

      // Step 3: Confirm unlisting in database
      setFlowStep('Step 3: Confirming unlisting in database...');
      toast({
        title: "Confirming unlisting...",
        description: "Updating database with blockchain transaction data",
      });

      await confirmUnlisting(
        nft.id, // In production, this would be the database listing ID
        txResult.txId,
        0 // gas_fee
      );

      setFlowStep('✅ Unlisting flow completed successfully!');
      toast({
        title: "NFT Unlisted Successfully! ✅",
        description: "Your NFT has been removed from the marketplace",
      });

      onUpdate?.();

    } catch (error) {
      console.error('Error in unlisting flow:', error);
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

  // Complete edit listing flow
  const handleEditListing = async () => {
    if (!wallet?.address) {
      toast({
        title: "Error",
        description: "Wallet not connected",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setFlowStep('Starting edit listing flow...');

    try {
      const price = parseFloat(newPrice);
      if (isNaN(price) || price <= 0) {
        throw new Error("Please enter a valid price");
      }

      // Step 1: Execute blockchain transaction
      setFlowStep('Step 1: Executing blockchain edit...');
      toast({
        title: "Updating listing on blockchain...",
        description: "Please confirm the transaction in your wallet",
      });

      const txResult = await executeEditListingTransaction({
        listingId: nft.id, // In production, this would be the blockchain listing ID
        newPrice: price
      });

      if (!txResult.success) {
        throw new Error(txResult.error || 'Blockchain transaction failed');
      }

      // Step 2: Smart contract emits events (automatic)
      setFlowStep('Step 2: Smart contract emitted events');

      // Step 3: Confirm edit in database
      setFlowStep('Step 3: Confirming edit in database...');
      toast({
        title: "Confirming price update...",
        description: "Updating database with new price",
      });

      await confirmEditListing(
        nft.id, // In production, this would be the database listing ID
        price,
        txResult.txId,
        0 // gas_fee
      );

      setFlowStep('✅ Edit listing flow completed successfully!');
      toast({
        title: "Listing Updated Successfully! 🎉",
        description: `Price updated to ${price} SUI`,
      });

      setIsEditing(false);
      onUpdate?.();

    } catch (error) {
      console.error('Error in edit listing flow:', error);
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
          Listing Flow Demo
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Demonstrates the complete blockchain + database sync flow
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
              {isProcessing ? 'Processing...' : 'List NFT'}
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
                    disabled={isProcessing}
                    className="flex-1 flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Edit className="w-4 h-4" />
                    )}
                    {isProcessing ? 'Updating...' : 'Update'}
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
                >
                  <Edit className="w-4 h-4" />
                  Edit Price
                </Button>
                <Button
                  onClick={handleUnlistNFT}
                  disabled={isProcessing}
                  variant="destructive"
                  className="flex-1 flex items-center gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  {isProcessing ? 'Processing...' : 'Unlist'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
