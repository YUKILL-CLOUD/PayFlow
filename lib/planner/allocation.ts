import type { PlannerContext, PlannerAllocation } from './types'
import { calculateNextDue, calculatePaydaysRemaining } from './dates'

/**
 * Step 1: Allocation & Target calculation.
 * Computes target amounts for each bill and fund relative to the planned payday.
 */
export function calculateTargets(context: PlannerContext): PlannerAllocation[] {
  const { plannedPayday, profile, funds, bills, overrides, accumulatedAllocations } = context
  const plannedDate = new Date(plannedPayday)
  const allocations: PlannerAllocation[] = []

  // Helper to round to 2 decimals
  const round2 = (num: number) => Math.round(num * 100) / 100

  // 1. Process Bills
  bills.forEach((bill) => {
    const isOverride = overrides?.bills && overrides.bills[bill.id] !== undefined
    const overrideAmount = isOverride ? overrides.bills![bill.id] : null

    let targetAmount = bill.amount
    let paydaysRemaining = 1
    let nextDueStr = plannedPayday

    if (bill.recurrence_type !== 'every_payday') {
      const nextDue = calculateNextDue(plannedDate, bill.recurrence_type, bill.due_day, bill.recurrence_rule)
      nextDueStr = nextDue.toISOString().split('T')[0]
      paydaysRemaining = calculatePaydaysRemaining(plannedDate, nextDue, profile)

      if (!isOverride) {
        const accumulated = accumulatedAllocations?.bills?.[bill.id] ?? 0
        const remainingToSave = Math.max(0, bill.amount - accumulated)
        const paydaysDiv = paydaysRemaining > 0 ? paydaysRemaining : 1
        targetAmount = remainingToSave / paydaysDiv
      }
    }

    if (isOverride) {
      targetAmount = overrideAmount!
    }

    allocations.push({
      id: `bill-${bill.id}`,
      billId: bill.id,
      fundId: null,
      name: bill.name,
      walletId: bill.wallet_id,
      targetAmount: round2(Math.max(0, targetAmount)),
      allocatedAmount: 0,
      priority: bill.priority,
      type: 'bill',
      recurrenceType: bill.recurrence_type,
      dueDay: bill.due_day,
      nextDue: nextDueStr,
      paydaysRemaining,
      sortOrder: bill.sort_order || 0,
    })
  })

  // 2. Process Funds
  funds.forEach((fund) => {
    const isOverride = overrides?.funds && overrides.funds[fund.id] !== undefined
    const overrideAmount = isOverride ? overrides.funds![fund.id] : null

    let targetAmount = 0
    let paydaysRemaining = 1
    let nextDueStr = plannedPayday

    const isDeferred = fund.start_date && new Date(fund.start_date) > plannedDate

    if (isDeferred) {
      targetAmount = 0
    } else if (fund.type === 'goal') {
      // Goal calculation
      if (fund.target_date) {
        const nextDue = new Date(fund.target_date)
        nextDueStr = nextDue.toISOString().split('T')[0]
        paydaysRemaining = calculatePaydaysRemaining(plannedDate, nextDue, profile)

        if (!isOverride) {
          const remainingToSave = Math.max(0, fund.target_amount - fund.current_amount)
          const paydaysDiv = paydaysRemaining > 0 ? paydaysRemaining : 1
          targetAmount = remainingToSave / paydaysDiv
        }
      } else {
        targetAmount = Math.max(0, fund.target_amount - fund.current_amount)
      }
    } else {
      // Recurring calculation
      if (fund.recurrence_type !== 'every_payday') {
        const nextDue = calculateNextDue(plannedDate, fund.recurrence_type, fund.due_day, fund.recurrence_rule)
        nextDueStr = nextDue.toISOString().split('T')[0]
        paydaysRemaining = calculatePaydaysRemaining(plannedDate, nextDue, profile)

        if (!isOverride) {
          const accumulated = accumulatedAllocations?.funds?.[fund.id] ?? 0
          const remainingToSave = Math.max(0, fund.recurring_amount - accumulated)
          const paydaysDiv = paydaysRemaining > 0 ? paydaysRemaining : 1
          targetAmount = remainingToSave / paydaysDiv
        }
      } else {
        targetAmount = fund.recurring_amount
      }
    }

    if (isOverride) {
      targetAmount = overrideAmount!
    }

    allocations.push({
      id: `fund-${fund.id}`,
      billId: null,
      fundId: fund.id,
      name: fund.name,
      walletId: fund.wallet_id,
      targetAmount: round2(Math.max(0, targetAmount)),
      allocatedAmount: 0,
      priority: fund.priority,
      type: 'fund',
      recurrenceType: fund.type === 'goal' ? 'one_time' : fund.recurrence_type,
      dueDay: fund.due_day,
      nextDue: nextDueStr,
      paydaysRemaining,
      sortOrder: fund.sort_order || 0,
    })
  })

  return allocations
}
