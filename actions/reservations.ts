'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { reservationAdjustmentSchema, type ReservationAdjustmentInput } from '@/lib/schemas/reservation'

/**
 * Manually adjusts the reserved amount for a specific obligation (bill or goal).
 * Calculates the delta between requested new_reserved_amount and current sum in cycle,
 * then inserts a 'manual_adjustment' ledger entry with the specified reason.
 */
export async function adjustReservationAction(data: ReservationAdjustmentInput) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'Unauthorized' }
    }

    const parsed = reservationAdjustmentSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message }
    }

    const { wallet_id, source_type, source_id, new_reserved_amount, reason, notes, cycle_start, cycle_end } = parsed.data

    // 1. Calculate current reserved sum in active cycle
    const { data: existingEntries } = await (supabase as any)
      .from('wallet_reservation_entries')
      .select('amount')
      .eq('user_id', user.id)
      .eq('source_type', source_type)
      .eq('source_id', source_id)
      .gte('cycle_start', cycle_start)
      .lte('cycle_end', cycle_end)

    const currentSum = (existingEntries || []).reduce((s: number, e: any) => s + Number(e.amount), 0)
    const delta = new_reserved_amount - currentSum

    if (Math.abs(delta) < 0.01) {
      return { success: true, message: 'Reservation amount unchanged' }
    }

    // 2. Insert manual adjustment entry into ledger
    const { error: insertError } = await (supabase as any)
      .from('wallet_reservation_entries')
      .insert({
        user_id: user.id,
        wallet_id,
        source_type,
        source_id,
        cycle_start,
        cycle_end,
        amount: delta,
        entry_type: 'manual_adjustment',
        reason,
        notes: notes || null,
      })

    if (insertError) {
      console.error('adjustReservationAction insert error:', insertError)
      return { success: false, message: 'Failed to record reservation adjustment' }
    }

    revalidatePath('/wallets')
    revalidatePath('/planner')
    return { success: true, message: `Reservation adjusted by ${delta > 0 ? '+' : ''}₱${delta.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` }
  } catch (error) {
    console.error('adjustReservationAction error:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}

/**
 * Fetches all active cycle reservation sums grouped by source_id for a given date.
 */
export async function getActiveReservations(userId: string, dateStr: string) {
  const supabase = await createClient()

  const { data: entries } = await (supabase as any)
    .from('wallet_reservation_entries')
    .select('wallet_id, source_type, source_id, amount')
    .eq('user_id', userId)
    .lte('cycle_start', dateStr)
    .gte('cycle_end', dateStr)

  const bills: Record<string, number> = {}
  const goals: Record<string, number> = {}
  const walletTotals: Record<string, number> = {}

  const entryList: any[] = entries || []
  entryList.forEach((e: any) => {
    const amt = Number(e.amount)
    if (e.source_type === 'bill') {
      bills[e.source_id] = (bills[e.source_id] || 0) + amt
    } else {
      goals[e.source_id] = (goals[e.source_id] || 0) + amt
    }
    walletTotals[e.wallet_id] = (walletTotals[e.wallet_id] || 0) + amt
  })

  return { bills, goals, walletTotals }
}
