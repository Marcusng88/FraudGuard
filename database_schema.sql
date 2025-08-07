-- FraudGuard Database Schema for Supabase
-- This schema supports wallet-based authentication, NFT marketplace, and fraud detection

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Users table (wallet-based authentication)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT UNIQUE NOT NULL,
    username TEXT,
    bio TEXT,
    email TEXT,
    reputation_score DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NFTs table (off-chain metadata with on-chain references)
CREATE TABLE nfts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sui_object_id TEXT UNIQUE,
    creator_wallet_address TEXT NOT NULL,
    owner_wallet_address TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    metadata_url TEXT,
    attributes JSONB,
    category TEXT,
    initial_price DECIMAL(18,8),
    is_listed BOOLEAN DEFAULT FALSE,
    embedding_vector vector(768),
    analysis_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Listings table (off-chain listing management)
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nft_id UUID REFERENCES nfts(id) ON DELETE CASCADE,
    seller_wallet_address TEXT NOT NULL,
    price DECIMAL(18,8) NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled', 'expired')),
    listing_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Transaction history table (off-chain transaction tracking)
CREATE TABLE transaction_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nft_id UUID REFERENCES nfts(id),
    listing_id UUID REFERENCES listings(id),
    seller_wallet_address TEXT NOT NULL,
    buyer_wallet_address TEXT NOT NULL,
    price DECIMAL(18,8) NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('mint', 'purchase', 'listing', 'unlisting', 'edit_listing')),
    blockchain_tx_id TEXT,
    gas_fee DECIMAL(18,8),
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User reputation tracking
CREATE TABLE user_reputation_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('fraud_detected', 'successful_sale', 'fraud_report', 'positive_review')),
    nft_id UUID REFERENCES nfts(id),
    points_change INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_nfts_sui_object_id ON nfts(sui_object_id);
CREATE INDEX idx_nfts_owner_wallet ON nfts(owner_wallet_address);
CREATE INDEX idx_nfts_creator_wallet ON nfts(creator_wallet_address);
CREATE INDEX idx_listings_nft_id ON listings(nft_id);
CREATE INDEX idx_listings_seller_wallet ON listings(seller_wallet_address);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_transaction_history_nft_id ON transaction_history(nft_id);
CREATE INDEX idx_transaction_history_seller ON transaction_history(seller_wallet_address);
CREATE INDEX idx_transaction_history_buyer ON transaction_history(buyer_wallet_address);
CREATE INDEX idx_transaction_history_type ON transaction_history(transaction_type);
CREATE INDEX idx_user_reputation_user_id ON user_reputation_events(user_id);

-- Vector similarity search index for NFT embeddings
CREATE INDEX idx_nfts_embedding_vector ON nfts USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfts ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reputation_events ENABLE ROW LEVEL SECURITY;

-- Users can read all data but only update their own
CREATE POLICY "Users can read all user data" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- NFTs can be read by all, but only owners can update
CREATE POLICY "Anyone can read NFT data" ON nfts FOR SELECT USING (true);
CREATE POLICY "Only NFT owner can update" ON nfts FOR UPDATE USING (owner_wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Listings can be read by all, but only sellers can modify
CREATE POLICY "Anyone can read listings" ON listings FOR SELECT USING (true);
CREATE POLICY "Only seller can modify listing" ON listings FOR ALL USING (seller_wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Transaction history is read-only for all
CREATE POLICY "Anyone can read transaction history" ON transaction_history FOR SELECT USING (true);

-- Reputation events are read-only for all
CREATE POLICY "Anyone can read reputation events" ON user_reputation_events FOR SELECT USING (true);

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nfts_updated_at BEFORE UPDATE ON nfts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update user reputation score
CREATE OR REPLACE FUNCTION update_user_reputation()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users 
    SET reputation_score = (
        SELECT COALESCE(SUM(points_change), 0)
        FROM user_reputation_events 
        WHERE user_id = NEW.user_id
    )
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update reputation when events are added
CREATE TRIGGER update_reputation_score 
    AFTER INSERT ON user_reputation_events 
    FOR EACH ROW EXECUTE FUNCTION update_user_reputation();

-- Function to find similar NFTs using vector similarity
CREATE OR REPLACE FUNCTION find_similar_nfts(
    target_embedding vector(768),
    similarity_threshold float DEFAULT 0.8,
    limit_count int DEFAULT 10
)
RETURNS TABLE(
    nft_id UUID,
    title TEXT,
    similarity_score float
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.title,
        1 - (n.embedding_vector <=> target_embedding) as similarity_score
    FROM nfts n
    WHERE n.embedding_vector IS NOT NULL
    AND 1 - (n.embedding_vector <=> target_embedding) > similarity_threshold
    ORDER BY n.embedding_vector <=> target_embedding
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE users IS 'User profiles with wallet-based authentication';
COMMENT ON TABLE nfts IS 'NFT metadata with on-chain references and AI analysis results';
COMMENT ON TABLE listings IS 'Off-chain listing management for marketplace';
COMMENT ON TABLE transaction_history IS 'Off-chain transaction tracking';
COMMENT ON TABLE user_reputation_events IS 'Reputation scoring events for fraud detection';
COMMENT ON FUNCTION find_similar_nfts IS 'Find similar NFTs using vector similarity search for plagiarism detection';

