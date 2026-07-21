'use client'

import { useState, useTransition } from 'react'
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registerAction } from '@/actions/auth'

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await registerAction(formData)
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
        <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
        <p className="font-medium">Check your email</p>
        <p className="text-sm text-muted-foreground">{success}</p>
      </div>
    )
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="register-name">Full name</Label>
        <Input
          id="register-name"
          name="fullName"
          type="text"
          placeholder="Juan dela Cruz"
          autoComplete="name"
          required
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-email">Email</Label>
        <Input
          id="register-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-password">Password</Label>
        <div className="relative">
          <Input
            id="register-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            required
            minLength={8}
            disabled={isPending}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending} id="register-submit-btn">
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create account
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        By creating an account, you agree to our Terms of Service.
      </p>
    </form>
  )
}
