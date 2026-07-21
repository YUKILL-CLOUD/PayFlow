'use client'

import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { fundSchema, type FundInput } from '@/lib/schemas/fund'
import { FUND_TYPES, PRIORITY_LEVELS, FUND_FREQUENCIES, WALLET_COLORS } from '@/lib/constants'
import { DynamicIcon } from '@/components/ui/dynamic-icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { Database } from '@/types/database'

type Wallet = Database['public']['Tables']['wallets']['Row']

interface FundFormProps {
  wallets: Wallet[]
  defaultValues?: Partial<FundInput>
  onSubmit: (data: FundInput) => Promise<{ success: boolean; message?: string }>
  onSuccess?: () => void
  onCancel?: () => void
}

const WEEKDAYS = [
  { id: '0', label: 'Sunday' },
  { id: '1', label: 'Monday' },
  { id: '2', label: 'Tuesday' },
  { id: '3', label: 'Wednesday' },
  { id: '4', label: 'Thursday' },
  { id: '5', label: 'Friday' },
  { id: '6', label: 'Saturday' },
]

export function FundForm({ wallets, defaultValues, onSubmit, onSuccess, onCancel }: FundFormProps) {
  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FundInput>({
    resolver: zodResolver(fundSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      type: defaultValues?.type || 'recurring',
      wallet_id: defaultValues?.wallet_id || '',
      priority: defaultValues?.priority || 'medium',
      recurring_amount: defaultValues?.recurring_amount || 0,
      target_amount: defaultValues?.target_amount || 0,
      current_amount: defaultValues?.current_amount || 0,
      target_date: defaultValues?.target_date || '',
      start_date: defaultValues?.start_date || '',
      recurrence_type: defaultValues?.recurrence_type || 'every_payday',
      due_day: defaultValues?.due_day || null,
      notes: defaultValues?.notes || '',
    },
  })

  const fundType = watch('type')
  const recurrenceType = watch('recurrence_type')

  const submitForm = async (data: FundInput) => {
    // If it's recurring and type is every_payday, force due_day to null
    if (data.type === 'recurring' && data.recurrence_type === 'every_payday') {
      data.due_day = null
    }
    const result = await onSubmit(data)
    if (result.success) {
      toast.success(result.message || 'Saved successfully')
      onSuccess?.()
    } else {
      toast.error(result.message || 'Something went wrong')
    }
  }

  return (
    <form onSubmit={handleSubmit(submitForm)} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="fund-name">Fund Name</Label>
        <Input id="fund-name" placeholder="e.g. Emergency Fund" {...register('name')} aria-invalid={!!errors.name} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      {/* Type */}
      <div className="space-y-2">
        <Label>Fund Type</Label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2">
              {FUND_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => field.onChange(t.id)}
                  className={cn(
                    'flex flex-col items-start rounded-lg border p-3 transition-colors text-left',
                    field.value === t.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-accent'
                  )}
                >
                  <span className="text-sm font-medium">{t.label}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">{t.description}</span>
                </button>
              ))}
            </div>
          )}
        />
      </div>

      {/* Wallet selector with icon + color */}
      <div className="space-y-2">
        <Label htmlFor="fund-wallet">Wallet</Label>
        <Controller
          name="wallet_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="fund-wallet">
                <SelectValue placeholder="Select a wallet" />
              </SelectTrigger>
              <SelectContent>
                {wallets.map((w) => {
                  const colorObj = WALLET_COLORS.find(c => c.id === w.color) || WALLET_COLORS[0]
                  return (
                    <SelectItem key={w.id} value={w.id}>
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${colorObj.class}`} />
                        <DynamicIcon name={w.icon || 'wallet'} className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{w.name}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          )}
        />
        {errors.wallet_id && <p className="text-xs text-destructive">{errors.wallet_id.message}</p>}
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <Label>Priority</Label>
        <Controller
          name="priority"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-4 gap-1.5">
              {PRIORITY_LEVELS.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => field.onChange(p.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-md p-2 transition-colors border text-center',
                    field.value === p.id
                      ? `${p.bgLight} border-current ${p.textColor}`
                      : 'border-border text-muted-foreground hover:bg-accent'
                  )}
                >
                  <div className={`h-2.5 w-2.5 rounded-full ${p.color}`} />
                  <span className="text-[10px] font-medium">{p.label}</span>
                </button>
              ))}
            </div>
          )}
        />
      </div>

      {/* Conditional: Recurring Amount */}
      {fundType === 'recurring' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="recurring-amount">Amount Per Cycle</Label>
            <Input id="recurring-amount" type="number" step="0.01" min="0" placeholder="0.00" {...register('recurring_amount', { valueAsNumber: true })} />
            {errors.recurring_amount && <p className="text-xs text-destructive">{errors.recurring_amount.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fund-recurrence-type">Recurrence Schedule</Label>
            <Controller
              name="recurrence_type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="fund-recurrence-type">
                    <SelectValue placeholder="Select schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUND_FREQUENCIES.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Conditional due day picker based on recurrence_type */}
          {recurrenceType === 'monthly' && (
            <div className="space-y-2">
              <Label htmlFor="due-day">Due Day of Month</Label>
              <Input
                id="due-day"
                type="number"
                min="1"
                max="31"
                placeholder="e.g. 13"
                value={watch('due_day') || ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value) : null
                  setValue('due_day', val)
                }}
              />
              {errors.due_day && <p className="text-xs text-destructive">{errors.due_day.message}</p>}
            </div>
          )}

          {recurrenceType === 'weekly' && (
            <div className="space-y-2">
              <Label htmlFor="due-day-week">Due Day of Week</Label>
              <Select
                value={watch('due_day')?.toString() || '5'}
                onValueChange={(val) => setValue('due_day', parseInt(val || '5'))}
              >
                <SelectTrigger id="due-day-week">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}

      {/* Conditional: Goal Amount + Dates */}
      {fundType === 'goal' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="target-amount">Target Amount</Label>
              <Input id="target-amount" type="number" step="0.01" min="0" placeholder="0.00" {...register('target_amount', { valueAsNumber: true })} />
              {errors.target_amount && <p className="text-xs text-destructive">{errors.target_amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="current-amount">Current Saved</Label>
              <Input id="current-amount" type="number" step="0.01" min="0" placeholder="0.00" {...register('current_amount', { valueAsNumber: true })} />
              {errors.current_amount && <p className="text-xs text-destructive">{errors.current_amount.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date (Optional)</Label>
              <Input id="start-date" type="date" {...register('start_date')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-date">Target Date</Label>
              <Input id="target-date" type="date" {...register('target_date')} />
              {errors.target_date && <p className="text-xs text-destructive">{errors.target_date.message}</p>}
            </div>
          </div>
        </>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="fund-notes">Notes (Optional)</Label>
        <Textarea id="fund-notes" placeholder="Any additional details..." {...register('notes')} className="resize-none" />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Fund
        </Button>
      </div>
    </form>
  )
}
