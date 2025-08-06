create table public.flags (
  id uuid not null default gen_random_uuid (),
  nft_id uuid not null,
  user_id uuid not null,
  reason text not null,
  created_at timestamp with time zone not null default now(),
  constraint flags_pkey primary key (id),
  constraint flags_nft_id_fkey foreign KEY (nft_id) references nfts (id) on delete CASCADE,
  constraint flags_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.listings (
  id uuid not null default gen_random_uuid (),
  nft_id uuid not null,
  seller_id uuid not null,
  price numeric(18, 8) not null,
  expires_at timestamp with time zone null,
  status text not null default 'active'::text,
  created_at timestamp with time zone not null default now(),
  constraint listings_pkey primary key (id),
  constraint listings_nft_id_fkey foreign KEY (nft_id) references nfts (id) on delete CASCADE,
  constraint listings_seller_id_fkey foreign KEY (seller_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.nfts (
  id uuid not null default gen_random_uuid (),
  owner_id uuid not null,
  wallet_address text not null,
  title text not null,
  description text null,
  category text not null,
  price numeric(18, 8) not null,
  image_url text not null,
  sui_object_id text null,
  embedding_vector public.vector(768) null,
  is_fraud boolean not null default false,
  confidence_score real null default 0.0,
  flag_type integer null,
  reason text null,
  evidence_url text null,
  analysis_details jsonb null,
  status text not null default 'pending'::text,
  created_at timestamp with time zone not null default now(),
  constraint nfts_pkey primary key (id),
  constraint nfts_sui_object_id_key unique (sui_object_id),
  constraint nfts_owner_id_fkey foreign KEY (owner_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists nfts_embedding_vector_idx on public.nfts using ivfflat (embedding_vector)
with
  (lists = '100') TABLESPACE pg_default;

create table public.users (
  id uuid not null default gen_random_uuid (),
  wallet_address text not null,
  email text not null,
  username text not null,
  avatar_url text null,
  bio text null,
  reputation_score real not null default 0.0,
  created_at timestamp with time zone not null default now(),
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email),
  constraint users_wallet_address_key unique (wallet_address)
) TABLESPACE pg_default;

-- Phase 1.1: Kiosk Management Table
create table public.user_kiosk_map (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  kiosk_id text not null,
  kiosk_owner_cap_id text null,
  sync_status text not null default 'synced'::text,
  last_synced_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  constraint user_kiosk_map_pkey primary key (id),
  constraint user_kiosk_map_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint user_kiosk_map_user_id_key unique (user_id),
  constraint user_kiosk_map_kiosk_id_key unique (kiosk_id)
) TABLESPACE pg_default;

-- Index for efficient kiosk lookups
create index IF not exists user_kiosk_map_user_id_idx on public.user_kiosk_map (user_id);
create index IF not exists user_kiosk_map_kiosk_id_idx on public.user_kiosk_map (kiosk_id);
create index IF not exists user_kiosk_map_sync_status_idx on public.user_kiosk_map (sync_status);

-- Phase 2: Database Schema Extensions

-- 2.1 Enhanced NFT Table (Add new columns)
ALTER TABLE public.nfts ADD COLUMN IF NOT EXISTS is_listed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.nfts ADD COLUMN IF NOT EXISTS listing_price NUMERIC(18, 8);
ALTER TABLE public.nfts ADD COLUMN IF NOT EXISTS last_listed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.nfts ADD COLUMN IF NOT EXISTS listing_id TEXT;
ALTER TABLE public.nfts ADD COLUMN IF NOT EXISTS kiosk_id TEXT;
ALTER TABLE public.nfts ADD COLUMN IF NOT EXISTS listing_status TEXT DEFAULT 'inactive';

-- 2.2 Listing History Table for Audit Trail
CREATE TABLE IF NOT EXISTS public.listing_history (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL,
    nft_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'expired'
    old_price NUMERIC(18, 8),
    new_price NUMERIC(18, 8),
    seller_id UUID NOT NULL,
    kiosk_id TEXT,
    blockchain_tx_id TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT listing_history_pkey PRIMARY KEY (id),
    CONSTRAINT listing_history_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
    CONSTRAINT listing_history_nft_id_fkey FOREIGN KEY (nft_id) REFERENCES nfts(id) ON DELETE CASCADE,
    CONSTRAINT listing_history_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 2.3 Marketplace Analytics Table
CREATE TABLE IF NOT EXISTS public.marketplace_analytics (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    total_listings INTEGER NOT NULL DEFAULT 0,
    total_volume NUMERIC(18, 8) NOT NULL DEFAULT 0,
    active_sellers INTEGER NOT NULL DEFAULT 0,
    total_transactions INTEGER NOT NULL DEFAULT 0,
    average_price NUMERIC(18, 8) NOT NULL DEFAULT 0,
    fraud_detection_rate REAL NOT NULL DEFAULT 0.0,
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT marketplace_analytics_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- 2.4 Transaction History Table
CREATE TABLE IF NOT EXISTS public.transaction_history (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    nft_id UUID NOT NULL,
    listing_id UUID,
    seller_id UUID NOT NULL,
    buyer_id UUID NOT NULL,
    price NUMERIC(18, 8) NOT NULL,
    blockchain_tx_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL, -- 'purchase', 'listing', 'delisting', 'price_update'
    status TEXT NOT NULL DEFAULT 'completed',
    gas_fee NUMERIC(18, 8),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT transaction_history_pkey PRIMARY KEY (id),
    CONSTRAINT transaction_history_nft_id_fkey FOREIGN KEY (nft_id) REFERENCES nfts(id) ON DELETE CASCADE,
    CONSTRAINT transaction_history_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL,
    CONSTRAINT transaction_history_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT transaction_history_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 2.5 Event Tracking Table for Frontend Integration
CREATE TABLE IF NOT EXISTS public.blockchain_events (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'NFTListed', 'NFTUnlisted', 'NFTPurchased', 'KioskCreated', etc.
    nft_id TEXT,
    kiosk_id TEXT,
    seller_address TEXT,
    buyer_address TEXT,
    price NUMERIC(18, 8),
    listing_id TEXT,
    blockchain_tx_id TEXT NOT NULL,
    block_number BIGINT,
    event_data JSONB,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT blockchain_events_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- 2.6 Enhanced Listings Table (Add new columns)
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS kiosk_id TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS blockchain_tx_id TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS listing_id TEXT UNIQUE;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 2.7 User Activity Tracking
CREATE TABLE IF NOT EXISTS public.user_activity (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    activity_type TEXT NOT NULL, -- 'login', 'nft_mint', 'listing_created', 'purchase', 'fraud_report'
    nft_id UUID,
    listing_id UUID,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT user_activity_pkey PRIMARY KEY (id),
    CONSTRAINT user_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT user_activity_nft_id_fkey FOREIGN KEY (nft_id) REFERENCES nfts(id) ON DELETE SET NULL,
    CONSTRAINT user_activity_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- 2.8 Indexes for Performance
CREATE INDEX IF NOT EXISTS listing_history_listing_id_idx ON public.listing_history (listing_id);
CREATE INDEX IF NOT EXISTS listing_history_nft_id_idx ON public.listing_history (nft_id);
CREATE INDEX IF NOT EXISTS listing_history_timestamp_idx ON public.listing_history (timestamp);
CREATE INDEX IF NOT EXISTS transaction_history_nft_id_idx ON public.transaction_history (nft_id);
CREATE INDEX IF NOT EXISTS transaction_history_blockchain_tx_id_idx ON public.transaction_history (blockchain_tx_id);
CREATE INDEX IF NOT EXISTS blockchain_events_event_type_idx ON public.blockchain_events (event_type);
CREATE INDEX IF NOT EXISTS blockchain_events_processed_idx ON public.blockchain_events (processed);
CREATE INDEX IF NOT EXISTS blockchain_events_timestamp_idx ON public.blockchain_events (created_at);
CREATE INDEX IF NOT EXISTS user_activity_user_id_idx ON public.user_activity (user_id);
CREATE INDEX IF NOT EXISTS user_activity_timestamp_idx ON public.user_activity (timestamp);
CREATE INDEX IF NOT EXISTS nfts_is_listed_idx ON public.nfts (is_listed);
CREATE INDEX IF NOT EXISTS nfts_listing_status_idx ON public.nfts (listing_status);
CREATE INDEX IF NOT EXISTS listings_status_idx ON public.listings (status);
CREATE INDEX IF NOT EXISTS listings_kiosk_id_idx ON public.listings (kiosk_id);

-- 2.9 Triggers for Automatic Updates
CREATE OR REPLACE FUNCTION update_listing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_listing_updated_at
    BEFORE UPDATE ON public.listings
    FOR EACH ROW
    EXECUTE FUNCTION update_listing_updated_at();

-- 2.10 Views for Common Queries
CREATE OR REPLACE VIEW public.active_listings AS
SELECT 
    l.id,
    l.nft_id,
    l.seller_id,
    l.price,
    l.status,
    l.created_at,
    l.kiosk_id,
    l.listing_id,
    n.title,
    n.description,
    n.image_url,
    n.category,
    u.username as seller_username,
    u.wallet_address as seller_wallet
FROM public.listings l
JOIN public.nfts n ON l.nft_id = n.id
JOIN public.users u ON l.seller_id = u.id
WHERE l.status = 'active';

CREATE OR REPLACE VIEW public.marketplace_stats AS
SELECT 
    COUNT(DISTINCT l.id) as total_listings,
    COUNT(DISTINCT l.seller_id) as active_sellers,
    COALESCE(SUM(l.price), 0) as total_volume,
    COALESCE(AVG(l.price), 0) as average_price,
    COUNT(DISTINCT th.id) as total_transactions
FROM public.listings l
LEFT JOIN public.transaction_history th ON l.id = th.listing_id
WHERE l.status = 'active';