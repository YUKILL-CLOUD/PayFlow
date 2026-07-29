'use client'

import * as React from 'react'
import { WALLET_COLORS, WALLET_TYPES } from '@/lib/constants'
import { DynamicIcon } from '@/components/ui/dynamic-icon'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MoreHorizontal, Pencil, Trash2, ArrowUpRight, ArrowDownLeft, Sliders,
  ChevronDown, ChevronUp, AlertCircle, CheckCircle2, AlertTriangle,
  RefreshCw, Settings2, BadgeDollarSign,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency } from '@/lib/utils'
import { syncWalletEnvelopes } from '@/actions/wallets'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type Wallet = Database['public']['Tables']['wallets']['Row']

export interface EnvelopeItem {
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
  featured?: boolean
  onEdit: (wallet: Wallet) => void
  onDelete: (id: string) => void
  onOpenBalanceModal: (wallet: Wallet, mode: 'set' | 'deposit' | 'withdraw') => void
  onOpenAdjustModal: (walletId: string, item: EnvelopeItem) => void
}

export function WalletCard({
  wallet,
  reservedTotal,
  envelopes,
  featured = false,
  onEdit,
  onDelete,
  onOpenBalanceModal,
  onOpenAdjustModal,
}: WalletCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [syncing, setSyncing] = React.useState(false)
  const colorObj = WALLET_COLORS.find(c => c.id === wallet.color) || WALLET_COLORS[0]
  const typeObj = WALLET_TYPES.find(t => t.id === wallet.type) || WALLET_TYPES[3]

  const currentBalance = wallet.current_balance || 0
  const availableBalance = currentBalance - reservedTotal
  const fundedPct = reservedTotal > 0 ? Math.min(100, (currentBalance / reservedTotal) * 100) : 100

  // Wallet Health Badge logic
  let health: { label: string; bg: string; text: string; bar: string; Icon: any }
  if (currentBalance >= reservedTotal) {
    health = {
      label: 'Fully Funded',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-600 dark:text-emerald-400',
      bar: 'bg-emerald-500',
      Icon: CheckCircle2,
    }
  } else if (currentBalance > 0) {
    health = {
      label: 'Needs Attention',
      bg: 'bg-amber-500/10',
      text: 'text-amber-600 dark:text-amber-400',
      bar: 'bg-amber-500',
      Icon: AlertTriangle,
    }
  } else {
    health = {
      label: 'Underfunded',
      bg: 'bg-red-500/10',
      text: 'text-red-600 dark:text-red-400',
      bar: 'bg-red-500',
      Icon: AlertCircle,
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    const result = await syncWalletEnvelopes(wallet.id)
    setSyncing(false)
    if (result.success) {
      toast.success(result.message)
    } else {
      toast.error(result.message)
    }
  }

  return (
    <div
      className={`
        group relative rounded-2xl border bg-card shadow-sm
        transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5
        flex flex-col h-full
        ${featured ? 'ring-2 ring-primary/20' : ''}
      `}
    >
      {/* Color accent bar — sits inside a clipping wrapper so it doesn't affect the dropdown portal */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl overflow-hidden pointer-events-none">
        <div className={`w-full h-full ${colorObj.class}`} />
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 p-4 sm:p-5 pt-5">

        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorObj.class} text-white shadow-sm`}>
              <DynamicIcon name={wallet.icon || 'wallet'} className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-1">{wallet.name}</h3>
              <p className="text-[11px] text-muted-foreground">{typeObj.label}</p>
            </div>
          </div>

          {/* Three-dot menu — redesigned */}
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 opacity-60 group-hover:opacity-100 transition-opacity"
              />
            }>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Balance</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onOpenBalanceModal(wallet, 'set')}>
                <BadgeDollarSign className="mr-2 h-4 w-4 text-blue-500" />
                Set Balance
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSync} disabled={syncing}>
                <RefreshCw className={`mr-2 h-4 w-4 text-emerald-500 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing…' : 'Sync Envelopes'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Wallet</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(wallet)}>
                <Settings2 className="mr-2 h-4 w-4" />
                Edit Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(wallet.id)} variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Wallet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Current Balance — hero number */}
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Current Balance</p>
          <p className={`font-bold tracking-tight ${featured ? 'text-3xl sm:text-4xl' : 'text-2xl'}`}>
            {formatCurrency(currentBalance)}
          </p>
        </div>

        {/* Health badge + funding progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <Badge variant="outline" className={`${health.bg} ${health.text} border-0 text-[10px] font-medium px-2 py-0.5 gap-1`}>
              <health.Icon className="h-3 w-3" />
              {health.label}
            </Badge>
            {reservedTotal > 0 && (
              <span className="text-[10px] text-muted-foreground">{Math.round(fundedPct)}% funded</span>
            )}
          </div>
          {/* Funding progress bar */}
          {reservedTotal > 0 && (
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${health.bar}`}
                style={{ width: `${fundedPct}%` }}
              />
            </div>
          )}
        </div>

        {/* Reserved / Available row */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="rounded-lg bg-muted/40 border px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Reserved</p>
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatCurrency(reservedTotal)}</p>
          </div>
          <div className="rounded-lg bg-muted/40 border px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Available</p>
            <p className={`text-sm font-bold ${availableBalance < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatCurrency(availableBalance)}
            </p>
          </div>
        </div>

        {/* Deposit / Withdraw action buttons */}
        <div className="flex gap-2 mb-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-xs font-medium rounded-lg hover:bg-emerald-500/5 hover:border-emerald-500/30 hover:text-emerald-600 transition-colors"
            onClick={() => onOpenBalanceModal(wallet, 'deposit')}
          >
            <ArrowDownLeft className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
            Deposit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-xs font-medium rounded-lg hover:bg-amber-500/5 hover:border-amber-500/30 hover:text-amber-600 transition-colors"
            onClick={() => onOpenBalanceModal(wallet, 'withdraw')}
          >
            <ArrowUpRight className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
            Withdraw
          </Button>
        </div>

        {/* Expandable Envelopes */}
        {envelopes.length > 0 && (
          <div className="border-t mt-2 pt-3">
            <button
              type="button"
              onClick={() => setIsExpanded(v => !v)}
              className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              <span>Reserved Envelopes ({envelopes.length})</span>
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {isExpanded && (
              <div className="mt-2 space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
                {envelopes.map((item) => {
                  const fillPct = item.target > 0 ? Math.min(100, (item.reserved / item.target) * 100) : 0
                  return (
                    <div key={item.id} className="rounded-lg bg-muted/30 border px-3 py-2 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate pr-2">{item.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(item.reserved)}</span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-5 w-5 rounded text-muted-foreground hover:text-foreground"
                            title="Adjust reservation"
                            onClick={() => onOpenAdjustModal(wallet.id, item)}
                          >
                            <Sliders className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-500 transition-all duration-300"
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-muted-foreground shrink-0">
                          of {formatCurrency(item.target)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
