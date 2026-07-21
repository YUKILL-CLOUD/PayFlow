import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges Tailwind CSS class names with clsx and tailwind-merge.
 * Resolves class conflicts intelligently.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as Philippine Peso (or any currency) for display.
 * Example: formatCurrency(12000) → '₱12,000.00'
 */
export function formatCurrency(
  amount: number,
  currency = 'PHP',
  locale = 'en-PH'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Formats a date as a readable string.
 * Example: formatDate(new Date()) → 'July 17, 2026'
 */
export function formatDate(date: Date | string, locale = 'en-PH'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(typeof date === 'string' ? new Date(date) : date)
}

/**
 * Formats a date as a short string.
 * Example: formatDateShort(new Date()) → 'Jul 17'
 */
export function formatDateShort(date: Date | string, locale = 'en-PH'): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(typeof date === 'string' ? new Date(date) : date)
}

/**
 * Returns the ordinal suffix for a day number.
 * Example: getOrdinal(15) → '15th'
 */
export function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
