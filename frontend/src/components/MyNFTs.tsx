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
  Clock
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useUserNFTs, useCreateListing } from '@/hooks/useListings';

interface NFT {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  price: number;
  is_listed: boolean;
  status: string;
  is_fraud: boolean;
  confidence_score: number;
  flag_type?: string;
  created_at: string;
  sui_object_id?: string;
}

export function MyNFTs() {
  const { wallet } = useWallet();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'listed' | 'unlisted' | 'flagged'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [listingPrice, setListingPrice] = useState('');
  const [isListingDialogOpen, setIsListingDialogOpen] = useState(false);

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
        matchesFilter = nft.is_fraud || nft.confidence_score > 0.7;
        break;
      default:
        matchesFilter = true;
    }
    
    return matchesSearch && matchesFilter;
  });

  const handleListNFT = async () => {
    if (!selectedNFT || !listingPrice || !wallet?.address) return;

    try {
      await createListingMutation.mutateAsync({
        nft_id: selectedNFT.id,
        price: parseFloat(listingPrice),
        wallet_address: wallet.address
      });
      
      setIsListingDialogOpen(false);
      setSelectedNFT(null);
      setListingPrice('');
      refetch(); // Refresh NFTs to update listing status
    } catch (error) {
      console.error('Failed to list NFT:', error);
    }
  };

  const getStatusBadge = (nft: NFT) => {
    if (nft.is_fraud || nft.confidence_score > 0.7) {
      return <Badge variant="destructive" className="text-xs">Flagged</Badge>;
    }
    if (nft.is_listed) {
      return <Badge variant="default" className="text-xs">Listed</Badge>;
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
            { label: 'Flagged', value: 'flagged' as const, count: nfts.filter(n => n.is_fraud || n.confidence_score > 0.7).length }
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
                {(nft.is_fraud || nft.confidence_score > 0.7) && (
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
                  {!nft.is_listed && nft.status === 'minted' && !nft.is_fraud && (
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedNFT(nft);
                        setListingPrice(nft.price.toString());
                        setIsListingDialogOpen(true);
                      }}
                    >
                      <DollarSign className="w-4 h-4 mr-1" />
                      List
                    </Button>
                  )}
                  {nft.is_listed && (
                    <Button variant="secondary" size="sm" className="flex-1">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Listed
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
