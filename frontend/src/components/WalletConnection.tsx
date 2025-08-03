import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut } from 'lucide-react';

export function WalletConnection() {
  const account = useCurrentAccount();

  if (account) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-sm">
          <p className="text-foreground font-medium">Connected</p>
          <p className="text-muted-foreground">
            {account.address.slice(0, 6)}...{account.address.slice(-4)}
          </p>
        </div>
        <ConnectButton />
      </div>
    );
  }

  return (
    <ConnectButton 
      connectText={
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          Connect Wallet
        </div>
      }
    />
  );
}
