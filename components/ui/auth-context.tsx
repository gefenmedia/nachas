'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { store, User } from '@/lib/store'
import { trackEvent } from '@/lib/track'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

interface AuthUser { id: string; email: string; name: string; avatarUrl?: string; bio?: string }

interface AuthContextType {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<boolean>
  signup: (name: string, email: string, password: string) => Promise<boolean>
  updateAvatar: (avatarUrl: string) => void
  updateBio: (bio: string) => void
  updateProfile: (updates: { name?: string; email?: string; password?: string; bio?: string }) => User | null
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  signup: async () => false,
  updateAvatar: () => {},
  updateBio: () => {},
  updateProfile: () => null,
  logout: () => {},
  loading: true,
})

function toAuthUser(u: User): AuthUser {
  return { id: u.id, email: u.email, name: u.name, avatarUrl: u.avatarUrl, bio: u.bio }
}

// The `users` table uses snake_case columns (avatar_url, notification_time, created_at)
// while the app's internal User type is camelCase — map between them explicitly.
function fromUsersRow(row: any): any {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    notificationTime: row.notification_time,
    timezone: row.timezone,
    createdAt: row.created_at,
  }
}

function toUsersRow(user: { id: string; email: string; name: string; notificationTime: string; timezone: string; createdAt: string }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    notification_time: user.notificationTime,
    timezone: user.timezone,
    created_at: user.createdAt,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    store.init()
    const session = store.getSession()
    if (session) {
      const full = store.findUserById(session.userId)
      setUser(full ? toAuthUser(full) : { id: session.userId, email: session.email, name: session.name })
    } else {
      setUser(null)
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
      const found = store.findUserByEmail(email)
      if (!found || found.password !== password) return false
      store.setSession(found)
      setUser(toAuthUser(found))
      return true
    }
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError || !authData.user) return false
    // Auth succeeded — this is a real account. Try to fetch the richer profile row,
    // but don't let a missing/inaccessible 'users' table block a valid login.
    const { data: profile } = await supabase.from('users').select('*').eq('email', email).single()
    const serverUser = profile ? fromUsersRow(profile) : {
      id: authData.user.id,
      email: authData.user.email || email,
      name: (authData.user.user_metadata as any)?.name || email.split('@')[0],
    }
    const full = store.importServerUser(serverUser, password)
    store.setSession(full)
    setUser(toAuthUser(full))
    return true
  }

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
      try {
        const user = store.createUser({ email, name, password, notificationTime: '20:00', timezone: 'America/New_York' })
        store.setSession(user)
        setUser(toAuthUser(user))
        return true
      } catch { return false }
    }
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    })
    if (authError || !authData.user) return false
    const user = {
      id: authData.user.id,
      email,
      name,
      notificationTime: '20:00',
      timezone: 'America/New_York',
      createdAt: new Date().toISOString(),
    }
    // Best-effort profile row — if the 'users' table isn't set up yet, the account
    // still exists in Supabase Auth and the session below still works.
    try {
      const { error: insertError } = await supabase.from('users').insert(toUsersRow(user))
      if (insertError) console.error('Supabase users insert error:', insertError.message)
    } catch (e) {
      console.error('Supabase users insert exception:', e)
    }
    const full = store.importServerUser(user, password)
    store.setSession(full)
    setUser(toAuthUser(full))
    trackEvent('signup', { name }, { userId: user.id, userName: name })
    return true
  }

  const updateAvatar = (avatarUrl: string) => {
    if (!user) return
    const updated = store.updateUser(user.id, { avatarUrl })
    if (updated) {
      setUser(toAuthUser(updated))
      trackEvent('photo_uploaded', {}, { userId: user.id, userName: user.name })
    }
  }

  const updateBio = (bio: string) => {
    if (!user) return
    const updated = store.updateUser(user.id, { bio: bio.trim() || undefined })
    if (updated) setUser(toAuthUser(updated))
  }

  const updateProfile = (updates: { name?: string; email?: string; password?: string; bio?: string }): User | null => {
    if (!user) return null
    const updated = store.updateUser(user.id, updates)
    if (updated) setUser(toAuthUser(updated))
    return updated
  }

  const logout = () => {
    store.setSession(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, updateAvatar, updateBio, updateProfile, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
