'use client';

import React from 'react';
import { useCurrentAccount, useDisconnectWallet, ConnectButton } from '@mysten/dapp-kit';
import { Button } from '../ui/button';
import { truncateAddress } from '../../lib/utils';

export function WalletButton() {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();

  if (!currentAccount) {
    return (
      <ConnectButton
        connectText="Connect Wallet"
        className="btn-primary"
      />
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="glass-card py-2 px-3">
        <span className="text-sm font-mono text-[var(--text-primary)]">
          {truncateAddress(currentAccount.address)}
        </span>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => disconnect()}
      >
        Disconnect
      </Button>
    </div>
  );
}
