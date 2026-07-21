-- ============================================================
-- Financial OS — Payday Timestamps and Execution Order
-- Migration: 0007_payday_timestamps_and_execution_order.sql
-- Adds confirmed_at and completed_at to paydays table,
-- adds execution_order to allocations table,
-- and creates an RPC database transaction function for plan confirmation.
-- ============================================================

-- 1. Add columns to paydays
ALTER TABLE paydays
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 2. Add column to allocations
ALTER TABLE allocations
ADD COLUMN IF NOT EXISTS execution_order INTEGER DEFAULT 0;

-- 3. Create RPC function to wrap plan confirmation in a transaction
CREATE OR REPLACE FUNCTION confirm_payday_plan_rpc(
  p_user_id UUID,
  p_payday_date DATE,
  p_salary NUMERIC,
  p_planner_snapshot JSONB,
  p_allocations JSONB
) RETURNS UUID AS $$
DECLARE
  v_payday_id UUID;
  v_elem JSONB;
BEGIN
  -- Insert payday record
  INSERT INTO paydays (
    user_id, 
    payday_date, 
    salary, 
    status, 
    planner_snapshot, 
    confirmed_at, 
    created_at, 
    updated_at
  )
  VALUES (
    p_user_id, 
    p_payday_date, 
    p_salary, 
    'planned', 
    p_planner_snapshot, 
    NOW(), 
    NOW(), 
    NOW()
  )
  RETURNING id INTO v_payday_id;

  -- Insert allocation records
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_allocations) LOOP
    INSERT INTO allocations (
      user_id,
      payday_id,
      bill_id,
      fund_id,
      wallet_id,
      amount,
      is_completed,
      snapshot_label,
      snapshot_amount,
      execution_order,
      created_at,
      updated_at
    )
    VALUES (
      p_user_id,
      v_payday_id,
      (v_elem->>'bill_id')::UUID,
      (v_elem->>'fund_id')::UUID,
      (v_elem->>'wallet_id')::UUID,
      (v_elem->>'amount')::NUMERIC,
      FALSE,
      v_elem->>'snapshot_label',
      (v_elem->>'snapshot_amount')::NUMERIC,
      (v_elem->>'execution_order')::INTEGER,
      NOW(),
      NOW()
    );
  END LOOP;

  RETURN v_payday_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
