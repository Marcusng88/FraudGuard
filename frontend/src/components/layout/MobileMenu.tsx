'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { WalletButton } from '../web3/WalletButton';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  if (!isOpen) return null;

  const menuItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/marketplace', label: 'Marketplace', icon: '🛒' },
    { href: '/profile', label: 'Profile', icon: '👤' },
    { href: '/profile/create', label: 'Create NFT', icon: '🎨' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
        onClick={onClose}
      />
      
      {/* Menu Panel */}
      <div className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-[var(--bg-card)] border-l border-[var(--border)] z-50 md:hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-purple)] flex items-center justify-center">
                <span className="text-white font-bold text-sm">FG</span>
              </div>
              <span className="text-xl font-bold text-gradient">FraudGuard</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              ✕
            </Button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-6">
            <div className="space-y-2">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center space-x-3 p-4 rounded-lg hover:bg-white/5 transition-colors touch-target"
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium text-[var(--text-primary)]">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-[var(--border)] my-6" />

            {/* Additional Links */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  window.open('https://docs.fraudguard.com', '_blank');
                  onClose();
                }}
                className="flex items-center space-x-3 p-4 rounded-lg hover:bg-white/5 transition-colors w-full text-left touch-target"
              >
                <span className="text-xl">📚</span>
                <span className="font-medium text-[var(--text-secondary)]">Documentation</span>
              </button>
              
              <button
                onClick={() => {
                  window.open('https://github.com/fraudguard/fraudguard', '_blank');
                  onClose();
                }}
                className="flex items-center space-x-3 p-4 rounded-lg hover:bg-white/5 transition-colors w-full text-left touch-target"
              >
                <span className="text-xl">💻</span>
                <span className="font-medium text-[var(--text-secondary)]">GitHub</span>
              </button>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-[var(--border)]">
            <div className="space-y-4">
              {/* Wallet Connection */}
              <WalletButton className="w-full" />
              
              {/* App Info */}
              <div className="text-center text-xs text-[var(--text-secondary)]">
                <p>FraudGuard v1.0.0</p>
                <p>AI-powered NFT fraud detection</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Mobile Menu Toggle Button
export function MobileMenuButton({ 
  onClick, 
  className 
}: { 
  onClick: () => void; 
  className?: string; 
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`md:hidden touch-target ${className}`}
      aria-label="Open menu"
    >
      <div className="flex flex-col space-y-1">
        <div className="w-5 h-0.5 bg-current" />
        <div className="w-5 h-0.5 bg-current" />
        <div className="w-5 h-0.5 bg-current" />
      </div>
    </Button>
  );
}
