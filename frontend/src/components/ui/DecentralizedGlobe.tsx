'use client';

import React from 'react';

interface DecentralizedGlobeProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function DecentralizedGlobe({ size = 'lg', className = '' }: DecentralizedGlobeProps) {
  const sizes = {
    sm: 'w-32 h-32',
    md: 'w-48 h-48',
    lg: 'w-64 h-64',
    xl: 'w-80 h-80'
  };

  return (
    <div className={`relative ${sizes[size]} ${className}`}>
      {/* Main Globe */}
      <div className="absolute inset-0 animate-spin-slow">
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Globe Background */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="url(#globeGradient)"
            strokeWidth="2"
            className="opacity-30"
          />
          
          {/* Globe Grid Lines */}
          <g stroke="url(#gridGradient)" strokeWidth="1" fill="none" className="opacity-40">
            {/* Horizontal lines */}
            <ellipse cx="100" cy="100" rx="90" ry="30" />
            <ellipse cx="100" cy="100" rx="90" ry="60" />
            <ellipse cx="100" cy="100" rx="90" ry="90" />
            
            {/* Vertical lines */}
            <ellipse cx="100" cy="100" rx="30" ry="90" />
            <ellipse cx="100" cy="100" rx="60" ry="90" />
            <line x1="100" y1="10" x2="100" y2="190" />
          </g>

          {/* Network Nodes */}
          <g className="animate-pulse">
            {/* Primary nodes */}
            <circle cx="70" cy="50" r="3" fill="var(--primary-blue)" className="animate-ping" />
            <circle cx="130" cy="70" r="3" fill="var(--success-green)" className="animate-ping" style={{animationDelay: '0.5s'}} />
            <circle cx="60" cy="120" r="3" fill="var(--primary-purple)" className="animate-ping" style={{animationDelay: '1s'}} />
            <circle cx="140" cy="140" r="3" fill="var(--info-blue)" className="animate-ping" style={{animationDelay: '1.5s'}} />
            <circle cx="100" cy="40" r="3" fill="var(--warning-orange)" className="animate-ping" style={{animationDelay: '2s'}} />
            <circle cx="80" cy="160" r="3" fill="var(--primary-blue)" className="animate-ping" style={{animationDelay: '2.5s'}} />
            <circle cx="150" cy="100" r="3" fill="var(--success-green)" className="animate-ping" style={{animationDelay: '3s'}} />
            <circle cx="50" cy="90" r="3" fill="var(--primary-purple)" className="animate-ping" style={{animationDelay: '3.5s'}} />

            {/* Secondary nodes */}
            <circle cx="85" cy="75" r="2" fill="var(--info-blue)" className="animate-ping" style={{animationDelay: '4s'}} />
            <circle cx="115" cy="125" r="2" fill="var(--warning-orange)" className="animate-ping" style={{animationDelay: '4.5s'}} />
            <circle cx="75" cy="110" r="2" fill="var(--success-green)" className="animate-ping" style={{animationDelay: '5s'}} />
            <circle cx="125" cy="55" r="2" fill="var(--primary-purple)" className="animate-ping" style={{animationDelay: '5.5s'}} />
          </g>

          {/* Connection Lines */}
          <g stroke="url(#connectionGradient)" strokeWidth="1" fill="none" className="opacity-60">
            {/* Primary connections */}
            <line x1="70" y1="50" x2="130" y2="70" className="animate-pulse" />
            <line x1="130" y1="70" x2="140" y2="140" className="animate-pulse" style={{animationDelay: '0.5s'}} />
            <line x1="60" y1="120" x2="80" y2="160" className="animate-pulse" style={{animationDelay: '1s'}} />
            <line x1="100" y1="40" x2="150" y2="100" className="animate-pulse" style={{animationDelay: '1.5s'}} />
            <line x1="50" y1="90" x2="70" y2="50" className="animate-pulse" style={{animationDelay: '2s'}} />
            <line x1="80" y1="160" x2="140" y2="140" className="animate-pulse" style={{animationDelay: '2.5s'}} />

            {/* Secondary connections */}
            <line x1="85" y1="75" x2="115" y2="125" className="animate-pulse" style={{animationDelay: '3s'}} />
            <line x1="75" y1="110" x2="125" y2="55" className="animate-pulse" style={{animationDelay: '3.5s'}} />
            <line x1="100" y1="40" x2="85" y2="75" className="animate-pulse" style={{animationDelay: '4s'}} />
            <line x1="150" y1="100" x2="115" y2="125" className="animate-pulse" style={{animationDelay: '4.5s'}} />
          </g>

          {/* Gradients */}
          <defs>
            <linearGradient id="globeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--primary-blue)" />
              <stop offset="50%" stopColor="var(--primary-purple)" />
              <stop offset="100%" stopColor="var(--info-blue)" />
            </linearGradient>
            
            <linearGradient id="gridGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--text-secondary)" />
              <stop offset="100%" stopColor="var(--primary-blue)" />
            </linearGradient>
            
            <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--primary-blue)" />
              <stop offset="50%" stopColor="var(--success-green)" />
              <stop offset="100%" stopColor="var(--primary-purple)" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Orbiting Elements */}
      <div className="absolute inset-0 animate-spin-reverse">
        <div className="relative w-full h-full">
          {/* Outer orbit */}
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gradient-to-r from-green-400 to-blue-400 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-2 transform -translate-y-1/2 w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-1/2 right-2 transform -translate-y-1/2 w-2 h-2 bg-gradient-to-r from-orange-400 to-red-400 rounded-full animate-pulse" style={{animationDelay: '3s'}}></div>
        </div>
      </div>

      {/* Central Glow Effect */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse shadow-lg shadow-blue-500/50"></div>
      </div>
    </div>
  );
}
