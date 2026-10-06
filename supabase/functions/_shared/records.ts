// Load a user's replica rows into the shapes the feed builders and the Notion mapper use.
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import type { FeedData } from './feeds.ts'

export interface UserSettings {
  timezone: string
  reminderTime: string
  eveningTime: string
  notifDaily: boolean
  notifEvening: boolean
  notifMilestones: boolean
  notionLagos: boolean
  notionOndas: boolean
  notionReflections: boolean
  notionAuto: boolean
}
const DEFAULTS: UserSettings = { timezone: 'UTC', reminderTime: '08:00', eveningTime: '21:30', notifDaily: true, notifEvening: true, notifMilestones: true, notionLagos: true, notionOndas: true, notionReflections: true, notionAuto: true }

export async function loadSettings(db: SupabaseClient, userId: string): Promise<UserSettings & { name: string }> {
  const { data } = await db.from('records').select('data').eq('user_id', userId).eq('collection', 'user').limit(1).maybeSingle()
  const doc = (data?.data ?? {}) as { name?: string; settings?: Partial<UserSettings> }
  return { ...DEFAULTS, ...(doc.settings ?? {}), name: doc.name ?? '' }
}

const FEED_COLLECTIONS = ['lagos', 'runs', 'checkIns', 'practiceLogs', 'ruleLogs', 'taskLogs'] as const

/** Everything the calendar and reminders feeds need. Logs are limited to the recent past. */
export async function loadFeedData(db: SupabaseClient, userId: string): Promise<FeedData> {
  const out: FeedData = { lagos: [], runs: [], checkIns: [], practiceLogs: [], ruleLogs: [], taskLogs: [] }
  const since = Date.now() - 3 * 86400000
  for (const c of FEED_COLLECTIONS) {
    let q = db.from('records').select('data').eq('user_id', userId).eq('collection', c).is('deleted_at', null)
    // Lagos and runs are needed in full; logs only matter for "done today".
    if (c !== 'lagos' && c !== 'runs') q = q.gte('updated_at', since)
    const { data, error } = await q.limit(2000)
    if (error) throw new Error(error.message)
    ;(out[c] as unknown[]) = (data ?? []).map((r) => r.data)
  }
  return out
}

/** Resolve a private feed token to its owner and stamp the fetch time. Returns null for an unknown or rotated token. */
export async function ownerOfToken(db: SupabaseClient, kind: 'calendar' | 'reminders', token: string | null): Promise<string | null> {
  if (!token || !/^[0-9a-f]{48}$/.test(token)) return null
  const { data } = await db.from('feed_tokens').update({ last_fetched_at: new Date().toISOString() }).eq('token', token).eq('kind', kind).select('user_id').maybeSingle()
  return (data?.user_id as string | undefined) ?? null
}
