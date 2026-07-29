'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { walletSchema, type WalletInput } from '@/lib/schemas/wallet'

// ----------------------------------------------------------------------------
// Server Actions
// ----------------------------------------------------------------------------

export async function createWallet(data: WalletInput) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'Unauthorized' }
    }

    const parsed = walletSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message }
    }

    const { name, type, description, color, icon, current_balance } = parsed.data

    // Check for duplicate active wallet name
    const { data: existingWallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .ilike('name', name)
      .maybeSingle()

    if (existingWallet) {
      return { success: false, message: 'An active wallet with this name already exists' }
    }

    // Get max sort_order
    const { data: maxOrderData } = await supabase
      .from('wallets')
      .select('sort_order')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()
      
    const nextSortOrder = ((maxOrderData as any)?.sort_order ?? 0) + 1

    const { error: insertError } = await (supabase as any)
      .from('wallets')
      .insert({
        user_id: user.id,
        name,
        type,
        description,
        color,
        icon,
        sort_order: nextSortOrder,
        current_balance: current_balance || 0,
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      return { success: false, message: 'Failed to create wallet' }
    }

    revalidatePath('/wallets')
    return { success: true, message: 'Wallet created successfully' }
  } catch (error) {
    console.error('createWallet error:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}

// Helper: Priority-based auto-distribution of wallet balance to envelopes
async function autoDistributeWalletBalanceToEnvelopes(supabase: any, userId: string, walletId: string, walletBalance: number) {
  try {
    const [billsRes, fundsRes] = await Promise.all([
      supabase.from('bills').select('id, name, amount, installment_amount, bill_type, priority, sort_order').eq('wallet_id', walletId).eq('user_id', userId).eq('is_active', true),
      supabase.from('funds').select('id, name, type, recurring_amount, target_amount, priority, sort_order').eq('wallet_id', walletId).eq('user_id', userId).eq('is_active', true),
    ])

    const bills = billsRes.data || []
    const funds = fundsRes.data || []
    const totalObligations = bills.length + funds.length

    if (totalObligations === 0) return

    const priorityRankMap: Record<string, number> = { critical: 1, high: 2, medium: 3, optional: 4 }

    // Unified list of obligations
    const items: Array<{
      id: string
      name: string
      sourceType: 'bill' | 'goal'
      priorityRank: number
      sortOrder: number
      cycleTarget: number
    }> = []

    bills.forEach((b: any) => {
      const target = b.bill_type === 'installment' ? (b.installment_amount ?? b.amount) : b.amount
      items.push({
        id: b.id,
        name: b.name,
        sourceType: 'bill',
        priorityRank: priorityRankMap[b.priority] || 3,
        sortOrder: b.sort_order || 0,
        cycleTarget: target || 0,
      })
    })

    funds.forEach((f: any) => {
      const target = f.type === 'goal' ? f.target_amount : f.recurring_amount
      items.push({
        id: f.id,
        name: f.name,
        sourceType: 'goal',
        priorityRank: priorityRankMap[f.priority] || 3,
        sortOrder: f.sort_order || 0,
        cycleTarget: target || 0,
      })
    })

    // Sort by priority (critical first), then sort_order
    items.sort((a, b) => a.priorityRank - b.priorityRank || a.sortOrder - b.sortOrder)

    const now = new Date()
    const cycleStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().split('T')[0]
    const cycleEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0)).toISOString().split('T')[0]

    // Fetch existing reservation entries for this cycle
    const { data: existingEntries } = await supabase
      .from('wallet_reservation_entries')
      .select('source_id, amount')
      .eq('user_id', userId)
      .eq('wallet_id', walletId)
      .gte('cycle_start', cycleStart)
      .lte('cycle_end', cycleEnd)

    const currentReservedMap = new Map<string, number>()
    ;(existingEntries || []).forEach((e: any) => {
      currentReservedMap.set(e.source_id, (currentReservedMap.get(e.source_id) || 0) + Number(e.amount))
    })

    let remainingBalancePool = Math.max(0, walletBalance)
    const newEntries: any[] = []

    for (const item of items) {
      const targetToFund = Math.max(0, item.cycleTarget)
      const allocatedEnvelopeAmount = Math.min(targetToFund, remainingBalancePool)
      const currentReserved = currentReservedMap.get(item.id) || 0
      const delta = allocatedEnvelopeAmount - currentReserved

      if (Math.abs(delta) >= 0.01) {
        newEntries.push({
          user_id: userId,
          wallet_id: walletId,
          source_type: item.sourceType,
          source_id: item.id,
          cycle_start: cycleStart,
          cycle_end: cycleEnd,
          amount: delta,
          entry_type: 'manual_adjustment',
          reason: 'cash_deposit',
          notes: 'Auto-waterfall allocated from wallet balance',
        })
      }

      remainingBalancePool = Math.max(0, remainingBalancePool - allocatedEnvelopeAmount)
    }

    if (newEntries.length > 0) {
      await supabase.from('wallet_reservation_entries').insert(newEntries)
    }
  } catch (err) {
    console.error('autoDistributeWalletBalanceToEnvelopes error:', err)
  }
}

export async function updateWalletBalance(walletId: string, balance: number) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'Unauthorized' }
    }

    if (balance < 0) {
      return { success: false, message: 'Balance cannot be negative' }
    }

    const { error } = await (supabase as any)
      .from('wallets')
      .update({ current_balance: balance, updated_at: new Date().toISOString() })
      .eq('id', walletId)
      .eq('user_id', user.id)

    if (error) {
      console.error('updateWalletBalance error:', error)
      return { success: false, message: 'Failed to update balance' }
    }

    // Auto-waterfall distribute wallet balance across envelopes based on priority
    await autoDistributeWalletBalanceToEnvelopes(supabase as any, user.id, walletId, balance)

    revalidatePath('/wallets')
    revalidatePath('/planner')
    return { success: true, message: 'Wallet balance updated' }
  } catch (error) {
    console.error('updateWalletBalance error:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}

export async function depositToWallet(walletId: string, amount: number) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'Unauthorized' }
    }

    if (amount <= 0) {
      return { success: false, message: 'Amount must be positive' }
    }

    const { data: wallet } = await (supabase as any)
      .from('wallets')
      .select('current_balance')
      .eq('id', walletId)
      .eq('user_id', user.id)
      .single()

    if (!wallet) return { success: false, message: 'Wallet not found' }

    const newBalance = (wallet.current_balance || 0) + amount

    await (supabase as any)
      .from('wallets')
      .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', walletId)
      .eq('user_id', user.id)

    // Auto-waterfall distribute wallet balance across envelopes based on priority
    await autoDistributeWalletBalanceToEnvelopes(supabase as any, user.id, walletId, newBalance)

    revalidatePath('/wallets')
    revalidatePath('/planner')
    return { success: true, message: `Deposited ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` }
  } catch (error) {
    console.error('depositToWallet error:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}

export async function withdrawFromWallet(walletId: string, amount: number) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'Unauthorized' }
    }

    if (amount <= 0) {
      return { success: false, message: 'Amount must be positive' }
    }

    const { data: wallet } = await (supabase as any)
      .from('wallets')
      .select('current_balance')
      .eq('id', walletId)
      .eq('user_id', user.id)
      .single()

    if (!wallet) return { success: false, message: 'Wallet not found' }

    const newBalance = Math.max(0, (wallet.current_balance || 0) - amount)

    await (supabase as any)
      .from('wallets')
      .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', walletId)
      .eq('user_id', user.id)

    // Auto-waterfall distribute wallet balance across envelopes based on priority
    await autoDistributeWalletBalanceToEnvelopes(supabase as any, user.id, walletId, newBalance)

    revalidatePath('/wallets')
    revalidatePath('/planner')
    return { success: true, message: `Withdrew ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` }
  } catch (error) {
    console.error('withdrawFromWallet error:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}


export async function updateWallet(id: string, data: WalletInput) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'Unauthorized' }
    }

    const parsed = walletSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message }
    }

    const { name, type, description, color, icon } = parsed.data

    // Check for duplicate active wallet name (excluding this wallet)
    const { data: existingWallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .ilike('name', name)
      .neq('id', id)
      .maybeSingle()

    if (existingWallet) {
      return { success: false, message: 'An active wallet with this name already exists' }
    }

    const { error: updateError } = await (supabase as any)
      .from('wallets')
      .update({
        name,
        type,
        description,
        color,
        icon,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Update error:', updateError)
      return { success: false, message: 'Failed to update wallet' }
    }

    revalidatePath('/wallets')
    return { success: true, message: 'Wallet updated successfully' }
  } catch (error) {
    console.error('updateWallet error:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}

export async function deleteWallet(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'Unauthorized' }
    }

    // Soft delete
    const { error: deleteError } = await (supabase as any)
      .from('wallets')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return { success: false, message: 'Failed to delete wallet' }
    }

    revalidatePath('/wallets')
    return { success: true, message: 'Wallet deleted successfully' }
  } catch (error) {
    console.error('deleteWallet error:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}

export async function reorderWallets(orderedIds: string[]) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'Unauthorized' }
    }

    // We do sequential updates to maintain sort_order. 
    // In a high-scale app, we might use a stored procedure, but sequential is fine here for ~10 wallets.
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i]
      await (supabase as any)
        .from('wallets')
        .update({ sort_order: i + 1, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
    }

    revalidatePath('/wallets')
    return { success: true }
  } catch (error) {
    console.error('reorderWallets error:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}
