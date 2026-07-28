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
