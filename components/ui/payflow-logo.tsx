import * as React from 'react'
import { cn } from '@/lib/utils'

interface PayFlowLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export function PayFlowLogo({
  size = 'md',
  showText = true,
  className,
  ...props
}: PayFlowLogoProps) {
  const iconSizeClasses = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-8 h-8 rounded-xl',
    lg: 'w-10 h-10 rounded-2xl',
  }

  const svgSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  }

  return (
    <div
      className={cn('flex items-center gap-2.5 select-none', className)}
      {...props}
    >
      {/* Brand Mark Icon */}
      <div
        className={cn(
          'relative flex items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 text-white shadow-md shadow-emerald-500/20 ring-1 ring-white/20 transition-all duration-300 hover:scale-105 shrink-0',
          iconSizeClasses[size]
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={svgSizeClasses[size]}
        >
          {/* Cash flow upward path & P mark */}
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </div>

      {/* Brand Text */}
      {showText && (
        <div className={cn('font-bold tracking-tight text-foreground flex items-center', textSizeClasses[size])}>
          <span>Pay</span>
          <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent ml-0.5">
            Flow
          </span>
        </div>
      )}
    </div>
  )
}
