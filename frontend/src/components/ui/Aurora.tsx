'use client';

import React from 'react';

export function Aurora() {
  return (
    <div className="aurora-container">
      {/* Aurora layers */}
      <div className="aurora-layer aurora-layer-1"></div>
      <div className="aurora-layer aurora-layer-2"></div>
      <div className="aurora-layer aurora-layer-3"></div>
      <div className="aurora-layer aurora-layer-4"></div>
      
      {/* Particle effects */}
      <div className="aurora-particles">
        {Array.from({ length: 50 }).map((_, i) => {
          // Use deterministic values based on index to prevent hydration mismatch
          const seed = (i * 2654435761) % 2147483647; // Simple hash function
          const left = (seed % 100);
          const top = ((seed * 7) % 100);
          const delay = (seed % 20);
          const duration = 15 + (seed % 10);

          return (
            <div
              key={i}
              className="aurora-particle"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`,
              }}
            />
          );
        })}
      </div>
      
      {/* Gradient overlay for depth */}
      <div className="aurora-overlay"></div>
    </div>
  );
}
