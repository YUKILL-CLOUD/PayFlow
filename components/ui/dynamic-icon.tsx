import * as React from 'react'
import { icons } from 'lucide-react'

export interface DynamicIconProps extends React.SVGProps<SVGSVGElement> {
  name: string
  className?: string
}

export function DynamicIcon({ name, className, ...props }: DynamicIconProps) {
  const PascalName = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

  const IconComponent = (icons as any)[PascalName]

  if (!IconComponent) {
    return <span className={className} /> // fallback
  }

  return <IconComponent className={className} {...props} />
}
