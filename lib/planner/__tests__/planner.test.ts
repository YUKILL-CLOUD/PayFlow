import { test, describe } from 'node:test'
import assert from 'node:assert'
import { planPayday } from '../engine'
import { calculateNextDue, calculatePreviousDue, calculatePaydaysRemaining } from '../dates'
import type { PlannerContext } from '../types'

// Mock profiles, wallets, bills, and funds
const mockProfile = {
  id: 'user-1',
  display_name: 'Test User',
  currency: 'PHP',
  payday_schedule: 'semi_monthly', // Paydays on 15th and 30th
  payday_dates: [15, 30],
  payday_start_date: null,
  created_at: '',
  updated_at: ''
}

const mockWallets = [
  { id: 'wallet-main', name: 'Main Wallet', color: 'blue', icon: 'wallet', sort_order: 1, is_active: true },
  { id: 'wallet-savings', name: 'Savings Wallet', color: 'emerald', icon: 'piggy-bank', sort_order: 2, is_active: true }
]

// Weekly profile: paydays every 7 days anchored from July 7 (a Tuesday)
const mockWeeklyProfile = {
  id: 'user-2',
  display_name: 'Weekly User',
  currency: 'PHP',
  payday_schedule: 'weekly',
  payday_dates: null,
  payday_start_date: '2026-07-07', // Anchor Tuesday
  created_at: '',
  updated_at: ''
}

describe('Dates and Recurrence calculations', () => {
  test('calculateNextDue: monthly recurrence due day logic', () => {
    const planned = '2026-07-10'
    const dueDay = 13 // 13th of each month

    const nextDueBefore = calculateNextDue(planned, 'monthly', dueDay)
    assert.strictEqual(nextDueBefore.toISOString().split('T')[0], '2026-07-13')

    const nextDueOn = calculateNextDue('2026-07-13', 'monthly', dueDay)
    assert.strictEqual(nextDueOn.toISOString().split('T')[0], '2026-07-13')

    const nextDueAfter = calculateNextDue('2026-07-15', 'monthly', dueDay)
    assert.strictEqual(nextDueAfter.toISOString().split('T')[0], '2026-08-13')
  })

  test('calculatePreviousDue: monthly cycle previous boundary', () => {
    const planned = '2026-07-15'
    const dueDay = 13
    
    // Relative to July 15 (next due is Aug 13): previous due is July 13
    const prevDue = calculatePreviousDue(planned, 'monthly', dueDay)
    assert.strictEqual(prevDue.toISOString().split('T')[0], '2026-07-13')

    // Relative to July 10 (next due is July 13): previous due is June 13
    const prevDueBefore = calculatePreviousDue('2026-07-10', 'monthly', dueDay)
    assert.strictEqual(prevDueBefore.toISOString().split('T')[0], '2026-06-13')
  })

  test('calculatePaydaysRemaining: weekly schedule vs semi_monthly schedule', () => {
    const planned = '2026-07-15'
    const due = '2026-08-13' // Next monthly due

    const remainingSemi = calculatePaydaysRemaining(planned, due, mockProfile as any)
    assert.strictEqual(remainingSemi, 2)
  })
})

describe('Planner Engine Allocation Waterfalls', () => {
  test('Standard Allocation split across paydays', () => {
    const context: PlannerContext = {
      plannedPayday: '2026-07-15',
      salary: 10000,
      profile: mockProfile,
      wallets: mockWallets,
      bills: [
        {
          id: 'bill-motor',
          name: 'Motor Bill',
          amount: 3397,
          is_variable: false,
          wallet_id: 'wallet-main',
          priority: 'critical',
          recurrence_type: 'monthly',
          due_day: 13,
          is_active: true,
          sort_order: 1
        }
      ],
      funds: [
        {
          id: 'fund-mama',
          name: 'Mama Allowance',
          type: 'recurring',
          recurring_amount: 1000,
          target_amount: 0,
          current_amount: 0,
          wallet_id: 'wallet-main',
          priority: 'high',
          recurrence_type: 'every_payday',
          due_day: null,
          is_active: true,
          sort_order: 1
        }
      ]
    }

    const result = planPayday(context)

    assert.strictEqual(result.totalTarget, 2698.5)
    assert.strictEqual(result.totalAllocated, 2698.5)
    assert.strictEqual(result.remainingBalance, 7301.5)

    const motorAlloc = result.allocations.find(a => a.billId === 'bill-motor')
    const mamaAlloc = result.allocations.find(a => a.fundId === 'fund-mama')

    assert.ok(motorAlloc)
    assert.strictEqual(motorAlloc.targetAmount, 1698.5)
    assert.strictEqual(motorAlloc.allocatedAmount, 1698.5)

    assert.ok(mamaAlloc)
    assert.strictEqual(mamaAlloc.targetAmount, 1000)
    assert.strictEqual(mamaAlloc.allocatedAmount, 1000)
  })

  test('Shortage Scenario: Critical & High are allocated, Optional is dropped', () => {
    const context: PlannerContext = {
      plannedPayday: '2026-07-15',
      salary: 2000,
      profile: mockProfile,
      wallets: mockWallets,
      bills: [
        {
          id: 'bill-rent',
          name: 'Rent',
          amount: 1500,
          is_variable: false,
          wallet_id: 'wallet-main',
          priority: 'critical',
          recurrence_type: 'every_payday',
          due_day: null,
          is_active: true,
          sort_order: 1
        }
      ],
      funds: [
        {
          id: 'fund-savings',
          name: 'Savings Goal',
          type: 'recurring',
          recurring_amount: 1000,
          target_amount: 0,
          current_amount: 0,
          wallet_id: 'wallet-savings',
          priority: 'optional',
          recurrence_type: 'every_payday',
          due_day: null,
          is_active: true,
          sort_order: 1
        }
      ]
    }

    const result = planPayday(context)

    assert.strictEqual(result.totalTarget, 2500)
    assert.strictEqual(result.totalAllocated, 2000)
    assert.strictEqual(result.remainingBalance, 0)

    const rentAlloc = result.allocations.find(a => a.billId === 'bill-rent')
    const savingsAlloc = result.allocations.find(a => a.fundId === 'fund-savings')

    assert.ok(rentAlloc)
    assert.strictEqual(rentAlloc.allocatedAmount, 1500)

    assert.ok(savingsAlloc)
    assert.strictEqual(savingsAlloc.allocatedAmount, 500)

    assert.strictEqual(result.warnings.length, 1)
    assert.strictEqual(result.warnings[0].code, 'INSUFFICIENT_FUNDS')
  })

  test('Deferred Start Goals: starts in future relative to planned payday', () => {
    const context: PlannerContext = {
      plannedPayday: '2026-07-15',
      salary: 5000,
      profile: mockProfile,
      wallets: mockWallets,
      bills: [],
      funds: [
        {
          id: 'fund-future',
          name: 'Future Trip',
          type: 'goal',
          recurring_amount: 0,
          target_amount: 5000,
          current_amount: 0,
          target_date: '2026-12-30',
          start_date: '2026-09-01',
          wallet_id: 'wallet-savings',
          priority: 'high',
          recurrence_type: 'every_payday',
          due_day: null,
          is_active: true,
          sort_order: 1
        }
      ]
    }

    const result = planPayday(context)
    const tripAlloc = result.allocations.find(a => a.fundId === 'fund-future')

    assert.ok(tripAlloc)
    assert.strictEqual(tripAlloc.targetAmount, 0)
  })

  test('Variable overrides bypass baseline defaults', () => {
    const context: PlannerContext = {
      plannedPayday: '2026-07-15',
      salary: 5000,
      profile: mockProfile,
      wallets: mockWallets,
      bills: [
        {
          id: 'bill-electric',
          name: 'Electric Bill',
          amount: 1500,
          is_variable: true,
          wallet_id: 'wallet-main',
          priority: 'high',
          recurrence_type: 'every_payday',
          due_day: null,
          is_active: true,
          sort_order: 1
        }
      ],
      funds: [],
      overrides: {
        bills: {
          'bill-electric': 2300
        }
      }
    }

    const result = planPayday(context)
    const electricAlloc = result.allocations.find(a => a.billId === 'bill-electric')

    assert.ok(electricAlloc)
    assert.strictEqual(electricAlloc.targetAmount, 2300)
  })

  test('Planner snapshots store versioning and structured metadata', () => {
    const context: PlannerContext = {
      plannedPayday: '2026-07-15',
      salary: 3000,
      profile: mockProfile,
      wallets: mockWallets,
      bills: [],
      funds: [
        {
          id: 'fund-goal',
          name: 'Travel Fund',
          type: 'goal',
          recurring_amount: 0,
          target_amount: 5000,
          current_amount: 1000,
          target_date: '2026-10-15',
          wallet_id: 'wallet-savings',
          priority: 'medium',
          recurrence_type: 'one_time',
          due_day: null,
          is_active: true,
          sort_order: 1
        }
      ]
    }

    const result = planPayday(context)
    
    assert.strictEqual(result.planner_version, 1)
    assert.ok(result.computedAt)
    assert.ok(typeof result.computedAt === 'string')
    assert.strictEqual(result.totalTarget, 571.43)
    assert.strictEqual(result.totalAllocated, 571.43)
    assert.strictEqual(result.remainingBalance, 2428.57)
  })

  test('Incremental splits subtract accumulated allocations in current cycle', () => {
    const context: PlannerContext = {
      // Planned date July 30 (next due is August 15 -> remaining paydays: July 30 and August 15 -> 2 left)
      plannedPayday: '2026-07-30',
      salary: 10000,
      profile: mockProfile,
      wallets: mockWallets,
      bills: [
        {
          id: 'bill-shopee',
          name: 'Shopee Bill',
          amount: 1000, // Total cycle target
          is_variable: false,
          wallet_id: 'wallet-main',
          priority: 'high',
          recurrence_type: 'monthly',
          due_day: 15,
          is_active: true,
          sort_order: 1
        }
      ],
      funds: [],
      accumulatedAllocations: {
        bills: {
          'bill-shopee': 333.33 // Already planned/allocated on previous payday (July 21)
        }
      }
    }

    const result = planPayday(context)
    const shopeeAlloc = result.allocations.find(a => a.billId === 'bill-shopee')

    // Remaining: 1000 - 333.33 = 666.67
    // Remaining paydays: 2
    // Target: 666.67 / 2 = 333.335 -> rounds to 333.34
    assert.ok(shopeeAlloc)
    assert.strictEqual(shopeeAlloc.targetAmount, 333.34)
    assert.strictEqual(shopeeAlloc.allocatedAmount, 333.34)
  })

  test('Weekly schedule: bill due Aug 5 from Jul 21 payday → 3 paydays remaining', () => {
    // User scenario: weekly paydays anchored July 7 → Jul 7, 14, 21, 28, Aug 4, 11...
    // Planning from July 21 with a bill due August 5:
    // Paydays in range [Jul 21, Aug 5]: Jul 21, Jul 28, Aug 4 → 3 paydays
    const remaining = calculatePaydaysRemaining(
      '2026-07-21',
      '2026-08-05',
      mockWeeklyProfile as any
    )
    assert.strictEqual(remaining, 3)
  })

  test('Weekly schedule: ₱1,000 bill splits evenly across 3 paydays', () => {
    const context: PlannerContext = {
      plannedPayday: '2026-07-21',
      salary: 10000,
      profile: mockWeeklyProfile,
      wallets: mockWallets,
      bills: [
        {
          id: 'bill-shopee-weekly',
          name: 'Shopee',
          amount: 1000,
          is_variable: false,
          wallet_id: 'wallet-main',
          priority: 'high',
          recurrence_type: 'monthly',
          due_day: 5,
          is_active: true,
          sort_order: 1
        }
      ],
      funds: []
    }

    const result = planPayday(context)
    const shopeeAlloc = result.allocations.find(a => a.billId === 'bill-shopee-weekly')

    assert.ok(shopeeAlloc)
    // 1000 / 3 paydays = 333.33
    assert.strictEqual(shopeeAlloc.targetAmount, 333.33)
    assert.strictEqual(shopeeAlloc.allocatedAmount, 333.33)
    assert.strictEqual(shopeeAlloc.paydaysRemaining, 3)
  })

  test('Calendar vs Planner Consistency: generateCalendarEvents matches paydaysRemaining', () => {
    const { getCalendarGridRange, generateCalendarEvents } = require('../calendar')
    const { gridStart, gridEnd } = getCalendarGridRange(2026, 7) // August 2026

    const bills = [
      {
        id: 'shopee-1',
        name: 'Shopee',
        amount: 1000,
        is_variable: false,
        wallet_id: 'wallet-main',
        priority: 'high',
        recurrence_type: 'monthly',
        due_day: 5,
        is_active: true,
        sort_order: 1
      }
    ]

    // Reference date: July 21, 2026 (exact same as planned payday)
    const events = generateCalendarEvents(
      gridStart,
      gridEnd,
      mockWeeklyProfile,
      bills,
      [],
      [],
      '2026-07-21'
    )

    const shopeeEvent = events.find((e: any) => e.type === 'bill' && e.title === 'Shopee')

    assert.ok(shopeeEvent)
    // Must match Planner: 3 paydays remaining!
    assert.strictEqual(shopeeEvent.details.paydaysRemaining, 3)
    assert.strictEqual(shopeeEvent.details.estimatedPerPayday, 333.33)
  })
})
