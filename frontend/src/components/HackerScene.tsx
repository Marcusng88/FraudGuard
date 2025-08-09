import { motion } from 'framer-motion'
import hackerImage from '../assests/Hacker.png'
import fraudGuard from '../../public/FraudGuard_Logo.png'

interface HackerSceneProps {
  onHackerClick: () => void
  isLocked: boolean
}

const HackerScene: React.FC<HackerSceneProps> = ({ onHackerClick, isLocked }) => {
  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-black overflow-hidden">
      {/* Website Header - FraudGuard */}
      <div className="absolute top-6 left-6 flex items-center space-x-3 z-30">
        {/* FraudGuard Logo */}
        <motion.div
          animate={{ 
            y: [-4, 4, -4],
            filter: ["drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))", "drop-shadow(0 0 12px rgba(59, 130, 246, 0.7))", "drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))"]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <img
            src={fraudGuard}
            alt="FraudGuard Logo"
            className="w-10 h-10 rounded-lg shadow-lg"
          />
        </motion.div>
        {/* Website Name */}
        <h1 className="text-2xl font-bold text-white tracking-wide">
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            FraudGuard
          </span>
        </h1>
      </div>

      {/* Matrix-style background effect */}
      <div className="absolute inset-0 opacity-10">
        <div className="grid grid-cols-20 grid-rows-20 h-full">
          {Array.from({ length: 400 }).map((_, i) => (
            <div
              key={i}
              className="border border-green-500/20"
              style={{
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Realistic Hacker with Real Image */}
      <div className="absolute left-1/4 top-1/2" style={{ transform: 'translate(-50%, -50%)' }}>
        <motion.div
          className="cursor-pointer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onHackerClick}
        >
        <div className="relative">
          {/* Hacker Image with Lighting Effects */}
          <motion.div
            className="relative"
            animate={{ 
              filter: isLocked ? "drop-shadow(0 0 30px #ef4444) drop-shadow(0 0 60px #ef4444)" : "drop-shadow(0 0 20px #10b981) drop-shadow(0 0 40px #10b981)"
            }}
          >
            {/* Main Hacker Image */}
            <img 
              src={hackerImage} 
              alt="Hacker" 
              className="w-128 h-192 object-contain"
              style={{ filter: 'brightness(1.2) contrast(1.1)' }}
            />
          </motion.div>
          
          {/* Binary Code Stream from Laptop Screen */}
          {!isLocked && (
            <>
              {/* Main binary stream from laptop screen */}
              <div className="absolute bottom-40 left-48 w-64 h-64">
                {Array.from({ length: 25 }).map((_, i) => (
                  <motion.div
                    key={`main-${i}`}
                    className="absolute text-green-400 font-mono text-sm font-bold"
                    style={{
                      left: `${Math.random() * 80}%`,
                      bottom: '0%',
                    }}
                    animate={{
                      y: [0, -100, -200, -300, -400, -500],
                      opacity: [0, 1, 1, 0.8, 0.4, 0],
                      color: ['#22c55e', '#22c55e', '#10b981', '#86efac', '#bbf7d0', 'rgba(187, 247, 208, 0)'],
                      scale: [0.8, 1, 1, 0.9, 0.7, 0.5],
                    }}
                    transition={{
                      duration: 5 + Math.random() * 3,
                      repeat: Infinity,
                      delay: i * 0.1,
                      ease: "linear"
                    }}
                  >
                    {Array.from({ length: 8 + Math.floor(Math.random() * 4) }).map(() => Math.round(Math.random())).join('')}
                  </motion.div>
                ))}
              </div>

              {/* Secondary binary streams from laptop edges */}
              <div className="absolute bottom-36 left-40 w-32 h-48">
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.div
                    key={`left-${i}`}
                    className="absolute text-green-300 font-mono text-xs font-bold"
                    style={{
                      left: `${Math.random() * 60}%`,
                      bottom: '0%',
                    }}
                    animate={{
                      y: [0, -80, -160, -240, -320],
                      opacity: [0, 0.8, 0.6, 0.3, 0],
                      color: ['#86efac', '#86efac', '#4ade80', '#22c55e', 'rgba(134, 239, 172, 0)'],
                    }}
                    transition={{
                      duration: 4 + Math.random() * 2,
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: "linear"
                    }}
                  >
                    {Array.from({ length: 6 + Math.floor(Math.random() * 3) }).map(() => Math.round(Math.random())).join('')}
                  </motion.div>
                ))}
              </div>

              <div className="absolute bottom-36 right-40 w-32 h-48">
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.div
                    key={`right-${i}`}
                    className="absolute text-green-300 font-mono text-xs font-bold"
                    style={{
                      left: `${Math.random() * 60}%`,
                      bottom: '0%',
                    }}
                    animate={{
                      y: [0, -80, -160, -240, -320],
                      opacity: [0, 0.8, 0.6, 0.3, 0],
                      color: ['#86efac', '#86efac', '#4ade80', '#22c55e', 'rgba(134, 239, 172, 0)'],
                    }}
                    transition={{
                      duration: 4 + Math.random() * 2,
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: "linear"
                    }}
                  >
                    {Array.from({ length: 6 + Math.floor(Math.random() * 3) }).map(() => Math.round(Math.random())).join('')}
                  </motion.div>
                ))}
              </div>
            </>
          )}
          
          {/* Floating Particles Around Hacker */}
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-green-400 rounded-full"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${10 + Math.random() * 80}%`,
              }}
              animate={{
                y: [0, -10, 0],
                opacity: [0.3, 1, 0.3],
                scale: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}
          
          {/* Attack Packets - Only when NOT locked (before triggering surveillance) */}
          {!isLocked && Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={`packet-${i}`}
              className="absolute w-12 h-20 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-sm border border-yellow-400/60 flex items-center justify-center shadow-lg overflow-hidden"
              style={{
                left: `${160 + Math.random() * 20}px`,
                top: `${40 + Math.random() * 40}%`,
                zIndex: 10,
              }}
              initial={{ x: 0, opacity: 0 }}
              animate={{
                x: [0, window.innerWidth * 0.35],
                opacity: [0, 1, 0.7, 0.3, 0],
                rotate: [0, 360],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: i * 0.8,
                ease: "linear"
              }}
            >
              {/* Envelope background */}
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/30 to-orange-600/30 rounded-sm"></div>
              
              {/* V-shape envelope flap */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-yellow-300/80"></div>
              </div>
              
              {/* Envelope seal line */}
              <div className="absolute top-1 left-2 right-2 h-px bg-yellow-200/60"></div>
              
              {/* Data indicator dots */}
              <div className="absolute bottom-2 left-2 w-1 h-1 bg-yellow-200/70 rounded-full"></div>
              <div className="absolute bottom-2 left-4 w-1 h-1 bg-orange-200/60 rounded-full"></div>
              <div className="absolute bottom-2 right-2 w-1 h-1 bg-yellow-200/50 rounded-full"></div>
            </motion.div>
          ))}
        </div>
        </motion.div>
      </div>

      {/* Enterprise Blockchain Visualization - RIGHT Half Only */}
      <div className="absolute right-0 top-0 w-1/2 h-full overflow-hidden">
        {/* Dimly lit digital grid background - RIGHT half only */}
        <div className="absolute inset-0 opacity-8">
          <div className="grid grid-cols-6 grid-rows-10 h-full w-full">
            {Array.from({ length: 60 }).map((_, i) => (
              <div
                key={i}
                className="border border-slate-600/15"
                style={{
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>
        </div>

        {/* Professional Blockchain Network */}
        <motion.div
          className="absolute inset-0"
          animate={{
            y: [0, -30, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          {/* Vertical Chain of Alternating Blocks */}
          {Array.from({ length: 10 }).map((_, i) => {
            const isDark = i % 2 === 0;
            const yPosition = 5 + (i * 9);
            const xPosition = 25 + ((i + 1) % 2) * 30;
            
            return (
              <motion.div
                key={i}
                className="absolute"
                style={{ 
                  left: `${xPosition}%`, 
                  top: `${yPosition}%` 
                }}
                animate={{
                  y: [0, -8, 0],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeInOut"
                }}
              >
                {/* Enterprise-grade block */}
                <div className={`
                  w-32 h-32 backdrop-blur-sm border-2 rounded-lg shadow-xl relative
                  ${isDark 
                    ? (isLocked ? 'bg-red-900/30 border-red-600/40' : 'bg-slate-800/60 border-slate-600/50') 
                    : (isLocked ? 'bg-red-700/25 border-red-500/35' : 'bg-slate-600/40 border-slate-400/45')
                  }
                `}>
                  {/* Professional gradient overlay */}
                  <div className={`absolute inset-0 rounded-lg ${
                    isDark 
                      ? (isLocked ? 'bg-gradient-to-br from-red-800/20 to-red-900/40' : 'bg-gradient-to-br from-slate-700/30 to-slate-900/50')
                      : (isLocked ? 'bg-gradient-to-br from-red-600/15 to-red-800/30' : 'bg-gradient-to-br from-slate-500/25 to-slate-700/40')
                  }`}></div>
                  
                  {/* Subtle enterprise glow */}
                  <div className={`absolute inset-0 rounded-lg ${
                    isLocked ? 'shadow-red-500/10' : 'shadow-slate-400/10'
                  } shadow-lg`}></div>
                </div>

                {/* Connection node at cube corner - ONLY at intersection points */}
                {i < 9 && (
                  <div 
                    className={`absolute w-2 h-2 rounded-full border ${
                      isLocked ? 'bg-red-400/60 border-red-300/40' : 'bg-slate-400/60 border-slate-300/40'
                    }`}
                    style={{
                      bottom: '-6px',
                      right: '-6px',
                    }}
                  />
                )}
              </motion.div>
            );
          })}

          {/* Professional connecting lines - cube to cube endpoints */}
          {Array.from({ length: 9 }).map((_, i) => {
            const startX = 25 + ((i + 1) % 2) * 30;
            const startY = 5 + (i * 9) + 8;
            const endX = 25 + (((i + 1) + 1) % 2) * 30;
            const endY = 5 + ((i + 1) * 9) + 8;
            
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
            
            return (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: `${startX + 8}%`,
                  top: `${startY}%`,
                  width: `${length}%`,
                  height: '2px',
                  transform: `rotate(${angle}deg)`,
                  transformOrigin: 'left center'
                }}
                animate={{
                  opacity: [0.3, 0.7, 0.3],
                  scaleX: [0.9, 1, 0.9],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  delay: i * 0.5,
                  ease: "easeInOut"
                }}
              >
                <div className={`w-full h-full ${
                  isLocked 
                    ? 'bg-gradient-to-r from-red-500/50 via-red-400/70 to-red-500/50' 
                    : 'bg-gradient-to-r from-slate-400/50 via-slate-300/70 to-slate-400/50'
                } shadow-sm rounded-full`}></div>
              </motion.div>
            );
          })}

          {/* Secondary network connections - horizontal stabilizers */}
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={`horizontal-${i}`}
              className="absolute"
              style={{
                left: '15%',
                top: `${25 + i * 25}%`,
                width: '70%',
                height: '1px'
              }}
              animate={{
                opacity: [0.2, 0.5, 0.2],
                scaleX: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                delay: i * 2.5,
                ease: "easeInOut"
              }}
            >
              <div className={`w-full h-full ${
                isLocked 
                  ? 'bg-gradient-to-r from-transparent via-red-400/40 to-transparent' 
                  : 'bg-gradient-to-r from-transparent via-slate-400/40 to-transparent'
              }`}></div>
            </motion.div>
          ))}

          {/* Enterprise data flow indicators */}
          {Array.from({ length: 4 }).map((_, i) => (
            <motion.div
              key={`dataflow-${i}`}
              className={`absolute w-1 h-1 rounded-full ${
                isLocked ? 'bg-red-400/60' : 'bg-slate-300/60'
              }`}
              style={{
                left: `${30 + Math.random() * 40}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -150],
                opacity: [0, 0.8, 0],
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                delay: i * 3,
                ease: "linear"
              }}
            />
          ))}
        </motion.div>

        {/* Sharp boundary - no bleed into left side */}
        <div className="absolute left-0 top-0 w-px h-full bg-slate-700/30"></div>
      </div>

      {/* Instructions */}
      {!isLocked && (
        <motion.div
          className="absolute bottom-32 text-center"
          style={{ left: '11%', transform: 'translateX(-50%)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <p className="text-2xl text-gray-300 mb-2 font-bold">
            INITIATE THREAT DETECTION PROTOCOLS
          </p>
          <p className="text-lg text-gray-400">
            Click the intruder to activate security monitoring
          </p>
        </motion.div>
      )}
    </div>
  )
}

export default HackerScene 