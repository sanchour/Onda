// Integration status for Settings > Integrations: real connection state, last-synced times and errors.
//   GET                                   -> { notion, calendar, reminders }
//   POST { action: 'rotate', kind }       -> { token }   (revokes every calendar or shortcut using the old link)
import { HttpError, admin, json, requireUser, serve } from '../_shared/http.ts'

const ms = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : null)

serve(async (req) => {
  const user = await requireUser(req)
  const db = admin()

  if (req.method === 'POST') {
    const { action, kind } = (await req.json().catch(() => ({}))) as { action?: string; kind?: string }
    if (action !== 'rotate' || (kind !== 'calendar' && kind !== 'reminders')) throw new HttpError(400, 'Unknown action')
    const token = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('')
    const { error } = await db.from('feed_tokens').upsert({ user_id: user.id, kind, token, last_fetched_at: null }, { onConflict: 'user_id,kind' })
    if (error) throw new HttpError(500, error.message)
    return json(req, { token })
  }
  if (req.method !== 'GET') throw new HttpError(405, 'GET or POST')

  // Feed links exist from the first time the sheet is opened.
  await db.from('feed_tokens').upsert([{ user_id: user.id, kind: 'calendar' }, { user_id: user.id, kind: 'reminders' }], { onConflict: 'user_id,kind', ignoreDuplicates: true })
  const [{ data: tokens }, { data: notion }, { count: queued }] = await Promise.all([
    db.from('feed_tokens').select('kind, token, last_fetched_at').eq('user_id', user.id),
    db.from('notion_connections').select('workspace_name, parent_title, last_synced_at, last_error, failed').eq('user_id', user.id).maybeSingle(),
    db.from('notion_queue').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
  ])
  const feed = (kind: string) => tokens?.find((t) => t.kind === kind)

  return json(req, {
    notion: {
      connected: !!notion,
      workspace: notion?.workspace_name ?? null,
      parent: notion?.parent_title ?? null,
      lastSyncedAt: ms(notion?.last_synced_at),
      lastError: notion?.last_error ?? null,
      failed: notion?.failed ?? 0,
      queued: notion ? (queued ?? 0) : 0,
    },
    calendar: { token: feed('calendar')?.token ?? null, lastFetchedAt: ms(feed('calendar')?.last_fetched_at) },
    reminders: { token: feed('reminders')?.token ?? null, lastFetchedAt: ms(feed('reminders')?.last_fetched_at), shortcutUrl: Deno.env.get('SHORTCUT_URL') ?? null },
  })
})
