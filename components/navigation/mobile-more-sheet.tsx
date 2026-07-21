'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Receipt,
  PiggyBank,
  Wallet,
  Settings,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileMoreSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const secondaryNavItems = [
  { href: '/bills', label: 'Bills', description: 'Track external obligations', icon: Receipt },
  { href: '/funds', label: 'Funds', description: 'Savings goals & recurring pools', icon: PiggyBank },
  { href: '/wallets', label: 'Wallets', description: 'Storage containers', icon: Wallet },
  { href: '/settings', label: 'Settings', description: 'Pay schedule & account', icon: Settings },
]

export function MobileMoreSheet({ open, onOpenChange }: MobileMoreSheetProps) {
  const pathname = usePathname()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-6">
        <SheetHeader className="text-left mb-4">
          <SheetTitle className="text-lg font-bold">More Options</SheetTitle>
          <SheetDescription className="text-xs">
            Access secondary management pages and settings.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-2">
          {secondaryNavItems.map(({ href, label, description, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`)

            return (
              <Link
                key={href}
                href={href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  'flex items-center justify-between p-3.5 rounded-xl border transition-colors',
                  isActive
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-card border-border hover:bg-accent/40 text-foreground'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-9 w-9 rounded-lg flex items-center justify-center',
                    isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-[11px] text-muted-foreground">{description}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
