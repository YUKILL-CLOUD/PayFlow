import { createClient } from '@/lib/supabase/server'
import { BillsClient } from '@/components/bills/bills-client'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Financial OS — Bills',
  description: 'Manage your external obligations and repeating payments.',
}

export default async function BillsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const [billsResult, walletsResult, profileResult] = await Promise.all([
    (supabase as any)
      .from('bills')
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
      <BillsClient
        initialBills={billsResult.data || []}
        wallets={walletsResult.data || []}
        profile={profileResult.data as any}
      />
    </div>
  )
}
