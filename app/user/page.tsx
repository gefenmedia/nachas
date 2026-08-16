'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Award, Check, Copy, Heart, PartyPopper, CircleDot, UserPlus, Share2 } from 'lucide-react'
import { store, Challenge, User } from '@/lib/store'
import { getBadges } from '@/lib/badges'
import { BadgeIcon } from '@/components/ui/icons'
import { useAuth } from '@/components/ui/auth-context'
import { formatCents, challengeDisplayName } from '@/lib/utils'
import { userUrl } from '@/lib/share'
import { canonicalDeepLink, getDeepLinkFromLocation, locationParams } from '@/lib/deep-link'

/**
 * Nachas Home Page (Visitor View) — the public, shareable profile for any user.
 * Every profile image across the app routes here: /user?id=<userId>
 */
function UserContent() {
  const searchParams = useSearchParams()
  const { user: me } = useAuth()
  const deepLink = typeof window !== 'undefined' ? getDeepLinkFromLocation(window.location) : null
  const urlParams = typeof window !== 'undefined' ? locationParams(window.location) : new URLSearchParams()
  const id = searchParams.get('id') || (deepLink && deepLink.kind === 'user' ? deepLink.id : '') || urlParams.get('id') || ''
  const [profile, setProfile] = useState<User | null>(null)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [followerCount, setFollowerCount] = useState(0)
  const [following, setFollowing] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [askName, setAskName] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loaded, setLoaded] = useState(false)

  function loadProfile() {
    if (!id) { setLoaded(true); return }
    const u = store.findUserById(id)
    setProfile(u || null)
    if (u) {
      setChallenges(store.getUserChallenges(u.id))
      setFollowerCount(store.getFollowerCount(u.id))
      if (me) setFollowing(store.isFollowing(u.id, me.id))
    }
    setLoaded(true)
  }

  useEffect(() => {
    store.init()
    loadProfile()
    // profile may live on another device — re-render once server state lands
    const onSync = () => loadProfile()
    window.addEventListener('nachas-synced', onSync)
    return () => window.removeEventListener('nachas-synced', onSync)
  }, [id, me])

  function doFollow(name: string, followerUserId?: string) {
    if (!profile) return
    store.createFollow({ followerUserId, followerName: name, followeeUserId: profile.id, mutual: false })
    setFollowing(true)
    setFollowerCount(c => c + 1)
  }

  function handleFollow() {
    if (!profile) return
    if (following) return
    if (me) doFollow(me.name, me.id)
    else setAskName(true)
  }

  function copyLink() {
    const url = userUrl(id)
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!loaded) return <div className="p-20 text-center">Loading...</div>
  if (!profile) return <div className="p-20 text-center text-white/50">User not found.</div>

  const active = challenges.filter(c => c.status === 'active')
  const completed = challenges.filter(c => c.status === 'completed')
  const totalRaised = challenges.reduce((n, c) => n + c.totalRaisedCents, 0)
  const totalRipples = challenges.reduce((n, c) => n + (c.rippleCount || 0), 0)
  const earnedBadges = getBadges(challenges).filter(b => b.earned)
  const isMe = !!me && me.id === profile.id

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto space-y-6">
      {/* Identity */}
      <div className="card text-center">
        <div className="w-24 h-24 rounded-full bg-nachas-gold/10 flex items-center justify-center font-bold text-3xl text-nachas-gold overflow-hidden mx-auto mb-4">
          {profile.avatarUrl
            ? <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
            : profile.name.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-2xl font-bold">{profile.name}</h1>
        {profile.bio && <p className="text-white/60 text-sm mt-2 max-w-sm mx-auto">{profile.bio}</p>}

        <div className="flex justify-center gap-6 mt-4 text-sm">
          <span className="text-white/70"><span className="font-bold text-white">{active.length}</span> active</span>
          <span className="text-white/70"><span className="font-bold text-white">{completed.length}</span> completed</span>
          <span className="text-white/70"><span className="font-bold text-white">{followerCount}</span> {followerCount === 1 ? 'follower' : 'followers'}</span>
        </div>

        <div className="flex gap-3 mt-5 max-w-xs mx-auto">
          {!isMe && (
            <button
              onClick={handleFollow}
              disabled={following}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${following ? 'bg-nachas-coral/20 text-nachas-coral' : 'bg-nachas-gold text-nachas-dark hover:bg-nachas-goldLight'}`}
            >
              <Heart className={`w-4 h-4 ${following ? 'fill-nachas-coral' : ''}`} />
              {following ? 'Following' : 'Follow'}
            </button>
          )}
          <button onClick={copyLink} className="btn-secondary py-2.5 px-4 text-sm flex items-center gap-2">
            {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Share2 className="w-4 h-4" /> Share</>}
          </button>
        </div>

        {askName && !following && (
          <form
            className="flex gap-2 mt-3 max-w-xs mx-auto"
            onSubmit={e => { e.preventDefault(); if (guestName.trim()) { doFollow(guestName.trim()); setAskName(false) } }}
          >
            <input
              className="input flex-1 !py-2 text-sm"
              placeholder="Your name"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              autoFocus
              required
            />
            <button type="submit" className="btn-primary py-2 px-4 text-sm">Join</button>
          </form>
        )}
      </div>

      {/* Impact stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card !p-4 text-center">
          <div className="text-2xl font-bold text-nachas-teal">{formatCents(totalRaised)}</div>
          <div className="text-xs text-white/50 mt-0.5">Total raised</div>
        </div>
        <div className="card !p-4 text-center">
          <div className="text-2xl font-bold text-nachas-purple">{totalRipples}</div>
          <div className="text-xs text-white/50 mt-0.5">Ripples created</div>
        </div>
      </div>

      {/* Badges */}
      {earnedBadges.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-nachas-gold" />
            <h3 className="font-semibold">Badges</h3>
            <span className="ml-auto text-sm text-white/40">{earnedBadges.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {earnedBadges.map(({ badge }) => (
              <span key={badge.key} title={badge.description} className="bg-nachas-gold/10 text-nachas-gold text-sm px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5">
                <BadgeIcon badgeKey={badge.key} className="w-4 h-4" /> {badge.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Active challenges */}
      {active.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <CircleDot className="w-5 h-5 text-nachas-teal" />
            <h3 className="font-semibold">Active Challenges</h3>
          </div>
          <div className="space-y-3">
            {active.map(c => (
              <Link key={c.id} href={`/challenge?id=${c.id}`} className="flex items-center gap-4 hover:bg-white/5 rounded-xl p-2 -m-2 transition">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{challengeDisplayName(c)}</div>
                  <div className="text-sm text-white/40 truncate">Day {Math.min(Math.max(c.checkIns?.length || 0, c.daysCompleted) + 1, c.durationDays)} of {c.durationDays} · {c.charity?.name}</div>
                </div>
                <div className="font-bold text-nachas-teal shrink-0">{formatCents(c.totalRaisedCents)}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Completed challenges */}
      {completed.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <PartyPopper className="w-5 h-5 text-nachas-gold" />
            <h3 className="font-semibold">Completed Challenges</h3>
          </div>
          <div className="space-y-3">
            {completed.map(c => (
              <Link key={c.id} href={`/challenge?id=${c.id}`} className="flex items-center gap-4 hover:bg-white/5 rounded-xl p-2 -m-2 transition">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{challengeDisplayName(c)}</div>
                  <div className="text-sm text-white/40 truncate">{c.durationDays} days · {c.charity?.name}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-nachas-teal">{formatCents(c.totalRaisedCents)}</div>
                  <span className="inline-block mt-0.5 text-[11px] font-semibold text-nachas-green bg-nachas-green/10 px-2 py-0.5 rounded-full">✓ Completed</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Visitor CTA */}
      {!me && (
        <div className="card text-center">
          <UserPlus className="w-8 h-8 text-nachas-gold mx-auto mb-3" />
          <h3 className="font-semibold mb-1">Inspired by {profile.name.split(' ')[0]}?</h3>
          <p className="text-white/50 text-sm mb-4">Create your own Nachas account and start a challenge of your own.</p>
          <Link href={`/signup?next=${encodeURIComponent(canonicalDeepLink('user', profile.id))}`} className="btn-primary inline-block">Create your own Nachas account</Link>
        </div>
      )}
    </div>
  )
}

export default function UserPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center">Loading...</div>}>
      <UserContent />
    </Suspense>
  )
}
