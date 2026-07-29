'use client'

import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { billSchema, type BillInput } from '@/lib/schemas/bill'
import { BILL_FREQUENCIES, BILL_TYPES, PRIORITY_LEVELS, WALLET_COLORS } from '@/lib/constants'
import { DynamicIcon } from '@/components/ui/dynamic-icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Loader2, RefreshCw, CreditCard, CalendarCheck } from 'lucide-react'
import { DueDayPicker } from '@/components/common/due-day-picker'
import type { Database } from '@/types/database'

type Wallet = Database['public']['Tables']['wallets']['Row']

interface BillFormProps {
  wallets: Wallet[]
  defaultValues?: Partial<BillInput> & {
    installments_paid?: number
    total_installments?: number
  }
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

const BILL_TYPE_ICONS = {
  recurring: RefreshCw,
  installment: CreditCard,
  one_time: CalendarCheck,
}

export function BillForm({ wallets, defaultValues, onSubmit, onSuccess, onCancel }: BillFormProps) {
  const {
    register, control, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting }
  } = useForm<BillInput>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      bill_type: defaultValues?.bill_type || 'recurring',
      name: defaultValues?.name || '',
      amount: defaultValues?.amount || 0,
      is_variable: defaultValues?.is_variable ?? false,
      wallet_id: defaultValues?.wallet_id || '',
      priority: defaultValues?.priority || 'high',
      recurrence_type: defaultValues?.recurrence_type || 'monthly',
      due_day: defaultValues?.due_day ?? null,
      notes: defaultValues?.notes || '',
      payee_name: defaultValues?.payee_name || '',
      // Installment fields
      total_installments: defaultValues?.total_installments || null,
      installment_amount: defaultValues?.installment_amount || null,
      first_due_date: defaultValues?.first_due_date || '',
    },
  })

  const billType = watch('bill_type')
  const recurrenceType = watch('recurrence_type')
  const totalInstallments = watch('total_installments')
  const installmentAmount = watch('installment_amount')
  const existingPaid = defaultValues?.installments_paid ?? 0

  // Calculate total cost preview for installments
  const totalCost = totalInstallments && installmentAmount
    ? totalInstallments * installmentAmount
    : null

  const submitForm = async (data: BillInput) => {
    // Cleanup based on bill type
    if (data.bill_type === 'recurring' && data.recurrence_type === 'every_payday') {
      data.due_day = null
    }
    if (data.bill_type === 'one_time') {
      data.recurrence_type = 'one_time'
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
    <form onSubmit={handleSubmit(submitForm)} className="space-y-5">

      {/* Bill Type Selector */}
      <div className="space-y-2">
        <Label>Bill Type</Label>
        <Controller
          name="bill_type"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-3 gap-2">
              {BILL_TYPES.map((type) => {
                const Icon = BILL_TYPE_ICONS[type.id as keyof typeof BILL_TYPE_ICONS]
                const isSelected = field.value === type.id
                return (
                  <button
                    type="button"
                    key={type.id}
                    onClick={() => field.onChange(type.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-semibold">{type.label}</span>
                    <span className="text-[10px] leading-tight text-muted-foreground hidden sm:block">{type.description}</span>
                  </button>
                )
              })}
            </div>
          )}
        />
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="bill-name">Bill Name</Label>
        <Input
          id="bill-name"
          placeholder={billType === 'installment' ? 'e.g. Motor Loan, Shopee 12-month' : 'e.g. Electric Bill, Rent'}
          {...register('name')}
          aria-invalid={!!errors.name}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      {/* Payee Name (optional, for all types) */}
      <div className="space-y-2">
        <Label htmlFor="bill-payee">Payee / Merchant <span className="text-muted-foreground font-normal">(Optional)</span></Label>
        <Input
          id="bill-payee"
          placeholder={billType === 'installment' ? 'e.g. Honda Finance, Shopee' : 'e.g. MORE Power, Converge'}
          {...register('payee_name')}
        />
      </div>

      {/* ─── RECURRING FIELDS ─── */}
      {billType === 'recurring' && (
        <>
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="bill-amount">Amount</Label>
            <Input id="bill-amount" type="number" step="0.01" min="0" placeholder="0.00"
              {...register('amount', { valueAsNumber: true })} />
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
                <Switch id="is-variable" checked={!!field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          {/* Due Schedule */}
          <div className="space-y-2">
            <Label htmlFor="bill-recurrence-type">Due Schedule</Label>
            <Controller
              name="recurrence_type"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger id="bill-recurrence-type">
                    <SelectValue placeholder="Select recurrence" />
                  </SelectTrigger>
                  <SelectContent>
                    {BILL_FREQUENCIES.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Conditional: due day */}
          {recurrenceType === 'monthly' && (
            <DueDayPicker
              value={watch('due_day')}
              onChange={(val) => setValue('due_day', val)}
              error={errors.due_day?.message}
            />
          )}

          {recurrenceType === 'weekly' && (
            <div className="space-y-2">
              <Label htmlFor="bill-due-day-week">Due Day of Week</Label>
              <Select value={watch('due_day')?.toString() || '5'} onValueChange={(val) => setValue('due_day', parseInt(val || '5'))}>
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
        </>
      )}

      {/* ─── INSTALLMENT FIELDS ─── */}
      {billType === 'installment' && (
        <>
          {/* Installment Amount */}
          <div className="space-y-2">
            <Label htmlFor="installment-amount">Amount Per Payment</Label>
            <Input id="installment-amount" type="number" step="0.01" min="0" placeholder="e.g. 3600.00"
              {...register('installment_amount', { valueAsNumber: true })} />
            {errors.installment_amount && <p className="text-xs text-destructive">{errors.installment_amount.message}</p>}
          </div>

          {/* Total Installments */}
          <div className="space-y-2">
            <Label htmlFor="total-installments">Total Number of Payments</Label>
            <Input id="total-installments" type="number" min="1" placeholder="e.g. 24"
              {...register('total_installments', { valueAsNumber: true })} />
            {errors.total_installments && <p className="text-xs text-destructive">{errors.total_installments.message}</p>}
          </div>

          {/* Total Cost Preview */}
          {totalCost !== null && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Total obligation: </span>
              <span className="font-semibold">
                ₱{installmentAmount?.toLocaleString('en-PH', { minimumFractionDigits: 2 })} × {totalInstallments} payments = ₱{totalCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Progress Display (edit mode only) */}
          {existingPaid > 0 && totalInstallments && (
            <div className="rounded-lg border px-4 py-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{existingPaid} of {totalInstallments} paid
                  <span className="text-muted-foreground ml-1">({Math.round((existingPaid / totalInstallments) * 100)}%)</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, Math.round((existingPaid / totalInstallments) * 100))}%` }}
                />
              </div>
            </div>
          )}

          {/* First Due Date */}
          <div className="space-y-2">
            <Label htmlFor="first-due-date">First Payment Due Date</Label>
            <Input id="first-due-date" type="date" {...register('first_due_date')} />
            <p className="text-xs text-muted-foreground">The date of the first actual payment (not the purchase date).</p>
            {errors.first_due_date && <p className="text-xs text-destructive">{errors.first_due_date.message}</p>}
          </div>

          {/* Payment Schedule */}
          <div className="space-y-2">
            <Label htmlFor="installment-recurrence">Payment Schedule</Label>
            <Controller
              name="recurrence_type"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? 'monthly'} onValueChange={field.onChange}>
                  <SelectTrigger id="installment-recurrence">
                    <SelectValue placeholder="Select schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    {BILL_FREQUENCIES.filter(f => f.id !== 'every_payday').map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Conditional: due day for monthly */}
          {recurrenceType === 'monthly' && (
            <DueDayPicker
              value={watch('due_day')}
              onChange={(val) => setValue('due_day', val)}
              error={errors.due_day?.message}
            />
          )}
        </>
      )}

      {/* ─── ONE-TIME FIELDS ─── */}
      {billType === 'one_time' && (
        <>
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="one-time-amount">Amount</Label>
            <Input id="one-time-amount" type="number" step="0.01" min="0" placeholder="0.00"
              {...register('amount', { valueAsNumber: true })} />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="one-time-due-date">Due Date</Label>
            <Input id="one-time-due-date" type="date" {...register('first_due_date')} />
            <p className="text-xs text-muted-foreground">The planner will spread the cost across paydays leading up to this date.</p>
            {errors.first_due_date && <p className="text-xs text-destructive">{errors.first_due_date.message}</p>}
          </div>
        </>
      )}

      {/* ─── SHARED FIELDS ─── */}

      {/* Wallet selector */}
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
