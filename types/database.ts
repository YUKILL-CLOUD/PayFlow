/**
 * Auto-generated Supabase type stubs.
 * Replace this file with the output of: npx supabase gen types typescript
 * after connecting your Supabase project.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enum types
export type FundType = 'recurring' | 'goal'
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'optional'
export type BillRepeat = 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'annually' | 'one_time'
export type PaydayStatus = 'draft' | 'planned' | 'active' | 'completed'
export type PaydaySchedule = 'weekly' | 'bi_weekly' | 'semi_monthly' | 'monthly' | 'custom'
export type WalletType = 'bank' | 'e_wallet' | 'cash' | 'other'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          currency: string
          payday_schedule: PaydaySchedule
          payday_dates: Json | null
          payday_start_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          currency?: string
          payday_schedule?: PaydaySchedule
          payday_dates?: Json | null
          payday_start_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string | null
          currency?: string
          payday_schedule?: PaydaySchedule
          payday_dates?: Json | null
          payday_start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          id: string
          user_id: string
          name: string
          type: WalletType
          description: string | null
          color: string | null
          icon: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type?: WalletType
          description?: string | null
          color?: string | null
          icon?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          type?: WalletType
          description?: string | null
          color?: string | null
          icon?: string | null
          sort_order?: number
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      funds: {
        Row: {
          id: string
          user_id: string
          wallet_id: string
          name: string
          type: FundType
          priority: PriorityLevel
          sort_order: number
          recurring_amount: number
          target_amount: number
          current_amount: number
          target_date: string | null
          start_date: string | null
          recurrence_type: string
          due_day: number | null
          recurrence_rule: Json | null
          allocation_strategy: string
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          wallet_id: string
          name: string
          type?: FundType
          priority?: PriorityLevel
          sort_order?: number
          recurring_amount?: number
          target_amount?: number
          current_amount?: number
          target_date?: string | null
          start_date?: string | null
          recurrence_type?: string
          due_day?: number | null
          recurrence_rule?: Json | null
          allocation_strategy?: string
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          wallet_id?: string
          name?: string
          type?: FundType
          priority?: PriorityLevel
          sort_order?: number
          recurring_amount?: number
          target_amount?: number
          current_amount?: number
          target_date?: string | null
          start_date?: string | null
          recurrence_type?: string
          due_day?: number | null
          recurrence_rule?: Json | null
          allocation_strategy?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bills: {
        Row: {
          id: string
          user_id: string
          wallet_id: string
          name: string
          amount: number
          is_variable: boolean
          due_day: number | null
          recurrence_type: string
          recurrence_rule: Json | null
          priority: PriorityLevel
          sort_order: number
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          wallet_id: string
          name: string
          amount?: number
          is_variable?: boolean
          due_day?: number | null
          recurrence_type?: string
          recurrence_rule?: Json | null
          priority?: PriorityLevel
          sort_order?: number
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          wallet_id?: string
          name?: string
          amount?: number
          is_variable?: boolean
          due_day?: number | null
          recurrence_type?: string
          recurrence_rule?: Json | null
          priority?: PriorityLevel
          sort_order?: number
          is_active?: boolean
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      paydays: {
        Row: {
          id: string
          user_id: string
          payday_date: string
          salary: number
          status: PaydayStatus
          planner_snapshot: Json | null
          notes: string | null
          confirmed_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          payday_date: string
          salary: number
          status?: PaydayStatus
          planner_snapshot?: Json | null
          notes?: string | null
          confirmed_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          payday_date?: string
          salary?: number
          status?: PaydayStatus
          planner_snapshot?: Json | null
          notes?: string | null
          confirmed_at?: string | null
          completed_at?: string | null
          updated_at?: string
        }
      }
      allocations: {
        Row: {
          id: string
          user_id: string
          payday_id: string
          bill_id: string | null
          fund_id: string | null
          wallet_id: string
          amount: number
          is_completed: boolean
          completed_at: string | null
          snapshot_label: string
          snapshot_amount: number
          sort_order: number
          execution_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          payday_id: string
          bill_id?: string | null
          fund_id?: string | null
          wallet_id: string
          amount: number
          is_completed?: boolean
          completed_at?: string | null
          snapshot_label: string
          snapshot_amount: number
          sort_order?: number
          execution_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          is_completed?: boolean
          completed_at?: string | null
          snapshot_label?: string
          snapshot_amount?: number
          sort_order?: number
          execution_order?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      fund_type: FundType
      priority_level: PriorityLevel
      bill_repeat: BillRepeat
      payday_status: PaydayStatus
      payday_schedule: PaydaySchedule
      wallet_type: WalletType
    }
  }
}
