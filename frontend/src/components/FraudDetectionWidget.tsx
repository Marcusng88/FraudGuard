import React, { useState, useEffect } from 'react';
import { Shield, Eye, Zap, TrendingUp, Activity, Target, Brain, AlertTriangle, Sparkles } from 'lucide-react';
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
  fraudStats?: {
    total_analyzed: number;
    total_flagged: number;
    detection_accuracy: number;
    protection_rate: number;
    recent_threats_30d: number;
    recent_threats_7d: number;
    ai_uptime: number;
    high_confidence_detections: number;
    threat_prevention_score: number;
    value_protected: number;
  };
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

export function FraudDetectionWidget({ stats, fraudStats, isLoading }: FraudDetectionWidgetProps) {
  const [animatedValues, setAnimatedValues] = useState<number[]>([0, 0, 0, 0]);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number}>>([]);
  
  // Generate particles for hover effect
  const generateParticles = () => {
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));
    setParticles(newParticles);
    
    // Remove particles after animation
    setTimeout(() => setParticles([]), 2000);
  };
  // Animate values on mount and when stats change
  useEffect(() => {
    if (isLoading) return;
    
    // Calculate target values from actual stats
    const targetValues = [
      85, // Protected by AI - use fixed percentage for animation
      fraudStats?.protection_rate || 92, // Protection rate from fraud stats
      fraudStats?.detection_accuracy || (stats?.detection_accuracy ? Math.min(stats.detection_accuracy, 100) : 100.0), // Detection accuracy from backend
      76  // Threats blocked - use fixed percentage for animation
    ];
    
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
  }, [stats, fraudStats, isLoading]); // Include fraudStats in dependencies
  
  // Generate stats for rendering
  const detectionStats: DetectionStat[] = [
    {
      label: 'Total NFTs Secured',
      value: isLoading ? '...' : fraudStats ? fraudStats.total_analyzed.toLocaleString() : (stats ? stats.total_nfts.toLocaleString() : '0'),
      trend: '+12.3%',
      icon: Shield,
      color: 'primary',
      subtitle: 'Protected by AI',
      percentage: 85
    },
    {
      label: 'Value Protected',
      value: isLoading ? '...' : fraudStats ? `${fraudStats.value_protected.toFixed(2)} SUI` : '2,547.50 SUI',
      trend: '+18.4%',
      icon: TrendingUp,
      color: 'success',
      subtitle: 'Secured Assets',
      percentage: fraudStats?.protection_rate || 92
    },
    {
      label: 'Detection Accuracy',
      value: isLoading ? '...' : fraudStats ? `${fraudStats.detection_accuracy}%` : (stats ? `${Math.min(stats.detection_accuracy || 99.2, 100).toFixed(1)}%` : '100.0%'),
      trend: '+0.3%',
      icon: Target,
      color: 'accent',
      subtitle: 'AI Precision',
      percentage: fraudStats?.detection_accuracy || (stats?.detection_accuracy ? Math.min(stats.detection_accuracy, 100) : 100.0)
    },
    {
      label: 'Threats Blocked',
      value: isLoading ? '...' : fraudStats ? fraudStats.recent_threats_30d.toLocaleString() : (stats ? (stats.threats_blocked || 0).toLocaleString() : '0'),
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
          const isHovered = hoveredCard === index;
          
          return (
            <Card
              key={stat.label}
              className="relative overflow-hidden group border-border/20 hover:border-primary/50 transition-all duration-700 bg-background/20 backdrop-blur-sm transform hover:scale-105 hover:-translate-y-2 hover:rotate-1 cursor-pointer"
              style={{ 
                animationDelay: `${index * 150}ms`,
                transformStyle: 'preserve-3d',
                perspective: '1000px'
              }}
              onMouseEnter={() => {
                setHoveredCard(index);
                generateParticles();
              }}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Enhanced background gradient animation with multiple layers */}
              <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-60 transition-opacity duration-700" />
              
              {/* Animated particle effects */}
              {isHovered && particles.map((particle) => (
                <div
                  key={particle.id}
                  className="absolute w-1 h-1 bg-primary rounded-full animate-ping opacity-60"
                  style={{
                    left: `${particle.x}%`,
                    top: `${particle.y}%`,
                    animationDelay: `${Math.random() * 1}s`,
                    animationDuration: '2s'
                  }}
                />
              ))}
              
              {/* Shimmer effect overlay */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              </div>
              
              {/* Enhanced progress indicator with glow */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-muted/20 overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r from-${stat.color} via-${stat.color}/90 to-${stat.color}/70 transition-all duration-2000 ease-out relative`}
                  style={{ width: `${animatedValue}%` }}
                >
                  <div className={`absolute inset-0 bg-${stat.color} animate-pulse opacity-70`} />
                </div>
              </div>
              
              {/* Glowing border effect */}
              <div className={`absolute inset-0 rounded-lg border-2 border-${stat.color}/0 group-hover:border-${stat.color}/30 transition-all duration-500 opacity-0 group-hover:opacity-100`}>
                <div className={`absolute inset-0 rounded-lg shadow-lg shadow-${stat.color}/20 group-hover:shadow-${stat.color}/40 transition-all duration-500`} />
              </div>
              
              <div className="p-6 relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl border ${colorClass} group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 relative`}>
                    <Icon className="w-6 h-6 relative z-10" />
                    {/* Multiple pulse effects */}
                    <div className={`absolute inset-0 rounded-xl bg-${stat.color}/20 animate-ping opacity-0 group-hover:opacity-75 transition-opacity duration-300`} />
                    <div className={`absolute inset-0 rounded-xl bg-${stat.color}/10 animate-pulse opacity-0 group-hover:opacity-90 transition-opacity duration-500`} />
                    {/* Floating sparkles around icon */}
                    {isHovered && (
                      <>
                        <Sparkles className={`absolute -top-2 -right-2 w-3 h-3 text-${stat.color} animate-bounce`} style={{ animationDelay: '0ms' }} />
                        <Sparkles className={`absolute -bottom-2 -left-2 w-3 h-3 text-${stat.color} animate-bounce`} style={{ animationDelay: '200ms' }} />
                        <Sparkles className={`absolute -top-2 -left-2 w-2 h-2 text-${stat.color} animate-bounce`} style={{ animationDelay: '400ms' }} />
                      </>
                    )}
                  </div>
                  <div className="text-right space-y-1 transform group-hover:scale-110 transition-transform duration-300">
                    <Badge 
                      variant="outline" 
                      className={`text-xs transition-all duration-300 group-hover:shadow-lg ${
                        stat.color === 'success' ? 'text-success border-success/30 bg-success/5 group-hover:bg-success/20 group-hover:border-success/50' :
                        stat.color === 'primary' ? 'text-primary border-primary/30 bg-primary/5 group-hover:bg-primary/20 group-hover:border-primary/50' :
                        stat.color === 'accent' ? 'text-accent border-accent/30 bg-accent/5 group-hover:bg-accent/20 group-hover:border-accent/50' :
                        stat.color === 'warning' ? 'text-warning border-warning/30 bg-warning/5 group-hover:bg-warning/20 group-hover:border-warning/50' :
                        'text-destructive border-destructive/30 bg-destructive/5 group-hover:bg-destructive/20 group-hover:border-destructive/50'
                      }`}
                    >
                      {stat.trend}
                    </Badge>
                    {stat.subtitle && (
                      <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-300">{stat.subtitle}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <p className={`text-3xl font-bold neon-text group-hover:text-${stat.color} transition-all duration-500 transform group-hover:scale-110`}
                       style={{ 
                         textShadow: isHovered ? `0 0 10px hsl(var(--${stat.color})), 0 0 20px hsl(var(--${stat.color})), 0 0 30px hsl(var(--${stat.color}))` : undefined 
                       }}>
                      {stat.value}
                    </p>
                    {stat.percentage && (
                      <span className={`text-sm text-muted-foreground group-hover:text-${stat.color} transition-all duration-300 group-hover:scale-110`}>
                        {Math.round(animatedValue)}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300 group-hover:font-semibold">
                    {stat.label}
                  </p>
                </div>
              </div>

              {/* Enhanced scan line effect with multiple layers */}
              <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-${stat.color}/30 to-transparent w-full h-1 animate-scan top-1/2`} />
                <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-${stat.color}/20 to-transparent w-full h-0.5 animate-scan top-1/3`} style={{ animationDelay: '0.5s' }} />
                <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-${stat.color}/15 to-transparent w-full h-0.5 animate-scan top-2/3`} style={{ animationDelay: '1s' }} />
              </div>
              
              {/* Floating corner accents with animation */}
              <div className={`absolute top-3 right-3 w-2 h-2 bg-${stat.color} rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse`} />
              <div className={`absolute bottom-3 left-3 w-1.5 h-1.5 bg-${stat.color}/70 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 animate-ping`} style={{ animationDelay: '0.2s' }} />
              
              {/* Cyberpunk grid overlay */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/10 to-transparent" 
                     style={{
                       backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)',
                       backgroundSize: '20px 20px'
                     }} />
              </div>
              
              {/* Holographic effect */}
              <div className={`absolute inset-0 bg-gradient-to-br from-${stat.color}/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-80 transition-all duration-700 mix-blend-overlay`} />
            </Card>
          );
        })}
      </StaggeredAnimation>

      {/* AI Status Indicator with Enhanced Effects */}
      <ScrollAnimation direction="scale" delay={0.3}>
        <Card className="border-success/30 bg-background/20 backdrop-blur-sm border-border/20 group hover:border-success/50 transition-all duration-700 transform hover:scale-102 hover:-translate-y-1 cursor-pointer relative overflow-hidden">
          {/* Animated background layers */}
          <div className="absolute inset-0 bg-gradient-to-br from-success/10 via-transparent to-accent/5 opacity-0 group-hover:opacity-70 transition-opacity duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-success/10 opacity-0 group-hover:opacity-50 transition-opacity duration-700" />
          
          {/* Floating particles for AI status */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-success rounded-full animate-float"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${30 + (i % 3) * 20}%`,
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: '3s'
                }}
              />
            ))}
          </div>
          
          {/* Matrix-style grid overlay */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500">
            <div className="absolute inset-0" 
                 style={{
                   backgroundImage: 'linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)',
                   backgroundSize: '25px 25px'
                 }} />
          </div>
          
          {/* Glow effect border */}
          <div className="absolute inset-0 rounded-lg border-2 border-success/0 group-hover:border-success/30 transition-all duration-500 opacity-0 group-hover:opacity-100">
            <div className="absolute inset-0 rounded-lg shadow-lg shadow-success/20 group-hover:shadow-success/40 transition-all duration-500" />
          </div>
          
          <div className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                  <div className="p-3 bg-success/10 border border-success/30 rounded-xl relative">
                    <Brain className="w-6 h-6 text-success relative z-10" />
                    {/* Multiple pulsing effects */}
                    <div className="absolute inset-0 bg-success/20 rounded-xl animate-ping opacity-60" />
                    <div className="absolute inset-0 bg-success/10 rounded-xl animate-pulse opacity-0 group-hover:opacity-90 transition-opacity duration-500" />
                  </div>
                  {/* Orbiting particles around brain icon */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute w-1 h-1 bg-success rounded-full animate-spin" 
                         style={{ 
                           top: '10%', 
                           left: '50%', 
                           transformOrigin: '0 20px',
                           animationDuration: '3s' 
                         }} />
                    <div className="absolute w-1 h-1 bg-accent rounded-full animate-spin" 
                         style={{ 
                           top: '50%', 
                           right: '10%', 
                           transformOrigin: '-20px 0',
                           animationDuration: '4s',
                           animationDirection: 'reverse' 
                         }} />
                  </div>
                </div>
                <div className="transform group-hover:translate-x-2 transition-transform duration-300">
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-success transition-colors duration-300 neon-text">
                    AI Protection System
                  </h3>
                  <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                    {isLoading ? 'Loading system status...' : 
                     fraudStats ? `${fraudStats.total_analyzed} NFTs analyzed • ${fraudStats.ai_uptime}% uptime` :
                     'All systems operational and monitoring'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 transform group-hover:scale-110 transition-transform duration-300">
                <Activity className="w-4 h-4 text-success animate-pulse group-hover:animate-bounce" />
                <Badge 
                  variant="outline" 
                  className="text-success border-success/30 bg-success/5 group-hover:bg-success/20 group-hover:border-success/50 group-hover:shadow-lg group-hover:shadow-success/20 transition-all duration-300"
                >
                  Online
                </Badge>
              </div>
            </div>
            
            {/* Real-time activity indicators */}
            <div className="mt-4 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                <span>Real-time Monitoring</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
                <span>Neural Network Active</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 bg-accent rounded-full animate-bounce" />
                <span>Threat Detection</span>
              </div>
            </div>
          </div>
          
          {/* Scanning line effect */}
          <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-success/20 to-transparent w-full h-0.5 animate-scan top-1/4" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-success/15 to-transparent w-full h-0.5 animate-scan top-3/4" style={{ animationDelay: '1s' }} />
          </div>
          
          {/* Corner glow effects */}
          <div className="absolute top-2 right-2 w-2 h-2 bg-success rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse" />
          <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-success/70 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 animate-ping" style={{ animationDelay: '0.3s' }} />
        </Card>
      </ScrollAnimation>
    </div>
  );
}