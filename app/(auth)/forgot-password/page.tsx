import type { Metadata } from 'next'
import Link from 'next/link'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export const metadata: Metadata = {
  title: 'Reset Password — PayFlow',
  description: 'Reset your PayFlow account password.',
}

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <ForgotPasswordForm />

      <div className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-foreground font-medium underline underline-offset-4 hover:text-primary transition-colors">
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
