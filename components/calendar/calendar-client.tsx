'use client'

import * as React from 'react'
import { getCalendarGridRange, generateCalendarEvents, type CalendarEvent } from '@/lib/planner/calendar'
import { formatCurrency, formatDate } from '@/lib/utils'
import { WALLET_COLORS } from '@/lib/constants'
import { DynamicIcon } from '@/components/ui/dynamic-icon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Receipt, 
  Target, 
  Repeat, 
  CheckCircle2, 
  Lock, 
  Clock,
  Sparkles,
  Wallet
} from 'lucide-react'
import type { Database } from '@/types/database'

type Bill = Database['public']['Tables']['bills']['Row']
type Fund = Database['public']['Tables']['funds']['Row']
type Payday = Database['public']['Tables']['paydays']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']
type WalletType = Database['public']['Tables']['wallets']['Row']

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

interface CalendarClientProps {
  profile: Profile
  bills: Bill[]
  funds: Fund[]
  paydays: Payday[]
  wallets: WalletType[]
}

export function CalendarClient({ profile, bills, funds, paydays, wallets }: CalendarClientProps) {
  const today = React.useMemo(() => new Date(), [])
  const [currentYear, setCurrentYear] = React.useState<number>(today.getUTCFullYear())
  const [currentMonth, setCurrentMonth] = React.useState<number>(today.getUTCMonth()) // 0-11
  const [filterType, setFilterType] = React.useState<'all' | 'payday' | 'bill' | 'fund'>('all')
  const [selectedDayEvents, setSelectedDayEvents] = React.useState<{ dateStr: string; events: CalendarEvent[] } | null>(null)

  const walletsMap = React.useMemo(() => {
    const map = new Map<string, WalletType>()
    wallets.forEach(w => map.set(w.id, w))
    return map
  }, [wallets])

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(prev => prev - 1)
    } else {
      setCurrentMonth(prev => prev - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(prev => prev + 1)
    } else {
      setCurrentMonth(prev => prev + 1)
    }
  }

  const handleToday = () => {
    setCurrentYear(today.getUTCFullYear())
    setCurrentMonth(today.getUTCMonth())
  }

  // Calculate visible calendar grid window
  const { gridStart, gridEnd } = React.useMemo(() => {
    return getCalendarGridRange(currentYear, currentMonth)
  }, [currentYear, currentMonth])

  // Generate and filter events across visible grid
  const allEvents = React.useMemo(() => {
    return generateCalendarEvents(gridStart, gridEnd, profile, bills, funds, paydays)
  }, [gridStart, gridEnd, profile, bills, funds, paydays])

  const filteredEvents = React.useMemo(() => {
    if (filterType === 'all') return allEvents
    if (filterType === 'payday') return allEvents.filter(e => e.type === 'payday')
    if (filterType === 'bill') return allEvents.filter(e => e.type === 'bill')
    if (filterType === 'fund') return allEvents.filter(e => e.type === 'goal_fund' || e.type === 'recurring_fund')
    return allEvents
  }, [allEvents, filterType])

  // Map events by YYYY-MM-DD
  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    filteredEvents.forEach(e => {
      const list = map.get(e.date) || []
      list.push(e)
      map.set(e.date, list)
    })
    return map
  }, [filteredEvents])

  // Build grid days array (42 cells)
  const gridDays = React.useMemo(() => {
    const days: Date[] = []
    const runner = new Date(gridStart)
    while (runner <= gridEnd) {
      days.push(new Date(runner))
      runner.setUTCDate(runner.getUTCDate() + 1)
    }
    return days
  }, [gridStart, gridEnd])

  const todayStr = today.toISOString().split('T')[0]

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Calendar Controls & Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h2>
          <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/20">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-semibold" onClick={handleToday}>
              Today
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button 
            variant={filterType === 'all' ? 'default' : 'outline'} 
            size="sm" 
            className="h-7 text-xs"
            onClick={() => setFilterType('all')}
          >
            All
          </Button>
          <Button 
            variant={filterType === 'payday' ? 'default' : 'outline'} 
            size="sm" 
            className="h-7 text-xs"
            onClick={() => setFilterType('payday')}
          >
            Paydays
          </Button>
          <Button 
            variant={filterType === 'bill' ? 'default' : 'outline'} 
            size="sm" 
            className="h-7 text-xs"
            onClick={() => setFilterType('bill')}
          >
            Bills
          </Button>
          <Button 
            variant={filterType === 'fund' ? 'default' : 'outline'} 
            size="sm" 
            className="h-7 text-xs"
            onClick={() => setFilterType('fund')}
          >
            Funds
          </Button>
        </div>
      </div>

      {/* Monthly Grid */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-bold py-2 text-muted-foreground">
          {DAYS_OF_WEEK.map(d => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* 42 Date Cells */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y">
          {gridDays.map((dateObj, idx) => {
            const dateStr = dateObj.toISOString().split('T')[0]
            const dayNum = dateObj.getUTCDate()
            const isCurrentMonth = dateObj.getUTCMonth() === currentMonth
            const isToday = dateStr === todayStr
            const dayEvents = eventsByDate.get(dateStr) || []
            const maxVisible = 2
            const visibleEvents = dayEvents.slice(0, maxVisible)
            const extraCount = dayEvents.length - maxVisible

            return (
              <div
                key={dateStr}
                onClick={() => dayEvents.length > 0 && setSelectedDayEvents({ dateStr, events: dayEvents })}
                className={`min-h-[100px] p-1.5 flex flex-col justify-between transition-colors ${
                  !isCurrentMonth ? 'bg-muted/20 text-muted-foreground/40' : 'bg-background'
                } ${isToday ? 'ring-2 ring-primary ring-inset' : ''} ${
                  dayEvents.length > 0 ? 'cursor-pointer hover:bg-accent/20' : ''
                }`}
              >
                <div className="flex justify-between items-center text-xs font-semibold mb-1">
                  <span className={`h-5 w-5 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-primary text-primary-foreground font-bold' : ''
                  }`}>
                    {dayNum}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[9px] text-muted-foreground font-normal">
                      {dayEvents.length} event{dayEvents.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Event Chips */}
                <div className="space-y-1 flex-1 overflow-hidden">
                  {visibleEvents.map(event => (
                    <div
                      key={event.id}
                      className={`text-[10px] p-1 rounded font-medium truncate flex items-center gap-1 ${
                        event.type === 'payday'
                          ? event.status === 'completed'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : event.type === 'bill'
                          ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                          : event.type === 'goal_fund'
                          ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                          : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                      }`}
                    >
                      {event.type === 'payday' && (
                        event.status === 'completed' ? <Lock className="h-2.5 w-2.5 shrink-0" /> : <Sparkles className="h-2.5 w-2.5 shrink-0" />
                      )}
                      {event.type === 'bill' && <Receipt className="h-2.5 w-2.5 shrink-0" />}
                      {event.type === 'goal_fund' && <Target className="h-2.5 w-2.5 shrink-0" />}
                      {event.type === 'recurring_fund' && <Repeat className="h-2.5 w-2.5 shrink-0" />}
                      <span className="truncate">{event.title}</span>
                    </div>
                  ))}

                  {extraCount > 0 && (
                    <div className="text-[9px] text-center font-bold text-muted-foreground bg-muted/40 py-0.5 rounded">
                      +{extraCount} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Day Inspector Modal */}
      <Dialog open={!!selectedDayEvents} onOpenChange={(open) => !open && setSelectedDayEvents(null)}>
        <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
          {selectedDayEvents && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  Events for {formatDate(selectedDayEvents.dateStr)}
                </DialogTitle>
                <DialogDescription>
                  Detailed financial events occurring on this date.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {selectedDayEvents.events.map(event => {
                  const wObj = event.walletId ? walletsMap.get(event.walletId) : null
                  const wColor = WALLET_COLORS.find(c => c.id === wObj?.color) || WALLET_COLORS[0]

                  return (
                    <div key={event.id} className="p-4 rounded-xl border bg-card space-y-2.5 shadow-sm">
                      {/* Event Title & Type Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">{event.title}</span>
                            <Badge 
                              variant="outline" 
                              className={`text-[9px] uppercase font-bold px-1.5 py-0 border-0 ${
                                event.type === 'payday'
                                  ? 'bg-emerald-500/10 text-emerald-600'
                                  : event.type === 'bill'
                                  ? 'bg-rose-500/10 text-rose-600'
                                  : event.type === 'goal_fund'
                                  ? 'bg-blue-500/10 text-blue-600'
                                  : 'bg-indigo-500/10 text-indigo-600'
                              }`}
                            >
                              {event.type.replace('_', ' ')}
                            </Badge>
                          </div>
                          {event.priority && (
                            <Badge variant="outline" className="text-[9px] capitalize mt-1 px-1 py-0">
                              {event.priority}
                            </Badge>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-sm text-foreground">
                            {event.amount > 0 ? formatCurrency(event.amount) : 'Scheduled'}
                          </p>
                        </div>
                      </div>

                      {/* Context-Specific Enriched Details */}

                      {/* 1. Payday Context */}
                      {event.type === 'payday' && (
                        <div className="text-xs space-y-1 pt-2 border-t text-muted-foreground bg-muted/20 p-2.5 rounded-lg">
                          <div className="flex justify-between">
                            <span>Status:</span>
                            <Badge variant="outline" className="text-[9px] capitalize bg-background">
                              {event.status}
                            </Badge>
                          </div>
                          {event.details?.salary !== undefined && event.details.salary > 0 && (
                            <>
                              <div className="flex justify-between">
                                <span>Salary:</span>
                                <span className="font-semibold text-foreground">{formatCurrency(event.details.salary)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Allocated:</span>
                                <span className="font-semibold text-primary">{formatCurrency(event.details.allocatedAmount || 0)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* 2. Bill Context */}
                      {event.type === 'bill' && event.details && (
                        <div className="text-xs space-y-1.5 pt-2 border-t text-muted-foreground bg-muted/20 p-2.5 rounded-lg">
                          <div className="flex justify-between">
                            <span>Schedule:</span>
                            <span className="font-semibold text-foreground capitalize">{event.details.recurrenceType?.replace('_', ' ')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Paydays Remaining:</span>
                            <span className="font-semibold text-foreground">{event.details.paydaysRemaining} paydays</span>
                          </div>
                          {event.details.estimatedPerPayday !== undefined && (
                            <div className="flex justify-between text-primary font-semibold">
                              <span>Estimated Split:</span>
                              <span>{formatCurrency(event.details.estimatedPerPayday)} / payday</span>
                            </div>
                          )}
                          {wObj && (
                            <div className="flex items-center gap-1.5 pt-1 text-[11px]">
                              <div className={`h-2.5 w-2.5 rounded-full ${wColor.class}`} />
                              <span>Destination Wallet: <strong className="text-foreground">{wObj.name}</strong></span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 3. Goal Fund Context */}
                      {event.type === 'goal_fund' && event.details && (
                        <div className="text-xs space-y-2 pt-2 border-t text-muted-foreground bg-muted/20 p-2.5 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span>Progress ({event.details.progressPercent}%):</span>
                            <span className="font-semibold text-foreground">
                              {formatCurrency(event.details.currentAmount || 0)} / {formatCurrency(event.details.targetAmount || 0)}
                            </span>
                          </div>
                          <Progress value={event.details.progressPercent || 0} className="h-2" />
                          {event.details.remainingToSave !== undefined && event.details.remainingToSave > 0 && (
                            <div className="flex justify-between text-primary font-semibold pt-1">
                              <span>Est. Payday Split:</span>
                              <span>{formatCurrency(event.details.estimatedPerPayday || 0)} / payday</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 4. Recurring Fund Context */}
                      {event.type === 'recurring_fund' && event.details && (
                        <div className="text-xs space-y-1.5 pt-2 border-t text-muted-foreground bg-muted/20 p-2.5 rounded-lg">
                          <div className="flex justify-between">
                            <span>Recurrence:</span>
                            <span className="font-semibold text-foreground capitalize">{event.details.recurrenceType?.replace('_', ' ')}</span>
                          </div>
                          {wObj && (
                            <div className="flex items-center gap-1.5 pt-1 text-[11px]">
                              <div className={`h-2.5 w-2.5 rounded-full ${wColor.class}`} />
                              <span>Destination Wallet: <strong className="text-foreground">{wObj.name}</strong></span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
