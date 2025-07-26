import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'safe' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', pulse = false, children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center rounded-full font-medium transition-all duration-200";
    
    const variants = {
      default: "bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)]",
      safe: "fraud-indicator-safe",
      warning: "fraud-indicator-warning", 
      danger: "fraud-indicator-danger",
      info: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    };

    const sizes = {
      sm: "px-2 py-1 text-xs",
      md: "px-3 py-1 text-sm",
      lg: "px-4 py-2 text-base",
    };

    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          pulse && "animate-pulse",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
