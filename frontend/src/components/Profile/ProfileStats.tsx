import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  TrendingUp, 
  Clock, 
  Eye, 
  DollarSign,
  Package,
  Users
} from 'lucide-react';
import { useProfileStats } from '@/hooks/useProfileStats';

export function ProfileStats() {
  const { stats, loading } = useProfileStats();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="glass-panel p-6">
            <div className="animate-pulse">
              <div className="w-8 h-8 bg-muted rounded-full mx-auto mb-4"></div>
              <div className="h-6 bg-muted rounded w-1/2 mx-auto mb-2"></div>
              <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      icon: Package,
      title: 'Total NFTs',
      value: stats.total_nfts,
      color: 'text-primary',
      description: 'NFTs in collection'
    },
    {
      icon: TrendingUp,
      title: 'Active Listings',
      value: stats.active_listings,
      color: 'text-success',
      description: 'Currently listed'
    },
    {
      icon: DollarSign,
      title: 'Total Sales',
      value: stats.total_sales,
      color: 'text-secondary',
      description: 'Completed sales'
    },
    {
      icon: Eye,
      title: 'Profile Views',
      value: stats.profile_views,
      color: 'text-muted-foreground',
      description: 'Profile visits'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="glass-panel p-6 group hover-glow transition-all duration-200">
            <div className="flex items-center justify-center mb-4">
              <div className={`p-3 rounded-full bg-muted/20 group-hover:bg-primary/20 transition-colors`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-foreground mb-1">
                {stat.value.toLocaleString()}
              </h3>
              <p className="text-sm font-medium text-foreground mb-1">{stat.title}</p>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
} 