'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'

type PaydaySchedule = Database['public']['Enums']['payday_schedule']

interface UpdateProfileInput {
  display_name?: string | null
  currency?: string
  payday_schedule?: PaydaySchedule
  payday_dates?: number[] | null
  payday_start_date?: string | null
}

export async function updateProfileAction(input: UpdateProfileInput) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'Unauthorized' }
    }

    const updateData: any = {}

    if (input.display_name !== undefined) updateData.display_name = input.display_name
    if (input.currency !== undefined) updateData.currency = input.currency
    if (input.payday_schedule !== undefined) updateData.payday_schedule = input.payday_schedule
    if (input.payday_dates !== undefined) updateData.payday_dates = input.payday_dates
    if (input.payday_start_date !== undefined) updateData.payday_start_date = input.payday_start_date

    const { error: updateError } = await (supabase as any)
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return { success: false, message: 'Failed to update profile settings.' }
    }

    revalidatePath('/settings')
    revalidatePath('/planner')
    return { success: true, message: 'Profile updated successfully!' }
  } catch (error) {
    console.error('updateProfileAction error:', error)
    return { success: false, message: 'An unexpected error occurred.' }
  }
}

export async function getProfileAction() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'Unauthorized' }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { success: false, message: 'Profile not found.' }
    }

    return { success: true, profile }
  } catch (error) {
    console.error('getProfileAction error:', error)
    return { success: false, message: 'An unexpected error occurred.' }
  }
}
