'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heart, Users, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { store } from '@/lib/store'
import { formatCents } from '@/lib/utils'
import { getDeepLinkFromLocation, rememberReturnTo } from '@/lib/deep-link'
import { LogoMark } from '@/components/ui/logo'
import { useAuth } from '@/components/ui/auth-context'
import { HomeScreen } from '@/components/ui/home-screen'

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({ activeChallenges: 0, totalRaised: 0, maxStreak: 0, ripples: 0 })
  const [deepLinkChecked, setDeepLinkChecked] = useState(false)

  useEffect(() => {
    const target = getDeepLinkFromLocation(window.location)
    if (target && window.location.pathname === '/') {
      rememberReturnTo(target.returnTo)
      router.replace(target.returnTo)
      return
    }
    setDeepLinkChecked(true)
  }, [router])

  useEffect(() => {
    store.init()
    setStats(store.getStats())
  }, [])

  if (!deepLinkChecked) return <div className="flex items-center justify-center min-h-[60vh]">Loading...</div>

  // Logged-in users land directly on their Home screen — active challenge first
  if (!loading && user) return <HomeScreen />

  return (
    <div>
      <section className="relative px-6 pt-14 pb-16 md:pt-20 md:pb-24 text-center overflow-hidden">
        <svg className="absolute -right-28 top-1/2 -translate-y-1/2 w-[420px] h-[420px] md:w-[560px] md:h-[560px] pointer-events-none opacity-50 md:opacity-100" viewBox="0 0 480 480" fill="none" aria-hidden="true">
          <circle cx="240" cy="240" r="232" stroke="#f5c542" strokeOpacity="0.07" strokeWidth="1.5" />
          <circle cx="240" cy="240" r="180" stroke="#f5c542" strokeOpacity="0.11" strokeWidth="1.5" />
          <circle cx="240" cy="240" r="128" stroke="#f5c542" strokeOpacity="0.16" strokeWidth="1.5" />
          <circle cx="240" cy="240" r="54" stroke="#f5c542" strokeOpacity="0.85" strokeWidth="26" className="hidden md:block" />
        </svg>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-7xl font-bold mb-6 leading-tight">
            Turn Your <span className="text-nachas-gold">Spiritual Growth</span><br />
            Into Charity
          </h1>
          <p className="text-lg md:text-xl text-white/60 mb-10 max-w-xl mx-auto">
            Take on a challenge.<br />
            Raise money for causes you care about.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-sm sm:max-w-none mx-auto">
            <Link href="/new-challenge" className="btn-primary text-lg text-center">Take Your First Challenge</Link>
            <Link href="/leaderboard" className="btn-secondary text-lg text-center">View Leaderboard</Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-12 border-y border-white/5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-nachas-gold">{stats.activeChallenges.toLocaleString()}</div>
            <div className="text-white/50 text-sm mt-1">Active Challenges</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-nachas-teal">{formatCents(stats.totalRaised)}</div>
            <div className="text-white/50 text-sm mt-1">Raised</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-nachas-coral">{stats.maxStreak}</div>
            <div className="text-white/50 text-sm mt-1">Day Max Streak</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-nachas-purple">{stats.ripples}</div>
            <div className="text-white/50 text-sm mt-1">Ripples Created</div>
          </div>
        </div>
      </section>

      <section className="px-6 py-14 md:py-20 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-10 md:mb-16">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card text-center">
            <div className="w-14 h-14 bg-nachas-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LogoMark className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Take a Challenge</h3>
            <p className="text-white/50">Choose from curated challenges or create your own. Set your duration and pick a charity.</p>
          </div>
          <div className="card text-center">
            <div className="w-14 h-14 bg-nachas-teal/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-nachas-teal" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Get Sponsored</h3>
            <p className="text-white/50">Friends and family pledge per day you complete. The longer your streak, the more you raise.</p>
          </div>
          <div className="card text-center">
            <div className="w-14 h-14 bg-nachas-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Heart className="w-7 h-7 text-nachas-green" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Make an Impact</h3>
            <p className="text-white/50">Complete your challenge. Funds go to your chosen charity. Inspire others to take the challenge too.</p>
          </div>
        </div>
      </section>

      <section className="px-6 py-14 md:py-20 text-center">
        <div className="max-w-2xl mx-auto card">
          <TrendingUp className="w-12 h-12 text-nachas-gold mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Ready to grow?</h2>
          <p className="text-white/60 mb-8">Join thousands turning personal commitment into communal impact.</p>
          <Link href="/new-challenge" className="btn-primary text-lg inline-block">Start Your Challenge</Link>
        </div>
      </section>
    </div>
  )
}
