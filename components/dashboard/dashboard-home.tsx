'use client'

import * as React from 'react'
import { calculateNextDue, calculatePaydaysRemaining } from '@/lib/planner/dates'
import { formatCurrency, formatDate } from '@/lib/utils'
import { WALLET_COLORS } from '@/lib/constants'
import { DynamicIcon } from '@/components/ui/dynamic-icon'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  Wallet, 
  CalendarDays, 
  Receipt, 
  Target, 
  Repeat, 
  Clock, 
  ArrowUpRight, 
  History, 
  Sparkles,
  ChevronRight
} from 'lucide-react'
import type { Database } from '@/types/database'

type Bill = Database['public']['Tables']['bills']['Row']
type Fund = Database['public']['Tables']['funds']['Row']
type WalletType = Database['public']['Tables']['wallets']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']
type Payday = Database['public']['Tables']['paydays']['Row']

interface DashboardHomeProps {
  bills: Bill[]
  funds: Fund[]
  wallets: WalletType[]
  profile: Profile
  recentPaydays: Payday[]
  children?: React.ReactNode
}

export function DashboardHome({ bills, funds, wallets, profile, recentPaydays, children }: DashboardHomeProps) {
  const todayStr = React.useMemo(() => new Date().toISOString().split('T')[0], [])

  const walletsMap = React.useMemo(() => {
    const map = new Map<string, WalletType>()
    wallets.forEach(w => map.set(w.id, w))
    return map
  }, [wallets])

  // Split funds into Goal vs Recurring
  const goalFunds = React.useMemo(() => funds.filter(f => f.type === 'goal'), [funds])
  const recurringFunds = React.useMemo(() => funds.filter(f => f.type === 'recurring'), [funds])

  // Key Financial Metrics
  const totalActiveObligations = React.useMemo(() => {
    return bills.reduce((sum, b) => sum + b.amount, 0)
  }, [bills])

  const lastPayday = recentPaydays[0] || null

  // Enriched Upcoming Bills (due in next 30 days)
  const upcomingBills = React.useMemo(() => {
    return bills.map(bill => {
      let nextDueStr = todayStr
      let paydaysRemaining = 1

      if (bill.recurrence_type !== 'every_payday') {
        const nextDue = calculateNextDue(todayStr, bill.recurrence_type, bill.due_day, bill.recurrence_rule)
        nextDueStr = nextDue.toISOString().split('T')[0]
        paydaysRemaining = calculatePaydaysRemaining(todayStr, nextDue, profile)
      }

      const paydaysDiv = paydaysRemaining > 0 ? paydaysRemaining : 1
      const estimatedPerPayday = bill.amount / paydaysDiv

      return {
        ...bill,
        nextDueStr,
        paydaysRemaining,
        estimatedPerPayday
      }
    }).sort((a, b) => a.nextDueStr.localeCompare(b.nextDueStr))
  }, [bills, todayStr, profile])

  // Enriched Goal Funds
  const enrichedGoalFunds = React.useMemo(() => {
    return goalFunds.map(fund => {
      const remainingToSave = Math.max(0, fund.target_amount - fund.current_amount)
      const progressPercent = fund.target_amount > 0 
        ? Math.min(100, Math.round((fund.current_amount / fund.target_amount) * 100))
        : 0

      let paydaysRemaining = 1
      let estimatedPerPayday = remainingToSave

      if (fund.target_date) {
        const targetDate = new Date(fund.target_date)
        paydaysRemaining = calculatePaydaysRemaining(todayStr, targetDate, profile)
        const paydaysDiv = paydaysRemaining > 0 ? paydaysRemaining : 1
        estimatedPerPayday = remainingToSave / paydaysDiv
      }

      return {
        ...fund,
        remainingToSave,
        progressPercent,
        paydaysRemaining,
        estimatedPerPayday
      }
    })
  }, [goalFunds, todayStr, profile])

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/30 p-4 rounded-xl border">
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            Welcome back, {profile.display_name || 'Planner'} 👋
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Here is your financial command overview. Setup your incoming salary to generate your payday plan.
          </p>
        </div>
        <Badge variant="outline" className="text-xs py-1 px-3 bg-background">
          <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-primary" />
          Schedule: <span className="font-semibold text-foreground ml-1 capitalize">{profile.payday_schedule.replace('_', ' ')}</span>
        </Badge>
      </div>

      {/* Primary Action (PlannerSetup Wizard) placed immediately after Welcome Header */}
      {children}

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Obligations</span>
            <Receipt className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xl font-bold tracking-tight">{formatCurrency(totalActiveObligations)}</p>
          <p className="text-[11px] text-muted-foreground">{bills.length} active bills enrolled</p>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Connected Wallets</span>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold tracking-tight">{wallets.length}</p>
          <p className="text-[11px] text-muted-foreground">Active storage wallets</p>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Funds</span>
            <Target className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold tracking-tight">{funds.length}</p>
          <p className="text-[11px] text-muted-foreground">{goalFunds.length} Goals • {recurringFunds.length} Recurring</p>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Last Payday</span>
            <History className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-xl font-bold tracking-tight">
            {lastPayday ? formatCurrency(lastPayday.salary) : 'None'}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {lastPayday ? formatDate(lastPayday.payday_date) : 'No past locked paydays'}
          </p>
        </div>
      </div>

      {/* Main Grid: Enriched Upcoming Bills & Wallets Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Bills Widget (2 cols) */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="font-bold text-base tracking-tight flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" /> Upcoming Obligations
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bills due with per-payday split estimates based on your schedule.
              </p>
            </div>
            <a href="/bills" className="text-xs text-primary hover:underline font-medium flex items-center">
              Manage Bills <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </a>
          </div>

          {upcomingBills.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No active bills found.</p>
          ) : (
            <div className="divide-y max-h-[320px] overflow-y-auto pr-1">
              {upcomingBills.map(bill => {
                const wObj = walletsMap.get(bill.wallet_id)
                const wColor = WALLET_COLORS.find(c => c.id === wObj?.color) || WALLET_COLORS[0]

                return (
                  <div key={bill.id} className="py-3 flex justify-between items-center gap-4 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm line-clamp-1">{bill.name}</span>
                        <Badge variant="outline" className="text-[9px] capitalize py-0 px-1">
                          {bill.priority}
                        </Badge>
                        {bill.is_variable && (
                          <Badge variant="secondary" className="text-[9px] py-0 px-1">
                            Variable
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Due {formatDate(bill.nextDueStr)}
                        </span>
                        <span>•</span>
                        <span>{bill.paydaysRemaining} payday{bill.paydaysRemaining !== 1 ? 's' : ''} left</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-bold text-foreground text-sm">{formatCurrency(bill.amount)}</p>
                      {bill.recurrence_type !== 'every_payday' && bill.paydaysRemaining > 1 && (
                        <p className="text-[10px] text-primary font-medium mt-0.5">
                          Est. {formatCurrency(bill.estimatedPerPayday)} / payday
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Wallets Snapshot Card (1 col) */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-base tracking-tight flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-500" /> Storage Wallets
            </h3>
            <a href="/wallets" className="text-xs text-primary hover:underline font-medium flex items-center">
              Manage <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </a>
          </div>

          {wallets.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No wallets created yet.</p>
          ) : (
            <div className="space-y-3 max-h-[320px] overflow-y-auto">
              {wallets.map(w => {
                const wColor = WALLET_COLORS.find(c => c.id === w.color) || WALLET_COLORS[0]
                const billCount = bills.filter(b => b.wallet_id === w.id).length
                const fundCount = funds.filter(f => f.wallet_id === w.id).length

                return (
                  <div key={w.id} className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg ${wColor.class} flex items-center justify-center text-white shrink-0`}>
                        <DynamicIcon name={w.icon || 'wallet'} className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-foreground line-clamp-1">{w.name}</p>
                        <p className="text-[10px] text-muted-foreground">{billCount} Bills • {fundCount} Funds</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Separated Fund Displays: Goal Funds vs Recurring Funds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goal Funds Tracker */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="font-bold text-base tracking-tight flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" /> Goal Funds Tracker
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Savings targets with progress bars and remaining balance estimates.
              </p>
            </div>
            <a href="/funds" className="text-xs text-primary hover:underline font-medium flex items-center">
              All Funds <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </a>
          </div>

          {enrichedGoalFunds.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No goal funds configured.</p>
          ) : (
            <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
              {enrichedGoalFunds.map(fund => (
                <div key={fund.id} className="p-3.5 rounded-lg border bg-muted/10 space-y-2">
                  <div className="flex justify-between items-start text-xs">
                    <div>
                      <span className="font-bold text-foreground text-sm">{fund.name}</span>
                      {fund.target_date && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Target Date: {formatDate(fund.target_date)} ({fund.paydaysRemaining} paydays left)
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-foreground">{formatCurrency(fund.current_amount)}</span>
                      <span className="text-muted-foreground"> / {formatCurrency(fund.target_amount)}</span>
                    </div>
                  </div>

                  <Progress value={fund.progressPercent} className="h-2" />

                  <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1">
                    <span>{fund.progressPercent}% Saved</span>
                    {fund.remainingToSave > 0 && fund.paydaysRemaining > 0 && (
                      <span className="text-primary font-semibold">
                        Est. {formatCurrency(fund.estimatedPerPayday)} / payday remaining
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recurring Funds Overview */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="font-bold text-base tracking-tight flex items-center gap-2">
                <Repeat className="h-4 w-4 text-emerald-500" /> Recurring Funds Overview
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ongoing allowance and allocation commitments per cycle.
              </p>
            </div>
            <a href="/funds" className="text-xs text-primary hover:underline font-medium flex items-center">
              Manage <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </a>
          </div>

          {recurringFunds.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No recurring funds configured.</p>
          ) : (
            <div className="divide-y max-h-[320px] overflow-y-auto pr-1">
              {recurringFunds.map(fund => {
                const wObj = walletsMap.get(fund.wallet_id)
                return (
                  <div key={fund.id} className="py-3 flex justify-between items-center gap-4 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{fund.name}</span>
                        <Badge variant="outline" className="text-[9px] capitalize py-0 px-1">
                          {fund.priority}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Schedule: {fund.recurrence_type.replace('_', ' ')} • Wallet: {wObj?.name || 'Unknown'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground text-sm">{formatCurrency(fund.recurring_amount)}</p>
                      <p className="text-[10px] text-muted-foreground">per cycle</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent History Section if past paydays exist */}
      {recentPaydays.length > 0 && (
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-500" /> Recent Payday History
            </h3>
            <a href="/history" className="text-xs text-primary hover:underline font-medium flex items-center">
              View All History <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recentPaydays.map(p => {
              const snap = p.planner_snapshot as any
              return (
                <div key={p.id} className="p-3 rounded-lg border bg-muted/10 space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-foreground">{formatDate(p.payday_date)}</span>
                    <Badge variant="outline" className="text-[9px] uppercase bg-emerald-500/10 text-emerald-600 border-0">
                      Locked
                    </Badge>
                  </div>
                  <div className="flex justify-between text-muted-foreground pt-1">
                    <span>Salary:</span>
                    <span className="font-bold text-foreground">{formatCurrency(p.salary)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Allocated:</span>
                    <span className="font-bold text-primary">{formatCurrency(snap?.totalAllocated || 0)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
