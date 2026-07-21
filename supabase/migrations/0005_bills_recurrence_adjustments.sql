-- ============================================================
-- Financial OS — Bills Recurrence Adjustments
-- Migration: 0005_bills_recurrence_adjustments.sql
-- Unifies recurrence fields between funds and bills.
-- ============================================================

-- 1. Add new columns
ALTER TABLE bills
ADD COLUMN IF NOT EXISTS recurrence_type TEXT NOT NULL DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS recurrence_rule JSONB;

-- 2. Migrate existing repeat_schedule data to recurrence_type if column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'bills' 
          AND column_name = 'repeat_schedule'
    ) THEN
        UPDATE bills SET recurrence_type = 'weekly' WHERE repeat_schedule = 'weekly';
        UPDATE bills SET recurrence_type = 'bi_weekly' WHERE repeat_schedule = 'bi_weekly';
        UPDATE bills SET recurrence_type = 'monthly' WHERE repeat_schedule = 'monthly';
        UPDATE bills SET recurrence_type = 'quarterly' WHERE repeat_schedule = 'quarterly';
        UPDATE bills SET recurrence_type = 'yearly' WHERE repeat_schedule = 'annually';
        UPDATE bills SET recurrence_type = 'one_time' WHERE repeat_schedule = 'one_time';
    END IF;
END $$;

-- 3. Drop the old repeat_schedule column
ALTER TABLE bills DROP COLUMN IF EXISTS repeat_schedule;
