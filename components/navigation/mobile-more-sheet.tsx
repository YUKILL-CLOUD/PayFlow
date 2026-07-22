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
import { PayFlowLogo } from '@/components/ui/payflow-logo'

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
        <SheetHeader className="text-left mb-4 flex flex-row items-center justify-between">
          <div>
            <SheetTitle className="text-lg font-bold flex items-center gap-2">
              <span>More Options</span>
            </SheetTitle>
            <SheetDescription className="text-xs mt-0.5">
              Access secondary management pages and settings.
            </SheetDescription>
          </div>
          <PayFlowLogo size="sm" showText={false} />
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
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-none">{label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
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
