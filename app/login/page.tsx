'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/ui/auth-context'
import { LogoMark } from '@/components/ui/logo'
import { consumeReturnTo, safeInternalPath, locationParams, isDeepLinkPath } from '@/lib/deep-link'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [nextParam, setNextParam] = useState('')
  const router = useRouter()
  const { login } = useAuth()

  useEffect(() => {
    const p = locationParams(window.location)
    setNextParam(safeInternalPath(p.get('next') || p.get('returnTo')) || '')
  }, [])

  const signupHref = nextParam ? `/signup?next=${encodeURIComponent(nextParam)}` : '/signup'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const success = await login(email, password)
    if (!success) { setError('Invalid email or password'); return }

    // A shared deep-link (challenge/profile) wins over the default Home redirect,
    // but ordinary pages like /leaderboard shouldn't hijack where you land.
    const storedTarget = consumeReturnTo()
    const candidate = safeInternalPath(nextParam || storedTarget)
    const target = isDeepLinkPath(candidate) ? candidate : ''
    router.push(target || '/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="w-full max-w-md card">
        <div className="flex flex-col items-center mb-6">
          <LogoMark className="w-14 h-14 mb-3" />
          <h1 className="text-2xl font-bold text-center">Welcome Back</h1>
        </div>

        {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" required />
          </div>
          <button type="submit" className="btn-primary w-full">Sign In</button>
        </form>
        <p className="text-center text-white/40 text-sm mt-6">
          Don&apos;t have an account? <Link href={signupHref} className="text-nachas-gold hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
