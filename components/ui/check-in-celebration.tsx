'use client'

import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import { HeroFlame } from '@/components/ui/icons'
import { formatCentsExact } from '@/lib/utils'
import { playCheckIn, playMilestone, hapticCheckIn, hapticMilestone } from '@/lib/fx'

/**
 * Full-screen celebration that fires the instant a check-in lands. This is the
 * single most important "feel" moment in the app — the daily reward that makes
 * the habit stick. Escalates on milestone days (7, 14, 30, 60, 90).
 */
export function CheckInCelebration({
  show,
  day,
  streak,
  earnedDeltaCents,
  charityName,
  isMilestone,
  onDone,
}: {
  show: boolean
  day: number
  streak: number
  earnedDeltaCents: number
  charityName?: string
  isMilestone: boolean
  onDone: () => void
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!show) return
    setVisible(true)

    if (isMilestone) {
      playMilestone(); hapticMilestone()
      // layered confetti burst
      confetti({ particleCount: 180, spread: 90, origin: { y: 0.55 }, colors: ['#f5c542', '#f9d76e', '#4ecdc4', '#a855f7'] })
      setTimeout(() => confetti({ particleCount: 120, angle: 60, spread: 70, origin: { x: 0 } }), 200)
      setTimeout(() => confetti({ particleCount: 120, angle: 120, spread: 70, origin: { x: 1 } }), 380)
    } else {
      playCheckIn(); hapticCheckIn()
      confetti({ particleCount: 70, spread: 62, origin: { y: 0.6 }, colors: ['#f5c542', '#f9d76e', '#ff9838'], scalar: 0.9 })
    }

    const t = setTimeout(() => { setVisible(false); onDone() }, isMilestone ? 2600 : 1800)
    return () => clearTimeout(t)
  }, [show, isMilestone, onDone])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-nachas-dark/70 backdrop-blur-sm"
      onClick={() => { setVisible(false); onDone() }}
    >
      <div className="text-center px-8 animate-scale-in">
        <div className="relative inline-block mb-2">
          {/* pulsing ring behind the flame */}
          <span className="absolute inset-0 rounded-full bg-nachas-gold/30 animate-ring-pulse" />
          <HeroFlame className="w-28 h-28 relative animate-pop" lit />
        </div>

        <div className="text-6xl font-extrabold text-nachas-gold tabular-nums animate-pop">{streak}</div>
        <div className="text-white/70 font-medium tracking-wide uppercase text-sm mb-4">
          {streak === 1 ? 'Day streak begins' : 'Day streak'}
        </div>

        {isMilestone && (
          <div className="text-2xl font-bold text-white mb-2 animate-fade-up">
            {day} days strong! 🎉
          </div>
        )}

        {earnedDeltaCents > 0 && (
          <div className="inline-flex items-center gap-2 bg-nachas-teal/15 text-nachas-teal font-semibold px-5 py-2.5 rounded-2xl animate-fade-up">
            <span className="text-lg">+{formatCentsExact(earnedDeltaCents)}</span>
            <span className="text-white/60 font-normal">for {charityName || 'charity'}</span>
          </div>
        )}

        <div className="text-white/30 text-xs mt-6">tap to continue</div>
      </div>
    </div>
  )
}
