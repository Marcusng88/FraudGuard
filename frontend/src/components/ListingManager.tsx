import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  Clock,
  Trash2,
  ShoppingCart,
  BarChart3
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useUserNFTs, useCreateListing, useUpdateListing, useDeleteListing, useUserListings } from '@/hooks/useListings';
import { notifyNFTListed, notifyNFTUnlisted, confirmListing, confirmUnlisting, confirmEditListing, createListing } from '@/lib/api';
// TODO: Transition to new marketplace system
// import { extractListingId, extractListingEventData } from '@/lib/blockchain-utils';
import { useToast } from '@/hooks/use-toast';

interface NFT {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  price?: number; // Make price optional to match API interface
  is_listed?: boolean; // Make is_listed optional to match API interface
  status: string;
  is_fraud: boolean;
  confidence_score: number;
  flag_type?: number; // Change to number to match API interface
  created_at: string;
  sui_object_id?: string;
}

interface NFTData {
  nfts: NFT[];
  total: number;
}

export function ListingManager() {
  const { wallet, executeListNFTTransaction, executeUnlistNFTTransaction } = useWallet();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'listed' | 'unlisted' | 'flagged'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [listingPrice, setListingPrice] = useState('');
  const [isListingDialogOpen, setIsListingDialogOpen] = useState(false);
  const [editingNFT, setEditingNFT] = useState<NFT | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUnlisting, setIsUnlisting] = useState(false);

  // Fetch user's NFTs
  const { data: nftsData, isLoading, refetch } = useUserNFTs(wallet?.address || '');
  
  // Fetch user's listings for additional context
  const { data: userListings } = useUserListings(wallet?.address || '');

  // Listing mutations
  const createListingMutation = useCreateListing();
  const updateListingMutation = useUpdateListing();
  const deleteListingMutation = useDeleteListing();
  // Note: Removed useUnlistNFT() - now using blockchain-first approach

  // Extract NFTs from the response structure
  const nfts: NFT[] = nftsData?.nfts || [];

  // Filter NFTs based on search and status
  const filteredNFTs = nfts.filter(nft => {
    const matchesSearch = nft.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         nft.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    switch (filterStatus) {
      case 'listed':
        matchesFilter = nft.is_listed === true;
        break;
      case 'unlisted':
        matchesFilter = nft.is_listed !== true;
        break;
      case 'flagged':
        matchesFilter = nft.is_fraud === true;
        break;
      default:
        matchesFilter = true;
    }
    
    return matchesSearch && matchesFilter;
  });

  // Statistics
  const totalNFTs = nfts.length;
  const listedNFTs = nfts.filter(n => n.is_listed === true).length;
  const flaggedNFTs = nfts.filter(n => n.is_fraud === true).length;
  const totalListingValue = userListings?.reduce((sum, l) => sum + l.price, 0) || 0;

  const handleListNFT = async () => {
    if (!selectedNFT || !listingPrice || !executeListNFTTransaction) return;

    console.log('Attempting to list NFT:', selectedNFT.id, 'with price:', listingPrice);

    try {
      const price = parseFloat(listingPrice);
      if (isNaN(price) || price <= 0) {
        throw new Error("Please enter a valid price");
      }

      // Step 1: Create listing record in database (following NFT minting pattern)
      console.log('Creating listing in database...');
      const listingResponse = await createListing({
        nft_id: selectedNFT.id,
        price: price,
        expires_at: null,
        listing_metadata: {
          title: selectedNFT.title,
          created_via: "listing_manager"
        }
      });

      console.log('Listing created in database:', listingResponse.id);

      // Step 2: Execute blockchain transaction
      console.log('Executing blockchain listing transaction...');
      const blockchainResult = await executeListNFTTransaction({
        nftObjectId: selectedNFT.sui_object_id || selectedNFT.id,
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
      // The mutation will automatically invalidate queries and trigger refetch
      // The NFT should now appear in the "Listed" filter instead of "Unlisted"
    } catch (error) {
      console.error('Failed to list NFT:', error);
      // You might want to show a toast notification here
    }
  };

  const handleUnlistNFT = async (nft: NFT) => {
    if (!wallet?.address || !executeUnlistNFTTransaction) {
      console.error('No wallet address or unlist function available');
      return;
    }

    console.log('Attempting to unlist NFT:', nft.id);
    console.log('Current NFT state:', nft);
    console.log('Wallet address:', wallet.address);

    setIsUnlisting(true);

    try {
      // Step 1: Execute blockchain transaction
      console.log('Executing blockchain unlisting transaction...');
      const blockchainResult = await executeUnlistNFTTransaction({
        nftObjectId: nft.sui_object_id || nft.id,
        sellerAddress: wallet.address
      });

      if (!blockchainResult.success) {
        throw new Error(blockchainResult.error || 'Blockchain transaction failed');
      }

      console.log('Blockchain transaction successful:', blockchainResult.txId);

      // Step 2: Confirm unlisting in database (following the same pattern)
      console.log('Confirming unlisting with blockchain data...');
      await confirmUnlisting(
        nft.id, // In production, this would be the database listing ID
        blockchainResult.txId,
        0 // gas_fee
      );

      console.log('Unlisting confirmed successfully');

      // Force refetch the data immediately
      await refetch();

      // The mutation will automatically invalidate queries and trigger refetch
      // The NFT's is_listed status will be updated to false in the database
      // The NFT should now appear in the "Unlisted" filter instead of "Listed"
    } catch (error) {
      console.error('Failed to unlist NFT:', error);
      // You might want to show a toast notification here
    } finally {
      setIsUnlisting(false);
    }
  };

  const getStatusBadge = (nft: NFT) => {
    // First check fraud status - this takes priority
    if (nft.is_fraud) {
      return <Badge variant="destructive" className="text-xs">Flagged</Badge>;
    }
    
    // Then check if it's listed (business status)
    if (nft.is_listed === true) {
      return <Badge variant="default" className="text-xs">Listed</Badge>;
    }
    
    // Finally check AI verification status for unlisted NFTs
    if (typeof nft.confidence_score === 'number' && nft.confidence_score >= 0.8) {
      return <Badge variant="outline" className="text-xs text-green-600 border-green-600">Verified</Badge>;
    } else if (typeof nft.confidence_score === 'number' && nft.confidence_score > 0) {
      return <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600">Under Review</Badge>;
    }
    
    return <Badge variant="secondary" className="text-xs">Available</Badge>;
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
      {/* Info Card */}
      <Card className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ShoppingCart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">My NFT Collection & Listings</h3>
            <p className="text-sm text-muted-foreground">
              View and manage all your uploaded NFTs. List unlisted items for sale, unlist active listings, or view detailed information.
            </p>
          </div>
        </div>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ImageIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total NFTs</p>
              <p className="text-xl font-bold">{totalNFTs}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Listed</p>
              <p className="text-xl font-bold">{listedNFTs}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Flagged</p>
              <p className="text-xl font-bold">{flaggedNFTs}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Listing Value</p>
              <p className="text-xl font-bold">{totalListingValue.toFixed(2)} SUI</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Listings</h2>
          <p className="text-muted-foreground">
            {nfts.length} NFT{nfts.length !== 1 ? 's' : ''} in your collection
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/create'}>
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
            <Button onClick={() => window.location.href = '/create'}>
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
                  {nft.price > 0 && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <span className="font-medium">{nft.price} SUI</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>

                  {!nft.is_listed && (
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedNFT(nft);
                        setListingPrice(nft.price?.toString() || '');
                        setIsListingDialogOpen(true);
                      }}
                    >
                      <DollarSign className="w-4 h-4 mr-1" />
                      List
                    </Button>
                  )}
                  {nft.is_listed === true && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleUnlistNFT(nft)}
                      disabled={isUnlisting}
                    >
                      {isUnlisting ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-1" />
                      )}
                      {isUnlisting ? 'Unlisting...' : 'Unlist'}
                    </Button>
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
    </div>
  );
} 