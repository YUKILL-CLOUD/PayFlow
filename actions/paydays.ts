'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { planPayday, type PlannerContext, type PlannerResult } from '@/lib/planner/engine'
import { calculatePreviousDue } from '@/lib/planner/dates'

// Helper to fetch active context components and calculate accumulated allocations
async function fetchPlannerContextData(userId: string, plannedPayday: string, overrides?: any) {
  const supabase = await createClient()

  // Fetch parallel lists
  const [walletsResult, billsResult, fundsResult, profileResult, pastAllocationsResult] = await Promise.all([
    (supabase as any)
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    (supabase as any)
      .from('bills')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    (supabase as any)
      .from('funds')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single(),
    (supabase as any)
      .from('allocations')
      .select('bill_id, fund_id, amount, paydays!inner(payday_date, status)')
      .eq('user_id', userId)
      .eq('paydays.status', 'completed')
  ])

  const bills = billsResult.data || []
  const funds = fundsResult.data || []
  const pastAllocations = pastAllocationsResult.data || []
  const plannedDate = new Date(plannedPayday)

  const accumulatedBills: Record<string, number> = {}
  const accumulatedFunds: Record<string, number> = {}

  // 1. Calculate accumulated amounts for Bills
  bills.forEach((bill: any) => {
    if (bill.recurrence_type === 'every_payday') {
      accumulatedBills[bill.id] = 0
      return
    }

    const prevDue = calculatePreviousDue(plannedDate, bill.recurrence_type, bill.due_day, bill.recurrence_rule)
    
    // Filter past allocations in current cycle
    const sum = pastAllocations
      .filter((alloc: any) => {
        if (alloc.bill_id !== bill.id) return false
        const allocDate = new Date(alloc.paydays.payday_date)
        return allocDate > prevDue && allocDate < plannedDate
      })
      .reduce((s: number, alloc: any) => s + alloc.amount, 0)

    accumulatedBills[bill.id] = sum
  })

  // 2. Calculate accumulated amounts for Funds (only recurring type needs it, goal tracks current_amount)
  funds.forEach((fund: any) => {
    if (fund.type === 'goal' || fund.recurrence_type === 'every_payday') {
      accumulatedFunds[fund.id] = 0
      return
    }

    const prevDue = calculatePreviousDue(plannedDate, fund.recurrence_type, fund.due_day, fund.recurrence_rule)
    
    const sum = pastAllocations
      .filter((alloc: any) => {
        if (alloc.fund_id !== fund.id) return false
        const allocDate = new Date(alloc.paydays.payday_date)
        return allocDate > prevDue && allocDate < plannedDate
      })
      .reduce((s: number, alloc: any) => s + alloc.amount, 0)

    accumulatedFunds[fund.id] = sum
  })

  const context: PlannerContext = {
    plannedPayday,
    salary: 0, // Set by caller
    profile: profileResult.data,
    wallets: walletsResult.data || [],
    funds,
    bills,
    overrides,
    accumulatedAllocations: {
      bills: accumulatedBills,
      funds: accumulatedFunds
    }
  }

  return context
}

export async function generateDraftAction(salary: number, dateStr: string, overrides?: any) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'Unauthorized' }
    }

    const context = await fetchPlannerContextData(user.id, dateStr, overrides)
    context.salary = salary

    const result = planPayday(context)
    return { success: true, draft: result }
  } catch (error) {
    console.error('generateDraftAction error:', error)
    return { success: false, message: 'Failed to generate payday draft' }
  }
}

export async function confirmPaydayPlanAction(salary: number, dateStr: string, overrides?: any) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'Unauthorized' }
    }

    // Check if there is an active payday plan already
    const { data: existingPayday } = await (supabase as any)
      .from('paydays')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['planned', 'active'])
      .maybeSingle()

    if (existingPayday) {
      return { success: false, message: 'There is already an active payday plan in progress.' }
    }

    const context = await fetchPlannerContextData(user.id, dateStr, overrides)
    context.salary = salary

    const result = planPayday(context)

    // Formulate database-ready payload for allocations
    const databaseAllocations = result.allocations.map((alloc, idx) => ({
      bill_id: alloc.billId,
      fund_id: alloc.fundId,
      wallet_id: alloc.walletId,
      amount: alloc.allocatedAmount,
      snapshot_label: alloc.name,
      snapshot_amount: alloc.targetAmount,
      execution_order: idx + 1
    }))

    // Execute via RPC transaction function
    const { data: paydayId, error: rpcError } = await (supabase as any)
      .rpc('confirm_payday_plan_rpc', {
        p_user_id: user.id,
        p_payday_date: dateStr,
        p_salary: salary,
        p_planner_snapshot: result,
        p_allocations: databaseAllocations
      })

    if (rpcError || !paydayId) {
      console.error('RPC error confirming plan:', rpcError)
      return { success: false, message: 'Database transaction error saving plan' }
    }

    revalidatePath('/planner')
    return { success: true, message: 'Plan confirmed successfully', paydayId }
  } catch (error) {
    console.error('confirmPaydayPlanAction error:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}

export async function toggleAllocationCompleteAction(allocationId: string, isCompleted: boolean) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'Unauthorized' }
    }

    // Toggle allocation row
    const { error: updateAllocError, data: allocData } = await (supabase as any)
      .from('allocations')
      .update({
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null
      })
      .eq('id', allocationId)
      .eq('user_id', user.id)
      .select('payday_id')
      .single()

    if (updateAllocError || !allocData) {
      console.error('Error toggling allocation:', updateAllocError)
      return { success: false, message: 'Failed to update allocation state' }
    }

    const paydayId = allocData.payday_id

    // Fetch allocations stats to determine payday status
    const { data: allocations } = await (supabase as any)
      .from('allocations')
      .select('is_completed')
      .eq('payday_id', paydayId)
      .eq('user_id', user.id)

    if (allocations && allocations.length > 0) {
      const completedCount = allocations.filter((a: any) => a.is_completed).length
      const allCompleted = completedCount === allocations.length

      let nextStatus = 'planned'
      let completedAt = null

      if (completedCount > 0) {
        nextStatus = 'active'
      }
      if (allCompleted) {
        nextStatus = 'completed'
        completedAt = new Date().toISOString()
      }

      // Update parent payday status
      await (supabase as any)
        .from('paydays')
        .update({
          status: nextStatus,
          completed_at: completedAt
        })
        .eq('id', paydayId)
        .eq('user_id', user.id)
    }

    revalidatePath('/planner')
    return { success: true }
  } catch (error) {
    console.error('toggleAllocationCompleteAction error:', error)
    return { success: false, message: 'Failed to toggle allocation' }
  }
}

export async function lockPaydayAction(paydayId: string) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'Unauthorized' }
    }

    const { error: lockError } = await (supabase as any)
      .from('paydays')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', paydayId)
      .eq('user_id', user.id)

    if (lockError) {
      console.error('Lock error:', lockError)
      return { success: false, message: 'Failed to finalize payday plan' }
    }

    revalidatePath('/planner')
    return { success: true, message: 'Payday locked and completed successfully' }
  } catch (error) {
    console.error('lockPaydayAction error:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}

export async function discardPaydayAction(paydayId: string) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'Unauthorized' }
    }

    // Deleting the draft/planned payday and its child allocations cascades automatically
    const { error: deleteError } = await (supabase as any)
      .from('paydays')
      .delete()
      .eq('id', paydayId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Discard plan error:', deleteError)
      return { success: false, message: 'Failed to discard plan' }
    }

    revalidatePath('/planner')
    return { success: true, message: 'Plan discarded successfully' }
  } catch (error) {
    console.error('discardPaydayAction error:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}
