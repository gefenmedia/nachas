'use client'

import { useAuth } from '@/components/ui/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Camera, Check } from 'lucide-react'
import { store } from '@/lib/store'
import { fileToAvatarDataUrl } from '@/lib/image'
import { trackEvent } from '@/lib/track'
import { currentReturnTo, rememberReturnTo } from '@/lib/deep-link'

/**
 * Profile — minimalistic settings view only.
 * Public profile (badges, history, stats) lives at /user?id=<me>.
 */
export default function ProfilePage() {
  const { user, loading: authLoading, updateAvatar, updateProfile } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState({ name: '', bio: '', email: '', password: '' })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      const target = currentReturnTo(window.location)
      rememberReturnTo(target)
      router.push(`/login?next=${encodeURIComponent(target)}`)
    }
    if (user) {
      store.init()
      setForm({ name: user.name, bio: user.bio || '', email: user.email, password: '' })
    }
  }, [user, authLoading, router])

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await fileToAvatarDataUrl(file)
      updateAvatar(dataUrl)
    } catch {
      // ignore unusable image
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Display name cannot be empty'); return }
    if (!form.email.trim() || !form.email.includes('@')) { setError('Please enter a valid email address'); return }
    const existing = store.findUserByEmail(form.email.trim())
    if (existing && existing.id !== user?.id) { setError('That email is already in use'); return }
    const updates: { name: string; email: string; bio?: string; password?: string } = {
      name: form.name.trim(),
      email: form.email.trim(),
      bio: form.bio.trim() || undefined,
    }
    if (form.password) updates.password = form.password
    const updated = updateProfile(updates)
    if (updated) {
      trackEvent('profile_updated', {}, { userId: updated.id, userName: updated.name })
      setForm(f => ({ ...f, password: '' }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  if (authLoading || !user) return <div className="flex items-center justify-center min-h-[60vh]">Loading...</div>

  return (
    <div className="px-6 py-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <form onSubmit={handleSave} className="card space-y-5">
        {/* Profile picture */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title={user.avatarUrl ? 'Change photo' : 'Add a profile photo'}
            className="relative w-24 h-24 rounded-full bg-nachas-gold/10 flex items-center justify-center font-bold text-3xl text-nachas-gold overflow-hidden hover:bg-nachas-gold/20 transition"
          >
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              : user.name.charAt(0).toUpperCase()}
            <span className="absolute bottom-0 inset-x-0 bg-black/50 flex items-center justify-center py-1">
              <Camera className="w-4 h-4 text-white/80" />
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1">Display Name</label>
          <input
            className="input"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1">About Me</label>
          <textarea
            className="input resize-none"
            rows={4}
            maxLength={160}
            placeholder="Tell people why you take challenges…"
            value={form.bio}
            onChange={e => setForm({ ...form, bio: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1">Email Address</label>
          <input
            type="email"
            className="input"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1">New Password</label>
          <input
            type="password"
            className="input"
            placeholder="Leave blank to keep your current password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
          />
        </div>

        {error && <p className="text-nachas-coral text-sm">{error}</p>}

        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
          {saved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
