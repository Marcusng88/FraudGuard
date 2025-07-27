'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../../lib/utils';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/profile', label: 'Profile' },
  { href: '/profile/create', label: 'Create' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center space-x-6">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-[var(--text-primary)]",
            pathname === item.href
              ? "text-[var(--text-primary)]"
              : "text-[var(--text-secondary)]"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
