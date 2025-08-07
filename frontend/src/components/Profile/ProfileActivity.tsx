import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DollarSign, 
  Package, 
  Eye, 
  TrendingUp,
  Clock,
  Activity
} from 'lucide-react';
import { useUserListings } from '@/hooks/useListings';
import { useWallet } from '@/hooks/useWallet';

export function ProfileActivity() {
  const { wallet } = useWallet();
  const { data: userListings, loading } = useUserListings(wallet?.address || '');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <Card className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-semibold text-foreground">Recent Activity</h3>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="flex items-center gap-4 p-3 bg-muted/20 rounded-lg">
                <div className="w-10 h-10 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!userListings || userListings.length === 0) {
    return (
      <Card className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-semibold text-foreground">Recent Activity</h3>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-2">No recent activity</p>
          <p className="text-sm text-muted-foreground">
            Start by creating your first NFT or listing
          </p>
        </div>
      </Card>
    );
  }

  const recentActivity = userListings
    .slice(0, 5)
    .map(listing => ({
      id: listing.id,
      type: 'listing',
      title: listing.nft_title || 'Untitled NFT',
      description: `Listed for ${listing.price} SUI`,
      status: listing.status,
      timestamp: listing.created_at || new Date().toISOString(),
      icon: DollarSign,
      color: listing.status === 'active' ? 'text-success' : 'text-muted-foreground'
    }));

  return (
    <Card className="glass-panel p-6">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-5 h-5 text-primary" />
        <h3 className="text-xl font-semibold text-foreground">Recent Activity</h3>
      </div>
      
      <div className="space-y-4">
        {recentActivity.map((activity, index) => {
          const Icon = activity.icon;
          return (
            <div key={activity.id || index} className="flex items-center gap-4 p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <Icon className={`w-5 h-5 ${activity.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {activity.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activity.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={activity.status === 'active' ? 'default' : 'secondary'}>
                  {activity.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDate(activity.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
} 