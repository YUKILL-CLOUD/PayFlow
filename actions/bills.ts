'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { billSchema, type BillInput } from '@/lib/schemas/bill'
import { autoDistributeWalletBalanceToEnvelopes } from '@/actions/wallets'

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

    const {
      name, wallet_id, priority, notes, payee_name,
      bill_type,
      // Recurring fields
      amount, is_variable, recurrence_type, due_day,
      // Installment fields
      total_installments, installment_amount, first_due_date,
    } = parsed.data

    // Get max sort_order
    const { data: maxOrderData } = await (supabase as any)
      .from('bills')
      .select('sort_order')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextSortOrder = (maxOrderData?.sort_order ?? 0) + 1

    // Build the insert payload based on bill_type
    let insertPayload: Record<string, any> = {
      user_id: user.id,
      wallet_id,
      name,
      priority,
      sort_order: nextSortOrder,
      notes,
      payee_name: payee_name || null,
      bill_type,
    }

    if (bill_type === 'recurring') {
      const effectiveRecurrenceType = recurrence_type ?? 'monthly'
      insertPayload = {
        ...insertPayload,
        amount: amount ?? 0,
        is_variable: is_variable ?? false,
        recurrence_type: effectiveRecurrenceType,
        due_day: effectiveRecurrenceType === 'every_payday' ? null : (due_day ?? null),
        recurrence_rule: {
          frequency: effectiveRecurrenceType,
          interval: 1,
          by_day_of_month: (effectiveRecurrenceType === 'monthly' || effectiveRecurrenceType === 'yearly') ? (due_day ?? null) : null,
        },
      }
    } else if (bill_type === 'installment') {
      const effectiveRecurrenceType = recurrence_type ?? 'monthly'
      insertPayload = {
        ...insertPayload,
        amount: installment_amount ?? 0,      // amount mirrors installment_amount for planner compatibility
        is_variable: false,
        recurrence_type: effectiveRecurrenceType,
        due_day: due_day,
        first_due_date: first_due_date || null,
        total_installments: total_installments ?? null,
        installments_paid: 0,
        installment_amount: installment_amount ?? null,
        recurrence_rule: {
          frequency: effectiveRecurrenceType,
          interval: 1,
          by_day_of_month: due_day ?? null,
        },
      }
    } else if (bill_type === 'one_time') {
      insertPayload = {
        ...insertPayload,
        amount: amount ?? 0,
        is_variable: false,
        recurrence_type: 'one_time',
        due_day: null,
        first_due_date: first_due_date || null,
        recurrence_rule: {
          frequency: 'one_time',
          target_date: first_due_date || null,
        },
      }
    }

    const { error: insertError } = await (supabase as any)
      .from('bills')
      .insert(insertPayload)

    if (insertError) {
      console.error('Insert error:', insertError)
      return { success: false, message: 'Failed to create bill' }
    }

    if (wallet_id) {
      await autoDistributeWalletBalanceToEnvelopes(supabase, user.id, wallet_id)
    }

    revalidatePath('/bills')
    revalidatePath('/calendar')
    revalidatePath('/planner')
    revalidatePath('/wallets')
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

    const {
      name, wallet_id, priority, notes, payee_name,
      bill_type,
      amount, is_variable, recurrence_type, due_day,
      total_installments, installment_amount, first_due_date,
    } = parsed.data

    let updatePayload: Record<string, any> = {
      wallet_id,
      name,
      priority,
      notes,
      payee_name: payee_name || null,
      bill_type,
    }

    if (bill_type === 'recurring') {
      const effectiveRecurrenceType = recurrence_type ?? 'monthly'
      updatePayload = {
        ...updatePayload,
        amount: amount ?? 0,
        is_variable: is_variable ?? false,
        recurrence_type: effectiveRecurrenceType,
        due_day: effectiveRecurrenceType === 'every_payday' ? null : (due_day ?? null),
        recurrence_rule: {
          frequency: effectiveRecurrenceType,
          interval: 1,
          by_day_of_month: (effectiveRecurrenceType === 'monthly' || effectiveRecurrenceType === 'yearly') ? (due_day ?? null) : null,
        },
        // Clear installment fields
        total_installments: null,
        installment_amount: null,
        first_due_date: null,
      }
    } else if (bill_type === 'installment') {
      const effectiveRecurrenceType = recurrence_type ?? 'monthly'
      updatePayload = {
        ...updatePayload,
        amount: installment_amount ?? 0,
        is_variable: false,
        recurrence_type: effectiveRecurrenceType,
        due_day: due_day,
        first_due_date: first_due_date || null,
        total_installments: total_installments ?? null,
        installment_amount: installment_amount ?? null,
        recurrence_rule: {
          frequency: effectiveRecurrenceType,
          interval: 1,
          by_day_of_month: due_day ?? null,
        },
      }
    } else if (bill_type === 'one_time') {
      updatePayload = {
        ...updatePayload,
        amount: amount ?? 0,
        is_variable: false,
        recurrence_type: 'one_time',
        due_day: null,
        first_due_date: first_due_date || null,
        recurrence_rule: {
          frequency: 'one_time',
          target_date: first_due_date || null,
        },
        total_installments: null,
        installment_amount: null,
      }
    }

    const { error: updateError } = await (supabase as any)
      .from('bills')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Update error:', updateError)
      return { success: false, message: 'Failed to update bill' }
    }

    if (wallet_id) {
      await autoDistributeWalletBalanceToEnvelopes(supabase, user.id, wallet_id)
    }

    revalidatePath('/bills')
    revalidatePath('/calendar')
    revalidatePath('/planner')
    revalidatePath('/wallets')
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

    const { data: bill } = await (supabase as any)
      .from('bills')
      .select('wallet_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    const { error: archiveError } = await (supabase as any)
      .from('bills')
      .update({ is_active: false, status: 'archived' })
      .eq('id', id)
      .eq('user_id', user.id)

    if (archiveError) {
      console.error('Archive error:', archiveError)
      return { success: false, message: 'Failed to archive bill' }
    }

    if (bill?.wallet_id) {
      await autoDistributeWalletBalanceToEnvelopes(supabase, user.id, bill.wallet_id)
    }

    revalidatePath('/bills')
    revalidatePath('/calendar')
    revalidatePath('/planner')
    revalidatePath('/wallets')
    return { success: true, message: 'Bill archived successfully' }
  } catch (error) {
    console.error('archiveBill error:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}

/**
 * Auto-progression: Called when a payday is locked.
 * Increments installments_paid for completed installment bill allocations.
 * Auto-completes installment bills at 100%. Auto-archives one-time bills.
 * This keeps the planner as the single source of truth for installment tracking.
 */
export async function progressBillsOnPaydayLock(paydayId: string, userId: string) {
  try {
    const supabase = await createClient()

    // Fetch all completed allocations for this payday that reference a bill
    const { data: completedAllocations, error: allocError } = await (supabase as any)
      .from('allocations')
      .select('bill_id')
      .eq('payday_id', paydayId)
      .eq('user_id', userId)
      .eq('is_completed', true)
      .not('bill_id', 'is', null)

    if (allocError || !completedAllocations || completedAllocations.length === 0) {
      return // No completed bill allocations — nothing to progress
    }

    const billIds = [...new Set(completedAllocations.map((a: any) => a.bill_id))] as string[]

    // Fetch those bills
    const { data: bills, error: billsError } = await (supabase as any)
      .from('bills')
      .select('id, bill_type, total_installments, installments_paid, is_active')
      .in('id', billIds)
      .eq('user_id', userId)
      .eq('is_active', true)

    if (billsError || !bills) return

    for (const bill of bills) {
      if (bill.bill_type === 'installment') {
        const newPaid = (bill.installments_paid ?? 0) + 1
        const isFullyPaid = bill.total_installments && newPaid >= bill.total_installments

        await (supabase as any)
          .from('bills')
          .update({
            installments_paid: newPaid,
            ...(isFullyPaid
              ? { is_active: false, status: 'completed' }
              : {}
            ),
          })
          .eq('id', bill.id)
          .eq('user_id', userId)

      } else if (bill.bill_type === 'one_time') {
        await (supabase as any)
          .from('bills')
          .update({ is_active: false, status: 'archived' })
          .eq('id', bill.id)
          .eq('user_id', userId)
      }
    }

    revalidatePath('/bills')
  } catch (error) {
    console.error('progressBillsOnPaydayLock error:', error)
    // Non-critical — don't fail the payday lock if this fails
  }
}
