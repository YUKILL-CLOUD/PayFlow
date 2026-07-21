import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HistoryClient } from '@/components/history/history-client'

export const metadata = {
  title: 'Financial OS — Payday History',
  description: 'View your past locked payday allocations.',
}

export default async function HistoryPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch completed paydays
  const { data: completedPaydays } = await (supabase as any)
    .from('paydays')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('payday_date', { ascending: false })

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payday History</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review all confirmed and locked past payday allocations.
        </p>
      </div>

      <HistoryClient completedPaydays={completedPaydays || []} />
    </div>
  )
}
