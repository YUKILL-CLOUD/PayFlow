'use client'

import * as React from 'react'
import { useTransition } from 'react'
import { LogOut, Settings, Menu, Sun, Moon } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { logoutAction } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useSidebar } from './sidebar-provider'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AppHeaderProps {
  user: User
  profile: Pick<Profile, 'display_name' | 'currency'> | null
}

function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email.slice(0, 2).toUpperCase()
}

export function AppHeader({ user, profile }: AppHeaderProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { toggle } = useSidebar()
  const [isPending, startTransition] = useTransition()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const displayName = profile?.display_name || user.email || 'User'
  const initials = getInitials(profile?.display_name, user.email || '')

  const isDark = mounted ? (resolvedTheme === 'dark' || theme === 'dark') : false

  function handleLogout() {
    startTransition(async () => {
      await logoutAction()
    })
  }

  return (
    <header className="flex items-center h-14 px-4 border-b border-border bg-background flex-shrink-0 gap-3">
      {/* Mobile sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        className="md:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="h-4 w-4" />
      </Button>

      <div className="flex-1" />

      {/* Account Menu with Dark Mode Switch */}
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <Button
            variant="ghost"
            className="relative h-8 w-8 rounded-full p-0 border overflow-hidden hover:opacity-90 transition-opacity"
            id="user-menu-btn"
            aria-label="User account menu"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        } />
        <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 shadow-xl bg-card border">
          {/* User Profile Header */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="p-2">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none text-foreground">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Dark Mode Switch Toggle Item */}
          <DropdownMenuGroup>
            <div
              className="flex items-center justify-between px-2.5 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors cursor-pointer select-none"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
            >
              <div className="flex items-center gap-2">
                {isDark ? (
                  <Moon className="h-4 w-4 text-indigo-400" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-500" />
                )}
                <span className="text-sm font-medium text-foreground">Dark Mode</span>
              </div>
              <Switch
                checked={isDark}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Account Settings */}
          <DropdownMenuItem render={
            <Link href="/settings" id="user-menu-settings" className="flex items-center gap-2 w-full px-2.5 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span>Settings</span>
            </Link>
          } />

          <DropdownMenuSeparator />

          {/* Sign Out */}
          <DropdownMenuItem
            onClick={handleLogout}
            disabled={isPending}
            className="flex items-center gap-2 w-full px-2.5 py-2 text-sm font-medium text-destructive focus:text-destructive rounded-md hover:bg-destructive/10 cursor-pointer transition-colors"
            id="user-menu-logout"
          >
            <LogOut className="h-4 w-4 text-destructive" />
            <span>{isPending ? 'Signing out...' : 'Sign out'}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
