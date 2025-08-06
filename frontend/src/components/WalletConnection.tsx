import { useState, useEffect } from 'react';
import { useCurrentAccount, useConnectWallet, useWallets, ConnectButton } from '@mysten/dapp-kit';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import HackerScene from './HackerScene';
import SurveillanceCamera from './SurveillanceCamera';
import { LoginInterface } from './LoginInterface';

export function WalletConnection() {
  const account = useCurrentAccount();
  const wallets = useWallets();
  const { mutate: connect } = useConnectWallet();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSlushAuth, setShowSlushAuth] = useState(false);
  const [targetPosition, setTargetPosition] = useState({ x: 0, y: 0 });
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleHackerClick = () => {
    setIsLocked(true);
    setTargetPosition({ x: window.innerWidth * 0.25, y: window.innerHeight * 0.5 });
    
    setTimeout(() => {
      setShowLogin(true);
    }, 2000);
  };

  const handleLoginStart = (provider: 'google' | 'github' | 'facebook') => {
    setShowSlushAuth(true);
  };

  // Always show hacker animation first, then handle authentication
  useEffect(() => {
    console.log('WalletConnection Debug:', { account: !!account, isAuthenticated, isRedirecting, pathname: location.pathname });
    
    // If already authenticated, show Slush auth after a short delay
    if (account && isAuthenticated && !showSlushAuth && location.pathname === '/') {
      console.log('User already authenticated, showing Slush auth...');
      setTimeout(() => {
        setShowSlushAuth(true);
      }, 1000); // Show Slush auth after 1 second
    }
  }, [account, isAuthenticated, showSlushAuth, location.pathname]);

  // If already authenticated and not on home page, don't render anything
  if (account && isAuthenticated && location.pathname !== '/') {
    return null;
  }

  if (showSlushAuth) {
    return (
      <div className="fixed inset-0 w-full h-screen overflow-hidden z-50">
        <SurveillanceCamera alert={isLocked} targetPosition={targetPosition} />
        <HackerScene onHackerClick={handleHackerClick} isLocked={isLocked} />
        
        <motion.div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-md w-full mx-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">🔐 Slush Authentication</h2>
              <p className="text-gray-400">
                Complete authentication via Slush zkLogin to access secure systems.
              </p>
            </div>

            <div className="flex justify-center mb-6">
              <ConnectButton 
                connectText={
                  <div className="flex items-center gap-2 px-6 py-3">
                    <span className="text-lg">🔐 Authenticate with Slush</span>
                  </div>
                }
              />
            </div>
            
            {isRedirecting && (
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 text-green-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400"></div>
                  <span>Connecting to marketplace...</span>
                </div>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={() => setShowSlushAuth(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ← Back to login options
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                🔒 Secure zkLogin authentication via Slush
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-screen overflow-hidden z-50">
      <SurveillanceCamera alert={isLocked} targetPosition={targetPosition} />
      <HackerScene onHackerClick={handleHackerClick} isLocked={isLocked} />

      <AnimatePresence>
        {showLogin && (
          <LoginInterface onLoginStart={handleLoginStart} />
        )}
      </AnimatePresence>
    </div>
  );
}
