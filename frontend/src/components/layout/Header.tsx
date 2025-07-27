'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { WalletButton } from '../web3/WalletButton';
import { MobileMenu, MobileMenuButton } from './MobileMenu';

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] glass backdrop-blur-md">
      <div className="container mx-auto">
        <div className="flex h-16 items-center justify-between px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 flex-shrink-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-purple)] flex items-center justify-center">
              <span className="text-white font-bold text-sm">FG</span>
            </div>
            <span className="text-xl font-bold text-gradient">FraudGuard</span>
          </Link>

          {/* Navigation - Centered */}
          <nav className="hidden md:flex items-center space-x-8 absolute left-1/2 transform -translate-x-1/2">
            <Link
              href="/marketplace"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-200 py-2 px-4 rounded-lg hover:bg-white/5 font-medium whitespace-nowrap"
            >
              Marketplace
            </Link>
            <Link
              href="/profile"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-200 py-2 px-4 rounded-lg hover:bg-white/5 font-medium whitespace-nowrap"
            >
              Profile
            </Link>
            <Link
              href="/profile/create"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-200 py-2 px-4 rounded-lg hover:bg-white/5 font-medium whitespace-nowrap"
            >
              Create
            </Link>
          </nav>

          {/* Wallet Connection & Mobile Menu */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            <div className="hidden md:block">
              <WalletButton />
            </div>
            <MobileMenuButton
              onClick={() => setIsMobileMenuOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </header>
  );
}
