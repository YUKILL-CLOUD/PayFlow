import { calculateNextDue, calculatePaydaysRemaining, generatePaydaysInRange } from './dates'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Database } from '@/types/database'

type Bill = Database['public']['Tables']['bills']['Row']
type Fund = Database['public']['Tables']['funds']['Row']
type Payday = Database['public']['Tables']['paydays']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

export interface CalendarEvent {
  id: string
  date: string // YYYY-MM-DD
  title: string
  type: 'bill' | 'goal_fund' | 'recurring_fund' | 'payday'
  amount: number
  status?: 'scheduled' | 'draft' | 'planned' | 'active' | 'completed'
  priority?: string
  walletId?: string
  rawItem?: any
  details?: {
    paydaysRemaining?: number
    estimatedPerPayday?: number
    currentAmount?: number
    targetAmount?: number
    progressPercent?: number
    remainingToSave?: number
    recurrenceType?: string
    salary?: number
    allocatedAmount?: number
    surplus?: number
  }
}

/**
 * Calculates the start and end dates for a 35 or 42 day month grid view.
 */
export function getCalendarGridRange(year: number, month: number): { gridStart: Date; gridEnd: Date } {
  // First day of target month (month is 0-indexed)
  const firstOfMonth = new Date(Date.UTC(year, month, 1))
  const dayOfWeek = firstOfMonth.getUTCDay() // 0 = Sunday, 1 = Monday...

  // Calculate leading days to fill the first week (starting Sunday)
  const gridStart = new Date(firstOfMonth)
  gridStart.setUTCDate(gridStart.getUTCDate() - dayOfWeek)

  // 42 days grid (6 weeks) to cover any month layout
  const gridEnd = new Date(gridStart)
  gridEnd.setUTCDate(gridEnd.getUTCDate() + 41)

  return { gridStart, gridEnd }
}

/**
 * Normalizes all bills, funds, and paydays into a unified CalendarEvent model across a date range.
 * Consumes the exact same date engine helpers as the Planner to maintain 100% consistency.
 */
export function generateCalendarEvents(
  gridStart: Date,
  gridEnd: Date,
  profile: Profile,
  bills: Bill[],
  funds: Fund[],
  paydays: Payday[],
  referenceDate: string = todayStr()
): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const gridStartStr = gridStart.toISOString().split('T')[0]
  const gridEndStr = gridEnd.toISOString().split('T')[0]

  // Map existing paydays by YYYY-MM-DD
  const paydayByDateMap = new Map<string, Payday>()
  paydays.forEach(p => paydayByDateMap.set(p.payday_date, p))

  // 1. Generate Payday Events (both scheduled and existing DB records)
  const scheduledPaydayDates = generatePaydaysInRange(gridStart, gridEnd, profile)

  // Track dates where paydays exist
  const processedPaydayDates = new Set<string>()

  // A. Process DB Paydays (Draft, Planned, Active, Completed)
  paydays.forEach(p => {
    if (p.payday_date >= gridStartStr && p.payday_date <= gridEndStr) {
      processedPaydayDates.add(p.payday_date)
      const snap = p.planner_snapshot as any

      events.push({
        id: `payday-db-${p.id}`,
        date: p.payday_date,
        title: `Payday (${p.status})`,
        type: 'payday',
        amount: p.salary,
        status: p.status as any,
        details: {
          salary: p.salary,
          allocatedAmount: snap?.totalAllocated || 0,
          surplus: snap?.remainingBalance || 0
        },
        rawItem: p
      })
    }
  })

  // B. Process Scheduled Future Paydays (not yet created in DB)
  scheduledPaydayDates.forEach(d => {
    const dStr = d.toISOString().split('T')[0]
    if (!processedPaydayDates.has(dStr)) {
      events.push({
        id: `payday-sched-${dStr}`,
        date: dStr,
        title: 'Scheduled Payday',
        type: 'payday',
        amount: 0,
        status: 'scheduled',
        details: {
          salary: 0
        }
      })
    }
  })

  // 2. Generate Bill Due Date Events across grid
  bills.forEach(bill => {
    if (!bill.is_active) return

    // Generate occurrences across the grid window
    let runnerDate = new Date(gridStart)
    while (runnerDate <= gridEnd) {
      const runnerStr = runnerDate.toISOString().split('T')[0]
      const nextDue = calculateNextDue(runnerStr, bill.recurrence_type, bill.due_day, bill.recurrence_rule)
      const nextDueStr = nextDue.toISOString().split('T')[0]

      if (nextDue >= gridStart && nextDue <= gridEnd) {
        // Avoid duplicate additions for the same bill occurrence
        const exists = events.some(e => e.id === `bill-${bill.id}-${nextDueStr}`)
        if (!exists) {
          // ALWAYS calculate paydaysRemaining from referenceDate (today/planned payday) to match Planner & Dashboard
          const paydaysRemaining = calculatePaydaysRemaining(referenceDate, nextDue, profile)
          const paydaysDiv = paydaysRemaining > 0 ? paydaysRemaining : 1
          const estimatedPerPayday = Math.round((bill.amount / paydaysDiv) * 100) / 100

          events.push({
            id: `bill-${bill.id}-${nextDueStr}`,
            date: nextDueStr,
            title: bill.name,
            type: 'bill',
            amount: bill.amount,
            priority: bill.priority,
            walletId: bill.wallet_id,
            details: {
              paydaysRemaining,
              estimatedPerPayday,
              recurrenceType: bill.recurrence_type
            },
            rawItem: bill
          })
        }
      }

      // Step forward
      runnerDate.setUTCDate(runnerDate.getUTCDate() + (bill.recurrence_type === 'weekly' ? 7 : 14))
      if (bill.recurrence_type === 'monthly' || bill.recurrence_type === 'quarterly' || bill.recurrence_type === 'yearly' || bill.recurrence_type === 'every_payday' || bill.recurrence_type === 'one_time') {
        break
      }
    }
  })

  // 3. Generate Fund Events (Goal Funds & Recurring Funds)
  funds.forEach(fund => {
    if (!fund.is_active) return

    if (fund.type === 'goal') {
      if (fund.target_date && fund.target_date >= gridStartStr && fund.target_date <= gridEndStr) {
        const remainingToSave = Math.max(0, fund.target_amount - fund.current_amount)
        const progressPercent = fund.target_amount > 0
          ? Math.min(100, Math.round((fund.current_amount / fund.target_amount) * 100))
          : 0

        const paydaysRemaining = calculatePaydaysRemaining(referenceDate, new Date(fund.target_date), profile)
        const paydaysDiv = paydaysRemaining > 0 ? paydaysRemaining : 1
        const estimatedPerPayday = Math.round((remainingToSave / paydaysDiv) * 100) / 100

        events.push({
          id: `fund-goal-${fund.id}`,
          date: fund.target_date,
          title: fund.name,
          type: 'goal_fund',
          amount: fund.target_amount,
          priority: fund.priority,
          walletId: fund.wallet_id,
          details: {
            currentAmount: fund.current_amount,
            targetAmount: fund.target_amount,
            progressPercent,
            remainingToSave,
            paydaysRemaining,
            estimatedPerPayday
          },
          rawItem: fund
        })
      }
    } else {
      // Recurring Fund
      if (fund.recurrence_type !== 'every_payday') {
        const nextDue = calculateNextDue(gridStartStr, fund.recurrence_type, fund.due_day, fund.recurrence_rule)
        const nextDueStr = nextDue.toISOString().split('T')[0]

        if (nextDue >= gridStart && nextDue <= gridEnd) {
          events.push({
            id: `fund-rec-${fund.id}-${nextDueStr}`,
            date: nextDueStr,
            title: fund.name,
            type: 'recurring_fund',
            amount: fund.recurring_amount,
            priority: fund.priority,
            walletId: fund.wallet_id,
            details: {
              recurrenceType: fund.recurrence_type
            },
            rawItem: fund
          })
        }
      }
    }
  })

  return events
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}
