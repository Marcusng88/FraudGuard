import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-card)]">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 rounded bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-purple)] flex items-center justify-center">
                <span className="text-white font-bold text-xs">FG</span>
              </div>
              <span className="font-bold text-gradient">FraudGuard</span>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Trade NFTs with confidence using AI-powered fraud detection.
            </p>
          </div>

          {/* Marketplace */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Marketplace</h3>
            <div className="space-y-2">
              <Link href="/marketplace" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                Browse NFTs
              </Link>
              <Link href="/profile/create" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                Create NFT
              </Link>
            </div>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Resources</h3>
            <div className="space-y-2">
              <a href="#" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                Documentation
              </a>
              <a href="#" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                FAQ
              </a>
              <a href="#" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                Support
              </a>
            </div>
          </div>

          {/* Community */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Community</h3>
            <div className="space-y-2">
              <a href="#" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                Discord
              </a>
              <a href="#" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                Twitter
              </a>
              <a href="#" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                GitHub
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-[var(--border)] flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-[var(--text-secondary)]">
            © 2025 FraudGuard. All rights reserved.
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <a href="#" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              Privacy Policy
            </a>
            <a href="#" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
