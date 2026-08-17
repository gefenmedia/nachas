'use client'

import { useEffect, useRef, useState } from 'react'

/* ─────────────────────────────────────────────────────────────
   Nachas FX — engagement primitives shared across the app.
   Count-up numbers, sound, and haptics. All respect user prefs
   and degrade gracefully (no sound file? silent. no vibrate? no-op).
   ───────────────────────────────────────────────────────────── */

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Animated count-up. Eases from its previous value to the new one whenever
 * `value` changes. `format` lets callers render money, plain ints, etc.
 */
export function CountUp({
  value,
  format = (n: number) => Math.round(n).toString(),
  durationMs = 900,
  className = '',
}: {
  value: number
  format?: (n: number) => string
  durationMs?: number
  className?: string
}) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef<number>()

  useEffect(() => {
    const from = fromRef.current
    const to = value
    if (from === to) return
    if (prefersReducedMotion()) { setDisplay(to); fromRef.current = to; return }

    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (to - from) * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = to
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value, durationMs])

  return <span className={`tabular-nums ${className}`}>{format(display)}</span>
}

/* ── Sound ──────────────────────────────────────────────────── */

const SOUND_PREF_KEY = 'nachas_sound_on'

export function isSoundOn(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(SOUND_PREF_KEY) !== 'off'  // default ON
}

export function setSoundOn(on: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SOUND_PREF_KEY, on ? 'on' : 'off')
}

// Web Audio — synthesized tones, so there are no asset files to ship or
// fail to load. Warm, soft chimes tuned to feel dignified, not arcade-y.
let audioCtx: AudioContext | null = null
function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    return audioCtx
  } catch { return null }
}

function tone(freq: number, startAt: number, dur: number, gain = 0.12, type: OscillatorType = 'sine') {
  const c = ctx(); if (!c) return
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  osc.connect(g); g.connect(c.destination)
  const t0 = c.currentTime + startAt
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

/** A soft two-note "check-in done" chime (major third up). */
export function playCheckIn() {
  if (!isSoundOn()) return
  const c = ctx(); if (!c) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  tone(523.25, 0, 0.18, 0.10)      // C5
  tone(659.25, 0.10, 0.28, 0.10)   // E5
}

/** A bigger, brighter arpeggio for milestones / completion. */
export function playMilestone() {
  if (!isSoundOn()) return
  const c = ctx(); if (!c) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  tone(523.25, 0, 0.16, 0.10)      // C5
  tone(659.25, 0.12, 0.16, 0.10)   // E5
  tone(783.99, 0.24, 0.16, 0.10)   // G5
  tone(1046.5, 0.36, 0.5, 0.12)    // C6
}

/* ── Haptics ────────────────────────────────────────────────── */

export function haptic(pattern: number | number[] = 12) {
  if (typeof window === 'undefined') return
  if (prefersReducedMotion()) return
  try { navigator.vibrate?.(pattern) } catch {}
}

export const hapticCheckIn = () => haptic(14)
export const hapticMilestone = () => haptic([18, 40, 22, 40, 30])
