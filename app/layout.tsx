import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://payflow-financial-os.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'PayFlow — Smart Payday Planner & Financial OS',
    template: '%s — PayFlow',
  },
  description:
    'PayFlow is a planning-first financial OS that answers: "I just got paid — what should I do with my money?" Allocate salary to bills, recurring funds, and savings goals in seconds.',
  keywords: [
    'PayFlow',
    'payday planner',
    'financial OS',
    'money management',
    'salary allocation',
    'budgeting',
    'personal finance',
    'bill tracking',
    'savings goals'
  ],
  authors: [{ name: 'PayFlow Team' }],
  creator: 'PayFlow',
  publisher: 'PayFlow',
  openGraph: {
    type: 'website',
    locale: 'en_PH',
    url: appUrl,
    title: 'PayFlow — Smart Payday Planner & Financial OS',
    description:
      'Plan your payday in under 30 seconds. Deterministic allocation for bills, recurring obligations, and savings goals.',
    siteName: 'PayFlow',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PayFlow — Smart Payday Planner & Financial OS',
    description:
      'Plan your payday in under 30 seconds. Deterministic allocation for bills, recurring obligations, and savings goals.',
  },
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delay={200}>
            {children}
            <Toaster richColors position="bottom-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
