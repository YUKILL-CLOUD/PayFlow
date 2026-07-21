import { z } from 'zod'

export const billSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
  amount: z.number().min(0, 'Amount must be positive'),
  is_variable: z.boolean(),
  wallet_id: z.string().min(1, 'Please select a wallet'),
  priority: z.enum(['critical', 'high', 'medium', 'optional'] as const),
  recurrence_type: z.enum([
    'every_payday',
    'weekly',
    'bi_weekly',
    'monthly',
    'quarterly',
    'yearly',
    'one_time'
  ] as const),
  due_day: z.number().min(1, 'Day must be 1 or greater').max(31, 'Day must be 31 or less').optional().nullable(),
  notes: z.string().max(500, 'Notes are too long').optional().nullable(),
})

export type BillInput = z.infer<typeof billSchema>
