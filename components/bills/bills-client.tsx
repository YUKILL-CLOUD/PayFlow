'use client'

import * as React from 'react'
import { BillCard } from './bill-card'
import { BillFormDialog } from './bill-form-dialog'
import { createBill, updateBill, archiveBill } from '@/actions/bills'
import type { BillInput } from '@/lib/schemas/bill'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Bill = Database['public']['Tables']['bills']['Row']
type Wallet = Database['public']['Tables']['wallets']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface BillsClientProps {
  initialBills: Bill[]
  wallets: Wallet[]
  profile: Profile
}

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'fixed', label: 'Fixed' },
  { id: 'variable', label: 'Variable' },
] as const

import { useSearchParams } from 'next/navigation'

export function BillsClient({ initialBills, wallets, profile }: BillsClientProps) {
  const searchParams = useSearchParams()
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingBill, setEditingBill] = React.useState<Bill | undefined>()
  const [billToArchive, setBillToArchive] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<'all' | 'fixed' | 'variable'>('all')

  React.useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setEditingBill(undefined)
      setIsDialogOpen(true)
    }
  }, [searchParams])

  const walletsMap = React.useMemo(() => {
    const map = new Map<string, Wallet>()
    wallets.forEach(w => map.set(w.id, w))
    return map
  }, [wallets])

  const filteredBills = React.useMemo(() => {
    if (activeTab === 'all') return initialBills
    if (activeTab === 'fixed') return initialBills.filter(b => !b.is_variable)
    return initialBills.filter(b => b.is_variable)
  }, [initialBills, activeTab])

  const handleAdd = () => {
    setEditingBill(undefined)
    setIsDialogOpen(true)
  }

  const handleEdit = (bill: Bill) => {
    setEditingBill(bill)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (data: BillInput) => {
    if (editingBill) {
      return await updateBill(editingBill.id, data)
    } else {
      return await createBill(data)
    }
  }

  const handleArchiveConfirm = async () => {
    if (!billToArchive) return
    const id = billToArchive
    setBillToArchive(null)

    const result = await archiveBill(id)
    if (result.success) {
      toast.success(result.message || 'Bill archived')
    } else {
      toast.error(result.message || 'Failed to archive bill')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bills</h1>
          <p className="text-muted-foreground">Manage your external obligations and repeating payments.</p>
        </div>
        <Button onClick={handleAdd} disabled={wallets.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Add Bill
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {TABS.map((tab) => {
          const count = tab.id === 'all'
            ? initialBills.length
            : tab.id === 'fixed'
              ? initialBills.filter(b => !b.is_variable).length
              : initialBills.filter(b => b.is_variable).length
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              <span className="ml-1.5 text-xs text-muted-foreground">({count})</span>
            </button>
          )
        })}
      </div>

      {wallets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
          <h3 className="text-lg font-semibold">Create a wallet first</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            You need at least one wallet before you can create bills. Go to the Wallets page to add one.
          </p>
          <Button variant="outline" onClick={() => window.location.href = '/wallets'}>
            Go to Wallets
          </Button>
        </div>
      ) : filteredBills.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center animate-in fade-in-50">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <Plus className="h-10 w-10" />
          </div>
          <h3 className="text-lg font-semibold">
            {activeTab === 'all' ? 'No bills found' : `No ${activeTab} bills`}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            Create your first bill to start tracking your regular expenses and variable payments.
          </p>
          <Button onClick={handleAdd}>Add Your First Bill</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBills.map((bill) => (
            <BillCard
              key={bill.id}
              bill={bill}
              wallet={walletsMap.get(bill.wallet_id)}
              profile={profile}
              onEdit={handleEdit}
              onArchive={setBillToArchive}
            />
          ))}
        </div>
      )}

      <BillFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        wallets={wallets}
        bill={editingBill ? {
          id: editingBill.id,
          name: editingBill.name,
          amount: editingBill.amount,
          is_variable: editingBill.is_variable,
          wallet_id: editingBill.wallet_id,
          priority: editingBill.priority,
          recurrence_type: editingBill.recurrence_type as any,
          due_day: editingBill.due_day,
          notes: editingBill.notes,
        } : undefined}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={!!billToArchive} onOpenChange={(open) => !open && setBillToArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this bill?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the bill from your active planning list. Past allocations will remain saved for historical reports.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
