'use client'

import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ADJUSTMENT_REASONS } from '@/lib/schemas/reservation'
import { adjustReservationAction } from '@/actions/reservations'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface AdjustReservationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  walletId: string
  sourceType: 'bill' | 'goal'
  sourceId: string
  sourceName: string
  currentReserved: number
}

export function AdjustReservationDialog({
  open,
  onOpenChange,
  walletId,
  sourceType,
  sourceId,
  sourceName,
  currentReserved,
}: AdjustReservationDialogProps) {
  const [newReserved, setNewReserved] = React.useState<number>(currentReserved)
  const [reason, setReason] = React.useState<'paid_early' | 'cash_deposit' | 'correction' | 'other'>('cash_deposit')
  const [notes, setNotes] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setNewReserved(currentReserved)
      setNotes('')
    }
  }, [open, currentReserved])

  const delta = newReserved - currentReserved

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Calculate active cycle dates (current month start to month end)
    const now = new Date()
    const cycleStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().split('T')[0]
    const cycleEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0)).toISOString().split('T')[0]

    const result = await adjustReservationAction({
      wallet_id: walletId,
      source_type: sourceType,
      source_id: sourceId,
      new_reserved_amount: newReserved,
      reason,
      notes: notes || undefined,
      cycle_start: cycleStart,
      cycle_end: cycleEnd,
    })

    setIsSubmitting(false)
    if (result.success) {
      toast.success(result.message)
      onOpenChange(false)
    } else {
      toast.error(result.message || 'Failed to adjust reservation')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Adjust Reserved Amount</DialogTitle>
          <DialogDescription>
            Manually adjust the reserved envelope for <span className="font-medium text-foreground">{sourceName}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Current vs New */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/50 border text-xs">
            <div>
              <span className="text-muted-foreground block">Current Reserved</span>
              <span className="text-base font-bold">{formatCurrency(currentReserved)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Adjustment Delta</span>
              <span className={`text-base font-bold ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-rose-600' : 'text-muted-foreground'}`}>
                {delta > 0 ? '+' : ''}{formatCurrency(delta)}
              </span>
            </div>
          </div>

          {/* New Reserved Input */}
          <div className="space-y-2">
            <Label htmlFor="new-reserved-amount">New Reserved Total</Label>
            <Input
              id="new-reserved-amount"
              type="number"
              step="0.01"
              min="0"
              value={newReserved}
              onChange={(e) => setNewReserved(parseFloat(e.target.value) || 0)}
              required
            />
          </div>

          {/* Required Reason Selector */}
          <div className="space-y-2">
            <Label htmlFor="adjustment-reason">Reason for Adjustment</Label>
            <Select value={reason} onValueChange={(v: any) => setReason(v)}>
              <SelectTrigger id="adjustment-reason">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {ADJUSTMENT_REASONS.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    <div className="flex flex-col text-left">
                      <span className="font-medium">{r.label}</span>
                      <span className="text-[10px] text-muted-foreground">{r.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="adjustment-notes">Notes (Optional)</Label>
            <Textarea
              id="adjustment-notes"
              placeholder="Provide context for this adjustment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Adjustment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
