'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Plus,
  Zap,
  Receipt,
  PiggyBank,
  Wallet,
  Play,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

interface FloatingActionButtonProps {
  hasActivePayday?: boolean
}

// Pages where FAB should NOT be visible
const HIDDEN_PATHS = [
  '/settings',
  '/history',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
]

export function FloatingActionButton({ hasActivePayday = false }: FloatingActionButtonProps) {
  const pathname = usePathname()

  // Hide FAB on settings, history, auth pages, etc.
  const isHidden = HIDDEN_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`))
  if (isHidden) return null

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg shadow-primary/25 bg-primary text-primary-foreground hover:bg-primary/90 transition-transform active:scale-95 flex items-center justify-center cursor-pointer outline-none"
              aria-label="Quick financial actions"
            >
              <Plus className="h-6 w-6" />
            </Button>
          }
        />

        <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 shadow-xl bg-card border">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase font-semibold tracking-wider px-2 py-1">
              Quick Actions
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />

          {/* Primary Payday Action */}
          <DropdownMenuItem
            render={
              <Link href="/planner" className="flex items-center gap-2 w-full px-2.5 py-2 text-sm font-semibold text-primary rounded-md hover:bg-accent transition-colors">
                {hasActivePayday ? (
                  <>
                    <Play className="h-4 w-4 fill-primary" />
                    <span>Continue Active Plan</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    <span>Generate Payday Plan</span>
                  </>
                )}
              </Link>
            }
          />

          <DropdownMenuSeparator />

          {/* Entity Quick Action Workflows */}
          <DropdownMenuItem
            render={
              <Link href="/bills?action=new" className="flex items-center gap-2 w-full px-2.5 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors">
                <Receipt className="h-4 w-4 text-rose-500" />
                <span>New Bill</span>
              </Link>
            }
          />

          <DropdownMenuItem
            render={
              <Link href="/funds?action=new" className="flex items-center gap-2 w-full px-2.5 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors">
                <PiggyBank className="h-4 w-4 text-blue-500" />
                <span>New Fund</span>
              </Link>
            }
          />

          <DropdownMenuItem
            render={
              <Link href="/wallets?action=new" className="flex items-center gap-2 w-full px-2.5 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors">
                <Wallet className="h-4 w-4 text-emerald-500" />
                <span>New Wallet</span>
              </Link>
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
