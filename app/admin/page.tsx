'use client'

import { useEffect, useRef, useState } from 'react'
import { BarChart3, Download, Upload, RefreshCw, Users, Flame, TrendingUp, Share2, MessageCircle, Heart, PartyPopper, Repeat } from 'lucide-react'
import { getEvents, mergeEvents, computeStats, fetchGlobalEvents, syncToServer, TrackEvent, BetaStats } from '@/lib/track'
import { formatCentsExact, formatCents } from '@/lib/utils'

function timeAgo(ts: string): string {
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function describe(e: TrackEvent): { icon: string; text: string } {
  const who = e.userName || 'Someone'
  const m = e.meta || {}
  switch (e.type) {
    case 'signup': return { icon: '🌱', text: `${who} joined the beta` }
    case 'login': return { icon: '👋', text: `${who} logged in` }
    case 'challenge_created': return { icon: '🎯', text: `${who} launched ${m.name || 'a challenge'} (${m.durationDays} days) for ${m.charity || 'charity'}` }
    case 'ripple': return { icon: '🔁', text: `${who} took a challenge from a friend's page` }
    case 'check_in': return { icon: '🔥', text: `${who} checked in — day ${m.day}${m.raisedDeltaCents ? ` (+${formatCentsExact(m.raisedDeltaCents)} raised)` : ''}` }
    case 'day_missed': return { icon: '💤', text: `${who} marked day ${m.day} as missed` }
    case 'challenge_completed': return { icon: '🎉', text: `${who} completed a ${m.days}-day challenge!` }
    case 'pledge_created': return { icon: '💛', text: m.type === 'flat'
        ? `${m.donorName || 'A sponsor'} gave a ${formatCentsExact(m.flatAmountCents || 0)} gift`
        : `${m.donorName || 'A sponsor'} pledged ${formatCentsExact(m.perDayAmountCents || 0)}/day${m.bonusAmountCents ? ` + ${formatCentsExact(m.bonusAmountCents)} completion bonus` : ''}` }
    case 'comment_posted': return { icon: '💬', text: `${m.authorName || 'Someone'} left encouragement` }
    case 'chizuk_sent': return { icon: '💙', text: `${who} sent chizuk to a chevra member` }
    case 'share_clicked': return { icon: '📣', text: `${who} shared via ${(m.channel || 'link').replace(/_/g, ' ')}` }
    case 'photo_uploaded': return { icon: '📸', text: `${who} added a profile photo` }
    default: return { icon: '•', text: `${who}: ${e.type}` }
  }
}

export default function AdminPage() {
  const [events, setEvents] = useState<TrackEvent[]>([])
  const [stats, setStats] = useState<BetaStats | null>(null)
  const [live, setLive] = useState(false)
  const [notice, setNotice] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function reload() {
    const global = await fetchGlobalEvents()
    const ev = global ?? getEvents()
    setLive(global !== null)
    setEvents(ev)
    setStats(computeStats(ev))
  }

  useEffect(() => { reload() }, [])

  function exportData() {
    const session = JSON.parse(localStorage.getItem('nachas_session') || 'null')
    const payload = {
      app: 'nachas-beta',
      version: 1,
      exportedAt: new Date().toISOString(),
      deviceLabel: session?.name || 'Beta device',
      events: getEvents(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `nachas-beta-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setNotice('Export downloaded — send this file to the team 💾')
  }

  async function importData(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    let added = 0
    for (const f of files) {
      try {
        const parsed = JSON.parse(await f.text())
        const list = Array.isArray(parsed) ? parsed : parsed.events
        if (Array.isArray(list)) added += mergeEvents(list, parsed.deviceLabel || f.name.replace(/\.json$/i, ''))
      } catch {
        // skip unreadable file
      }
    }
    setNotice(added > 0 ? `Merged ${added} new events from ${files.length} export${files.length > 1 ? 's' : ''} ✓` : 'No new events in those files (already merged)')
    if (added > 0) syncToServer()
    reload()
    if (fileRef.current) fileRef.current.value = ''
  }

  if (!stats) return <div className="flex items-center justify-center min-h-[60vh]">Loading...</div>

  const maxDay = Math.max(1, ...stats.byDay.map(d => d.count))
  const feed = [...events].reverse().slice(0, 30)

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6 text-nachas-gold" /> Beta Activity</h1>
          <p className="text-white/40 text-sm mt-1">
            {live
              ? <span><span className="inline-block w-2 h-2 rounded-full bg-nachas-teal mr-1.5 animate-pulse" />Live · {events.length} events from all devices, collected automatically</span>
              : <span>{events.length} events tracked{stats.devices > 0 ? ` · includes data from ${stats.devices} merged device${stats.devices > 1 ? 's' : ''}` : ' · this device'}</span>}
          </p>
        </div>
        <button onClick={reload} className="btn-secondary px-3 py-2 flex items-center gap-1.5 text-sm"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Users className="w-4 h-4" />, label: 'Testers', value: stats.signups },
          { icon: <Flame className="w-4 h-4" />, label: 'Challenges', value: stats.challengesLaunched },
          { icon: <TrendingUp className="w-4 h-4" />, label: 'Check-ins', value: stats.checkIns },
          { icon: <Repeat className="w-4 h-4" />, label: 'Ripples', value: stats.ripples },
          { icon: <Heart className="w-4 h-4" />, label: 'Donations', value: formatCentsExact(stats.pledgedCents) },
          { icon: <Share2 className="w-4 h-4" />, label: 'Shares', value: stats.shares },
          { icon: <MessageCircle className="w-4 h-4" />, label: 'Comments', value: stats.comments },
          { icon: <span className="text-xs">💙</span>, label: 'Chizuk', value: stats.chizuk },
          { icon: <PartyPopper className="w-4 h-4" />, label: 'Completed', value: stats.challengesCompleted },
        ].map((s, i) => (
          <div key={i} className="card !p-3 text-center">
            <div className="flex justify-center text-nachas-gold mb-1">{s.icon}</div>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs text-white/40">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="font-semibold mb-4">Activity — last 14 days</h3>
        <div className="flex items-end gap-1 h-24">
          {stats.byDay.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0 h-full">
              <div className="w-full bg-nachas-gold/80 rounded-sm transition-all" style={{ height: d.count > 0 ? `${Math.max(6, Math.round((d.count / maxDay) * 72))}px` : '2px', opacity: d.count > 0 ? 1 : 0.2 }} title={`${d.date}: ${d.count} events`} />
              {(i % 2 === 0) && <span className="text-[9px] text-white/30">{d.date.slice(5)}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-4">Live Feed</h3>
        {feed.length === 0 ? (
          <p className="text-white/40 text-sm">No activity yet — events appear here the moment testers use the app.</p>
        ) : (
          <div className="space-y-2.5">
            {feed.map((e) => {
              const d = describe(e)
              return (
                <div key={e.id} className="flex items-start gap-3 text-sm">
                  <span className="text-base shrink-0">{d.icon}</span>
                  <span className="flex-1 text-white/70 min-w-0">
                    {d.text}
                    {e.origin && <span className="ml-1.5 text-[10px] bg-nachas-purple/15 text-nachas-purple px-1.5 py-0.5 rounded">{e.origin}</span>}
                  </span>
                  <span className="text-white/30 text-xs shrink-0">{timeAgo(e.ts)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold mb-2">{live ? 'Backup & merge' : 'Collect tester data'}</h3>
        <p className="text-sm text-white/40 mb-4">
          {live
            ? 'All activity is being collected automatically. Export keeps a backup copy, and Merge adds exports from anyone running an older build.'
            : "Each tester taps Export on their phone and sends you the file. Import the files here to merge everyone\u2019s activity into one investor view."}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={exportData} className="btn-primary flex items-center justify-center gap-2 text-sm"><Download className="w-4 h-4" /> Export data</button>
          <button onClick={() => fileRef.current?.click()} className="btn-secondary flex items-center justify-center gap-2 text-sm"><Upload className="w-4 h-4" /> Merge exports</button>
          <input ref={fileRef} type="file" accept=".json,application/json" multiple className="hidden" onChange={importData} />
        </div>
        {notice && <p className="text-sm text-nachas-teal mt-3 text-center">{notice}</p>}
      </div>
    </div>
  )
}
