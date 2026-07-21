-- ============================================================
-- Financial OS — Enhanced Recurring Funds
-- Migration: 0004_enhanced_recurring_funds.sql
-- Adds recurrence_type, due_day, and recurrence_rule to funds.
-- ============================================================

-- 1. Add new columns
ALTER TABLE funds
ADD COLUMN IF NOT EXISTS recurrence_type TEXT NOT NULL DEFAULT 'every_payday',
ADD COLUMN IF NOT EXISTS due_day INTEGER,
ADD COLUMN IF NOT EXISTS recurrence_rule JSONB;

-- 2. Migrate existing frequency data to recurrence_type
UPDATE funds SET recurrence_type = 'weekly' WHERE frequency = 'weekly';
UPDATE funds SET recurrence_type = 'bi_weekly' WHERE frequency = 'bi_weekly';
UPDATE funds SET recurrence_type = 'monthly' WHERE frequency = 'monthly';
UPDATE funds SET recurrence_type = 'quarterly' WHERE frequency = 'quarterly';
UPDATE funds SET recurrence_type = 'yearly' WHERE frequency = 'annually';
UPDATE funds SET recurrence_type = 'one_time' WHERE frequency = 'one_time';

-- 3. Drop the old frequency column
ALTER TABLE funds DROP COLUMN IF EXISTS frequency;
