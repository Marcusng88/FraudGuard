import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Package, 
  Plus, 
  Eye,
  DollarSign,
  Calendar
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { getUserNFTs } from '@/lib/profile';

interface NFT {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  price?: number;
  created_at: string;
  status: 'owned' | 'listed' | 'sold';
}

export function ProfileNFTs() {
  const { wallet } = useWallet();
  const [nfts, setNfts] = React.useState<NFT[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchNFTs = async () => {
      if (!wallet?.address) return;

      setLoading(true);
      setError(null);

      try {
        const nftData = await getUserNFTs(wallet.address);
        setNfts(nftData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch NFTs');
        console.error('Error fetching NFTs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNFTs();
  }, [wallet?.address]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-6">
          <Package className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-semibold text-foreground">My NFTs</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="aspect-square bg-muted rounded-lg mb-2"></div>
              <div className="h-4 bg-muted rounded w-3/4 mb-1"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-6">
          <Package className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-semibold text-foreground">My NFTs</h3>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-destructive" />
          </div>
          <p className="text-destructive mb-2">Failed to load NFTs</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </Card>
    );
  }

  if (!nfts || nfts.length === 0) {
    return (
      <Card className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-6">
          <Package className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-semibold text-foreground">My NFTs</h3>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-2">No NFTs found</p>
          <p className="text-sm text-muted-foreground mb-4">
            Start building your NFT collection
          </p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create NFT
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-panel p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-semibold text-foreground">My NFTs</h3>
          <Badge variant="outline">{nfts.length} items</Badge>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create NFT
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {nfts.map((nft) => (
          <Card key={nft.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-square relative">
              <Avatar className="w-full h-full rounded-none">
                <AvatarImage 
                  src={nft.image_url} 
                  alt={nft.title}
                  className="object-cover"
                />
                <AvatarFallback className="bg-muted">
                  <Package className="w-8 h-8 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              {nft.status === 'listed' && (
                <Badge className="absolute top-2 right-2 bg-green-500">
                  Listed
                </Badge>
              )}
            </div>
            <div className="p-4">
              <h4 className="font-semibold text-foreground mb-1 truncate">
                {nft.title}
              </h4>
              {nft.description && (
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                  {nft.description}
                </p>
              )}
              <div className="flex items-center justify-between">
                {nft.price && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{nft.price} SUI</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {formatDate(nft.created_at)}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
} 