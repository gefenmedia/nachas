import { trackEvent } from './track'
import { canonicalDeepLink } from './deep-link'

/**
 * Share a pre-filled message that includes the challenge link.
 *
 * Mobile (iOS/Android): prefer the native Web Share sheet — WhatsApp/SMS
 * picked from the sheet receive the full text, link included.
 * Fallback: wa.me click-to-chat with the ENTIRE message (text + link)
 * wrapped in a single encodeURIComponent() call, which is the format
 * iOS Safari reliably pre-fills.
 */
export function shareMessage(opts: { message: string; title?: string; channel: string }) {
  trackEvent('share_clicked', { channel: opts.channel })
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (data: { title?: string; text?: string; url?: string }) => Promise<void> }) : null
  if (nav && typeof nav.share === 'function') {
    // text already contains the link — passing it inside `text` (not the
    // separate `url` field) stops iOS from dropping the message body
    nav.share({ title: opts.title || 'Nachas', text: opts.message }).catch(() => {
      // user cancelled the sheet — nothing to do
    })
    return
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(opts.message)}`, '_blank')
}

/** Canonical public deep link for a challenge (trailing slash = static-export safe) */
export function challengeUrl(id: string): string {
  return typeof window !== 'undefined' ? `${window.location.origin}${canonicalDeepLink('challenge', id)}` : ''
}

/** Canonical public deep link for a user/profile page. */
export function userUrl(id: string): string {
  return typeof window !== 'undefined' ? `${window.location.origin}${canonicalDeepLink('user', id)}` : ''
}
