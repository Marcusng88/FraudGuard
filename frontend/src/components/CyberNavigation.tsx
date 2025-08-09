import React, { useState, useEffect } from 'react';
import { Shield, BarChart3, Users, Settings, Zap, Home, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WalletConnection } from '@/components/WalletConnection';
import { useNavigate, useLocation } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', icon: Home, path: '/dashboard' },
  { label: 'Marketplace', icon: BarChart3, path: '/marketplace' },
  { label: 'Create', icon: Zap, path: '/create' },
  { label: 'Profile', icon: Users, path: '/profile' }
];

export function CyberNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav className={`glass-panel border-border/30 p-4 sticky top-0 z-50 backdrop-blur-md transition-all duration-300 ${
        scrolled ? 'border-b border-primary/20 shadow-glow' : ''
      }`}>
        <div className="flex items-center justify-between relative">
          {/* Logo - Enhanced */}
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="relative">
              <img 
                src="/FraudGuard_Logo.png" 
                alt="FraudGuard Logo" 
                className="w-10 h-10 animate-float group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full group-hover:bg-primary/50 transition-colors duration-300" />
              {/* Orbital ring */}
              <div className="absolute inset-0 w-12 h-12 border border-primary/30 rounded-full animate-spin" style={{ animation: 'spin 20s linear infinite' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-primary group-hover:text-accent transition-colors duration-300" 
                    style={{ textShadow: '0 0 5px hsl(var(--primary))' }}>
                  FraudGuard
                </h1>
                <Badge variant="outline" className="text-xs px-2 py-0 bg-success/10 text-success border-success/30">
                  v2.0
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">AI Protection System</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.label}
                  variant={isActive ? "cyber" : "glass"}
                  size="sm"
                  className={`gap-2 relative overflow-hidden transition-all duration-300 ${
                    isActive ? 'shadow-cyber' : 'hover:shadow-glow'
                  }`}
                  onClick={() => navigate(item.path)}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
                  {item.label}
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-accent to-primary animate-pulse" />
                  )}
                  
                  {/* Hover effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </Button>
              );
            })}
          </div>

          {/* Desktop Wallet Connection */}
          <div className="hidden md:block">
            <WalletConnection />
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="glass"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>

        {/* System Status Indicator */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <span className="text-xs text-success hidden lg:inline">Online</span>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Mobile Menu */}
          <div className="absolute top-20 left-4 right-4 glass-panel border-border/30 p-6 space-y-4 animate-[slideInFromTop_0.3s_ease-out]">
            {/* Mobile Navigation Links */}
            <div className="space-y-2">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Button
                    key={item.label}
                    variant={isActive ? "cyber" : "glass"}
                    size="sm"
                    className={`w-full justify-start gap-3 transition-all duration-300`}
                    onClick={() => {
                      navigate(item.path);
                      setIsMobileMenuOpen(false);
                    }}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
                    {item.label}
                    {isActive && (
                      <Badge variant="outline" className="ml-auto text-xs bg-primary/10 text-primary border-primary/30">
                        Active
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>
            
            {/* Mobile Wallet Connection */}
            <div className="border-t border-border/30 pt-4">
              <WalletConnection />
            </div>
            
            {/* Mobile Status */}
            <div className="border-t border-border/30 pt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">System Status</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                <span className="text-success">All Systems Online</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating particles for enhanced visual effect */}
      <div className="fixed top-0 left-0 w-full h-screen pointer-events-none z-0 overflow-hidden">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>
    </>
  );
}