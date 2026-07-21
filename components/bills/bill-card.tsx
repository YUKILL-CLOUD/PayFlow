'use client'

import * as React from 'react'
import { WALLET_COLORS, PRIORITY_LEVELS, FUND_FREQUENCIES } from '@/lib/constants'
import { DynamicIcon } from '@/components/ui/dynamic-icon'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, Pencil, Archive, Calendar, HelpCircle } from 'lucide-react'
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

export function BillCard({ bill, wallet, profile, onEdit, onArchive }: BillCardProps) {
  const priorityObj = PRIORITY_LEVELS.find(p => p.id === bill.priority) || PRIORITY_LEVELS[2]
  const walletColor = WALLET_COLORS.find(c => c.id === wallet?.color) || WALLET_COLORS[0]
  const frequencyObj = FUND_FREQUENCIES.find(f => f.id === bill.recurrence_type)

  const today = new Date()
  let nextDue: Date | null = null
  let paydaysRemaining = 0
  let estimatedAllocation: number | null = null

  if (bill.recurrence_type !== 'every_payday') {
    nextDue = calculateNextDue(today, bill.recurrence_type, bill.due_day, bill.recurrence_rule)
    paydaysRemaining = calculatePaydaysRemaining(today, nextDue, profile)
    if (paydaysRemaining > 0 && bill.amount > 0) {
      estimatedAllocation = bill.amount / paydaysRemaining
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md flex flex-col h-full">
      {/* Priority indicator top strip */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${priorityObj.color}`} />

      <div className="flex justify-between items-start mb-3 mt-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`${priorityObj.bgLight} ${priorityObj.textColor} border-0 text-[10px] font-semibold uppercase tracking-wider`}>
            {priorityObj.label}
          </Badge>
          <Badge variant="outline" className="text-[10px] font-medium">
            <Calendar className="mr-1 h-3.5 w-3.5" />
            {frequencyObj?.label || 'Every Payday'}
          </Badge>
          {bill.is_variable && (
            <Badge variant="secondary" className="text-[10px] bg-sky-500/10 text-sky-700 dark:text-sky-400 border-0">
              Variable
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
            {formatCurrency(bill.amount)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {bill.is_variable ? 'Estimated baseline amount' : 'Obligation amount'}
          </p>
        </div>

        {/* Dynamic recurrence due info */}
        {nextDue && (
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

        {bill.notes && (
          <p className="text-xs text-muted-foreground mt-3 line-clamp-2 italic">
            {bill.notes}
          </p>
        )}
      </div>
    </div>
  )
}
