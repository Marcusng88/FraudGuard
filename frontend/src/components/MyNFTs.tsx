import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Search, 
  Filter, 
  Grid3X3, 
  List as ListIcon, 
  DollarSign, 
  Eye, 
  Edit,
  MoreVertical,
  Calendar,
  Loader2,
  ImageIcon,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useUserNFTs, useCreateListing } from '@/hooks/useListings';
import { useNavigate } from 'react-router-dom';
import { NFT, createListing, confirmListing, updateListing, deleteListing, unlistNFT, type ListingUpdateRequest } from '@/lib/api';
import { refreshNFTObjectId, checkNFTInMarketplaceEscrow } from '@/lib/sui-utils';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

export function MyNFTs() {
  const { wallet, executeListNFTTransaction, executeUnlistNFTTransaction, executeEditListingTransaction } = useWallet();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'listed' | 'unlisted' | 'flagged'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [listingPrice, setListingPrice] = useState('');
  const [isListingDialogOpen, setIsListingDialogOpen] = useState(false);
  const [isUnlistDialogOpen, setIsUnlistDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize Sui client for object ID refresh
  const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

  // Fetch user's NFTs
  const { data: nftsData, isLoading, refetch } = useUserNFTs(wallet?.address || '');
  const createListingMutation = useCreateListing();

  // Extract NFTs from the response structure
  const nfts: NFT[] = nftsData?.nfts || [];

  // Filter NFTs based on search and status
  const filteredNFTs = nfts.filter(nft => {
    const matchesSearch = nft.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         nft.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    switch (filterStatus) {
      case 'listed':
        matchesFilter = nft.is_listed;
        break;
      case 'unlisted':
        matchesFilter = !nft.is_listed;
        break;
      case 'flagged':
        matchesFilter = nft.is_fraud === true;
        break;
      default:
        matchesFilter = true;
    }
    
    return matchesSearch && matchesFilter;
  });

  const handleListNFT = async () => {
    if (!selectedNFT || !listingPrice || !executeListNFTTransaction) return;

    try {
      const price = parseFloat(listingPrice);
      if (isNaN(price) || price <= 0) {
        throw new Error("Please enter a valid price");
      }

      // Step 0: Refresh NFT object ID before listing
      // This ensures we have the current object ID, especially after unlisting
      let currentNFTObjectId = selectedNFT.sui_object_id;
      
      if (wallet?.address) {
        console.log('Ensuring NFT object ID is current before listing...');
        try {
          const refreshResult = await refreshNFTObjectId(
            suiClient,
            selectedNFT.id,
            wallet.address
          );
          
          if (refreshResult.success && refreshResult.newObjectId) {
            currentNFTObjectId = refreshResult.newObjectId;
            console.log(`Using current NFT object ID: ${currentNFTObjectId}`);
          }
        } catch (refreshError) {
          console.warn('Failed to refresh NFT object ID before listing:', refreshError);
          // Continue with the stored object ID
        }
      }

      // Step 1: Create listing record in database (following NFT minting pattern)
      console.log('Creating listing in database...');
      const listingResponse = await createListing({
        nft_id: selectedNFT.id,
        price: price,
        expires_at: null,
        listing_metadata: {
          title: selectedNFT.title,
          created_via: "my_nfts_component"
        }
      });

      console.log('Listing created in database:', listingResponse.id);

      // Step 2: Execute blockchain transaction
      console.log('Executing blockchain listing transaction...');
      const blockchainResult = await executeListNFTTransaction({
        nftObjectId: currentNFTObjectId || selectedNFT.id,
        price: price,
        sellerAddress: wallet?.address
      });

      if (!blockchainResult.success) {
        throw new Error(blockchainResult.error || 'Blockchain transaction failed');
      }

      console.log('Blockchain transaction successful:', blockchainResult.txId);
      console.log('Blockchain listing ID:', blockchainResult.blockchainListingId);

      // Step 3: Confirm listing in database (following NFT mint confirmation pattern)
      console.log('Confirming listing with blockchain data...');
      await confirmListing(
        listingResponse.id,
        blockchainResult.txId,
        blockchainResult.blockchainListingId, // Pass the extracted blockchain listing ID
        blockchainResult.gasUsed || 0 // Use actual gas used from transaction
      );

      console.log('Listing confirmed successfully');

      setIsListingDialogOpen(false);
      setSelectedNFT(null);
      setListingPrice('');
      refetch(); // Refresh NFTs to update listing status
    } catch (error) {
      console.error('Failed to list NFT:', error);
    }
  };

  const handleUnlistNFT = async () => {
    if (!selectedNFT || !wallet?.address) return;

    try {
      setIsProcessing(true);

      // Step 1: Find the active listing for this NFT
      console.log('Finding active listing for NFT:', selectedNFT.id);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/listings/nft/${selectedNFT.id}/active`);
      if (!response.ok) {
        throw new Error('No active listing found for this NFT');
      }
      const listing = await response.json();
      console.log('Found active listing:', listing);

      // Step 2: Check if the NFT is actually in marketplace escrow
      console.log('Checking if NFT is in marketplace escrow...');
      const escrowCheck = await checkNFTInMarketplaceEscrow(suiClient, selectedNFT.sui_object_id);
      console.log('Escrow check result:', escrowCheck);
      
      if (escrowCheck.inEscrow && executeUnlistNFTTransaction) {
        // Step 2a: Execute blockchain unlisting transaction
        console.log('Executing blockchain unlisting transaction with NFT object ID:', selectedNFT.sui_object_id);
        const blockchainResult = await executeUnlistNFTTransaction({
          nftObjectId: selectedNFT.sui_object_id,
          sellerAddress: wallet?.address
        });

        if (!blockchainResult.success) {
          throw new Error(blockchainResult.error || 'Blockchain transaction failed');
        }

        // Step 3: Confirm unlisting in database
        await fetch(`${import.meta.env.VITE_API_URL}/api/listings/${listing.id}/confirm-unlisting`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listing_id: listing.id,
            blockchain_tx_id: blockchainResult.txId,
            gas_fee: blockchainResult.gasUsed || 0
          })
        });
      } else {
        // Step 2b: Database-only unlisting for NFTs not in marketplace escrow
        console.log('NFT not in marketplace escrow, performing database-only unlisting');
        await fetch(`${import.meta.env.VITE_API_URL}/api/listings/${listing.id}/confirm-unlisting`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listing_id: listing.id,
            blockchain_tx_id: 'database-only-unlisting',
            gas_fee: 0
          })
        });
      }

      console.log('NFT unlisted successfully');

      // Step 4: Refresh NFT object ID after unlisting (only for blockchain unlisting)
      // This is crucial because the smart contract returns the NFT to the user
      // and the object ID may change
      if (selectedNFT && wallet?.address && escrowCheck.inEscrow) {
        console.log('Refreshing NFT object ID after blockchain unlisting...');
        try {
          // Wait a moment for the blockchain state to update
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const refreshResult = await refreshNFTObjectId(
            suiClient,
            selectedNFT.id,
            wallet.address
          );
          
          if (refreshResult.success) {
            console.log(`NFT object ID refreshed: ${refreshResult.newObjectId}`);
          } else {
            console.warn(`Failed to refresh NFT object ID: ${refreshResult.error}`);
          }
        } catch (refreshError) {
          console.error('Error refreshing NFT object ID:', refreshError);
          // Don't fail the unlisting operation if refresh fails
        }
      } else if (!escrowCheck.inEscrow) {
        console.log('Database-only unlisting completed, no object ID refresh needed');
      }

      setIsUnlistDialogOpen(false);
      setSelectedNFT(null);
      refetch(); // Refresh NFTs to update listing status
    } catch (error) {
      console.error('Failed to unlist NFT:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditListing = async () => {
    if (!selectedNFT || !newPrice || !wallet?.address || !executeEditListingTransaction) return;

    try {
      setIsProcessing(true);
      const price = parseFloat(newPrice);
      if (isNaN(price) || price <= 0) {
        throw new Error("Please enter a valid price");
      }

      // Step 1: Find the active listing for this NFT
      console.log('Finding active listing for NFT:', selectedNFT.id);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/listings/nft/${selectedNFT.id}/active`);
      if (!response.ok) {
        throw new Error('No active listing found for this NFT');
      }
      const listing = await response.json();
      console.log('Found active listing:', listing);

      // Step 2: Check if the NFT is actually in marketplace escrow
      console.log('Checking if NFT is in marketplace escrow for price update...');
      const escrowCheck = await checkNFTInMarketplaceEscrow(suiClient, selectedNFT.sui_object_id);
      console.log('Escrow check result for price update:', escrowCheck);
      
      if (escrowCheck.inEscrow && executeEditListingTransaction) {
        // Step 2a: Execute blockchain edit price transaction
        console.log('Executing blockchain edit price transaction with NFT object ID:', selectedNFT.sui_object_id);
        const blockchainResult = await executeEditListingTransaction({
          nftObjectId: selectedNFT.sui_object_id,
          newPrice: price,
          sellerAddress: wallet?.address
        });

        if (!blockchainResult.success) {
          throw new Error(blockchainResult.error || 'Blockchain transaction failed');
        }

        // Step 3: Update listing price in database
        console.log('Updating listing price in database...');
        await updateListing({
          listing_id: listing.id, // Use the database listing ID
          price: price,
          listing_metadata: {
            updated_via: "my_nfts_component",
            blockchain_tx_id: blockchainResult.txId,
            gas_fee: blockchainResult.gasUsed || 0
          }
        } as ListingUpdateRequest);
      } else {
        // Step 2b: Database-only price update for NFTs not in marketplace escrow
        console.log('NFT not in marketplace escrow, performing database-only price update');
        await updateListing({
          listing_id: listing.id,
          price: price,
          listing_metadata: {
            updated_via: "my_nfts_component_database_only"
          }
        } as ListingUpdateRequest);
      }

      console.log('Listing price updated successfully');

      setIsEditDialogOpen(false);
      setSelectedNFT(null);
      setNewPrice('');
      refetch(); // Refresh NFTs to update price
    } catch (error) {
      console.error('Failed to edit listing:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const openListDialog = (nft: NFT) => {
    setSelectedNFT(nft);
    setListingPrice('');
    setIsListingDialogOpen(true);
  };

  const openUnlistDialog = (nft: NFT) => {
    setSelectedNFT(nft);
    setIsUnlistDialogOpen(true);
  };

  const openEditDialog = (nft: NFT) => {
    setSelectedNFT(nft);
    setNewPrice(nft.listing_price?.toString() || '');
    setIsEditDialogOpen(true);
  };

  const handleViewNFT = (nftId: string) => {
    navigate(`/nft/${nftId}`);
  };

  const getStatusBadge = (nft: NFT) => {
    // First check fraud status - this takes priority
    if (nft.is_fraud) {
      return <Badge variant="destructive" className="text-xs">Flagged</Badge>;
    }
    
    // Then check if it's listed (business status)
    if (nft.is_listed) {
      return <Badge variant="default" className="text-xs">Listed</Badge>;
    }
    
    // Finally check AI verification status for unlisted NFTs
    if (typeof nft.confidence_score === 'number' && nft.confidence_score >= 0.8) {
      return <Badge variant="outline" className="text-xs text-green-600 border-green-600">Verified</Badge>;
    } else if (typeof nft.confidence_score === 'number' && nft.confidence_score > 0) {
      return <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600">Under Review</Badge>;
    }
    
    if (nft.status === 'minted') {
      return <Badge variant="secondary" className="text-xs">Available</Badge>;
    }
    return <Badge variant="outline" className="text-xs">{nft.status}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading your NFTs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My NFTs</h2>
          <p className="text-muted-foreground">
            {nfts.length} NFT{nfts.length !== 1 ? 's' : ''} in your collection
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/create')}>
            <Plus className="w-4 h-4 mr-2" />
            Create NFT
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search your NFTs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {[
            { label: 'All', value: 'all' as const, count: nfts.length },
            { label: 'Listed', value: 'listed' as const, count: nfts.filter(n => n.is_listed).length },
            { label: 'Unlisted', value: 'unlisted' as const, count: nfts.filter(n => !n.is_listed).length },
            { label: 'Flagged', value: 'flagged' as const, count: nfts.filter(n => n.is_fraud === true).length }
          ].map((filter) => (
            <Button
              key={filter.value}
              variant={filterStatus === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(filter.value)}
              className="gap-2"
            >
              {filter.label}
              <Badge variant="outline" className="text-xs">
                {filter.count}
              </Badge>
            </Button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <ListIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* NFTs Display */}
      {filteredNFTs.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {searchTerm || filterStatus !== 'all' ? 'No NFTs found' : 'No NFTs yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Create your first NFT to get started'
            }
          </p>
          {!searchTerm && filterStatus === 'all' && (
            <Button onClick={() => navigate('/create')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First NFT
            </Button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-4'
        }>
          {filteredNFTs.map((nft) => (
            <Card key={nft.id} className={`overflow-hidden ${viewMode === 'list' ? 'flex' : ''}`}>
              {/* NFT Image */}
              <div className={`relative ${viewMode === 'list' ? 'w-32 h-32' : 'w-full h-48'}`}>
                <img 
                  src={nft.image_url || '/placeholder-nft.png'} 
                  alt={nft.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  {getStatusBadge(nft)}
                </div>
                {nft.is_fraud && (
                  <div className="absolute top-2 left-2">
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Risk
                    </Badge>
                  </div>
                )}
              </div>

              {/* NFT Details */}
              <div className={`p-4 space-y-3 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                <div>
                  <h3 className="font-semibold text-foreground truncate">{nft.title}</h3>
                  {nft.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{nft.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{formatDate(nft.created_at)}</span>
                  </div>
                  {nft.initial_price > 0 && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <span className="font-medium">{nft.initial_price} SUI</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleViewNFT(nft.id)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  {!nft.is_listed && (
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => openListDialog(nft)}
                    >
                      <DollarSign className="w-4 h-4 mr-1" />
                      List
                    </Button>
                  )}
                  {nft.is_listed && (
                    <div className="flex gap-1 flex-1">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => openUnlistDialog(nft)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Unlist
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => openEditDialog(nft)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* List NFT Dialog */}
      <Dialog open={isListingDialogOpen} onOpenChange={setIsListingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>List NFT for Sale</DialogTitle>
            <DialogDescription>
              Set a price and list your NFT on the marketplace for other users to purchase.
            </DialogDescription>
          </DialogHeader>
          {selectedNFT && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-muted/20 rounded-lg">
                <img 
                  src={selectedNFT.image_url} 
                  alt={selectedNFT.title}
                  className="w-16 h-16 object-cover rounded"
                />
                <div>
                  <h4 className="font-medium">{selectedNFT.title}</h4>
                  <p className="text-sm text-muted-foreground">Ready to list</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Listing Price (SUI)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={listingPrice}
                  onChange={(e) => setListingPrice(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Set your desired selling price in SUI
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleListNFT}
                  disabled={!listingPrice || parseFloat(listingPrice) <= 0 || createListingMutation.isPending}
                  className="flex-1"
                >
                  {createListingMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <DollarSign className="w-4 h-4 mr-2" />
                  )}
                  List for Sale
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsListingDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Unlist NFT Dialog */}
      <Dialog open={isUnlistDialogOpen} onOpenChange={setIsUnlistDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unlist NFT</DialogTitle>
            <DialogDescription>
              Remove your NFT from the marketplace. You can list it again later if you change your mind.
            </DialogDescription>
          </DialogHeader>
          {selectedNFT && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-muted/20 rounded-lg">
                <img 
                  src={selectedNFT.image_url} 
                  alt={selectedNFT.title}
                  className="w-16 h-16 object-cover rounded"
                />
                <div>
                  <h4 className="font-medium">{selectedNFT.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    Currently listed for {selectedNFT.listing_price || 'N/A'} SUI
                  </p>
                </div>
              </div>

              <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-warning">Remove from Marketplace</p>
                    <p className="text-xs text-muted-foreground">
                      This will remove your NFT from the marketplace. You can list it again later at any time.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleUnlistNFT}
                  disabled={isProcessing}
                  variant="secondary"
                  className="flex-1"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Unlist NFT
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsUnlistDialogOpen(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Listing Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Listing Price</DialogTitle>
            <DialogDescription>
              Update the price of your listed NFT. The new price will be reflected immediately on the marketplace.
            </DialogDescription>
          </DialogHeader>
          {selectedNFT && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-muted/20 rounded-lg">
                <img 
                  src={selectedNFT.image_url} 
                  alt={selectedNFT.title}
                  className="w-16 h-16 object-cover rounded"
                />
                <div>
                  <h4 className="font-medium">{selectedNFT.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    Current price: {selectedNFT.listing_price || 'N/A'} SUI
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">New Price (SUI)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Update your listing price. Changes will be reflected immediately.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleEditListing}
                  disabled={!newPrice || parseFloat(newPrice) <= 0 || isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Edit className="w-4 h-4 mr-2" />
                  )}
                  Update Price
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
