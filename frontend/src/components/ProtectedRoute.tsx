import { useAuth } from '@/contexts/AuthContext';
import { WalletConnection } from '@/components/WalletConnection';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  
  console.log('ProtectedRoute Debug:', { isAuthenticated });
  
  if (!isAuthenticated) {
    return <WalletConnection />;
  }
  
  return <>{children}</>;
}
