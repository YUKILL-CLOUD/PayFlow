import { z } from 'zod'

export const walletSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
  type: z.enum(['bank', 'e_wallet', 'cash', 'other'] as const),
  description: z.string().max(255, 'Description is too long').optional().nullable(),
  color: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
})

export type WalletInput = z.infer<typeof walletSchema>
