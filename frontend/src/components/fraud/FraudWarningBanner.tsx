'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { getFraudRiskLevel, getFraudRiskIcon } from '../../lib/utils';

interface FraudWarningBannerProps {
  fraudScore: number;
  detectionTypes: string[];
  aiExplanation: string;
  onDismiss?: () => void;
  onLearnMore?: () => void;
  className?: string;
}

export function FraudWarningBanner({
  fraudScore,
  detectionTypes,
  aiExplanation,
  onDismiss,
  onLearnMore,
  className
}: FraudWarningBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || fraudScore < 30) return null;

  const riskLevel = getFraudRiskLevel(fraudScore);
  const riskIcon = getFraudRiskIcon(fraudScore);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const getBannerStyle = () => {
    if (fraudScore >= 70) {
      return 'border-[var(--danger-red)] bg-gradient-to-r from-red-500/10 to-red-600/10';
    } else if (fraudScore >= 40) {
      return 'border-[var(--warning-orange)] bg-gradient-to-r from-orange-500/10 to-orange-600/10';
    }
    return 'border-[var(--info-blue)] bg-gradient-to-r from-blue-500/10 to-blue-600/10';
  };

  const getTextColor = () => {
    if (fraudScore >= 70) return 'text-[var(--danger-red)]';
    if (fraudScore >= 40) return 'text-[var(--warning-orange)]';
    return 'text-[var(--info-blue)]';
  };

  return (
    <Card className={`border-2 ${getBannerStyle()} ${className}`} variant="glass">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="text-3xl flex-shrink-0 mt-1">
            {riskIcon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className={`font-semibold text-lg ${getTextColor()}`}>
                {fraudScore >= 70 ? '🚨 High Risk Detected' :
                 fraudScore >= 40 ? '⚠️ Potential Risk Detected' :
                 '🔍 Risk Assessment'}
              </h3>
              <Badge
                variant={riskLevel === 'Safe' ? 'safe' : riskLevel === 'Warning' ? 'warning' : 'danger'}
                size="sm"
              >
                {riskLevel} ({fraudScore}% risk)
              </Badge>
            </div>

            <p className="text-[var(--text-secondary)] mb-3 leading-relaxed">
              {aiExplanation}
            </p>

            {detectionTypes.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-[var(--text-primary)] mb-2">
                  Detection Flags:
                </p>
                <div className="flex flex-wrap gap-2">
                  {detectionTypes.map((type, index) => (
                    <Badge key={index} variant="warning" size="sm">
                      {type.replace('_', ' ').toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {onLearnMore && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onLearnMore}
                  className="text-xs"
                >
                  📚 Learn More About This Risk
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open('https://docs.fraudguard.com/fraud-detection', '_blank')}
                className="text-xs text-[var(--text-secondary)]"
              >
                🛡️ How We Detect Fraud
              </Button>
            </div>
          </div>

          {/* Dismiss Button */}
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex-shrink-0"
            >
              ✕
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}