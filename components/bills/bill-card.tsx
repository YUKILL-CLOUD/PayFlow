'use client'

import * as React from 'react'
import { WALLET_COLORS, PRIORITY_LEVELS, BILL_FREQUENCIES } from '@/lib/constants'
import { DynamicIcon } from '@/components/ui/dynamic-icon'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MoreHorizontal, Pencil, Archive, Calendar, RefreshCw, CreditCard, CalendarCheck,
  CheckCircle2, Building2,
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatCurrency, formatDate } from '@/lib/utils'
import { calculateNextDue, calculatePaydaysRemaining } from '@/lib/planner/dates'
import type { Database } from '@/types/database'

type Bill = Database['public']['Tables']['bills']['Row']
type Wallet = Database['public']['Tables']['wallets']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface BillCardProps {
  bill: Bill
  wallet?: Wallet
  profile: Profile
  onEdit: (bill: Bill) => void
  onArchive: (id: string) => void
}

const BILL_TYPE_CONFIG = {
  recurring: { label: 'Recurring', Icon: RefreshCw, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  installment: { label: 'Installment', Icon: CreditCard, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
  one_time: { label: 'One-Time', Icon: CalendarCheck, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
} as const

export function BillCard({ bill, wallet, profile, onEdit, onArchive }: BillCardProps) {
  const priorityObj = PRIORITY_LEVELS.find(p => p.id === bill.priority) || PRIORITY_LEVELS[2]
  const walletColor = WALLET_COLORS.find(c => c.id === wallet?.color) || WALLET_COLORS[0]
  const frequencyObj = BILL_FREQUENCIES.find(f => f.id === bill.recurrence_type)

  const billType = (bill.bill_type ?? 'recurring') as 'recurring' | 'installment' | 'one_time'
  const typeConfig = BILL_TYPE_CONFIG[billType] || BILL_TYPE_CONFIG.recurring

  // Installment progress
  const isInstallment = billType === 'installment'
  const totalInstallments = bill.total_installments ?? 0
  const installmentsPaid = bill.installments_paid ?? 0
  const paymentsRemaining = Math.max(0, totalInstallments - installmentsPaid)
  const installmentProgress = totalInstallments > 0
    ? Math.min(100, Math.round((installmentsPaid / totalInstallments) * 100))
    : 0
  const isFullyPaid = isInstallment && totalInstallments > 0 && installmentsPaid >= totalInstallments

  // Next due date calculation
  const today = new Date()
  let nextDue: Date | null = null
  let paydaysRemaining = 0
  let estimatedAllocation: number | null = null

  if (!isInstallment && bill.recurrence_type !== 'every_payday') {
    nextDue = calculateNextDue(today, bill.recurrence_type, bill.due_day, bill.recurrence_rule)
    paydaysRemaining = calculatePaydaysRemaining(today, nextDue, profile)
    if (paydaysRemaining > 0 && bill.amount > 0) {
      estimatedAllocation = bill.amount / paydaysRemaining
    }
  }

  // One-time due date from rule or first_due_date
  let oneTimeDue: Date | null = null
  if (billType === 'one_time') {
    const targetDateStr = (bill.recurrence_rule as any)?.target_date || bill.first_due_date
    if (targetDateStr) oneTimeDue = new Date(targetDateStr)
  }

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md flex flex-col h-full">
      {/* Priority indicator top strip */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${priorityObj.color}`} />

      <div className="flex justify-between items-start mb-3 mt-1">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Priority badge */}
          <Badge variant="outline" className={`${priorityObj.bgLight} ${priorityObj.textColor} border-0 text-[10px] font-semibold uppercase tracking-wider`}>
            {priorityObj.label}
          </Badge>

          {/* Bill Type badge */}
          <Badge variant="outline" className={`${typeConfig.bg} ${typeConfig.color} border-0 text-[10px] font-medium`}>
            <typeConfig.Icon className="mr-1 h-3 w-3" />
            {typeConfig.label}
          </Badge>

          {/* Frequency badge (recurring & installment) */}
          {billType !== 'one_time' && frequencyObj && (
            <Badge variant="outline" className="text-[10px] font-medium">
              <Calendar className="mr-1 h-3.5 w-3.5" />
              {frequencyObj.label}
            </Badge>
          )}

          {/* Variable badge */}
          {bill.is_variable && billType === 'recurring' && (
            <Badge variant="secondary" className="text-[10px] bg-sky-500/10 text-sky-700 dark:text-sky-400 border-0">
              Variable
            </Badge>
          )}

          {/* Fully Paid badge */}
          {isFullyPaid && (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0 text-[10px]">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Fully Paid
            </Badge>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="-mr-2 text-muted-foreground" />}>
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(bill)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onArchive(bill.id)} variant="destructive">
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 flex flex-col">
        <h3 className="font-semibold text-lg line-clamp-1">{bill.name}</h3>

        {/* Payee */}
        {bill.payee_name && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <Building2 className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{bill.payee_name}</span>
          </div>
        )}

        {/* Wallet link info */}
        {wallet && (
          <div className="flex items-center gap-1.5 mt-1">
            <div className={`h-2.5 w-2.5 rounded-full ${walletColor.class}`} />
            <span className="text-xs text-muted-foreground">{wallet.name}</span>
          </div>
        )}

        {/* Amount */}
        <div className="mt-3">
          <p className="text-2xl font-bold tracking-tight">
            {formatCurrency(isInstallment ? (bill.installment_amount ?? bill.amount) : bill.amount)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isInstallment ? 'Per payment' : bill.is_variable ? 'Estimated baseline amount' : 'Obligation amount'}
          </p>
        </div>

        {/* ─── INSTALLMENT PROGRESS ─── */}
        {isInstallment && totalInstallments > 0 && (
          <div className="mt-4 border-t pt-3 space-y-3">
            {/* Progress stats */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Payments</span>
              <span className="font-semibold">
                {installmentsPaid} / {totalInstallments}
                <span className="text-muted-foreground ml-1 font-normal">({installmentProgress}%)</span>
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isFullyPaid ? 'bg-emerald-500' : 'bg-primary'}`}
                style={{ width: `${installmentProgress}%` }}
              />
            </div>
            {/* Remaining */}
            {!isFullyPaid && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Remaining</span>
                <span className="font-medium">{paymentsRemaining} payment{paymentsRemaining !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        )}

        {/* ─── RECURRING DUE INFO ─── */}
        {nextDue && !isInstallment && (
          <div className="mt-4 space-y-2 border-t pt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Next due date</span>
              <span className="font-medium">{formatDate(nextDue)}</span>
            </div>
            {estimatedAllocation !== null && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Est. per payday</span>
                <span className="font-semibold text-primary">
                  {formatCurrency(estimatedAllocation)}
                  <span className="text-[10px] text-muted-foreground font-normal"> ({paydaysRemaining} left)</span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* ─── ONE-TIME DUE INFO ─── */}
        {billType === 'one_time' && oneTimeDue && (
          <div className="mt-4 space-y-2 border-t pt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Due date</span>
              <span className="font-medium">{formatDate(oneTimeDue)}</span>
            </div>
          </div>
        )}

        {bill.notes && (
          <p className="text-xs text-muted-foreground mt-3 line-clamp-2 italic">
            {bill.notes}
          </p>
        )}
      </div>
    </div>
  )
}
