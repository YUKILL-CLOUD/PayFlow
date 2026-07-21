'use client'

import * as React from 'react'
import { FundCard } from './fund-card'
import { FundFormDialog } from './fund-form-dialog'
import { createFund, updateFund, archiveFund } from '@/actions/funds'
import type { FundInput } from '@/lib/schemas/fund'
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

type Fund = Database['public']['Tables']['funds']['Row']
type Wallet = Database['public']['Tables']['wallets']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface FundsClientProps {
  initialFunds: Fund[]
  wallets: Wallet[]
  profile: Profile
}

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'recurring', label: 'Recurring' },
  { id: 'goal', label: 'Goals' },
] as const

import { useSearchParams } from 'next/navigation'

export function FundsClient({ initialFunds, wallets, profile }: FundsClientProps) {
  const searchParams = useSearchParams()
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingFund, setEditingFund] = React.useState<Fund | undefined>()
  const [fundToArchive, setFundToArchive] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<'all' | 'recurring' | 'goal'>('all')

  React.useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setEditingFund(undefined)
      setIsDialogOpen(true)
    }
  }, [searchParams])

  const walletsMap = React.useMemo(() => {
    const map = new Map<string, Wallet>()
    wallets.forEach(w => map.set(w.id, w))
    return map
  }, [wallets])

  const filteredFunds = activeTab === 'all'
    ? initialFunds
    : initialFunds.filter(f => f.type === activeTab)

  const handleAdd = () => {
    setEditingFund(undefined)
    setIsDialogOpen(true)
  }

  const handleEdit = (fund: Fund) => {
    setEditingFund(fund)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (data: FundInput) => {
    if (editingFund) {
      return await updateFund(editingFund.id, data)
    } else {
      return await createFund(data)
    }
  }

  const handleArchiveConfirm = async () => {
    if (!fundToArchive) return
    const id = fundToArchive
    setFundToArchive(null)

    const result = await archiveFund(id)
    if (result.success) {
      toast.success(result.message || 'Fund archived')
    } else {
      toast.error(result.message || 'Failed to archive fund')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Funds</h1>
          <p className="text-muted-foreground">Manage your savings goals and recurring allocations.</p>
        </div>
        <Button onClick={handleAdd} disabled={wallets.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Add Fund
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {TABS.map((tab) => {
          const count = tab.id === 'all'
            ? initialFunds.length
            : initialFunds.filter(f => f.type === tab.id).length
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
            You need at least one wallet before you can create funds. Go to the Wallets page to add one.
          </p>
          <Button variant="outline" onClick={() => window.location.href = '/wallets'}>
            Go to Wallets
          </Button>
        </div>
      ) : filteredFunds.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center animate-in fade-in-50">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <Plus className="h-10 w-10" />
          </div>
          <h3 className="text-lg font-semibold">
            {activeTab === 'all' ? 'No funds yet' : `No ${activeTab} funds`}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            Create your first fund to start planning where your payday income goes.
          </p>
          <Button onClick={handleAdd}>Add Your First Fund</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFunds.map((fund) => (
            <FundCard
              key={fund.id}
              fund={fund}
              wallet={walletsMap.get(fund.wallet_id)}
              profile={profile}
              onEdit={handleEdit}
              onArchive={setFundToArchive}
            />
          ))}
        </div>
      )}

      <FundFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        wallets={wallets}
        fund={editingFund ? {
          id: editingFund.id,
          name: editingFund.name,
          type: editingFund.type,
          wallet_id: editingFund.wallet_id,
          priority: editingFund.priority,
          recurring_amount: editingFund.recurring_amount,
          target_amount: editingFund.target_amount,
          current_amount: editingFund.current_amount,
          target_date: editingFund.target_date,
          start_date: editingFund.start_date,
          recurrence_type: editingFund.recurrence_type as any,
          due_day: editingFund.due_day,
          notes: editingFund.notes,
        } : undefined}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={!!fundToArchive} onOpenChange={(open) => !open && setFundToArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this fund?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the fund from your active list. Historical allocations will remain intact for your records.
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
