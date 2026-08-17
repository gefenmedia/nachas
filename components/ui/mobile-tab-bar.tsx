'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Trophy, User as UserIcon, Plus } from 'lucide-react'
import { useAuth } from '@/components/ui/auth-context'

export function MobileTabBar() {
  const { user, loading } = useAuth()
  const pathname = usePathname()

  if (loading || !user) return null

  function isActive(href: string): boolean {
    if (href === '/') {
      return pathname === '/' || pathname.startsWith('/dashboard') || pathname.startsWith('/challenge')
    }
    return pathname.startsWith(href)
  }

  const tab = (href: string, label: string, Icon: any) => {
    const active = isActive(href)
    return (
      <Link href={href} className="flex flex-col items-center justify-center gap-1">
        <Icon className={`w-6 h-6 transition ${active ? 'text-nachas-gold' : 'text-white/40'}`} />
        <span className={`text-[11px] font-medium transition ${active ? 'text-nachas-gold' : 'text-white/40'}`}>{label}</span>
      </Link>
    )
  }

  return (
    <>
      {/* spacer so page content is never hidden behind the bar */}
      <div className="h-[calc(4.5rem+env(safe-area-inset-bottom))] md:hidden" />
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-nachas-dark/95 backdrop-blur-md border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4 h-16 items-center">
          {tab('/', 'Home', Home)}
          {tab('/leaderboard', 'Ranks', Trophy)}
          <Link href="/new-challenge" className="flex flex-col items-center justify-center gap-1">
            <span className="w-11 h-11 -mt-1 rounded-full bg-nachas-gold text-nachas-dark flex items-center justify-center shadow-lg shadow-nachas-gold/20">
              <Plus className="w-6 h-6" />
            </span>
          </Link>
          {tab('/profile', 'Profile', UserIcon)}
        </div>
      </nav>
    </>
  )
}
