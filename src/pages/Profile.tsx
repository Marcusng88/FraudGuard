import React, { useState } from 'react';
import { CyberNavigation } from '@/components/CyberNavigation';
import { FloatingWarningIcon } from '@/components/FloatingWarningIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Shield, 
  Settings, 
  Wallet, 
  Activity, 
  Award, 
  Eye, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Zap
} from 'lucide-react';

// Mock user data
const mockUser = {
  name: 'CyberTrader',
  email: 'cybertrader@fraudguard.com',
  avatar: 'https://i.pinimg.com/736x/12/03/d8/1203d8d16d629bc7eeddb2a6ede57c8d.jpg?w=150&h=150&fit=crop',
  walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  joinDate: 'March 2024',
  totalTrades: 156,
  successfulTrades: 142,
  fraudDetected: 8,
  verificationLevel: 'Verified',
  reputation: 4.8
};

const mockStats = [
  {
    icon: TrendingUp,
    title: 'Total Trades',
    value: mockUser.totalTrades,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/30'
  },
  {
    icon: CheckCircle,
    title: 'Successful',
    value: mockUser.successfulTrades,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/30'
  },
  {
    icon: AlertTriangle,
    title: 'Fraud Detected',
    value: mockUser.fraudDetected,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/30'
  },
  {
    icon: Award,
    title: 'Reputation',
    value: mockUser.reputation,
    color: 'text-secondary',
    bg: 'bg-secondary/10',
    border: 'border-secondary/30'
  }
];

const mockRecentActivity = [
  {
    type: 'trade',
    title: 'Purchased "Cyber Punk #001"',
    description: 'Successfully traded 2.5 ETH',
    timestamp: '2 hours ago',
    status: 'success'
  },
  {
    type: 'fraud',
    title: 'Fraud Alert Prevented',
    description: 'Avoided suspicious NFT transaction',
    timestamp: '1 day ago',
    status: 'warning'
  },
  {
    type: 'verification',
    title: 'Account Verified',
    description: 'Enhanced security level activated',
    timestamp: '3 days ago',
    status: 'success'
  },
  {
    type: 'trade',
    title: 'Sold "Digital Dreams"',
    description: 'Successfully traded 1.8 ETH',
    timestamp: '1 week ago',
    status: 'success'
  }
];

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState(mockUser);

  const handleSave = () => {
    setIsEditing(false);
    // Here you would typically save to backend
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-primary" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Floating warning icon */}
      <FloatingWarningIcon />
      
      {/* Navigation */}
      <CyberNavigation />
      
      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/5 to-secondary/10" />
        
        {/* Floating orbs */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-accent/30 rounded-full blur-2xl animate-pulse-glow" />

        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />

        <div className="relative z-10 container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            {/* Profile Header */}
            <div className="text-center space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="w-24 h-24 border-4 border-primary/30">
                  <AvatarImage src={userData.avatar} alt={userData.name} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {userData.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-foreground">{userData.name}</h1>
                  <p className="text-muted-foreground">{userData.email}</p>
                  <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary">
                    {userData.verificationLevel}
                  </Badge>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {mockStats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div 
                      key={stat.title}
                      className={`glass-panel p-4 text-center ${stat.bg} ${stat.border} border`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <Icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
                      <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.title}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Profile Content */}
      <div className="container mx-auto px-6 space-y-8">
        {/* Profile Information */}
        <section className="glass-panel p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Profile Information</h2>
            <Button
              variant={isEditing ? "cyber" : "glass"}
              size="sm"
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            >
              {isEditing ? 'Save Changes' : 'Edit Profile'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Display Name</label>
                {isEditing ? (
                  <Input
                    value={userData.name}
                    onChange={(e) => setUserData(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 bg-card/30 border-border/50"
                  />
                ) : (
                  <p className="text-foreground mt-1">{userData.name}</p>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                {isEditing ? (
                  <Input
                    value={userData.email}
                    onChange={(e) => setUserData(prev => ({ ...prev, email: e.target.value }))}
                    className="mt-1 bg-card/30 border-border/50"
                  />
                ) : (
                  <p className="text-foreground mt-1">{userData.email}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Wallet Address</label>
                <p className="text-foreground mt-1 font-mono text-sm">{userData.walletAddress}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                <p className="text-foreground mt-1">{userData.joinDate}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="glass-panel p-6">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-foreground">Recent Activity</h2>
            <div className="h-px bg-gradient-to-r from-primary/50 to-transparent flex-1" />
          </div>

          <div className="space-y-4">
            {mockRecentActivity.map((activity, index) => (
              <div 
                key={index}
                className="flex items-center gap-4 p-4 bg-card/20 border border-border/30 rounded-lg hover:bg-card/30 transition-colors"
              >
                <div className="flex-shrink-0">
                  {getStatusIcon(activity.status)}
                </div>
                
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">{activity.title}</h3>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {activity.timestamp}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Security Settings */}
        <section className="glass-panel p-6">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-foreground">Security Settings</h2>
            <div className="h-px bg-gradient-to-r from-primary/50 to-transparent flex-1" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-card/20 border border-border/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-medium text-foreground">Two-Factor Authentication</h3>
                    <p className="text-sm text-muted-foreground">Enhanced account security</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Enable
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-card/20 border border-border/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-medium text-foreground">Wallet Connection</h3>
                    <p className="text-sm text-muted-foreground">Manage connected wallets</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-card/20 border border-border/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-medium text-foreground">Activity Log</h3>
                    <p className="text-sm text-muted-foreground">View account activity</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-card/20 border border-border/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-medium text-foreground">AI Protection</h3>
                    <p className="text-sm text-muted-foreground">Fraud detection settings</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profile; 