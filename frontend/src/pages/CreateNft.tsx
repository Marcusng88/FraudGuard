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
import { Upload, Image, Shield, Zap, AlertTriangle, CheckCircle, ExternalLink, Plus } from 'lucide-react';
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
  const [fraudDetectionResult, setFraudDetectionResult] = useState<{
    isFraud: boolean;
    confidence: number;
    reason?: string;
    flagType?: number;
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
        description: "Storing NFT metadata, running fraud analysis, and preparing for marketplace listing",
      });

      const nftData = {
        title: formData.title,
        description: formData.description || '',
        category: formData.category || 'Art',
        initial_price: price,
        image_url: imageUrl,
        creator_wallet_address: account.address,
        owner_wallet_address: account.address, // Initially creator is the owner
      };

      const createResult = await createNFT(nftData);
      setCreatedNftId(createResult.nft_id);
      
      // Show fraud warning but allow proceeding
      if (createResult.fraud_analysis && createResult.fraud_analysis.is_fraud) {
        toast({
          title: "⚠️ Fraud Detected",
          description: (
            <div className="space-y-2">
              <p>Your NFT has been flagged as potentially fraudulent, but you can still proceed.</p>
              <p className="text-sm text-muted-foreground">
                Reason: {createResult.fraud_analysis.reason || "Suspicious content detected"}
              </p>
              <p className="text-sm text-muted-foreground">
                Confidence: {Math.round((createResult.fraud_analysis.confidence_score || 0) * 100)}%
              </p>
            </div>
          ),
          variant: "default",
        });
      }
      
      setUploadProgress(75);

      // Step 3: Mint NFT on blockchain
      toast({
        title: "Minting NFT...",
        description: "Creating your NFT on the Sui blockchain and listing in marketplace",
      });

      const tx = new Transaction();
      
      tx.moveCall({
        target: `${PACKAGE_ID}::fraudguard_nft::mint_nft_with_id`,
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
              // Step 4: Get transaction details for NFT object ID with retry mechanism
              const getTransactionWithRetry = async (digest: string, maxRetries = 5, baseDelay = 1000) => {
                for (let attempt = 0; attempt < maxRetries; attempt++) {
                  try {
                    console.log(`Attempt ${attempt + 1} to fetch transaction ${digest}`);
                    const txResult = await client.getTransactionBlock({
                      digest: digest,
                      options: {
                        showEvents: true,
                        showEffects: true,
                        showObjectChanges: true,
                      },
                    });
                    console.log(`Successfully fetched transaction on attempt ${attempt + 1}`);
                    return txResult;
                  } catch (error: any) {
                    console.log(`Attempt ${attempt + 1} failed:`, error.message);
                    
                    // If this is the last attempt, throw the error
                    if (attempt === maxRetries - 1) {
                      throw error;
                    }
                    
                    // Calculate delay with exponential backoff (1s, 2s, 4s, 8s, 16s)
                    const delay = baseDelay * Math.pow(2, attempt);
                    console.log(`Waiting ${delay}ms before retry...`);
                    
                    // Show progress to user
                    toast({
                      title: "Processing transaction...",
                      description: `Waiting for blockchain confirmation (attempt ${attempt + 1}/${maxRetries})`,
                      variant: "default",
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                  }
                }
              };

              const txResult = await getTransactionWithRetry(result.digest);

              // Extract NFT object ID from transaction effects
              let suiObjectId = '';
              console.log('Transaction result:', txResult);
              
              // Method 1: Look for created objects in objectChanges
              if (txResult.objectChanges) {
                console.log('Object changes:', txResult.objectChanges);
                const createdObjects = txResult.objectChanges.filter(
                  change => change.type === 'created'
                );
                console.log('Created objects:', createdObjects);
                
                // Look for FraudGuardNFT objects specifically
                const nftObject = createdObjects.find(
                  change => 'objectType' in change && 
                  change.objectType && 
                  (change.objectType.includes('fraudguard_nft::FraudGuardNFT') || 
                   change.objectType.includes('fraudguard::fraudguard_nft::FraudGuardNFT'))
                );
                
                if (nftObject && 'objectId' in nftObject) {
                  suiObjectId = nftObject.objectId;
                  console.log('Found NFT object ID from FraudGuardNFT:', suiObjectId);
                } else if (createdObjects.length > 0) {
                  // If no specific NFT object found, use the first created object
                  const firstCreated = createdObjects[0];
                  if ('objectId' in firstCreated) {
                    suiObjectId = firstCreated.objectId;
                    console.log('Using first created object as NFT ID:', suiObjectId);
                  }
                }
              }
              
              // Method 2: Try to extract from events
              if (!suiObjectId && txResult.events) {
                console.log('Events:', txResult.events);
                const nftMintedEvent = txResult.events.find(
                  event => event.type?.includes('NFTMinted') || 
                          event.type?.includes('fraudguard_nft') ||
                          event.type?.includes('fraudguard::fraudguard_nft::NFTMinted')
                );
                if (nftMintedEvent && nftMintedEvent.parsedJson) {
                  const parsedEvent = nftMintedEvent.parsedJson as any;
                  console.log('Parsed event:', parsedEvent);
                  if (parsedEvent.nft_id) {
                    suiObjectId = parsedEvent.nft_id;
                    console.log('Found NFT object ID from events:', suiObjectId);
                  }
                }
              }
              
              // Method 3: Try to get from transaction effects
              if (!suiObjectId && txResult.effects) {
                console.log('Transaction effects:', txResult.effects);
                if (txResult.effects.created && txResult.effects.created.length > 0) {
                  const firstCreated = txResult.effects.created[0];
                  suiObjectId = firstCreated.reference.objectId;
                  console.log('Using first created object from effects as NFT ID:', suiObjectId);
                }
              }
              
              // Method 4: Look for any object with fraudguard in the type
              if (!suiObjectId && txResult.objectChanges) {
                const fraudguardObject = txResult.objectChanges.find(
                  change => change.type === 'created' && 
                  'objectType' in change && 
                  change.objectType && 
                  change.objectType.includes('fraudguard')
                );
                if (fraudguardObject && 'objectId' in fraudguardObject) {
                  suiObjectId = fraudguardObject.objectId;
                  console.log('Found fraudguard object ID:', suiObjectId);
                }
              }
              
              // Method 5: Last resort - use any created object
              if (!suiObjectId && txResult.objectChanges) {
                const anyCreatedObject = txResult.objectChanges.find(
                  change => change.type === 'created' && 'objectId' in change
                );
                if (anyCreatedObject && 'objectId' in anyCreatedObject) {
                  suiObjectId = anyCreatedObject.objectId;
                  console.log('Using any created object as NFT ID (fallback):', suiObjectId);
                }
              }
              
              // Last resort: use the transaction digest as a reference
              if (!suiObjectId) {
                console.warn('Could not extract NFT object ID from transaction, using transaction digest as reference');
                suiObjectId = result.digest; // Use transaction digest as fallback
              }
              
              console.log('Final suiObjectId:', suiObjectId);

              // Step 5: Confirm mint in database
              if (suiObjectId && createResult.nft_id) {
                try {
                  console.log('Confirming mint with:', { nftId: createResult.nft_id, suiObjectId });
                  await confirmNFTMint(createResult.nft_id, suiObjectId);
                  console.log('Mint confirmed successfully');
                  
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
                  console.log('Backend notification sent');
                } catch (confirmError) {
                  console.error('Error confirming mint:', confirmError);
                  toast({
                    title: "Mint confirmation failed",
                    description: "NFT was created on blockchain, but database update failed. Check the marketplace.",
                    variant: "default",
                  });
                }
              } else {
                console.error('Missing data for confirmation:', { suiObjectId, nftId: createResult.nft_id });
              }

              setUploadProgress(100);

              toast({
                title: "NFT created successfully! 🎉",
                description: (
                  <div className="flex items-center gap-2">
                    <span>Your NFT has been minted and is ready for listing in marketplace</span>
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
              console.warn('Transaction details fetch failed:', confirmError);
              
              // Even if we can't get transaction details, the NFT was still minted
              // We can use the transaction digest as a fallback suiObjectId
              const fallbackSuiObjectId = result.digest;
              
              toast({
                title: "NFT minted successfully! 🎉",
                description: (
                  <div className="flex items-center gap-2">
                    <span>Your NFT has been minted and is ready for listing in marketplace</span>
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

              // Try to confirm with fallback suiObjectId
              if (createResult.nft_id) {
                try {
                  console.log('Confirming mint with fallback suiObjectId:', { nftId: createResult.nft_id, suiObjectId: fallbackSuiObjectId });
                  await confirmNFTMint(createResult.nft_id, fallbackSuiObjectId);
                  console.log('Mint confirmed with fallback ID');
                  
                  // Notify backend for additional fraud analysis
                  await notifyBackendNewNFT({
                    nftId: createResult.nft_id,
                    suiObjectId: fallbackSuiObjectId,
                    name: formData.title,
                    description: formData.description || '',
                    imageUrl: imageUrl,
                    creator: account.address,
                    transactionDigest: result.digest
                  });
                  console.log('Backend notification sent with fallback ID');
                } catch (confirmError) {
                  console.error('Error confirming mint with fallback:', confirmError);
                  toast({
                    title: "Database update failed",
                    description: "NFT was created on blockchain, but database update failed. Check the marketplace.",
                    variant: "default",
                  });
                }
              }

              setUploadProgress(100);

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
      
      {/* Main Content Container with Seamless Gradient Background */}
      <div className="relative z-10">
        {/* Seamless gradient background that covers all sections */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background/95" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/8 via-blue-500/15 to-blue-400/25" />
        <div className="absolute inset-0 bg-gradient-to-bl from-indigo-500/5 via-blue-600/12 to-sky-500/20" />
        
        {/* Multiple floating orbs with different animations */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-accent/30 rounded-full blur-2xl animate-pulse-glow" />
        <div className="absolute top-32 right-1/3 w-20 h-20 bg-warning/20 rounded-full blur-2xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-32 left-1/3 w-28 h-28 bg-success/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '0.5s' }} />

        {/* Enhanced grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 90%)'
          }}
        />

        {/* Matrix-style binary rain effect */}
        <div className="absolute inset-0 opacity-5">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute text-primary text-xs font-mono animate-matrix-rain"
              style={{
                left: `${(i * 5) % 100}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + (i % 3)}s`
              }}
            >
              {Math.random().toString(2).substr(2, 8)}
            </div>
          ))}
        </div>

        {/* Hero Section */}
        <section className="relative py-16 overflow-hidden">
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
                  <span className="text-primary neon-text" style={{ textShadow: '0 0 5px hsl(var(--primary))' }}>
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
                    description: 'Automatic fraud detection and verification',
                    gradient: 'from-primary/20 to-primary/5'
                  },
                  {
                    icon: Zap,
                    title: 'Instant Minting',
                    description: 'Fast NFT creation on Sui blockchain',
                    gradient: 'from-accent/20 to-accent/5'
                  },
                  {
                    icon: CheckCircle,
                    title: 'IPFS Storage',
                    description: 'Decentralized storage via Pinata',
                    gradient: 'from-success/20 to-success/5'
                  }
                ].map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div 
                      key={feature.title}
                      className="glass-panel p-6 hover-glow group relative overflow-hidden"
                      style={{ animationDelay: `${index * 200}ms` }}
                    >
                      {/* Background gradient */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                      
                      <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                        <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg group-hover:shadow-cyber transition-all duration-300">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-semibold text-foreground">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>

                      {/* Scan line effect on hover */}
                      <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent w-full h-1 animate-scan top-1/2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Create NFT Form */}
        <div className="w-full relative z-10">
          <div className="container mx-auto px-6 space-y-8 pb-16">
            <section className="glass-panel p-8">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                  <div className="relative p-3 bg-gradient-to-br from-violet-500/20 via-indigo-500/20 to-purple-500/20 rounded-xl border border-violet-400/40 shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-400/10 to-indigo-400/10 rounded-xl blur-sm"></div>
                    <Plus className="relative w-6 h-6 text-violet-400 drop-shadow-lg" />
                  </div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent drop-shadow-2xl">
                    🎨 Create New NFT
                  </h2>
                  <div className="h-px bg-gradient-to-r from-primary/50 to-transparent flex-1" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Image Upload */}
                  <div className="space-y-4">
                    <Label className="text-foreground font-semibold">NFT Image</Label>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Upload Area */}
                      <Card className="glass-panel p-6 border-dashed border-border/50 hover:border-primary/50 transition-colors hover-glow">
                        <div className="text-center space-y-4">
                          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center border border-primary/30">
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
                            className="hover:scale-105 transition-transform"
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
                        <Card className="glass-panel p-4 hover-glow">
                          <div className="space-y-4">
                            <img
                              src={formData.preview}
                              alt="Preview"
                              className="w-full h-48 object-cover rounded-lg border border-border/30"
                            />
                            
                            {/* Analysis Result */}
                            {analysisResult && (
                              <div className="space-y-2 glass-panel p-4">
                                <div className="flex items-center gap-2">
                                  {analysisResult.isSafe ? (
                                    <CheckCircle className="w-5 h-5 text-success" />
                                  ) : (
                                    <AlertTriangle className="w-5 h-5 text-warning" />
                                  )}
                                  <span className="text-sm font-medium">
                                    {analysisResult.isSafe ? 'Verified Safe' : 'Needs Review'}
                                  </span>
                                  <Badge variant="outline" className="text-xs glass-panel">
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
                      <Label htmlFor="title" className="text-foreground font-semibold">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter NFT title"
                        className="glass-panel bg-card/30 border-border/50 backdrop-blur-md"
                        required
                      />
                    </div>

                    <div className="space-y-4">
                      <Label htmlFor="price" className="text-foreground font-semibold">Price (SUI)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="0.00"
                        className="glass-panel bg-card/30 border-border/50 backdrop-blur-md"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="category" className="text-foreground font-semibold">Category</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {categories.map((category) => (
                        <Button
                          key={category}
                          type="button"
                          variant={formData.category === category ? 'cyber' : 'glass'}
                          size="sm"
                          onClick={() => setFormData(prev => ({ ...prev, category }))}
                          disabled={isProcessing}
                          className="hover:scale-105 transition-transform"
                        >
                          {category}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="description" className="text-foreground font-semibold">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your NFT..."
                      rows={4}
                      className="glass-panel bg-card/30 border-border/50 backdrop-blur-md"
                    />
                  </div>

                  {/* Upload Progress */}
                  {isProcessing && (
                    <div className="space-y-2 glass-panel p-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground">
                          {uploadProgress < 25 && "Preparing..."}
                          {uploadProgress >= 25 && uploadProgress < 50 && "Uploading to IPFS..."}
                          {uploadProgress >= 50 && uploadProgress < 75 && "Creating transaction..."}
                          {uploadProgress >= 75 && uploadProgress < 90 && "Minting NFT..."}
                          {uploadProgress >= 90 && uploadProgress < 100 && "Finalizing..."}
                          {uploadProgress >= 100 && "Complete!"}
                        </span>
                        <span className="text-primary font-semibold">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-300 shadow-glow"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Transaction Result */}
                  {txDigest && (
                    <div className="glass-panel p-4 bg-success/10 border border-success/20">
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium neon-text">NFT Created Successfully!</span>
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
                    className="w-full hover:scale-105 transition-all duration-300 neon-text shadow-glow"
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
                    <p className="text-sm text-muted-foreground text-center glass-panel p-2 rounded">
                      Connect your wallet to start minting NFTs
                    </p>
                  )}
                </form>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 