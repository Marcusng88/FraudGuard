'use client';

import React from 'react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';

interface FraudIndicatorProps {
  score: number; // 0-100, where 0 is safest
  className?: string;
  showText?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function FraudIndicator({ 
  score, 
  className, 
  showText = true, 
  size = 'medium' 
}: FraudIndicatorProps) {
  const getFraudLevel = (score: number) => {
    if (score <= 20) return { level: 'safe', color: 'success', icon: '🔒', text: 'Safe' };
    if (score <= 50) return { level: 'low', color: 'info', icon: '🛡️', text: 'Low Risk' };
    if (score <= 75) return { level: 'medium', color: 'warning', icon: '⚠️', text: 'Medium Risk' };
    return { level: 'high', color: 'danger', icon: '🚨', text: 'High Risk' };
  };

  const fraudData = getFraudLevel(score);
  
  const sizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className={sizeClasses[size]}>{fraudData.icon}</span>
      {showText && (
        <Badge variant={fraudData.color as any} className={sizeClasses[size]}>
          {fraudData.text}
        </Badge>
      )}
    </div>
  );
}

interface FraudScoreProps {
  score: number;
  details?: {
    plagiarismRisk: number;
    priceManipulation: number;
    accountSuspicion: number;
  };
  className?: string;
}

export function FraudScore({ score, details, className }: FraudScoreProps) {
  const fraudData = score <= 20 ? 'safe' : score <= 50 ? 'low' : score <= 75 ? 'medium' : 'high';
  
  const getBarColor = (level: string) => {
    switch (level) {
      case 'safe': return 'bg-green-500';
      case 'low': return 'bg-blue-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={cn('p-4 rounded-lg glass', className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          Fraud Risk Assessment
        </h3>
        <FraudIndicator score={score} size="small" />
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--text-secondary)]">Overall Risk</span>
          <span className="text-[var(--text-primary)] font-medium">{score}%</span>
        </div>
        
        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className={cn('h-2 rounded-full transition-all', getBarColor(fraudData))}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {details && (
        <div className="mt-4 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Plagiarism Risk</span>
            <span>{details.plagiarismRisk}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Price Manipulation</span>
            <span>{details.priceManipulation}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Account Suspicion</span>
            <span>{details.accountSuspicion}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
