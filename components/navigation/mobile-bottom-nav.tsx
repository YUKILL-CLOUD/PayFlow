'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Zap,
  CalendarDays,
  History,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MobileMoreSheet } from './mobile-more-sheet'

export function MobileBottomNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = React.useState(false)

  const primaryItems = [
    { href: '/planner', label: 'Planner', icon: Zap },
    { href: '/calendar', label: 'Calendar', icon: CalendarDays },
    { href: '/history', label: 'History', icon: History },
  ]

  const isSecondaryActive = ['/bills', '/funds', '/wallets', '/settings'].some(
    path => pathname === path || pathname.startsWith(`${path}/`)
  )

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-md border-t border-border z-40 flex items-center justify-around px-2">
        {primaryItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`)

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center w-16 h-12 rounded-lg text-xs font-medium transition-colors',
                isActive
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5 mb-0.5', isActive && 'scale-110')} />
              <span>{label}</span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            'flex flex-col items-center justify-center w-16 h-12 rounded-lg text-xs font-medium transition-colors',
            isSecondaryActive
              ? 'text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <MoreHorizontal className={cn('h-5 w-5 mb-0.5', isSecondaryActive && 'scale-110')} />
          <span>More</span>
        </button>
      </div>

      <MobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  )
}
