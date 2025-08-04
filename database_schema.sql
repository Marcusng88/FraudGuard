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