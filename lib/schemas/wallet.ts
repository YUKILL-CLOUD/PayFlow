import { z } from 'zod'

export const walletSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
  type: z.enum(['bank', 'e_wallet', 'cash', 'other'] as const),
  description: z.string().max(255, 'Description is too long').optional().nullable(),
  color: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  current_balance: z.number().min(0, 'Balance cannot be negative').optional().nullable(),
})

export type WalletInput = z.infer<typeof walletSchema>

export const updateBalanceSchema = z.object({
  wallet_id: z.string().min(1),
  current_balance: z.number().min(0, 'Balance cannot be negative'),
})

export type UpdateBalanceInput = z.infer<typeof updateBalanceSchema>

export const depositWithdrawSchema = z.object({
  wallet_id: z.string().min(1),
  amount: z.number().positive('Amount must be greater than zero'),
  notes: z.string().max(255).optional().nullable(),
})

export type DepositWithdrawInput = z.infer<typeof depositWithdrawSchema>
