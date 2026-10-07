// Web Push sender.
//   POST { action: 'test' }  (signed-in user)  -> one test notification to that user's devices
//   POST { action: 'cron' }  (x-cron-secret)   -> the per-minute tick, called by pg_cron
// The tick sends, in each user's own time zone: the daily check in at their reminder time, the evening review
// at their evening time, and milestones (last day of an Onda, last day of a Lago). push_log guarantees once per day.
import webpush from 'npm:web-push@3.6.7'
import { activeRunOf, addDays, buildRemindersFeed, clockIn, lagoDueOn, todayIn } from '../_shared/feeds.ts'
import { HttpError, admin, env, isCron, json, requireUser, serve } from '../_shared/http.ts'
import { loadFeedData, loadSettings } from '../_shared/records.ts'

interface Sub {
  endpoint: string
  p256dh: string
  auth: string
  user_id: string
  timezone: string
}
interface Payload {
  title: string
  body: string
  kind: 'daily' | 'evening' | 'milestone' | 'test'
  tag: string
  url?: string
  lagoId?: string
}

function configure() {
  webpush.setVapidDetails(env('VAPID_SUBJECT', 'mailto:hello@example.com'), env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'))
}

/** Send to every device of one user. Subscriptions the push service reports as gone are deleted. */
async function sendTo(db: ReturnType<typeof admin>, subs: Sub[], payload: Payload): Promise<number> {
  let ok = 0
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600, urgency: 'normal', topic: payload.tag })
      ok++
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
      else console.error('push failed', status, (e as Error).message)
    }
  }
  return ok
}

const minutes = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number)
  return h * 60 + m
}
/** True from the scheduled minute until ten minutes after it, so a late or skipped tick still delivers. */
const due = (now: string, at: string) => {
  const d = minutes(now) - minutes(at)
  return d >= 0 && d < 10
}

/** Claim today's send for (user, kind). Returns false if another tick already sent it. */
async function claim(db: ReturnType<typeof admin>, userId: string, kind: string, localDate: string): Promise<boolean> {
  const { error } = await db.from('push_log').insert({ user_id: userId, kind, local_date: localDate })
  return !error
}

async function tick(db: ReturnType<typeof admin>): Promise<number> {
  const { data: subs, error } = await db.from('push_subscriptions').select('endpoint, p256dh, auth, user_id, timezone')
  if (error) throw new HttpError(500, error.message)
  const byUser = new Map<string, Sub[]>()
  for (const s of (subs ?? []) as Sub[]) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s])

  let sent = 0
  for (const [userId, list] of byUser) {
    const settings = await loadSettings(db, userId)
    const tz = settings.timezone || list[0]!.timezone || 'UTC'
    const now = clockIn(tz)
    const today = todayIn(tz)
    const wantDaily = settings.notifDaily && due(now, settings.reminderTime)
    const wantEvening = settings.notifEvening && due(now, settings.eveningTime)
    if (!wantDaily && !wantEvening) continue // cheap exit for almost every user on almost every tick

    const data = await loadFeedData(db, userId)
    const feed = buildRemindersFeed(data, today)
    const run = activeRunOf(data)

    if (wantDaily && (await claim(db, userId, 'daily', today))) {
      const open = feed.items.filter((i) => !i.done && !i.id.startsWith('rule:'))
      if (open.length) {
        const first = open.find((i) => i.id.startsWith('lago:'))
        sent += await sendTo(db, list, {
          kind: 'daily',
          tag: 'daily',
          title: run?.snapshot ? `${run.snapshot.name} · Daily check in` : 'Daily check in',
          body: open.length === 1 ? open[0]!.title : `${open[0]!.title} and ${open.length - 1} more`,
          url: '',
          lagoId: first?.id.slice(5),
        })
      }
      if (settings.notifMilestones && (await claim(db, userId, 'milestone', today))) {
        const lastDay = (start: string, length: number) => addDays(start, length - 1) === today
        if (run?.snapshot && lastDay(run.startedAt, run.lengthDays)) {
          sent += await sendTo(db, list, { kind: 'milestone', tag: 'milestone', title: `Last day of ${run.snapshot.name}`, body: 'Your final reflection is ready.', url: '?tab=ondas' })
        } else {
          const lago = data.lagos.find((l) => lagoDueOn(l, today) && lastDay(l.startedAt, l.lengthDays))
          if (lago) sent += await sendTo(db, list, { kind: 'milestone', tag: 'milestone', title: `Last day: ${lago.name}`, body: `${lago.lengthDays} days. Check in to finish it.`, url: '?tab=lagos', lagoId: lago.id })
        }
      }
    }

    if (wantEvening && run?.snapshot && (await claim(db, userId, 'evening', today))) {
      sent += await sendTo(db, list, { kind: 'evening', tag: 'evening', title: 'Evening review', body: `A few lines on today's ${run.snapshot.name}.`, url: '?tab=ondas' })
    }
  }
  return sent
}

serve(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'POST only')
  const { action } = (await req.json().catch(() => ({}))) as { action?: string }
  configure()
  const db = admin()

  if (action === 'cron') {
    if (!isCron(req)) throw new HttpError(401, 'Bad cron secret')
    return json(req, { sent: await tick(db) })
  }
  if (action === 'test') {
    const user = await requireUser(req)
    const { data } = await db.from('push_subscriptions').select('endpoint, p256dh, auth, user_id, timezone').eq('user_id', user.id)
    const sent = await sendTo(db, (data ?? []) as Sub[], { kind: 'test', tag: 'test', title: 'Onda', body: 'Notifications are working.', url: '' })
    if (!sent) throw new HttpError(404, 'No subscribed device')
    return json(req, { sent })
  }
  throw new HttpError(400, 'Unknown action')
})
