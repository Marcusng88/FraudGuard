import { motion } from 'framer-motion'

interface SurveillanceCameraProps {
  alert: boolean
  targetPosition: { x: number; y: number }
}

const SurveillanceCamera: React.FC<SurveillanceCameraProps> = ({ alert, targetPosition }) => {
  return (
    <div className="fixed top-16 z-50" style={{ left: 'calc(50% - 16rem)' }}>
      {/* Main Camera */}
      <motion.div
        className="relative"
        animate={{
          rotate: alert ? Math.atan2(targetPosition.y - 100, targetPosition.x - window.innerWidth * 0.75) * (180 / Math.PI) : 20
        }}
        transition={{ duration: 0.8 }}
      >
        {/* Camera Body - Smaller */}
        <div className={`
          w-48 h-32 bg-gray-800 rounded-xl border-3 
          ${alert ? 'border-red-500 shadow-2xl shadow-red-500/50' : 'border-yellow-500 shadow-2xl shadow-yellow-500/50'}
          flex items-center justify-center relative
        `}>
          {/* Camera Lens - Smaller */}
          <div className={`
            w-20 h-20 rounded-full 
            ${alert ? 'bg-red-500 animate-pulse-red' : 'bg-yellow-500 animate-pulse'}
            flex items-center justify-center relative
          `}>
            <div className="w-10 h-10 rounded-full bg-black"></div>
            {/* Inner lens ring */}
            <div className="absolute inset-3 rounded-full border-2 border-gray-400"></div>
          </div>
          
          {/* Camera Details */}
          <div className={`absolute top-3 right-3 w-3 h-3 rounded-full animate-pulse ${alert ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
          <div className="absolute bottom-3 left-3 w-8 h-2 bg-gray-600 rounded"></div>
        </div>
        
        {/* Camera Mount - Smaller */}
        <div className="w-8 h-20 bg-gray-700 mx-auto mt-3 rounded-b-lg"></div>
        
        {/* Alert Status */}
        {alert && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -top-4 -right-4 w-8 h-8 bg-red-500 rounded-full animate-pulse-red flex items-center justify-center"
          >
            <div className="w-3 h-3 bg-white rounded-full"></div>
          </motion.div>
        )}

        {/* Detection Sector - Coming from RIGHT side of camera with gradient */}
        <motion.div
          className="absolute origin-left"
          style={{
            right: '-200px',
            top: '8px',
            width: '200px',
            height: '120px',
            clipPath: 'polygon(0% 50%, 100% 0%, 100% 100%)',
            background: alert 
              ? 'linear-gradient(to right, rgba(239, 68, 68, 0.8) 0%, rgba(239, 68, 68, 0.4) 50%, rgba(239, 68, 68, 0.1) 100%)'
              : 'linear-gradient(to right, rgba(234, 179, 8, 0.8) 0%, rgba(234, 179, 8, 0.4) 50%, rgba(234, 179, 8, 0.1) 100%)'
          }}
          animate={{
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.div>
    </div>
  )
}

export default SurveillanceCamera 