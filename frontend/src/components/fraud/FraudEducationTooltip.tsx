'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface FraudEducationTooltipProps {
  detectionType: string;
  children: React.ReactNode;
  className?: string;
}

const fraudEducationData: Record<string, {
  title: string;
  description: string;
  howItWorks: string;
  prevention: string[];
  severity: 'low' | 'medium' | 'high';
}> = {
  plagiarism: {
    title: 'Plagiarism Detection',
    description: 'This NFT appears to contain content that may be copied from existing works.',
    howItWorks: 'Our AI compares visual features, metadata, and creation patterns against a database of known artworks.',
    prevention: [
      'Always verify the original creator',
      'Check creation dates and history',
      'Look for official verification badges',
      'Research the artist\'s portfolio'
    ],
    severity: 'high'
  },
  duplicate_content: {
    title: 'Duplicate Content',
    description: 'Similar or identical content has been found in other NFTs.',
    howItWorks: 'We use perceptual hashing and image similarity algorithms to detect near-duplicate content.',
    prevention: [
      'Verify uniqueness before purchase',
      'Check if this is part of a legitimate series',
      'Confirm with the original creator',
      'Look for edition numbers or variants'
    ],
    severity: 'high'
  },
  suspicious_minting: {
    title: 'Suspicious Minting Pattern',
    description: 'The minting behavior shows unusual patterns that may indicate automated or bulk creation.',
    howItWorks: 'We analyze minting frequency, timing patterns, and account behavior to detect suspicious activity.',
    prevention: [
      'Research the creator\'s history',
      'Check for organic creation patterns',
      'Verify the creator\'s social presence',
      'Look for community engagement'
    ],
    severity: 'medium'
  },
  price_manipulation: {
    title: 'Price Manipulation',
    description: 'The pricing history shows patterns that may indicate artificial price inflation.',
    howItWorks: 'We monitor trading patterns, volume spikes, and price movements to detect manipulation.',
    prevention: [
      'Check trading volume and history',
      'Compare with similar NFTs',
      'Look for organic price discovery',
      'Verify buyer diversity'
    ],
    severity: 'medium'
  },
  account_suspicious: {
    title: 'Suspicious Account Activity',
    description: 'The creator or seller account shows patterns associated with fraudulent behavior.',
    howItWorks: 'We analyze account age, activity patterns, and behavioral signals to assess trustworthiness.',
    prevention: [
      'Verify account authenticity',
      'Check account creation date',
      'Look for consistent activity',
      'Verify social media presence'
    ],
    severity: 'medium'
  },
  metadata_inconsistency: {
    title: 'Metadata Inconsistency',
    description: 'The NFT metadata contains inconsistencies or suspicious information.',
    howItWorks: 'We validate metadata fields, check for tampering, and verify consistency with blockchain data.',
    prevention: [
      'Review all metadata fields',
      'Check for logical consistency',
      'Verify creation timestamps',
      'Compare with blockchain records'
    ],
    severity: 'low'
  }
};

export function FraudEducationTooltip({ 
  detectionType, 
  children, 
  className 
}: FraudEducationTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const educationInfo = fraudEducationData[detectionType];
  
  if (!educationInfo) {
    return <>{children}</>;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-[var(--danger-red)]';
      case 'medium': return 'text-[var(--warning-orange)]';
      case 'low': return 'text-[var(--info-blue)]';
      default: return 'text-[var(--text-secondary)]';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className="cursor-help"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
      >
        {children}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-80 top-full left-1/2 transform -translate-x-1/2 mt-2 max-w-[90vw]">
          <Card variant="glass" className="border-2 border-[var(--border)] shadow-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-2xl">🛡️</span>
                  {educationInfo.title}
                </CardTitle>
                <Badge 
                  variant={getSeverityBadge(educationInfo.severity) as any}
                  size="sm"
                >
                  {educationInfo.severity.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Description */}
              <div>
                <h4 className="font-medium text-[var(--text-primary)] mb-2">
                  What This Means
                </h4>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {educationInfo.description}
                </p>
              </div>

              {/* How It Works */}
              <div>
                <h4 className="font-medium text-[var(--text-primary)] mb-2">
                  How We Detect This
                </h4>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {educationInfo.howItWorks}
                </p>
              </div>

              {/* Prevention Tips */}
              <div>
                <h4 className="font-medium text-[var(--text-primary)] mb-2">
                  Protection Tips
                </h4>
                <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                  {educationInfo.prevention.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-[var(--primary-blue)] mt-1">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open('https://docs.fraudguard.com/fraud-types', '_blank')}
                  className="text-xs flex-1"
                >
                  📚 Learn More
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-xs"
                >
                  ✕
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Helper component for quick fraud education badges
export function FraudEducationBadge({ 
  detectionType, 
  className 
}: { 
  detectionType: string; 
  className?: string; 
}) {
  const educationInfo = fraudEducationData[detectionType];
  
  if (!educationInfo) return null;

  return (
    <FraudEducationTooltip detectionType={detectionType} className={className}>
      <Badge 
        variant="warning" 
        size="sm" 
        className="cursor-help hover:opacity-80 transition-opacity"
      >
        {detectionType.replace('_', ' ').toUpperCase()} ❓
      </Badge>
    </FraudEducationTooltip>
  );
}
