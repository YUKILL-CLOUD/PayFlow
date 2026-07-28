-- Financial OS — Installment Bills Expansion
-- Adds bill_type discriminator and installment tracking columns

-- 1. Add bill type discriminator
ALTER TABLE bills
  ADD COLUMN bill_type TEXT NOT NULL DEFAULT 'recurring'
  CHECK (bill_type IN ('recurring', 'installment', 'one_time'));

-- 2. Installment tracking columns
ALTER TABLE bills ADD COLUMN total_installments    INTEGER;
ALTER TABLE bills ADD COLUMN installments_paid     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bills ADD COLUMN installment_amount    NUMERIC(12,2);
ALTER TABLE bills ADD COLUMN first_due_date        DATE;

-- 3. Future-proofing columns (light implementation, full UI later)
ALTER TABLE bills ADD COLUMN payee_name            TEXT;
ALTER TABLE bills ADD COLUMN status                TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'paused', 'completed', 'archived'));

-- 4. Migrate existing one_time recurrence bills to bill_type = 'one_time'
--    These used recurrence_rule.target_date and recurrence_type = 'one_time'
UPDATE bills SET bill_type = 'one_time' WHERE recurrence_type = 'one_time';

-- 5. Index for planner filtering (active installment/one_time bills)
CREATE INDEX idx_bills_type_active ON bills(user_id, bill_type, is_active);
