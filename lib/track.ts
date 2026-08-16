// Beta activity tracker — every meaningful user action, logged locally (no backend).
// Powers the investor dashboard (/admin) and one-tap export/merge across devices.

export interface TrackEvent {
  id: string
  type: string
  ts: string
  userId?: string
  userName?: string
  meta?: Record<string, any>
  origin?: string // device label, set when events arrive via export/merge
}

const KEY = 'nachas_events'
const MAX_EVENTS = 2000

function eventId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function getEvents(): TrackEvent[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

// --- Real-time collection (fire-and-forget; localStorage remains the offline backup) ---

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ LIVE COLLECTION SERVER — paste your deployed server URL here (no        │
// │ trailing slash), e.g. 'https://nachas-api.onrender.com'.                │
// │ Leave empty to use same-origin (works automatically if the app and      │
// │ server are hosted together).                                            │
// └─────────────────────────────────────────────────────────────────────────┘
const API_BASE = 'https://nachas.onrender.com'

function beacon(event: TrackEvent) {
  if (typeof window === 'undefined') return
  try {
    const body = JSON.stringify({ event })
    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${API_BASE}/api/track`, new Blob([body], { type: 'text/plain' }))
    } else {
      fetch(`${API_BASE}/api/track`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body, keepalive: true }).catch(() => {})
    }
  } catch {}
}

// Upload any locally logged events the server doesn't have yet (server dedupes by id).
// Runs once per session — this is what backfills events logged before the server existed.
export function syncToServer() {
  if (typeof window === 'undefined') return
  try {
    if (sessionStorage.getItem('nachas_synced') === '1') return
    const events = getEvents()
    if (events.length === 0) { sessionStorage.setItem('nachas_synced', '1'); return }
    fetch(`${API_BASE}/api/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ events }),
    }).then(r => { if (r.ok) sessionStorage.setItem('nachas_synced', '1') }).catch(() => {})
  } catch {}
}

// Global (all-devices) event log from the server; null when the app is served statically
export async function fetchGlobalEvents(): Promise<TrackEvent[] | null> {
  if (typeof window === 'undefined') return null
  try {
    const r = await fetch(`${API_BASE}/api/events`, { cache: 'no-store' })
    if (!r.ok) return null
    const data = await r.json()
    return Array.isArray(data.events) ? data.events : null
  } catch {
    return null
  }
}

export function trackEvent(
  type: string,
  meta: Record<string, any> = {},
  user?: { userId?: string; userName?: string }
) {
  if (typeof window === 'undefined') return
  try {
    let userId = user?.userId
    let userName = user?.userName
    if (!userId || !userName) {
      const session = JSON.parse(localStorage.getItem('nachas_session') || 'null')
      userId = userId || session?.userId
      userName = userName || session?.name
    }
    const events = getEvents()
    events.push({ id: eventId(), type, ts: new Date().toISOString(), userId, userName, meta })
    if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS)
    localStorage.setItem(KEY, JSON.stringify(events))
    beacon(events[events.length - 1])
  } catch {
    // tracking must never break the app
  }
}

// Merge an exported log from another device; returns number of NEW events added
export function mergeEvents(incoming: TrackEvent[], origin: string): number {
  if (typeof window === 'undefined') return 0
  const events = getEvents()
  const seen = new Set(events.map(e => e.id))
  let added = 0
  for (const e of incoming) {
    if (!e || !e.id || !e.type || !e.ts || seen.has(e.id)) continue
    seen.add(e.id)
    events.push({ ...e, origin: e.origin || origin })
    added++
  }
  events.sort((a, b) => a.ts.localeCompare(b.ts))
  const trimmed = events.length > MAX_EVENTS * 2 ? events.slice(events.length - MAX_EVENTS * 2) : events
  localStorage.setItem(KEY, JSON.stringify(trimmed))
  return added
}

export interface BetaStats {
  signups: number
  logins: number
  challengesLaunched: number
  ripples: number
  checkIns: number
  daysMissed: number
  challengesCompleted: number
  pledges: number
  comments: number
  chizuk: number
  shares: number
  photos: number
  pledgedCents: number
  raisedCents: number
  activePerDayCents: number
  uniqueUsers: number
  devices: number
  byDay: { date: string; count: number }[]
}

export function computeStats(events: TrackEvent[]): BetaStats {
  const count = (t: string) => events.filter(e => e.type === t).length

  const pledgeEvents = events.filter(e => e.type === 'pledge_created')
  const pledgedCents = pledgeEvents.reduce((sum, e) => {
    const m = e.meta || {}
    if (m.type === 'flat') return sum + (m.flatAmountCents || 0)
    return sum + (m.perDayAmountCents || 0) * (m.durationDays || 0) + (m.bonusAmountCents || 0)
  }, 0)
  const raisedCents =
    pledgeEvents.filter(e => e.meta?.type === 'flat').reduce((s, e) => s + (e.meta?.flatAmountCents || 0), 0) +
    events.filter(e => e.type === 'check_in').reduce((s, e) => s + (e.meta?.raisedDeltaCents || 0), 0) +
    events.filter(e => e.type === 'challenge_completed').reduce((s, e) => s + (e.meta?.bonusCents || 0), 0)
  const activePerDayCents = pledgeEvents
    .filter(e => e.meta?.type === 'per_day')
    .reduce((s, e) => s + (e.meta?.perDayAmountCents || 0), 0)

  const byDay: { date: string; count: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    byDay.push({ date: key, count: events.filter(e => e.ts.slice(0, 10) === key).length })
  }

  return {
    signups: count('signup'),
    logins: count('login'),
    challengesLaunched: count('challenge_created'),
    ripples: count('ripple'),
    checkIns: count('check_in'),
    daysMissed: count('day_missed'),
    challengesCompleted: count('challenge_completed'),
    pledges: count('pledge_created'),
    comments: count('comment_posted'),
    chizuk: count('chizuk_sent'),
    shares: count('share_clicked'),
    photos: count('photo_uploaded'),
    pledgedCents,
    raisedCents,
    activePerDayCents,
    uniqueUsers: new Set(events.map(e => e.userId).filter(Boolean)).size,
    devices: new Set(events.map(e => e.origin).filter(Boolean)).size,
    byDay,
  }
}
