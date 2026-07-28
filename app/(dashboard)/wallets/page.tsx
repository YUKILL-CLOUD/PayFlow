import { createClient } from '@/lib/supabase/server'
import { WalletsClient } from '@/components/wallets/wallets-client'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Storage Wallets — Financial OS',
  description: 'Manage your accounts, cash destinations, and reserved envelopes.',
}

export default async function WalletsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const todayStr = new Date().toISOString().split('T')[0]

  const [walletsResult, billsResult, fundsResult, reservationsResult] = await Promise.all([
    (supabase as any)
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    (supabase as any)
      .from('bills')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true),
    (supabase as any)
      .from('funds')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true),
    (supabase as any)
      .from('wallet_reservation_entries')
      .select('*')
      .eq('user_id', user.id)
      .lte('cycle_start', todayStr)
      .gte('cycle_end', todayStr)
  ])

  return (
    <div className="p-6">
      <WalletsClient
        initialWallets={walletsResult.data || []}
        bills={billsResult.data || []}
        funds={fundsResult.data || []}
        reservationEntries={reservationsResult.data || []}
      />
    </div>
  )
}
