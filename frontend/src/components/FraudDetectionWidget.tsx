import React from 'react';
import { Shield, Eye, Zap, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { MarketplaceStats } from '@/lib/api';

interface DetectionStat {
  label: string;
  value: string;
  trend: string;
  icon: React.ElementType;
  color: 'primary' | 'success' | 'warning' | 'destructive';
}

interface FraudDetectionWidgetProps {
  stats?: MarketplaceStats;
  isLoading?: boolean;
}

const colorClasses = {
  primary: 'text-primary bg-primary/10 border-primary/30',
  success: 'text-success bg-success/10 border-success/30',
  warning: 'text-warning bg-warning/10 border-warning/30',
  destructive: 'text-destructive bg-destructive/10 border-destructive/30'
};

export function FraudDetectionWidget({ stats, isLoading }: FraudDetectionWidgetProps) {
  // Generate stats based on real data or fallback to defaults
  const detectionStats: DetectionStat[] = [
    {
      label: 'Total NFTs',
      value: isLoading ? '...' : stats ? stats.total_nfts.toLocaleString() : '0',
      trend: '+12%',
      icon: Eye,
      color: 'primary'
    },
    {
      label: 'Total Volume',
      value: isLoading ? '...' : stats ? `${stats.total_volume.toFixed(2)} SUI` : '0 SUI',
      trend: '+8%',
      icon: TrendingUp,
      color: 'success'
    },
    {
      label: 'Fraud Detection Rate',
      value: isLoading ? '...' : stats ? `${(stats.fraud_detection_rate * 100).toFixed(1)}%` : '0%',
      trend: '+0.3%',
      icon: Shield,
      color: 'success'
    },
    {
      label: 'Avg Price',
      value: isLoading ? '...' : stats ? `${stats.average_price.toFixed(2)} SUI` : '0 SUI',
      trend: '-5%',
      icon: Zap,
      color: 'warning'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {detectionStats.map((stat, index) => {
        const Icon = stat.icon;
        const colorClass = colorClasses[stat.color];
        
        return (
          <Card
            key={stat.label}
            className="glass-panel hover-glow relative overflow-hidden group"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Background glow effect */}
            <div className={`absolute inset-0 bg-gradient-glow opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            
            <div className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg border ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-xs font-medium ${stat.color === 'success' ? 'text-success' : stat.color === 'warning' ? 'text-warning' : 'text-primary'}`}>
                  {stat.trend}
                </span>
              </div>
              
              <div className="space-y-1">
                <p className="text-2xl font-bold neon-text">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            </div>

            {/* Scan line effect on hover */}
            <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent w-full h-1 animate-scan" />
            </div>
          </Card>
        );
      })}
    </div>
  );
}