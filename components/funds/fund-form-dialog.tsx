'use client'

import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { FundForm } from './fund-form'
import type { FundInput } from '@/lib/schemas/fund'
import type { Database } from '@/types/database'

type Wallet = Database['public']['Tables']['wallets']['Row']

interface FundFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallets: Wallet[]
  fund?: Partial<FundInput> & { id?: string }
  onSubmit: (data: FundInput) => Promise<{ success: boolean; message?: string }>
}

export function FundFormDialog({ open, onOpenChange, wallets, fund, onSubmit }: FundFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{fund?.id ? 'Edit Fund' : 'Add Fund'}</DialogTitle>
          <DialogDescription>
            {fund?.id ? 'Update your fund details below.' : 'Create a new fund to start allocating your income.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <FundForm
            wallets={wallets}
            defaultValues={fund}
            onSubmit={onSubmit}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
