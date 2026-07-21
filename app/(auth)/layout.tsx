import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Financial OS — Sign In',
  description: 'Sign in to your Financial OS account.',
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
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">F</span>
          </div>
          <span className="font-semibold text-lg text-foreground">Financial OS</span>
        </div>
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
          &copy; {new Date().getFullYear()} Financial OS. All rights reserved.
        </p>
      </div>

      {/* Right: Auth form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
