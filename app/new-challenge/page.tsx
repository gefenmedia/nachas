'use client'

import { useAuth } from '@/components/ui/auth-context'
import { useRouter } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'
import { store, Charity } from '@/lib/store'
import { challengeDisplayName } from '@/lib/utils'
import { currentReturnTo, rememberReturnTo, locationParams } from '@/lib/deep-link'

const CURATED = [
  { key: 'tefillin_30', name: 'Tefillin', icon: '📿', defaultDays: 30, category: 'daily_mitzvah' },
  { key: 'tehillim_40', name: 'Tehillim', icon: '📖', defaultDays: 40, category: 'daily_mitzvah' },
  { key: 'no_smoking_90', name: 'No Smoking', icon: '🚭', defaultDays: 90, category: 'lifestyle' },
  { key: 'masechta_90', name: 'Masechta Brachos', icon: '📚', defaultDays: 90, category: 'learning' },
  { key: 'no_lashon_hara_30', name: 'No Lashon Hara', icon: '🤐', defaultDays: 30, category: 'lifestyle' },
]

function NewChallengeForm() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [fromId, setFromId] = useState('')
  const [step, setStep] = useState(1)
  const [charities, setCharities] = useState<Charity[]>([])
  const [form, setForm] = useState({
    type: 'curated' as 'curated' | 'custom',
    curatedKey: '',
    customName: '',
    customDescription: '',
    category: 'daily_mitzvah',
    durationDays: 30,
    charityId: '',
    goalAmountCents: 50000,
    dedication: '',
    personalNote: '',
    isPublic: true,
  })
  const continueRef = useRef<HTMLButtonElement>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Read ?from= directly from the URL (static-export safe)
  useEffect(() => {
    setFromId(locationParams(window.location).get('from') || '')
  }, [])

  useEffect(() => {
    if (!authLoading && !user) {
      const target = currentReturnTo(window.location)
      rememberReturnTo(target)
      router.push(`/login?next=${encodeURIComponent(target)}`)
    }
    store.init()
    setCharities(store.getCharities())
    // "Take this challenge" pre-fills the wizard from the source challenge
    if (fromId) {
      const source = store.getChallengeById(fromId)
      if (source) {
        // normalize the curated key to one this wizard offers (seed data uses variants like tefillin_90)
        let curatedKey = source.curatedKey || ''
        let type = source.type
        let customName = source.customName || ''
        if (curatedKey && !CURATED.some(c => c.key === curatedKey)) {
          const match = CURATED.find(c => c.name === challengeDisplayName(source))
          if (match) curatedKey = match.key
          else { type = 'custom'; customName = challengeDisplayName(source); curatedKey = '' }
        }
        setForm(f => ({
          ...f,
          type,
          curatedKey,
          customName,
          customDescription: source.customDescription || '',
          category: source.category || 'daily_mitzvah',
          durationDays: source.durationDays,
          charityId: source.charityId,
          goalAmountCents: source.goalAmountCents,
        }))
      }
    }
  }, [user, authLoading, router, fromId])

  // Auto-scroll to the Continue button the moment a selection is made
  function scrollToContinue() {
    setTimeout(() => continueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
  }

  async function handleSubmit() {
    if (!user) return
    setError('')
    if (form.durationDays < 1) { setError('Duration must be at least 1 day'); return }
    if (form.goalAmountCents <= 0) { setError('Please set a fundraising goal greater than $0'); return }
    if (form.type === 'custom' && !form.customName.trim()) { setError('Please give your challenge a name'); return }
    setSubmitting(true)
    try {
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + form.durationDays)
      const challenge = store.createChallenge({
        userId: user.id,
        charityId: form.charityId,
        type: form.type,
        curatedKey: form.curatedKey || undefined,
        customName: form.customName || undefined,
        customDescription: form.customDescription || undefined,
        category: form.category,
        durationDays: form.durationDays,
        goalAmountCents: form.goalAmountCents,
        dedication: form.dedication || undefined,
        personalNote: form.personalNote || undefined,
        startDate: new Date().toISOString(),
        endDate: endDate.toISOString(),
        parentChallengeId: fromId || undefined,
        isPublic: form.isPublic,
      })
      router.push(`/challenge?id=${challenge.id}&new=1`)
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  if (authLoading) return <div className="p-20 text-center">Loading...</div>

  const selected = CURATED.find(c => c.key === form.curatedKey)

  return (
    <div className="px-6 py-8 max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-8">
        {[1,2,3,4,5].map(s => <div key={s} className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-nachas-gold' : 'bg-white/10'}`} />)}
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">What will you commit to?</h1>
          <div className="space-y-3">
            <div className="text-sm text-white/40 uppercase tracking-wider">Curated Challenges</div>
            {CURATED.map(c => (
              <button key={c.key} onClick={() => { setForm({ ...form, type: 'curated', curatedKey: c.key, durationDays: c.defaultDays, category: c.category }); scrollToContinue() }}
                className={`w-full card text-left flex items-center gap-4 hover:bg-white/5 transition ${form.curatedKey === c.key ? 'border-nachas-gold/50 bg-nachas-gold/5' : ''}`}>
                <span className="text-3xl">{c.icon}</span>
                <div className="flex-1"><div className="font-semibold">{c.name}</div></div>
                <ChevronRight className="w-5 h-5 text-white/20" />
              </button>
            ))}
          </div>
          <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div><div className="relative flex justify-center"><span className="bg-nachas-dark px-4 text-sm text-white/40">or</span></div></div>
          <button onClick={() => { setForm({ ...form, type: 'custom', curatedKey: '' }); scrollToContinue() }} className={`w-full card text-left hover:bg-white/5 transition ${form.type === 'custom' ? 'border-nachas-gold/50 bg-nachas-gold/5' : ''}`}>
            <div className="flex items-center gap-3"><Sparkles className="w-6 h-6 text-nachas-gold" /><div><div className="font-semibold">Create Your Own</div><div className="text-sm text-white/40">Name it and describe it your way</div></div></div>
          </button>
          {form.type === 'custom' && (
            <div className="space-y-4 card border-nachas-gold/30">
              <div><label className="block text-sm text-white/60 mb-1">Challenge Name</label><input className="input" placeholder="e.g. Daily Tehillim for Refuah" value={form.customName} onChange={e => setForm({...form, customName: e.target.value})} /></div>
              <div><label className="block text-sm text-white/60 mb-1">Description</label><textarea className="input" rows={2} placeholder="What exactly are you committing to?" value={form.customDescription} onChange={e => setForm({...form, customDescription: e.target.value})} /></div>
            </div>
          )}
          <button ref={continueRef} onClick={() => setStep(2)} disabled={(form.type === 'curated' && !form.curatedKey) || (form.type === 'custom' && !form.customName.trim())} className="btn-primary w-full">Continue <ChevronRight className="w-4 h-4 inline" /></button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2"><button onClick={() => setStep(1)} className="text-white/40 hover:text-white"><ChevronLeft className="w-5 h-5" /></button><h1 className="text-2xl font-bold">How many days?</h1></div>
          <div className="grid grid-cols-4 gap-2">
            {[30, 40, 60, 90].map(d => (
              <button key={d} onClick={() => setForm({ ...form, durationDays: d })}
                className={`py-3 rounded-xl text-sm font-semibold transition ${form.durationDays === d ? 'bg-nachas-gold text-nachas-dark' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                {d}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">Duration (days)</label>
            <input type="number" min="1" className="input" value={form.durationDays || ''} onChange={e => setForm({...form, durationDays: parseInt(e.target.value)||0})} />
          </div>
          <button onClick={() => setStep(3)} disabled={form.durationDays < 1} className="btn-primary w-full">Continue <ChevronRight className="w-4 h-4 inline" /></button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2"><button onClick={() => setStep(2)} className="text-white/40 hover:text-white"><ChevronLeft className="w-5 h-5" /></button><h1 className="text-2xl font-bold">Who benefits?</h1></div>
          <div className="space-y-3">
            {charities.map((charity: Charity) => (
              <button key={charity.id} onClick={() => { setForm({ ...form, charityId: charity.id }); scrollToContinue() }}
                className={`w-full card text-left flex items-center gap-4 hover:bg-white/5 transition ${form.charityId === charity.id ? 'border-nachas-gold/50 bg-nachas-gold/5' : ''}`}>
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-xl font-bold">{charity.name[0]}</div>
                <div className="flex-1"><div className="font-semibold">{charity.name}</div><div className="text-sm text-white/40">{charity.description}</div></div>
              </button>
            ))}
          </div>
          <button ref={continueRef} onClick={() => setStep(4)} disabled={!form.charityId} className="btn-primary w-full">Continue <ChevronRight className="w-4 h-4 inline" /></button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2"><button onClick={() => setStep(3)} className="text-white/40 hover:text-white"><ChevronLeft className="w-5 h-5" /></button><h1 className="text-2xl font-bold">Set your goal</h1></div>
          <div className="card bg-nachas-gold/5 border-nachas-gold/20">
            <div className="text-white/60 text-sm">If 10 people sponsor you at $1 a day for 30 days, you&apos;ll raise $300 (plus a completion bonus potential).</div>
          </div>
          <div><label className="block text-sm text-white/60 mb-1">Fundraising Goal</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">$</span><input type="number" min="1" className="input pl-8" value={form.goalAmountCents ? form.goalAmountCents/100 : ''} onChange={e => setForm({...form, goalAmountCents: (parseInt(e.target.value)||0)*100})} /></div></div>
          <button onClick={() => setStep(5)} disabled={form.goalAmountCents <= 0} className="btn-primary w-full">Continue <ChevronRight className="w-4 h-4 inline" /></button>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2"><button onClick={() => setStep(4)} className="text-white/40 hover:text-white"><ChevronLeft className="w-5 h-5" /></button><h1 className="text-2xl font-bold">Make it yours</h1></div>
          <div><label className="block text-sm text-white/60 mb-1">Dedication (optional)</label><input className="input" placeholder="L&apos;ilui nishmas... or refuah sheleimah for..." value={form.dedication} onChange={e => setForm({...form, dedication: e.target.value})} /></div>
          <div><label className="block text-sm text-white/60 mb-1">Why this matters to you</label><textarea className="input" rows={3} placeholder="Share your personal motivation..." value={form.personalNote} onChange={e => setForm({...form, personalNote: e.target.value})} /></div>
          <div className="flex items-center justify-between card bg-white/5">
            <div className="pr-4">
              <div className="font-medium text-sm">{form.isPublic ? 'Public challenge' : 'Private challenge'}</div>
              <div className="text-xs text-white/40 mt-0.5">{form.isPublic ? 'Shows on the leaderboard and can be found by others.' : 'Only people you share the link with can see it. Stays off the leaderboard.'}</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.isPublic}
              onClick={() => setForm({ ...form, isPublic: !form.isPublic })}
              className={`relative w-12 h-7 rounded-full transition shrink-0 ${form.isPublic ? 'bg-nachas-gold' : 'bg-white/20'}`}
            >
              <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${form.isPublic ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <div className="card bg-white/5"><div className="text-sm text-white/40 mb-2">Preview</div><div className="font-semibold">{form.customName || selected?.name || 'Your Challenge'}</div><div className="text-sm text-white/60">{form.durationDays} days for {charities.find(c=>c.id===form.charityId)?.name}</div>{form.dedication && <div className="text-sm text-nachas-gold mt-2 italic">&quot;{form.dedication}&quot;</div>}</div>
          {error && <div className="card bg-nachas-coral/10 border-nachas-coral/30 text-nachas-coral text-sm">{error}</div>}
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full text-lg disabled:opacity-60">{submitting ? 'Launching…' : 'Launch My Challenge 🚀'}</button>
        </div>
      )}
    </div>
  )
}

export default function NewChallengePage() {
  return (
    <Suspense fallback={<div className="p-20 text-center">Loading...</div>}>
      <NewChallengeForm />
    </Suspense>
  )
}
