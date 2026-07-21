import type { Metadata } from 'next'
import Link from 'next/link'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata: Metadata = {
  title: 'Create Account — Financial OS',
  description: 'Create your Financial OS account and start planning your payday.',
}

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-sm text-muted-foreground">
          Start planning your payday in under 30 seconds.
        </p>
      </div>

      <RegisterForm />

      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-foreground font-medium underline underline-offset-4 hover:text-primary transition-colors">
          Sign in
        </Link>
      </div>
    </div>
  )
}
