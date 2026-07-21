'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard Route Error:', error)
  }, [error])

  return (
    <div className="p-4 md:p-6 min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
      <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
        <AlertCircle className="h-6 w-6" />
      </div>
      <div className="space-y-1 max-w-md">
        <h2 className="text-xl font-bold tracking-tight">Something went wrong</h2>
        <p className="text-xs text-muted-foreground">
          An unexpected error occurred while loading this view. You can try refreshing the page.
        </p>
      </div>
      <Button onClick={() => reset()} className="font-semibold">
        <RefreshCw className="mr-2 h-4 w-4" />
        Try Again
      </Button>
    </div>
  )
}
