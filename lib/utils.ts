import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`
}

export function formatCentsExact(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function calculateDayNumber(startDate: Date): number {
  const now = new Date()
  const start = new Date(startDate)
  const diffTime = now.getTime() - start.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
  return Math.max(1, diffDays)
}

export function getStreakEmoji(streak: number): string {
  if (streak >= 90) return '👑'
  if (streak >= 30) return '💪'
  if (streak >= 7) return '🔥'
  return '✨'
}

const CURATED_NAMES: Record<string, string> = {
  tefillin_30: 'Tefillin', tefillin_90: 'Tefillin', tehillim_40: 'Tehillim',
  no_smoking_90: 'No Smoking', masechta_90: 'Masechta Brachos', no_lashon_hara_30: 'No Lashon Hara',
}

export function challengeDisplayName(c: { customName?: string; curatedKey?: string }): string {
  return c.customName || CURATED_NAMES[c.curatedKey || ''] || c.curatedKey || 'Challenge'
}
