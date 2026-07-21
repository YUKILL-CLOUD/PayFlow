'use client'

import * as React from 'react'
import { updateProfileAction } from '@/actions/profiles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save, Settings2, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type PaydaySchedule = Database['public']['Enums']['payday_schedule']

const SCHEDULE_OPTIONS: { value: PaydaySchedule; label: string; description: string }[] = [
  { value: 'weekly', label: 'Weekly', description: 'Every 7 days from your anchor date' },
  { value: 'bi_weekly', label: 'Bi-Weekly', description: 'Every 14 days from your anchor date' },
  { value: 'semi_monthly', label: 'Semi-Monthly', description: 'Two fixed days each month (e.g. 15th & 30th)' },
  { value: 'monthly', label: 'Monthly', description: 'One fixed day each month' },
]

interface SettingsClientProps {
  profile: Profile
}

export function SettingsClient({ profile }: SettingsClientProps) {
  const [displayName, setDisplayName] = React.useState(profile.display_name || '')
  const [currency, setCurrency] = React.useState(profile.currency || 'PHP')
  const [schedule, setSchedule] = React.useState<PaydaySchedule>(profile.payday_schedule)
  const [paydayDay1, setPaydayDay1] = React.useState<number>(
    Array.isArray(profile.payday_dates) ? (profile.payday_dates as number[])[0] || 15 : 15
  )
  const [paydayDay2, setPaydayDay2] = React.useState<number>(
    Array.isArray(profile.payday_dates) ? (profile.payday_dates as number[])[1] || 30 : 30
  )
  const [anchorDate, setAnchorDate] = React.useState<string>(
    profile.payday_start_date || new Date().toISOString().split('T')[0]
  )
  const [isSaving, setIsSaving] = React.useState(false)

  const handleSave = async () => {
    setIsSaving(true)

    let payday_dates: number[] | null = null
    let payday_start_date: string | null = null

    if (schedule === 'semi_monthly') {
      payday_dates = [paydayDay1, paydayDay2].sort((a, b) => a - b)
    } else if (schedule === 'monthly') {
      payday_dates = [paydayDay1]
    } else if (schedule === 'weekly' || schedule === 'bi_weekly') {
      payday_start_date = anchorDate
    }

    const result = await updateProfileAction({
      display_name: displayName || null,
      currency,
      payday_schedule: schedule,
      payday_dates,
      payday_start_date,
    })

    setIsSaving(false)

    if (result.success) {
      toast.success(result.message || 'Settings saved!')
    } else {
      toast.error(result.message || 'Failed to save settings.')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in-50 duration-300">
      {/* Profile Section */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Settings2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Profile</h2>
            <p className="text-xs text-muted-foreground">Your display name and currency preferences.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PHP">₱ PHP — Philippine Peso</SelectItem>
                <SelectItem value="USD">$ USD — US Dollar</SelectItem>
                <SelectItem value="EUR">€ EUR — Euro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Payday Schedule Section */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Payday Schedule</h2>
            <p className="text-xs text-muted-foreground">
              Configure how often you receive your salary. The planner uses this to calculate how many paydays remain before each bill's due date.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schedule-type">Pay Frequency</Label>
            <Select value={schedule} onValueChange={(v) => v && setSchedule(v as PaydaySchedule)}>
              <SelectTrigger id="schedule-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-muted-foreground ml-2 text-xs">— {opt.description}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Semi-monthly: two day-of-month pickers */}
          {schedule === 'semi_monthly' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border">
              <div className="space-y-2">
                <Label htmlFor="payday-day1">First Payday (Day of Month)</Label>
                <Input
                  id="payday-day1"
                  type="number"
                  min={1}
                  max={31}
                  value={paydayDay1}
                  onChange={(e) => setPaydayDay1(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payday-day2">Second Payday (Day of Month)</Label>
                <Input
                  id="payday-day2"
                  type="number"
                  min={1}
                  max={31}
                  value={paydayDay2}
                  onChange={(e) => setPaydayDay2(parseInt(e.target.value) || 30)}
                />
              </div>
            </div>
          )}

          {/* Monthly: one day-of-month picker */}
          {schedule === 'monthly' && (
            <div className="p-4 bg-muted/30 rounded-lg border">
              <div className="space-y-2 max-w-[200px]">
                <Label htmlFor="payday-day-monthly">Payday (Day of Month)</Label>
                <Input
                  id="payday-day-monthly"
                  type="number"
                  min={1}
                  max={31}
                  value={paydayDay1}
                  onChange={(e) => setPaydayDay1(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
          )}

          {/* Weekly / Bi-weekly: anchor date */}
          {(schedule === 'weekly' || schedule === 'bi_weekly') && (
            <div className="p-4 bg-muted/30 rounded-lg border space-y-2">
              <div className="space-y-2 max-w-[250px]">
                <Label htmlFor="anchor-date">
                  Anchor Payday Date
                </Label>
                <Input
                  id="anchor-date"
                  type="date"
                  value={anchorDate}
                  onChange={(e) => setAnchorDate(e.target.value)}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Pick any past or future payday. The planner will generate every {schedule === 'weekly' ? '7' : '14'} days from this anchor to find your scheduled paydays.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={isSaving} className="w-full font-semibold" size="lg">
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Save Settings
      </Button>
    </div>
  )
}
