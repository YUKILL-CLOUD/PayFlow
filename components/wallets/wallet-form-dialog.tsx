'use client'

import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { WalletForm } from './wallet-form'
import type { WalletInput } from '@/lib/schemas/wallet'

interface WalletFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet?: Partial<WalletInput> & { id?: string }
  onSubmit: (data: WalletInput) => Promise<{ success: boolean; message?: string }>
}

export function WalletFormDialog({ open, onOpenChange, wallet, onSubmit }: WalletFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{wallet?.id ? 'Edit Wallet' : 'Add Wallet'}</DialogTitle>
          <DialogDescription>
            {wallet?.id ? 'Update your wallet details below.' : 'Create a new wallet to hold your funds and bills.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <WalletForm
            defaultValues={wallet}
            onSubmit={onSubmit}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
