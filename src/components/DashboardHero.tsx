import React from 'react';
import { Shield, Zap, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function DashboardHero() {
  const navigate = useNavigate();

  return (
    <section className="relative py-20 overflow-hidden">
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

      <div className="relative z-10 container mx-auto px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Main headline */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              Trade NFTs
              <br />
              with{' '}
                              <span className="text-primary" style={{ textShadow: '0 0 5px hsl(var(--primary))' }}>
                  Confidence
                </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              AI-powered fraud detection keeps you safe from plagiarism, scams, and suspicious 
              activity in the NFT marketplace.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              variant="cyber" 
              size="lg" 
              className="gap-3 px-8"
              onClick={() => navigate('/marketplace')}
            >
              <BarChart3 className="w-5 h-5" />
              Explore Marketplace
            </Button>
            <Button 
              variant="glow" 
              size="lg" 
              className="gap-3 px-8"
              onClick={() => navigate('/create')}
            >
              <Zap className="w-5 h-5" />
              Create NFT
            </Button>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            {[
              {
                icon: Shield,
                title: 'AI-Powered Protection',
                description: '95% accuracy in fraud detection'
              },
              {
                icon: Zap,
                title: 'Real-time Detection',
                description: 'Instant analysis of all NFT activity'
              },
              {
                icon: BarChart3,
                title: 'Secure Trading',
                description: 'Lightning-fast, secure transactions'
              }
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={feature.title}
                  className="glass-panel p-6 hover-glow group"
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg group-hover:shadow-cyber transition-all duration-300">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3D geometric shapes */}
      <div className="absolute top-1/4 right-10 w-20 h-20 border border-primary/30 rotate-45 animate-cyber-spin" />
      <div className="absolute bottom-1/4 left-10 w-16 h-16 border border-secondary/30 rounded-full animate-pulse-glow" />
    </section>
  );
}