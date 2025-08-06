import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  DollarSign, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useUserListings, useCreateListing, useUpdateListing, useDeleteListing, useUserNFTs } from '@/hooks/useListings';

interface Listing {
  id: string;
  nft_id: string;
  price: number;
  status: string;
  created_at: string;
  updated_at?: string;
  nft_title?: string;
  nft_image_url?: string;
  seller_username?: string;
}

interface NFT {
  id: string;
  title: string;
  image_url: string;
  price: number;
  is_listed?: boolean;
}

export function ListingManager() {
  const { wallet } = useWallet();
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [listingPrice, setListingPrice] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);

  // Fetch user's listings
  const { data: listings, isLoading: listingsLoading, refetch: refetchListings } = useUserListings(
    wallet?.address || ''
  );

  // Fetch user's NFTs (not listed)
  const { data: userNFTs, isLoading: nftsLoading } = useUserNFTs(wallet?.address || '');

  // Listing mutations
  const createListingMutation = useCreateListing();
  const updateListingMutation = useUpdateListing();
  const deleteListingMutation = useDeleteListing();

  const handleCreateListing = async () => {
    if (!selectedNFT || !listingPrice || !wallet?.address) return;

    try {
      await createListingMutation.mutateAsync({
        nft_id: selectedNFT.id,
        price: parseFloat(listingPrice),
        wallet_address: wallet.address
      });
      
      setIsCreateDialogOpen(false);
      setSelectedNFT(null);
      setListingPrice('');
      refetchListings();
    } catch (error) {
      console.error('Failed to create listing:', error);
    }
  };

  const handleUpdateListing = async (listingId: string, newPrice: number) => {
    try {
      await updateListingMutation.mutateAsync({
        listing_id: listingId,
        price: newPrice
      });
      
      setIsEditDialogOpen(false);
      setEditingListing(null);
      refetchListings();
    } catch (error) {
      console.error('Failed to update listing:', error);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    try {
      await deleteListingMutation.mutateAsync(listingId);
      refetchListings();
    } catch (error) {
      console.error('Failed to delete listing:', error);
    }
  };

  const formatPrice = (price: number) => `${price} SUI`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Listings</h2>
          <p className="text-muted-foreground">Manage your NFT listings and sales</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-secondary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              List NFT
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>List NFT for Sale</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* NFT Selection */}
              <div>
                <label className="text-sm font-medium">Select NFT</label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
                  {userNFTs?.filter(nft => !nft.is_listed).map((nft) => (
                    <Card
                      key={nft.id}
                      className={`p-3 cursor-pointer transition-all ${
                        selectedNFT?.id === nft.id 
                          ? 'ring-2 ring-primary bg-primary/10' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedNFT(nft)}
                    >
                      <img 
                        src={nft.image_url} 
                        alt={nft.title}
                        className="w-full h-20 object-cover rounded mb-2"
                      />
                      <p className="text-xs font-medium truncate">{nft.title}</p>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Price Input */}
              <div>
                <label className="text-sm font-medium">Listing Price (SUI)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={listingPrice}
                  onChange={(e) => setListingPrice(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateListing}
                  disabled={!selectedNFT || !listingPrice || createListingMutation.isPending}
                  className="flex-1"
                >
                  {createListingMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <DollarSign className="w-4 h-4 mr-2" />
                  )}
                  Create Listing
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading State */}
      {listingsLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading your listings...</span>
        </div>
      )}

      {/* Listings Grid */}
      {!listingsLoading && listings && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <Card key={listing.id} className="overflow-hidden">
              {/* NFT Image */}
              <div className="relative">
                <img 
                  src={listing.nft_image_url || '/placeholder-nft.png'} 
                  alt={listing.nft_title || 'NFT'}
                  className="w-full h-48 object-cover"
                />
                <Badge 
                  variant={listing.status === 'active' ? 'default' : 'secondary'}
                  className="absolute top-2 right-2"
                >
                  {listing.status}
                </Badge>
              </div>

              {/* Listing Details */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-foreground">
                    {listing.nft_title || 'Untitled NFT'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Listed {formatDate(listing.created_at)}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <span className="font-bold text-lg">
                      {formatPrice(listing.price)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {formatDate(listing.updated_at || listing.created_at)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingListing(listing);
                      setIsEditDialogOpen(true);
                    }}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteListing(listing.id)}
                    disabled={deleteListingMutation.isPending}
                    className="flex-1"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Unlist
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!listingsLoading && (!listings || listings.length === 0) && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Listings Yet</h3>
          <p className="text-muted-foreground mb-4">
            Start selling your NFTs by creating your first listing.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            List Your First NFT
          </Button>
        </div>
      )}

      {/* Edit Listing Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Listing</DialogTitle>
          </DialogHeader>
          {editingListing && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">New Price (SUI)</label>
                <Input
                  type="number"
                  placeholder={editingListing.price.toString()}
                  onChange={(e) => setListingPrice(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => handleUpdateListing(editingListing.id, parseFloat(listingPrice))}
                  disabled={!listingPrice || updateListingMutation.isPending}
                  className="flex-1"
                >
                  {updateListingMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Update Listing
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
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