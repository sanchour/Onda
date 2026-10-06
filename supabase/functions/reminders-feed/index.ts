// Private JSON feed for the "Onda Reminders" Shortcut (see docs/SHORTCUT.md). Deploy with --no-verify-jwt.
//   GET  ?token=...                         -> today's Lagos, practices, tasks and rules with done flags
//   POST ?token=...  { completed: [ids] }   -> marks those items done today (the round trip from Reminders)
// Item ids look like "lago:<id>", "practice:<id>", "task:<id>", "rule:<id>".
import { activeRunOf, buildRemindersFeed, todayIn } from '../_shared/feeds.ts'
import { admin } from '../_shared/http.ts'
import { detId } from '../_shared/ids.ts'
import { loadFeedData, loadSettings, ownerOfToken } from '../_shared/records.ts'

const J = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })

Deno.serve(async (req) => {
  const db = admin()
  const userId = await ownerOfToken(db, 'reminders', new URL(req.url).searchParams.get('token'))
  if (!userId) return J({ error: 'Not found' }, 404)
  try {
    const [data, settings] = await Promise.all([loadFeedData(db, userId), loadSettings(db, userId)])
    const today = todayIn(settings.timezone)

    if (req.method === 'POST') {
      const { completed } = (await req.json().catch(() => ({}))) as { completed?: unknown }
      const ids = Array.isArray(completed) ? completed.filter((x): x is string => typeof x === 'string').slice(0, 100) : []
      const feed = buildRemindersFeed(data, today)
      const open = new Set(feed.items.filter((i) => !i.done).map((i) => i.id))
      const run = activeRunOf(data)
      const now = Date.now()
      const base = (id: string) => ({ id, updatedAt: now, deviceId: 'shortcut', deletedAt: null })
      const records: { collection: string; id: string; data: Record<string, unknown> }[] = []
      for (const full of ids) {
        if (!open.has(full)) continue // unknown, not due today, or already done: nothing to write
        const [kind, id] = full.split(/:(.*)/s) as [string, string]
        if (kind === 'lago') {
          const rid = detId('checkin', id, today)
          records.push({ collection: 'checkIns', id: rid, data: { ...base(rid), lagoId: id, date: today, status: 'done', note: '', photoPath: null, at: new Date().toISOString() } })
        } else if (run && kind === 'practice') {
          const rid = detId('practice', run.id, id, today)
          records.push({ collection: 'practiceLogs', id: rid, data: { ...base(rid), runId: run.id, practiceId: id, date: today, done: true, at: new Date().toISOString() } })
        } else if (run && (kind === 'rule' || kind === 'task')) {
          const collection = kind === 'rule' ? 'ruleLogs' : 'taskLogs'
          const rid = detId(collection, run.id, id, today)
          records.push({ collection, id: rid, data: { ...base(rid), runId: run.id, itemId: id, date: today, done: true } })
        }
      }
      if (records.length) {
        // Same merge path as the app: last-write-wins per field, pushed to every device through Realtime.
        const { error } = await db.rpc('apply_records', { p_user: userId, p_records: records })
        if (error) throw new Error(error.message)
      }
      return J({ applied: records.length })
    }

    if (req.method !== 'GET') return J({ error: 'GET or POST' }, 405)
    return J(buildRemindersFeed(data, today))
  } catch (e) {
    console.error(e)
    return J({ error: 'Feed error' }, 500)
  }
})
