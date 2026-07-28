import type { PlannerContext, PlannerAllocation } from './types'
import { calculateNextDue, calculatePaydaysRemaining } from './dates'

/**
 * Step 1: Allocation & Target calculation.
 * Computes target amounts for each bill and fund relative to the planned payday.
 */
export function calculateTargets(context: PlannerContext): PlannerAllocation[] {
  const { plannedPayday, profile, funds, bills, overrides, reservedAmounts } = context
  const plannedDate = new Date(plannedPayday)
  const allocations: PlannerAllocation[] = []

  // Read reserved amounts from context
  const billReservations = reservedAmounts?.bills || {}
  const goalReservations = reservedAmounts?.goals || reservedAmounts?.funds || {}

  // Helper to round to 2 decimals
  const round2 = (num: number) => Math.round(num * 100) / 100

  // 1. Process Bills
  bills.forEach((bill) => {
    // Skip completed installment bills (fully paid)
    if (bill.bill_type === 'installment' &&
        bill.total_installments &&
        (bill.installments_paid ?? 0) >= bill.total_installments) {
      return
    }

    const isOverride = overrides?.bills && overrides.bills[bill.id] !== undefined
    const overrideAmount = isOverride ? overrides.bills![bill.id] : null

    let targetAmount = bill.amount
    let paydaysRemaining = 1
    let nextDueStr = plannedPayday

    if (bill.bill_type === 'one_time') {
      // ── One-Time Bills ──
      // Spread total amount across paydays leading to the due date.
      const targetDateStr = (bill.recurrence_rule as any)?.target_date || bill.first_due_date
      if (targetDateStr) {
        const nextDue = new Date(targetDateStr)
        nextDueStr = nextDue.toISOString().split('T')[0]
        paydaysRemaining = calculatePaydaysRemaining(plannedDate, nextDue, profile)
        if (!isOverride) {
          const paydaysDiv = paydaysRemaining > 0 ? paydaysRemaining : 1
          targetAmount = bill.amount / paydaysDiv
        }
      } else {
        targetAmount = bill.amount
      }
      if (isOverride) targetAmount = overrideAmount!

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
        billType: 'one_time',
        recurrenceType: bill.recurrence_type,
        dueDay: bill.due_day,
        nextDue: nextDueStr,
        paydaysRemaining,
        sortOrder: bill.sort_order || 0,
      })
      return
    }

    // ── Recurring & Installment Bills ──
    // Both use the same funding-cycle algorithm:
    //   cycleTarget = full obligation for this cycle
    //     • Recurring:    bill.amount
    //     • Installment:  bill.installment_amount  ← only distinction
    //   accumulated  = sum of completed allocations since previous due date
    //   remaining    = max(0, cycleTarget - accumulated)
    //   target       = remaining / paydaysRemaining
    //
    // accumulatedAllocations is pre-computed in fetchPlannerContextData using
    // calculatePreviousDue(), so it correctly scopes to the current funding cycle
    // for both recurring and installment bills.

    const cycleTarget = bill.bill_type === 'installment'
      ? (bill.installment_amount ?? bill.amount)
      : bill.amount

    if (bill.recurrence_type !== 'every_payday') {
      const nextDue = calculateNextDue(plannedDate, bill.recurrence_type, bill.due_day, bill.recurrence_rule)
      nextDueStr = nextDue.toISOString().split('T')[0]
      paydaysRemaining = calculatePaydaysRemaining(plannedDate, nextDue, profile)

      if (!isOverride) {
        const reserved = billReservations[bill.id] ?? 0
        const remainingToSave = Math.max(0, cycleTarget - reserved)
        const paydaysDiv = paydaysRemaining > 0 ? paydaysRemaining : 1
        targetAmount = remainingToSave / paydaysDiv
      }
    } else {
      // every_payday: full cycle target each payday (no accumulation)
      targetAmount = cycleTarget
    }

    if (isOverride) targetAmount = overrideAmount!

    const allocationEntry: any = {
      id: `bill-${bill.id}`,
      billId: bill.id,
      fundId: null,
      name: bill.name,
      walletId: bill.wallet_id,
      targetAmount: round2(Math.max(0, targetAmount)),
      allocatedAmount: 0,
      priority: bill.priority,
      type: 'bill',
      billType: bill.bill_type ?? 'recurring',
      recurrenceType: bill.recurrence_type,
      dueDay: bill.due_day,
      nextDue: nextDueStr,
      paydaysRemaining,
      sortOrder: bill.sort_order || 0,
    }

    // Attach installment metadata for planner dashboard display
    if (bill.bill_type === 'installment') {
      const reserved = billReservations[bill.id] ?? 0
      allocationEntry.installmentsTotal = bill.total_installments ?? undefined
      allocationEntry.installmentsPaid = bill.installments_paid ?? 0
      allocationEntry.cycleTarget = cycleTarget
      allocationEntry.cycleAccumulated = reserved
    }

    allocations.push(allocationEntry)
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
          const reserved = goalReservations[fund.id] ?? 0
          const remainingToSave = Math.max(0, fund.recurring_amount - reserved)
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
