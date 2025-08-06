/**
 * Kiosk Manager Component
 * Phase 1.1: Handles automatic kiosk creation and management
 * This component is designed to be used transparently in listing flows
 */
import React from 'react';
import { useEnsureKiosk } from '@/hooks/useKiosk';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Store, CheckCircle, AlertCircle } from 'lucide-react';

interface KioskManagerProps {
  walletAddress?: string;
  onKioskReady?: (kioskId: string) => void;
  onError?: (error: Error) => void;
  showDetails?: boolean;
  className?: string;
}

export const KioskManager: React.FC<KioskManagerProps> = ({
  walletAddress,
  onKioskReady,
  onError,
  showDetails = false,
  className = '',
}) => {
  const { kiosk, isLoading, error, ensureKiosk, isCreating } = useEnsureKiosk(walletAddress);

  // Handle kiosk ready callback
  React.useEffect(() => {
    if (kiosk && onKioskReady) {
      onKioskReady(kiosk.kiosk_id);
    }
  }, [kiosk, onKioskReady]);

  // Handle error callback
  React.useEffect(() => {
    if (error && onError) {
      onError(error as Error);
    }
  }, [error, onError]);

  // Auto-ensure kiosk when wallet address is available
  React.useEffect(() => {
    if (walletAddress && !kiosk && !isLoading && !error) {
      ensureKiosk().catch((err) => {
        console.error('Failed to ensure kiosk:', err);
        if (onError) onError(err);
      });
    }
  }, [walletAddress, kiosk, isLoading, error, ensureKiosk, onError]);

  if (!walletAddress) {
    return null;
  }

  if (isLoading || isCreating) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          <div>
            <p className="text-sm font-medium">Setting up your marketplace...</p>
            <p className="text-xs text-muted-foreground">
              {isCreating ? 'Creating kiosk...' : 'Checking kiosk status...'}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-4 border-red-200 bg-red-50 ${className}`}>
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-700">Kiosk Error</p>
            <p className="text-xs text-red-600">
              {error.message || 'Failed to manage kiosk'}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => ensureKiosk()}
            >
              Retry
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!showDetails) {
    // Hidden mode - just ensure kiosk exists
    return null;
  }

  // Show kiosk details
  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center space-x-3">
        <CheckCircle className="h-5 w-5 text-green-500" />
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <Store className="h-4 w-4 text-blue-500" />
            <p className="text-sm font-medium">Marketplace Ready</p>
            <Badge variant="secondary" className="text-xs">
              {kiosk?.sync_status || 'synced'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Kiosk ID: {kiosk?.kiosk_id?.slice(0, 8)}...
          </p>
        </div>
      </div>
    </Card>
  );
};

// Hook for easy kiosk integration in other components
export const useKioskForListing = (walletAddress?: string) => {
  const { kiosk, isLoading, error, ensureKiosk } = useEnsureKiosk(walletAddress);
  
  const prepareForListing = async () => {
    if (!walletAddress) {
      throw new Error('Wallet address is required');
    }
    
    try {
      const kioskData = await ensureKiosk();
      return kioskData.kiosk_id;
    } catch (err) {
      console.error('Failed to prepare kiosk for listing:', err);
      throw err;
    }
  };
  
  return {
    kioskId: kiosk?.kiosk_id,
    isLoading,
    error,
    prepareForListing,
    isReady: !!kiosk?.kiosk_id,
  };
}; 