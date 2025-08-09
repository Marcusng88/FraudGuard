import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SecuritySettings {
  requireMasterPasswordForSecurity: boolean;
  requireMasterPasswordForProfile: boolean;
  requireMasterPasswordForPurchase: boolean;
}

interface SecurityContextType {
  securitySettings: SecuritySettings;
  updateSecuritySetting: (key: keyof SecuritySettings, value: boolean) => void;
  checkSecurityRequirement: (requirement: keyof SecuritySettings) => boolean;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: ReactNode }) {
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    requireMasterPasswordForSecurity: true,
    requireMasterPasswordForProfile: false,
    requireMasterPasswordForPurchase: false,
  });

  // Load security settings from localStorage on mount
  useEffect(() => {
    const loadSecuritySettings = () => {
      const securityRequirement = localStorage.getItem('fraudguard-require-master-password');
      const profileRequirement = localStorage.getItem('fraudguard-require-master-password-profile');
      const purchaseRequirement = localStorage.getItem('fraudguard-require-master-password-purchase');

      setSecuritySettings({
        requireMasterPasswordForSecurity: securityRequirement !== null ? JSON.parse(securityRequirement) : true,
        requireMasterPasswordForProfile: profileRequirement !== null ? JSON.parse(profileRequirement) : false,
        requireMasterPasswordForPurchase: purchaseRequirement !== null ? JSON.parse(purchaseRequirement) : false,
      });
    };

    loadSecuritySettings();

    // Listen for storage changes to sync across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('fraudguard-require-master-password')) {
        loadSecuritySettings();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updateSecuritySetting = (key: keyof SecuritySettings, value: boolean) => {
    setSecuritySettings(prev => ({ ...prev, [key]: value }));
    
    // Save to localStorage
    const localStorageKey = key === 'requireMasterPasswordForSecurity' 
      ? 'fraudguard-require-master-password'
      : key === 'requireMasterPasswordForProfile'
      ? 'fraudguard-require-master-password-profile'
      : 'fraudguard-require-master-password-purchase';
    
    localStorage.setItem(localStorageKey, JSON.stringify(value));
  };

  const checkSecurityRequirement = (requirement: keyof SecuritySettings): boolean => {
    return securitySettings[requirement];
  };

  return (
    <SecurityContext.Provider value={{
      securitySettings,
      updateSecuritySetting,
      checkSecurityRequirement,
    }}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}
