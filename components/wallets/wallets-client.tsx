'use client'

import * as React from 'react'
import { WalletCard, type EnvelopeItem } from './wallet-card'
import { WalletFormDialog } from './wallet-form-dialog'
import { BalanceDialog } from './balance-dialogs'
import { AdjustReservationDialog } from './adjust-reservation-dialog'
import { createWallet, updateWallet, deleteWallet } from '@/actions/wallets'
import type { WalletInput } from '@/lib/schemas/wallet'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Plus, PiggyBank, Receipt, WalletCards } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'
import { formatCurrency, cn } from '@/lib/utils'

type Wallet = Database['public']['Tables']['wallets']['Row']
type Bill = Database['public']['Tables']['bills']['Row']
type Fund = Database['public']['Tables']['funds']['Row']
type ReservationEntry = Database['public']['Tables']['wallet_reservation_entries']['Row']

interface WalletsClientProps {
  initialWallets: Wallet[]
  bills: Bill[]
  funds: Fund[]
  reservationEntries: ReservationEntry[]
}

type WalletTab = 'all' | 'savings' | 'bills'

export function WalletsClient({ initialWallets, bills, funds, reservationEntries }: WalletsClientProps) {
  const searchParams = useSearchParams()
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingWallet, setEditingWallet] = React.useState<Wallet | undefined>()
  const [walletToDelete, setWalletToDelete] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<WalletTab>('all')

  const [balanceModal, setBalanceModal] = React.useState<{
    open: boolean
    wallet?: Wallet
    mode: 'set' | 'deposit' | 'withdraw'
  }>({ open: false, mode: 'set' })

  const [adjustModal, setAdjustModal] = React.useState<{
    open: boolean
    walletId: string
    sourceType: 'bill'
    sourceId: string
    sourceName: string
    currentReserved: number
  }>({ open: false, walletId: '', sourceType: 'bill', sourceId: '', sourceName: '', currentReserved: 0 })

  React.useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setEditingWallet(undefined)
      setIsDialogOpen(true)
    }
  }, [searchParams])

  // Build wallet envelope mapping
  const walletDataMap = React.useMemo(() => {
    const map = new Map<string, { total: number; envelopes: EnvelopeItem[] }>()
    initialWallets.forEach(w => {
      map.set(w.id, { total: 0, envelopes: [] })
    })

    const sourceReservedMap = new Map<string, number>()
    reservationEntries.forEach(e => {
      sourceReservedMap.set(e.source_id, (sourceReservedMap.get(e.source_id) || 0) + Number(e.amount))
    })

    bills.forEach(b => {
      const data = map.get(b.wallet_id)
      if (data) {
        const reserved = Math.max(0, sourceReservedMap.get(b.id) || 0)
        const target = b.bill_type === 'installment' ? (b.installment_amount ?? b.amount) : b.amount
        data.total += reserved
        data.envelopes.push({ id: b.id, name: b.name, sourceType: 'bill', reserved, target })
      }
    })

    return map
  }, [initialWallets, bills, reservationEntries])

  // Sort wallets by current_balance descending
  const sortedWallets = React.useMemo(() =>
    [...initialWallets].sort((a, b) => (b.current_balance || 0) - (a.current_balance || 0)),
    [initialWallets]
  )

  // Split into Savings / Fund Wallets (0 envelopes) and Bill / Expense Wallets (>0 envelopes)
  const { savingsWallets, billWallets } = React.useMemo(() => {
    const savings: Wallet[] = []
    const bill: Wallet[] = []

    sortedWallets.forEach(w => {
      const envelopesCount = walletDataMap.get(w.id)?.envelopes.length || 0
      if (envelopesCount > 0) {
        bill.push(w)
      } else {
        savings.push(w)
      }
    })

    return { savingsWallets: savings, billWallets: bill }
  }, [sortedWallets, walletDataMap])

  // Summary Totals
  const savingsTotal = React.useMemo(() =>
    savingsWallets.reduce((sum, w) => sum + (w.current_balance || 0), 0),
    [savingsWallets]
  )

  const billWalletsTotal = React.useMemo(() =>
    billWallets.reduce((sum, w) => sum + (w.current_balance || 0), 0),
    [billWallets]
  )

  const totalReserved = React.useMemo(() =>
    billWallets.reduce((sum, w) => sum + (walletDataMap.get(w.id)?.total || 0), 0),
    [billWallets, walletDataMap]
  )

  const handleAdd = () => { setEditingWallet(undefined); setIsDialogOpen(true) }
  const handleEdit = (wallet: Wallet) => { setEditingWallet(wallet); setIsDialogOpen(true) }

  const handleSubmit = async (data: WalletInput) => {
    if (editingWallet) return await updateWallet(editingWallet.id, data)
    return await createWallet(data)
  }

  const handleDeleteConfirm = async () => {
    if (!walletToDelete) return
    const id = walletToDelete
    setWalletToDelete(null)
    const result = await deleteWallet(id)
    result.success ? toast.success(result.message || 'Wallet deleted') : toast.error(result.message || 'Failed to delete wallet')
  }

  const handleOpenBalanceModal = (wallet: Wallet, mode: 'set' | 'deposit' | 'withdraw') => {
    setBalanceModal({ open: true, wallet, mode })
  }

  const handleOpenAdjustModal = (walletId: string, item: EnvelopeItem) => {
    setAdjustModal({ open: true, walletId, sourceType: 'bill', sourceId: item.id, sourceName: item.name, currentReserved: item.reserved })
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wallets</h1>
          <p className="text-muted-foreground text-sm">Organized money containers, stashes, and reserved bill envelopes.</p>
        </div>
        <Button onClick={handleAdd} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Wallet
        </Button>
      </div>

      {/* Filter Tabs */}
      {sortedWallets.length > 0 && (
        <div className="flex items-center justify-between border-b pb-3 gap-2 flex-wrap">
          <div className="flex gap-1.5 rounded-lg bg-muted p-1 text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                'px-3 py-1.5 font-medium rounded-md transition-all flex items-center gap-1.5',
                activeTab === 'all'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <WalletCards className="h-3.5 w-3.5 text-primary" />
              All Wallets ({sortedWallets.length})
            </button>
            <button
              onClick={() => setActiveTab('savings')}
              className={cn(
                'px-3 py-1.5 font-medium rounded-md transition-all flex items-center gap-1.5',
                activeTab === 'savings'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <PiggyBank className="h-3.5 w-3.5 text-emerald-500" />
              Savings & Funds ({savingsWallets.length})
            </button>
            <button
              onClick={() => setActiveTab('bills')}
              className={cn(
                'px-3 py-1.5 font-medium rounded-md transition-all flex items-center gap-1.5',
                activeTab === 'bills'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Receipt className="h-3.5 w-3.5 text-amber-500" />
              Bill Envelopes ({billWallets.length})
            </button>
          </div>

          <p className="text-xs text-muted-foreground hidden md:block">
            Net Cash: <span className="font-semibold text-foreground">{formatCurrency(savingsTotal + billWalletsTotal)}</span>
          </p>
        </div>
      )}

      {/* Empty State */}
      {sortedWallets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-10 text-center animate-in fade-in-50">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <Plus className="h-10 w-10" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No wallets yet</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-sm">
            Add a bank account, e-wallet, or cash wallet to start tracking your money.
          </p>
          <Button onClick={handleAdd}>Add Your First Wallet</Button>
        </div>
      ) : (
        <div className="space-y-10">
          {/* ─── SECTION 1: Savings & Fund Wallets (Top) ─── */}
          {(activeTab === 'all' || activeTab === 'savings') && savingsWallets.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <PiggyBank className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold tracking-tight">Savings & Fund Wallets</h2>
                    <p className="text-xs text-muted-foreground">Stash accounts, goal funds, and unallocated money containers.</p>
                  </div>
                </div>
                <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Total Stashed: {formatCurrency(savingsTotal)}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
                {savingsWallets.map((wallet) => (
                  <WalletCard
                    key={wallet.id}
                    wallet={wallet}
                    reservedTotal={0}
                    envelopes={[]}
                    onEdit={handleEdit}
                    onDelete={setWalletToDelete}
                    onOpenBalanceModal={handleOpenBalanceModal}
                    onOpenAdjustModal={handleOpenAdjustModal}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ─── SECTION 2: Bill & Expense Envelopes (Bottom) ─── */}
          {(activeTab === 'all' || activeTab === 'bills') && billWallets.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold tracking-tight">Bill & Expense Envelopes</h2>
                    <p className="text-xs text-muted-foreground">Wallets linked to repeating obligations, waterfall reserves, and envelope ledgers.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Reserved: {formatCurrency(totalReserved)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-auto items-start">
                {billWallets.map((wallet, idx) => {
                  const data = walletDataMap.get(wallet.id) || { total: 0, envelopes: [] }
                  const featured = idx === 0 && billWallets.length > 1
                  return (
                    <div
                      key={wallet.id}
                      className={featured ? 'sm:col-span-2 lg:col-span-1 xl:col-span-2' : ''}
                    >
                      <WalletCard
                        wallet={wallet}
                        reservedTotal={data.total}
                        envelopes={data.envelopes}
                        featured={featured}
                        onEdit={handleEdit}
                        onDelete={setWalletToDelete}
                        onOpenBalanceModal={handleOpenBalanceModal}
                        onOpenAdjustModal={handleOpenAdjustModal}
                      />
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Dialogs */}
      <WalletFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        wallet={editingWallet}
        onSubmit={handleSubmit}
      />

      {balanceModal.wallet && (
        <BalanceDialog
          open={balanceModal.open}
          onOpenChange={(open) => setBalanceModal(prev => ({ ...prev, open }))}
          walletId={balanceModal.wallet.id}
          walletName={balanceModal.wallet.name}
          currentBalance={balanceModal.wallet.current_balance || 0}
          mode={balanceModal.mode}
        />
      )}

      <AdjustReservationDialog
        open={adjustModal.open}
        onOpenChange={(open) => setAdjustModal(prev => ({ ...prev, open }))}
        walletId={adjustModal.walletId}
        sourceType={adjustModal.sourceType}
        sourceId={adjustModal.sourceId}
        sourceName={adjustModal.sourceName}
        currentReserved={adjustModal.currentReserved}
      />

      <AlertDialog open={!!walletToDelete} onOpenChange={(open) => !open && setWalletToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this wallet?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the wallet. Historical allocations will remain intact, but you won't be able to select this wallet for future plans.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
