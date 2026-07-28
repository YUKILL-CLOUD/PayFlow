import { z } from 'zod'

export const ADJUSTMENT_REASONS = [
  { id: 'paid_early', label: 'Paid Early', description: 'Already paid outside of regular planner' },
  { id: 'cash_deposit', label: 'Cash Deposit', description: 'Direct cash or transfer deposited into envelope' },
  { id: 'correction', label: 'Correction', description: 'Adjusting reservation to match physical state' },
  { id: 'other', label: 'Other', description: 'Custom adjustment' },
] as const

export const reservationAdjustmentSchema = z.object({
  wallet_id: z.string().min(1, 'Wallet is required'),
  source_type: z.enum(['bill', 'goal'] as const),
  source_id: z.string().min(1, 'Source obligation is required'),
  new_reserved_amount: z.number().min(0, 'Reserved amount cannot be negative'),
  reason: z.enum(['paid_early', 'cash_deposit', 'correction', 'other'] as const),
  notes: z.string().max(500).optional().nullable(),
  cycle_start: z.string().min(1, 'Cycle start date is required'),
  cycle_end: z.string().min(1, 'Cycle end date is required'),
})

export type ReservationAdjustmentInput = z.infer<typeof reservationAdjustmentSchema>
