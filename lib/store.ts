import { supabase } from './supabase'
import { challengeDisplayName } from '@/lib/utils'
import { trackEvent, syncToServer } from '@/lib/track'

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
  followerUserId?: string
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
  user?: User
  charity?: Charity
  checkIns?: CheckIn[]
  donations?: Donation[]
  comments?: Comment[]
  childChallenges?: Challenge[]
}

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
  ]
}

function seedDemoData() {
  const charities = getItem<Charity[]>(KEYS.charities, [])
  if (charities.length === 0) setItem(KEYS.charities, seedCharities())
}

export const store = {
  init() {
    seedDemoData()
    syncToServer()
    void this.syncFromServer()
  },

  pushRecord(collection: string, record: any) {
    if (typeof window === 'undefined' || !record || !record.id) return
  },

  async syncFromServer(): Promise<boolean> {
    if (typeof window === 'undefined') return false
    try {
      const { data: cloudChallenges } = await supabase.from('challenges').select('*')
      if (cloudChallenges && cloudChallenges.length > 0) {
        const local = getItem<Challenge[]>(KEYS.challenges, [])
        const byId = new Map(local.map(i => [i.id, i]))
        for (const rec of cloudChallenges) {
          if (!rec || !rec.id) continue
          const existing = byId.get(rec.id)
          byId.set(rec.id, {
            id: rec.id,
            userId: rec.creator_name || 'user-demo',
            charityId: 'charity-1',
            type: 'custom',
            customName: rec.title,
            customDescription: rec.description,
            durationDays: 30,
            goalAmountCents: (rec.goal_amount || 0) * 100,
            status: 'active',
            startDate: rec.created_at || new Date().toISOString(),
            endDate: new Date().toISOString(),
            currentStreak: 1,
            longestStreak: 1,
            daysCompleted: 1,
            totalRaisedCents: (rec.raised_amount || 0) * 100,
            donorCount: 0,
            rippleCount: 0,
            followerCount: 0,
            isPublic: true,
            createdAt: rec.created_at || new Date().toISOString(),
            ...(existing || {}),
          })
        }
        setItem(KEYS.challenges, Array.from(byId.values()))
        window.dispatchEvent(new Event('nachas-synced'))
        return true
      }
    } catch (e) {
      console.error('Supabase sync error:', e)
    }
    return false
  },

  getUsers(): User[] { return getItem(KEYS.users, []) },
  createUser(data: Omit<User, 'id' | 'createdAt'>): User {
    const users = this.getUsers()
    const user: User = { ...data, id: generateId(), createdAt: new Date().toISOString() }
    setItem(KEYS.users, [...users, user])
    return user
  },
  importServerUser(serverUser: any, password?: string): User { return serverUser },
  findUserByEmail(email: string): User | undefined { return this.getUsers().find(u => u.email === email) },
  findUserById(id: string): User | undefined { return this.getUsers().find(u => u.id === id) },
  updateUser(id: string, updates: Partial<User>): User | null { return null },
  getSession(): { userId: string; email: string; name: string } | null { return getItem(KEYS.session, null) },
  setSession(user: User | null) { if (user) setItem(KEYS.session, { userId: user.id, email: user.email, name: user.name }) },
  getCharities(): Charity[] { return getItem(KEYS.charities, seedCharities()) },
  getCharityById(id: string): Charity | undefined { return this.getCharities().find(c => c.id === id) },
  getChallenges(): Challenge[] { return getItem(KEYS.challenges, []) },
  getChallengeById(id: string): Challenge | undefined {
    const challenge = this.getChallenges().find(c => c.id === id)
    if (!challenge) return undefined
    return this.expandChallenge(challenge)
  },
  getActiveChallenges(): Challenge[] { return this.getChallenges().map(c => this.expandChallenge(c)) },
  getUserActiveChallenge(userId: string): Challenge | undefined { return undefined },
  getUserChallenges(userId: string): Challenge[] { return this.getChallenges().map(c => this.expandChallenge(c)) },

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

    try {
      supabase.from('challenges').insert([{
        id: challenge.id,
        title: challengeDisplayName(challenge),
        description: challenge.personalNote || challenge.customDescription || '',
        goal_amount: Math.round(challenge.goalAmountCents / 100),
        charity_name: this.getCharityById(challenge.charityId)?.name || 'General Charity',
        creator_name: this.findUserById(challenge.userId)?.name || 'Anonymous',
        raised_amount: 0,
      }]).then()
    } catch (e) {
      console.error(e)
    }

    return this.expandChallenge(challenge)
  },

  updateChallenge(id: string, updates: Partial<Challenge>): Challenge {
    const challenges = this.getChallenges()
    const idx = challenges.findIndex(c => c.id === id)
    if (idx !== -1) {
      challenges[idx] = { ...challenges[idx], ...updates }
      setItem(KEYS.challenges, challenges)
      return this.expandChallenge(challenges[idx])
    }
    return updates as Challenge
  },

  expandChallenge(challenge: Challenge): Challenge {
    return {
      ...challenge,
      user: this.findUserById(challenge.userId),
      charity: this.getCharityById(challenge.charityId),
      checkIns: this.getCheckInsForChallenge(challenge.id),
      donations: this.getDonationsForChallenge(challenge.id),
      comments: this.getCommentsForChallenge(challenge.id),
    }
  },

  getCheckIns(): CheckIn[] { return getItem(KEYS.checkIns, []) },
  getCheckInsForChallenge(challengeId: string): CheckIn[] { return this.getCheckIns().filter(ci => ci.challengeId === challengeId) },
  createCheckIn(data: Omit<CheckIn, 'id' | 'createdAt'>): CheckIn {
    const checkIns = this.getCheckIns()
    const checkIn: CheckIn = { ...data, id: generateId(), createdAt: new Date().toISOString() }
    setItem(KEYS.checkIns, [...checkIns, checkIn])
    return checkIn
  },

  getDonations(): Donation[] { return getItem(KEYS.donations, []) },
  getDonationsForChallenge(challengeId: string): Donation[] { return this.getDonations().filter(d => d.challengeId === challengeId) },
  createDonation(data: Omit<Donation, 'id' | 'createdAt'>): Donation {
    const donations = this.getDonations()
    const donation: Donation = { ...data, id: generateId(), createdAt: new Date().toISOString() }
    setItem(KEYS.donations, [...donations, donation])
    return donation
  },

  getComments(): Comment[] { return getItem(KEYS.comments, []) },
  getCommentsForChallenge(challengeId: string): Comment[] { return this.getComments().filter(c => c.challengeId === challengeId) },
  createComment(data: Omit<Comment, 'id' | 'createdAt'>): Comment {
    const comments = this.getComments()
    const comment: Comment = { ...data, id: generateId(), createdAt: new Date().toISOString() }
    setItem(KEYS.comments, [...comments, comment])
    return comment
  },

  getLeaderboard(type: string): Challenge[] { return this.getChallenges().map(c => this.expandChallenge(c)) },
  getFriendActivity(): any[] { return [] },
  getFollows(): Follow[] { return getItem(KEYS.follows, []) },
  createFollow(data: Omit<Follow, 'id' | 'createdAt'>): Follow {
    const follow: Follow = { ...data, id: generateId(), createdAt: new Date().toISOString() }
    setItem(KEYS.follows, [...this.getFollows(), follow])
    return follow
  },
  isFollowing(): boolean { return false },
  getFollowerCount(): number { return 0 },
  getCircleOfInfluence(): any { return { challengers: [], totalChallenges: 0, totalRaisedCents: 0, totalDays: 0, followerCount: 0, newLast24h: [] } },
  getUserLeaderboard(): any[] { return [] },
  getUserRank(): any { return null },
  getChevra(): any { return { members: [], unlit: 0, totalChallengers: 0, totalDays: 0, totalRaisedCents: 0, userDaysThisWeek: 0, standings: [] } },
  getChizukLog(): any[] { return [] },
  hasChizukToday(): boolean { return false },
  sendChizuk() {},
  getStats() { return { activeChallenges: 42, totalRaised: 125000, maxStreak: 40, ripples: 18 } }
}
