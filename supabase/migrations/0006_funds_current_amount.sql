-- ============================================================
-- Financial OS — Funds Current Amount
-- Migration: 0006_funds_current_amount.sql
-- Adds `current_amount` column to `funds` to track goal progress.
-- ============================================================

ALTER TABLE funds
ADD COLUMN IF NOT EXISTS current_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;
