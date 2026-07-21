export const WALLET_COLORS = [
  { id: 'slate', label: 'Slate', class: 'bg-slate-500' },
  { id: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { id: 'emerald', label: 'Emerald', class: 'bg-emerald-500' },
  { id: 'violet', label: 'Violet', class: 'bg-violet-500' },
  { id: 'rose', label: 'Rose', class: 'bg-rose-500' },
  { id: 'amber', label: 'Amber', class: 'bg-amber-500' },
  { id: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { id: 'fuchsia', label: 'Fuchsia', class: 'bg-fuchsia-500' },
] as const

export const WALLET_ICONS = [
  { id: 'wallet', label: 'Wallet' },
  { id: 'landmark', label: 'Bank' },
  { id: 'credit-card', label: 'Card' },
  { id: 'banknote', label: 'Cash' },
  { id: 'smartphone', label: 'E-Wallet' },
  { id: 'piggy-bank', label: 'Savings' },
  { id: 'building-2', label: 'Institution' },
  { id: 'coins', label: 'Coins' },
] as const

export const WALLET_TYPES = [
  { id: 'bank', label: 'Bank Account' },
  { id: 'e_wallet', label: 'E-Wallet' },
  { id: 'cash', label: 'Cash' },
  { id: 'other', label: 'Other' },
] as const

export const FUND_TYPES = [
  { id: 'recurring', label: 'Recurring', description: 'Fixed amount allocated every payday' },
  { id: 'goal', label: 'Goal', description: 'Save toward a target amount by a date' },
] as const

export const PRIORITY_LEVELS = [
  { id: 'critical', label: 'Critical', color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-400', bgLight: 'bg-red-500/10' },
  { id: 'high', label: 'High', color: 'bg-amber-500', textColor: 'text-amber-700 dark:text-amber-400', bgLight: 'bg-amber-500/10' },
  { id: 'medium', label: 'Medium', color: 'bg-blue-500', textColor: 'text-blue-700 dark:text-blue-400', bgLight: 'bg-blue-500/10' },
  { id: 'optional', label: 'Optional', color: 'bg-slate-400', textColor: 'text-slate-600 dark:text-slate-400', bgLight: 'bg-slate-400/10' },
] as const

export const FUND_FREQUENCIES = [
  { id: 'every_payday', label: 'Every Payday' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'bi_weekly', label: 'Bi-Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'one_time', label: 'One-Time' },
] as const
