'use client'

import { WALLET_COLORS, WALLET_TYPES } from '@/lib/constants'
import { DynamicIcon } from '@/components/ui/dynamic-icon'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { Database } from '@/types/database'

type Wallet = Database['public']['Tables']['wallets']['Row']

interface WalletCardProps {
  wallet: Wallet
  onEdit: (wallet: Wallet) => void
  onDelete: (id: string) => void
}

export function WalletCard({ wallet, onEdit, onDelete }: WalletCardProps) {
  const colorObj = WALLET_COLORS.find(c => c.id === wallet.color) || WALLET_COLORS[0]
  const typeObj = WALLET_TYPES.find(t => t.id === wallet.type) || WALLET_TYPES[3]
  
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md flex flex-col h-full">
      {/* Decorative top accent */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${colorObj.class}`} />
      
      <div className="flex justify-between items-start mb-4 mt-1">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorObj.class} text-white shadow-sm`}>
           <DynamicIcon name={wallet.icon || 'wallet'} className="h-5 w-5" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="-mr-2 text-muted-foreground" />}>
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(wallet)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(wallet.id)} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 flex flex-col">
        <h3 className="font-semibold text-lg line-clamp-1">{wallet.name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{typeObj.label}</p>
        
        {wallet.description ? (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
            {wallet.description}
          </p>
        ) : (
          <div className="mt-3 flex-1" />
        )}
      </div>
    </div>
  )
}
