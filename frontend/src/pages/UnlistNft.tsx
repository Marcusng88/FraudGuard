import React, { useState, useEffect } from 'react';
import { CyberNavigation } from '@/components/CyberNavigation';
import { FloatingWarningIcon } from '@/components/FloatingWarningIcon';
import { WalletConnection } from '@/components/WalletConnection';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { toast } from '@/hooks/use-toast';
import { PACKAGE_ID } from '@/lib/sui-utils';
import { getUserListings, confirmUnlisting, type Listing } from '@/lib/api';
import { useNavigate, useParams } from 'react-router-dom';

export default function UnlistNft() {
  const { listingId } = useParams<{ listingId: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [txDigest, setTxDigest] = useState<string | null>(null);
  
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const navigate = useNavigate();

  // Load listing details
  useEffect(() => {
    const loadListing = async () => {
      if (!account?.address || !listingId) return;

      try {
        setIsLoading(true);
        const userListings = await getUserListings(account.address);
        const targetListing = userListings.find(listing => listing.id === listingId);
        
        if (!targetListing) {
          toast({
            title: "Listing not found",
            description: "The specified listing was not found or you don't own it",
            variant: "destructive",
          });
          navigate('/profile');
          return;
        }

        if (targetListing.status !== 'active') {
          toast({
            title: "Listing not active",
            description: "This listing is not currently active and cannot be unlisted",
            variant: "destructive",
          });
          navigate('/profile');
          return;
        }

        setListing(targetListing);
      } catch (error) {
        console.error('Error loading listing:', error);
        toast({
          title: "Error loading listing",
          description: "Failed to load listing details. Please try again.",
          variant: "destructive",
        });
        navigate('/profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadListing();
  }, [account?.address, listingId, navigate]);

  const handleUnlist = async () => {
    if (!account || !listing) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to unlist NFT",
        variant: "destructive",
      });
      return;
    }

    if (!listing.listing_id) {
      toast({
        title: "Invalid listing",
        description: "Listing doesn't have a valid blockchain listing ID",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Create blockchain unlisting transaction
      toast({
        title: "Unlisting from blockchain...",
        description: "Removing your NFT listing from the blockchain",
      });

      const tx = new Transaction();
      
      // Unlist NFT with sync - this removes the listing object from blockchain
      tx.moveCall({
        target: `${PACKAGE_ID}::marketplace::unlist_nft_with_sync`,
        arguments: [
          tx.object(listing.listing_id), // The listing object to cancel
        ],
      });

      // Execute transaction
      signAndExecute(
        { transaction: tx },
        {
          onSuccess: async (result) => {
            setTxDigest(result.digest);

            try {
              // Step 2: Wait for transaction confirmation
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for indexing

              // Step 3: Update database - confirm unlisting
              try {
                await confirmUnlisting(
                  listing.id,
                  result.digest,
                  0.001 // Estimate gas fee
                );

                toast({
                  title: "NFT unlisted successfully! 🎉",
                  description: (
                    <div className="flex items-center gap-2">
                      <span>Your NFT has been removed from the marketplace</span>
                      <a 
                        href={`https://testnet.suivision.xyz/txblock/${result.digest}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        View Transaction <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ),
                });

                // Navigate to profile after a short delay
                setTimeout(() => {
                  navigate('/profile');
                }, 2000);

              } catch (dbError) {
                console.error('Error updating database:', dbError);
                toast({
                  title: "Database update failed",
                  description: "NFT was unlisted on blockchain, but database update failed. Check your profile.",
                  variant: "default",
                });
              }

            } catch (detailsError) {
              console.error('Error processing unlisting:', detailsError);
              
              toast({
                title: "NFT unlisted successfully! 🎉",
                description: (
                  <div className="flex items-center gap-2">
                    <span>Your NFT has been removed from the marketplace</span>
                    <a 
                      href={`https://testnet.suivision.xyz/txblock/${result.digest}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      View Transaction <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ),
                variant: "default",
              });

              // Navigate to profile
              setTimeout(() => {
                navigate('/profile');
              }, 2000);
            }
          },
          onError: (error) => {
            console.error('Unlisting transaction failed:', error);
            toast({
              title: "Unlisting failed",
              description: error.message || "Failed to unlist NFT on blockchain. Please try again.",
              variant: "destructive",
            });
          }
        }
      );

    } catch (error) {
      console.error('Error unlisting NFT:', error);
      toast({
        title: "Unlisting failed",
        description: error instanceof Error ? error.message : "Failed to unlist NFT. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <CyberNavigation />
        <div className="container mx-auto px-6 py-16">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-lg">Loading listing details...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <CyberNavigation />
        <div className="container mx-auto px-6 py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">Listing not found</h2>
            <p className="text-muted-foreground mb-6">The specified listing was not found or you don't have access to it.</p>
            <Button onClick={() => navigate('/profile')} variant="cyber">
              Go to Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Floating warning icon */}
      <FloatingWarningIcon />
      
      {/* Navigation */}
      <CyberNavigation />
      
      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/5 to-secondary/10" />
        
        {/* Floating orbs */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-accent/30 rounded-full blur-2xl animate-pulse-glow" />

        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />

        <div className="relative z-10 container mx-auto px-6 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Wallet Connection */}
            <div className="flex justify-center mb-6">
              <WalletConnection />
            </div>

            {/* Main headline */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                Unlist
                <br />
                <span className="text-primary" style={{ textShadow: '0 0 5px hsl(var(--primary))' }}>
                  Your NFT
                </span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Remove your NFT from the marketplace and make it unavailable for purchase.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Unlist NFT Form */}
      <div className="container mx-auto px-6 space-y-8">
        <div className="max-w-2xl mx-auto">
          <section className="glass-panel p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <X className="w-6 h-6 text-destructive" />
                <h2 className="text-2xl font-bold text-foreground">Unlist NFT</h2>
                <div className="h-px bg-gradient-to-r from-primary/50 to-transparent flex-1" />
              </div>

              {/* NFT and Listing Details */}
              <Card className="p-6">
                <div className="space-y-4">
                  {listing.nft_image_url && (
                    <img
                      src={listing.nft_image_url}
                      alt={listing.nft_title || 'NFT'}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}
                  
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-foreground">
                      {listing.nft_title || 'Untitled NFT'}
                    </h3>
                    
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        {listing.price} SUI
                      </Badge>
                      <Badge variant="outline" className="text-success">
                        {listing.status}
                      </Badge>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <p>Listed: {new Date(listing.created_at).toLocaleDateString()}</p>
                      {listing.updated_at && listing.updated_at !== listing.created_at && (
                        <p>Last updated: {new Date(listing.updated_at).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Warning */}
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-warning">Unlisting Confirmation</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Your NFT will be removed from the marketplace immediately</li>
                      <li>• Buyers will no longer be able to purchase this NFT</li>
                      <li>• You can re-list your NFT at any time with a new price</li>
                      <li>• A small transaction fee will be charged for blockchain operations</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Transaction Result */}
              {txDigest && (
                <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">NFT Unlisted Successfully!</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Transaction: {txDigest.slice(0, 20)}...
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  onClick={() => navigate('/profile')}
                  variant="ghost"
                  size="lg"
                  disabled={isProcessing}
                  className="flex-1"
                >
                  Cancel
                </Button>

                <Button
                  onClick={handleUnlist}
                  variant="destructive"
                  size="lg"
                  disabled={isProcessing || !account}
                  className="flex-1"
                >
                  {!account ? (
                    'Connect Wallet'
                  ) : isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Unlisting...
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Unlist NFT
                    </>
                  )}
                </Button>
              </div>

              {!account && (
                <p className="text-sm text-muted-foreground text-center">
                  Connect your wallet to unlist your NFT
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
