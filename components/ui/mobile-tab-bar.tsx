'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Trophy, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/components/ui/auth-context'

export function MobileTabBar() {
  const { user, loading } = useAuth()
  const pathname = usePathname()

  if (loading || !user) return null

  // Strict layout: Leaderboard (left) · Home (middle) · Profile (right)
  const tabs = [
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { href: '/', label: 'Home', icon: Home },
    { href: '/profile', label: 'Profile', icon: UserIcon },
  ]

  function isActive(href: string): boolean {
    if (href === '/') {
      return pathname === '/' || pathname.startsWith('/dashboard') || pathname.startsWith('/challenge')
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* spacer so page content is never hidden behind the bar */}
      <div className="h-[calc(4.5rem+env(safe-area-inset-bottom))] md:hidden" />
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-nachas-dark/95 backdrop-blur-md border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-3 h-16">
          {tabs.map(tab => {
            const active = isActive(tab.href)
            return (
              <Link key={tab.href} href={tab.href} className="flex flex-col items-center justify-center gap-1">
                <tab.icon className={`w-6 h-6 transition ${active ? 'text-nachas-gold' : 'text-white/40'}`} />
                <span className={`text-[11px] font-medium transition ${active ? 'text-nachas-gold' : 'text-white/40'}`}>{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
