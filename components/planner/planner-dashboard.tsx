'use client'

import * as React from 'react'
import { toggleAllocationCompleteAction, lockPaydayAction, discardPaydayAction } from '@/actions/paydays'
import { WALLET_COLORS, PRIORITY_LEVELS } from '@/lib/constants'
import { DynamicIcon } from '@/components/ui/dynamic-icon'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Loader2,
  Trash2,
  AlertTriangle,
  Lock,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Building2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type Payday = Database['public']['Tables']['paydays']['Row']
type Allocation = Database['public']['Tables']['allocations']['Row']
type WalletType = Database['public']['Tables']['wallets']['Row']

interface PlannerDashboardProps {
  payday: Payday
  allocations: Allocation[]
  wallets: WalletType[]
}

export function PlannerDashboard({ payday, allocations, wallets }: PlannerDashboardProps) {
  const [isFinishing, setIsFinishing] = React.useState(false)
  const [isDiscarding, setIsDiscarding] = React.useState(false)
  const [isLockDialogOpen, setIsLockDialogOpen] = React.useState(false)
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = React.useState(false)

  // Optimistic UI for checkboxes (instant visual feedback)
  const [optimisticAllocations, toggleOptimistic] = React.useOptimistic(
    allocations,
    (state, payload: { id: string; is_completed: boolean }) => {
      return state.map((alloc) =>
        alloc.id === payload.id ? { ...alloc, is_completed: payload.is_completed } : alloc
      )
    }
  )

  const walletsMap = React.useMemo(() => {
    const map = new Map<string, WalletType>()
    wallets.forEach(w => map.set(w.id, w))
    return map
  }, [wallets])

  // Group optimistic allocations by destination wallet
  const groupedAllocations = React.useMemo(() => {
    const groups: Record<string, Allocation[]> = {}
    optimisticAllocations.forEach((alloc) => {
      const wid = alloc.wallet_id
      if (!groups[wid]) groups[wid] = []
      groups[wid].push(alloc)
    })
    return groups
  }, [optimisticAllocations])

  // Calculate statistics using optimistic allocations
  const totalAmount = React.useMemo(() => {
    return optimisticAllocations.reduce((sum, item) => sum + item.amount, 0)
  }, [optimisticAllocations])

  const completedAmount = React.useMemo(() => {
    return optimisticAllocations
      .filter(item => item.is_completed)
      .reduce((sum, item) => sum + item.amount, 0)
  }, [optimisticAllocations])

  const completedCount = React.useMemo(() => {
    return optimisticAllocations.filter(item => item.is_completed).length
  }, [optimisticAllocations])

  const progressPercentage = React.useMemo(() => {
    if (totalAmount <= 0) return 0
    return Math.round((completedAmount / totalAmount) * 100)
  }, [completedAmount, totalAmount])

  const handleToggle = async (allocId: string, isChecked: boolean) => {
    // Instantly update the checkbox UI
    React.startTransition(() => {
      toggleOptimistic({ id: allocId, is_completed: isChecked })
    })

    const result = await toggleAllocationCompleteAction(allocId, isChecked)
    if (!result.success) {
      toast.error(result.message || 'Failed to update allocation state.')
    }
  }

  const handleLock = async () => {
    setIsFinishing(true)
    const result = await lockPaydayAction(payday.id)
    setIsFinishing(false)
    setIsLockDialogOpen(false)

    if (result.success) {
      toast.success(result.message || 'Payday locked and saved!')
    } else {
      toast.error(result.message || 'Failed to finish payday.')
    }
  }

  const handleDiscard = async () => {
    setIsDiscarding(true)
    const result = await discardPaydayAction(payday.id)
    setIsDiscarding(false)
    setIsDiscardDialogOpen(false)

    if (result.success) {
      toast.success(result.message || 'Plan discarded successfully!')
    } else {
      toast.error(result.message || 'Failed to discard plan.')
    }
  }

  // Retrieve snapshot metadata warning logs if exist
  const snapshotWarnings = React.useMemo(() => {
    if (!payday.planner_snapshot) return []
    const snap = payday.planner_snapshot as any
    return Array.isArray(snap.warnings) ? snap.warnings : []
  }, [payday.planner_snapshot])

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in-50 duration-300">
      {/* Overview Progress Card */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Active Payday Execution</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Salary: <span className="font-semibold text-foreground">{formatCurrency(payday.salary)}</span> | Planned: <span className="font-semibold text-foreground">{formatDate(payday.payday_date)}</span>
            </p>
          </div>
          <div className="flex gap-2">
            {/* Discard Dialog */}
            <AlertDialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
              <AlertDialogTrigger render={
                <Button variant="outline" size="sm" disabled={isDiscarding || isFinishing} className="text-destructive hover:bg-destructive/10">
                  {isDiscarding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
                  Discard Plan
                </Button>
              } />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Discard Payday Plan?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you absolutely sure you want to discard this payday plan? This will delete all allocations and draft logs permanently.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDiscard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Discard Plan
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Lock & Finish Dialog */}
            <AlertDialog open={isLockDialogOpen} onOpenChange={setIsLockDialogOpen}>
              <AlertDialogTrigger render={
                <Button size="sm" disabled={isFinishing || isDiscarding}>
                  {isFinishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4 mr-1.5" />}
                  Lock & Finish
                </Button>
              } />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Lock & Finish Payday?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {completedCount < optimisticAllocations.length
                      ? 'You still have pending transfers. Are you sure you want to lock and finalize this payday anyway?'
                      : 'All transfers are complete! Are you ready to lock and finalize this payday plan?'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLock}>Lock & Finish</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground font-medium">Transfers progress ({progressPercentage}%)</span>
            <span className="font-semibold">{formatCurrency(completedAmount)} / {formatCurrency(totalAmount)}</span>
          </div>
          <Progress value={progressPercentage} className="h-2.5" />
        </div>
      </div>

      {/* Warnings Panel */}
      {snapshotWarnings.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-amber-800 dark:text-amber-400">Warnings generated at planning:</h4>
            <ul className="list-disc pl-5 text-xs text-amber-700/90 dark:text-amber-400/90 space-y-1">
              {snapshotWarnings.map((w: any, idx: number) => (
                <li key={idx}>{w.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Wallet Transfer Cards Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight">Wallet Transfer Recommendations</h3>
          <span className="text-xs text-muted-foreground">{Object.keys(groupedAllocations).length} destination wallets</span>
        </div>

        {Object.entries(groupedAllocations).map(([walletId, items]) => {
          const wObj = walletsMap.get(walletId)
          const wColor = WALLET_COLORS.find(c => c.id === wObj?.color) || WALLET_COLORS[0]
          const currentBal = wObj?.current_balance || 0

          const walletTransferTotal = items.reduce((s, i) => s + i.amount, 0)
          const walletCompletedTotal = items.filter(i => i.is_completed).reduce((s, i) => s + i.amount, 0)
          const isWalletComplete = walletCompletedTotal >= walletTransferTotal && walletTransferTotal > 0

          // Health indicator
          let health: { label: string; bg: string; text: string; Icon: any }
          if (currentBal >= walletTransferTotal) {
            health = { label: 'Fully Funded', bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', Icon: CheckCircle2 }
          } else if (currentBal > 0) {
            health = { label: 'Needs Attention', bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', Icon: AlertTriangle }
          } else {
            health = { label: 'Underfunded', bg: 'bg-red-500/10', text: 'text-red-700 dark:text-red-400', Icon: AlertCircle }
          }

          return (
            <div key={walletId} className="rounded-xl border bg-card overflow-hidden shadow-sm">
              {/* Wallet Card Header */}
              <div className="bg-muted/40 p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 shrink-0 rounded-lg ${wColor.class} text-white flex items-center justify-center shadow-sm`}>
                    <DynamicIcon name={wObj?.icon || 'wallet'} className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base">{wObj?.name || 'Unknown Wallet'}</h4>
                      <Badge variant="outline" className={`${health.bg} ${health.text} border-0 text-[10px] font-medium`}>
                        <health.Icon className="mr-1 h-3 w-3" />
                        {health.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Current balance: <span className="font-medium text-foreground">{formatCurrency(currentBal)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block uppercase font-medium">Transfer Today</span>
                    <span className="text-lg font-bold text-primary">{formatCurrency(walletTransferTotal)}</span>
                  </div>
                  <div className="h-8 w-px bg-border hidden sm:block" />
                  {isWalletComplete && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0 text-xs py-1">
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Done
                    </Badge>
                  )}
                </div>
              </div>

              {/* Obligation Breakdown items inside wallet */}
              <div className="divide-y">
                {items.map((item) => {
                  const priorityObj = PRIORITY_LEVELS.find(p => p.id === (item as any).priority) || PRIORITY_LEVELS[2]
                  return (
                    <div
                      key={item.id}
                      className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                        item.is_completed ? 'bg-muted/20' : 'hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Checkbox
                          id={`alloc-${item.id}`}
                          checked={item.is_completed}
                          onCheckedChange={(checked) => handleToggle(item.id, !!checked)}
                        />
                        <div className="min-w-0">
                          <label
                            htmlFor={`alloc-${item.id}`}
                            className={`font-medium text-sm block cursor-pointer truncate ${
                              item.is_completed ? 'line-through text-muted-foreground' : ''
                            }`}
                          >
                            {item.snapshot_label}
                          </label>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className={`${priorityObj.bgLight} ${priorityObj.textColor} border-0 text-[9px] font-medium`}>
                              {priorityObj.label}
                            </Badge>
                            {item.bill_id ? (
                              <span className="text-[10px] text-muted-foreground">Bill</span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Savings Goal</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`font-bold text-sm block ${item.is_completed ? 'text-muted-foreground' : ''}`}>
                          {formatCurrency(item.amount)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Today's allocation</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
