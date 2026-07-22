import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsClient } from '@/components/settings/settings-client'

export const metadata = {
  title: 'Account & Payday Settings',
  description: 'Manage your account and payday schedule preferences.',
}

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure your profile and payday schedule. The planner uses your schedule to calculate how many paydays remain before each obligation.
        </p>
      </div>

      <SettingsClient profile={profile} />
    </div>
  )
}
