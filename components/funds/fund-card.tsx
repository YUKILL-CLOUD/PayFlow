'use client'

import * as React from 'react'
import { WALLET_COLORS, PRIORITY_LEVELS, FUND_FREQUENCIES } from '@/lib/constants'
import { DynamicIcon } from '@/components/ui/dynamic-icon'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, Pencil, Archive, TrendingUp, Repeat } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { calculateNextDue, calculatePaydaysRemaining } from '@/lib/planner/dates'
import type { Database } from '@/types/database'

type Fund = Database['public']['Tables']['funds']['Row']
type Wallet = Database['public']['Tables']['wallets']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface FundCardProps {
  fund: Fund
  wallet?: Wallet
  profile: Profile
  onEdit: (fund: Fund) => void
  onArchive: (id: string) => void
}

export function FundCard({ fund, wallet, profile, onEdit, onArchive }: FundCardProps) {
  const priorityObj = PRIORITY_LEVELS.find(p => p.id === fund.priority) || PRIORITY_LEVELS[2]
  const walletColor = WALLET_COLORS.find(c => c.id === wallet?.color) || WALLET_COLORS[0]
  const frequencyObj = FUND_FREQUENCIES.find(f => f.id === fund.recurrence_type)

  const isGoal = fund.type === 'goal'
  const isDeferred = fund.start_date && new Date(fund.start_date) > new Date()

  // Calculate next due date and estimated paydays remaining relative to a simulated "next payday" date
  // In Phase 6, this will be relative to the active planned payday. For now, it is relative to today.
  const today = new Date()
  
  let nextDue: Date | null = null
  let paydaysRemaining = 0
  let estimatedAllocation: number | null = null

  if (isGoal && fund.target_date) {
    nextDue = new Date(fund.target_date)
    paydaysRemaining = calculatePaydaysRemaining(today, nextDue, profile)
    const remainingToSave = Math.max(0, fund.target_amount - fund.current_amount)
    if (paydaysRemaining > 0 && remainingToSave > 0) {
      estimatedAllocation = remainingToSave / paydaysRemaining
    }
  } else if (!isGoal && fund.recurrence_type !== 'every_payday') {
    nextDue = calculateNextDue(today, fund.recurrence_type, fund.due_day, fund.recurrence_rule)
    paydaysRemaining = calculatePaydaysRemaining(today, nextDue, profile)
    if (paydaysRemaining > 0 && fund.recurring_amount > 0) {
      estimatedAllocation = fund.recurring_amount / paydaysRemaining
    }
  }

  const displayAmount = isGoal ? fund.target_amount : fund.recurring_amount
  const percentComplete = isGoal && fund.target_amount > 0 
    ? Math.min(100, Math.round((fund.current_amount / fund.target_amount) * 100))
    : 0

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md flex flex-col h-full">
      {/* Priority accent */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${priorityObj.color}`} />

      <div className="flex justify-between items-start mb-3 mt-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`${priorityObj.bgLight} ${priorityObj.textColor} border-0 text-[10px] font-semibold uppercase tracking-wider`}>
            {priorityObj.label}
          </Badge>
          <Badge variant="outline" className="text-[10px] font-medium">
            {isGoal ? (
              <><TrendingUp className="mr-1 h-3.5 w-3.5" />Goal</>
            ) : (
              <><Repeat className="mr-1 h-3.5 w-3.5" />{frequencyObj?.label || 'Every Payday'}</>
            )}
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="-mr-2 text-muted-foreground" />}>
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(fund)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onArchive(fund.id)} variant="destructive">
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 flex flex-col">
        <h3 className="font-semibold text-lg line-clamp-1">{fund.name}</h3>

        {/* Wallet badge */}
        {wallet && (
          <div className="flex items-center gap-1.5 mt-1">
            <div className={`h-2.5 w-2.5 rounded-full ${walletColor.class}`} />
            <span className="text-xs text-muted-foreground">{wallet.name}</span>
          </div>
        )}

        {/* Amount display */}
        <div className="mt-3">
          <p className="text-2xl font-bold tracking-tight">
            {formatCurrency(displayAmount)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isGoal ? 'Target amount' : fund.recurrence_type === 'every_payday' ? 'Every payday' : 'Target per cycle'}
          </p>
        </div>

        {/* Goal progress tracking bar */}
        {isGoal && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress ({percentComplete}%)</span>
              <span className="font-semibold">{formatCurrency(fund.current_amount)}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-500", priorityObj.color)}
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>
        )}

        {/* Recurrence schedule or goal timeline details */}
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

        {/* Deferred badge */}
        {isDeferred && (
          <div className="mt-3">
            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-0">
              Starts {formatDate(fund.start_date!)}
            </Badge>
          </div>
        )}

        {/* Notes */}
        {fund.notes && (
          <p className="text-xs text-muted-foreground mt-3 line-clamp-2 italic">
            {fund.notes}
          </p>
        )}
      </div>
    </div>
  )
}
