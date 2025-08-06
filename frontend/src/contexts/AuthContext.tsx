// This is a simplified context that works with FraudGuard's system
import React, { createContext, useContext } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';

interface AuthContextType {
  user: any;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const account = useCurrentAccount();
  
  return (
    <AuthContext.Provider value={{
      user: account,
      isAuthenticated: !!account
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 