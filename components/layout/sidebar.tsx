'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Wallet,
  PiggyBank,
  Receipt,
  CalendarDays,
  History,
  Settings,
  ChevronLeft,
  Zap,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { cn } from '@/lib/utils'
import { useSidebar } from './sidebar-provider'
import { Button } from '@/components/ui/button'
import { PayFlowLogo } from '@/components/ui/payflow-logo'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AppSidebarProps {
  user: User
  profile: Pick<Profile, 'display_name' | 'currency'> | null
}

const navItems = [
  { href: '/planner', label: 'Planner', icon: Zap },
  { href: '/wallets', label: 'Wallets', icon: Wallet },
  { href: '/funds', label: 'Funds', icon: PiggyBank },
  { href: '/bills', label: 'Bills', icon: Receipt },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/history', label: 'History', icon: History },
]

export function AppSidebar({ user, profile }: AppSidebarProps) {
  const pathname = usePathname()
  const { isOpen, toggle } = useSidebar()

  return (
    <aside
      className={cn(
        'flex flex-col h-full border-r border-border bg-sidebar transition-all duration-300 ease-in-out flex-shrink-0',
        isOpen ? 'w-60' : 'w-16'
      )}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-3 border-b border-border">
        <Link href="/planner" className="flex items-center gap-2 min-w-0 overflow-hidden">
          <PayFlowLogo size="sm" showText={isOpen} />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className={cn('ml-auto h-7 w-7 flex-shrink-0', !isOpen && 'mx-auto ml-0')}
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          id="sidebar-toggle-btn"
        >
          <ChevronLeft
            className={cn(
              'h-4 w-4 transition-transform duration-300',
              !isOpen && 'rotate-180'
            )}
          />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon

          const linkContent = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                !isOpen && 'justify-center px-0'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {isOpen && <span className="truncate">{item.label}</span>}
            </Link>
          )

          if (!isOpen) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger render={linkContent} />
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            )
          }

          return linkContent
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="p-2 border-t border-border">
        {(() => {
          const isActive = pathname === '/settings'
          const settingsContent = (
            <Link
              href="/settings"
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                !isOpen && 'justify-center px-0'
              )}
            >
              <Settings className="h-4 w-4 flex-shrink-0" />
              {isOpen && <span className="truncate">Settings</span>}
            </Link>
          )

          if (!isOpen) {
            return (
              <Tooltip>
                <TooltipTrigger render={settingsContent} />
                <TooltipContent side="right">Settings</TooltipContent>
              </Tooltip>
            )
          }

          return settingsContent
        })()}
      </div>
    </aside>
  )
}
