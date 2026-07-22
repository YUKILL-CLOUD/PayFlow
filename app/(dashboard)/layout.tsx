import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/layout/header'
import { SidebarProvider } from '@/components/layout/sidebar-provider'
import { ResponsiveNavigation } from '@/components/navigation/responsive-navigation'

export const metadata: Metadata = {
  title: 'Dashboard — PayFlow',
  description: 'Manage your payday plans, bills, funds, and wallets in PayFlow.',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [profileResult, activePaydayResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, currency')
      .eq('id', user.id)
      .single(),
    (supabase as any)
      .from('paydays')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['planned', 'active'])
      .maybeSingle()
  ])

  const profile = profileResult.data
  const hasActivePayday = !!activePaydayResult.data

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <ResponsiveNavigation
          user={user}
          profile={profile}
          hasActivePayday={hasActivePayday}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AppHeader user={user} profile={profile} />
          <main
            id="main-content"
            className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-24 md:pb-8"
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
