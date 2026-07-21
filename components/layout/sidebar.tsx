'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
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
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-primary-foreground font-bold text-sm">F</span>
          </div>
          {isOpen && (
            <span className="font-semibold text-sm text-foreground truncate">
              Financial OS
            </span>
          )}
        </div>
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
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Tooltip key={href}>
              <TooltipTrigger render={
                <Link
                  href={href}
                  id={`nav-${label.toLowerCase()}`}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {isOpen && <span className="truncate">{label}</span>}
                </Link>
              } />
              {!isOpen && (
                <TooltipContent side="right">
                  <p>{label}</p>
                </TooltipContent>
              )}
            </Tooltip>
          )
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="px-2 pb-4 border-t border-border pt-4">
        <Tooltip>
          <TooltipTrigger render={
            <Link
              href="/settings"
              id="nav-settings"
              className={cn(
                'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                pathname === '/settings'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Settings className="h-4 w-4 flex-shrink-0" />
              {isOpen && <span className="truncate">Settings</span>}
            </Link>
          } />
          {!isOpen && (
            <TooltipContent side="right">
              <p>Settings</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </aside>
  )
}
