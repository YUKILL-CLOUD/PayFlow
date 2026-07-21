import type { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Sign In — Financial OS',
  description: 'Sign in to your Financial OS account to manage your payday plan.',
}

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Enter your credentials to access your payday planner.
        </p>
      </div>

      <LoginForm />

      <div className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-foreground font-medium underline underline-offset-4 hover:text-primary transition-colors">
          Create one
        </Link>
      </div>
    </div>
  )
}
