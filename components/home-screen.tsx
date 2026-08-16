'use client'

import { useAuth } from '@/components/ui/auth-context'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TrendingUp, Plus, Activity, Share2, ChevronRight, Award, Check, Users } from 'lucide-react'
import { store, Challenge } from '@/lib/store'
import { LogoMark } from '@/components/ui/logo'
import { BadgeIcon } from '@/components/ui/icons'
import { trackEvent } from '@/lib/track'
import { shareMessage, challengeUrl, userUrl } from '@/lib/share'
import { getBadges } from '@/lib/badges'
import { formatCents, challengeDisplayName } from '@/lib/utils'

type ActivityItem = { userId?: string; text: string; challengeId?: string; ts: number }
type Circle = ReturnType<typeof store.getCircleOfInfluence>

/**
 * The logged-in Home screen — also rendered at /dashboard so old links keep working.
 */
export function HomeScreen() {
  const { user } = useAuth()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [circle, setCircle] = useState<Circle | null>(null)
  const [loading, setLoading] = useState(true)

  function loadAll(userId: string) {
    setChallenges(store.getUserChallenges(userId))
    setActivity(store.getFriendActivity(userId))
    setCircle(store.getCircleOfInfluence(userId))
  }

  useEffect(() => {
    if (user) {
      store.init()
      loadAll(user.id)
      setLoading(false)
      const onSync = () => loadAll(user.id)
      window.addEventListener('nachas-synced', onSync)
      return () => window.removeEventListener('nachas-synced', onSync)
    }
  }, [user])

  if (!user || loading) return <div className="flex items-center justify-center min-h-[60vh]">Loading...</div>

  const active = challenges.filter(c => c.status === 'active')
  const today = new Date().toISOString().slice(0, 10)

  function recordedDays(c: Challenge): number {
    return Math.max(c.checkIns?.length || 0, c.daysCompleted)
  }

  function checkedInToday(c: Challenge): boolean {
    return (c.checkIns || []).some(ci => ci.completed && (ci.checkInDate || '').slice(0, 10) === today)
  }

  // One-tap check-in: updates challenge progress in place, no page refresh
  function quickCheckIn(challenge: Challenge) {
    if (checkedInToday(challenge) || recordedDays(challenge) >= challenge.durationDays) return
    try {
      store.createCheckIn({
        challengeId: challenge.id,
        dayNumber: recordedDays(challenge) + 1,
        completed: true,
        checkInDate: new Date().toISOString(),
      })
      loadAll(user!.id)
    } catch (e: any) {
      alert(e.message)
    }
  }

  // ---- stats ----
  const totalRaised = challenges.reduce((n, c) => n + c.totalRaisedCents, 0)
  const totalRipples = challenges.reduce((n, c) => n + (c.rippleCount || 0), 0)
  const bestStreak = challenges.reduce((n, c) => Math.max(n, c.currentStreak), 0)
  const earnedBadges = getBadges(challenges).filter(b => b.earned)

  function challengeFriend() {
    const first = active[0]
    const url = first ? challengeUrl(first.id) : (user ? userUrl(user.id) : '')
    const msg = `Hey! I'm doing ${first ? first.durationDays : 30} days of ${first ? challengeDisplayName(first) : 'a challenge'} to raise money for ${first?.charity?.name || 'charity'}. I think you'd be amazing at this. Want to take the challenge with me? We can keep each other going. ${url}`
    shareMessage({ message: msg, title: 'Nachas Challenge', channel: 'whatsapp_challenge_friend' })
  }

  const firstActive = active[0]

  const header = (
    <div className="flex items-center justify-between gap-3">
      <Link href={`/user?id=${user.id}`} className="flex items-center gap-3 min-w-0 group">
        <span className="w-11 h-11 rounded-full bg-nachas-gold/10 flex items-center justify-center font-bold text-nachas-gold overflow-hidden shrink-0 group-hover:bg-nachas-gold/20 transition">
          {user.avatarUrl
            ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            : user.name.charAt(0).toUpperCase()}
        </span>
        <div>
          <h1 className="text-2xl font-bold truncate">Hi, {user.name.split(' ')[0]} 👋</h1>
          <p className="text-white/40 text-sm mt-0.5">
            {active.length} active{challenges.length - active.length > 0 ? ` · ${challenges.length - active.length} completed` : ''}
          </p>
        </div>
      </Link>
      <Link href="/new-challenge" className="btn-primary py-2 px-3 sm:px-4 text-sm flex items-center gap-2 shrink-0">
        <Plus className="w-4 h-4" /> New
      </Link>
    </div>
  )

  if (challenges.length === 0) {
    return (
      <div className="px-6 py-8 max-w-2xl mx-auto space-y-6">
        {header}
        <div className="px-6 py-14 text-center card">
          <LogoMark className="w-16 h-16 mx-auto mb-6 block" />
          <h2 className="text-2xl font-bold mb-4">No Challenges Yet</h2>
          <p className="text-white/60 mb-8">Start your first challenge and begin raising money for charity.</p>
          <Link href="/new-challenge" className="btn-primary">Take a Challenge</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto space-y-6">
      {/* Active challenge bar — the first thing seen on open */}
      {firstActive && (
        <Link
          href={`/challenge?id=${firstActive.id}`}
          className="flex items-center gap-3 rounded-2xl border border-nachas-gold/30 bg-nachas-gold/10 px-4 py-3 hover:bg-nachas-gold/15 transition"
        >
          <LogoMark className="w-6 h-6 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{challengeDisplayName(firstActive)}</div>
            <div className="text-xs text-white/50 truncate">
              Day {Math.min(recordedDays(firstActive) + 1, firstActive.durationDays)} of {firstActive.durationDays}
              {' · '}{formatCents(firstActive.totalRaisedCents)} raised
            </div>
          </div>
          <span className="text-xs font-semibold text-nachas-gold flex items-center gap-0.5 shrink-0">
            Check in <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      )}

      {header}

      {active.length === 0 && (
        <div className="card text-center">
          <p className="text-white/60 mb-4">No active challenges right now.</p>
          <Link href="/new-challenge" className="btn-primary inline-block">Start a New Challenge</Link>
        </div>
      )}

      {/* Default stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card !p-4 text-center">
          <div className="text-2xl font-bold text-nachas-purple">{totalRipples}</div>
          <div className="text-xs text-white/50 mt-0.5">Ripples</div>
        </div>
        <div className="card !p-4 text-center">
          <div className="text-2xl font-bold text-nachas-teal">{formatCents(totalRaised)}</div>
          <div className="text-xs text-white/50 mt-0.5">Raised</div>
        </div>
        <div className="card !p-4 text-center">
          <div className="text-2xl font-bold text-nachas-gold">{bestStreak}</div>
          <div className="text-xs text-white/50 mt-0.5">Day streak</div>
        </div>
      </div>

      {/* Active challenge cards */}
      {active.map(challenge => {
        const progress = Math.min(100, (challenge.daysCompleted / challenge.durationDays) * 100)
        const done = checkedInToday(challenge)
        return (
          <div key={challenge.id} className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-white/40 uppercase tracking-wider">Active Challenge</div>
                <h2 className="text-xl font-bold mt-1">{challengeDisplayName(challenge)}</h2>
                <div className="text-sm text-white/40">{challenge.charity?.name}</div>
              </div>
              <Link href={`/challenge?id=${challenge.id}`} className="text-xs text-nachas-gold hover:underline shrink-0 flex items-center gap-0.5">
                View page <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-nachas-gold/10 flex items-center justify-center">
                <LogoMark className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold">Day {Math.min(recordedDays(challenge) + 1, challenge.durationDays)} of {challenge.durationDays}</div>
                <div className="text-nachas-gold font-medium">{challenge.currentStreak}-day streak</div>
              </div>
            </div>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/60">Progress</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-nachas-gold rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-nachas-teal" />
                  <span className="text-sm text-white/60">{challenge.donorCount} sponsors</span>
                </div>
                <span className="text-sm font-medium">{formatCents(challenge.totalRaisedCents)} of {formatCents(challenge.goalAmountCents)}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-nachas-teal rounded-full" style={{ width: `${Math.min(100, challenge.goalAmountCents > 0 ? (challenge.totalRaisedCents / challenge.goalAmountCents) * 100 : 0)}%` }} />
              </div>
            </div>
            <button
              onClick={() => quickCheckIn(challenge)}
              disabled={done}
              className={`w-full text-center py-3 rounded-xl font-semibold transition ${done ? 'bg-nachas-green/15 text-nachas-green cursor-default' : 'btn-primary'}`}
            >
              {done ? <span className="inline-flex items-center gap-2"><Check className="w-4 h-4" /> Checked in today</span> : 'Check In Today'}
            </button>
          </div>
        )
      })}

      {/* Circle of Influence */}
      {circle && (
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <LogoMark className="w-5 h-5 shrink-0" />
            <h3 className="font-semibold">Your Circle of Influence</h3>
            <span className="ml-auto text-xs text-white/40">{circle.followerCount} {circle.followerCount === 1 ? 'follower' : 'followers'}</span>
          </div>
          <p className="text-sm text-white/40 mb-4">Challenges and impact that started with you</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-nachas-gold">{circle.totalChallenges}</div>
              <div className="text-[11px] text-white/40">challenges created</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-nachas-teal">{formatCents(circle.totalRaisedCents)}</div>
              <div className="text-[11px] text-white/40">raised</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-nachas-purple">{circle.totalDays}</div>
              <div className="text-[11px] text-white/40">days logged</div>
            </div>
          </div>
          {circle.newLast24h.length > 0 ? (
            <div>
              <div className="text-xs uppercase tracking-wider text-white/40 mb-2">New in the last 24 hours</div>
              <div className="space-y-1">
                {circle.newLast24h.map((n, i) => (
                  <Link key={i} href={`/challenge?id=${n.challengeId}`} className="flex items-center gap-3 text-sm hover:bg-white/5 rounded-lg p-2 -m-2 transition">
                    <span className="w-7 h-7 rounded-full bg-nachas-purple/15 text-nachas-purple flex items-center justify-center text-xs font-bold shrink-0">{n.name.charAt(0)}</span>
                    <span className="flex-1 text-white/70 truncate">{n.name} started <span className="text-white font-medium">{n.challengeName}</span></span>
                    <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/30">No new challengers in the last 24 hours — share your challenge to grow your circle.</p>
          )}
        </div>
      )}

      {/* Friend Activity — avatars, no timestamps */}
      {activity.length > 0 && (
        <div className="card" id="friends">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-nachas-coral" />
            <h3 className="font-semibold">Friend Activity</h3>
          </div>
          <div className="space-y-1">
            {activity.map((item, i) => {
              const u = item.userId ? store.findUserById(item.userId) : undefined
              const href = item.challengeId ? `/challenge?id=${item.challengeId}` : (item.userId ? `/user?id=${item.userId}` : '#')
              return (
                <Link key={i} href={href} className="flex items-center gap-3 text-sm hover:bg-white/5 rounded-lg p-2 -m-2 transition">
                  <span className="w-8 h-8 rounded-full bg-nachas-gold/10 flex items-center justify-center text-xs font-bold text-nachas-gold overflow-hidden shrink-0">
                    {u?.avatarUrl
                      ? <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                      : (u?.name?.charAt(0) || item.text.charAt(0))}
                  </span>
                  <span className="flex-1 text-white/70">{item.text}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Badges — custom icon set */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-nachas-gold" />
            <h3 className="font-semibold">Badges</h3>
          </div>
          <span className="text-sm text-white/40">{earnedBadges.length} of 13 earned</span>
        </div>
        {earnedBadges.length === 0 ? (
          <p className="text-white/40 text-sm">Complete Day 1 to earn your first badge.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {earnedBadges.map(({ badge }) => (
              <span key={badge.key} title={badge.description} className="bg-nachas-gold/10 text-nachas-gold text-sm px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5">
                <BadgeIcon badgeKey={badge.key} className="w-4 h-4" /> {badge.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Challenge a Friend */}
      <button onClick={challengeFriend} className="card hover:bg-white/5 transition text-left w-full">
        <Share2 className="w-6 h-6 text-nachas-purple mb-2" />
        <div className="font-medium">Challenge a Friend</div>
        <div className="text-sm text-white/40">Send an invite on WhatsApp — every friend who joins grows your ripple</div>
      </button>
    </div>
  )
}
