-- FraudGuard Database Schema
-- PostgreSQL database schema for NFT marketplace with fraud detection

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- ===== Phase 1: Core Tables =====

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    reputation_score DECIMAL(5,2) DEFAULT 50.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NFTs table
CREATE TABLE IF NOT EXISTS public.nfts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    price DECIMAL(18,8) NOT NULL,
    image_url TEXT NOT NULL,
    sui_object_id TEXT UNIQUE,
    is_fraud BOOLEAN DEFAULT FALSE,
    confidence_score DECIMAL(5,2) DEFAULT 0.0,
    flag_type INTEGER,
    reason TEXT,
    evidence_url TEXT, -- Store as JSON string for evidence URLs
    analysis_details JSONB, -- Store detailed analysis results
    embedding_vector vector(768), -- Gemini description embeddings are 768-dimensional
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Phase 2: Enhanced NFT columns
    is_listed BOOLEAN DEFAULT FALSE,
    listing_price DECIMAL(18,8),
    last_listed_at TIMESTAMP,
    listing_id TEXT,
    listing_status TEXT DEFAULT 'inactive'
);

-- Fraud flags table
CREATE TABLE IF NOT EXISTS public.fraud_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nft_id UUID NOT NULL REFERENCES nfts(id) ON DELETE CASCADE,
    flag_type TEXT NOT NULL,
    reason TEXT NOT NULL,
    confidence DECIMAL(5,2) NOT NULL,
    flagged_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- ===== Phase 2: Marketplace Tables =====

-- Listings table
CREATE TABLE IF NOT EXISTS public.listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nft_id UUID NOT NULL REFERENCES nfts(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    price DECIMAL(18,8) NOT NULL,
    expires_at TIMESTAMP,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Phase 2: Enhanced Listing columns
    blockchain_tx_id TEXT,
    listing_id TEXT UNIQUE,
    metadata JSONB, -- JSONB type for metadata
    listing_metadata JSONB -- JSONB type for listing metadata
);

-- Listing history table
CREATE TABLE IF NOT EXISTS public.listing_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    nft_id UUID NOT NULL REFERENCES nfts(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'purchased'
    old_price DECIMAL(18,8),
    new_price DECIMAL(18,8),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blockchain_tx_id TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== Phase 3: Analytics and Events =====

-- Marketplace events table
CREATE TABLE IF NOT EXISTS public.marketplace_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL, -- 'NFTListed', 'NFTUnlisted', 'NFTPurchased', etc.
    nft_id UUID REFERENCES nfts(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    price DECIMAL(18,8),
    blockchain_tx_id TEXT,
    metadata JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== Indexes for Performance =====

-- Users indexes
CREATE INDEX IF NOT EXISTS users_wallet_address_idx ON public.users (wallet_address);
CREATE INDEX IF NOT EXISTS users_reputation_score_idx ON public.users (reputation_score);

-- NFTs indexes
CREATE INDEX IF NOT EXISTS nfts_owner_id_idx ON public.nfts (owner_id);
CREATE INDEX IF NOT EXISTS nfts_wallet_address_idx ON public.nfts (wallet_address);
CREATE INDEX IF NOT EXISTS nfts_sui_object_id_idx ON public.nfts (sui_object_id);
CREATE INDEX IF NOT EXISTS nfts_status_idx ON public.nfts (status);
CREATE INDEX IF NOT EXISTS nfts_is_fraud_idx ON public.nfts (is_fraud);
CREATE INDEX IF NOT EXISTS nfts_category_idx ON public.nfts (category);
CREATE INDEX IF NOT EXISTS nfts_created_at_idx ON public.nfts (created_at);
CREATE INDEX IF NOT EXISTS nfts_is_listed_idx ON public.nfts (is_listed);

-- Fraud flags indexes
CREATE INDEX IF NOT EXISTS fraud_flags_nft_id_idx ON public.fraud_flags (nft_id);
CREATE INDEX IF NOT EXISTS fraud_flags_flag_type_idx ON public.fraud_flags (flag_type);
CREATE INDEX IF NOT EXISTS fraud_flags_is_active_idx ON public.fraud_flags (is_active);

-- Listings indexes
CREATE INDEX IF NOT EXISTS listings_nft_id_idx ON public.listings (nft_id);
CREATE INDEX IF NOT EXISTS listings_seller_id_idx ON public.listings (seller_id);
CREATE INDEX IF NOT EXISTS listings_status_idx ON public.listings (status);
CREATE INDEX IF NOT EXISTS listings_price_idx ON public.listings (price);
CREATE INDEX IF NOT EXISTS listings_created_at_idx ON public.listings (created_at);

-- Listing history indexes
CREATE INDEX IF NOT EXISTS listing_history_listing_id_idx ON public.listing_history (listing_id);
CREATE INDEX IF NOT EXISTS listing_history_nft_id_idx ON public.listing_history (nft_id);
CREATE INDEX IF NOT EXISTS listing_history_action_idx ON public.listing_history (action);
CREATE INDEX IF NOT EXISTS listing_history_timestamp_idx ON public.listing_history (timestamp);

-- Marketplace events indexes
CREATE INDEX IF NOT EXISTS marketplace_events_event_type_idx ON public.marketplace_events (event_type);
CREATE INDEX IF NOT EXISTS marketplace_events_nft_id_idx ON public.marketplace_events (nft_id);
CREATE INDEX IF NOT EXISTS marketplace_events_timestamp_idx ON public.marketplace_events (timestamp);

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS nfts_embedding_vector_idx ON public.nfts USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);

-- ===== Views for Analytics =====

-- Marketplace overview view
CREATE OR REPLACE VIEW public.marketplace_overview AS
SELECT 
    COUNT(DISTINCT n.id) as total_nfts,
    COUNT(DISTINCT l.id) as total_listings,
    COUNT(DISTINCT u.id) as total_users,
    AVG(l.price) as average_price,
    SUM(l.price) as total_volume,
    COUNT(DISTINCT CASE WHEN n.is_fraud THEN n.id END) as flagged_nfts
FROM public.nfts n
LEFT JOIN public.listings l ON n.id = l.nft_id AND l.status = 'active'
LEFT JOIN public.users u ON n.owner_id = u.id;

-- User portfolio view
CREATE OR REPLACE VIEW public.user_portfolio AS
SELECT 
    u.id as user_id,
    u.wallet_address,
    u.username,
    COUNT(DISTINCT n.id) as total_nfts,
    COUNT(DISTINCT l.id) as active_listings,
    AVG(l.price) as average_listing_price,
    u.reputation_score
FROM public.users u
LEFT JOIN public.nfts n ON u.id = n.owner_id
LEFT JOIN public.listings l ON n.id = l.nft_id AND l.status = 'active'
GROUP BY u.id, u.wallet_address, u.username, u.reputation_score;

-- ===== Functions for Common Operations =====

-- Function to update NFT listing status
CREATE OR REPLACE FUNCTION update_nft_listing_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' THEN
        UPDATE public.nfts 
        SET is_listed = TRUE, listing_price = NEW.price, last_listed_at = CURRENT_TIMESTAMP, listing_status = 'active'
        WHERE id = NEW.nft_id;
    ELSIF NEW.status = 'inactive' OR NEW.status = 'sold' THEN
        UPDATE public.nfts 
        SET is_listed = FALSE, listing_price = NULL, last_listed_at = NULL, listing_status = 'inactive'
        WHERE id = NEW.nft_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update NFT listing status
CREATE TRIGGER update_nft_listing_status_trigger
    AFTER INSERT OR UPDATE ON public.listings
    FOR EACH ROW
    EXECUTE FUNCTION update_nft_listing_status();

-- Function to log marketplace events
CREATE OR REPLACE FUNCTION log_marketplace_event()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.marketplace_events (
        event_type,
        nft_id,
        seller_id,
        price,
        blockchain_tx_id,
        metadata
    ) VALUES (
        TG_OP,
        NEW.nft_id,
        NEW.seller_id,
        NEW.price,
        NEW.blockchain_tx_id,
        jsonb_build_object('listing_id', NEW.id, 'status', NEW.status)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically log marketplace events
CREATE TRIGGER log_marketplace_event_trigger
    AFTER INSERT OR UPDATE ON public.listings
    FOR EACH ROW
    EXECUTE FUNCTION log_marketplace_event();

-- ===== Sample Data (Optional) =====

-- Insert sample users
INSERT INTO public.users (wallet_address, email, username, reputation_score) VALUES
('0x1234567890abcdef', 'user1@example.com', 'User1', 75.0),
('0xabcdef1234567890', 'user2@example.com', 'User2', 85.0)
ON CONFLICT (wallet_address) DO NOTHING;

-- ===== Comments =====

COMMENT ON TABLE public.users IS 'User accounts and profiles';
COMMENT ON TABLE public.nfts IS 'NFT metadata and fraud detection results';
COMMENT ON TABLE public.fraud_flags IS 'Fraud detection flags for NFTs';
COMMENT ON TABLE public.listings IS 'NFT marketplace listings';
COMMENT ON TABLE public.listing_history IS 'Audit trail for listing changes';
COMMENT ON TABLE public.marketplace_events IS 'Marketplace activity events';

COMMENT ON COLUMN public.nfts.embedding_vector IS 'Vector embedding for similarity search using Gemini analysis';
COMMENT ON COLUMN public.nfts.analysis_details IS 'Detailed fraud analysis results from AI models';
COMMENT ON COLUMN public.nfts.evidence_url IS 'JSON array of evidence URLs for fraud detection';
COMMENT ON COLUMN public.nfts.sui_object_id IS 'Sui blockchain object ID for the NFT';