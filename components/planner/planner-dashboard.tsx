'use client'

import * as React from 'react'
import { toggleAllocationCompleteAction, lockPaydayAction, discardPaydayAction } from '@/actions/paydays'
import { WALLET_COLORS, PRIORITY_LEVELS, WALLET_ICONS } from '@/lib/constants'
import { DynamicIcon } from '@/components/ui/dynamic-icon'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  Loader2, 
  CheckCircle, 
  Trash2, 
  Wallet, 
  ArrowRightLeft, 
  CheckSquare, 
  AlertTriangle,
  Lock
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
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null)
  const [isFinishing, setIsFinishing] = React.useState(false)
  const [isDiscarding, setIsDiscarding] = React.useState(false)

  const walletsMap = React.useMemo(() => {
    const map = new Map<string, WalletType>()
    wallets.forEach(w => map.set(w.id, w))
    return map
  }, [wallets])

  // Group allocations by destination wallet
  const groupedAllocations = React.useMemo(() => {
    const groups: Record<string, Allocation[]> = {}
    allocations.forEach((alloc) => {
      const wid = alloc.wallet_id
      if (!groups[wid]) groups[wid] = []
      groups[wid].push(alloc)
    })
    return groups
  }, [allocations])

  // Calculate statistics
  const totalAmount = React.useMemo(() => {
    return allocations.reduce((sum, item) => sum + item.amount, 0)
  }, [allocations])

  const completedAmount = React.useMemo(() => {
    return allocations
      .filter(item => item.is_completed)
      .reduce((sum, item) => sum + item.amount, 0)
  }, [allocations])

  const completedCount = React.useMemo(() => {
    return allocations.filter(item => item.is_completed).length
  }, [allocations])

  const progressPercentage = React.useMemo(() => {
    if (totalAmount <= 0) return 0
    return Math.round((completedAmount / totalAmount) * 100)
  }, [completedAmount, totalAmount])

  const handleToggle = async (allocId: string, isChecked: boolean) => {
    setIsUpdating(allocId)
    const result = await toggleAllocationCompleteAction(allocId, isChecked)
    setIsUpdating(null)

    if (result.success) {
      toast.success(isChecked ? 'Transfer completed!' : 'Transfer marked incomplete.')
      // Auto-reload to fetch fresh status / locks
      window.location.reload()
    } else {
      toast.error(result.message || 'Failed to update allocation state.')
    }
  }

  const handleLock = async () => {
    if (completedCount < allocations.length) {
      if (!confirm('You still have pending transfers. Lock this payday anyway?')) return
    }

    setIsFinishing(true)
    const result = await lockPaydayAction(payday.id)
    setIsFinishing(false)

    if (result.success) {
      toast.success(result.message || 'Payday locked and saved!')
      window.location.reload()
    } else {
      toast.error(result.message || 'Failed to finish payday.')
    }
  }

  const handleDiscard = async () => {
    if (!confirm('Are you absolutely sure you want to discard this payday plan? This will delete all allocations and draft logs.')) return

    setIsDiscarding(true)
    const result = await discardPaydayAction(payday.id)
    setIsDiscarding(false)

    if (result.success) {
      toast.success(result.message || 'Plan discarded successfully!')
      window.location.reload()
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
            <h2 className="text-xl font-bold tracking-tight">Active Plan Execution</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Salary: <span className="font-semibold text-foreground">{formatCurrency(payday.salary)}</span> | Planned: <span className="font-semibold text-foreground">{formatDate(payday.payday_date)}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDiscard} disabled={isDiscarding || isFinishing} className="text-destructive hover:bg-destructive/10">
              {isDiscarding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
              Discard Plan
            </Button>
            <Button size="sm" onClick={handleLock} disabled={isFinishing || isDiscarding}>
              {isFinishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4 mr-1.5" />}
              Lock & Finish
            </Button>
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

      {/* Group checklist details */}
      <div className="space-y-6">
        {Object.entries(groupedAllocations).map(([walletId, items]) => {
          const wObj = walletsMap.get(walletId)
          const wColor = WALLET_COLORS.find(c => c.id === wObj?.color) || WALLET_COLORS[0]
          
          return (
            <div key={walletId} className="rounded-xl border bg-card overflow-hidden shadow-sm">
              <div className="bg-muted/40 p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${wColor.class}`} />
                  <DynamicIcon name={wObj?.icon || 'wallet'} className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-bold text-sm">{wObj?.name || 'Unknown Wallet'}</h3>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {items.filter(i => i.is_completed).length} / {items.length} Transfers
                </Badge>
              </div>

              <div className="divide-y bg-background">
                {items.sort((a, b) => a.execution_order - b.execution_order).map((item) => {
                  const isUpdatingThis = isUpdating === item.id
                  return (
                    <div 
                      key={item.id} 
                      className={`flex items-center justify-between p-4 transition-colors ${item.is_completed ? 'bg-secondary/10' : ''}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-4">
                        <Checkbox
                          id={`alloc-${item.id}`}
                          checked={item.is_completed}
                          onCheckedChange={(checked) => handleToggle(item.id, !!checked)}
                          disabled={isUpdatingThis || isFinishing || isDiscarding}
                          className="h-5 w-5 rounded border-muted-foreground/40 data-[state=checked]:bg-primary"
                        />
                        <div className="min-w-0">
                          <Label 
                            htmlFor={`alloc-${item.id}`} 
                            className={`font-semibold text-sm cursor-pointer select-none line-clamp-1 ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}
                          >
                            {item.snapshot_label}
                          </Label>
                          {item.bill_id && (
                            <Badge variant="outline" className="text-[9px] uppercase font-bold border-0 bg-secondary/80 text-secondary-foreground shrink-0 mt-1 py-0 px-1 w-fit">
                              Bill
                            </Badge>
                          )}
                          {item.fund_id && (
                            <Badge variant="outline" className="text-[9px] uppercase font-bold border-0 bg-secondary/80 text-secondary-foreground shrink-0 mt-1 py-0 px-1 w-fit">
                              Fund
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className={`font-bold ${item.is_completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                          {formatCurrency(item.amount)}
                        </p>
                        {item.snapshot_amount !== item.amount && (
                          <p className="text-[10px] text-destructive font-medium line-through mt-0.5">
                            Target: {formatCurrency(item.snapshot_amount)}
                          </p>
                        )}
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
