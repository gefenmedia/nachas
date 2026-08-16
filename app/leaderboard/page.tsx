'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, TrendingUp, CheckCircle2, Repeat } from 'lucide-react'
import { store, User } from '@/lib/store'
import { StreakFlame } from '@/components/ui/icons'
import { formatCents } from '@/lib/utils'

const TABS = [
  { key: 'earners', label: 'Top Earners', icon: TrendingUp },
  { key: 'streaks', label: 'Longest Streaks', icon: StreakFlame },
  { key: 'completed', label: 'Most Completed', icon: CheckCircle2 },
  { key: 'ripples', label: 'Biggest Ripples', icon: Repeat },
]

type Entry = { user: User; value: number }

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState('earners')
  const [entries, setEntries] = useState<Entry[]>([])

  useEffect(() => {
    store.init()
    const load = () => setEntries(store.getUserLeaderboard(activeTab))
    load()
    window.addEventListener('nachas-synced', load)
    return () => window.removeEventListener('nachas-synced', load)
  }, [activeTab])

  function valueLabel(e: Entry): { main: React.ReactNode; sub: string } {
    if (activeTab === 'earners') return { main: formatCents(e.value), sub: 'raised' }
    if (activeTab === 'streaks') return { main: `${e.value}d`, sub: 'longest streak' }
    if (activeTab === 'completed') return { main: `${e.value}`, sub: e.value === 1 ? 'challenge completed' : 'challenges completed' }
    return { main: `${e.value}`, sub: e.value === 1 ? 'challenge created' : 'challenges created' }
  }

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-3"><Trophy className="w-8 h-8 text-nachas-gold" /> Leaderboard</h1>
      <p className="text-white/40 mb-8">See who&apos;s making the biggest impact.</p>

      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide -mx-6 px-6 pb-1">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${activeTab===tab.key?'bg-nachas-gold text-nachas-dark':'bg-white/5 text-white/60 hover:bg-white/10'}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {entries.length === 0 && (
          <p className="text-white/40 text-sm text-center py-8">Nothing here yet — be the first.</p>
        )}
        {entries.map((e, i) => {
          const label = valueLabel(e)
          return (
            <Link key={e.user.id} href={`/user?id=${e.user.id}`} className="card flex items-center gap-4 hover:bg-white/5 transition">
              <div className="text-2xl font-bold text-white/20 w-8 text-center">{i+1}</div>
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold overflow-hidden">
                {e.user.avatarUrl
                  ? <img src={e.user.avatarUrl} alt={e.user.name} className="w-full h-full object-cover" />
                  : e.user.name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{e.user.name}</div>
                <div className="text-sm text-white/40">{label.sub}</div>
              </div>
              <div className="font-bold text-nachas-gold text-right">{label.main}</div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
