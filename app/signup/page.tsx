'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/ui/auth-context'
import { LogoMark } from '@/components/ui/logo'
import { store } from '@/lib/store'
import { canonicalDeepLink, consumeReturnTo, safeInternalPath } from '@/lib/deep-link'

function SignupForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signup } = useAuth()

  const fromId = searchParams.get('from')
  const nextParam = safeInternalPath(searchParams.get('next') || searchParams.get('returnTo'))
  const effectiveNext = nextParam || (fromId ? canonicalDeepLink('challenge', fromId) : '')
  const loginHref = effectiveNext ? `/login?next=${encodeURIComponent(effectiveNext)}` : '/login'
  const [parentName, setParentName] = useState('')

  useEffect(() => {
    store.init()
    if (fromId) {
      const parent = store.getChallengeById(fromId)
      if (parent?.user?.name) setParentName(parent.user.name)
    }
  }, [fromId])

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
