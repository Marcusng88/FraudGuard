'use client';

import React from 'react';
import { cn } from '../../lib/utils';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'small' | 'medium' | 'large';
}

const sizeClasses = {
  small: 'h-4 w-4',
  medium: 'h-6 w-6',
  large: 'h-8 w-8',
};

export function Spinner({ size = 'medium', className, ...props }: SpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-transparent border-t-current',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}

interface LoadingSpinnerProps {
  text?: string;
  size?: 'small' | 'medium' | 'large';
}

export function LoadingSpinner({ text = 'Loading...', size = 'medium' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <Spinner size={size} className="text-[var(--primary-blue)] mb-2" />
      <p className="text-sm text-[var(--text-secondary)]">{text}</p>
    </div>
  );
}
