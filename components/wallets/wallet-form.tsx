'use client'

import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { walletSchema, type WalletInput } from '@/lib/schemas/wallet'
import { WALLET_COLORS, WALLET_ICONS, WALLET_TYPES } from '@/lib/constants'
import { DynamicIcon } from '@/components/ui/dynamic-icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface WalletFormProps {
  defaultValues?: Partial<WalletInput>
  onSubmit: (data: WalletInput) => Promise<{ success: boolean; message?: string }>
  onSuccess?: () => void
  onCancel?: () => void
}

export function WalletForm({ defaultValues, onSubmit, onSuccess, onCancel }: WalletFormProps) {
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<WalletInput>({
    resolver: zodResolver(walletSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      type: defaultValues?.type || 'other',
      description: defaultValues?.description || '',
      color: defaultValues?.color || WALLET_COLORS[0].id,
      icon: defaultValues?.icon || WALLET_ICONS[0].id,
    },
  })

  const submitForm = async (data: WalletInput) => {
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
      <div className="space-y-2">
        <Label htmlFor="name">Wallet Name</Label>
        <Input id="name" placeholder="e.g. Chase Checking" {...register('name')} aria-invalid={!!errors.name} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {WALLET_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea id="description" placeholder="Main account for bills" {...register('description')} className="resize-none" />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Color Accent</Label>
        <Controller
          name="color"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {WALLET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => field.onChange(c.id)}
                  className={cn(
                    'h-8 w-8 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    c.class,
                    field.value === c.id ? 'ring-2 ring-foreground ring-offset-2 scale-110' : 'opacity-70 hover:opacity-100 hover:scale-110'
                  )}
                  aria-label={`Select ${c.label} color`}
                />
              ))}
            </div>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label>Icon</Label>
        <Controller
          name="icon"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {WALLET_ICONS.map((icon) => (
                <button
                  type="button"
                  key={icon.id}
                  onClick={() => field.onChange(icon.id)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 rounded-md p-2 transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    field.value === icon.id 
                      ? 'bg-primary/10 border-primary text-primary' 
                      : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                  aria-label={`Select ${icon.label} icon`}
                >
                  <DynamicIcon name={icon.id} className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{icon.label}</span>
                </button>
              ))}
            </div>
          )}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Wallet
        </Button>
      </div>
    </form>
  )
}
