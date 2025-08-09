import { useState, useEffect } from 'react';
import { useSecurity } from '@/contexts/SecurityContext';
import { useAuth } from '@/contexts/AuthContext';

interface UseSecurityCheckReturn {
  isVerified: boolean;
  showVerificationDialog: boolean;
  setShowVerificationDialog: (show: boolean) => void;
  handleVerificationSuccess: () => void;
  handleVerificationClose: () => void;
  checkRequirement: (requirement: 'requireMasterPasswordForSecurity' | 'requireMasterPasswordForProfile' | 'requireMasterPasswordForPurchase') => boolean;
}

export function useSecurityCheck(
  requirement: 'requireMasterPasswordForSecurity' | 'requireMasterPasswordForProfile' | 'requireMasterPasswordForPurchase',
  redirectPath?: string
): UseSecurityCheckReturn {
  const { isAuthenticated } = useAuth();
  const { checkSecurityRequirement } = useSecurity();
  const [isVerified, setIsVerified] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);

  // Check if verification is needed when component mounts
  useEffect(() => {
    if (isAuthenticated && !isVerified && checkSecurityRequirement(requirement)) {
      setShowVerificationDialog(true);
    }
  }, [isAuthenticated, isVerified, requirement, checkSecurityRequirement]);

  const handleVerificationSuccess = () => {
    setIsVerified(true);
    setShowVerificationDialog(false);
  };

  const handleVerificationClose = () => {
    setShowVerificationDialog(false);
    // If redirect path is provided, redirect user
    if (redirectPath && typeof window !== 'undefined') {
      window.location.href = redirectPath;
    }
  };

  const checkRequirement = (req: 'requireMasterPasswordForSecurity' | 'requireMasterPasswordForProfile' | 'requireMasterPasswordForPurchase'): boolean => {
    return checkSecurityRequirement(req);
  };

  return {
    isVerified,
    showVerificationDialog,
    setShowVerificationDialog,
    handleVerificationSuccess,
    handleVerificationClose,
    checkRequirement,
  };
}
