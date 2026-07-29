'use client'

import * as React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, CalendarDays } from 'lucide-react'

interface DueDayPickerProps {
  value: number | null | undefined
  onChange: (val: number | null) => void
  error?: string
}

export function DueDayPicker({ value, onChange, error }: DueDayPickerProps) {
  // Option type: 'specific' or 'end_of_month'
  // 0 means End of Month
  const mode = value === 0 ? 'end_of_month' : 'specific'
  const specificDay = value !== null && value !== undefined && value > 0 ? value : 1

  const handleModeChange = (newMode: string | null) => {
    if (!newMode) return
    if (newMode === 'end_of_month') {
      onChange(0)
    } else {
      onChange(specificDay || 1)
    }
  }

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (!raw) {
      onChange(null)
      return
    }
    const parsed = parseInt(raw, 10)
    if (isNaN(parsed)) {
      onChange(null)
    } else {
      // Clamp between 1 and 31 for specific day mode
      const clamped = Math.min(31, Math.max(1, parsed))
      onChange(clamped)
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="due-day-select" className="flex items-center gap-1.5">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span>Due Date Timing</span>
      </Label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Select value={mode} onValueChange={handleModeChange}>
          <SelectTrigger id="due-day-select">
            <SelectValue placeholder="Select timing" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="specific">Specific Day of Month</SelectItem>
            <SelectItem value="end_of_month">End of Month (Last Day)</SelectItem>
          </SelectContent>
        </Select>

        {mode === 'specific' && (
          <div className="relative">
            <Input
              id="due-day-input"
              type="number"
              min="1"
              max="31"
              placeholder="Day (1-31)"
              value={value !== null && value !== undefined && value > 0 ? value : ''}
              onChange={handleDayChange}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
              day of month
            </span>
          </div>
        )}
      </div>

      {mode === 'end_of_month' && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 pt-0.5">
          <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
          Automatically adjusts to the last day of each month (Jan 31, Feb 28/29, Apr 30, etc.). Ideal for SSS, PhilHealth, & EOM bills.
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
