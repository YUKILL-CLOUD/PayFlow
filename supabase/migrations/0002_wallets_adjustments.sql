-- ============================================================
-- Financial OS — Wallets Adjustments
-- Migration: 0002_wallets_adjustments.sql
-- Run this in your Supabase SQL Editor or via Supabase CLI
-- ============================================================

-- 1. Create wallet_type enum
CREATE TYPE wallet_type AS ENUM ('bank', 'e_wallet', 'cash', 'other');

-- 2. Add wallet_type column to wallets
ALTER TABLE wallets
ADD COLUMN type wallet_type NOT NULL DEFAULT 'other';

-- 3. Add unique constraint for active wallets to prevent duplicate names
CREATE UNIQUE INDEX idx_wallets_unique_name
ON wallets (user_id, lower(name))
WHERE is_active = true;
