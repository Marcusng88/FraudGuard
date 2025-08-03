import React from 'react';
import { Shield, BarChart3, Users, Settings, Zap, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WalletConnection } from '@/components/WalletConnection';
import { useNavigate, useLocation } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', icon: Home, path: '/' },
  { label: 'Marketplace', icon: BarChart3, path: '/marketplace' },
  { label: 'Create', icon: Zap, path: '/create' },
  { label: 'Profile', icon: Users, path: '/profile' }
];

export function CyberNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="glass-panel border-border/30 p-4 sticky top-0 z-50 backdrop-blur-md">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Shield className="w-8 h-8 text-primary animate-float" />
            <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary" style={{ textShadow: '0 0 5px hsl(var(--primary))' }}>
              FraudGuard
            </h1>
            <p className="text-xs text-muted-foreground">AI Protection</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.label}
                variant={isActive ? "cyber" : "glass"}
                size="sm"
                className="gap-2"
                onClick={() => navigate(item.path)}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Button>
            );
          })}
        </div>

        {/* Connect Wallet */}
        <WalletConnection />
      </div>
    </nav>
  );
}