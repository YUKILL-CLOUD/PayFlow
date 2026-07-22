import type { Metadata } from 'next'
import { PayFlowLogo } from '@/components/ui/payflow-logo'

export const metadata: Metadata = {
  title: 'Sign In — PayFlow',
  description: 'Sign in to your PayFlow account to manage your payday plan.',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: Branding panel */}
      <div className="hidden lg:flex flex-col bg-sidebar border-r border-border p-10">
        <PayFlowLogo size="lg" />

        <div className="flex-1 flex flex-col justify-center">
          <blockquote className="space-y-4">
            <p className="text-2xl font-medium text-foreground leading-snug">
              &ldquo;I just got paid.
              <br />
              What should I do
              <br />
              with my money?&rdquo;
            </p>
            <footer className="text-sm text-muted-foreground">
              Payday planning in under 30 seconds.
            </footer>
          </blockquote>
        </div>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} PayFlow. All rights reserved.
        </p>
      </div>

      {/* Right: Auth form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
