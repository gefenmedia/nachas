import React from 'react'

/**
 * Nachas custom icon set — original stroke SVGs replacing generic emojis.
 * All icons: 24x24 viewBox, stroke = currentColor, so they inherit text color.
 */

const PATHS: Record<string, React.ReactNode> = {
  // Badge icons
  first_steps: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h12.5L15 8l2.5 4H5" />
    </>
  ),
  week_warrior: (
    <path d="M12 22c4.4 0 7-2.8 7-6.6 0-2.9-1.7-4.9-3.4-6.9C14.2 6.6 13 4.5 13 2c-2.9 2-4.4 4.5-4.4 7 0 1.4.4 2.4.9 3.4-.9-.5-1.4-1.5-1.5-2.9C6.5 11 5 13.1 5 15.4 5 19.2 7.6 22 12 22z" />
  ),
  month_master: (
    <>
      <path d="M12 3l7 2.8v5.4c0 4.8-3.4 7.8-7 9.3-3.6-1.5-7-4.5-7-9.3V5.8L12 3z" />
      <path d="M9 11.5l2.2 2.2 4-4.2" />
    </>
  ),
  ninety_noble: (
    <>
      <path d="M3 8.5l4.2 3.4L12 5.5l4.8 6.4L21 8.5 19.5 18h-15L3 8.5z" />
      <path d="M5 21h14" />
    </>
  ),
  perfect_run: (
    <>
      <path d="M11 4l1.6 4.4L17 10l-4.4 1.6L11 16l-1.6-4.4L5 10l4.4-1.6L11 4z" />
      <path d="M18.5 14.5l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3z" />
    </>
  ),
  first_backer: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 6.5v11" />
      <path d="M15 9c-.6-1-1.7-1.5-3-1.5-1.7 0-3 .9-3 2.2 0 3 6 1.5 6 4.5 0 1.4-1.3 2.3-3 2.3-1.3 0-2.4-.6-3-1.5" />
    </>
  ),
  crowd_favorite: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19.5c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" />
      <path d="M15.5 5.8a2.75 2.75 0 010 5.4" />
      <path d="M16.5 14.3c2.3.6 4 2.7 4 5.2" />
    </>
  ),
  challenge_accepted: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  ripple_starter: (
    <path d="M2.5 12c2.4-3.2 4.1-3.2 6.5 0s4.1 3.2 6.5 0 4.1-3.2 6.5 0" />
  ),
  ripple_effect: (
    <>
      <path d="M2.5 8.5c2.4-3.2 4.1-3.2 6.5 0s4.1 3.2 6.5 0 4.1-3.2 6.5 0" />
      <path d="M2.5 15.5c2.4-3.2 4.1-3.2 6.5 0s4.1 3.2 6.5 0 4.1-3.2 6.5 0" />
    </>
  ),
  fundraiser: (
    <>
      <rect x="2.5" y="7" width="19" height="10" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6 12h.01 M18 12h.01" />
    </>
  ),
  changemaker: (
    <>
      <path d="M3 21h18" />
      <path d="M6 21v-6 M11 21V9 M16 21v-9 M21 21V5" />
    </>
  ),
  mitzvah_millionaire: (
    <>
      <path d="M12 3l5.5 5L12 21 6.5 8 12 3z" />
      <path d="M6.5 8h11" />
      <path d="M12 3L9.5 8 12 21 M12 3l2.5 5L12 21" />
    </>
  ),
  // General UI icons
  flame: (
    <path d="M12 22c4.4 0 7-2.8 7-6.6 0-2.9-1.7-4.9-3.4-6.9C14.2 6.6 13 4.5 13 2c-2.9 2-4.4 4.5-4.4 7 0 1.4.4 2.4.9 3.4-.9-.5-1.4-1.5-1.5-2.9C6.5 11 5 13.1 5 15.4 5 19.2 7.6 22 12 22z" />
  ),
  heart_hands: (
    <>
      <path d="M12 20.5S4 15.5 4 9.8C4 6.9 6.2 5 8.6 5c1.5 0 2.7.8 3.4 1.9C12.7 5.8 13.9 5 15.4 5 17.8 5 20 6.9 20 9.8c0 5.7-8 10.7-8 10.7z" />
    </>
  ),
}

export function CustomIcon({
  name,
  className = 'w-5 h-5',
  strokeWidth = 1.8,
}: {
  name: keyof typeof PATHS | string
  className?: string
  strokeWidth?: number
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name] || PATHS.flame}
    </svg>
  )
}

/** Badge icon by badge key (keys match lib/badges.ts) */
export function BadgeIcon({ badgeKey, className = 'w-5 h-5' }: { badgeKey: string; className?: string }) {
  return <CustomIcon name={badgeKey} className={className} />
}

/** Custom streak flame — replaces the 🔥 emoji in UI chrome */
export function StreakFlame({ className = 'w-5 h-5' }: { className?: string }) {
  return <CustomIcon name="flame" className={className} />
}

/**
 * HeroFlame — the emotional centerpiece of the app. A filled, two-tone flame
 * with an inner core, built to feel alive (pair with .animate-flame). This is
 * deliberately NOT a generic stroke icon — it has depth and a warm gradient.
 * `lit` controls whether it glows (active streak) or sits grey (streak broken).
 */
export function HeroFlame({
  className = 'w-16 h-16',
  lit = true,
  animate = true,
}: {
  className?: string
  lit?: boolean
  animate?: boolean
}) {
  const gid = 'nachas-flame-grad'
  const cid = 'nachas-flame-core'
  return (
    <svg viewBox="0 0 64 64" fill="none" className={`${className} ${animate && lit ? 'animate-flame' : ''}`} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={lit ? '#f9d76e' : '#3a4a63'} />
          <stop offset="0.55" stopColor={lit ? '#f5c542' : '#2c3a52'} />
          <stop offset="1" stopColor={lit ? '#ff9838' : '#243146'} />
        </linearGradient>
        <linearGradient id={cid} x1="32" y1="24" x2="32" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={lit ? '#fff3c4' : '#4a5a73'} />
          <stop offset="1" stopColor={lit ? '#ffcaa0' : '#3a4a63'} />
        </linearGradient>
      </defs>
      {/* outer flame body */}
      <path
        d="M32 3c1.5 6.2 5.4 9.8 8.9 13.4 3.8 3.9 7.1 8.2 7.1 14.3C48 42.4 40.8 50 32 50s-16-7.6-16-19.3c0-4.2 1.6-7.4 3.6-10 .2 2.6 1.3 4.6 3.3 5.7-1-2.1-1.6-4.3-1.6-6.6C21.3 12.6 26.4 6.9 32 3z"
        fill={`url(#${gid})`}
      />
      {/* inner core */}
      <path
        d="M32 27c.9 3.4 3.2 5.2 5 7.4 1.8 2.1 2.9 4 2.9 6.6C39.9 46.3 36.4 50 32 50s-7.9-3.7-7.9-9c0-2.3 1-4.2 2.3-6 .3 1.4.9 2.5 2 3.2-.6-1.3-.9-2.6-.9-4C27.5 31.4 29.6 28.6 32 27z"
        fill={`url(#${cid})`}
      />
    </svg>
  )
}
