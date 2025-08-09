import React, { useState, useEffect } from 'react';
import { CyberNavigation } from '@/components/CyberNavigation';
import { FloatingWarningIcon } from '@/components/FloatingWarningIcon';
import { WalletConnection } from '@/components/WalletConnection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, Edit, DollarSign, CheckCircle, ExternalLink, AlertTriangle } from 'lucide-react';
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { toast } from '@/hooks/use-toast';
import { PACKAGE_ID } from '@/lib/sui-utils';
import { getUserListings, updateListing, confirmEditListing, type Listing, type ListingUpdateRequest } from '@/lib/api';
import { useNavigate, useParams } from 'react-router-dom';

interface EditFormData {
  price: string;
}

export default function EditListing() {
  const { listingId } = useParams<{ listingId: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [formData, setFormData] = useState<EditFormData>({
    price: ''
  });
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
            description: "This listing is not currently active and cannot be edited",
            variant: "destructive",
          });
          navigate('/profile');
          return;
        }

        setListing(targetListing);
        setFormData({
          price: targetListing.price.toString()
        });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!account || !listing) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to edit listing",
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

    if (!formData.price.trim()) {
      toast({
        title: "Price required",
        description: "Please enter a new listing price",
        variant: "destructive",
      });
      return;
    }

    const newPrice = parseFloat(formData.price);
    if (isNaN(newPrice) || newPrice <= 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid price greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (newPrice === listing.price) {
      toast({
        title: "No changes",
        description: "The new price is the same as the current price",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Create blockchain price update transaction
      toast({
        title: "Updating price on blockchain...",
        description: "Updating your NFT listing price on the Sui blockchain",
      });

      const tx = new Transaction();
      
      // Convert price from SUI to MIST (1 SUI = 10^9 MIST)
      const newPriceInMist = Math.floor(newPrice * 1_000_000_000);

      // Edit listing price with sync - this updates the listing object on blockchain
      tx.moveCall({
        target: `${PACKAGE_ID}::marketplace::edit_listing_price_with_sync`,
        arguments: [
          tx.object(listing.listing_id), // The listing object to update
          tx.pure.u64(newPriceInMist), // New price in MIST
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

              // Step 3: Update database with new price
              try {
                await confirmEditListing(
                  listing.id,
                  newPrice,
                  result.digest,
                  0.001 // Estimate gas fee
                );

                toast({
                  title: "Listing updated successfully! 🎉",
                  description: (
                    <div className="flex items-center gap-2">
                      <span>Your NFT price has been updated to {newPrice} SUI</span>
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
                  description: "Price was updated on blockchain, but database update failed. Check your profile.",
                  variant: "default",
                });
              }

            } catch (detailsError) {
              console.error('Error processing price update:', detailsError);
              
              toast({
                title: "Listing updated successfully! 🎉",
                description: (
                  <div className="flex items-center gap-2">
                    <span>Your NFT price has been updated</span>
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
            console.error('Price update transaction failed:', error);
            toast({
              title: "Update failed",
              description: error.message || "Failed to update listing price on blockchain. Please try again.",
              variant: "destructive",
            });
          }
        }
      );

    } catch (error) {
      console.error('Error updating listing:', error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update listing. Please try again.",
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
                Edit
                <br />
                <span className="text-primary" style={{ textShadow: '0 0 5px hsl(var(--primary))' }}>
                  Listing
                </span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Update the price of your NFT listing in the marketplace.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              {[
                {
                  icon: DollarSign,
                  title: 'Update Price',
                  description: 'Change your listing price to match market conditions'
                },
                {
                  icon: Edit,
                  title: 'Instant Update',
                  description: 'Changes take effect immediately on the blockchain'
                },
                {
                  icon: CheckCircle,
                  title: 'Stay Listed',
                  description: 'Your NFT remains available for purchase'
                }
              ].map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div 
                    key={feature.title}
                    className="glass-panel p-6 hover-glow group"
                    style={{ animationDelay: `${index * 200}ms` }}
                  >
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg group-hover:shadow-cyber transition-all duration-300">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-foreground">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Edit Listing Form */}
      <div className="container mx-auto px-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Listing Preview */}
          <section className="glass-panel p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-foreground">Current Listing</h2>
                <div className="h-px bg-gradient-to-r from-primary/50 to-transparent flex-1" />
              </div>

              <Card className="p-6">
                <div className="space-y-4">
                  {listing.nft_image_url && (
                    <img
                      src={listing.nft_image_url}
                      alt={listing.nft_title || 'NFT'}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  )}
                  
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-foreground">
                      {listing.nft_title || 'Untitled NFT'}
                    </h3>
                    
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        Current: {listing.price} SUI
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
            </div>
          </section>

          {/* Edit Form */}
          <section className="glass-panel p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Edit className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Update Price</h2>
                <div className="h-px bg-gradient-to-r from-primary/50 to-transparent flex-1" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Current vs New Price */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Current Price</p>
                    <p className="text-xl font-bold text-foreground">{listing.price} SUI</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">New Price</p>
                    <p className="text-xl font-bold text-primary">
                      {formData.price || '0'} SUI
                    </p>
                  </div>
                </div>

                {/* New Price Input */}
                <div className="space-y-4">
                  <Label htmlFor="price" className="text-foreground">New Listing Price (SUI) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                    className="bg-card/30 border-border/50"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the new price for your NFT listing. Consider market conditions and similar items.
                  </p>
                </div>

                {/* Transaction Result */}
                {txDigest && (
                  <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Listing Updated Successfully!</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Transaction: {txDigest.slice(0, 20)}...
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button
                    type="button"
                    onClick={() => navigate('/profile')}
                    variant="ghost"
                    size="lg"
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    variant="cyber"
                    size="lg"
                    disabled={!formData.price.trim() || isProcessing || !account}
                    className="flex-1"
                  >
                    {!account ? (
                      'Connect Wallet'
                    ) : isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Edit className="w-4 h-4 mr-2" />
                        Update Price
                      </>
                    )}
                  </Button>
                </div>

                {!account && (
                  <p className="text-sm text-muted-foreground text-center">
                    Connect your wallet to edit your listing
                  </p>
                )}

                {/* Warning */}
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-warning">Important Notes</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Price changes take effect immediately on the marketplace</li>
                        <li>• Your NFT will remain available for purchase at the new price</li>
                        <li>• A small transaction fee will be charged for blockchain operations</li>
                        <li>• You can edit the price again at any time</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
