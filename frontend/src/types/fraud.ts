export interface FraudAnalysis {
  nftId: string;
  overallRiskScore: number; // 0-100
  riskLevel: 'safe' | 'warning' | 'danger';
  detections: FraudDetection[];
  aiSummary: string;
  recommendations: string[];
  lastAnalyzed: string;
}

export interface FraudDetection {
  type: FraudType;
  confidence: number; // 0-100
  description: string;
  evidence?: FraudEvidence;
  severity: 'low' | 'medium' | 'high';
}

export type FraudType = 
  | 'image_plagiarism'
  | 'metadata_plagiarism'
  | 'suspicious_minting_pattern'
  | 'price_manipulation'
  | 'wash_trading'
  | 'bot_activity'
  | 'duplicate_listing';

export interface FraudEvidence {
  similarImages?: SimilarImage[];
  suspiciousTransactions?: string[];
  abnormalPricing?: PriceAnalysis;
  botBehavior?: BotBehaviorEvidence;
}

export interface SimilarImage {
  nftId: string;
  nftName: string;
  similarity: number; // 0-100
  imageUrl: string;
  createdAt: string;
}

export interface PriceAnalysis {
  currentPrice: string;
  marketPrice: string;
  deviation: number; // percentage
  reason: string;
}

export interface BotBehaviorEvidence {
  rapidTransactions: number;
  timePattern: string;
  addressPattern: string;
}

export interface FraudReport {
  nftId: string;
  reporterAddress: string;
  reason: FraudType;
  description: string;
  evidence?: string;
  timestamp: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
}

export interface FraudSettings {
  showWarnings: boolean;
  blockHighRisk: boolean;
  autoReport: boolean;
  notificationLevel: 'none' | 'medium' | 'high' | 'all';
}
