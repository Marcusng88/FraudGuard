import React, { useState, useEffect } from 'react';
import { Shield, Eye, Zap, TrendingUp, Activity, Target, Brain, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MarketplaceStats } from '@/lib/api';
import { ScrollAnimation, StaggeredAnimation } from '@/components/ScrollAnimation';

interface DetectionStat {
  label: string;
  value: string;
  trend: string;
  icon: React.ElementType;
  color: 'primary' | 'success' | 'warning' | 'destructive' | 'accent';
  subtitle?: string;
  percentage?: number;
}

interface FraudDetectionWidgetProps {
  stats?: MarketplaceStats;
  isLoading?: boolean;
}

const colorClasses = {
  primary: 'text-primary bg-primary/10 border-primary/30',
  success: 'text-success bg-success/10 border-success/30',
  warning: 'text-warning bg-warning/10 border-warning/30',
  destructive: 'text-destructive bg-destructive/10 border-destructive/30',
  accent: 'text-accent bg-accent/10 border-accent/30'
};

const gradientClasses = {
  primary: 'from-primary/20 to-primary/5',
  success: 'from-success/20 to-success/5',
  warning: 'from-warning/20 to-warning/5',
  destructive: 'from-destructive/20 to-destructive/5',
  accent: 'from-accent/20 to-accent/5'
};

export function FraudDetectionWidget({ stats, isLoading }: FraudDetectionWidgetProps) {
  const [animatedValues, setAnimatedValues] = useState<number[]>([0, 0, 0, 0]);
  
  // Animate values on mount
  useEffect(() => {
    const targetValues = [85, 92, 99, 76]; // Static percentages for animation
    const duration = 2000; // 2 seconds
    const steps = 60; // 60 FPS
    const increment = targetValues.map(target => target / steps);
    
    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      setAnimatedValues(prev => 
        prev.map((_, index) => 
          Math.min(increment[index] * currentStep, targetValues[index])
        )
      );
      
      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [stats, isLoading]); // Include stats and isLoading as dependencies
  
  // Generate stats for rendering
  const detectionStats: DetectionStat[] = [
    {
      label: 'Total NFTs Secured',
      value: isLoading ? '...' : stats ? stats.total_nfts.toLocaleString() : '12,847',
      trend: '+12.3%',
      icon: Shield,
      color: 'primary',
      subtitle: 'Protected by AI',
      percentage: 85
    },
    {
      label: 'Total Volume',
      value: isLoading ? '...' : stats ? `${stats.total_volume.toFixed(2)} SUI` : '1,247.3 SUI',
      trend: '+8.7%',
      icon: TrendingUp,
      color: 'success',
      subtitle: 'Secured Value',
      percentage: 92
    },
    {
      label: 'Detection Accuracy',
      value: isLoading ? '...' : stats ? `${Math.min(stats.fraud_detection_rate > 1 ? stats.fraud_detection_rate : stats.fraud_detection_rate * 100, 100).toFixed(1)}%` : '99.2%',
      trend: '+0.3%',
      icon: Target,
      color: 'accent',
      subtitle: 'AI Precision',
      percentage: 99
    },
    {
      label: 'Threats Blocked',
      value: isLoading ? '...' : '1,392',
      trend: '+15.2%',
      icon: AlertTriangle,
      color: 'destructive',
      subtitle: 'This Month',
      percentage: 76
    }
  ];

  return (
    <div className="space-y-8">
      {/* Main Stats Grid */}
      <StaggeredAnimation 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        staggerDelay={0.15}
        direction="up"
      >
        {detectionStats.map((stat, index) => {
          const Icon = stat.icon;
          const colorClass = colorClasses[stat.color];
          const gradientClass = gradientClasses[stat.color];
          const animatedValue = animatedValues[index] || 0;
          
          return (
            <Card
              key={stat.label}
              className="relative overflow-hidden group border-border/20 hover:border-primary/30 transition-all duration-500 bg-background/20 backdrop-blur-sm"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {/* Background gradient animation */}
              <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              
              {/* Progress indicator */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-muted/20 overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r from-${stat.color} to-${stat.color}/70 transition-all duration-2000 ease-out`}
                  style={{ width: `${animatedValue}%` }}
                />
              </div>
              
              <div className="p-6 relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl border ${colorClass} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6" />
                    {/* Pulse effect on icon */}
                    <div className={`absolute inset-0 rounded-xl bg-${stat.color}/20 animate-ping opacity-0 group-hover:opacity-75`} />
                  </div>
                  <div className="text-right space-y-1">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        stat.color === 'success' ? 'text-success border-success/30 bg-success/5' :
                        stat.color === 'primary' ? 'text-primary border-primary/30 bg-primary/5' :
                        stat.color === 'accent' ? 'text-accent border-accent/30 bg-accent/5' :
                        stat.color === 'warning' ? 'text-warning border-warning/30 bg-warning/5' :
                        'text-destructive border-destructive/30 bg-destructive/5'
                      }`}
                    >
                      {stat.trend}
                    </Badge>
                    {stat.subtitle && (
                      <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <p className="text-3xl font-bold neon-text group-hover:text-primary transition-colors">
                      {stat.value}
                    </p>
                    {stat.percentage && (
                      <span className="text-sm text-muted-foreground">
                        {Math.round(animatedValue)}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    {stat.label}
                  </p>
                </div>
              </div>

              {/* Scan line effect on hover */}
              <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent w-full h-1 animate-scan top-1/2" />
              </div>
              
              {/* Corner accent */}
              <div className={`absolute top-3 right-3 w-2 h-2 bg-${stat.color} rounded-full opacity-0 group-hover:opacity-100 transition-opacity animate-pulse`} />
            </Card>
          );
        })}
      </StaggeredAnimation>

      {/* AI Status Indicator */}
      <ScrollAnimation direction="scale" delay={0.3}>
        <Card className="border-success/30 bg-background/20 backdrop-blur-sm border-border/20">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="p-3 bg-success/10 border border-success/30 rounded-xl">
                    <Brain className="w-6 h-6 text-success" />
                  </div>
                  <div className="absolute inset-0 bg-success/20 rounded-xl animate-ping" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">AI Protection System</h3>
                  <p className="text-sm text-muted-foreground">All systems operational and monitoring</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-success animate-pulse" />
                <Badge variant="outline" className="text-success border-success/30 bg-success/5">
                  Online
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      </ScrollAnimation>
    </div>
  );
}