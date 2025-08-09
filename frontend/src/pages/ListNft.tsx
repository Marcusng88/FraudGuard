import React, { useState, useEffect } from 'react';
import { CyberNavigation } from '@/components/CyberNavigation';
import { FloatingWarningIcon } from '@/components/FloatingWarningIcon';
import { WalletConnection } from '@/components/WalletConnection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, DollarSign, Tag, Clock, CheckCircle, ExternalLink, AlertTriangle } from 'lucide-react';
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { toast } from '@/hooks/use-toast';
import { PACKAGE_ID } from '@/lib/sui-utils';
import { getUserNFTs, createListing, confirmListing, type ListingCreateRequest } from '@/lib/api';
import { useNavigate, useParams } from 'react-router-dom';

interface NFT {
  id: string;
  title: string;
  description?: string;
  category: string;
  image_url: string;
  sui_object_id?: string;
  is_listed?: boolean;
  listing_price?: number;
  created_at: string;
}

interface ListingFormData {
  price: string;
  expiresAt?: string; // Optional expiration date
}

export default function ListNft() {
  const { nftId } = useParams<{ nftId: string }>();
  const [nft, setNft] = useState<NFT | null>(null);
  const [formData, setFormData] = useState<ListingFormData>({
    price: '',
    expiresAt: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [txDigest, setTxDigest] = useState<string | null>(null);
  const [listingId, setListingId] = useState<string | null>(null);
  
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const navigate = useNavigate();

  // Load NFT details
  useEffect(() => {
    const loadNFT = async () => {
      if (!account?.address || !nftId) return;

      try {
        setIsLoading(true);
        const userNFTsResponse = await getUserNFTs(account.address);
        const targetNFT = userNFTsResponse.nfts.find(nft => nft.id === nftId);
        
        if (!targetNFT) {
          toast({
            title: "NFT not found",
            description: "The specified NFT was not found or you don't own it",
            variant: "destructive",
          });
          navigate('/profile');
          return;
        }

        if (targetNFT.is_listed) {
          toast({
            title: "NFT already listed",
            description: "This NFT is already listed for sale",
            variant: "destructive",
          });
          navigate('/profile');
          return;
        }

        setNft(targetNFT);
      } catch (error) {
        console.error('Error loading NFT:', error);
        toast({
          title: "Error loading NFT",
          description: "Failed to load NFT details. Please try again.",
          variant: "destructive",
        });
        navigate('/profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadNFT();
  }, [account?.address, nftId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!account || !nft) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to list NFT",
        variant: "destructive",
      });
      return;
    }

    if (!nft.sui_object_id) {
      toast({
        title: "Invalid NFT",
        description: "NFT doesn't have a valid blockchain object ID",
        variant: "destructive",
      });
      return;
    }

    if (!formData.price.trim()) {
      toast({
        title: "Price required",
        description: "Please enter a listing price",
        variant: "destructive",
      });
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid price greater than 0",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Create listing record in database
      toast({
        title: "Creating listing...",
        description: "Preparing your NFT listing in the marketplace",
      });

      const expiresAt = formData.expiresAt 
        ? new Date(formData.expiresAt).toISOString()
        : undefined;

      const createResult = await createListing({
        nft_id: nft.id,
        price: price,
        expires_at: expiresAt,
        listing_metadata: {
          title: nft.title,
          description: nft.description,
          category: nft.category,
          image_url: nft.image_url
        }
      } as ListingCreateRequest);

      setListingId(createResult.id);

      // Step 2: Create blockchain listing transaction
      toast({
        title: "Listing on blockchain...",
        description: "Creating marketplace listing on the Sui blockchain",
      });

      const tx = new Transaction();
      
      // Convert price from SUI to MIST (1 SUI = 10^9 MIST)
      const priceInMist = Math.floor(price * 1_000_000_000);

      // List NFT with sync - this creates a listing object on blockchain
      tx.moveCall({
        target: `${PACKAGE_ID}::marketplace::list_nft_with_sync`,
        arguments: [
          tx.object(nft.sui_object_id), // The NFT object
          tx.pure.u64(priceInMist), // Price in MIST
        ],
      });

      // Execute transaction
      signAndExecute(
        { transaction: tx },
        {
          onSuccess: async (result) => {
            setTxDigest(result.digest);

            try {
              // Step 3: Wait for transaction confirmation and extract listing object ID
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for indexing

              const txResult = await client.getTransactionBlock({
                digest: result.digest,
                options: {
                  showEvents: true,
                  showObjectChanges: true,
                },
              });

              // Extract blockchain listing ID from transaction
              let blockchainListingId = '';
              
              // Method 1: Look for created Listing objects
              if (txResult.objectChanges) {
                const createdListing = txResult.objectChanges.find(
                  change => change.type === 'created' && 
                  'objectType' in change && 
                  change.objectType && 
                  change.objectType.includes('::marketplace::Listing')
                );
                
                if (createdListing && 'objectId' in createdListing) {
                  blockchainListingId = createdListing.objectId;
                }
              }

              // Method 2: Look for NFTListed events
              if (!blockchainListingId && txResult.events) {
                const listedEvent = txResult.events.find(
                  event => event.type?.includes('NFTListed') || 
                          event.type?.includes('marketplace::NFTListed')
                );
                if (listedEvent && listedEvent.parsedJson) {
                  const parsedEvent = listedEvent.parsedJson as { listing_id?: string };
                  if (parsedEvent.listing_id) {
                    blockchainListingId = parsedEvent.listing_id;
                  }
                }
              }

              // Step 4: Confirm listing in database
              if (createResult.id) {
                try {
                  await confirmListing(
                    createResult.id,
                    result.digest,
                    blockchainListingId || result.digest, // Fallback to tx digest
                    0.001 // Estimate, will be calculated by backend
                  );

                  toast({
                    title: "NFT listed successfully! 🎉",
                    description: (
                      <div className="flex items-center gap-2">
                        <span>Your NFT is now available in the marketplace</span>
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

                  // Navigate to marketplace after a short delay
                  setTimeout(() => {
                    navigate('/marketplace');
                  }, 2000);

                } catch (confirmError) {
                  console.error('Error confirming listing:', confirmError);
                  toast({
                    title: "Listing confirmation failed",
                    description: "NFT was listed on blockchain, but database update failed. Check the marketplace.",
                    variant: "default",
                  });
                }
              }

            } catch (detailsError) {
              console.error('Error getting transaction details:', detailsError);
              
              // Even if we can't get details, the listing was created
              toast({
                title: "NFT listed successfully! 🎉",
                description: (
                  <div className="flex items-center gap-2">
                    <span>Your NFT is now available in the marketplace</span>
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

              // Navigate to marketplace
              setTimeout(() => {
                navigate('/marketplace');
              }, 2000);
            }
          },
          onError: (error) => {
            console.error('Listing transaction failed:', error);
            toast({
              title: "Listing failed",
              description: error.message || "Failed to list NFT on blockchain. Please try again.",
              variant: "destructive",
            });
          }
        }
      );

    } catch (error) {
      console.error('Error listing NFT:', error);
      toast({
        title: "Listing failed",
        description: error instanceof Error ? error.message : "Failed to list NFT. Please try again.",
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
              <span className="text-lg">Loading NFT details...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!nft) {
    return (
      <div className="min-h-screen bg-background">
        <CyberNavigation />
        <div className="container mx-auto px-6 py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">NFT not found</h2>
            <p className="text-muted-foreground mb-6">The specified NFT was not found or you don't have access to it.</p>
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
                List Your
                <br />
                <span className="text-primary" style={{ textShadow: '0 0 5px hsl(var(--primary))' }}>
                  NFT
                </span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Set your price and make your NFT available for purchase in our secure marketplace.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              {[
                {
                  icon: DollarSign,
                  title: 'Set Your Price',
                  description: 'Choose the perfect listing price for your NFT'
                },
                {
                  icon: Tag,
                  title: 'Instant Listing',
                  description: 'List your NFT on the marketplace immediately'
                },
                {
                  icon: Clock,
                  title: 'Optional Expiration',
                  description: 'Set an expiration date for your listing'
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

      {/* List NFT Form */}
      <div className="container mx-auto px-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* NFT Preview */}
          <section className="glass-panel p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-foreground">NFT Preview</h2>
                <div className="h-px bg-gradient-to-r from-primary/50 to-transparent flex-1" />
              </div>

              <Card className="p-6">
                <div className="space-y-4">
                  <img
                    src={nft.image_url}
                    alt={nft.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-foreground">{nft.title}</h3>
                    
                    {nft.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {nft.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{nft.category}</Badge>
                      <Badge variant="outline" className="text-xs">
                        Created {new Date(nft.created_at).toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* Listing Form */}
          <section className="glass-panel p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-foreground">Listing Details</h2>
                <div className="h-px bg-gradient-to-r from-primary/50 to-transparent flex-1" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Price Input */}
                <div className="space-y-4">
                  <Label htmlFor="price" className="text-foreground">Listing Price (SUI) *</Label>
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
                    Set a competitive price for your NFT. Consider similar items in the marketplace.
                  </p>
                </div>

                {/* Optional Expiration Date */}
                <div className="space-y-4">
                  <Label htmlFor="expiresAt" className="text-foreground">Expiration Date (Optional)</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                    className="bg-card/30 border-border/50"
                    min={new Date().toISOString().slice(0, 16)} // Minimum is current time
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for no expiration. Your listing will remain active until sold or manually removed.
                  </p>
                </div>

                {/* Transaction Result */}
                {txDigest && (
                  <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">NFT Listed Successfully!</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Transaction: {txDigest.slice(0, 20)}...
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="cyber"
                  size="lg"
                  disabled={!formData.price.trim() || isProcessing || !account}
                  className="w-full"
                >
                  {!account ? (
                    'Connect Wallet to List'
                  ) : isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Listing NFT...
                    </>
                  ) : (
                    'List NFT for Sale'
                  )}
                </Button>

                {!account && (
                  <p className="text-sm text-muted-foreground text-center">
                    Connect your wallet to list your NFT for sale
                  </p>
                )}

                {/* Warning */}
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-warning">Important Notes</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Once listed, your NFT will be available for immediate purchase</li>
                        <li>• You can unlist or edit the price at any time from your profile</li>
                        <li>• A small transaction fee will be charged for blockchain operations</li>
                        <li>• Marketplace fees may apply when your NFT is sold</li>
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
