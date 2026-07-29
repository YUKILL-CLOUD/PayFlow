-- ============================================================
-- Financial OS — Allow due_day = 0 for End of Month
-- Migration: 0010_allow_due_day_zero.sql
-- ============================================================

-- 1. Update check constraint on bills table to allow due_day = 0 (0 represents End of Month)
ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_due_day_check;
ALTER TABLE bills ADD CONSTRAINT bills_due_day_check CHECK (due_day BETWEEN 0 AND 31);

-- 2. Update check constraint on funds table if present
ALTER TABLE funds DROP CONSTRAINT IF EXISTS funds_due_day_check;
ALTER TABLE funds ADD CONSTRAINT funds_due_day_check CHECK (due_day BETWEEN 0 AND 31);
