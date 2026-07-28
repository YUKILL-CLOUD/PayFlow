-- ============================================================
-- Financial OS v2 — Reserved Wallet Allocations Engine
-- Migration: 0009_reserved_wallet_allocations.sql
-- ============================================================

-- 1. Add current_balance column to wallets
ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS current_balance NUMERIC(12,2) NOT NULL DEFAULT 0;

-- 2. Create reservation_entry_type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservation_entry_type') THEN
    CREATE TYPE reservation_entry_type AS ENUM (
      'payday_allocation', -- Added when a payday plan is locked
      'manual_adjustment', -- User manually adjusted reserved amount with reason
      'disbursement',      -- Bill paid out or goal spent from wallet (-amount)
      'reversal'           -- Payday discarded or un-locked (-amount)
    );
  END IF;
END $$;

-- 3. Create Wallet Reservation Ledger Table
CREATE TABLE IF NOT EXISTS wallet_reservation_entries (
  id           UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID                   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id    UUID                   NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  source_type  TEXT                   NOT NULL CHECK (source_type IN ('bill', 'goal')),
  source_id    UUID                   NOT NULL,
  cycle_start  DATE                   NOT NULL,
  cycle_end    DATE                   NOT NULL,
  amount       NUMERIC(12,2)          NOT NULL, -- positive for additions, negative for releases/disbursements
  entry_type   reservation_entry_type NOT NULL DEFAULT 'payday_allocation',
  reason       TEXT,                  -- 'paid_early', 'cash_deposit', 'correction', 'other'
  notes        TEXT,
  created_at   TIMESTAMPTZ            NOT NULL DEFAULT NOW()
);

-- 4. Create Indexes for fast cycle queries
CREATE INDEX IF NOT EXISTS idx_res_entries_user_source ON wallet_reservation_entries(user_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_res_entries_wallet      ON wallet_reservation_entries(user_id, wallet_id);
CREATE INDEX IF NOT EXISTS idx_res_entries_cycle       ON wallet_reservation_entries(user_id, cycle_start, cycle_end);

-- 5. Enable RLS
ALTER TABLE wallet_reservation_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'wallet_reservation_entries' AND policyname = 'res_entries_own'
  ) THEN
    CREATE POLICY "res_entries_own" ON wallet_reservation_entries
      FOR ALL USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
