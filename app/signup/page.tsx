'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/ui/auth-context'
import { LogoMark } from '@/components/ui/logo'
import { store } from '@/lib/store'
import { canonicalDeepLink, consumeReturnTo, safeInternalPath, locationParams } from '@/lib/deep-link'

function SignupForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const { signup } = useAuth()

  const [fromId, setFromId] = useState<string | null>(null)
  const [nextParam, setNextParam] = useState('')
  const [parentName, setParentName] = useState('')

  useEffect(() => {
    const p = locationParams(window.location)
    const f = p.get('from')
    setFromId(f)
    setNextParam(safeInternalPath(p.get('next') || p.get('returnTo')) || '')
    store.init()
    if (f) {
      const parent = store.getChallengeById(f)
      if (parent?.user?.name) setParentName(parent.user.name)
    }
  }, [])

  const effectiveNext = nextParam || (fromId ? canonicalDeepLink('challenge', fromId) : '')
  const loginHref = effectiveNext ? `/login?next=${encodeURIComponent(effectiveNext)}` : '/login'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const success = await signup(name, email, password)
    if (!success) { setError('Email already registered or invalid'); return }

    // Invited via someone's Nachas page? Clone their challenge so the ripple continues.
    if (fromId) {
      const parent = store.getChallengeById(fromId)
      const newUser = store.findUserByEmail(email)
      if (parent && newUser) {
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + parent.durationDays)
        const clone = store.createChallenge({
          userId: newUser.id,
          charityId: parent.charityId,
          type: parent.type,
          curatedKey: parent.curatedKey,
          customName: parent.customName,
          customDescription: parent.customDescription,
          category: parent.category,
          durationDays: parent.durationDays,
          goalAmountCents: parent.goalAmountCents,
          startDate: new Date().toISOString(),
          endDate: endDate.toISOString(),
          parentChallengeId: parent.id,
          isPublic: true,
        })
        router.push(`/challenge?id=${clone.id}&new=1`)
        router.refresh()
        return
      }
    }
    const storedTarget = consumeReturnTo()
    const target = safeInternalPath(effectiveNext || storedTarget)
    router.push(target || '/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="w-full max-w-md card">
        <div className="flex flex-col items-center mb-6">
          <LogoMark className="w-14 h-14 mb-3" />
          <h1 className="text-2xl font-bold text-center">Create Your Account</h1>
          {parentName && (
            <p className="text-nachas-gold text-sm mt-2 text-center">
              You're joining {parentName}'s challenge 🔥 — sign up to take it together
            </p>
          )}
        </div>

        {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" required minLength={6} />
          </div>
          <button type="submit" className="btn-primary w-full">Create Account</button>
        </form>
        <p className="text-center text-white/40 text-sm mt-6">
          Already have an account? <Link href={loginHref} className="text-nachas-gold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center">Loading...</div>}>
      <SignupForm />
    </Suspense>
  )
}
