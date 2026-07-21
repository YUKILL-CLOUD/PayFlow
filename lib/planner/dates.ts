import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

/**
 * Parses any date/string input into a safe UTC Date object.
 */
function toUTCDate(dateInput: Date | string): Date {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/**
 * Calculates the next due date for a recurrence pattern, relative to a planned payday date.
 * Returns a UTC Date object.
 */
export function calculateNextDue(
  plannedPayday: Date | string,
  recurrenceType: string,
  dueDay: number | null,
  rule: any = null
): Date {
  const planned = toUTCDate(plannedPayday)
  const plannedYear = planned.getUTCFullYear()
  const plannedMonth = planned.getUTCMonth()

  switch (recurrenceType) {
    case 'every_payday':
      return planned

    case 'weekly': {
      const targetDay = dueDay ?? 5 // default Friday (5)
      const currentDay = planned.getUTCDay()
      let daysUntil = targetDay - currentDay
      if (daysUntil < 0) {
        daysUntil += 7
      }
      const nextDue = new Date(planned)
      nextDue.setUTCDate(planned.getUTCDate() + daysUntil)
      return nextDue
    }

    case 'bi_weekly': {
      const anchor = rule?.anchor_date ? toUTCDate(rule.anchor_date) : planned
      const diffMs = Math.abs(planned.getTime() - anchor.getTime())
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      
      const remainder = diffDays % 14
      const daysToNext = remainder === 0 ? 0 : 14 - remainder
      
      const nextDue = new Date(planned)
      nextDue.setUTCDate(planned.getUTCDate() + daysToNext)
      return nextDue
    }

    case 'monthly': {
      const targetDay = dueDay ?? 1
      let nextDue = new Date(Date.UTC(plannedYear, plannedMonth, targetDay))
      
      // If the target due day has already passed in the planned payday's month,
      // roll to the next month
      if (planned.getUTCDate() > targetDay) {
        nextDue = new Date(Date.UTC(plannedYear, plannedMonth + 1, targetDay))
      }
      return nextDue
    }

    case 'quarterly': {
      const targetDay = dueDay ?? 1
      const quarterMonth = Math.floor(plannedMonth / 3) * 3
      let nextDue = new Date(Date.UTC(plannedYear, quarterMonth + 2, targetDay))
      
      if (planned > nextDue) {
        nextDue = new Date(Date.UTC(plannedYear, quarterMonth + 5, targetDay))
      }
      return nextDue
    }

    case 'yearly': {
      const targetMonth = rule?.by_month ?? 12
      const targetDay = dueDay ?? 25
      
      let nextDue = new Date(Date.UTC(plannedYear, targetMonth - 1, targetDay))
      if (planned > nextDue) {
        nextDue = new Date(Date.UTC(plannedYear + 1, targetMonth - 1, targetDay))
      }
      return nextDue
    }

    case 'one_time':
    default:
      return rule?.target_date ? toUTCDate(rule.target_date) : planned
  }
}

/**
 * Calculates the previous due date for a recurrence pattern, relative to a planned payday date.
 * Returns a UTC Date object.
 */
export function calculatePreviousDue(
  plannedPayday: Date | string,
  recurrenceType: string,
  dueDay: number | null,
  rule: any = null
): Date {
  const nextDue = calculateNextDue(plannedPayday, recurrenceType, dueDay, rule)
  const prevDue = new Date(nextDue)
  
  switch (recurrenceType) {
    case 'every_payday':
      prevDue.setUTCDate(prevDue.getUTCDate() - 1)
      return prevDue
      
    case 'weekly':
      prevDue.setUTCDate(prevDue.getUTCDate() - 7)
      return prevDue
      
    case 'bi_weekly':
      prevDue.setUTCDate(prevDue.getUTCDate() - 14)
      return prevDue
      
    case 'monthly':
      prevDue.setUTCMonth(prevDue.getUTCMonth() - 1)
      return prevDue
      
    case 'quarterly':
      prevDue.setUTCMonth(prevDue.getUTCMonth() - 3)
      return prevDue
      
    case 'yearly':
      prevDue.setUTCFullYear(prevDue.getUTCFullYear() - 1)
      return prevDue
      
    case 'one_time':
    default:
      return new Date(0) // Epoch start
  }
}

/**
 * Generates paydays in a date range based on a user profile schedule.
 * Generates and returns UTC Date objects.
 */
export function generatePaydaysInRange(start: Date, end: Date, profile: Profile): Date[] {
  const paydays: Date[] = []
  const current = toUTCDate(start)
  const endDate = toUTCDate(end)

  if (profile.payday_schedule === 'semi_monthly') {
    const dates = Array.isArray(profile.payday_dates) 
      ? (profile.payday_dates as number[]) 
      : [15, 30]

    while (current <= endDate) {
      const year = current.getUTCFullYear()
      const month = current.getUTCMonth()
      
      dates.forEach(d => {
        const paydayDate = new Date(Date.UTC(year, month, d))
        if (paydayDate >= start && paydayDate <= end) {
          paydays.push(paydayDate)
        }
      })

      current.setUTCMonth(current.getUTCMonth() + 1)
      current.setUTCDate(1)
    }
  } else if (profile.payday_schedule === 'weekly' || profile.payday_schedule === 'bi_weekly') {
    const anchor = profile.payday_start_date ? toUTCDate(profile.payday_start_date) : toUTCDate(start)
    const stepDays = profile.payday_schedule === 'weekly' ? 7 : 14
    
    const diffMs = start.getTime() - anchor.getTime()
    const stepsNeeded = Math.ceil(diffMs / (stepDays * 24 * 60 * 60 * 1000))
    
    const runner = new Date(anchor)
    runner.setUTCDate(anchor.getUTCDate() + (stepsNeeded * stepDays))

    while (runner <= endDate) {
      if (runner >= start) {
        paydays.push(new Date(runner))
      }
      runner.setUTCDate(runner.getUTCDate() + stepDays)
    }
  } else if (profile.payday_schedule === 'monthly') {
    const targetDay = Array.isArray(profile.payday_dates)
      ? (profile.payday_dates as number[])[0]
      : 30

    while (current <= endDate) {
      const paydayDate = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), targetDay))
      if (paydayDate >= start && paydayDate <= end) {
        paydays.push(paydayDate)
      }
      current.setUTCMonth(current.getUTCMonth() + 1)
      current.setUTCDate(1)
    }
  }

  return paydays
    .sort((a, b) => a.getTime() - b.getTime())
    .filter((d, i, arr) => i === 0 || d.getTime() !== arr[i - 1].getTime())
}

/**
 * Counts how many scheduled paydays exist on or after the planned payday
 * and on or before the due date.
 */
export function calculatePaydaysRemaining(
  plannedPayday: Date | string,
  due: Date | string,
  profile: Profile
): number {
  const p = toUTCDate(plannedPayday)
  const d = toUTCDate(due)
  
  if (p > d) return 0

  const paydays = generatePaydaysInRange(p, d, profile)
  return paydays.length
}
