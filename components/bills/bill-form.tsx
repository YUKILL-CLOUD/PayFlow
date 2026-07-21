'use client'

import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { billSchema, type BillInput } from '@/lib/schemas/bill'
import { FUND_FREQUENCIES, PRIORITY_LEVELS, WALLET_COLORS } from '@/lib/constants'
import { DynamicIcon } from '@/components/ui/dynamic-icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Loader2, Info } from 'lucide-react'
import type { Database } from '@/types/database'

type Wallet = Database['public']['Tables']['wallets']['Row']

interface BillFormProps {
  wallets: Wallet[]
  defaultValues?: Partial<BillInput>
  onSubmit: (data: BillInput) => Promise<{ success: boolean; message?: string }>
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

export function BillForm({ wallets, defaultValues, onSubmit, onSuccess, onCancel }: BillFormProps) {
  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<BillInput>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      amount: defaultValues?.amount || 0,
      is_variable: defaultValues?.is_variable || false,
      wallet_id: defaultValues?.wallet_id || '',
      priority: defaultValues?.priority || 'high', // Bills default to High obligation
      recurrence_type: defaultValues?.recurrence_type || 'monthly',
      due_day: defaultValues?.due_day || null,
      notes: defaultValues?.notes || '',
    },
  })

  const recurrenceType = watch('recurrence_type')

  const submitForm = async (data: BillInput) => {
    if (data.recurrence_type === 'every_payday') {
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
        <Label htmlFor="bill-name">Bill Name</Label>
        <Input id="bill-name" placeholder="e.g. Electric Bill, Rent" {...register('name')} aria-invalid={!!errors.name} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="bill-amount">Amount</Label>
        <Input id="bill-amount" type="number" step="0.01" min="0" placeholder="0.00" {...register('amount', { valueAsNumber: true })} />
        {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
      </div>

      {/* Is Variable Switch */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5 pr-4">
          <Label htmlFor="is-variable">Variable Amount</Label>
          <p className="text-xs text-muted-foreground">
            Turn this on if the bill amount changes every cycle (e.g. utilities).
          </p>
        </div>
        <Controller
          name="is_variable"
          control={control}
          render={({ field }) => (
            <Switch
              id="is-variable"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      {/* Wallet selector with icons + colors */}
      <div className="space-y-2">
        <Label htmlFor="bill-wallet">Source Wallet</Label>
        <Controller
          name="wallet_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="bill-wallet">
                <SelectValue placeholder="Select a source wallet" />
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

      {/* Recurrence type selector */}
      <div className="space-y-2">
        <Label htmlFor="bill-recurrence-type">Due Schedule</Label>
        <Controller
          name="recurrence_type"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="bill-recurrence-type">
                <SelectValue placeholder="Select recurrence" />
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

      {/* Conditional: due day picker */}
      {recurrenceType === 'monthly' && (
        <div className="space-y-2">
          <Label htmlFor="bill-due-day">Due Day of Month</Label>
          <Input
            id="bill-due-day"
            type="number"
            min="1"
            max="31"
            placeholder="e.g. 15"
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
          <Label htmlFor="bill-due-day-week">Due Day of Week</Label>
          <Select
            value={watch('due_day')?.toString() || '5'}
            onValueChange={(val) => setValue('due_day', parseInt(val || '5'))}
          >
            <SelectTrigger id="bill-due-day-week">
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

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="bill-notes">Notes (Optional)</Label>
        <Textarea id="bill-notes" placeholder="Any additional details..." {...register('notes')} className="resize-none" />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Bill
        </Button>
      </div>
    </form>
  )
}
