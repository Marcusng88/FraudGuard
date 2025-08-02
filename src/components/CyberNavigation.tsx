import React from 'react';
import { Shield, BarChart3, Users, Settings, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'Marketplace', icon: BarChart3, active: true },
  { label: 'Profile', icon: Users, active: false },
  { label: 'Create', icon: Zap, active: false },
  { label: 'Settings', icon: Settings, active: false }
];

export function CyberNavigation() {
  return (
    <nav className="glass-panel border-border/30 p-4">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Shield className="w-8 h-8 text-primary animate-float" />
            <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full" />
          </div>
          <div>
            <h1 className="text-xl font-bold neon-text text-primary">
              FraudGuard
            </h1>
            <p className="text-xs text-muted-foreground">AI Protection</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.label}
                variant={item.active ? "cyber" : "glass"}
                size="sm"
                className="gap-2"
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Button>
            );
          })}
        </div>

        {/* Connect Wallet */}
        <Button variant="glow" size="sm" className="relative overflow-hidden">
          <span className="relative z-10">Connect Wallet</span>
          <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/20 to-accent/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </Button>
      </div>
    </nav>
  );
}