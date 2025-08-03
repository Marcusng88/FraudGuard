-- FraudGuard Database Schema
-- This script creates the necessary tables for the NFT marketplace with fraud detection

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (for authentication and profiles)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sui_address VARCHAR(66) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    provider VARCHAR(20) CHECK (provider IN ('google', 'twitch', 'facebook')),
    is_verified BOOLEAN DEFAULT FALSE,
    reputation_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- NFTs table
CREATE TABLE IF NOT EXISTS nfts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nft_id VARCHAR(100) UNIQUE NOT NULL, -- Sui NFT object ID
    name VARCHAR(200) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    metadata_url TEXT, -- IPFS URL for full metadata
    creator_address VARCHAR(66) NOT NULL,
    current_owner_address VARCHAR(66) NOT NULL,
    price_sui DECIMAL(20, 9), -- Price in SUI tokens
    currency VARCHAR(10) DEFAULT 'SUI',
    is_listed BOOLEAN DEFAULT FALSE,
    listing_status VARCHAR(20) DEFAULT 'unlisted' CHECK (listing_status IN ('unlisted', 'active', 'sold', 'cancelled')),
    threat_level VARCHAR(20) DEFAULT 'safe' CHECK (threat_level IN ('safe', 'warning', 'danger')),
    confidence_score DECIMAL(5, 4), -- AI confidence score (0.0000 to 1.0000)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    listed_at TIMESTAMP WITH TIME ZONE,
    
    FOREIGN KEY (creator_address) REFERENCES users(sui_address) ON DELETE CASCADE,
    FOREIGN KEY (current_owner_address) REFERENCES users(sui_address) ON DELETE CASCADE
);

-- Fraud flags table
CREATE TABLE IF NOT EXISTS fraud_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flag_id VARCHAR(100) UNIQUE NOT NULL, -- Sui fraud flag object ID
    nft_id UUID NOT NULL,
    reason TEXT NOT NULL,
    flag_type VARCHAR(50) NOT NULL CHECK (flag_type IN ('plagiarism', 'suspicious_behavior', 'copyright_violation', 'fake_metadata', 'price_manipulation')),
    confidence DECIMAL(5, 4) NOT NULL, -- AI confidence in the flag (0.0000 to 1.0000)
    flagged_by_address VARCHAR(66) NOT NULL, -- AI agent address
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    FOREIGN KEY (nft_id) REFERENCES nfts(id) ON DELETE CASCADE
);

-- Trading history table
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id VARCHAR(100) UNIQUE NOT NULL, -- Sui transaction digest
    nft_id UUID NOT NULL,
    seller_address VARCHAR(66) NOT NULL,
    buyer_address VARCHAR(66) NOT NULL,
    price_sui DECIMAL(20, 9) NOT NULL,
    currency VARCHAR(10) DEFAULT 'SUI',
    trade_type VARCHAR(20) DEFAULT 'purchase' CHECK (trade_type IN ('purchase', 'transfer', 'mint')),
    transaction_status VARCHAR(20) DEFAULT 'pending' CHECK (transaction_status IN ('pending', 'confirmed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    
    FOREIGN KEY (nft_id) REFERENCES nfts(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_address) REFERENCES users(sui_address),
    FOREIGN KEY (buyer_address) REFERENCES users(sui_address)
);

-- Marketplace analytics table
CREATE TABLE IF NOT EXISTS marketplace_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    total_nfts INTEGER DEFAULT 0,
    active_listings INTEGER DEFAULT 0,
    verified_nfts INTEGER DEFAULT 0,
    flagged_nfts INTEGER DEFAULT 0,
    total_volume_sui DECIMAL(20, 9) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_nfts_listing_status ON nfts(listing_status);
CREATE INDEX IF NOT EXISTS idx_nfts_threat_level ON nfts(threat_level);
CREATE INDEX IF NOT EXISTS idx_nfts_creator ON nfts(creator_address);
CREATE INDEX IF NOT EXISTS idx_nfts_owner ON nfts(current_owner_address);
CREATE INDEX IF NOT EXISTS idx_nfts_created_at ON nfts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_nft_active ON fraud_flags(nft_id, is_active);
CREATE INDEX IF NOT EXISTS idx_trades_nft ON trades(nft_id);
CREATE INDEX IF NOT EXISTS idx_trades_buyer ON trades(buyer_address);
CREATE INDEX IF NOT EXISTS idx_trades_seller ON trades(seller_address);

-- Update timestamps function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nfts_updated_at BEFORE UPDATE ON nfts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO users (sui_address, display_name, provider, is_verified) VALUES
    ('0x1234567890abcdef1234567890abcdef12345678', 'CyberArtist', 'google', true),
    ('0xabcdef1234567890abcdef1234567890abcdef12', 'PixelMaster', 'twitch', true),
    ('0x9876543210fedcba9876543210fedcba98765432', 'NeonCreator', 'facebook', false),
    ('0xfedcba9876543210fedcba9876543210fedcba98', 'QuantumArtist', 'google', true)
ON CONFLICT (sui_address) DO NOTHING;

-- Insert sample NFTs
INSERT INTO nfts (nft_id, name, description, image_url, creator_address, current_owner_address, price_sui, is_listed, listing_status, threat_level, confidence_score) VALUES
    ('0xnft1', 'Cyber Punk', 'A futuristic cyberpunk NFT with neon aesthetics', 'https://i.pinimg.com/736x/f5/71/b6/f571b6d34fca38fdf580f788a223a9be.jpg', '0x1234567890abcdef1234567890abcdef12345678', '0x1234567890abcdef1234567890abcdef12345678', 2.5, true, 'active', 'safe', 0.95),
    ('0xnft2', 'Digital Dreams', 'Abstract digital art representing dreams in code', 'https://i.pinimg.com/736x/90/56/d3/9056d37cff0fcead7492b2a4fb4b01cf.jpg', '0xabcdef1234567890abcdef1234567890abcdef12', '0xabcdef1234567890abcdef1234567890abcdef12', 1.8, true, 'active', 'warning', 0.72),
    ('0xnft3', 'Neon Genesis', 'Bright neon artwork with geometric patterns', 'https://i.pinimg.com/1200x/25/5e/6a/255e6a9ce78282a79d736713a65c289b.jpg', '0x9876543210fedcba9876543210fedcba98765432', '0x9876543210fedcba9876543210fedcba98765432', 3.2, true, 'active', 'danger', 0.25),
    ('0xnft4', 'Quantum Reality', 'Quantum-inspired abstract digital art', 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=400&fit=crop', '0xfedcba9876543210fedcba9876543210fedcba98', '0xfedcba9876543210fedcba9876543210fedcba98', 4.1, true, 'active', 'safe', 0.91),
    ('0xnft5', 'Holographic Dreams', 'Holographic effects in digital space', 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=400&fit=crop', '0x1234567890abcdef1234567890abcdef12345678', '0x1234567890abcdef1234567890abcdef12345678', 2.9, true, 'active', 'safe', 0.88)
ON CONFLICT (nft_id) DO NOTHING;

-- Insert sample fraud flag for the flagged NFT
INSERT INTO fraud_flags (flag_id, nft_id, reason, flag_type, confidence, flagged_by_address) 
SELECT '0xflag1', n.id, 'Potential copyright violation detected', 'copyright_violation', 0.85, '0xai_agent_address'
FROM nfts n WHERE n.nft_id = '0xnft3'
ON CONFLICT (flag_id) DO NOTHING;

-- Update marketplace stats
INSERT INTO marketplace_stats (total_nfts, active_listings, verified_nfts, flagged_nfts)
SELECT 
    (SELECT COUNT(*) FROM nfts),
    (SELECT COUNT(*) FROM nfts WHERE listing_status = 'active'),
    (SELECT COUNT(*) FROM nfts WHERE threat_level = 'safe'),
    (SELECT COUNT(*) FROM nfts WHERE threat_level = 'danger')
ON CONFLICT DO NOTHING;

-- Create a view for marketplace listings with user details
CREATE OR REPLACE VIEW marketplace_listings AS
SELECT 
    n.id,
    n.nft_id,
    n.name,
    n.description,
    n.image_url,
    n.price_sui,
    n.currency,
    n.threat_level,
    n.confidence_score,
    n.created_at,
    n.listed_at,
    creator.display_name as creator_name,
    creator.is_verified as creator_verified,
    owner.display_name as owner_name,
    owner.is_verified as owner_verified,
    CASE WHEN EXISTS(
        SELECT 1 FROM fraud_flags ff 
        WHERE ff.nft_id = n.id AND ff.is_active = true
    ) THEN true ELSE false END as has_active_flags
FROM nfts n
LEFT JOIN users creator ON n.creator_address = creator.sui_address
LEFT JOIN users owner ON n.current_owner_address = owner.sui_address
WHERE n.listing_status = 'active' AND n.is_listed = true;
