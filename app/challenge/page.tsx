'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import Link from 'next/link'
import { TrendingUp, MessageCircle, Share2, PartyPopper, Heart, UserPlus, ImageDown, Check } from 'lucide-react'
import { store, Challenge, Donation } from '@/lib/store'
import { downloadShareImage } from '@/lib/share-image'
import { useAuth } from '@/components/ui/auth-context'
import { LogoMark } from '@/components/ui/logo'
import { StreakFlame, HeroFlame } from '@/components/ui/icons'
import { CheckInCelebration } from '@/components/ui/check-in-celebration'
import { CountUp } from '@/lib/fx'
import { trackEvent } from '@/lib/track'
import { shareMessage, challengeUrl } from '@/lib/share'
import { canonicalDeepLink, getDeepLinkFromLocation, locationParams, rememberReturnTo } from '@/lib/deep-link'
import { formatCents, formatCentsExact, getStreakEmoji, challengeDisplayName } from '@/lib/utils'

function fireCelebration() {
  confetti({ particleCount: 160, spread: 80, origin: { y: 0.6 } })
  setTimeout(() => confetti({ particleCount: 100, angle: 60, spread: 60, origin: { x: 0 } }), 250)
  setTimeout(() => confetti({ particleCount: 100, angle: 120, spread: 60, origin: { x: 1 } }), 450)
}
function ChallengeContent() {
  const router = useRouter()
  const { user } = useAuth()
  const [id, setId] = useState('')
  const [isNewLaunch, setIsNewLaunch] = useState(false)
  const [buddyName, setBuddyName] = useState('')
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [newComment, setNewComment] = useState({ authorName: '', text: '' })
  const [donation, setDonation] = useState({ donorName: '', donorEmail: '', type: 'per_day' as 'per_day' | 'flat', perDayAmount: 1, bonusAmount: 10, flatAmount: 50, message: '' })
  const [showDonate, setShowDonate] = useState(false)
  const [justSponsored, setJustSponsored] = useState(false)
  const [donateError, setDonateError] = useState('')
  const [toast, setToast] = useState('')
  const [justCheckedIn, setJustCheckedIn] = useState(false)
  const [celeb, setCeleb] = useState<{ show: boolean; day: number; streak: number; earnedDeltaCents: number; isMilestone: boolean }>({ show: false, day: 0, streak: 0, earnedDeltaCents: 0, isMilestone: false })
  const [following, setFollowing] = useState(false)
  const [askFollowName, setAskFollowName] = useState(false)
  const [guestFollowName, setGuestFollowName] = useState('')
  const [launchSeen, setLaunchSeen] = useState(true)
  const celebratedRef = useRef(false)
  const launchCelebratedRef = useRef(false)
  const [displayRaised, setDisplayRaised] = useState(0)
  const prevRaisedRef = useRef<number | null>(null)

  // Read challenge ID directly from URL — useSearchParams() doesn't work in static exports
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    setId(params.get('id') || hashParams.get('id') || '')
    setIsNewLaunch(params.get('new') === '1')
    setBuddyName(params.get('buddy') || '')
  }, [])

  useEffect(() => {
    if (!id) return
    store.init()
    setLaunchSeen(!!localStorage.getItem(`nachas_launch_seen_${id}`))
    const local = store.getChallengeById(id)
    if (local) {
      refresh()
      return
    }
    store.syncFromServer().then(() => {
      if (store.getChallengeById(id)) refresh()
      else setNotFound(true)
    })
  }, [id])
    useEffect(() => {
    const t = setInterval(async () => {
      await store.syncFromServer()
      refresh()
    }, 10000)
    return () => clearInterval(t)
  }, [id])

  useEffect(() => {
    if (challenge && isNewLaunch && !launchSeen && !launchCelebratedRef.current) {
      launchCelebratedRef.current = true
      fireCelebration()
    }
  }, [challenge, isNewLaunch, launchSeen])

  function refresh() {
    const c = store.getChallengeById(id)
    setChallenge(c || null)
    setNotFound(!c)
    if (c) {
      if ((c.status === 'completed' || recordedDays(c) >= c.durationDays) && !celebratedRef.current) {
        celebratedRef.current = true
        fireCelebration()
      }
    }
  }

  function recordedDays(c: Challenge): number {
    return Math.max(c.checkIns?.length || 0, c.daysCompleted)
  }

  function pageUrl(): string {
    return challengeUrl(id)
  }

  function defaultMsg(c: Challenge, kind: 'sponsor' | 'friend'): string {
    const name = challengeDisplayName(c)
    if (kind === 'friend') {
      return `Hey! I'm doing ${c.durationDays} days of ${name} to raise money for ${c.charity?.name}. I think you'd be amazing at this. Want to take the challenge with me? We can keep each other going.`
    }
    return `I'm doing ${c.durationDays} days of ${name} to raise money for ${c.charity?.name}. Sponsor me per day I complete, or take the challenge yourself!`
  }

  function statusMsg(c: Challenge): string {
    return `I just launched a Nachas challenge: ${c.durationDays} days of ${challengeDisplayName(c)} for ${c.charity?.name}! Sponsor me per day, or take the challenge yourself: ${pageUrl()}`
  }

  function handleCheckIn() {
    if (!challenge) return
    if (challenge.status !== 'active' || recordedDays(challenge) >= challenge.durationDays) return
    const dayNumber = recordedDays(challenge) + 1
    const beforeRaised = challenge.totalRaisedCents
    try {
      store.createCheckIn({ challengeId: challenge.id, dayNumber, completed: true, checkInDate: new Date().toISOString() })
      const updated = store.getChallengeById(challenge.id)
      const delta = updated ? Math.max(0, updated.totalRaisedCents - beforeRaised) : 0
      const milestone = [7, 14, 30, 60, 90].includes(dayNumber) || dayNumber >= challenge.durationDays
      setCeleb({
        show: true,
        day: dayNumber,
        streak: updated?.currentStreak ?? dayNumber,
        earnedDeltaCents: delta,
        isMilestone: milestone,
      })
    } catch (e: any) {
      setToast(e?.message || 'Could not check in. Please try again.')
      setTimeout(() => setToast(''), 3500)
    }
    refresh()
  }

  function handleComment(e: React.FormEvent) {
    e.preventDefault()
    store.createComment({
      challengeId: id,
      authorName: user ? user.name : newComment.authorName,
      authorEmail: user ? user.email : '',
      text: newComment.text,
    })
    setNewComment({ authorName: '', text: '' })
    refresh()
  }

  function handleDonate(e: React.FormEvent) {
    e.preventDefault()
    setDonateError('')
    if (donation.type === 'per_day' && donation.perDayAmount <= 0) { setDonateError('Please enter a per-day amount greater than 0'); return }
    if (donation.type === 'flat' && donation.flatAmount <= 0) { setDonateError('Please enter a gift amount greater than 0'); return }
    try {
      store.createDonation({
        challengeId: id,
        donorName: donation.donorName,
        donorEmail: donation.donorEmail,
        donorMessage: donation.message || undefined,
        type: donation.type,
        perDayAmountCents: donation.type === 'per_day' ? donation.perDayAmount * 100 : undefined,
        bonusAmountCents: donation.type === 'per_day' ? donation.bonusAmount * 100 : 0,
        flatAmountCents: donation.type === 'flat' ? donation.flatAmount * 100 : undefined,
        status: 'pledged',
        totalChargedCents: 0,
        platformFeeCents: 0,
        netToCharityCents: 0,
      })
    } catch (err: any) {
      setDonateError(err?.message || 'Could not record your pledge. Please try again.')
      return
    }
    setShowDonate(false)
    setJustSponsored(true)
    refresh()
  }

  function handleTakeChallenge() {
    if (!challenge) return
    if (!user) {
      const target = canonicalDeepLink('challenge', challenge.id)
      rememberReturnTo(target)
      router.push(`/signup?from=${challenge.id}&next=${encodeURIComponent(target)}`)
      return
    }
    // visitor joins this challenge's circle, then lands on the New Challenge page prefilled
    store.createFollow({ followerUserId: user.id, followerName: user.name, followeeUserId: challenge.userId, mutual: false })
    router.push(`/new-challenge?from=${challenge.id}`)
  }

  function handleFollow() {
    if (!challenge || !user || following) return
    // mutual: both join each other's circle of influence + progress notifications
    store.createFollow({ followerUserId: user.id, followerName: user.name, followeeUserId: challenge.userId, mutual: true })
    store.createFollow({ followerUserId: challenge.userId, followerName: challenge.user?.name || 'Challenge owner', followeeUserId: user.id, mutual: true })
    store.updateChallenge(id, { followerCount: challenge.followerCount + 1 })
    setFollowing(true)
    refresh()
  }

  function handleGuestFollow(name: string) {
    if (!challenge || following || !name.trim()) return
    store.createFollow({ followerName: name.trim(), followeeUserId: challenge.userId, mutual: false })
    store.updateChallenge(id, { followerCount: challenge.followerCount + 1 })
    setFollowing(true)
    setAskFollowName(false)
    refresh()
  }

  function shareStreakToWhatsApp() {
    if (!challenge) return
    const text = `Day ${recordedDays(challenge)} of ${challenge.durationDays} — ${challenge.currentStreak}-day streak for ${challenge.charity?.name}! ${pageUrl()}`
    shareMessage({ message: text, title: `${challengeDisplayName(challenge)} on Nachas`, channel: 'whatsapp_status' })
  }

  function downloadStreakImage() {
    if (!challenge) return
    trackEvent('share_clicked', { channel: 'image_streak_download' })
    downloadShareImage({
      emoji: getStreakEmoji(challenge.currentStreak),
      title: `Day ${recordedDays(challenge)} of ${challenge.durationDays} — ${challenge.currentStreak}-day streak!`,
      lines: [`${challenge.user?.name} is doing ${challenge.durationDays} days of ${challengeDisplayName(challenge)} for ${challenge.charity?.name}`],
      filename: 'nachas-streak.png',
    })
    setToast('Image saved — post it to your WhatsApp status')
    setTimeout(() => setToast(''), 3500)
  }

  function shareSponsorImage() {
    if (!challenge) return
    trackEvent('share_clicked', { channel: 'image_sponsor_download' })
    downloadShareImage({
      emoji: '💛',
      title: `I sponsored ${challenge.user?.name}'s ${challengeDisplayName(challenge)} challenge!`,
      lines: [`Supporting ${challenge.charity?.name} — join in at the link`],
      filename: 'nachas-sponsor.png',
    })
    setToast('Image saved to your device')
    setTimeout(() => setToast(''), 3500)
  }

  function waShare(text: string, channel: string) {
    shareMessage({ message: text, title: challenge ? `${challengeDisplayName(challenge)} on Nachas` : 'Nachas', channel })
  }

  const perDayCentsLive = challenge ? (challenge.donations || []).filter(d => d.type === 'per_day').reduce((s, d) => s + (d.perDayAmountCents || 0), 0) : 0
  const raisedTarget = challenge ? challenge.daysCompleted * perDayCentsLive : 0

  useEffect(() => {
    if (!challenge) return
    if (prevRaisedRef.current === null) {
      prevRaisedRef.current = raisedTarget
      setDisplayRaised(raisedTarget)
      return
    }
    if (prevRaisedRef.current === raisedTarget) return
    const from = prevRaisedRef.current
    prevRaisedRef.current = raisedTarget
    const start = performance.now()
    const dur = 900
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplayRaised(Math.round(from + (raisedTarget - from) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [raisedTarget, challenge])

  if (!challenge) {
    if (!notFound) return <div className="p-20 text-center">Loading...</div>
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <LogoMark className="w-12 h-12 mx-auto mb-6" />
        <h1 className="text-2xl font-bold mb-3">Challenge not found</h1>
              <p className="text-white/60 mb-8">
          We couldn&apos;t find this challenge. It may have been removed, or there might be a connection issue.
        </p>
        <Link href="/new-challenge" className="btn-primary w-full inline-block py-3.5">Take a Challenge</Link>
        <Link href="/" className="btn-secondary w-full inline-block py-3.5 mt-3">Create your own Nachas account</Link>
      </div>
    )
  }

  const days = recordedDays(challenge)
  const isComplete = challenge.status === 'completed' || days >= challenge.durationDays
  const progress = Math.min(100, (challenge.daysCompleted / challenge.durationDays) * 100)
  const todayDay = Math.min(days + 1, challenge.durationDays)
  const comments = challenge.comments || []
  const donations = challenge.donations || []
  const parent = challenge.parentChallengeId ? store.getChallengeById(challenge.parentChallengeId) : undefined
  const checkInMap = new Map((challenge.checkIns || []).map(ci => [ci.dayNumber, ci]))
  const isOwner = !!user && user.id === challenge.userId
  const children = challenge.childChallenges || []
  const visitorSignupHref = `/signup?next=${encodeURIComponent(canonicalDeepLink('challenge', challenge.id))}`

  // ---------- Page 9: first-time success view ----------
  if (isNewLaunch && !launchSeen && isOwner) {
    return (
      <div className="fixed inset-0 z-[60] bg-nachas-dark overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center px-6 py-12 text-center max-w-md mx-auto">
          <LogoMark className="w-20 h-20 mb-8" />
          <h1 className="text-3xl font-bold mb-2">Your Nachas challenge is live</h1>
          <p className="text-white/50 mb-1">{challengeDisplayName(challenge)} · {challenge.durationDays} days for {challenge.charity?.name}</p>
          {buddyName && <p className="text-nachas-gold text-sm mb-1">You&apos;re challenge buddies with {buddyName}!</p>}
          <p className="text-white/40 text-sm mb-10">Now spread it — sponsors and friends are how the ripple starts.</p>

          <div className="w-full space-y-3">
            <button onClick={() => waShare(statusMsg(challenge), 'whatsapp_status_launch')} className="btn-primary w-full py-4 text-lg">
              Share to your WhatsApp status
            </button>
            <button onClick={() => waShare(`${defaultMsg(challenge, 'sponsor')} ${pageUrl()}`, 'whatsapp_sponsor_launch')} className="btn-secondary w-full py-3.5">
              Invite sponsors
            </button>
            <button onClick={() => waShare(`${defaultMsg(challenge, 'friend')} ${pageUrl()}`, 'whatsapp_friend_launch')} className="btn-secondary w-full py-3.5">
              Invite friends to join your challenge
            </button>
          </div>

          <button
            onClick={() => { localStorage.setItem(`nachas_launch_seen_${id}`, '1'); setLaunchSeen(true) }}
            className="mt-10 text-white/50 hover:text-white text-sm transition"
          >
            Continue to your challenge →
          </button>
        </div>
      </div>
    )
  }

  // ---------- Standard challenge page ----------
  return (
    <div className="px-6 py-8 max-w-2xl mx-auto space-y-6">
      <CheckInCelebration
        show={celeb.show}
        day={celeb.day}
        streak={celeb.streak}
        earnedDeltaCents={celeb.earnedDeltaCents}
        charityName={challenge.charity?.name}
        isMilestone={celeb.isMilestone}
        onDone={() => { setCeleb(c => ({ ...c, show: false })); setJustCheckedIn(true) }}
      />
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-nachas-coral/90 text-white text-sm px-4 py-2 shadow-lg">
          {toast}
        </div>
      )}

      {/* Page 3: check-in button at the very top (owner, active) */}
      {isOwner && !isComplete && (
        justCheckedIn ? (
          <div className="space-y-2">
            <button onClick={shareStreakToWhatsApp} className="btn-primary w-full text-lg py-4 flex items-center justify-center gap-2">
              <Share2 className="w-5 h-5" /> Share to WhatsApp
            </button>
            <button onClick={downloadStreakImage} className="w-full text-sm text-white/50 hover:text-white/80 flex items-center justify-center gap-1.5 py-1 transition">
              <ImageDown className="w-4 h-4" /> Or save an image for your status
            </button>
          </div>
        ) : (
          <button onClick={handleCheckIn} className="btn-primary w-full text-lg py-4">
            Check in: Day {todayDay}
          </button>
        )
      )}

      {/* Visitor header — profile image links to the owner's public page */}
      {!isOwner && (
        <div className="card text-center">
          <Link href={`/user?id=${challenge.userId}`} className="inline-block">
            <div className="w-20 h-20 rounded-full bg-nachas-gold/10 flex items-center justify-center mx-auto mb-4 text-3xl overflow-hidden hover:ring-2 hover:ring-nachas-gold/50 transition">
              {challenge.user?.avatarUrl
                ? <img src={challenge.user.avatarUrl} alt={challenge.user.name} className="w-full h-full object-cover" />
                : (challenge.user?.name?.[0] || '?')}
            </div>
          </Link>
          <h1 className="text-2xl font-bold">
            <Link href={`/user?id=${challenge.userId}`} className="hover:text-nachas-gold transition">{challenge.user?.name}</Link>&apos;s {challengeDisplayName(challenge)}
          </h1>
          <p className="text-white/60 mt-1">{challenge.durationDays} Days for {challenge.charity?.name}</p>
          {challenge.dedication && <p className="text-nachas-gold italic mt-3 text-sm">&quot;{challenge.dedication}&quot;</p>}
          {parent?.user && (
            <p className="text-white/40 text-sm mt-3">Inspired by <a className="text-nachas-purple hover:underline" href={`/challenge?id=${parent.id}`}>{parent.user.name}&apos;s challenge</a></p>
          )}
          {user ? (
            <button onClick={handleFollow} disabled={following} className={`mt-4 text-sm px-4 py-2 rounded-xl transition inline-flex items-center gap-2 ${following ? 'bg-nachas-coral/20 text-nachas-coral' : 'bg-nachas-gold text-nachas-dark font-semibold hover:bg-nachas-goldLight'}`}>
              <Heart className={`w-4 h-4 ${following ? 'fill-nachas-coral' : ''}`} />
              {following ? 'Following' : 'Follow'} · {challenge.followerCount}
            </button>
          ) : following ? (
            <p className="text-nachas-coral text-sm mt-4 inline-flex items-center gap-2"><Heart className="w-4 h-4 fill-nachas-coral" /> Following · {challenge.followerCount}</p>
          ) : askFollowName ? (
            <form
              className="mt-4 flex gap-2 max-w-xs mx-auto"
              onSubmit={e => { e.preventDefault(); handleGuestFollow(guestFollowName) }}
            >
              <input
                className="input flex-1 !py-2 text-sm"
                placeholder="Your name"
                value={guestFollowName}
                onChange={e => setGuestFollowName(e.target.value)}
                autoFocus
                required
              />
              <button type="submit" className="btn-primary py-2 px-4 text-sm">Join</button>
            </form>
          ) : (
            <button onClick={() => setAskFollowName(true)} className="mt-4 text-sm px-4 py-2 rounded-xl transition inline-flex items-center gap-2 bg-nachas-gold text-nachas-dark font-semibold hover:bg-nachas-goldLight">
              <Heart className="w-4 h-4" />
              Follow · {challenge.followerCount}
            </button>
          )}
        </div>
      )}

      {/* Streak & progress — the emotional hero of the page */}
      <div className="card text-center">
        <div className="font-bold text-lg">{challengeDisplayName(challenge)}</div>
        {challenge.dedication && <div className="text-nachas-gold italic text-sm mt-0.5 mb-2">&quot;{challenge.dedication}&quot;</div>}
        <div className="relative inline-block mt-4 mb-1">
          <HeroFlame className="w-24 h-24 mx-auto" lit={challenge.currentStreak > 0} />
        </div>
        <div className="text-5xl font-extrabold text-nachas-gold leading-none">
          <CountUp value={challenge.currentStreak} />
        </div>
        <div className="text-white/40 text-sm mt-1 uppercase tracking-wide">Day Streak</div>
        {challenge.currentStreak === 0 && recordedDays(challenge) > 0 && !isComplete && (
          <div className="text-nachas-coral/80 text-xs mt-2">Streak reset — check in today to start again</div>
        )}
        <div className="mt-5 text-sm text-white/60">{isComplete ? `${challenge.durationDays} of ${challenge.durationDays} days complete` : `Day ${todayDay} of ${challenge.durationDays}`}</div>
        <div className="h-3 bg-white/5 rounded-full overflow-hidden mt-2"><div className="h-full bg-nachas-gold rounded-full animate-bar-grow" style={{ width: `${progress}%` }} /></div>
        {perDayCentsLive > 0 && (
          <div className="mt-4 inline-flex items-center gap-2 bg-nachas-teal/10 text-nachas-teal text-sm font-medium px-4 py-2 rounded-xl">
            <StreakFlame className="w-4 h-4" />
            <span>Your streak has raised <span className="font-bold tabular-nums">{formatCentsExact(displayRaised)}</span> for {challenge.charity?.name} so far</span>
          </div>
        )}

        <div className="mt-5">
          <div className="flex flex-wrap gap-1 justify-center">
            {Array.from({ length: challenge.durationDays }, (_, i) => {
              const ci = checkInMap.get(i + 1)
              // Kinder than red: completed = green, missed = muted grey, upcoming = faint
              const cls = ci ? (ci.completed ? 'bg-nachas-green' : 'bg-white/25') : 'bg-white/10'
              const label = ci ? (ci.completed ? 'completed' : 'missed') : 'upcoming'
              return <div key={i} title={`Day ${i + 1}: ${label}`} className={`w-3 h-3 rounded-sm ${cls}`} />
            })}
          </div>
          <div className="flex justify-center gap-4 mt-2 text-xs text-white/40">
            <span><span className="inline-block w-2 h-2 rounded-sm bg-nachas-green mr-1" />Completed</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-white/25 mr-1" />Missed</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-white/10 mr-1" />Upcoming</span>
          </div>
        </div>
      </div>

      {/* Complete state */}
      {isComplete && (
        <div className="card text-center border-nachas-gold/40 bg-nachas-gold/5">
          <PartyPopper className="w-10 h-10 text-nachas-gold mx-auto mb-3" />
          <h2 className="text-xl font-bold text-nachas-gold mb-4">Challenge Complete! Mazel Tov!</h2>
          <div className="grid grid-cols-2 gap-3 mb-5 text-center">
            <div className="bg-white/5 rounded-xl p-3"><div className="text-lg font-bold">{challenge.daysCompleted}/{challenge.durationDays}</div><div className="text-xs text-white/40">Days completed</div></div>
            <div className="bg-white/5 rounded-xl p-3"><div className="text-lg font-bold text-nachas-teal">{formatCents(challenge.totalRaisedCents)}</div><div className="text-xs text-white/40">Raised for {challenge.charity?.name}</div></div>
            <div className="bg-white/5 rounded-xl p-3"><div className="text-lg font-bold">{challenge.donorCount}</div><div className="text-xs text-white/40">Sponsors</div></div>
            <div className="bg-white/5 rounded-xl p-3"><div className="text-lg font-bold text-nachas-purple">{challenge.rippleCount}</div><div className="text-xs text-white/40">Ripples inspired</div></div>
          </div>
          {isOwner && <a href="/new-challenge" className="btn-primary inline-block px-8">Start Your Next Challenge</a>}
        </div>
      )}

      {/* Fundraising — Invite a Sponsor lives here; charity name next to amount raised */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-nachas-teal" /><h3 className="font-semibold">Fundraising</h3></div>
          <span className="text-sm text-white/40">{challenge.donorCount} sponsors</span>
        </div>
        <div className="text-3xl font-bold mb-1">
          {formatCents(challenge.totalRaisedCents)} <span className="text-base font-medium text-white/50">for {challenge.charity?.name}</span>
        </div>
        {(() => {
          const potential = challenge.potentialRaisedCents ?? challenge.totalRaisedCents
          const onTheTable = Math.max(0, potential - challenge.totalRaisedCents)
          return (
            <div className="text-white/40 text-sm mb-3">
              {challenge.status === 'completed'
                ? <>raised of {formatCents(challenge.goalAmountCents)} goal</>
                : onTheTable > 0
                  ? <><span className="text-nachas-gold font-medium">{formatCents(challenge.totalRaisedCents)} earned</span> · {formatCents(onTheTable)} still on the table</>
                  : <>raised of {formatCents(challenge.goalAmountCents)} goal</>}
            </div>
          )
        })()}
        <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-4 relative">
          {/* faint potential bar behind the solid earned bar */}
          <div className="absolute inset-0 bg-nachas-teal/20 rounded-full" style={{ width: `${Math.min(100, ((challenge.potentialRaisedCents ?? challenge.totalRaisedCents)/challenge.goalAmountCents)*100)}%` }} />
          <div className="h-full bg-nachas-teal rounded-full relative" style={{ width: `${Math.min(100, (challenge.totalRaisedCents/challenge.goalAmountCents)*100)}%` }} />
        </div>
        {donations.length > 0 && (
          <div className="flex items-center gap-1 mb-4">
            {donations.slice(-6).map(d => (
              <div key={d.id} title={d.donorName} className="w-8 h-8 rounded-full bg-nachas-teal/20 text-nachas-teal flex items-center justify-center text-xs font-bold">{d.donorName[0]}</div>
            ))}
            {donations.length > 6 && <span className="text-xs text-white/40 ml-1">+{donations.length - 6} more</span>}
          </div>
        )}
        {isOwner ? (
          <button onClick={() => waShare(`${defaultMsg(challenge, 'sponsor')} ${pageUrl()}`, 'whatsapp_sponsor')} className="btn-primary w-full">
            Invite a Sponsor
          </button>
        ) : (
          <button onClick={() => setShowDonate(!showDonate)} className="w-full py-3 rounded-xl font-semibold bg-nachas-teal text-nachas-dark hover:bg-nachas-teal/90 transition">
            Sponsor This Challenge
          </button>
        )}
      </div>

      {justSponsored && (
        <div className="card text-center border-nachas-teal/30 bg-nachas-teal/5">
          <h3 className="font-semibold text-nachas-teal mb-2">Thank you for sponsoring {challenge.user?.name}!</h3>
          <p className="text-white/50 text-sm mb-4">Your pledge is recorded. You'll be able to complete payment when {challenge.user?.name?.split(' ')[0] || 'they'} finishes.</p>
          <div className="space-y-2">
            <button onClick={() => waShare(`I just sponsored ${challenge.user?.name}'s ${challengeDisplayName(challenge)} challenge for ${challenge.charity?.name}. Join in: ${pageUrl()}`, 'whatsapp_sponsored')} className="btn-secondary text-sm flex items-center gap-2 mx-auto"><Share2 className="w-4 h-4" /> Share that you sponsored</button>
            <button onClick={shareSponsorImage} className="w-full text-xs text-white/40 hover:text-white/70 flex items-center justify-center gap-1.5 transition"><ImageDown className="w-3.5 h-3.5" /> Or save an image</button>
          </div>
        </div>
      )}

      {showDonate && !isOwner && (
        <div className="card border-nachas-teal/30">
          <h3 className="font-semibold mb-4">Support {challenge.user?.name}</h3>
          <form onSubmit={handleDonate} className="space-y-4">
            <div className="flex gap-2">
              <button type="button" onClick={() => setDonation({...donation, type: 'per_day'})} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${donation.type==='per_day'?'bg-nachas-teal text-nachas-dark':'bg-white/5 text-white/60'}`}>Per Day</button>
              <button type="button" onClick={() => setDonation({...donation, type: 'flat'})} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${donation.type==='flat'?'bg-nachas-teal text-nachas-dark':'bg-white/5 text-white/60'}`}>Flat Gift</button>
            </div>
            {donation.type === 'per_day' ? (
              <>
                <div>
                  <label className="block text-sm text-white/60 mb-1">$ per day completed</label>
                  <div className="flex gap-2 mb-2">{[1, 5, 10].map(v => <button key={v} type="button" onClick={() => setDonation({...donation, perDayAmount: v})} className={`px-3 py-1 rounded-lg text-sm ${donation.perDayAmount===v?'bg-nachas-teal text-nachas-dark':'bg-white/5 text-white/60'}`}>${v}</button>)}</div>
                  <input type="number" min="1" className="input" value={donation.perDayAmount || ''} onChange={e=>setDonation({...donation, perDayAmount: parseInt(e.target.value)||0})} />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1">Completion bonus if full streak</label>
                  <div className="flex gap-2 mb-2">{[10, 25].map(v => <button key={v} type="button" onClick={() => setDonation({...donation, bonusAmount: v})} className={`px-3 py-1 rounded-lg text-sm ${donation.bonusAmount===v?'bg-nachas-teal text-nachas-dark':'bg-white/5 text-white/60'}`}>${v}</button>)}</div>
                  <input type="number" min="0" className="input" value={donation.bonusAmount || ''} onChange={e=>setDonation({...donation, bonusAmount: parseInt(e.target.value)||0})} />
                </div>
                <div className="text-sm text-white/40">Potential total: ${(donation.perDayAmount * challenge.durationDays) + donation.bonusAmount}</div>
              </>
            ) : (
              <div>
                <label className="block text-sm text-white/60 mb-1">Gift amount</label>
                <div className="flex gap-2 mb-2">{[18, 36, 54, 100].map(v => <button key={v} type="button" onClick={() => setDonation({...donation, flatAmount: v})} className={`px-3 py-1 rounded-lg text-sm ${donation.flatAmount===v?'bg-nachas-teal text-nachas-dark':'bg-white/5 text-white/60'}`}>${v}</button>)}</div>
                <input type="number" min="1" className="input" value={donation.flatAmount || ''} onChange={e=>setDonation({...donation, flatAmount: parseInt(e.target.value)||0})} />
              </div>
            )}
            <div><label className="block text-sm text-white/60 mb-1">Your name</label><input className="input" value={donation.donorName} required onChange={e=>setDonation({...donation, donorName: e.target.value})} /></div>
            <div><label className="block text-sm text-white/60 mb-1">Email</label><input type="email" className="input" value={donation.donorEmail} required onChange={e=>setDonation({...donation, donorEmail: e.target.value})} /></div>
            <div><label className="block text-sm text-white/60 mb-1">Message (optional)</label><textarea className="input" rows={2} value={donation.message} onChange={e=>setDonation({...donation, message: e.target.value})} /></div>
            {donateError && <div className="rounded-xl bg-nachas-coral/10 border border-nachas-coral/30 text-nachas-coral text-sm p-3">{donateError}</div>}
            <button type="submit" className="btn-primary w-full">Confirm Pledge</button>
          </form>
        </div>
      )}

      {/* Sponsors list — immediately below Fundraising */}
      {donations.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4"><Heart className="w-5 h-5 text-nachas-teal" /><h3 className="font-semibold">Sponsors</h3></div>
          <div className="space-y-3">
            {[...donations].reverse().map((d: Donation) => (
              <div key={d.id} className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-full bg-nachas-teal/15 text-nachas-teal flex items-center justify-center text-sm font-bold shrink-0">{d.donorName[0]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{d.donorName}</span>
                    <span className="text-sm font-semibold text-nachas-teal shrink-0">
                      {d.type === 'per_day'
                        ? `${formatCents(d.perDayAmountCents || 0)}/day${d.bonusAmountCents ? ` + ${formatCents(d.bonusAmountCents)} bonus` : ''}`
                        : formatCents(d.flatAmountCents || 0)}
                    </span>
                  </div>
                  {d.donorMessage && <p className="text-white/50 text-sm mt-0.5">&quot;{d.donorMessage}&quot;</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grow the Ripple (visitor) */}
      {!isOwner && (
        <div className="card">
          <div className="flex items-center gap-2 mb-2"><UserPlus className="w-5 h-5 text-nachas-purple" /><h3 className="font-semibold">Grow the Ripple</h3></div>
          <p className="text-white/60 text-sm mb-4">{challenge.rippleCount} {challenge.rippleCount === 1 ? 'person has' : 'people have'} taken this challenge.</p>
          <button onClick={handleTakeChallenge} className="btn-primary w-full">Take this challenge</button>
        </div>
      )}

      {/* Encouragement — names link to user pages when the author is registered */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4"><MessageCircle className="w-5 h-5 text-nachas-coral" /><h3 className="font-semibold">Encouragement</h3></div>
        {!isOwner && (
          <form onSubmit={handleComment} className="space-y-3 mb-6">
            {user
              ? <p className="text-sm text-white/40">Posting as <span className="text-white/70 font-medium">{user.name}</span></p>
              : <input className="input" placeholder="Your name" value={newComment.authorName} required onChange={e=>setNewComment({...newComment, authorName: e.target.value})} />}
            <div className="flex flex-wrap gap-2">
              {['Proud of you.', "Cute streak. Mine's longer.", "LET'S GOOO"].map(line => (
                <button key={line} type="button" onClick={() => setNewComment({ ...newComment, text: line })}
                  className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition">{line}</button>
              ))}
            </div>
            <textarea className="input" placeholder="Leave some encouragement..." rows={2} required value={newComment.text} onChange={e=>setNewComment({...newComment, text: e.target.value})} />
            <button type="submit" className="btn-secondary w-full">Post Comment</button>
          </form>
        )}
        {isOwner && comments.length === 0 && <p className="text-white/40 text-sm mb-2">No encouragements yet — share your page to get some love.</p>}
        <div className="space-y-4">
          {comments.map((comment: any) => {
            const author = comment.authorEmail ? store.findUserByEmail(comment.authorEmail) : undefined
            return (
              <div key={comment.id} className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  {author ? (
                    <Link href={`/user?id=${author.id}`} className="font-medium text-sm text-nachas-gold hover:underline">{comment.authorName}</Link>
                  ) : (
                    <span className="font-medium text-sm">{comment.authorName}</span>
                  )}
                  <span className="text-xs text-white/30">{new Date(comment.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-white/70 text-sm">{comment.text}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Your Impact — very bottom; Challenge a Friend lives here (opens WhatsApp) */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4"><Share2 className="w-5 h-5 text-nachas-purple" /><h3 className="font-semibold">Your Impact</h3></div>
        {children.length > 0 ? (
          <>
            <p className="text-white/60 mb-4">{children.length} {children.length === 1 ? 'person' : 'people'} took this challenge because of {challenge.user?.name}!</p>
            <div className="flex gap-2 mb-4">
              {children.map((child: Challenge) => (
                <Link key={child.id} href={`/user?id=${child.userId}`} title={child.user?.name}
                  className="w-10 h-10 rounded-full bg-nachas-purple/20 flex items-center justify-center text-sm font-bold hover:bg-nachas-purple/40 transition overflow-hidden">
                  {child.user?.avatarUrl
                    ? <img src={child.user.avatarUrl} alt={child.user.name} className="w-full h-full object-cover" />
                    : child.user?.name?.[0]}
                </Link>
              ))}
            </div>
            <p className="text-white/40 text-sm mb-4">Across these ripples: {formatCents(children.reduce((s, c) => s + c.totalRaisedCents, challenge.totalRaisedCents))} raised in total</p>
          </>
        ) : (
          <p className="text-white/40 text-sm mb-4">No ripples yet — invite a friend to take this challenge and watch your impact grow.</p>
        )}
        <button onClick={() => waShare(`${defaultMsg(challenge, 'friend')} ${pageUrl()}`, 'whatsapp_friend')} className="btn-secondary w-full">
          Challenge a friend
        </button>
      </div>

      {/* Visitor-only account CTA */}
      {!user && (
        <div className="card text-center">
          <UserPlus className="w-8 h-8 text-nachas-gold mx-auto mb-3" />
          <h3 className="font-semibold mb-1">Want a streak of your own?</h3>
          <p className="text-white/50 text-sm mb-4">Join Nachas and turn your commitments into charity.</p>
          <Link href={visitorSignupHref} className="btn-primary inline-block">Create your own Nachas account</Link>
        </div>
      )}
    </div>
  )
}

export default function ChallengePage() {
  return (
    <Suspense fallback={<div className="p-20 text-center">Loading...</div>}>
      <ChallengeContent />
    </Suspense>
  )
}
