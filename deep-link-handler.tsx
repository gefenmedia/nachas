'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getDeepLinkFromLocation, rememberReturnTo } from '@/lib/deep-link'

/**
 * Catches shared/deep links as early as possible on app launch.
 * If a link opens a shell route (/, /dashboard from the PWA manifest, login,
 * or signup) but carries a challenge/user id, route to that target first and
 * remember it so auth never sends the user back to their own Home instead.
 */
export function DeepLinkHandler() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const loc = window.location
    const target = getDeepLinkFromLocation(loc)
    if (!target) return

    rememberReturnTo(target.returnTo)

    const current = `${loc.pathname}${loc.search}${loc.hash}`
    const openedShellRoute = pathname === '/' || pathname === '/dashboard' || pathname === '/login' || pathname === '/signup' || loc.hash.startsWith('#/')
    if (current !== target.returnTo && openedShellRoute) {
      router.replace(target.returnTo)
    }
  }, [pathname, router])

  return null
}
