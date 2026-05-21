import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as US currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

/**
 * Convert snake_case string to Title Case with spaces
 * e.g. "ops_entry" → "ops entry", "missing_hobby_form" → "missing hobby form"
 */
export function humanizeSnakeCase(str: string): string {
  return str.replace(/_/g, ' ')
}
