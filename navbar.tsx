'use client'

import Link from 'next/link'
import { useAuth } from '@/components/ui/auth-context'
import { Menu, X, MoreVertical, User as UserIcon, BarChart3, LogOut } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { useState, useRef, useEffect } from 'react'
import { currentReturnTo } from '@/lib/deep-link'

export function Navbar() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [authNext, setAuthNext] = useState('')
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const target = currentReturnTo(window.location)
    if (target && !target.startsWith('/login') && !target.startsWith('/signup')) setAuthNext(target)
  }, [])

  const loginHref = authNext ? `/login?next=${encodeURIComponent(authNext)}` : '/login'
  const signupHref = authNext ? `/signup?next=${encodeURIComponent(authNext)}` : '/signup'

  // Close the settings dropdown when tapping anywhere outside it
  useEffect(() => {
    if (!settingsOpen) return
    function onDocClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [settingsOpen])

  const settingsMenu = (
    <div ref={settingsRef} className="relative">
      <button
        className="p-2 text-white/60 hover:text-white transition rounded-lg hover:bg-white/5"
        onClick={() => setSettingsOpen(!settingsOpen)}
        aria-label="Settings"
        title="Settings"
      >
        <MoreVertical className="w-5 h-5" />
      </button>
      {settingsOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 card !p-2 shadow-xl shadow-black/40 z-50">
          <Link
            href="/profile"
            onClick={() => setSettingsOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/5 transition"
          >
            <UserIcon className="w-4 h-4 shrink-0" /> Profile
          </Link>
          <Link
            href="/admin"
            onClick={() => setSettingsOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/5 transition"
          >
            <BarChart3 className="w-4 h-4 shrink-0" /> Beta activity &amp; export
          </Link>
          <div className="my-1 border-t border-white/5" />
          <button
            onClick={() => { setSettingsOpen(false); logout() }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-nachas-coral hover:bg-nachas-coral/10 transition"
          >
            <LogOut className="w-4 h-4 shrink-0" /> Sign out
          </button>
        </div>
      )}
    </div>
  )

  return (
    <nav className="border-b border-white/5 bg-nachas-dark/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo is static — not a navigation control */}
        <div aria-label="Nachas">
          <Logo />
        </div>

        <div className="hidden md:flex items-center gap-6">
          <Link href="/leaderboard" className="text-white/60 hover:text-white transition">Leaderboard</Link>
          {user ? (
            <>
              <Link href="/profile" className="text-white/60 hover:text-white transition">Profile</Link>
              <Link href="/new-challenge" className="btn-primary py-2 px-4 text-sm">New Challenge</Link>
              {settingsMenu}
            </>
          ) : (
            <>
              <Link href={loginHref} className="text-white/60 hover:text-white transition">Sign In</Link>
              <Link href={signupHref} className="btn-primary py-2 px-4 text-sm">Get Started</Link>
            </>
          )}
        </div>

        {user ? (
          <div className="md:hidden">{settingsMenu}</div>
        ) : (
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen ? <X /> : <Menu />}
          </button>
        )}
      </div>

      {menuOpen && !user && (
        <div className="md:hidden px-6 pb-4 space-y-3 border-t border-white/5 pt-4">
          <Link href="/leaderboard" className="block text-white/60" onClick={() => setMenuOpen(false)}>Leaderboard</Link>
          <Link href={loginHref} className="block text-white/60" onClick={() => setMenuOpen(false)}>Sign In</Link>
          <Link href={signupHref} className="btn-primary block text-center py-2" onClick={() => setMenuOpen(false)}>Get Started</Link>
        </div>
      )}
    </nav>
  )
}
