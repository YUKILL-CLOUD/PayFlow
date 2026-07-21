'use client'

import * as React from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Calendar, ChevronRight, CheckCircle2, AlertTriangle, CornerDownRight } from 'lucide-react'
import type { Database } from '@/types/database'

type Payday = Database['public']['Tables']['paydays']['Row']

interface HistoryClientProps {
  completedPaydays: Payday[]
}

export function HistoryClient({ completedPaydays }: HistoryClientProps) {
  const [selectedPayday, setSelectedPayday] = React.useState<Payday | null>(null)

  const snapshotData = React.useMemo(() => {
    if (!selectedPayday || !selectedPayday.planner_snapshot) return null
    return selectedPayday.planner_snapshot as any
  }, [selectedPayday])

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in-50 duration-300">
      {completedPaydays.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center bg-card">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No historical plans</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Once you confirm and lock a payday plan, its archived record will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {completedPaydays.map((payday) => {
            const snap = payday.planner_snapshot as any
            const allocationsCount = snap?.allocations?.length || 0
            
            return (
              <div 
                key={payday.id}
                onClick={() => setSelectedPayday(payday)}
                className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/30 cursor-pointer transition-colors shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{formatDate(payday.payday_date)}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Allocated {formatCurrency(payday.salary)} | {allocationsCount} Transfers
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {payday.completed_at && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      Closed {formatDate(payday.completed_at)}
                    </span>
                  )}
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Snapshot Inspector Popup */}
      <Dialog open={!!selectedPayday} onOpenChange={(open) => !open && setSelectedPayday(null)}>
        <DialogContent className="sm:max-w-[540px] max-h-[85vh] overflow-y-auto">
          {selectedPayday && snapshotData && (
            <>
              <DialogHeader>
                <DialogTitle>Payday Plan Log</DialogTitle>
                <DialogDescription>
                  Immutable snapshot logged on {formatDate(selectedPayday.payday_date)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                {/* Meta summary stats */}
                <div className="grid grid-cols-3 gap-2 text-center bg-muted/40 p-3 rounded-lg text-xs">
                  <div>
                    <span className="text-muted-foreground block">Salary</span>
                    <span className="font-bold text-sm mt-0.5 block">{formatCurrency(selectedPayday.salary)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Total Allocated</span>
                    <span className="font-bold text-sm mt-0.5 block text-primary">{formatCurrency(snapshotData.totalAllocated)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Surplus Cash</span>
                    <span className="font-bold text-sm mt-0.5 block">{formatCurrency(snapshotData.remainingBalance)}</span>
                  </div>
                </div>

                {/* Warnings List if any */}
                {snapshotData.warnings && snapshotData.warnings.length > 0 && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex gap-2.5">
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-semibold text-xs text-amber-800 dark:text-amber-400">Planning Warnings:</p>
                      <ul className="list-disc pl-4 text-[11px] text-amber-700/90 dark:text-amber-400/90 space-y-0.5">
                        {snapshotData.warnings.map((w: any, idx: number) => (
                          <li key={idx}>{w.message}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Allocations Checklist Log */}
                <div className="space-y-2">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Frozen Allocations List</h5>
                  <div className="border rounded-lg divide-y bg-background max-h-[300px] overflow-y-auto">
                    {snapshotData.allocations.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center p-3 text-xs">
                        <div className="min-w-0 pr-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground line-clamp-1">{item.name}</span>
                            <Badge variant="outline" className="text-[9px] uppercase font-bold px-1 py-0 border-0 bg-secondary">
                              {item.type}
                            </Badge>
                          </div>
                          {item.recurrenceType !== 'every_payday' && (
                            <p className="text-[9px] text-muted-foreground mt-0.5">
                              Due {formatDate(item.nextDue)}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold">{formatCurrency(item.allocatedAmount)}</p>
                          {item.targetAmount !== item.allocatedAmount && (
                            <p className="text-[9px] text-destructive font-medium line-through mt-0.5">
                              Target: {formatCurrency(item.targetAmount)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t pt-3 flex sm:justify-between items-center gap-4 text-[10px] text-muted-foreground">
                <span>Algorithm Version: {snapshotData.planner_version || 1}</span>
                <Button variant="ghost" onClick={() => setSelectedPayday(null)}>
                  Close Logs
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
