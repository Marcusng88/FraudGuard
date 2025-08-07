import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Edit, Loader2, Save, X } from 'lucide-react';
import { useUpdateListing } from '@/hooks/useListings';
import { useToast } from '@/hooks/use-toast';

interface Listing {
  id: string;
  nft_id: string;
  seller_id: string;
  price: number;
  status: string;
  listing_id?: string;
  blockchain_tx_id?: string;
  created_at: string;
  updated_at?: string;
  metadata?: Record<string, unknown>;
  nft_title?: string;
  nft_image_url?: string;
  seller_username?: string;
}

interface EditListingDialogProps {
  listing: Listing;
  onSuccess?: () => void;
}

export function EditListingDialog({ listing, onSuccess }: EditListingDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [price, setPrice] = useState(listing.price.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateListingMutation = useUpdateListing();
  const { toast } = useToast();

  // Reset price when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPrice(listing.price.toString());
    }
  }, [isOpen, listing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!price || parseFloat(price) <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare update data - only price
      const updateData = {
        listing_id: listing.id,
        price: parseFloat(price)
      };

      await updateListingMutation.mutateAsync(updateData);

      toast({
        title: "Price Updated",
        description: "Your listing price has been updated successfully.",
      });

      setIsOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to update listing price:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update listing price. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="w-4 h-4 mr-1" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit Listing Price</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* NFT Preview */}
          <div className="flex items-center gap-4 p-4 bg-muted/20 rounded-lg">
            <img 
              src={listing.nft_image_url || '/placeholder-nft.png'} 
              alt={listing.nft_title || 'NFT'}
              className="w-16 h-16 object-cover rounded"
            />
            <div>
              <h3 className="font-semibold text-foreground">
                {listing.nft_title || 'Untitled NFT'}
              </h3>
              <Badge variant={listing.status === 'active' ? 'default' : 'secondary'}>
                {listing.status}
              </Badge>
            </div>
          </div>

          {/* Price Field */}
          <div className="space-y-2">
            <Label htmlFor="price">New Price (SUI)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter new price in SUI"
              required
            />
            <p className="text-sm text-muted-foreground">
              Current price: {listing.price} SUI
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              {isSubmitting ? 'Updating...' : 'Update Price'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 