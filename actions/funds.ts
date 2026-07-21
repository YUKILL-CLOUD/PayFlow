'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { fundSchema, type FundInput } from '@/lib/schemas/fund'

// ----------------------------------------------------------------------------
// Server Actions
// ----------------------------------------------------------------------------

export async function createFund(data: FundInput) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'Unauthorized' }
    }

    const parsed = fundSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message }
    }

    const { name, type, wallet_id, priority, recurring_amount, target_amount, current_amount, target_date, start_date, recurrence_type, due_day, notes } = parsed.data

    // Get max sort_order
    const { data: maxOrderData } = await (supabase as any)
      .from('funds')
      .select('sort_order')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextSortOrder = (maxOrderData?.sort_order ?? 0) + 1

    const recurrenceRule = {
      frequency: recurrence_type,
      interval: 1,
      by_day_of_month: recurrence_type === 'monthly' || recurrence_type === 'yearly' ? due_day : null,
    }

    const { error: insertError } = await (supabase as any)
      .from('funds')
      .insert({
        user_id: user.id,
        wallet_id,
        name,
        type,
        priority,
        recurring_amount: type === 'recurring' ? recurring_amount : 0,
        target_amount: type === 'goal' ? target_amount : 0,
        current_amount: type === 'goal' ? current_amount : 0,
        target_date: type === 'goal' ? target_date : null,
        start_date: type === 'goal' ? start_date : null,
        recurrence_type: type === 'recurring' ? recurrence_type : 'every_payday',
        due_day: type === 'recurring' ? due_day : null,
        recurrence_rule: type === 'recurring' ? recurrenceRule : null,
        sort_order: nextSortOrder,
        notes,
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      return { success: false, message: 'Failed to create fund' }
    }

    revalidatePath('/funds')
    return { success: true, message: 'Fund created successfully' }
  } catch (error) {
    console.error('createFund error:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}

export async function updateFund(id: string, data: FundInput) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'Unauthorized' }
    }

    const parsed = fundSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message }
    }

    const { name, type, wallet_id, priority, recurring_amount, target_amount, current_amount, target_date, start_date, recurrence_type, due_day, notes } = parsed.data

    const recurrenceRule = {
      frequency: recurrence_type,
      interval: 1,
      by_day_of_month: recurrence_type === 'monthly' || recurrence_type === 'yearly' ? due_day : null,
    }

    const { error: updateError } = await (supabase as any)
      .from('funds')
      .update({
        wallet_id,
        name,
        type,
        priority,
        recurring_amount: type === 'recurring' ? recurring_amount : 0,
        target_amount: type === 'goal' ? target_amount : 0,
        current_amount: type === 'goal' ? current_amount : 0,
        target_date: type === 'goal' ? target_date : null,
        start_date: type === 'goal' ? start_date : null,
        recurrence_type: type === 'recurring' ? recurrence_type : 'every_payday',
        due_day: type === 'recurring' ? due_day : null,
        recurrence_rule: type === 'recurring' ? recurrenceRule : null,
        notes,
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Update error:', updateError)
      return { success: false, message: 'Failed to update fund' }
    }

    revalidatePath('/funds')
    return { success: true, message: 'Fund updated successfully' }
  } catch (error) {
    console.error('updateFund error:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}

export async function archiveFund(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'Unauthorized' }
    }

    const { error: archiveError } = await (supabase as any)
      .from('funds')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', user.id)

    if (archiveError) {
      console.error('Archive error:', archiveError)
      return { success: false, message: 'Failed to archive fund' }
    }

    revalidatePath('/funds')
    return { success: true, message: 'Fund archived successfully' }
  } catch (error) {
    console.error('archiveFund error:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}
