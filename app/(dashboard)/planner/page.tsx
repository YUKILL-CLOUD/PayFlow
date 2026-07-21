import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PlannerSetup } from '@/components/planner/planner-setup'
import { PlannerDashboard } from '@/components/planner/planner-dashboard'
import { DashboardHome } from '@/components/dashboard/dashboard-home'

export const metadata = {
  title: 'Financial OS — Payday Planner & Dashboard',
  description: 'Design and execute your payday allocation plan.',
}

export default async function PlannerPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 1. Check if there is an active/planned payday plan in progress
  const { data: activePayday } = await (supabase as any)
    .from('paydays')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['planned', 'active'])
    .maybeSingle()

  if (activePayday) {
    // Fetch active payday's allocations and active wallets
    const [allocationsResult, walletsResult] = await Promise.all([
      (supabase as any)
        .from('allocations')
        .select('*')
        .eq('payday_id', activePayday.id)
        .eq('user_id', user.id)
        .order('execution_order', { ascending: true }),
      (supabase as any)
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
    ])

    return (
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Checklist</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Transfer allocations to their designated wallets and check them off.
          </p>
        </div>
        <PlannerDashboard
          payday={activePayday}
          allocations={allocationsResult.data || []}
          wallets={walletsResult.data || []}
        />
      </div>
    )
  }

  // 2. Otherwise, fetch active wallets, bills, funds, profile, and recent completed paydays
  const [billsResult, fundsResult, walletsResult, profileResult, recentPaydaysResult] = await Promise.all([
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
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    (supabase as any)
      .from('paydays')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('payday_date', { ascending: false })
      .limit(3)
  ])

  const wallets = walletsResult.data || []
  const hasWallets = wallets.length > 0

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Financial Command Center</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Overview of your financial health, upcoming obligations, and payday planner setup.
        </p>
      </div>

      {!hasWallets ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center max-w-lg mx-auto">
          <h3 className="text-lg font-semibold">Create a wallet first</h3>
          <p className="text-sm text-muted-foreground mb-4">
            You must have at least one active wallet before you can plan a payday. Go to the Wallets page to add one.
          </p>
          <a href="/wallets">
            <span className="inline-flex items-center justify-center rounded-md text-sm font-semibold h-10 px-4 py-2 bg-primary text-primary-foreground">
              Add Wallet
            </span>
          </a>
        </div>
      ) : (
        <DashboardHome
          bills={billsResult.data || []}
          funds={fundsResult.data || []}
          wallets={wallets}
          profile={profileResult.data!}
          recentPaydays={recentPaydaysResult.data || []}
        >
          <PlannerSetup
            bills={billsResult.data || []}
            funds={fundsResult.data || []}
            profile={profileResult.data!}
          />
        </DashboardHome>
      )}
    </div>
  )
}
