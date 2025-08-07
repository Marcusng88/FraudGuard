import React, { useState, useEffect } from 'react';
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
  Mail,
  Edit
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useProfile } from '@/hooks/useProfile';
import { ListingManager } from '@/components/ListingManager';
import { useUserListings, useMarketplaceAnalytics } from '@/hooks/useListings';
import { ProfileEditModal } from '@/components/ProfileEditModal';

const Profile = () => {
  const { wallet, disconnect, connect } = useWallet();
  const { profile, loading: profileLoading } = useProfile();
  const [activeTab, setActiveTab] = useState('overview');
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Fetch user's listings
  const { data: userListings } = useUserListings(wallet?.address || '');
  
  // Fetch marketplace analytics
  const { data: analytics } = useMarketplaceAnalytics('24h');

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: number) => {
    return `${balance.toFixed(2)} SUI`;
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
              <AvatarImage src={profile?.avatar_url || "/placeholder-avatar.png"} />
              <AvatarFallback className="text-2xl">
                {profile?.username?.slice(0, 2).toUpperCase() || wallet.address.slice(2, 4).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-3xl font-bold text-foreground">
                  {profile?.username || 'User Profile'}
                </h1>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </Button>
              </div>
              
              {profile?.bio && (
                <p className="text-muted-foreground mb-4 max-w-2xl">
                  {profile.bio}
                </p>
              )}
              
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="outline" className="flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  {formatAddress(wallet.address)}
                </Badge>
                
                {wallet.balance && (
                  <Badge variant="outline" className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    {formatBalance(wallet.balance)}
                  </Badge>
                )}

                {profile?.email && (
                  <Badge variant="outline" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {profile.email}
                  </Badge>
                )}
                
                <Button variant="outline" size="sm" onClick={disconnect}>
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
              title: 'Verified NFTs',
              value: userListings?.filter(l => l.status === 'active').length || 0,
              color: 'text-primary'
            },
            {
              icon: TrendingUp,
              title: 'Active Listings',
              value: userListings?.filter(l => l.status === 'active').length || 0,
              color: 'text-success'
            },
            {
              icon: Clock,
              title: 'Total Sales',
              value: profile?.total_sales || 0,
              color: 'text-secondary'
            },
            {
              icon: Eye,
              title: 'Profile Views',
              value: profile?.profile_views || 0,
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
            <TabsTrigger value="nfts">My NFTs</TabsTrigger>
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
                      <Badge variant={listing.status === 'active' ? 'default' : 'secondary'}>
                        {listing.status}
                      </Badge>
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
            <ListingManager />
          </TabsContent>
          
          <TabsContent value="nfts">
            <Card className="glass-panel p-6">
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">My NFTs</h3>
                <p className="text-muted-foreground mb-4">
                  View and manage your NFT collection
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create NFT
                </Button>
              </div>
            </Card>
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
                  <Button variant="outline" size="sm" onClick={() => setEditModalOpen(true)}>
                    Edit
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <span className="text-foreground">Email Address</span>
                      {profile?.email && (
                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setEditModalOpen(true)}>
                    {profile?.email ? 'Edit' : 'Add'}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground">Security Settings</span>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground">Notification Preferences</span>
                  </div>
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Profile Edit Modal */}
      <ProfileEditModal 
        open={editModalOpen} 
        onOpenChange={setEditModalOpen} 
      />
    </div>
  );
};

export default Profile; 