import React from 'react';
import { AlertTriangle, Shield, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface NftCardProps {
  id: string;
  title: string;
  image: string;
  price: string;
  creator: string;
  flagged?: boolean;
  threatLevel?: 'safe' | 'warning' | 'danger';
}

const threatConfig = {
  safe: {
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/30',
    icon: Shield,
    label: 'VERIFIED'
  },
  warning: {
    color: 'text-warning',
    bg: 'bg-warning/20',
    border: 'border-warning/50',
    icon: Eye,
    label: 'SUSPICIOUS'
  },
  danger: {
    color: 'text-destructive',
    bg: 'bg-destructive/20',
    border: 'border-destructive/50',
    icon: AlertTriangle,
    label: 'FLAGGED'
  }
};

export function NftCard({ id, title, image, price, creator, flagged = false, threatLevel = 'safe' }: NftCardProps) {
  const config = threatConfig[threatLevel];
  const Icon = config.icon;

  return (
    <Card className={`
      glass-panel relative overflow-hidden group hover-glow
      ${flagged ? 'fraud-alert border-destructive/50' : ''}
      transition-all duration-300
    `}>
      {/* Threat indicator */}
      <div className={`absolute top-3 right-3 z-20 p-2 rounded-lg ${config.bg} ${config.border} border`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>

      {/* Scan line effect for flagged items */}
      {flagged && (
        <div className="absolute inset-0 overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-destructive/20 to-transparent w-full h-1 animate-scan" />
        </div>
      )}

      {/* Image container with 3D effect */}
      <div className="relative overflow-hidden rounded-t-lg">
        <img 
          src={image} 
          alt={title}
          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
          style={{
            filter: flagged ? 'brightness(0.7) sepia(0.3) hue-rotate(320deg)' : 'none'
          }}
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        
        {/* Price overlay */}
        <div className="absolute bottom-3 left-3 glass-panel p-2 rounded-lg">
          <p className="text-sm font-bold text-primary neon-text">{price}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="space-y-2">
          <h3 className="font-semibold text-foreground truncate">{title}</h3>
          <p className="text-sm text-muted-foreground">by {creator}</p>
        </div>

        {/* Status badge */}
        <Badge 
          variant="outline" 
          className={`${config.color} ${config.border} text-xs font-mono`}
        >
          {config.label}
        </Badge>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button 
            variant={threatLevel === 'danger' ? 'fraud' : 'cyber'} 
            size="sm" 
            className="flex-1"
          >
            {threatLevel === 'danger' ? 'Review' : 'Buy Now'}
          </Button>
          <Button variant="glass" size="sm">
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Cyber border effect */}
      <div className="absolute inset-0 cyber-border opacity-30 group-hover:opacity-60 transition-opacity" />
    </Card>
  );
}