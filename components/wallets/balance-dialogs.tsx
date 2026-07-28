'use client'

import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateWalletBalance, depositToWallet, withdrawFromWallet } from '@/actions/wallets'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface BalanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  walletId: string
  walletName: string
  currentBalance: number
  mode: 'set' | 'deposit' | 'withdraw'
}

export function BalanceDialog({
  open,
  onOpenChange,
  walletId,
  walletName,
  currentBalance,
  mode,
}: BalanceDialogProps) {
  const [amount, setAmount] = React.useState<number>(mode === 'set' ? currentBalance : 0)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setAmount(mode === 'set' ? currentBalance : 0)
    }
  }, [open, currentBalance, mode])

  const titles = {
    set: 'Set Current Balance',
    deposit: 'Deposit Money',
    withdraw: 'Withdraw Money',
  }

  const descriptions = {
    set: `Update the actual balance inside ${walletName}.`,
    deposit: `Add funds directly to ${walletName}.`,
    withdraw: `Withdraw funds from ${walletName}.`,
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    let result
    if (mode === 'set') {
      result = await updateWalletBalance(walletId, amount)
    } else if (mode === 'deposit') {
      result = await depositToWallet(walletId, amount)
    } else {
      result = await withdrawFromWallet(walletId, amount)
    }

    setIsSubmitting(false)
    if (result.success) {
      toast.success(result.message)
      onOpenChange(false)
    } else {
      toast.error(result.message || 'Operation failed')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{titles[mode]}</DialogTitle>
          <DialogDescription>{descriptions[mode]}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {mode !== 'set' && (
            <div className="p-3 rounded-lg bg-muted/50 border text-xs flex justify-between items-center">
              <span className="text-muted-foreground">Current Balance</span>
              <span className="font-bold text-sm">{formatCurrency(currentBalance)}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="balance-amount">{mode === 'set' ? 'New Balance' : 'Amount'}</Label>
            <Input
              id="balance-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'set' ? 'Save Balance' : mode === 'deposit' ? 'Deposit' : 'Withdraw'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
