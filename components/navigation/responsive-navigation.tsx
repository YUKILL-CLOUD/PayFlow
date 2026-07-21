'use client'

import * as React from 'react'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { DesktopSidebar } from './desktop-sidebar'
import { MobileBottomNav } from './mobile-bottom-nav'
import { FloatingActionButton } from './floating-action-button'

type Profile = Database['public']['Tables']['profiles']['Row']

interface ResponsiveNavigationProps {
  user: User
  profile: Pick<Profile, 'display_name' | 'currency'> | null
  hasActivePayday?: boolean
}

export function ResponsiveNavigation({ user, profile, hasActivePayday = false }: ResponsiveNavigationProps) {
  return (
    <>
      <DesktopSidebar user={user} profile={profile} />
      <MobileBottomNav />
      <FloatingActionButton hasActivePayday={hasActivePayday} />
    </>
  )
}
