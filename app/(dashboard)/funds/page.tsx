import { createClient } from '@/lib/supabase/server'
import { FundsClient } from '@/components/funds/funds-client'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Savings Goals & Funds',
  description: 'Manage your savings goals and recurring allocations.',
}

export default async function FundsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const [fundsResult, walletsResult, profileResult] = await Promise.all([
    (supabase as any)
      .from('funds')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    (supabase as any)
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
  ])

  return (
    <div className="p-6">
      <FundsClient
        initialFunds={fundsResult.data || []}
        wallets={walletsResult.data || []}
        profile={profileResult.data as any}
      />
    </div>
  )
}
