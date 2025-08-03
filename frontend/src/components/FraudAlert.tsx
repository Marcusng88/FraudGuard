import React from 'react';
import { AlertTriangle, Shield, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FraudAlertProps {
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  nftId?: string;
}

const severityConfig = {
  low: {
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    icon: Shield,
    glow: 'shadow-[0_0_20px_hsl(var(--warning)/0.3)]'
  },
  medium: {
    color: 'text-warning',
    bg: 'bg-warning/20',
    border: 'border-warning/50',
    icon: AlertTriangle,
    glow: 'shadow-[0_0_25px_hsl(var(--warning)/0.4)]'
  },
  high: {
    color: 'text-destructive',
    bg: 'bg-destructive/20',
    border: 'border-destructive/50',
    icon: AlertTriangle,
    glow: 'shadow-[0_0_30px_hsl(var(--destructive)/0.5)]'
  },
  critical: {
    color: 'text-destructive',
    bg: 'bg-destructive/30',
    border: 'border-destructive/70',
    icon: Zap,
    glow: 'shadow-[0_0_40px_hsl(var(--destructive)/0.7)]'
  }
};

export function FraudAlert({ severity, title, description, timestamp, nftId }: FraudAlertProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <Card className={`
      glass-panel relative overflow-hidden
      ${config.bg} ${config.border} ${config.glow}
      ${severity === 'critical' ? 'animate-pulse-glow' : ''}
      hover-glow transition-all duration-300
    `}>
      {/* Scan line effect for critical alerts */}
      {severity === 'critical' && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-destructive/20 to-transparent w-full h-1 animate-scan" />
        </div>
      )}

      <div className="p-6 relative z-10">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${config.bg} ${config.color} animate-float`}>
            <Icon className="w-6 h-6" />
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className={`font-semibold ${config.color} neon-text`}>
                {title}
              </h3>
              <Badge variant="outline" className={`${config.color} ${config.border} text-xs`}>
                {severity.toUpperCase()}
              </Badge>
            </div>
            
            <p className="text-muted-foreground text-sm leading-relaxed">
              {description}
            </p>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{timestamp}</span>
              {nftId && (
                <span className="font-mono bg-muted/20 px-2 py-1 rounded">
                  NFT #{nftId}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cyber border effect */}
      <div className="absolute inset-0 cyber-border opacity-50" />
    </Card>
  );
}