import { z } from 'zod'

export const billSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
  wallet_id: z.string().min(1, 'Please select a wallet'),
  priority: z.enum(['critical', 'high', 'medium', 'optional'] as const),
  notes: z.string().max(500, 'Notes are too long').optional().nullable(),
  payee_name: z.string().max(100).optional().nullable(),

  // --- Bill Type discriminator ---
  bill_type: z.enum(['recurring', 'installment', 'one_time'] as const),

  // --- Recurring & Installment fields ---
  amount: z.number().min(0, 'Amount must be positive').optional().nullable(),
  is_variable: z.boolean().optional(),
  recurrence_type: z.enum([
    'every_payday',
    'weekly',
    'bi_weekly',
    'monthly',
    'quarterly',
    'yearly',
    'one_time',
  ] as const).optional(),
  due_day: z.number().min(1).max(31).optional().nullable(),

  // --- Installment-only fields ---
  total_installments: z.number().int().min(1, 'Must have at least 1 payment').optional().nullable(),
  installments_paid: z.number().int().min(0).optional().nullable(),
  installment_amount: z.number().min(0.01, 'Installment amount must be positive').optional().nullable(),
  first_due_date: z.string().optional().nullable(),

  // --- One-time-only fields ---
  // one_time bills use recurrence_rule.target_date, stored via first_due_date
}).superRefine((data, ctx) => {
  if (data.bill_type === 'recurring') {
    if (!data.recurrence_type) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['recurrence_type'], message: 'Schedule is required for recurring bills' })
    }
  }

  if (data.bill_type === 'installment') {
    if (!data.total_installments) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['total_installments'], message: 'Total number of payments is required' })
    }
    if (!data.installment_amount || data.installment_amount <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['installment_amount'], message: 'Payment amount per installment is required' })
    }
    if (!data.recurrence_type) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['recurrence_type'], message: 'Payment schedule is required' })
    }
    if (!data.first_due_date) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['first_due_date'], message: 'First due date is required for installment bills' })
    }
  }

  if (data.bill_type === 'one_time') {
    if (!data.first_due_date) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['first_due_date'], message: 'Due date is required for one-time bills' })
    }
    if (!data.amount || data.amount <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['amount'], message: 'Amount is required for one-time bills' })
    }
  }
})

export type BillInput = z.infer<typeof billSchema>
