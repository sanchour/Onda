// Notion sync worker.
//   POST { action: 'cron' }      (x-cron-secret)  every minute: drain queue rows whose debounce has elapsed,
//                                                 for users with Auto update on
//   POST { action: 'sync-now' }  (signed-in user) force a full pass for that user -> { synced, failed, error }
// Each record becomes or updates exactly one page (idempotent). Failures stay queued with a backoff and are
// reported on the connection (failed count, last error) so the app can show partial failure honestly.
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { decrypt } from '../_shared/crypto.ts'
import { HttpError, admin, isCron, json, requireUser, serve } from '../_shared/http.ts'
import { Notion, NotionError, allowedCollections, ensureWorkspace, isDbKey, toProperties, type DatabaseIds, type DbKey } from '../_shared/notion.ts'
import { loadSettings } from '../_shared/records.ts'

const ORDER: DbKey[] = ['lagos', 'runs', 'checkIns', 'journal', 'reflections'] // parents before the rows that relate to them
const MAX_ATTEMPTS = 6
type Doc = Record<string, unknown> & { id: string }

interface Result {
  synced: number
  failed: number
  error: string | null
}

async function syncUser(db: SupabaseClient, userId: string, opts: { force: boolean; deadline: number }): Promise<Result> {
  const out: Result = { synced: 0, failed: 0, error: null }
  const { data: conn } = await db.from('notion_connections').select('*').eq('user_id', userId).maybeSingle()
  if (!conn) throw new HttpError(404, 'Notion is not connected')
  const settings = await loadSettings(db, userId)
  if (!opts.force && !settings.notionAuto) return out
  const allowed = allowedCollections(settings)
  const n = new Notion(await decrypt(conn.access_token_enc))

  try {
    // Finish workspace setup if the first attempt could not (no page shared yet, for example).
    let dbIds = (conn.database_ids ?? {}) as DatabaseIds
    if (ORDER.some((k) => !dbIds[k])) {
      const ws = await ensureWorkspace(n, { parent_page_id: conn.parent_page_id, database_ids: dbIds })
      await db.from('notion_connections').update(ws).eq('user_id', userId)
      dbIds = ws.database_ids
    }

    const [{ data: recs }, { data: pages }] = await Promise.all([
      db.from('records').select('collection, id, data, updated_at, deleted_at').eq('user_id', userId).in('collection', ORDER).limit(5000),
      db.from('notion_pages').select('collection, record_id, notion_page_id, synced_updated_at').eq('user_id', userId).limit(5000),
    ])
    const docs = new Map<string, { data: Doc; updated_at: number; deleted_at: number | null }>()
    for (const r of recs ?? []) docs.set(`${r.collection}:${r.id}`, { data: r.data as Doc, updated_at: Number(r.updated_at), deleted_at: r.deleted_at === null ? null : Number(r.deleted_at) })
    const pageIds = new Map<string, { id: string; at: number }>()
    for (const p of pages ?? []) pageIds.set(`${p.collection}:${p.record_id}`, { id: p.notion_page_id, at: Number(p.synced_updated_at) })
    const ctx = {
      pageOf: (c: DbKey, id: string) => pageIds.get(`${c}:${id}`)?.id,
      docOf: (c: DbKey, id: string) => docs.get(`${c}:${id}`)?.data,
    }

    // Sync Now: queue everything that is new or changed since it was last written to Notion.
    if (opts.force) {
      const stale = [...docs.entries()].filter(([k, v]) => allowed.has(k.split(':')[0] as DbKey) && (pageIds.get(k)?.at ?? -1) < v.updated_at)
      for (let i = 0; i < stale.length; i += 500) {
        await db.from('notion_queue').upsert(
          stale.slice(i, i + 500).map(([k]) => ({ user_id: userId, collection: k.split(':')[0], record_id: k.slice(k.indexOf(':') + 1), run_after: new Date().toISOString(), attempts: 0, last_error: null })),
          { onConflict: 'user_id,collection,record_id' },
        )
      }
    }

    let q = db.from('notion_queue').select('collection, record_id, attempts').eq('user_id', userId).lt('attempts', MAX_ATTEMPTS)
    if (!opts.force) q = q.lte('run_after', new Date().toISOString())
    const { data: queue } = await q.limit(400)
    const jobs = (queue ?? []).sort((a, b) => ORDER.indexOf(a.collection as DbKey) - ORDER.indexOf(b.collection as DbKey))

    for (const job of jobs) {
      if (Date.now() > opts.deadline) break // the rest stays queued for the next tick
      const key = `${job.collection}:${job.record_id}`
      const where = { user_id: userId, collection: job.collection, record_id: job.record_id }
      const rec = docs.get(key)
      const done = () => db.from('notion_queue').delete().match(where)
      if (!isDbKey(job.collection) || !allowed.has(job.collection) || !rec) {
        await done() // toggle is off, or the record no longer exists on the server
        continue
      }
      try {
        const existing = pageIds.get(key)
        if (rec.deleted_at) {
          if (existing) await n.call('PATCH', `/pages/${existing.id}`, { archived: true })
        } else {
          const properties = toProperties(job.collection, rec.data, ctx)
          let pageId = existing?.id
          if (pageId) {
            try {
              await n.call('PATCH', `/pages/${pageId}`, { properties, archived: false })
            } catch (e) {
              // The page was deleted in Notion: make a fresh one.
              if (e instanceof NotionError && (e.status === 404 || e.code === 'object_not_found')) pageId = undefined
              else throw e
            }
          }
          if (!pageId) pageId = (await n.call<{ id: string }>('POST', '/pages', { parent: { database_id: dbIds[job.collection] }, properties })).id
          pageIds.set(key, { id: pageId, at: rec.updated_at })
          await db.from('notion_pages').upsert({ ...where, notion_page_id: pageId, synced_updated_at: rec.updated_at }, { onConflict: 'user_id,collection,record_id' })
        }
        await done()
        out.synced++
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        out.failed++
        out.error ??= msg
        const attempts = job.attempts + 1
        await db.from('notion_queue').update({ attempts, last_error: msg.slice(0, 500), run_after: new Date(Date.now() + 60_000 * 2 ** attempts).toISOString() }).match(where)
        // The token was revoked in Notion: stop, and surface it. The user reconnects from the sheet.
        if (e instanceof NotionError && e.status === 401) break
      }
    }
  } catch (e) {
    out.error = e instanceof Error ? e.message : String(e)
  }

  const { count } = await db.from('notion_queue').select('*', { count: 'exact', head: true }).eq('user_id', userId).gt('attempts', 0)
  await db
    .from('notion_connections')
    .update({ last_error: out.error ? out.error.slice(0, 500) : null, failed: count ?? 0, ...(out.error && !out.synced ? {} : { last_synced_at: new Date().toISOString() }) })
    .eq('user_id', userId)
  return { ...out, failed: count ?? out.failed }
}

serve(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'POST only')
  const { action } = (await req.json().catch(() => ({}))) as { action?: string }
  const db = admin()

  if (action === 'cron') {
    if (!isCron(req)) throw new HttpError(401, 'Bad cron secret')
    const deadline = Date.now() + 45_000
    const { data } = await db.from('notion_queue').select('user_id').lte('run_after', new Date().toISOString()).lt('attempts', MAX_ATTEMPTS).limit(1000)
    const users = [...new Set((data ?? []).map((r) => r.user_id as string))]
    let synced = 0
    for (const u of users) {
      if (Date.now() > deadline) break
      synced += (await syncUser(db, u, { force: false, deadline }).catch(() => ({ synced: 0 }))).synced
    }
    return json(req, { users: users.length, synced })
  }

  if (action === 'sync-now') {
    const user = await requireUser(req)
    return json(req, await syncUser(db, user.id, { force: true, deadline: Date.now() + 50_000 }))
  }
  throw new HttpError(400, 'Unknown action')
})
