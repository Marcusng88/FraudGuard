import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function FloatingWarningIcon() {
  return (
    <div className="fixed top-4 right-4 z-50 animate-float">
      <div className="relative">
        {/* Outer glow ring */}
        <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl scale-150 animate-pulse-glow" />
        
        {/* Middle glow */}
        <div className="absolute inset-0 bg-destructive/30 rounded-full blur-lg scale-125 animate-pulse-glow" style={{ animationDelay: '1s' }} />
        
        {/* Icon container with 3D effect */}
        <div className="relative bg-destructive/20 backdrop-blur-md border border-destructive/50 rounded-full p-4 hover:scale-110 transition-transform duration-300 group">
          <AlertTriangle 
            className="w-6 h-6 text-destructive animate-pulse-glow" 
            style={{
              filter: 'drop-shadow(0 0 8px hsl(var(--destructive)))',
              transform: 'perspective(100px) rotateX(10deg) rotateY(5deg)'
            }}
          />
          
          {/* Scan line effect */}
          <div className="absolute inset-0 overflow-hidden rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-destructive/30 to-transparent w-full h-1 animate-scan" />
          </div>
        </div>

        {/* Floating particles */}
        <div className="absolute -top-2 -right-2 w-2 h-2 bg-destructive rounded-full animate-pulse-glow" style={{ animationDelay: '0.5s' }} />
        <div className="absolute -bottom-1 -left-1 w-1 h-1 bg-destructive/70 rounded-full animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
      </div>
    </div>
  );
}