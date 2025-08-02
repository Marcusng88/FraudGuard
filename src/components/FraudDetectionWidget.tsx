import React from 'react';
import { Shield, Eye, Zap, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface DetectionStat {
  label: string;
  value: string;
  trend: string;
  icon: React.ElementType;
  color: 'primary' | 'success' | 'warning' | 'destructive';
}

const stats: DetectionStat[] = [
  {
    label: 'Total Scans',
    value: '15,247',
    trend: '+12%',
    icon: Eye,
    color: 'primary'
  },
  {
    label: 'Threats Blocked',
    value: '342',
    trend: '+8%',
    icon: Shield,
    color: 'success'
  },
  {
    label: 'Active Alerts',
    value: '7',
    trend: '-15%',
    icon: Zap,
    color: 'warning'
  },
  {
    label: 'Success Rate',
    value: '98.7%',
    trend: '+0.3%',
    icon: TrendingUp,
    color: 'success'
  }
];

const colorClasses = {
  primary: 'text-primary bg-primary/10 border-primary/30',
  success: 'text-success bg-success/10 border-success/30',
  warning: 'text-warning bg-warning/10 border-warning/30',
  destructive: 'text-destructive bg-destructive/10 border-destructive/30'
};

export function FraudDetectionWidget() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
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