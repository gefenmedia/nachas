// Pre-written one-tap lines (The Chevra System — banter layer; no free-text risk)
export const CHIZUK_PACK = [
  'Proud of you. 🔥',
  "Day by day. You're doing it.",
  "The flame doesn't lie.",
  'Small steps, giant nachas.',
  'Your streak is inspiring mine.',
]

export const BANTER_PACK = [
  "Cute streak. Mine's longer. 😏",
  'Checked in at 11:58 PM? Bold.',
  'Your flame called. It misses consistency.',
]

export const HYPE_PACK = [
  "LET'S GOOO 🔥",
  'Absolute unit of a streak.',
  'Tell the charity to make room.',
]

export const NUDGE_LINE = "Your flame isn't lit yet — I'm watching. You got this. 🔥"

export function pickRandom(pack: string[]): string {
  return pack[Math.floor(Math.random() * pack.length)]
}
