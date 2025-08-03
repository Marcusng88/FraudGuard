-- FraudGuard Database Schema Setup
-- PostgreSQL/Supabase Database Tables and Sample Data

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS fraud_flags CASCADE;
DROP TABLE IF EXISTS nfts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop custom types if they exist
DROP TYPE IF EXISTS threat_level CASCADE;
DROP TYPE IF EXISTS listing_status CASCADE;
DROP TYPE IF EXISTS trade_status CASCADE;

-- Create custom ENUM types
CREATE TYPE threat_level AS ENUM ('safe', 'low', 'medium', 'high', 'critical');
CREATE TYPE listing_status AS ENUM ('active', 'sold', 'cancelled', 'expired');
CREATE TYPE trade_status AS ENUM ('pending', 'completed', 'cancelled', 'failed');

-- Create Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT UNIQUE NOT NULL,
    username TEXT,
    email TEXT,
    avatar_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    reputation_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create NFTs table
CREATE TABLE nfts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nft_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    creator_id UUID REFERENCES users(id),
    owner_id UUID REFERENCES users(id),
    price_sui DECIMAL(20, 9),
    is_listed BOOLEAN DEFAULT FALSE,
    listing_status listing_status DEFAULT 'active',
    threat_level threat_level DEFAULT 'safe',
    is_verified BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Fraud Flags table
CREATE TABLE fraud_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nft_id UUID REFERENCES nfts(id) ON DELETE CASCADE,
    flag_type INTEGER NOT NULL,
    confidence_score DECIMAL(3, 2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    reason TEXT NOT NULL,
    flagged_by UUID REFERENCES users(id),
    flagged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    details JSONB
);

-- Create Trades table
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nft_id UUID REFERENCES nfts(id),
    seller_id UUID REFERENCES users(id),
    buyer_id UUID REFERENCES users(id),
    price_sui DECIMAL(20, 9) NOT NULL,
    trade_status trade_status DEFAULT 'pending',
    transaction_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX idx_nfts_creator_id ON nfts(creator_id);
CREATE INDEX idx_nfts_owner_id ON nfts(owner_id);
CREATE INDEX idx_nfts_listing_status ON nfts(listing_status);
CREATE INDEX idx_nfts_threat_level ON nfts(threat_level);
CREATE INDEX idx_nfts_is_listed ON nfts(is_listed);
CREATE INDEX idx_fraud_flags_nft_id ON fraud_flags(nft_id);
CREATE INDEX idx_fraud_flags_is_active ON fraud_flags(is_active);
CREATE INDEX idx_trades_nft_id ON trades(nft_id);
CREATE INDEX idx_trades_seller_id ON trades(seller_id);
CREATE INDEX idx_trades_buyer_id ON trades(buyer_id);
CREATE INDEX idx_users_wallet_address ON users(wallet_address);

-- Insert sample users
INSERT INTO users (id, wallet_address, username, email, avatar_url, is_verified, reputation_score) VALUES
('11111111-1111-1111-1111-111111111111', '0x456def', 'CyberArtist', 'artist@example.com', 'https://i.pravatar.cc/150?img=1', TRUE, 95),
('22222222-2222-2222-2222-222222222222', '0x789abc', 'DigitalCollector', 'collector@example.com', 'https://i.pravatar.cc/150?img=2', TRUE, 87),
('33333333-3333-3333-3333-333333333333', '0x123xyz', 'NFTCreator', 'creator@example.com', 'https://i.pravatar.cc/150?img=3', FALSE, 72),
('44444444-4444-4444-4444-444444444444', '0xabc789', 'CryptoWhale', 'whale@example.com', 'https://i.pravatar.cc/150?img=4', TRUE, 98),
('55555555-5555-5555-5555-555555555555', '0xdef456', 'ArtLover', 'lover@example.com', 'https://i.pravatar.cc/150?img=5', FALSE, 65);

-- Insert sample NFTs
INSERT INTO nfts (id, nft_id, name, description, image_url, creator_id, owner_id, price_sui, is_listed, listing_status, threat_level, is_verified, metadata) VALUES
('dc4c28b6-e3b2-44be-b330-66f47d4815c0', '0xnft1', 'Cyber Punk', 'A futuristic cyberpunk NFT with neon aesthetics', 'https://i.pinimg.com/736x/f5/71/23/f571238e9c19b5b69b62c1c30ba8b8ff.jpg', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 2.5, TRUE, 'active', 'safe', TRUE, '{"rarity": "rare", "attributes": [{"trait_type": "Style", "value": "Cyberpunk"}, {"trait_type": "Color", "value": "Neon"}]}'),

('a8f3d91b-2c4e-4a1b-9f7e-8d6c5b4a3e2f', '0xnft2', 'Digital Warrior', 'A powerful digital warrior in cyber armor', 'https://i.pinimg.com/736x/0c/8a/16/0c8a164a5d3b9f4e2c7a8b6d9e1f3c5a.jpg', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 1.8, TRUE, 'active', 'safe', TRUE, '{"rarity": "epic", "attributes": [{"trait_type": "Class", "value": "Warrior"}, {"trait_type": "Armor", "value": "Cyber"}]}'),

('b9e4f02c-3d5f-5b2c-a08f-9e7d6c5b4a3f', '0xnft3', 'Neon City', 'A vibrant neon cityscape at night', 'https://i.pinimg.com/736x/1d/9b/27/1d9b272b6e4c8f5a3d7b9e2f4c6a8e1d.jpg', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 3.2, TRUE, 'active', 'safe', TRUE, '{"rarity": "legendary", "attributes": [{"trait_type": "Scene", "value": "City"}, {"trait_type": "Time", "value": "Night"}]}'),

('c0f5e13d-4e6f-6c3d-b19f-af8e7d6c5b4a', '0xnft4', 'Hacker Avatar', 'A mysterious hacker in the digital realm', 'https://i.pinimg.com/736x/2e/ac/38/2eac38c7f5d9a6b4e8c1f3a5b7d9e2f4.jpg', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 1.5, TRUE, 'active', 'medium', FALSE, '{"rarity": "common", "attributes": [{"trait_type": "Profession", "value": "Hacker"}, {"trait_type": "Realm", "value": "Digital"}]}'),

('d1e6f24e-5f7e-7d4e-c2af-bfa9e8d7c6b5', '0xnft5', 'Cyber Dragon', 'A majestic cyber dragon with electric wings', 'https://i.pinimg.com/736x/3f/bd/49/3fbd497a6e8b7c5d9f2e4a6c8f1a3b5d.jpg', '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 5.0, TRUE, 'active', 'safe', TRUE, '{"rarity": "mythic", "attributes": [{"trait_type": "Species", "value": "Dragon"}, {"trait_type": "Element", "value": "Electric"}]}');

-- Insert sample fraud flags
INSERT INTO fraud_flags (nft_id, flag_type, confidence_score, reason, flagged_by, details) VALUES
((SELECT id FROM nfts WHERE nft_id = '0xnft4'), 2, 0.75, 'Suspicious metadata patterns detected', '22222222-2222-2222-2222-222222222222', '{"ai_analysis": "potential duplicate content", "similarity_score": 0.78}');

-- Insert sample trades
INSERT INTO trades (nft_id, seller_id, buyer_id, price_sui, trade_status, transaction_hash, completed_at) VALUES
((SELECT id FROM nfts WHERE nft_id = '0xnft2'), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 1.8, 'completed', '0xtx123', NOW() - INTERVAL '2 days');

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nfts_updated_at BEFORE UPDATE ON nfts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for marketplace statistics
CREATE OR REPLACE VIEW marketplace_stats AS
SELECT 
    COUNT(*) as total_nfts,
    COUNT(CASE WHEN is_listed = TRUE AND listing_status = 'active' THEN 1 END) as active_listings,
    COUNT(CASE WHEN is_verified = TRUE THEN 1 END) as verified_nfts,
    COUNT(CASE WHEN threat_level != 'safe' THEN 1 END) as flagged_nfts,
    COALESCE(SUM(CASE WHEN listing_status = 'sold' THEN price_sui ELSE 0 END), 0) as total_volume_sui
FROM nfts;

-- Grant necessary permissions (adjust as needed for your setup)
-- These would be set up based on your specific database user permissions

-- Display confirmation
SELECT 'Database setup completed successfully!' as status;
SELECT * FROM marketplace_stats;
