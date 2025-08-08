import React, { useState, useEffect, useCallback } from 'react';
import { CyberNavigation } from '@/components/CyberNavigation';
import { FloatingWarningIcon } from '@/components/FloatingWarningIcon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Wallet, 
  Shield, 
  TrendingUp, 
  AlertTriangle, 
  Settings,
  LogOut,
  Plus,
  DollarSign,
  Clock,
  Eye,
  Edit,
  Trash2,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { ListingManager } from '@/components/ListingManager';
import { MyNFTs } from '@/components/MyNFTs';
import { useUserListings, useMarketplaceAnalytics, useUpdateListing, useDeleteListing, useUnlistNFT } from '@/hooks/useListings';
import { useUserProfile, useUpdateUserProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import { EditListingDialog } from '@/components/EditListingDialog';
import { ProfileEditDialog } from '@/components/ProfileEditDialog';

const Profile = () => {
  const { wallet, disconnect, connect, refreshBalance } = useWallet();
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch user's listings
  const { data: userListings } = useUserListings(wallet?.address || '');
  
  // Fetch user profile data
  const { data: userProfile, isLoading: isProfileLoading } = useUserProfile(wallet?.address || '');
  
  // Fetch marketplace analytics
  const { data: analytics } = useMarketplaceAnalytics('24h');

  // Mutations
  const updateListingMutation = useUpdateListing();
  const deleteListingMutation = useDeleteListing();
  const unlistNFTMutation = useUnlistNFT();
  const updateProfileMutation = useUpdateUserProfile();

  // Auto-refresh balance when profile loads
  useEffect(() => {
    if (wallet?.address) {
      refreshBalance();
      // Load avatar from localStorage
      const savedAvatar = localStorage.getItem(`avatar_${wallet.address}`);
      setUserAvatar(savedAvatar);
    }
  }, [wallet?.address, refreshBalance]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: number) => {
    return `${balance.toFixed(2)} SUI`;
  };

  const handleRefreshBalance = useCallback(async () => {
    setIsRefreshingBalance(true);
    try {
      await refreshBalance();
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    } finally {
      setIsRefreshingBalance(false);
    }
  }, [refreshBalance]);

  const handleSaveProfile = async (profileData: Partial<{ username?: string; bio?: string; avatar_url?: string }>) => {
    if (!wallet?.address) return;
    
    // Update profile in backend (excluding avatar)
    await updateProfileMutation.mutateAsync({
      walletAddress: wallet.address,
      profileData: {
        username: profileData.username,
        bio: profileData.bio,
        email: userProfile?.email // Keep existing email
      }
    });
    
    // Update local avatar if provided
    if (profileData.avatar_url !== undefined) {
      if (profileData.avatar_url) {
        localStorage.setItem(`avatar_${wallet.address}`, profileData.avatar_url);
        setUserAvatar(profileData.avatar_url);
      } else {
        localStorage.removeItem(`avatar_${wallet.address}`);
        setUserAvatar(null);
      }
    }
  };

  const handleViewNFT = (nftId: string) => {
    navigate(`/nft/${nftId}`);
  };

  const handleEditListing = async (listingId: string, newPrice: number) => {
    if (!wallet?.address) return;

    try {
      await updateListingMutation.mutateAsync({
        listing_id: listingId,
        price: newPrice
      });
    } catch (error) {
      console.error('Failed to update listing:', error);
    }
  };

  const handleUnlistNFT = async (nftId: string) => {
    if (!wallet?.address) return;

    try {
      await unlistNFTMutation.mutateAsync({
        nftId,
        walletAddress: wallet.address
      });
    } catch (error) {
      console.error('Failed to unlist NFT:', error);
    }
  };

  if (!wallet?.address) {
    return (
      <div className="min-h-screen bg-background relative">
        <FloatingWarningIcon />
        <CyberNavigation />
        
        <div className="container mx-auto px-6 py-16">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Connect Your Wallet</h3>
            <p className="text-muted-foreground mb-4">
              Connect your wallet to view your profile and manage your NFTs.
            </p>
            <Button onClick={connect}>
              Connect Wallet
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <FloatingWarningIcon />
      <CyberNavigation />
      
      <div className="container mx-auto px-6 py-16">
        {/* Profile Header */}
        <div className="mb-8">
          <div className="flex items-center gap-6">
            <Avatar className="w-20 h-20">
              <AvatarImage src={userAvatar || userProfile?.avatar_url || "/placeholder-avatar.png"} />
              <AvatarFallback className="text-2xl">
                {userProfile?.username 
                  ? userProfile.username.slice(0, 2).toUpperCase()
                  : wallet.address.slice(2, 4).toUpperCase()
                }
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {userProfile?.username || 'User Profile'}
              </h1>
              <p className="text-muted-foreground mb-4">
                {userProfile?.bio || 'Manage your NFTs, listings, and account settings'}
              </p>
              
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  {formatAddress(wallet.address)}
                </Badge>
                
                {wallet.balance && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      {formatBalance(wallet.balance)}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleRefreshBalance}
                      disabled={isRefreshingBalance}
                      className="h-8 w-8 p-0"
                    >
                      <RefreshCw className={`w-4 h-4 ${isRefreshingBalance ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                )}
                
                <Button variant="outline" size="sm" onClick={disconnect} className="hover:text-white hover:bg-primary/20 hover:border-primary/50">
                  <LogOut className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            {
              icon: Shield,
              title: 'Active Listings',
              value: userListings?.filter(l => l.status === 'active').length || 0,
              color: 'text-primary'
            },
            {
              icon: TrendingUp,
              title: 'Total Sales',
              value: userListings?.filter(l => l.status === 'sold').length || 0,
              color: 'text-success'
            },
            {
              icon: Clock,
              title: 'Total Volume',
              value: `${userListings?.reduce((sum, l) => sum + l.price, 0) || 0} SUI`,
              color: 'text-secondary'
            },
            {
              icon: Eye,
              title: 'Profile Views',
              value: analytics?.active_sellers || 0,
              color: 'text-muted-foreground'
            }
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="glass-panel p-6 group hover-glow">
                <div className="flex items-center justify-center mb-4">
                  <Icon className={`w-8 h-8 ${stat.color}`} />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">{stat.value}</h3>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </Card>
            );
          })}
        </div>

        {/* Profile Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="listings">My Listings</TabsTrigger>
            <TabsTrigger value="nfts">My Collection</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card className="glass-panel p-6">
                <h3 className="text-xl font-semibold text-foreground mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {userListings?.slice(0, 5).map((listing, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 bg-muted/20 rounded-lg">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {listing.nft_title || 'Untitled NFT'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Listed for {listing.price} SUI
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={listing.status === 'active' ? 'default' : 'secondary'}>
                          {listing.status}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewNFT(listing.nft_id)}
                          className="hover:text-white hover:bg-primary/20 hover:border-primary/50"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {(!userListings || userListings.length === 0) && (
                    <div className="text-center py-8">
                      <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No recent activity</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Marketplace Stats */}
              <Card className="glass-panel p-6">
                <h3 className="text-xl font-semibold text-foreground mb-4">Marketplace Overview</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-success" />
                      <span className="text-foreground">Total Listings</span>
                    </div>
                    <span className="font-semibold">{analytics?.total_listings || 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-primary" />
                      <span className="text-foreground">Total Volume</span>
                    </div>
                    <span className="font-semibold">{analytics?.total_volume || 0} SUI</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-secondary" />
                      <span className="text-foreground">Active Sellers</span>
                    </div>
                    <span className="font-semibold">{analytics?.active_sellers || 0}</span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="listings">
            <EnhancedListingManager 
              onViewNFT={handleViewNFT}
              onEditListing={handleEditListing}
              onUnlistNFT={handleUnlistNFT}
            />
          </TabsContent>
          
          <TabsContent value="nfts">
            <MyNFTs />
          </TabsContent>
          
          <TabsContent value="settings">
            <Card className="glass-panel p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">Account Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground">Profile Settings</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="hover:text-white hover:bg-primary/20 hover:border-primary/50"
                    onClick={() => setIsProfileEditOpen(true)}
                  >
                    Edit
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground">Security Settings</span>
                  </div>
                  <Button variant="outline" size="sm" className="hover:text-white hover:bg-primary/20 hover:border-primary/50">
                    Configure
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground">Notification Preferences</span>
                  </div>
                  <Button variant="outline" size="sm" className="hover:text-white hover:bg-primary/20 hover:border-primary/50">
                    Manage
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Profile Edit Dialog */}
        <ProfileEditDialog
          isOpen={isProfileEditOpen}
          onClose={() => setIsProfileEditOpen(false)}
          profileData={{
            wallet_address: wallet.address,
            username: userProfile?.username,
            bio: userProfile?.bio,
            avatar_url: userAvatar || userProfile?.avatar_url,
          }}
          onSave={handleSaveProfile}
          isLoading={updateProfileMutation.isPending}
        />
      </div>
    </div>
  );
};

// Enhanced Listing Manager Component
const EnhancedListingManager = ({ 
  onViewNFT, 
  onEditListing, 
  onUnlistNFT 
}: {
  onViewNFT: (nftId: string) => void;
  onEditListing: (listingId: string, newPrice: number) => void;
  onUnlistNFT: (nftId: string) => void;
}) => {
  const { wallet } = useWallet();
  const navigate = useNavigate();

  const { data: userListings, isLoading } = useUserListings(wallet?.address || '');

  const handleEditSuccess = () => {
    // Refetch listings after successful edit
    // The mutation will automatically invalidate queries
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading your listings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Listings</h2>
          <p className="text-muted-foreground">
            Manage your NFT listings and track their performance
          </p>
        </div>
      </div>

      {userListings && userListings.length > 0 ? (
        <div className="grid gap-4">
          {userListings.map((listing) => (
            <Card key={listing.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img 
                    src={listing.nft_image_url || '/placeholder-nft.png'} 
                    alt={listing.nft_title || 'NFT'}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {listing.nft_title || 'Untitled NFT'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Listed for {listing.price} SUI
                    </p>
                    <Badge variant={listing.status === 'active' ? 'default' : 'secondary'}>
                      {listing.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewNFT(listing.nft_id)}
                    className="hover:text-white hover:bg-primary/20 hover:border-primary/50"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  
                  {listing.status === 'active' && (
                    <>
                      <EditListingDialog 
                        listing={listing}
                        onSuccess={handleEditSuccess}
                      />
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onUnlistNFT(listing.nft_id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Unlist
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Listings Yet</h3>
          <p className="text-muted-foreground mb-4">
            You haven't created any listings yet. List your NFTs to start selling.
          </p>
          <Button onClick={() => navigate('/create')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First NFT
          </Button>
        </div>
      )}
    </div>
  );
};

export default Profile; 