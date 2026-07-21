import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CalendarClient } from '@/components/calendar/calendar-client'

export const metadata = {
  title: 'Financial OS — Calendar View',
  description: 'Visual monthly financial calendar plotting paydays, bill due dates, and fund targets.',
}

export default async function CalendarPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Parallel fetch user profile, active bills, funds, paydays, and wallets
  const [profileResult, billsResult, fundsResult, paydaysResult, walletsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    (supabase as any)
      .from('bills')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    (supabase as any)
      .from('funds')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    (supabase as any)
      .from('paydays')
      .select('*')
      .eq('user_id', user.id)
      .order('payday_date', { ascending: true }),
    (supabase as any)
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
  ])

  const profile = profileResult.data
  if (!profile) {
    redirect('/login')
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Financial Calendar</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Visualize scheduled paydays, upcoming bill due dates, and savings targets across the month.
        </p>
      </div>

      <CalendarClient
        profile={profile}
        bills={billsResult.data || []}
        funds={fundsResult.data || []}
        paydays={paydaysResult.data || []}
        wallets={walletsResult.data || []}
      />
    </div>
  )
}
