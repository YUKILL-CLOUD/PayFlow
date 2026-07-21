import { createClient } from '@/lib/supabase/server'
import { WalletsClient } from '@/components/wallets/wallets-client'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Financial OS — Wallets',
  description: 'Manage your accounts and cash destinations.',
}

export default async function WalletsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: wallets, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching wallets:', error)
  }

  return (
    <div className="p-6">
      <WalletsClient initialWallets={wallets || []} />
    </div>
  )
}
