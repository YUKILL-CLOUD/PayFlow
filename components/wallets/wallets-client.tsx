'use client'

import * as React from 'react'
import { WalletCard } from './wallet-card'
import { WalletFormDialog } from './wallet-form-dialog'
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

type Wallet = Database['public']['Tables']['wallets']['Row']

interface WalletsClientProps {
  initialWallets: Wallet[]
}

import { useSearchParams } from 'next/navigation'

export function WalletsClient({ initialWallets }: WalletsClientProps) {
  const searchParams = useSearchParams()
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingWallet, setEditingWallet] = React.useState<Wallet | undefined>()
  const [walletToDelete, setWalletToDelete] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setEditingWallet(undefined)
      setIsDialogOpen(true)
    }
  }, [searchParams])
  
  const handleAdd = () => {
    setEditingWallet(undefined)
    setIsDialogOpen(true)
  }

  const handleEdit = (wallet: Wallet) => {
    setEditingWallet(wallet)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (data: WalletInput) => {
    if (editingWallet) {
      return await updateWallet(editingWallet.id, data)
    } else {
      return await createWallet(data)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!walletToDelete) return
    const id = walletToDelete
    setWalletToDelete(null)
    
    const result = await deleteWallet(id)
    if (result.success) {
      toast.success(result.message || 'Wallet deleted')
    } else {
      toast.error(result.message || 'Failed to delete wallet')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wallets</h1>
          <p className="text-muted-foreground">Manage your accounts and cash destinations.</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Wallet
        </Button>
      </div>

      {initialWallets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center animate-in fade-in-50">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <Plus className="h-10 w-10" />
          </div>
          <h3 className="text-lg font-semibold">No wallets found</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            You haven't added any wallets yet. Add a bank account, e-wallet, or cash to start allocating your funds.
          </p>
          <Button onClick={handleAdd}>Add Your First Wallet</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {initialWallets.map((wallet) => (
            <WalletCard 
              key={wallet.id} 
              wallet={wallet} 
              onEdit={handleEdit} 
              onDelete={setWalletToDelete} 
            />
          ))}
        </div>
      )}

      <WalletFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        wallet={editingWallet}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={!!walletToDelete} onOpenChange={(open) => !open && setWalletToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
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
