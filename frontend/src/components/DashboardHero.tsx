import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Zap, BarChart3, Brain, Lock, Sparkles, DollarSign, TrendingUp, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollAnimation, StaggeredAnimation } from '@/components/ScrollAnimation';
import { useNavigate } from 'react-router-dom';

// Colors array outside component to avoid dependency issues - Subtle colors
const BLOCK_COLORS = [
  '#3a70c4', // subtle blue
  '#1a9f5e', // subtle emerald
  '#d84444', // subtle red
  '#d4b02a', // subtle yellow
  '#7e61d4', // subtle violet
  '#c84590', // subtle pink
  '#15a3b8', // subtle cyan
  '#28a855', // subtle green
];

// Crypto icons and their properties
const CRYPTO_TYPES = [
  { 
    name: 'Bitcoin', 
    symbol: '₿', 
    color: '#f7931a',
    rarity: 0.1, // 10% chance
    glow: '#ff9500'
  },
  { 
    name: 'Ethereum', 
    symbol: 'Ξ', 
    color: '#627eea',
    rarity: 0.15, // 15% chance
    glow: '#627eea'
  },
  { 
    name: 'Sui', 
    symbol: 'S', 
    color: '#00c3ff',
    rarity: 0.2, // 20% chance
    glow: '#00c3ff'
  },
  { 
    name: 'Solana', 
    symbol: '◎', 
    color: '#14f195',
    rarity: 0.15, // 15% chance
    glow: '#14f195'
  },
  { 
    name: 'Cardano', 
    symbol: '₳', 
    color: '#0033ad',
    rarity: 0.12, // 12% chance
    glow: '#0066ff'
  },
  { 
    name: 'Polygon', 
    symbol: '⬟', 
    color: '#8247e5',
    rarity: 0.18, // 18% chance
    glow: '#a855f7'
  },
  { 
    name: 'Dogecoin', 
    symbol: 'Đ', 
    color: '#c2a633',
    rarity: 0.1, // 10% chance (rare)
    glow: '#fbbf24'
  }
];

// Particle effect for crypto collection
const ParticleEffect = ({ x, y, color }: { x: number; y: number; color: string }) => {
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    angle: (i * 45) * (Math.PI / 180), // Convert to radians
    distance: 30 + Math.random() * 20,
    duration: 0.5 + Math.random() * 0.3
  }));

  return (
    <div className="absolute pointer-events-none" style={{ left: x, top: y, zIndex: 50 }}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-1 h-1 rounded-full"
          style={{
            backgroundColor: color,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            animation: `particle-burst-${particle.id} ${particle.duration}s ease-out forwards`,
            boxShadow: `0 0 4px ${color}`
          }}
        />
      ))}
      <style>
        {particles.map((particle) => `
          @keyframes particle-burst-${particle.id} {
            to {
              transform: translate(
                calc(-50% + ${Math.cos(particle.angle) * particle.distance}px), 
                calc(-50% + ${Math.sin(particle.angle) * particle.distance}px)
              );
              opacity: 0;
            }
          }
        `).join('')}
      </style>
    </div>
  );
};

// Snake body segments for the hungry snake effect
interface SnakeSegment {
  row: number;
  col: number;
  timestamp: number;
  isHead?: boolean;
}

// Crypto block interface
interface CryptoBlock {
  id: number;
  row: number;
  col: number;
  crypto: typeof CRYPTO_TYPES[0];
  timestamp: number;
  collected: boolean;
  intensity: number;
}

// Interactive block component
const InteractiveBlock = ({ 
  index, 
  row, 
  col, 
  isActive, 
  color, 
  intensity,
  cryptoBlock
}: { 
  index: number; 
  row: number; 
  col: number; 
  isActive: boolean;
  color: string;
  intensity: number;
  cryptoBlock?: CryptoBlock;
}) => {
  const isCryptoBlock = cryptoBlock && !cryptoBlock.collected;
  
  return (
    <div
      className="absolute w-8 h-8 border border-border/10 transition-all duration-300 pointer-events-none flex items-center justify-center"
      style={{
        left: `${col * 32}px`,
        top: `${row * 32}px`,
        backgroundColor: isCryptoBlock 
          ? `${cryptoBlock.crypto.color}33` 
          : isActive 
            ? `${color}99`
            : 'rgba(255, 255, 255, 0.04)',
        boxShadow: isCryptoBlock
          ? `0 0 ${20 * cryptoBlock.intensity}px ${cryptoBlock.crypto.glow}, 0 0 ${40 * cryptoBlock.intensity}px ${cryptoBlock.crypto.glow}66`
          : isActive 
            ? `0 0 ${12 * intensity}px ${color}66`
            : 'none',
        transform: isCryptoBlock 
          ? `scale(${1 + cryptoBlock.intensity * 0.5}) rotate(${Math.sin(Date.now() * 0.005 + index) * 5}deg)`
          : isActive 
            ? `scale(${1 + intensity * 0.3})` 
            : 'scale(1)',
        borderColor: isCryptoBlock ? cryptoBlock.crypto.color : undefined,
        borderWidth: isCryptoBlock ? '2px' : '1px',
      }}
    >
      {isCryptoBlock && (
        <span 
          className="text-xs font-bold animate-pulse"
          style={{ 
            color: cryptoBlock.crypto.color,
            textShadow: `0 0 8px ${cryptoBlock.crypto.glow}`,
            fontSize: '10px'
          }}
        >
          {cryptoBlock.crypto.symbol}
        </span>
      )}
    </div>
  );
};

export function DashboardHero() {
  const navigate = useNavigate();
  const [currentStat, setCurrentStat] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeBlocks, setActiveBlocks] = useState<Map<number, { color: string; intensity: number; timestamp: number }>>(new Map());
  const [cryptoBlocks, setCryptoBlocks] = useState<Map<number, CryptoBlock>>(new Map());
  const [snakeSegments, setSnakeSegments] = useState<SnakeSegment[]>([]);
  const [score, setScore] = useState(0);
  const [particles, setParticles] = useState<Array<{id: number; x: number; y: number; color: string; timestamp: number}>>([]);
  
  const liveStats = [
    { label: 'Threats Blocked', value: '47', suffix: 'today' },
    { label: 'NFTs Protected', value: '12.4K', suffix: 'total' },
    { label: 'Uptime', value: '99.7%', suffix: 'this month' },
    { label: 'Users Protected', value: '2.4K+', suffix: 'active' },
    { label: 'Crypto Collected', value: score.toString(), suffix: 'points' }
  ];

  // Calculate grid dimensions - Extended for larger coverage
  const gridCols = Math.floor((typeof window !== 'undefined' ? window.innerWidth : 1200) / 32);
  const gridRows = Math.floor(((typeof window !== 'undefined' ? window.innerHeight : 800) + 400) / 32); // Extended height
  const totalBlocks = gridCols * gridRows;

  // Generate random crypto blocks periodically
  useEffect(() => {
    const generateCryptoBlock = () => {
      const availablePositions: number[] = [];
      
      // Find empty positions
      for (let i = 0; i < totalBlocks; i++) {
        if (!cryptoBlocks.has(i)) {
          availablePositions.push(i);
        }
      }
      
      if (availablePositions.length === 0) return;
      
      // Randomly select a position
      const randomIndex = availablePositions[Math.floor(Math.random() * availablePositions.length)];
      const row = Math.floor(randomIndex / gridCols);
      const col = randomIndex % gridCols;
      
      // Select a random crypto type based on rarity
      const random = Math.random();
      let selectedCrypto = CRYPTO_TYPES[0];
      let cumulativeRarity = 0;
      
      for (const crypto of CRYPTO_TYPES) {
        cumulativeRarity += crypto.rarity;
        if (random <= cumulativeRarity) {
          selectedCrypto = crypto;
          break;
        }
      }
      
      const newCryptoBlock: CryptoBlock = {
        id: Date.now() + Math.random(),
        row,
        col,
        crypto: selectedCrypto,
        timestamp: Date.now(),
        collected: false,
        intensity: 1
      };
      
      setCryptoBlocks(prev => new Map(prev).set(randomIndex, newCryptoBlock));
    };

    // Generate crypto blocks every 2-4 seconds
    const interval = setInterval(() => {
      if (Math.random() < 0.7) { // 70% chance to generate
        generateCryptoBlock();
      }
    }, 2000 + Math.random() * 2000);

    return () => clearInterval(interval);
  }, [totalBlocks, gridCols, cryptoBlocks]);

  // Auto-remove old crypto blocks
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = Date.now();
      const maxAge = 15000; // 15 seconds
      
      setCryptoBlocks(prev => {
        const newCryptoBlocks = new Map();
        let hasChanges = false;
        
        prev.forEach((block, index) => {
          const age = currentTime - block.timestamp;
          if (age < maxAge && !block.collected) {
            newCryptoBlocks.set(index, block);
          } else {
            hasChanges = true;
          }
        });
        
        return hasChanges ? newCryptoBlocks : prev;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Rotate through stats every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStat((prev) => (prev + 1) % liveStats.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [liveStats.length]);

  // Handle mouse movement and light up blocks with throttling
  const throttleRef = useRef<number>(0);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!sectionRef.current) return;
      
      // Throttle mouse events for better performance
      const now = Date.now();
      if (now - throttleRef.current < 16) return; // ~60fps throttling
      throttleRef.current = now;
      
      const rect = sectionRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setMousePosition({ x, y });
      
      // Calculate which block to light up based on exact cursor position
      const centerCol = Math.floor(x / 32);
      const centerRow = Math.floor(y / 32);
      const currentTime = Date.now();
      
      // Light up blocks and create snake trail
      if (centerRow >= 0 && centerRow < gridRows && centerCol >= 0 && centerCol < gridCols) {
        const blockIndex = centerRow * gridCols + centerCol;
        
        // Check if there's a crypto block at this position
        const cryptoBlock = cryptoBlocks.get(blockIndex);
        if (cryptoBlock && !cryptoBlock.collected) {
          // Collect the crypto block!
          setCryptoBlocks(prev => {
            const newMap = new Map(prev);
            newMap.set(blockIndex, { ...cryptoBlock, collected: true });
            return newMap;
          });
          
          // Add score based on crypto rarity (rarer = more points)
          const points = Math.round((1 / cryptoBlock.crypto.rarity) * 10);
          setScore(prevScore => prevScore + points);
          
          // Create particle effect at collection point
          setParticles(prev => [
            ...prev,
            {
              id: Date.now() + Math.random(),
              x: centerCol * 32 + 16, // Center of block
              y: centerRow * 32 + 16,
              color: cryptoBlock.crypto.color,
              timestamp: currentTime
            }
          ]);
          
          // Create collection effect
          setActiveBlocks(prev => {
            const newActiveBlocks = new Map(prev);
            newActiveBlocks.set(blockIndex, {
              color: cryptoBlock.crypto.color,
              intensity: 2, // Higher intensity for collection
              timestamp: currentTime
            });
            return newActiveBlocks;
          });
        } else {
          // Regular trail effect
          const randomColor = BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];
          
          setActiveBlocks(prev => {
            const newActiveBlocks = new Map(prev);
            newActiveBlocks.set(blockIndex, {
              color: randomColor,
              intensity: 1,
              timestamp: currentTime
            });
            return newActiveBlocks;
          });
        }
        
        // Update snake segments
        setSnakeSegments(prev => {
          const newSegments = [
            { row: centerRow, col: centerCol, timestamp: currentTime, isHead: true },
            ...prev.map(seg => ({ ...seg, isHead: false })).slice(0, 8) // Keep trail of 8 segments
          ];
          return newSegments;
        });
      }
    };

    const section = sectionRef.current;
    if (section) {
      section.addEventListener('mousemove', handleMouseMove, { passive: true });
      return () => section.removeEventListener('mousemove', handleMouseMove);
    }
  }, [gridCols, gridRows, cryptoBlocks]);

  // Fade out blocks over time and animate crypto blocks
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = Date.now();
      const fadeTime = 400;
      
      // Update regular blocks
      setActiveBlocks(prev => {
        const newActiveBlocks = new Map();
        let hasChanges = false;
        
        prev.forEach((block, index) => {
          const age = currentTime - block.timestamp;
          if (age < fadeTime) {
            const fadeIntensity = Math.max(0, 1 - (age / fadeTime));
            newActiveBlocks.set(index, {
              ...block,
              intensity: block.intensity * fadeIntensity
            });
          } else {
            hasChanges = true;
          }
        });
        
        return hasChanges || newActiveBlocks.size !== prev.size ? newActiveBlocks : prev;
      });
      
      // Animate crypto blocks
      setCryptoBlocks(prev => {
        const newCryptoBlocks = new Map();
        let hasChanges = false;
        
        prev.forEach((block, index) => {
          if (!block.collected) {
            // Pulsing animation for uncollected blocks
            const pulseIntensity = 0.5 + 0.5 * Math.sin(currentTime * 0.003 + index);
            newCryptoBlocks.set(index, {
              ...block,
              intensity: pulseIntensity
            });
          } else {
            // Remove collected blocks after a short delay
            const collectionAge = currentTime - block.timestamp;
            if (collectionAge < 500) { // Keep for 500ms after collection
              newCryptoBlocks.set(index, block);
            } else {
              hasChanges = true;
            }
          }
        });
        
        return hasChanges || newCryptoBlocks.size !== prev.size ? newCryptoBlocks : prev;
      });
      
      // Update snake segments
      setSnakeSegments(prev => {
        const maxAge = 800; // Snake trail lasts 800ms
        return prev.filter(segment => currentTime - segment.timestamp < maxAge);
      });

      // Clean up old particles
      setParticles(prev => {
        const maxParticleAge = 1000; // Particles last 1 second
        return prev.filter(particle => currentTime - particle.timestamp < maxParticleAge);
      });
      
    }, 16); // 60fps updates
    
    return () => clearInterval(interval);
  }, []);

  return (
    <section ref={sectionRef} className="relative pt-0 pb-32 overflow-hidden min-h-screen">
      {/* Crypto Collection Game Instructions */}
      {score === 0 && (
        <div className="absolute top-4 right-4 z-20">
          <div className="glass-panel p-4 max-w-sm">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="text-sm font-semibold text-yellow-400">Crypto Snake Game</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Move your cursor around to create a snake trail and collect crypto tokens that randomly appear! 
              Different cryptocurrencies have different point values.
            </p>
          </div>
        </div>
      )}

      {/* Enhanced animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/5 to-secondary/10" />
      
      {/* Interactive Block Grid - Extended coverage with crypto blocks */}
      <div className="absolute inset-0 opacity-80" style={{ height: 'calc(100vh + 400px)' }}>
        {[...Array(totalBlocks)].map((_, i) => {
          const row = Math.floor(i / gridCols);
          const col = i % gridCols;
          
          const blockData = activeBlocks.get(i);
          const cryptoBlock = cryptoBlocks.get(i);
          
          return (
            <InteractiveBlock
              key={i}
              index={i}
              row={row}
              col={col}
              isActive={!!blockData}
              color={blockData?.color || '#ffffff'}
              intensity={blockData?.intensity || 0}
              cryptoBlock={cryptoBlock}
            />
          );
        })}
        
        {/* Snake trail visualization */}
        {snakeSegments.map((segment, index) => (
          <div
            key={`snake-${segment.timestamp}-${index}`}
            className="absolute w-8 h-8 pointer-events-none"
            style={{
              left: `${segment.col * 32}px`,
              top: `${segment.row * 32}px`,
              backgroundColor: segment.isHead ? '#ff6b35aa' : `rgba(255, 107, 53, ${0.8 - index * 0.1})`,
              borderRadius: segment.isHead ? '50%' : '20%',
              transform: `scale(${segment.isHead ? 1.2 : 1 - index * 0.1})`,
              transition: 'all 0.1s ease-out',
              zIndex: 10 + (snakeSegments.length - index),
              boxShadow: segment.isHead ? '0 0 15px #ff6b35' : 'none'
            }}
          />
        ))}

        {/* Particle effects for crypto collection */}
        {particles.map((particle) => (
          <ParticleEffect
            key={particle.id}
            x={particle.x}
            y={particle.y}
            color={particle.color}
          />
        ))}
      </div>
      
      {/* Multiple floating orbs with different animations */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-accent/30 rounded-full blur-2xl animate-pulse-glow" />
      <div className="absolute top-32 right-1/3 w-20 h-20 bg-warning/20 rounded-full blur-2xl animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-32 left-1/3 w-28 h-28 bg-success/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '0.5s' }} />

      {/* Enhanced grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px', // Larger grid pattern
          maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 90%)', // Extended mask
          height: 'calc(100vh + 400px)'
        }}
      />

      {/* Matrix-style binary rain effect */}
      <div className="absolute inset-0 opacity-5">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute text-primary text-xs font-mono animate-matrix-rain"
            style={{
              left: `${(i * 5) % 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + (i % 3)}s`
            }}
          >
            {Math.random().toString(2).substr(2, 8)}
          </div>
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-6 text-center pt-0">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Live Status Badge with Crypto Score */}
          <ScrollAnimation direction="scale" delay={0.2}>
            <div className="flex justify-center mb-8 gap-4">
              <Badge variant="outline" className="px-4 py-2 bg-success/10 border-success/30 text-success">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse mr-2" />
                AI Protection System Online
              </Badge>
              {score > 0 && (
                <Badge variant="outline" className="px-4 py-2 bg-yellow-500/10 border-yellow-500/30 text-yellow-400">
                  <Coins className="w-4 h-4 mr-2" />
                  Crypto Score: {score}
                </Badge>
              )}
            </div>
          </ScrollAnimation>

          {/* Main headline with enhanced styling */}
          <ScrollAnimation direction="up" delay={0.3}>
            <div className="space-y-6">
              <h1 className="text-6xl md:text-8xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  Trade NFTs
                </span>
                <br />
                <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  with{' '}
                </span>
                <span 
                  className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent relative"
                  style={{ 
                    textShadow: '0 0 30px hsl(var(--primary) / 0.5)',
                    filter: 'drop-shadow(0 0 10px hsl(var(--primary) / 0.3))'
                  }}
                >
                  Confidence
                  <Sparkles className="absolute -top-4 -right-8 w-8 h-8 text-accent animate-pulse" />
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Advanced AI-powered fraud detection keeps you safe from plagiarism, scams, and suspicious 
                activity in the NFT marketplace. Trade with complete peace of mind.
              </p>
            </div>
          </ScrollAnimation>

          {/* Live Statistics Display */}
          <ScrollAnimation direction="scale" delay={0.4}>
            <div className="flex justify-center mb-8">
              <div className="glass-panel px-8 py-4 rounded-full border-primary/20">
                <div className="flex items-center gap-4 text-center">
                  <div className="text-2xl font-bold text-primary neon-text">
                    {liveStats[currentStat].value}
                  </div>
                  <div className="text-sm">
                    <div className="text-foreground font-medium">{liveStats[currentStat].label}</div>
                    <div className="text-muted-foreground">{liveStats[currentStat].suffix}</div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollAnimation>

          {/* Enhanced CTA Buttons */}
          <ScrollAnimation direction="up" delay={0.5}>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Button 
                variant="cyber" 
                size="lg" 
                className="gap-3 px-10 py-4 text-lg hover:scale-105 transition-all duration-300"
                onClick={() => navigate('/marketplace')}
              >
                <BarChart3 className="w-6 h-6" />
                Explore Marketplace
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-700" />
              </Button>
              <Button 
                variant="glow" 
                size="lg" 
                className="gap-3 px-10 py-4 text-lg hover:scale-105 transition-all duration-300"
                onClick={() => navigate('/create')}
              >
                <Zap className="w-6 h-6" />
                Create NFT
              </Button>
            </div>
          </ScrollAnimation>

          {/* Enhanced feature highlights */}
          <ScrollAnimation direction="up" delay={0.6}>
            <StaggeredAnimation 
              className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20"
              staggerDelay={0.2}
            >
              {[
                {
                  icon: Brain,
                  title: 'AI-Powered Protection',
                  description: '95%+ accuracy in fraud detection using advanced machine learning',
                  gradient: 'from-primary/20 to-primary/5'
                },
                {
                  icon: Zap,
                  title: 'Real-time Detection',
                  description: 'Instant analysis of all NFT activity with sub-second response times',
                  gradient: 'from-accent/20 to-accent/5'
                },
                {
                  icon: Lock,
                  title: 'Secure Trading',
                  description: 'Military-grade encryption and secure smart contract execution',
                  gradient: 'from-success/20 to-success/5'
                }
              ].map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div 
                    key={feature.title}
                    className="glass-panel p-8 hover-glow group relative overflow-hidden transition-all duration-500"
                  >
                    {/* Background gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    
                    <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                      <div className="relative">
                        <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl group-hover:shadow-cyber transition-all duration-300 group-hover:scale-110">
                          <Icon className="w-8 h-8 text-primary" />
                        </div>
                        {/* Floating particles around icon */}
                        <div className="absolute -inset-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {[...Array(4)].map((_, i) => (
                            <div
                              key={i}
                              className="absolute w-1 h-1 bg-primary rounded-full animate-ping"
                              style={{
                                top: `${25 + Math.sin(i * Math.PI * 0.5) * 40}%`,
                                left: `${25 + Math.cos(i * Math.PI * 0.5) * 40}%`,
                                animationDelay: `${i * 0.2}s`
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>

                    {/* Scan line effect on hover */}
                    <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent w-full h-1 animate-scan top-1/2" />
                    </div>
                  </div>
                );
              })}
            </StaggeredAnimation>
          </ScrollAnimation>
        </div>
      </div>

      {/* Enhanced 3D geometric shapes */}
      <div className="absolute top-1/4 right-10 w-20 h-20 border border-primary/30 rotate-45 animate-[spin_20s_linear_infinite]" />
      <div className="absolute bottom-1/4 left-10 w-16 h-16 border border-secondary/30 rounded-full animate-pulse-glow" />
      <div className="absolute top-1/3 left-20 w-12 h-12 border-2 border-accent/40 transform rotate-12 animate-[bounce_3s_ease-in-out_infinite]" />
      <div className="absolute bottom-1/3 right-20 w-14 h-14 border border-warning/30 transform -rotate-12 animate-[spin_15s_linear_infinite_reverse]" />
    </section>
  );
}