import { Challenge } from './store'

export interface Badge {
  key: string
  emoji: string
  name: string
  description: string
}

export const BADGES: Badge[] = [
  { key: 'first_steps', emoji: '🏁', name: 'First Steps', description: 'Complete Day 1' },
  { key: 'week_warrior', emoji: '🔥', name: 'Week Warrior', description: '7-day streak' },
  { key: 'month_master', emoji: '💪', name: 'Month Master', description: '30-day streak' },
  { key: 'ninety_noble', emoji: '👑', name: 'Ninety Noble', description: '90-day streak' },
  { key: 'perfect_run', emoji: '✨', name: 'Perfect Run', description: 'Complete a challenge with zero missed days' },
  { key: 'first_backer', emoji: '💰', name: 'First Backer', description: 'Get your first sponsor' },
  { key: 'crowd_favorite', emoji: '🙌', name: 'Crowd Favorite', description: 'Get 5+ sponsors' },
  { key: 'challenge_accepted', emoji: '🎯', name: 'Challenge Accepted', description: 'A friend accepted your challenge invite' },
  { key: 'ripple_starter', emoji: '🌊', name: 'Ripple Starter', description: '1 person took your challenge because of you' },
  { key: 'ripple_effect', emoji: '🌊🌊', name: 'Ripple Effect', description: '5+ people took your challenge because of you' },
  { key: 'fundraiser', emoji: '💵', name: 'Fundraiser', description: 'Raise $100' },
  { key: 'changemaker', emoji: '💵💵', name: 'Changemaker', description: 'Raise $500' },
  { key: 'mitzvah_millionaire', emoji: '💵💵💵', name: 'Mitzvah Millionaire', description: 'Raise $1,000' },
]

export function getEarnedBadgeKeys(challenges: Challenge[]): Set<string> {
  const earned = new Set<string>()

  const maxStreak = Math.max(0, ...challenges.map(c => c.longestStreak))
  const totalRaised = challenges.reduce((s, c) => s + c.totalRaisedCents, 0)
  const totalRipples = challenges.reduce((s, c) => s + c.rippleCount, 0)
  const maxDonors = Math.max(0, ...challenges.map(c => c.donorCount))
  const anyDayOne = challenges.some(c => c.daysCompleted >= 1)
  const perfectRun = challenges.some(c =>
    c.status === 'completed' && (c.checkIns || []).length > 0 && (c.checkIns || []).every(ci => ci.completed)
  )

  if (anyDayOne) earned.add('first_steps')
  if (maxStreak >= 7) earned.add('week_warrior')
  if (maxStreak >= 30) earned.add('month_master')
  if (maxStreak >= 90) earned.add('ninety_noble')
  if (perfectRun) earned.add('perfect_run')
  if (maxDonors >= 1) earned.add('first_backer')
  if (maxDonors >= 5) earned.add('crowd_favorite')
  if (totalRipples >= 1) { earned.add('challenge_accepted'); earned.add('ripple_starter') }
  if (totalRipples >= 5) earned.add('ripple_effect')
  if (totalRaised >= 10000) earned.add('fundraiser')
  if (totalRaised >= 50000) earned.add('changemaker')
  if (totalRaised >= 100000) earned.add('mitzvah_millionaire')

  return earned
}

export function getBadges(challenges: Challenge[]): { badge: Badge; earned: boolean }[] {
  const earned = getEarnedBadgeKeys(challenges)
  return BADGES.map(badge => ({ badge, earned: earned.has(badge.key) }))
}
