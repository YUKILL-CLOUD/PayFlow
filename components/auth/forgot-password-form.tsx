'use client'

import { useState, useTransition } from 'react'
import { Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { forgotPasswordAction } from '@/actions/auth'

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await forgotPasswordAction(formData)
      if (result.success) {
        setSuccess(result.message)
      } else {
        setError(result.message)
      }
    })
  }

  if (success) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center space-y-3">
        <Mail className="h-10 w-10 text-primary mx-auto" />
        <p className="font-medium">Email sent</p>
        <p className="text-sm text-muted-foreground">{success}</p>
      </div>
    )
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="forgot-email">Email address</Label>
        <Input
          id="forgot-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          disabled={isPending}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending} id="forgot-password-submit-btn">
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Send reset link
      </Button>
    </form>
  )
}
