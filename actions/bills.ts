'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { billSchema, type BillInput } from '@/lib/schemas/bill'

// ----------------------------------------------------------------------------
// Server Actions
// ----------------------------------------------------------------------------

export async function createBill(data: BillInput) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'Unauthorized' }
    }

    const parsed = billSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message }
    }

    const { name, amount, is_variable, wallet_id, priority, recurrence_type, due_day, notes } = parsed.data

    // Get max sort_order
    const { data: maxOrderData } = await (supabase as any)
      .from('bills')
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
      .from('bills')
      .insert({
        user_id: user.id,
        wallet_id,
        name,
        amount,
        is_variable,
        priority,
        recurrence_type,
        due_day: recurrence_type === 'every_payday' ? null : due_day,
        recurrence_rule: recurrenceRule,
        sort_order: nextSortOrder,
        notes,
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      return { success: false, message: 'Failed to create bill' }
    }

    revalidatePath('/bills')
    return { success: true, message: 'Bill created successfully' }
  } catch (error) {
    console.error('createBill error:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}

export async function updateBill(id: string, data: BillInput) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'Unauthorized' }
    }

    const parsed = billSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message }
    }

    const { name, amount, is_variable, wallet_id, priority, recurrence_type, due_day, notes } = parsed.data

    const recurrenceRule = {
      frequency: recurrence_type,
      interval: 1,
      by_day_of_month: recurrence_type === 'monthly' || recurrence_type === 'yearly' ? due_day : null,
    }

    const { error: updateError } = await (supabase as any)
      .from('bills')
      .update({
        wallet_id,
        name,
        amount,
        is_variable,
        priority,
        recurrence_type,
        due_day: recurrence_type === 'every_payday' ? null : due_day,
        recurrence_rule: recurrenceRule,
        notes,
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Update error:', updateError)
      return { success: false, message: 'Failed to update bill' }
    }

    revalidatePath('/bills')
    return { success: true, message: 'Bill updated successfully' }
  } catch (error) {
    console.error('updateBill error:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}

export async function archiveBill(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'Unauthorized' }
    }

    const { error: archiveError } = await (supabase as any)
      .from('bills')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', user.id)

    if (archiveError) {
      console.error('Archive error:', archiveError)
      return { success: false, message: 'Failed to archive bill' }
    }

    revalidatePath('/bills')
    return { success: true, message: 'Bill archived successfully' }
  } catch (error) {
    console.error('archiveBill error:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}
