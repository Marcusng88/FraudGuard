import React from 'react';
import { Shield, Loader2, Zap } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  showProgress?: boolean;
  progress?: number;
}

export function LoadingScreen({ 
  message = "Loading...", 
  showProgress = false, 
  progress = 0 
}: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/5 to-secondary/10" />
      
      {/* Floating orbs */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-accent/30 rounded-full blur-2xl animate-pulse-glow" />

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Main loading content */}
      <div className="relative z-10 text-center space-y-8">
        {/* Logo and loading animation */}
        <div className="relative">
          <div className="glass-panel p-8 rounded-full border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
            <div className="relative">
              <Shield className="w-16 h-16 text-primary animate-pulse" />
              {/* Rotating ring */}
              <div className="absolute inset-0 w-20 h-20 border-2 border-primary/30 border-t-primary rounded-full animate-spin -m-2" />
              {/* Outer ring */}
              <div className="absolute inset-0 w-24 h-24 border border-primary/20 rounded-full animate-pulse -m-4" />
            </div>
          </div>
          
          {/* Floating particles */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-primary/40 rounded-full animate-ping"
              style={{
                top: `${25 + Math.sin(i * Math.PI * 0.25) * 40}%`,
                left: `${25 + Math.cos(i * Math.PI * 0.25) * 40}%`,
                animationDelay: `${i * 0.2}s`
              }}
            />
          ))}
        </div>

        {/* Loading text */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground neon-text">
            FraudGuard
          </h2>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {message}
          </p>
        </div>

        {/* Progress bar (if enabled) */}
        {showProgress && (
          <div className="w-64 mx-auto space-y-2">
            <div className="w-full bg-muted/20 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {Math.round(progress)}% Complete
            </p>
          </div>
        )}

        {/* Status indicators */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-muted-foreground">AI System Active</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent animate-pulse" />
            <span className="text-muted-foreground">Securing Data</span>
          </div>
        </div>
      </div>

      {/* Scan lines effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent h-1 animate-scan" style={{ top: '20%' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/5 to-transparent h-1 animate-scan" style={{ top: '60%', animationDelay: '1s' }} />
      </div>
    </div>
  );
}

// Skeleton loader for cards
export function SkeletonCard() {
  return (
    <div className="glass-panel overflow-hidden animate-pulse">
      <div className="aspect-square bg-gradient-to-br from-muted/20 to-muted/5 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          <div className="h-4 bg-muted/30 rounded animate-pulse" />
          <div className="h-3 bg-muted/20 rounded w-2/3 animate-pulse" />
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="h-4 bg-muted/30 rounded animate-pulse" />
        <div className="h-3 bg-muted/20 rounded w-1/2 animate-pulse" />
        <div className="flex justify-between items-center">
          <div className="h-3 bg-muted/20 rounded w-1/3 animate-pulse" />
          <div className="h-6 bg-muted/30 rounded w-16 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// Loading dots animation
export function LoadingDots() {
  return (
    <div className="flex items-center justify-center gap-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 bg-primary rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}
