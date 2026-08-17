import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// createClient throws on an empty/invalid URL, which would hard-fail the Next.js
// build during prerender if env vars aren't present. Fall back to a syntactically
// valid placeholder so the client constructs; isSupabaseConfigured() below is the
// real gate the app uses before making any calls.
const FALLBACK_URL = 'https://placeholder.supabase.co'

export const supabase = createClient(
  supabaseUrl || FALLBACK_URL,
  supabaseAnonKey || 'public-anon-key-placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

export function isSupabaseConfigured() {
  return !!supabaseUrl && !!supabaseAnonKey
}
