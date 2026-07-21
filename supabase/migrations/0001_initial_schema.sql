-- ============================================================
-- Financial OS — Initial Schema
-- Migration: 0001_initial_schema.sql
-- Run this in your Supabase SQL Editor or via Supabase CLI
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE fund_type AS ENUM (
  'recurring', -- Fixed amount allocated every payday cycle
  'goal'       -- Target amount to reach by a specific date
);

CREATE TYPE priority_level AS ENUM (
  'critical', -- Must be covered; triggers critical alert if short
  'high',     -- Strong obligation; reduced last in waterfall
  'medium',   -- Normal obligation
  'optional'  -- Nice-to-have; reduced first in shortage waterfall
);

CREATE TYPE bill_repeat AS ENUM (
  'weekly',
  'bi_weekly',
  'monthly',
  'quarterly',
  'annually',
  'one_time'
);

CREATE TYPE payday_status AS ENUM (
  'draft',     -- Salary entered, plan not yet confirmed
  'planned',   -- Plan reviewed and confirmed, no transfers started
  'active',    -- At least one allocation marked complete
  'completed'  -- All allocations done; snapshot locked
);

CREATE TYPE payday_schedule AS ENUM (
  'weekly',
  'bi_weekly',
  'semi_monthly', -- e.g., 15th and 30th
  'monthly',
  'custom'
);

-- ============================================================
-- PROFILES
-- One row per user, created automatically on registration.
-- Extends auth.users via shared primary key.
-- ============================================================

CREATE TABLE profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT,
  currency        TEXT        NOT NULL DEFAULT 'PHP',
  payday_schedule payday_schedule NOT NULL DEFAULT 'semi_monthly',
  -- For semi_monthly: [15, 30]. For custom: array of day-of-month integers.
  -- For weekly/bi_weekly: not used (handled by payday_start_date).
  payday_dates    JSONB,
  -- For weekly/bi_weekly schedules: the anchor start date
  payday_start_date DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WALLETS
-- User's money containers (banks, e-wallets, cash, etc.)
-- ============================================================

CREATE TABLE wallets (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  color       TEXT,         -- Hex color for UI accent (e.g., '#3b82f6')
  icon        TEXT,         -- Lucide icon name (e.g., 'credit-card')
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallets_user_id     ON wallets(user_id);
CREATE INDEX idx_wallets_user_active ON wallets(user_id, is_active);

-- ============================================================
-- FUNDS
-- Internal savings pools and recurring obligations.
-- type='recurring': allocate a fixed amount every payday cycle.
-- type='goal':      allocate (target - current) / remaining_paydays each cycle.
-- ============================================================

CREATE TABLE funds (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id   UUID           NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  name        TEXT           NOT NULL,
  type        fund_type      NOT NULL DEFAULT 'recurring',
  priority    priority_level NOT NULL DEFAULT 'medium',
  sort_order  INTEGER        NOT NULL DEFAULT 0,
  -- recurring: amount allocated per payday
  -- goal: total target amount to accumulate
  amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  -- goal funds only: when should this be fully funded?
  target_date DATE,
  -- recurring funds: how often does this obligation repeat?
  frequency   bill_repeat    NOT NULL DEFAULT 'monthly',
  is_active   BOOLEAN        NOT NULL DEFAULT TRUE,
  notes       TEXT,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_funds_user_id       ON funds(user_id);
CREATE INDEX idx_funds_wallet_id     ON funds(wallet_id);
CREATE INDEX idx_funds_user_priority ON funds(user_id, priority, sort_order);
CREATE INDEX idx_funds_user_active   ON funds(user_id, is_active);

-- ============================================================
-- BILLS
-- External financial obligations (rent, utilities, subscriptions).
-- Bills ALWAYS have higher priority than funds in the planner.
-- ============================================================

CREATE TABLE bills (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id       UUID           NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  name            TEXT           NOT NULL,
  amount          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  -- If true, user must update the amount each payday cycle.
  -- Default amount is stored here; overrides go in allocation snapshot.
  is_variable     BOOLEAN        NOT NULL DEFAULT FALSE,
  -- Day of month when this bill is due (1–31). NULL for one-time bills.
  due_day         INTEGER        CHECK (due_day BETWEEN 1 AND 31),
  repeat_schedule bill_repeat    NOT NULL DEFAULT 'monthly',
  priority        priority_level NOT NULL DEFAULT 'high',
  sort_order      INTEGER        NOT NULL DEFAULT 0,
  is_active       BOOLEAN        NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bills_user_id       ON bills(user_id);
CREATE INDEX idx_bills_wallet_id     ON bills(wallet_id);
CREATE INDEX idx_bills_user_priority ON bills(user_id, priority, sort_order);
CREATE INDEX idx_bills_user_active   ON bills(user_id, is_active);

-- ============================================================
-- PAYDAYS
-- One record per pay event (regular or one-off bonus).
-- planner_snapshot is immutable once status = 'completed'.
-- ============================================================

CREATE TABLE paydays (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payday_date      DATE          NOT NULL,
  salary           NUMERIC(12, 2) NOT NULL,
  status           payday_status NOT NULL DEFAULT 'draft',
  -- JSONB snapshot of planner output: preserved even if bills/funds change later.
  -- Structure: { allocations[], warnings[], totalAllocated, remaining, computedAt }
  planner_snapshot JSONB,
  notes            TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  -- Prevent duplicate paydays on the same date for the same user
  UNIQUE(user_id, payday_date)
);

CREATE INDEX idx_paydays_user_id   ON paydays(user_id);
CREATE INDEX idx_paydays_date_desc ON paydays(user_id, payday_date DESC);
CREATE INDEX idx_paydays_status    ON paydays(user_id, status);

-- ============================================================
-- ALLOCATIONS
-- Child records of a payday. One row per bill or fund assignment.
-- Polymorphic: either bill_id OR fund_id — never both, never neither.
-- ============================================================

CREATE TABLE allocations (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payday_id       UUID           NOT NULL REFERENCES paydays(id) ON DELETE CASCADE,
  -- Exactly one of these must be set (enforced by CHECK below)
  bill_id         UUID           REFERENCES bills(id) ON DELETE SET NULL,
  fund_id         UUID           REFERENCES funds(id) ON DELETE SET NULL,
  wallet_id       UUID           NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  -- The actual amount allocated for this payday (may differ from bill/fund default)
  amount          NUMERIC(12, 2) NOT NULL,
  is_completed    BOOLEAN        NOT NULL DEFAULT FALSE,
  completed_at    TIMESTAMPTZ,
  -- Snapshot fields: preserve the name and expected amount at time of planning.
  -- These remain correct even if the user later renames or changes the bill/fund.
  snapshot_label  TEXT           NOT NULL,
  snapshot_amount NUMERIC(12, 2) NOT NULL,
  sort_order      INTEGER        NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_allocation_source CHECK (
    (bill_id IS NOT NULL AND fund_id IS NULL) OR
    (bill_id IS NULL AND fund_id IS NOT NULL)
  )
);

CREATE INDEX idx_allocations_payday_id ON allocations(payday_id);
CREATE INDEX idx_allocations_user_id   ON allocations(user_id);
CREATE INDEX idx_allocations_bill_id   ON allocations(bill_id) WHERE bill_id IS NOT NULL;
CREATE INDEX idx_allocations_fund_id   ON allocations(fund_id) WHERE fund_id IS NOT NULL;

-- ============================================================
-- ROW LEVEL SECURITY
-- All tables are secured by user_id = auth.uid()
-- ============================================================

ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE funds       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills       ENABLE ROW LEVEL SECURITY;
ALTER TABLE paydays     ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;

-- Profiles: user sees only their own row (keyed by id, not user_id)
CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Wallets
CREATE POLICY "wallets_own" ON wallets
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Funds
CREATE POLICY "funds_own" ON funds
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Bills
CREATE POLICY "bills_own" ON bills
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Paydays
CREATE POLICY "paydays_own" ON paydays
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allocations
CREATE POLICY "allocations_own" ON allocations
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- UPDATED_AT TRIGGER
-- Automatically updates updated_at on any row change.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON funds
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON paydays
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON allocations
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON USER REGISTRATION
-- Fires after INSERT on auth.users.
-- display_name is taken from the registration metadata if provided.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
