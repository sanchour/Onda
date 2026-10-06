// Shared HTTP helpers for the Edge Functions (Deno).
import { createClient, type SupabaseClient, type User } from 'jsr:@supabase/supabase-js@2'

export const env = (name: string, fallback?: string): string => {
  const v = Deno.env.get(name) ?? fallback
  if (v === undefined) throw new HttpError(500, `Missing function secret ${name}`)
  return v
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

/** Only the deployed app (and local dev) may call the browser-facing functions. */
export function cors(req: Request): Record<string, string> {
  const allowed = (Deno.env.get('APP_ORIGINS') ?? 'http://localhost:5173,http://localhost:4173').split(',').map((s) => s.trim())
  const origin = req.headers.get('origin') ?? ''
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0]!,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    Vary: 'Origin',
  }
}

export const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json; charset=utf-8' } })

/** Service-role client: bypasses RLS. Never return its results to a caller without checking who they are. */
export const admin = (): SupabaseClient =>
  createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } })

/** The signed-in user behind the request's bearer token. */
export async function requireUser(req: Request): Promise<User> {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) throw new HttpError(401, 'Missing bearer token')
  const { data, error } = await admin().auth.getUser(token)
  if (error || !data.user) throw new HttpError(401, 'Invalid session')
  return data.user
}

/** Scheduled calls come from pg_cron through pg_net with a shared secret. */
export function isCron(req: Request): boolean {
  const secret = Deno.env.get('CRON_SECRET')
  return !!secret && timingSafeEqual(req.headers.get('x-cron-secret') ?? '', secret)
}

export function timingSafeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a)
  const y = new TextEncoder().encode(b)
  if (x.length !== y.length) return false
  let d = 0
  for (let i = 0; i < x.length; i++) d |= x[i]! ^ y[i]!
  return d === 0
}

type Handler = (req: Request) => Promise<Response>
/** Wrap a handler with CORS preflight and uniform error responses. */
export function serve(handler: Handler) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
    try {
      return await handler(req)
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500
      if (status >= 500) console.error(e)
      return json(req, { error: e instanceof Error ? e.message : 'Internal error' }, status)
    }
  })
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
