// Client-side data store using localStorage
// Replaces the entire backend for static deployment

import { challengeDisplayName } from '@/lib/utils'
import { trackEvent, syncToServer } from '@/lib/track'
import { supabase } from '@/lib/supabase'

// --- Types ---
export interface User {
  id: string
  email: string
  name: string
  password: string
  avatarUrl?: string
  bio?: string
  notificationTime: string
  timezone: string
  createdAt: string
}

export interface Charity {
  id: string
  name: string
  slug: string
  description: string
  fullDescription?: string
  logoUrl?: string
  website?: string
  contactEmail?: string
  isActive: boolean
  totalRaisedCents: number
  campaignCount: number
  createdAt: string
}

export interface CheckIn {
  id: string
  challengeId: string
  dayNumber: number
  completed: boolean
  note?: string
  photoUrl?: string
  checkInDate: string
  createdAt: string
}

export interface Donation {
  id: string
  challengeId: string
  donorName: string
  donorEmail: string
  donorMessage?: string
  type: 'per_day' | 'flat'
  perDayAmountCents?: number
  bonusAmountCents: number
  flatAmountCents?: number
  status: string
  totalChargedCents: number
  platformFeeCents: number
  netToCharityCents: number
  createdAt: string
}

export interface Comment {
  id: string
  challengeId: string
  authorName: string
  authorEmail: string
  text: string
  createdAt: string
}

export interface Follow {
  id: string
  followerUserId?: string   // undefined for guests
  followerName: string
  followeeUserId: string
  mutual: boolean
  createdAt: string
}

export interface Challenge {
  id: string
  userId: string
  charityId: string
  type: 'curated' | 'custom'
  curatedKey?: string
  customName?: string
  customDescription?: string
  category?: string
  durationDays: number
  goalAmountCents: number
  dedication?: string
  personalNote?: string
  status: 'active' | 'completed' | 'abandoned' | 'failed'
  startDate: string
  endDate: string
  currentStreak: number
  longestStreak: number
  daysCompleted: number
  totalRaisedCents: number
  donorCount: number
  rippleCount: number
  followerCount: number
  parentChallengeId?: string
  isPublic: boolean
  createdAt: string
  completedAt?: string
  // Text fallback for the creator's name, from Supabase's creator_name column,
  // used when the real user profile hasn't synced to this device yet
  creatorNameFallback?: string
  // Expanded fields (not stored, computed on load)
  user?: User
  charity?: Charity
  checkIns?: CheckIn[]
  donations?: Donation[]
  comments?: Comment[]
  childChallenges?: Challenge[]
}

// --- Storage Keys ---
const KEYS = {
  users: 'nachas_users',
  charities: 'nachas_charities',
  challenges: 'nachas_challenges',
  checkIns: 'nachas_checkins',
  donations: 'nachas_donations',
  comments: 'nachas_comments',
  follows: 'nachas_follows',
  session: 'nachas_session',
}

// --- Helpers ---
function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  const raw = localStorage.getItem(key)
  return raw ? JSON.parse(raw) : defaultValue
}

function setItem<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// --- Seed Data ---
function seedCharities(): Charity[] {
  const placeholder = (id: string, name: string, slug: string, description: string): Charity => ({
    id, name, slug, description,
    fullDescription: description,
    logoUrl: `https://placehold.co/100x100/1a2a4a/f5c542?text=${name[0]}`,
    website: '', contactEmail: '',
    isActive: true, totalRaisedCents: 0, campaignCount: 0, createdAt: new Date().toISOString(),
  })
  return [
    {
      id: 'charity-1', name: 'Hatzolah', slug: 'hatzolah',
      description: 'Emergency medical services',
      fullDescription: 'Community-based emergency medical response organization serving neighborhoods worldwide.',
      logoUrl: 'https://placehold.co/100x100/1a2a4a/f5c542?text=H',
      website: 'https://hatzolah.org', contactEmail: 'fundraising@hatzolah.org',
      isActive: true, totalRaisedCents: 125000, campaignCount: 42, createdAt: new Date().toISOString(),
    },
    {
      id: 'charity-2', name: 'Masbia', slug: 'masbia',
      description: 'Soup kitchen network',
      fullDescription: 'Providing hot meals and groceries to families in need across New York.',
      logoUrl: 'https://placehold.co/100x100/1a2a4a/f5c542?text=M',
      website: 'https://masbia.org', contactEmail: 'donate@masbia.org',
      isActive: true, totalRaisedCents: 87000, campaignCount: 28, createdAt: new Date().toISOString(),
    },
    {
      id: 'charity-3', name: 'Chai Lifeline', slug: 'chai-lifeline',
      description: 'Supporting sick children',
      fullDescription: 'Comprehensive support services for children with illnesses and their families.',
      logoUrl: 'https://placehold.co/100x100/1a2a4a/f5c542?text=C',
      website: 'https://chailifeline.org', contactEmail: 'giving@chailifeline.org',
      isActive: true, totalRaisedCents: 64000, campaignCount: 19, createdAt: new Date().toISOString(),
    },
    placeholder('charity-4', 'Tomchei Shabbos', 'tomchei-shabbos', 'Shabbos food packages for families'),
    placeholder('charity-5', 'Bikur Cholim', 'bikur-cholim', 'Visiting and supporting the sick'),
    placeholder('charity-6', 'Nefesh B\'Nefesh', 'nefesh-bnefesh', 'Supporting new olim'),
    placeholder('charity-7', 'Ohel', 'ohel', 'Mental health and family services'),
    placeholder('charity-8', 'Bonei Olam', 'bonei-olam', 'Helping families grow'),
    placeholder('charity-9', 'Shalva', 'shalva', 'Children with special needs'),
    placeholder('charity-10', 'Yad Eliezer', 'yad-eliezer', 'Fighting poverty in Israel'),
  ]
}

function seedDemoData() {
  const charities = getItem<Charity[]>(KEYS.charities, [])
  if (charities.length === 0) {
    setItem(KEYS.charities, seedCharities())
  } else {
    // backfill charities added after this device first seeded
    const have = new Set(charities.map(c => c.id))
    const missing = seedCharities().filter(c => !have.has(c.id))
    if (missing.length > 0) setItem(KEYS.charities, [...charities, ...missing])
  }

  const users = getItem<User[]>(KEYS.users, [])
  if (users.length === 0) {
    const demoUser: User = {
      id: 'user-demo', email: 'demo@nachas.app', name: 'Yossi Cohen',
      password: 'demo123', avatarUrl: 'https://placehold.co/150x150/1a2a4a/f5c542?text=YC',
      bio: 'Doing 90 days of tefillin l\'ilui nishmas my grandfather. Every day counts.',
      notificationTime: '20:00', timezone: 'America/New_York',
      createdAt: new Date().toISOString(),
    }
    setItem(KEYS.users, [demoUser])

    // Create a demo challenge (started 16 days ago — its 17 check-ins end today)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 16)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 90)

    const demoChallenge: Challenge = {
      id: 'challenge-demo', userId: demoUser.id, charityId: 'charity-1',
      type: 'curated', curatedKey: 'tefillin_90', category: 'daily_mitzvah',
      durationDays: 90, goalAmountCents: 100000,
      dedication: "L'ilui nishmas my grandfather, Yaakov ben Yosef",
      personalNote: "Starting this challenge to strengthen my daily commitment and raise funds for Hatzolah.",
      status: 'active', startDate: startDate.toISOString(),
      endDate: endDate.toISOString(), currentStreak: 5, longestStreak: 11,
      daysCompleted: 16, totalRaisedCents: 58400, donorCount: 12, rippleCount: 3,
      followerCount: 12,
      isPublic: true, createdAt: startDate.toISOString(),
    }
    // A completed 40-day Tehillim challenge from earlier this year (profile history)
    const compStart = new Date()
    compStart.setDate(compStart.getDate() - 65)
    const compEnd = new Date(compStart)
    compEnd.setDate(compEnd.getDate() + 40)
    const completedChallenge: Challenge = {
      id: 'challenge-demo-completed', userId: demoUser.id, charityId: 'charity-2',
      type: 'curated', curatedKey: 'tehillim_40', category: 'tefilla',
      durationDays: 40, goalAmountCents: 25000,
      dedication: "For a refuah sheleima for a close friend",
      personalNote: 'Finished all 40 days!',
      status: 'completed', startDate: compStart.toISOString(),
      endDate: compEnd.toISOString(), currentStreak: 40, longestStreak: 40,
      daysCompleted: 40, totalRaisedCents: 21300, donorCount: 6, rippleCount: 1,
      followerCount: 8,
      isPublic: true, createdAt: compStart.toISOString(),
    }
    setItem(KEYS.challenges, [demoChallenge, completedChallenge])

    // Seed check-ins for 17 days (day 12 was a missed day — streak reset)
    const checkIns: CheckIn[] = []
    for (let i = 1; i <= 17; i++) {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i - 1)
      checkIns.push({
        id: generateId(), challengeId: demoChallenge.id, dayNumber: i,
        completed: i !== 12, note: i === 1 ? 'First day! Excited to start.' : (i === 12 ? 'Missed — traveling all day' : undefined),
        checkInDate: d.toISOString(), createdAt: d.toISOString(),
      })
    }
    for (let i = 1; i <= 40; i++) {
      const d = new Date(compStart)
      d.setDate(d.getDate() + i - 1)
      checkIns.push({
        id: generateId(), challengeId: completedChallenge.id, dayNumber: i,
        completed: true,
        checkInDate: d.toISOString(), createdAt: d.toISOString(),
      })
    }
    setItem(KEYS.checkIns, checkIns)

    // Seed donations (12 records to match the demo challenge's donorCount)
    const donations: Donation[] = [
      { id: generateId(), challengeId: demoChallenge.id, donorName: 'Sarah L.', donorEmail: 'sarah@example.com', type: 'per_day', perDayAmountCents: 100, bonusAmountCents: 1000, status: 'pledged', totalChargedCents: 0, platformFeeCents: 0, netToCharityCents: 0, createdAt: new Date().toISOString() },
      { id: generateId(), challengeId: demoChallenge.id, donorName: 'David K.', donorEmail: 'david@example.com', type: 'per_day', perDayAmountCents: 200, bonusAmountCents: 2000, status: 'pledged', totalChargedCents: 0, platformFeeCents: 0, netToCharityCents: 0, createdAt: new Date().toISOString() },
      { id: generateId(), challengeId: demoChallenge.id, donorName: 'Rachel M.', donorEmail: 'rachel@example.com', type: 'flat', flatAmountCents: 5000, bonusAmountCents: 0, status: 'pledged', totalChargedCents: 0, platformFeeCents: 0, netToCharityCents: 0, createdAt: new Date().toISOString() },
    ]
    const extraDonors = ['Benny S.', 'Chana W.', 'Dov F.', 'Esther G.', 'Pinchas R.', 'Miriam T.', 'Shlomo Z.', 'Devorah K.', 'Ari B.']
    extraDonors.forEach((name, i) => {
      donations.push({
        id: generateId(), challengeId: demoChallenge.id, donorName: name,
        donorEmail: `${name.split(' ')[0].toLowerCase()}@example.com`,
        type: 'flat', flatAmountCents: 1800 + (i * 200), bonusAmountCents: 0,
        status: 'pledged', totalChargedCents: 0, platformFeeCents: 0, netToCharityCents: 0,
        createdAt: new Date(Date.now() - (i + 1) * 43200000).toISOString(),
      })
    })
    setItem(KEYS.donations, donations)

    // Seed comments
    const comments: Comment[] = [
      { id: generateId(), challengeId: demoChallenge.id, authorName: 'Sarah L.', authorEmail: 'sarah@example.com', text: 'Keep it up Yossi! Day 17 is amazing! 🔥', createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: generateId(), challengeId: demoChallenge.id, authorName: 'David K.', authorEmail: 'david@example.com', text: 'So proud of you! Hatzolah is lucky to have supporters like you.', createdAt: new Date(Date.now() - 172800000).toISOString() },
      { id: generateId(), challengeId: demoChallenge.id, authorName: 'Moshe B.', authorEmail: 'moshe@example.com', text: 'This inspired me to start my own challenge!', createdAt: new Date(Date.now() - 259200000).toISOString() },
    ]
    setItem(KEYS.comments, comments)

    // Seed child challenges (ripples)
    const childUsers: User[] = [
      { id: 'user-2', email: 'avi@example.com', name: 'Avi Rosen', password: 'pass', notificationTime: '20:00', timezone: 'America/New_York', createdAt: new Date().toISOString() },
      { id: 'user-3', email: 'moshe@example.com', name: 'Moshe Berg', password: 'pass', notificationTime: '20:00', timezone: 'America/New_York', createdAt: new Date().toISOString() },
      { id: 'user-4', email: 'rachel@example.com', name: 'Rachel Levi', password: 'pass', notificationTime: '20:00', timezone: 'America/New_York', createdAt: new Date().toISOString() },
    ]
    setItem(KEYS.users, [...users, demoUser, ...childUsers])

    const childChallenges: Challenge[] = childUsers.map((u, i) => ({
      id: `challenge-child-${i}`, userId: u.id, charityId: 'charity-1',
      type: 'curated', curatedKey: 'tefillin_90', category: 'daily_mitzvah',
      durationDays: 90, goalAmountCents: 50000 + (i * 10000),
      status: 'active', startDate: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
      endDate: new Date(Date.now() + (90 - i - 1) * 86400000).toISOString(),
      currentStreak: 15 - i, longestStreak: 15 - i, daysCompleted: 15 - i,
      totalRaisedCents: 20000 + (i * 5000), donorCount: 5 + i, rippleCount: 0,
      followerCount: 4 + i,
      parentChallengeId: demoChallenge.id, isPublic: true,
      createdAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
    }))
    setItem(KEYS.challenges, [demoChallenge, completedChallenge, ...childChallenges])
  }
}

// --- The Chevra System (circle of influence) ---

export interface ChevraMember {
  id: string
  name: string
  challengeName: string
  streak: number
  daysThisWeek: number
  checkedInToday: boolean
  flickering: boolean
  milestoneNote?: string
  challengeId?: string       // real ripple members only (linked to their page)
  broughtYouIn?: boolean
  raisedCents: number
}

export interface Chevra {
  members: ChevraMember[]
  unlit: number
  totalChallengers: number
  totalDays: number
  totalRaisedCents: number
  userDaysThisWeek: number
  standings: { name: string; days: number; isUser: boolean }[]
}

// Simulated chevra friends (demo: no backend — derived from the date so they
// advance daily but stay stable within a day; see "DEMO IMPLEMENTATION" in the spec)
const SIM_SEED_DATE = '2026-07-20'
const SIM_FRIENDS: { name: string; challengeName: string; baseStreak: number; weeklyMisses: number; lightsToday: boolean; flickering?: boolean; milestoneNote?: string; raisedCents: number }[] = [
  { name: 'Malkie K.', challengeName: 'Tehillim', baseStreak: 16, weeklyMisses: 0, lightsToday: true, milestoneNote: '2 days from her Siyum 🎉', raisedCents: 14200 },
  { name: 'Dov F.', challengeName: 'Tefillin', baseStreak: 29, weeklyMisses: 1, lightsToday: true, flickering: true, raisedCents: 9600 },
  { name: 'Shira L.', challengeName: 'No Lashon Hara', baseStreak: 36, weeklyMisses: 0, lightsToday: true, raisedCents: 12100 },
  { name: 'Yaakov S.', challengeName: 'Masechta Brachos', baseStreak: 9, weeklyMisses: 2, lightsToday: false, raisedCents: 5400 },
  { name: 'Mendy R.', challengeName: 'Tefillin', baseStreak: 4, weeklyMisses: 1, lightsToday: false, raisedCents: 2300 },
]

function isoWeekday(d: Date): number {
  return ((d.getDay() + 6) % 7) + 1 // Mon=1 ... Sun=7
}

function daysSince(dateStr: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000))
}

// --- Public API ---

export const store = {
  init() {
    seedDemoData()
    syncToServer()
    void this.syncFromServer()
  },

  // --- Server-authoritative sync (same-origin API; localStorage is the offline cache) ---

  // Push one raw record to the server (fire-and-forget). The server hashes passwords on ingest and never stores or returns them.
  pushRecord(collection: string, record: any) {
    if (typeof window === 'undefined' || !record || !record.id) return
    try {
      fetch(`${window.location.origin}/api/mutate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection, record }),
        keepalive: true,
      }).catch(() => {})
    } catch {}
  },

  // Pull the full server state and merge it over local data (server wins per record).
  // If the server is empty, publish our local (seed) data so every device shares it.
  async syncFromServer(): Promise<boolean> {
    if (typeof window === 'undefined') return false
    let cloudSynced = false

    // Cloud sync via Supabase — pulls shared challenges so links work across devices
    try {
      const { data: cloudChallenges } = await supabase.from('challenges').select('*')
      if (cloudChallenges && cloudChallenges.length > 0) {
        const local = getItem<Challenge[]>(KEYS.challenges, [])
        const byId = new Map(local.map(c => [c.id, c]))
        for (const rec of cloudChallenges) {
          if (!rec || !rec.id) continue
          const existing = byId.get(rec.id)
          byId.set(rec.id, {
            id: rec.id,
            userId: rec.user_id || existing?.userId || '',
            creatorNameFallback: rec.creator_name || existing?.creatorNameFallback,
            charityId: existing?.charityId || 'charity-1',
            type: existing?.type || 'custom',
            customName: rec.title,
            customDescription: rec.description,
            durationDays: existing?.durationDays || 30,
            goalAmountCents: (rec.goal_amount || 0) * 100,
            status: existing?.status || 'active',
            startDate: rec.created_at || new Date().toISOString(),
            endDate: existing?.endDate || new Date().toISOString(),
            currentStreak: existing?.currentStreak ?? 1,
            longestStreak: existing?.longestStreak ?? 1,
            daysCompleted: existing?.daysCompleted ?? 1,
            totalRaisedCents: (rec.raised_amount || 0) * 100,
            donorCount: existing?.donorCount ?? 0,
            rippleCount: existing?.rippleCount ?? 0,
            followerCount: existing?.followerCount ?? 0,
            isPublic: existing?.isPublic ?? true,
            createdAt: rec.created_at || new Date().toISOString(),
            ...(existing || {}),
          } as Challenge)
        }
        setItem(KEYS.challenges, Array.from(byId.values()))
        window.dispatchEvent(new Event('nachas-synced'))
        cloudSynced = true
      }
    } catch (e) {
      console.error('Supabase sync error:', e)
    }

    // Cloud sync via Supabase — donations, comments, check-ins, and follows
    // so activity from any device shows up everywhere (mirrors the challenges sync above)
    try {
      const [donRes, comRes, ciRes, folRes] = await Promise.all([
        supabase.from('donations').select('*'),
        supabase.from('comments').select('*'),
        supabase.from('checkins').select('*'),
        supabase.from('follows').select('*'),
      ])

      if (donRes.data && donRes.data.length > 0) {
        const local = getItem<Donation[]>(KEYS.donations, [])
        const byId = new Map(local.map(d => [d.id, d]))
        for (const rec of donRes.data) {
          if (!rec || !rec.id) continue
          byId.set(rec.id, {
            id: rec.id,
            challengeId: rec.challenge_id,
            donorName: rec.donor_name,
            donorEmail: rec.donor_email,
            donorMessage: rec.donor_message || undefined,
            type: rec.type,
            perDayAmountCents: rec.per_day_amount_cents ?? undefined,
            bonusAmountCents: rec.bonus_amount_cents ?? 0,
            flatAmountCents: rec.flat_amount_cents ?? undefined,
            status: rec.status || 'pledged',
            totalChargedCents: rec.total_charged_cents ?? 0,
            platformFeeCents: rec.platform_fee_cents ?? 0,
            netToCharityCents: rec.net_to_charity_cents ?? 0,
            createdAt: rec.created_at || new Date().toISOString(),
          } as Donation)
        }
        setItem(KEYS.donations, Array.from(byId.values()))
        cloudSynced = true
      }

      if (comRes.data && comRes.data.length > 0) {
        const local = getItem<Comment[]>(KEYS.comments, [])
        const byId = new Map(local.map(c => [c.id, c]))
        for (const rec of comRes.data) {
          if (!rec || !rec.id) continue
          const existing = byId.get(rec.id)
          byId.set(rec.id, {
            id: rec.id,
            challengeId: rec.challenge_id,
            authorName: rec.user_name,
            authorEmail: existing?.authorEmail || '',
            text: rec.content,
            createdAt: rec.created_at || new Date().toISOString(),
          } as Comment)
        }
        setItem(KEYS.comments, Array.from(byId.values()))
        cloudSynced = true
      }

      if (ciRes.data && ciRes.data.length > 0) {
        const local = getItem<CheckIn[]>(KEYS.checkIns, [])
        const byId = new Map(local.map(c => [c.id, c]))
        for (const rec of ciRes.data) {
          if (!rec || !rec.id) continue
          byId.set(rec.id, {
            id: rec.id,
            challengeId: rec.challenge_id,
            dayNumber: rec.day_number,
            completed: rec.completed,
            note: rec.note || undefined,
            photoUrl: rec.photo_url || undefined,
            checkInDate: rec.check_in_date || rec.created_at || new Date().toISOString(),
            createdAt: rec.created_at || new Date().toISOString(),
          } as CheckIn)
        }
        setItem(KEYS.checkIns, Array.from(byId.values()))
        cloudSynced = true
      }

      if (folRes.data && folRes.data.length > 0) {
        const local = getItem<Follow[]>(KEYS.follows, [])
        const byId = new Map(local.map(f => [f.id, f]))
        for (const rec of folRes.data) {
          if (!rec || !rec.id) continue
          byId.set(rec.id, {
            id: rec.id,
            followerUserId: rec.follower_user_id || undefined,
            followerName: rec.follower_name,
            followeeUserId: rec.followee_user_id,
            mutual: !!rec.mutual,
            createdAt: rec.created_at || new Date().toISOString(),
          } as Follow)
        }
        setItem(KEYS.follows, Array.from(byId.values()))
        cloudSynced = true
      }

      // Recompute derived challenge stats from the freshly merged activity, so
      // totals/streaks/follower counts are correct regardless of which device
      // the underlying donation/check-in/follow actually happened on
      const challenges = getItem<Challenge[]>(KEYS.challenges, [])
      if (challenges.length > 0) {
        const allDonations = getItem<Donation[]>(KEYS.donations, [])
        const allCheckIns = getItem<CheckIn[]>(KEYS.checkIns, [])
        const updatedChallenges = challenges.map(c => {
          const donations = allDonations.filter(d => d.challengeId === c.id)
          const checkIns = allCheckIns.filter(ci => ci.challengeId === c.id).sort((a, b) => a.dayNumber - b.dayNumber)

          const totalRaisedCents = donations.reduce((sum, d) => {
            if (d.type === 'flat') return sum + (d.flatAmountCents || 0)
            return sum + ((d.perDayAmountCents || 0) * c.durationDays) + (d.bonusAmountCents || 0)
          }, 0)

          let daysCompleted = 0, longestStreak = 0, running = 0
          for (const ci of checkIns) {
            if (ci.completed) { daysCompleted++; running++; longestStreak = Math.max(longestStreak, running) }
            else running = 0
          }
          let currentStreak = 0
          for (let i = checkIns.length - 1; i >= 0; i--) {
            if (checkIns[i].completed) currentStreak++
            else break
          }

          return {
            ...c,
            totalRaisedCents: donations.length > 0 ? totalRaisedCents : c.totalRaisedCents,
            donorCount: donations.length > 0 ? donations.length : c.donorCount,
            daysCompleted: checkIns.length > 0 ? Math.max(daysCompleted, c.daysCompleted) : c.daysCompleted,
            longestStreak: checkIns.length > 0 ? Math.max(longestStreak, c.longestStreak) : c.longestStreak,
            currentStreak: checkIns.length > 0 ? currentStreak : c.currentStreak,
            followerCount: Math.max(this.getFollowerCount(c.userId), c.followerCount),
          }
        })
        setItem(KEYS.challenges, updatedChallenges)
      }
    } catch (e) {
      console.error('Supabase activity sync error:', e)
    }

    try {
      const r = await fetch(`${window.location.origin}/api/state`, { cache: 'no-store' })
      if (!r.ok) return cloudSynced
      const state = await r.json()
      const map: Record<string, string> = {
        users: KEYS.users, charities: KEYS.charities, challenges: KEYS.challenges,
        checkIns: KEYS.checkIns, donations: KEYS.donations, comments: KEYS.comments, follows: KEYS.follows,
      }
      if (!Array.isArray(state.users) || state.users.length === 0) {
        if (!sessionStorage.getItem('nachas_state_published')) {
          sessionStorage.setItem('nachas_state_published', '1')
          const collections: Record<string, any[]> = {
            users: this.getUsers(),
            charities: this.getCharities(),
            challenges: this.getChallenges(),
            checkIns: this.getCheckIns(),
            donations: this.getDonations(),
            comments: this.getComments(),
            follows: getItem(KEYS.follows, []),
          }
          await fetch(`${window.location.origin}/api/state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collections }),
          }).catch(() => {})
        }
        return true
      }
      for (const [name, key] of Object.entries(map)) {
        const incoming: any[] = Array.isArray(state[name]) ? state[name] : []
        if (!incoming.length) continue
        const local = getItem<any[]>(key, [])
        const byId = new Map(local.map(i => [i.id, i]))
        for (const rec of incoming) {
          if (!rec || !rec.id) continue
          // merge over local so a sanitized server user never wipes a local password
          byId.set(rec.id, { ...(byId.get(rec.id) || {}), ...rec })
        }
        setItem(key, Array.from(byId.values()))
      }
      window.dispatchEvent(new Event('nachas-synced'))
      return true
    } catch {
      return cloudSynced
    }
  },

  // Users
  getUsers(): User[] {
    return getItem(KEYS.users, [])
  },

  createUser(data: Omit<User, 'id' | 'createdAt'>): User {
    const users = this.getUsers()
    if (users.find(u => u.email === data.email)) {
      throw new Error('Email already registered')
    }
    const user: User = { ...data, id: generateId(), createdAt: new Date().toISOString() }
    setItem(KEYS.users, [...users, user])
    this.pushRecord('users', user)
    trackEvent('signup', { name: user.name }, { userId: user.id, userName: user.name })
    return user
  },

  // Merge a sanitized server-side user into local storage (attaching the password locally)
  importServerUser(serverUser: any, password?: string): User {
    const users = this.getUsers()
    const existing = users.find(u => u.id === serverUser.id || u.email === serverUser.email)
    if (existing) {
      const merged = { ...existing, ...serverUser, password: password || existing.password }
      const idx = users.findIndex(u => u.id === existing.id)
      users[idx] = merged
      setItem(KEYS.users, users)
      return merged
    }
    const user: User = { notificationTime: '20:00', timezone: 'America/New_York', ...serverUser, password } as User
    setItem(KEYS.users, [...users, user])
    return user
  },

  findUserByEmail(email: string): User | undefined {
    return this.getUsers().find(u => u.email === email)
  },

  findUserById(id: string): User | undefined {
    return this.getUsers().find(u => u.id === id)
  },

  updateUser(id: string, updates: Partial<User>): User | null {
    const users = this.getUsers()
    const idx = users.findIndex(u => u.id === id)
    if (idx === -1) return null
    users[idx] = { ...users[idx], ...updates }
    setItem(KEYS.users, users)
    this.pushRecord('users', users[idx])
    return users[idx]
  },

  // Session
  getSession(): { userId: string; email: string; name: string } | null {
    return getItem(KEYS.session, null)
  },

  setSession(user: User | null) {
    if (user) {
      setItem(KEYS.session, { userId: user.id, email: user.email, name: user.name })
      trackEvent('login', {}, { userId: user.id, userName: user.name })
    } else {
      localStorage.removeItem(KEYS.session)
    }
  },

  // Charities
  getCharities(): Charity[] {
    return getItem(KEYS.charities, [])
  },

  getCharityById(id: string): Charity | undefined {
    return this.getCharities().find(c => c.id === id)
  },

  // Challenges
  getChallenges(): Challenge[] {
    return getItem(KEYS.challenges, [])
  },

  getChallengeById(id: string): Challenge | undefined {
    const challenge = this.getChallenges().find(c => c.id === id)
    if (!challenge) return undefined
    return this.expandChallenge(challenge)
  },

  getActiveChallenges(): Challenge[] {
    return this.getChallenges()
      .filter(c => c.status === 'active' && c.isPublic)
      .map(c => this.expandChallenge(c))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  getUserActiveChallenge(userId: string): Challenge | undefined {
    const challenge = this.getChallenges().find(c => c.userId === userId && c.status === 'active')
    return challenge ? this.expandChallenge(challenge) : undefined
  },

  getUserChallenges(userId: string): Challenge[] {
    const statusOrder: Record<string, number> = { active: 0, completed: 1, abandoned: 2, failed: 3 }
    return this.getChallenges()
      .filter(c => c.userId === userId)
      .map(c => this.expandChallenge(c))
      .sort((a, b) =>
        ((statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)) ||
        (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      )
  },

  createChallenge(data: Omit<Challenge, 'id' | 'createdAt' | 'currentStreak' | 'longestStreak' | 'daysCompleted' | 'totalRaisedCents' | 'donorCount' | 'rippleCount' | 'followerCount' | 'status' | 'completedAt'>): Challenge {
    const challenges = this.getChallenges()

    const challenge: Challenge = {
      ...data,
      id: generateId(),
      currentStreak: 0, longestStreak: 0, daysCompleted: 0,
      totalRaisedCents: 0, donorCount: 0, rippleCount: 0, followerCount: 0,
      status: 'active', createdAt: new Date().toISOString(),
    }
    setItem(KEYS.challenges, [...challenges, challenge])

    const charityName = this.getCharityById(challenge.charityId)?.name || ''
    trackEvent('challenge_created', {
      challengeId: challenge.id,
      name: challengeDisplayName(challenge),
      charity: charityName,
      durationDays: challenge.durationDays,
    }, { userId: challenge.userId })
    if (data.parentChallengeId) {
      trackEvent('ripple', { challengeId: challenge.id, parentChallengeId: data.parentChallengeId, name: challengeDisplayName(challenge) }, { userId: challenge.userId })
    }

    // Count the ripple on the parent challenge
    if (data.parentChallengeId) {
      const parent = challenges.find(c => c.id === data.parentChallengeId)
      if (parent) {
        this.updateChallenge(parent.id, { rippleCount: parent.rippleCount + 1 })
      }
    }

    this.pushRecord('challenges', challenge)

    // Cloud sync via Supabase — makes shared challenge links work across devices
    try {
      supabase.from('challenges').insert([{
        id: challenge.id,
        user_id: challenge.userId,
        title: challengeDisplayName(challenge),
        description: challenge.personalNote || challenge.customDescription || '',
        goal_amount: Math.round(challenge.goalAmountCents / 100),
        charity_name: charityName || 'General Charity',
        creator_name: this.findUserById(challenge.userId)?.name || 'Anonymous',
        raised_amount: 0,
      }]).then()
    } catch (e) {
      console.error('Supabase insert error:', e)
    }

    return this.expandChallenge(challenge)
  },

  updateChallenge(id: string, updates: Partial<Challenge>): Challenge {
    const challenges = this.getChallenges()
    const idx = challenges.findIndex(c => c.id === id)
    if (idx === -1) throw new Error('Challenge not found')
    challenges[idx] = { ...challenges[idx], ...updates }
    setItem(KEYS.challenges, challenges)
    this.pushRecord('challenges', challenges[idx])
    return this.expandChallenge(challenges[idx])
  },

  expandChallenge(challenge: Challenge): Challenge {
    const realUser = this.findUserById(challenge.userId)
    const user = realUser || (challenge.creatorNameFallback
      ? ({ id: challenge.userId, name: challenge.creatorNameFallback, email: '', password: '', notificationTime: '20:00', timezone: 'America/New_York', createdAt: challenge.createdAt } as User)
      : undefined)
    return {
      ...challenge,
      user,
      charity: this.getCharityById(challenge.charityId),
      checkIns: this.getCheckInsForChallenge(challenge.id),
      donations: this.getDonationsForChallenge(challenge.id),
      comments: this.getCommentsForChallenge(challenge.id),
      childChallenges: this.getChallenges().filter(c => c.parentChallengeId === challenge.id).map(c => this.expandChallenge(c)),
    }
  },

  // Check-ins
  getCheckIns(): CheckIn[] {
    return getItem(KEYS.checkIns, [])
  },

  getCheckInsForChallenge(challengeId: string): CheckIn[] {
    return this.getCheckIns().filter(ci => ci.challengeId === challengeId).sort((a, b) => a.dayNumber - b.dayNumber)
  },

  createCheckIn(data: Omit<CheckIn, 'id' | 'createdAt'>): CheckIn {
    const challenge = this.getChallenges().find(c => c.id === data.challengeId)
    if (!challenge) throw new Error('Challenge not found')
    if (challenge.status !== 'active') throw new Error('This challenge is already complete')
    if (data.dayNumber > challenge.durationDays) throw new Error('Challenge duration reached — no more check-ins')

    const checkIns = this.getCheckIns()
    const existing = checkIns.find(ci => ci.challengeId === data.challengeId && ci.dayNumber === data.dayNumber)
    if (existing) throw new Error('Already checked in today')

    const checkIn: CheckIn = { ...data, id: generateId(), createdAt: new Date().toISOString() }
    setItem(KEYS.checkIns, [...checkIns, checkIn])
    this.pushRecord('checkIns', checkIn)
    try {
      supabase.from('checkins').insert([{
        id: checkIn.id,
        challenge_id: checkIn.challengeId,
        day_number: checkIn.dayNumber,
        completed: checkIn.completed,
        note: checkIn.note || null,
        photo_url: checkIn.photoUrl || null,
        check_in_date: checkIn.checkInDate,
      }]).then()
    } catch (e) {
      console.error('Supabase checkins insert error:', e)
    }

    const perDayCents = this.getDonationsForChallenge(challenge.id)
      .filter(d => d.type === 'per_day')
      .reduce((s, d) => s + (d.perDayAmountCents || 0), 0)
    trackEvent(data.completed ? 'check_in' : 'day_missed', {
      challengeId: challenge.id,
      day: data.dayNumber,
      streak: data.completed ? challenge.currentStreak + 1 : 0,
      raisedDeltaCents: data.completed ? perDayCents : 0,
    }, { userId: challenge.userId })

    // Update challenge stats
    {
      const newStreak = data.completed ? challenge.currentStreak + 1 : 0
      const newDaysCompleted = data.completed ? challenge.daysCompleted + 1 : challenge.daysCompleted
      const newLongestStreak = Math.max(challenge.longestStreak, newStreak)
      const isComplete = data.completed && data.dayNumber >= challenge.durationDays

      this.updateChallenge(challenge.id, {
        currentStreak: newStreak,
        daysCompleted: newDaysCompleted,
        longestStreak: newLongestStreak,
        status: isComplete ? 'completed' : challenge.status,
        completedAt: isComplete ? new Date().toISOString() : undefined,
      })
      if (isComplete) {
        const bonusCents = this.getDonationsForChallenge(challenge.id)
          .reduce((s, d) => s + (d.bonusAmountCents || 0), 0)
        trackEvent('challenge_completed', { challengeId: challenge.id, days: challenge.durationDays, bonusCents }, { userId: challenge.userId })
      }
    }

    return checkIn
  },

  // Donations
  getDonations(): Donation[] {
    return getItem(KEYS.donations, [])
  },

  getDonationsForChallenge(challengeId: string): Donation[] {
    return this.getDonations().filter(d => d.challengeId === challengeId)
  },

  createDonation(data: Omit<Donation, 'id' | 'createdAt'>): Donation {
    const donations = this.getDonations()
    const donation: Donation = { ...data, id: generateId(), createdAt: new Date().toISOString() }
    setItem(KEYS.donations, [...donations, donation])
    this.pushRecord('donations', donation)
    try {
      supabase.from('donations').insert([{
        id: donation.id,
        challenge_id: donation.challengeId,
        donor_name: donation.donorName,
        donor_email: donation.donorEmail,
        donor_message: donation.donorMessage || null,
        type: donation.type,
        per_day_amount_cents: donation.perDayAmountCents ?? null,
        bonus_amount_cents: donation.bonusAmountCents ?? 0,
        flat_amount_cents: donation.flatAmountCents ?? null,
        status: donation.status,
        total_charged_cents: donation.totalChargedCents,
        platform_fee_cents: donation.platformFeeCents,
        net_to_charity_cents: donation.netToCharityCents,
      }]).then()
    } catch (e) {
      console.error('Supabase donations insert error:', e)
    }
    {
      const ch = this.getChallenges().find(c => c.id === data.challengeId)
      trackEvent('pledge_created', {
        challengeId: data.challengeId,
        type: data.type,
        donorName: data.donorName,
        perDayAmountCents: data.perDayAmountCents || 0,
        flatAmountCents: data.flatAmountCents || 0,
        bonusAmountCents: data.bonusAmountCents || 0,
        durationDays: ch?.durationDays || 0,
      }, { userId: ch?.userId })
    }

    // Update challenge totals (storage already includes the new donation)
    const challenge = this.getChallenges().find(c => c.id === data.challengeId)
    if (challenge) {
      const challengeDonations = this.getDonationsForChallenge(challenge.id)
      const totalPledged = challengeDonations.reduce((sum, d) => {
        if (d.type === 'flat') return sum + (d.flatAmountCents || 0)
        return sum + ((d.perDayAmountCents || 0) * challenge.durationDays) + (d.bonusAmountCents || 0)
      }, 0)
      this.updateChallenge(challenge.id, {
        totalRaisedCents: totalPledged,
        donorCount: challengeDonations.length,
      })
    }

    return donation
  },

  // Comments
  getComments(): Comment[] {
    return getItem(KEYS.comments, [])
  },

  getCommentsForChallenge(challengeId: string): Comment[] {
    return this.getComments()
      .filter(c => c.challengeId === challengeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  createComment(data: Omit<Comment, 'id' | 'createdAt'>): Comment {
    const comments = this.getComments()
    const comment: Comment = { ...data, id: generateId(), createdAt: new Date().toISOString() }
    setItem(KEYS.comments, [...comments, comment])
    trackEvent('comment_posted', { challengeId: data.challengeId, authorName: data.authorName })
    this.pushRecord('comments', comment)
    try {
      supabase.from('comments').insert([{
        id: comment.id,
        challenge_id: comment.challengeId,
        user_name: comment.authorName,
        content: comment.text,
      }]).then()
    } catch (e) {
      console.error('Supabase comments insert error:', e)
    }
    return comment
  },

  // Leaderboard
  getLeaderboard(type: string): Challenge[] {
    const challenges = this.getChallenges()
      .filter(c => c.status === 'active' || c.status === 'completed')
      .map(c => this.expandChallenge(c))

    if (type === 'earners') return challenges.sort((a, b) => b.totalRaisedCents - a.totalRaisedCents)
    if (type === 'streaks') return challenges.sort((a, b) => b.currentStreak - a.currentStreak)
    if (type === 'completed') return challenges.sort((a, b) => b.daysCompleted - a.daysCompleted)
    if (type === 'ripples') return challenges.sort((a, b) => b.rippleCount - a.rippleCount)
    return challenges
  },

  // Friend activity feed (derived from store data — no timestamps, avatars rendered by caller)
  getFriendActivity(forUserId?: string): { userId?: string; text: string; challengeId?: string; ts: number }[] {
    const items: { userId?: string; text: string; challengeId?: string; ts: number }[] = []

    for (const challenge of this.getChallenges()) {
      const owner = this.findUserById(challenge.userId)
      if (challenge.currentStreak > 0 && challenge.currentStreak % 5 === 0) {
        items.push({
          userId: owner?.id,
          text: `${owner?.name || 'Someone'} just hit a ${challenge.currentStreak}-day streak!`,
          challengeId: challenge.id,
          ts: new Date(challenge.startDate).getTime() + challenge.currentStreak * 86400000,
        })
      }
      if (challenge.donorCount >= 5) {
        items.push({
          userId: owner?.id,
          text: `${owner?.name || 'Someone'} has ${challenge.donorCount} sponsors`,
          challengeId: challenge.id,
          ts: new Date(challenge.createdAt).getTime(),
        })
      }
    }

    // New followers appear as circle-of-influence notifications for the owner
    for (const f of this.getFollows()) {
      if (forUserId && f.followeeUserId !== forUserId) continue
      items.push({
        userId: f.followerUserId,
        text: `${f.followerName} has joined ${forUserId ? 'your' : 'a'} circle of influence`,
        ts: new Date(f.createdAt).getTime(),
      })
    }

    return items.sort((a, b) => b.ts - a.ts).slice(0, 6)
  },

  // --- Follows / Circle of Influence ---
  getFollows(): Follow[] {
    return getItem<Follow[]>(KEYS.follows, [])
  },

  createFollow(data: Omit<Follow, 'id' | 'createdAt'>): Follow {
    const follows = this.getFollows()
    // no duplicates from the same follower to the same followee
    const existing = follows.find(f =>
      f.followeeUserId === data.followeeUserId &&
      (data.followerUserId ? f.followerUserId === data.followerUserId : f.followerName === data.followerName)
    )
    if (existing) return existing
    const follow: Follow = { ...data, id: generateId(), createdAt: new Date().toISOString() }
    setItem(KEYS.follows, [...follows, follow])
    this.pushRecord('follows', follow)
    try {
      supabase.from('follows').insert([{
        id: follow.id,
        follower_user_id: follow.followerUserId || null,
        follower_name: follow.followerName,
        followee_user_id: follow.followeeUserId,
        mutual: follow.mutual,
      }]).then()
    } catch (e) {
      console.error('Supabase follows insert error:', e)
    }
    trackEvent('follow_created', { followeeUserId: data.followeeUserId, mutual: data.mutual },
      data.followerUserId ? { userId: data.followerUserId, userName: data.followerName } : undefined)
    return follow
  },

  isFollowing(followeeUserId: string, followerUserId?: string, followerName?: string): boolean {
    return this.getFollows().some(f =>
      f.followeeUserId === followeeUserId &&
      (followerUserId ? f.followerUserId === followerUserId : (followerName ? f.followerName === followerName : false))
    )
  },

  getFollowerCount(userId: string): number {
    return this.getFollows().filter(f => f.followeeUserId === userId).length
  },

  // Circle of Influence: ripple challengers (took a challenge because of you) + totals
  getCircleOfInfluence(userId: string) {
    const myIds = new Set(this.getChallenges().filter(c => c.userId === userId).map(c => c.id))
    const rippleChallenges = this.getChallenges()
      .filter(c => c.parentChallengeId && myIds.has(c.parentChallengeId))
      .map(c => this.expandChallenge(c))
    const dayAgo = Date.now() - 86400000
    const newLast24h = rippleChallenges
      .filter(c => new Date(c.createdAt).getTime() >= dayAgo)
      .map(c => ({
        userId: c.userId,
        name: c.user?.name || 'A new challenger',
        challengeName: challengeDisplayName(c),
        challengeId: c.id,
      }))
    return {
      challengers: rippleChallenges,
      totalChallenges: rippleChallenges.length,
      totalRaisedCents: rippleChallenges.reduce((s, c) => s + c.totalRaisedCents, 0),
      totalDays: rippleChallenges.reduce((s, c) => s + Math.max(c.checkIns?.length || 0, c.daysCompleted), 0),
      followerCount: this.getFollowerCount(userId),
      newLast24h,
    }
  },

  // User-aggregated leaderboard — every entry is a person, not a challenge
  getUserLeaderboard(type: string): { user: User; value: number }[] {
    const byUser = new Map<string, { user: User; value: number }>()
    const challenges = this.getChallenges().filter(c => c.status === 'active' || c.status === 'completed')
    for (const c of challenges) {
      const user = this.findUserById(c.userId)
      if (!user) continue
      const entry = byUser.get(user.id) || { user, value: 0 }
      if (type === 'earners') entry.value += c.totalRaisedCents
      else if (type === 'streaks') entry.value = Math.max(entry.value, c.longestStreak)
      else if (type === 'completed') entry.value += c.status === 'completed' ? 1 : 0
      else if (type === 'ripples') entry.value += c.rippleCount
      byUser.set(user.id, entry)
    }
    return [...byUser.values()].filter(e => e.value > 0).sort((a, b) => b.value - a.value)
  },

  // Current user's rank on the earners leaderboard (best challenge)
  getUserRank(userId: string): { rank: number; total: number } | null {
    const board = this.getLeaderboard('earners')
    const idx = board.findIndex(c => c.userId === userId)
    if (idx === -1) return null
    return { rank: idx + 1, total: board.length }
  },

  // Your Chevra: inner ring = people who took the challenge from you + simulated friends
  getChevra(userId: string): Chevra {
    const today = new Date().toISOString().slice(0, 10)
    const weekday = isoWeekday(new Date())
    const grown = daysSince(SIM_SEED_DATE)

    // real ripple members (inner ring — people you personally brought in)
    const myChallenges = this.getUserChallenges(userId)
    const myIds = new Set(myChallenges.map(c => c.id))
    const rippleMembers: ChevraMember[] = this.getChallenges()
      .filter(c => c.parentChallengeId && myIds.has(c.parentChallengeId))
      .map(c => ({
        id: `ripple-${c.id}`,
        name: this.findUserById(c.userId)?.name || 'Friend',
        challengeName: challengeDisplayName(c),
        streak: c.currentStreak,
        daysThisWeek: Math.min(weekday, c.currentStreak),
        checkedInToday: (c.checkIns || []).some(ci => ci.completed && (ci.checkInDate || '').slice(0, 10) === today),
        flickering: false,
        challengeId: c.id,
        raisedCents: c.totalRaisedCents,
      }))

    // simulated chevra (demo seed — their flames advance once per day)
    const simMembers: ChevraMember[] = SIM_FRIENDS.map((f, i) => ({
      id: `sim-${i}`,
      name: f.name,
      challengeName: f.challengeName,
      streak: f.baseStreak + grown,
      daysThisWeek: Math.max(0, weekday - f.weeklyMisses),
      checkedInToday: f.lightsToday || grown % 4 === 0, // the sleepy ones rally every few days
      flickering: !!f.flickering,
      milestoneNote: f.milestoneNote,
      raisedCents: f.raisedCents + grown * 300,
    }))

    // "the one who brought you in" — your inviter, if you joined via someone's page
    const parent = myChallenges.find(c => c.parentChallengeId)
    let inviter: ChevraMember | null = null
    if (parent?.parentChallengeId) {
      const pc = this.getChallengeById(parent.parentChallengeId)
      if (pc?.user) {
        inviter = {
          id: `inviter-${pc.id}`,
          name: pc.user.name,
          challengeName: challengeDisplayName(pc),
          streak: pc.currentStreak,
          daysThisWeek: Math.min(weekday, pc.currentStreak),
          checkedInToday: true,
          flickering: false,
          challengeId: pc.id,
          broughtYouIn: true,
          raisedCents: pc.totalRaisedCents,
        }
      }
    }

    const members = [...(inviter ? [inviter] : []), ...rippleMembers, ...simMembers]

    // user's own check-ins this week
    const monday = new Date()
    monday.setDate(monday.getDate() - (weekday - 1))
    const mondayStr = monday.toISOString().slice(0, 10)
    const myCheckIns = this.getCheckIns().filter(ci =>
      myIds.has(ci.challengeId) && ci.completed && (ci.checkInDate || '').slice(0, 10) >= mondayStr)
    const userDaysThisWeek = Math.min(7, myCheckIns.length)

    const standings = [
      ...members.filter(m => !m.broughtYouIn).map(m => ({ name: m.name, days: m.daysThisWeek, isUser: false })),
      { name: 'You', days: userDaysThisWeek, isUser: true },
    ].sort((a, b) => b.days - a.days)

    return {
      members,
      unlit: members.filter(m => !m.checkedInToday).length,
      totalChallengers: members.length,
      totalDays: members.reduce((sum, m) => sum + m.streak, 0),
      totalRaisedCents: members.reduce((sum, m) => sum + m.raisedCents, 0),
      userDaysThisWeek,
      standings,
    }
  },

  // Chizuk log — one chizuk/nudge per friend per day keeps it meaningful
  getChizukLog(): { friendKey: string; text: string; date: string }[] {
    return getItem('nachas_chizuk_log', [])
  },

  hasChizukToday(friendKey: string): boolean {
    const today = new Date().toISOString().slice(0, 10)
    return this.getChizukLog().some(e => e.friendKey === friendKey && e.date === today)
  },

  sendChizuk(friendKey: string, text: string, authorName: string, challengeId?: string) {
    const today = new Date().toISOString().slice(0, 10)
    const log = this.getChizukLog()
    setItem('nachas_chizuk_log', [...log, { friendKey, text, date: today }])
    trackEvent('chizuk_sent', { friendKey, real: !!challengeId })
    // real ripple members get the chizuk posted on their actual page
    if (challengeId) {
      this.createComment({ challengeId, authorName, authorEmail: '', text })
    }
  },

  // Stats for landing page
  getStats() {
    const challenges = this.getChallenges()
    const donations = this.getDonations()
    const active = challenges.filter(c => c.status === 'active')
    const totalRaised = donations.reduce((sum, d) => {
      if (d.type === 'flat') return sum + (d.flatAmountCents || 0)
      const challenge = challenges.find(c => c.id === d.challengeId)
      const days = challenge ? challenge.durationDays : 90
      return sum + ((d.perDayAmountCents || 0) * days) + (d.bonusAmountCents || 0)
    }, 0)
    const maxStreak = Math.max(...challenges.map(c => c.currentStreak), 0)
    const ripples = challenges.filter(c => c.parentChallengeId).length

    return {
      activeChallenges: active.length,
      totalRaised,
      maxStreak,
      ripples,
    }
  },
}
