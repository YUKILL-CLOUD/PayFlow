'use client'

import * as React from 'react'
import { generateDraftAction, confirmPaydayPlanAction } from '@/actions/paydays'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Loader2, Sparkles, AlertTriangle, Info, CheckCircle2, Settings } from 'lucide-react'
import { toast } from 'sonner'
import type { PlannerResult } from '@/lib/planner/types'
import type { Database } from '@/types/database'

type Bill = Database['public']['Tables']['bills']['Row']
type Fund = Database['public']['Tables']['funds']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

const SCHEDULE_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  bi_weekly: 'Bi-Weekly',
  semi_monthly: 'Semi-Monthly',
  monthly: 'Monthly',
  custom: 'Custom'
}

interface PlannerSetupProps {
  bills: Bill[]
  funds: Fund[]
  profile: Profile
}

export function PlannerSetup({ bills, funds, profile }: PlannerSetupProps) {
  const [salary, setSalary] = React.useState<number>(0)
  const [dateStr, setDateStr] = React.useState<string>(
    new Date().toISOString().split('T')[0]
  )

  // Track overrides state: itemId -> amount
  const [billOverrides, setBillOverrides] = React.useState<Record<string, number>>({})
  const [fundOverrides, setFundOverrides] = React.useState<Record<string, number>>({})

  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isConfirming, setIsConfirming] = React.useState(false)
  const [draft, setDraft] = React.useState<PlannerResult | null>(null)

  const variableBills = React.useMemo(() => bills.filter(b => b.is_variable), [bills])
  const goalFunds = React.useMemo(() => funds.filter(f => f.type === 'goal'), [funds])

  // Derive schedule description
  const scheduleDescription = React.useMemo(() => {
    const label = SCHEDULE_LABELS[profile.payday_schedule] || profile.payday_schedule
    if (profile.payday_schedule === 'semi_monthly') {
      const dates = Array.isArray(profile.payday_dates)
        ? (profile.payday_dates as number[])
        : [15, 30]
      return `${label} (${dates.join(' & ')} of each month)`
    }
    if (profile.payday_schedule === 'monthly') {
      const dates = Array.isArray(profile.payday_dates)
        ? (profile.payday_dates as number[])
        : [30]
      return `${label} (${dates[0]} of each month)`
    }
    if (profile.payday_schedule === 'weekly' || profile.payday_schedule === 'bi_weekly') {
      const anchor = profile.payday_start_date
      return anchor ? `${label} (from ${formatDate(anchor)})` : `${label} (no anchor date set)`
    }
    return label
  }, [profile])

  const handleGenerateDraft = async () => {
    if (salary <= 0) {
      toast.error('Please enter a valid salary amount.')
      return
    }

    setIsGenerating(true)
    const result = await generateDraftAction(salary, dateStr, {
      bills: billOverrides,
      funds: fundOverrides
    })
    setIsGenerating(false)

    if (result.success && result.draft) {
      setDraft(result.draft)
      toast.success('Payday allocation plan drafted!')
    } else {
      toast.error(result.message || 'Failed to generate draft.')
    }
  }

  const handleConfirmPlan = async () => {
    if (salary <= 0) return
    setIsConfirming(true)
    const result = await confirmPaydayPlanAction(salary, dateStr, {
      bills: billOverrides,
      funds: fundOverrides
    })
    setIsConfirming(false)

    if (result.success) {
      toast.success('Payday plan locked and active!')
      window.location.reload()
    } else {
      toast.error(result.message || 'Failed to confirm payday plan.')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in-50 duration-300">
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Generate Payday Plan</h2>
            <p className="text-sm text-muted-foreground">Setup your incoming salary and customize overrides to generate your plan.</p>
          </div>
        </div>

        {/* Schedule Info Banner */}
        <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border">
          <div className="flex items-center gap-2 text-sm">
            <Info className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Pay Schedule:</span>
            <span className="font-semibold text-foreground">{scheduleDescription}</span>
          </div>
          <a href="/settings" className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium shrink-0">
            <Settings className="h-3 w-3" /> Change
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="salary">Salary Amount</Label>
            <Input
              id="salary"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={salary || ''}
              onChange={(e) => setSalary(e.target.value ? parseFloat(e.target.value) : 0)}
              className="text-lg font-semibold"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payday-date">Payday Date</Label>
            <Input
              id="payday-date"
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="text-lg font-semibold"
            />
          </div>
        </div>

        {/* Overrides section */}
        {(variableBills.length > 0 || goalFunds.length > 0) && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-1.5">
              <Info className="h-4 w-4" /> Customize Overrides for this Payday
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {variableBills.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Variable Bills</h4>
                  {variableBills.map(b => (
                    <div key={b.id} className="flex items-center justify-between gap-4 p-2.5 rounded-lg border bg-accent/20">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium line-clamp-1">{b.name}</p>
                        <p className="text-xs text-muted-foreground">Baseline: {formatCurrency(b.amount)}</p>
                      </div>
                      <Input
                        type="number"
                        placeholder="Amt"
                        className="w-24 text-right"
                        value={billOverrides[b.id] ?? ''}
                        onChange={(e) => {
                          const val = e.target.value ? parseFloat(e.target.value) : undefined
                          setBillOverrides(prev => {
                            const next = { ...prev }
                            if (val === undefined) delete next[b.id]
                            else next[b.id] = val
                            return next
                          })
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {goalFunds.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Goal Funds Target</h4>
                  {goalFunds.map(f => (
                    <div key={f.id} className="flex items-center justify-between gap-4 p-2.5 rounded-lg border bg-accent/20">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium line-clamp-1">{f.name}</p>
                        <p className="text-xs text-muted-foreground">Target: {formatCurrency(f.target_amount)}</p>
                      </div>
                      <Input
                        type="number"
                        placeholder="Amt"
                        className="w-24 text-right"
                        value={fundOverrides[f.id] ?? ''}
                        onChange={(e) => {
                          const val = e.target.value ? parseFloat(e.target.value) : undefined
                          setFundOverrides(prev => {
                            const next = { ...prev }
                            if (val === undefined) delete next[f.id]
                            else next[f.id] = val
                            return next
                          })
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <Button onClick={handleGenerateDraft} disabled={isGenerating || salary <= 0} className="w-full font-semibold">
          {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate Payday Plan
        </Button>
      </div>

      {/* Plan Preview */}
      {draft && (
        <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-300">
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-bold tracking-tight">Draft Plan Summary</h3>

            {/* Warnings Alert Box */}
            {draft.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                <h4 className="font-semibold text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Potential Shortage Warnings
                </h4>
                <ul className="list-disc pl-5 text-xs text-amber-700/90 dark:text-amber-400/90 space-y-1.5">
                  {draft.warnings.map((w, idx) => (
                    <li key={idx}>{w.message}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-secondary/30 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Total Target</p>
                <p className="text-xl font-bold mt-1 text-foreground">{formatCurrency(draft.totalTarget)}</p>
              </div>
              <div className="p-3 bg-primary/5 rounded-lg">
                <p className="text-xs text-primary uppercase font-semibold">Total Allocated</p>
                <p className="text-xl font-bold mt-1 text-primary">{formatCurrency(draft.totalAllocated)}</p>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Surplus Cash</p>
                <p className="text-xl font-bold mt-1 text-foreground">{formatCurrency(draft.remainingBalance)}</p>
              </div>
            </div>

            {/* Allocations checklist output log */}
            <div className="border rounded-lg divide-y bg-background max-h-[400px] overflow-y-auto">
              {draft.allocations.map((alloc) => (
                <div key={alloc.id} className="flex justify-between items-center p-3 text-sm">
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground line-clamp-1">{alloc.name}</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider px-1 py-0 border-0 bg-secondary text-secondary-foreground">
                        {alloc.type}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] capitalize px-1 py-0">
                        {alloc.priority}
                      </Badge>
                    </div>
                    {alloc.recurrenceType !== 'every_payday' && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Due {formatDate(alloc.nextDue)} ({alloc.paydaysRemaining} paydays left)
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-foreground">{formatCurrency(alloc.allocatedAmount)}</p>
                    {alloc.targetAmount !== alloc.allocatedAmount && (
                      <p className="text-[10px] text-destructive font-medium line-through mt-0.5">
                        Target: {formatCurrency(alloc.targetAmount)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="ghost" onClick={() => setDraft(null)} disabled={isConfirming}>
                Cancel Draft
              </Button>
              <Button onClick={handleConfirmPlan} disabled={isConfirming} className="bg-primary text-primary-foreground font-semibold">
                {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirm & Lock Plan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
