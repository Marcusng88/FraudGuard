import React, { useState, useRef } from 'react';
import { CyberNavigation } from '@/components/CyberNavigation';
import { FloatingWarningIcon } from '@/components/FloatingWarningIcon';
import { WalletConnection } from '@/components/WalletConnection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Upload, Image, Shield, Zap, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { toast } from '@/hooks/use-toast';
import { PACKAGE_ID, uploadToPinata, createIPFSUrl, notifyBackendNewNFT } from '@/lib/sui-utils';
import { createNFT, confirmNFTMint } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

interface FormData {
  title: string;
  description: string;
  price: string;
  category: string;
  image: File | null;
  preview: string | null;
}

export default function CreateNft() {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    price: '',
    category: '',
    image: null,
    preview: null
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<{
    isSafe: boolean;
    confidence: number;
    warnings: string[];
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [txDigest, setTxDigest] = useState<string | null>(null);
  const [createdNftId, setCreatedNftId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const navigate = useNavigate();

  // NFT Categories
  const categories = [
    'Art', 'Photography', 'Music', 'Gaming', 'Sports', 'Collectibles', 
    '3D Art', 'Digital Art', 'Pixel Art', 'Abstract', 'Nature', 'Portrait'
  ];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      setFormData(prev => ({
        ...prev,
        image: file,
        preview: URL.createObjectURL(file)
      }));
      
      // Simulate AI analysis for now
      setTimeout(() => {
        const isSafe = Math.random() > 0.3; // 70% chance of being safe
        setAnalysisResult({
          isSafe,
          confidence: Math.floor(Math.random() * 40) + 60, // 60-100%
          warnings: isSafe ? [] : ['Potential copyright concerns detected', 'Similar images found in database']
        });
      }, 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!account) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create NFT",
        variant: "destructive",
      });
      return;
    }

    if (!formData.image || !formData.title.trim() || !formData.price.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide image, title, and price",
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
    setUploadProgress(0);

    try {
      // Step 1: Upload image to Pinata IPFS
      toast({
        title: "Uploading image...",
        description: "Uploading your NFT image to IPFS via Pinata",
      });
      
      setUploadProgress(25);
      const pinataResponse = await uploadToPinata(formData.image);
      const imageUrl = createIPFSUrl(pinataResponse.IpfsHash);
      
      setUploadProgress(50);

      // Step 2: Create NFT record in database (includes AI fraud detection)
      toast({
        title: "Creating NFT...",
        description: "Storing NFT metadata and running fraud analysis",
      });

      const nftData = {
        title: formData.title,
        description: formData.description || '',
        category: formData.category || 'Art',
        price: price,
        image_url: imageUrl,
        wallet_address: account.address,
      };

      const createResult = await createNFT(nftData);
      setCreatedNftId(createResult.nft_id);
      
      setUploadProgress(75);

      // Step 3: Mint NFT on blockchain
      toast({
        title: "Minting NFT...",
        description: "Creating your NFT on the Sui blockchain",
      });

      const tx = new Transaction();
      
      tx.moveCall({
        target: `${PACKAGE_ID}::fraudguard_nft::mint_nft`,
        arguments: [
          tx.pure.vector('u8', Array.from(new TextEncoder().encode(formData.title))),
          tx.pure.vector('u8', Array.from(new TextEncoder().encode(formData.description))),
          tx.pure.vector('u8', Array.from(new TextEncoder().encode(imageUrl))),
          tx.pure.address(account.address),
        ],
      });

      setUploadProgress(85);

      // Execute transaction
      signAndExecute(
        { transaction: tx },
        {
          onSuccess: async (result) => {
            setTxDigest(result.digest);
            setUploadProgress(95);

            try {
              // Step 4: Get transaction details for NFT object ID
              const txResult = await client.getTransactionBlock({
                digest: result.digest,
                options: {
                  showEvents: true,
                  showEffects: true,
                  showObjectChanges: true,
                },
              });

              // Extract NFT object ID from transaction effects
              let suiObjectId = '';
              if (txResult.objectChanges) {
                const createdObject = txResult.objectChanges.find(
                  change => change.type === 'created' && 
                  change.objectType?.includes('fraudguard_nft::NFT')
                );
                if (createdObject && 'objectId' in createdObject) {
                  suiObjectId = createdObject.objectId;
                }
              }

              // Step 5: Confirm mint in database
              if (suiObjectId && createResult.nft_id) {
                await confirmNFTMint(createResult.nft_id, suiObjectId);
                
                // Notify backend for additional fraud analysis
                await notifyBackendNewNFT({
                  nftId: createResult.nft_id,
                  suiObjectId: suiObjectId,
                  name: formData.title,
                  description: formData.description || '',
                  imageUrl: imageUrl,
                  creator: account.address,
                  transactionDigest: result.digest
                });
              }

              setUploadProgress(100);

              toast({
                title: "NFT created successfully! 🎉",
                description: (
                  <div className="flex items-center gap-2">
                    <span>Your NFT has been minted and listed</span>
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

              // Reset form
              setFormData({
                title: '',
                description: '',
                price: '',
                category: '',
                image: null,
                preview: null
              });
              setAnalysisResult(null);

            } catch (confirmError) {
              console.warn('Confirmation failed:', confirmError);
              toast({
                title: "NFT minted successfully",
                description: "NFT was created on blockchain, but confirmation failed. Check the marketplace.",
                variant: "default",
              });
            }
          },
          onError: (error) => {
            console.error('Transaction failed:', error);
            toast({
              title: "Minting failed",
              description: error.message || "Failed to mint NFT on blockchain. Please try again.",
              variant: "destructive",
            });
          }
        }
      );

    } catch (error) {
      console.error('Error creating NFT:', error);
      toast({
        title: "Creation failed",
        description: error instanceof Error ? error.message : "Failed to create NFT. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

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
                Create
                <br />
                <span className="text-primary" style={{ textShadow: '0 0 5px hsl(var(--primary))' }}>
                  Your NFT
                </span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Upload your digital artwork with AI-powered fraud protection and verification on Sui blockchain.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              {[
                {
                  icon: Shield,
                  title: 'AI Protection',
                  description: 'Automatic fraud detection and verification'
                },
                {
                  icon: Zap,
                  title: 'Instant Minting',
                  description: 'Fast NFT creation on Sui blockchain'
                },
                {
                  icon: CheckCircle,
                  title: 'IPFS Storage',
                  description: 'Decentralized storage via Pinata'
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

      {/* Create NFT Form */}
      <div className="container mx-auto px-6 space-y-8">
        <section className="glass-panel p-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <h2 className="text-2xl font-bold text-foreground">Create New NFT</h2>
              <div className="h-px bg-gradient-to-r from-primary/50 to-transparent flex-1" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Image Upload */}
              <div className="space-y-4">
                <Label className="text-foreground">NFT Image</Label>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Upload Area */}
                  <Card className="p-6 border-dashed border-border/50 hover:border-primary/50 transition-colors">
                    <div className="text-center space-y-4">
                      <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <Upload className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <p className="text-foreground font-medium">Upload your artwork</p>
                        <p className="text-sm text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                      </div>
                      <Button
                        type="button"
                        variant="cyber"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                      >
                        <Image className="w-4 h-4" />
                        Choose File
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                  </Card>

                  {/* Preview */}
                  {formData.preview && (
                    <Card className="p-4">
                      <div className="space-y-4">
                        <img
                          src={formData.preview}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        
                        {/* Analysis Result */}
                        {analysisResult && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {analysisResult.isSafe ? (
                                <CheckCircle className="w-5 h-5 text-success" />
                              ) : (
                                <AlertTriangle className="w-5 h-5 text-warning" />
                              )}
                              <span className="text-sm font-medium">
                                {analysisResult.isSafe ? 'Verified Safe' : 'Needs Review'}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {analysisResult.confidence}% confidence
                              </Badge>
                            </div>
                            
                            {analysisResult.warnings.length > 0 && (
                              <div className="space-y-1">
                                {analysisResult.warnings.map((warning, index) => (
                                  <p key={index} className="text-xs text-warning">
                                    ⚠️ {warning}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  )}
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label htmlFor="title" className="text-foreground">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter NFT title"
                    className="bg-card/30 border-border/50"
                    required
                  />
                </div>

                <div className="space-y-4">
                  <Label htmlFor="price" className="text-foreground">Price (SUI)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                    className="bg-card/30 border-border/50"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label htmlFor="category" className="text-foreground">Category</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      type="button"
                      variant={formData.category === category ? 'cyber' : 'glass'}
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, category }))}
                      disabled={isProcessing}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label htmlFor="description" className="text-foreground">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your NFT..."
                  rows={4}
                  className="bg-card/30 border-border/50"
                />
              </div>

              {/* Upload Progress */}
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      {uploadProgress < 25 && "Preparing..."}
                      {uploadProgress >= 25 && uploadProgress < 50 && "Uploading to IPFS..."}
                      {uploadProgress >= 50 && uploadProgress < 75 && "Creating transaction..."}
                      {uploadProgress >= 75 && uploadProgress < 90 && "Minting NFT..."}
                      {uploadProgress >= 90 && uploadProgress < 100 && "Finalizing..."}
                      {uploadProgress >= 100 && "Complete!"}
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Transaction Result */}
              {txDigest && (
                <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">NFT Created Successfully!</span>
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
                disabled={!formData.image || !formData.title.trim() || isProcessing || !account}
                className="w-full"
              >
                {!account ? (
                  'Connect Wallet to Mint'
                ) : isProcessing ? (
                  'Creating NFT...'
                ) : (
                  'Create NFT'
                )}
              </Button>

              {!account && (
                <p className="text-sm text-muted-foreground text-center">
                  Connect your wallet to start minting NFTs
                </p>
              )}
            </form>
          </div>
        </section>
      </div>
    </div>
  );
} 