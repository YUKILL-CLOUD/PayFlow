-- ============================================================
-- Financial OS — Funds Adjustments
-- Migration: 0003_funds_adjustments.sql
-- Splits the generic `amount` into `recurring_amount` and `target_amount`,
-- adds `start_date` for deferred goals, and prepares `allocation_strategy`.
-- ============================================================

-- 1. Add new columns
ALTER TABLE funds
ADD COLUMN IF NOT EXISTS recurring_amount NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_amount NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS allocation_strategy TEXT NOT NULL DEFAULT 'divide_evenly';

-- 2. Migrate existing data from the generic `amount` column if it still exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'funds' 
          AND column_name = 'amount'
    ) THEN
        UPDATE funds SET recurring_amount = amount WHERE type = 'recurring';
        UPDATE funds SET target_amount = amount WHERE type = 'goal';
    END IF;
END $$;

-- 3. Drop the old generic `amount` column
ALTER TABLE funds DROP COLUMN IF EXISTS amount;
