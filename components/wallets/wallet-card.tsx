'use client'

import * as React from 'react'
import { WALLET_COLORS, WALLET_TYPES } from '@/lib/constants'
import { DynamicIcon } from '@/components/ui/dynamic-icon'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MoreHorizontal, Pencil, Trash2, ArrowUpRight, ArrowDownLeft, Sliders,
  ChevronDown, ChevronUp, AlertCircle, CheckCircle2, AlertTriangle, Building2,
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatCurrency } from '@/lib/utils'
import type { Database } from '@/types/database'

type Wallet = Database['public']['Tables']['wallets']['Row']
type Bill = Database['public']['Tables']['bills']['Row']
type Fund = Database['public']['Tables']['funds']['Row']

interface EnvelopeItem {
  id: string
  name: string
  sourceType: 'bill'
  reserved: number
  target: number
}

interface WalletCardProps {
  wallet: Wallet
  reservedTotal: number
  envelopes: EnvelopeItem[]
  onEdit: (wallet: Wallet) => void
  onDelete: (id: string) => void
  onOpenBalanceModal: (wallet: Wallet, mode: 'set' | 'deposit' | 'withdraw') => void
  onOpenAdjustModal: (walletId: string, item: EnvelopeItem) => void
}

export function WalletCard({
  wallet,
  reservedTotal,
  envelopes,
  onEdit,
  onDelete,
  onOpenBalanceModal,
  onOpenAdjustModal,
}: WalletCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const colorObj = WALLET_COLORS.find(c => c.id === wallet.color) || WALLET_COLORS[0]
  const typeObj = WALLET_TYPES.find(t => t.id === wallet.type) || WALLET_TYPES[3]

  const currentBalance = wallet.current_balance || 0
  const availableBalance = currentBalance - reservedTotal

  // Wallet Health Badge logic
  let health: { label: string; bg: string; text: string; Icon: any }
  if (currentBalance >= reservedTotal) {
    health = { label: 'Fully Funded', bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', Icon: CheckCircle2 }
  } else if (currentBalance > 0) {
    health = { label: 'Needs Attention', bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', Icon: AlertTriangle }
  } else {
    health = { label: 'Underfunded', bg: 'bg-red-500/10', text: 'text-red-700 dark:text-red-400', Icon: AlertCircle }
  }

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md flex flex-col h-full">
      {/* Decorative top accent */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${colorObj.class}`} />

      <div className="flex justify-between items-start mb-3 mt-1">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorObj.class} text-white shadow-sm`}>
            <DynamicIcon name={wallet.icon || 'wallet'} className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base line-clamp-1">{wallet.name}</h3>
            <p className="text-xs text-muted-foreground">{typeObj.label}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Badge variant="outline" className={`${health.bg} ${health.text} border-0 text-[10px] font-medium`}>
            <health.Icon className="mr-1 h-3 w-3" />
            {health.label}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="-mr-2 text-muted-foreground" />}>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onOpenBalanceModal(wallet, 'set')}>
                <Pencil className="mr-2 h-4 w-4" />
                Set Balance
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(wallet)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(wallet.id)} variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Financial OS v2 Balances Display */}
      <div className="mt-2 grid grid-cols-3 gap-2 p-3 rounded-lg bg-muted/40 border text-center">
        <div>
          <span className="text-[10px] text-muted-foreground block uppercase font-medium">Current</span>
          <span className="text-sm font-bold tracking-tight">{formatCurrency(currentBalance)}</span>
        </div>
        <div className="border-x border-border/50">
          <span className="text-[10px] text-muted-foreground block uppercase font-medium">Reserved</span>
          <span className="text-sm font-bold tracking-tight text-amber-600 dark:text-amber-400">{formatCurrency(reservedTotal)}</span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block uppercase font-medium">Available</span>
          <span className={`text-sm font-bold tracking-tight ${availableBalance < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {formatCurrency(availableBalance)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex items-center gap-2">
        <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => onOpenBalanceModal(wallet, 'deposit')}>
          <ArrowDownLeft className="mr-1 h-3.5 w-3.5 text-emerald-500" />
          Deposit
        </Button>
        <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => onOpenBalanceModal(wallet, 'withdraw')}>
          <ArrowUpRight className="mr-1 h-3.5 w-3.5 text-amber-500" />
          Withdraw
        </Button>
      </div>

      {/* Expandable Envelopes Section */}
      {envelopes.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <button
            type="button"
            onClick={() => setIsExpanded(v => !v)}
            className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            <span>Reserved Envelopes ({envelopes.length})</span>
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {isExpanded && (
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
              {envelopes.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded-md bg-background border text-xs">
                  <div className="min-w-0 pr-2">
                    <span className="font-medium truncate block">{item.name}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">{item.sourceType} • Target: {formatCurrency(item.target)}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(item.reserved)}</span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      title="Adjust reservation"
                      onClick={() => onOpenAdjustModal(wallet.id, item)}
                    >
                      <Sliders className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
