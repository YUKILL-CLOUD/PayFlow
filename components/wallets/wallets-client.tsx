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
import { Plus } from 'lucide-react'
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

export function WalletsClient({ initialWallets, bills, funds, reservationEntries }: WalletsClientProps) {
  const searchParams = useSearchParams()
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingWallet, setEditingWallet] = React.useState<Wallet | undefined>()
  const [walletToDelete, setWalletToDelete] = React.useState<string | null>(null)

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

  // Map reservation totals & envelope breakdowns per wallet
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
  }, [initialWallets, bills, funds, reservationEntries])

  // Sort wallets by current_balance descending for bento layout
  const sortedWallets = React.useMemo(() =>
    [...initialWallets].sort((a, b) => (b.current_balance || 0) - (a.current_balance || 0)),
    [initialWallets]
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
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wallets</h1>
          <p className="text-muted-foreground text-sm">Manage real balances, reserved envelopes, and cash destinations.</p>
        </div>
        <Button onClick={handleAdd} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Wallet
        </Button>
      </div>

      {/* Bento Grid — sorted by biggest balance */}
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
        <BentoGrid
          wallets={sortedWallets}
          walletDataMap={walletDataMap}
          onEdit={handleEdit}
          onDelete={setWalletToDelete}
          onOpenBalanceModal={handleOpenBalanceModal}
          onOpenAdjustModal={handleOpenAdjustModal}
        />
      )}

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

// --- Bento Grid Component ---
interface BentoGridProps {
  wallets: ReturnType<typeof Array.prototype.slice>
  walletDataMap: Map<string, { total: number; envelopes: EnvelopeItem[] }>
  onEdit: (w: any) => void
  onDelete: (id: string) => void
  onOpenBalanceModal: (w: any, mode: 'set' | 'deposit' | 'withdraw') => void
  onOpenAdjustModal: (walletId: string, item: EnvelopeItem) => void
}

function BentoGrid({ wallets, walletDataMap, onEdit, onDelete, onOpenBalanceModal, onOpenAdjustModal }: BentoGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-auto items-start">
      {wallets.map((wallet: any, idx: number) => {
        const data = walletDataMap.get(wallet.id) || { total: 0, envelopes: [] }
        // First card (largest balance) spans 2 columns on sm+ for bento effect
        const featured = idx === 0 && wallets.length > 1
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
              onEdit={onEdit}
              onDelete={onDelete}
              onOpenBalanceModal={onOpenBalanceModal}
              onOpenAdjustModal={onOpenAdjustModal}
            />
          </div>
        )
      })}
    </div>
  )
}
