'use client'

import { useAuth } from '@/components/ui/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { HomeScreen } from '@/components/ui/home-screen'
import { currentReturnTo, rememberReturnTo } from '@/lib/deep-link'

/**
 * /dashboard now renders the same Home screen as / for logged-in users,
 * so existing links (including /dashboard#chevra) keep working.
 */
export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      const target = currentReturnTo(window.location)
      rememberReturnTo(target)
      router.push(`/login?next=${encodeURIComponent(target)}`)
    }
  }, [user, loading, router])

  if (loading || !user) return <div className="flex items-center justify-center min-h-[60vh]">Loading...</div>

  return <HomeScreen />
}
