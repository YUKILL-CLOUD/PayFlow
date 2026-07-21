'use client'

import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { BillForm } from './bill-form'
import type { BillInput } from '@/lib/schemas/bill'
import type { Database } from '@/types/database'

type Wallet = Database['public']['Tables']['wallets']['Row']

interface BillFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallets: Wallet[]
  bill?: Partial<BillInput> & { id?: string }
  onSubmit: (data: BillInput) => Promise<{ success: boolean; message?: string }>
}

export function BillFormDialog({ open, onOpenChange, wallets, bill, onSubmit }: BillFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bill?.id ? 'Edit Bill' : 'Add Bill'}</DialogTitle>
          <DialogDescription>
            {bill?.id ? 'Update your bill details below.' : 'Create a new bill to track external obligations.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <BillForm
            wallets={wallets}
            defaultValues={bill}
            onSubmit={onSubmit}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
