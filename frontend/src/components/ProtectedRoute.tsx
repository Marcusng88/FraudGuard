import { useAuth } from '@/contexts/AuthContext';
import { WalletConnection } from '@/components/WalletConnection';
import { useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  console.log('ProtectedRoute Debug:', { isAuthenticated, pathname: location.pathname });
  
  if (!isAuthenticated) {
    return <WalletConnection />;
  }
  
  return <>{children}</>;
}
