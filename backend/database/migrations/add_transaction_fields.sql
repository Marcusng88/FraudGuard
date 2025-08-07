-- Migration to add missing fields to transaction_history table
-- This migration adds marketplace_fee, seller_amount, and nft_blockchain_id fields

-- Add new columns to transaction_history table
ALTER TABLE transaction_history 
ADD COLUMN IF NOT EXISTS marketplace_fee NUMERIC;

ALTER TABLE transaction_history 
ADD COLUMN IF NOT EXISTS seller_amount NUMERIC;

ALTER TABLE transaction_history 
ADD COLUMN IF NOT EXISTS nft_blockchain_id TEXT;

-- Update existing records with default values
UPDATE transaction_history 
SET marketplace_fee = 0.0 
WHERE marketplace_fee IS NULL;

UPDATE transaction_history 
SET seller_amount = price 
WHERE seller_amount IS NULL;

-- Create index for performance on blockchain ID lookups
CREATE INDEX IF NOT EXISTS idx_transaction_history_nft_blockchain_id 
ON transaction_history(nft_blockchain_id);

-- Create index for performance on blockchain transaction ID lookups
CREATE INDEX IF NOT EXISTS idx_transaction_history_blockchain_tx_id 
ON transaction_history(blockchain_tx_id);
