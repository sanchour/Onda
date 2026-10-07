import type { Session, SupabaseClient } from '@supabase/supabase-js'

/* Supabase is optional at build time. Without VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY the app runs in
   local mode: everything works on-device, and sync, integrations, push and checkout report "not configured". */

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const backendConfigured = !!(URL_ && KEY)
export const functionsUrl = (name: string) => `${URL_}/functions/v1/${name}`

let client: Promise<SupabaseClient> | null = null
/** The client is a lazy chunk so it never delays first paint. */
export function getSupabase(): Promise<SupabaseClient> | null {
  if (!backendConfigured) return null
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL_!, KEY!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } }),
  )
  return client
}

/** First launch creates an anonymous account so data can sync before the user ever signs in. */
export async function ensureSession(): Promise<Session | null> {
  const sb = await getSupabase()
  if (!sb) return null
  const { data } = await sb.auth.getSession()
  if (data.session) return data.session
  if (!navigator.onLine) return null
  const { data: anon, error } = await sb.auth.signInAnonymously()
  if (error) {
    console.warn('[onda] anonymous sign-in failed', error.message)
    return null
  }
  return anon.session
}

export async function accessToken(): Promise<string | null> {
  return (await ensureSession())?.access_token ?? null
}

/** Call an Edge Function as the signed-in user. Throws on a non-2xx response. */
export async function callFunction<T = unknown>(name: string, init: { method?: string; body?: unknown; query?: Record<string, string> } = {}): Promise<T> {
  if (!backendConfigured) throw new Error('not-configured')
  const token = await accessToken()
  if (!token) throw new Error('no-session')
  const q = init.query ? `?${new URLSearchParams(init.query)}` : ''
  const res = await fetch(functionsUrl(name) + q, {
    method: init.method ?? (init.body ? 'POST' : 'GET'),
    headers: { Authorization: `Bearer ${token}`, apikey: KEY!, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || `HTTP ${res.status}`)
  return (res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text()) as T
}

export interface AccountInfo {
  id: string
  email: string | null
  anonymous: boolean
}
export async function accountInfo(): Promise<AccountInfo | null> {
  const s = await ensureSession()
  if (!s) return null
  return { id: s.user.id, email: s.user.email ?? null, anonymous: !!s.user.is_anonymous }
}

/** Upgrade the anonymous account with Sign in with Apple (falls back to a plain sign-in if the identity already exists). */
export async function signInWithApple(): Promise<void> {
  const sb = await getSupabase()
  if (!sb) throw new Error('not-configured')
  const redirectTo = window.location.origin + import.meta.env.BASE_URL
  const { data } = await sb.auth.getSession()
  if (data.session?.user.is_anonymous) {
    const { error } = await sb.auth.linkIdentity({ provider: 'apple', options: { redirectTo } })
    if (!error) return
  }
  const { error } = await sb.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo } })
  if (error) throw error
}

/** Email magic link. An anonymous account is upgraded in place; an existing account is signed in to. */
export async function sendMagicLink(email: string): Promise<void> {
  const sb = await getSupabase()
  if (!sb) throw new Error('not-configured')
  const emailRedirectTo = window.location.origin + import.meta.env.BASE_URL
  const { data } = await sb.auth.getSession()
  if (data.session?.user.is_anonymous) {
    const { error } = await sb.auth.updateUser({ email }, { emailRedirectTo })
    if (!error) return
  }
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo, shouldCreateUser: true } })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  const sb = await getSupabase()
  await sb?.auth.signOut()
}
