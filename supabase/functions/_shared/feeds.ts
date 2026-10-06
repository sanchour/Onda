/* Calendar (ICS) and Reminders (JSON) feed builders.
   Pure TypeScript with no Deno or browser APIs: the Edge Functions import it, and so does the app
   (for the offline ".ics" export and for unit tests). Keep it dependency-free. */

export interface FeedLago {
  id: string
  name: string
  lengthDays: number
  frequency: 'daily' | 'weekdays' | 'weekly'
  startedAt: string
  endedAt?: string | null
  reminder: { on: boolean; time: string }
  deletedAt?: number | null
}
export interface FeedRun {
  id: string
  ondaId: string
  lengthDays: number
  startedAt: string
  endedAt?: string | null
  state: 'active' | 'complete' | 'ended'
  deletedAt?: number | null
  snapshot?: {
    name: string
    practices: { id: string; name: string; time: string; minutes?: number }[]
    rules: { id: string; text: string }[]
    tasks: { id: string; name: string; time: string }[]
    immerse: { id: string; kind: string; title: string }[]
  }
}
export interface FeedLog {
  id: string
  date: string
  done?: boolean
  status?: 'done' | 'missed'
  lagoId?: string
  runId?: string
  practiceId?: string
  itemId?: string
  deletedAt?: number | null
}
export interface FeedData {
  lagos: FeedLago[]
  runs: FeedRun[]
  checkIns: FeedLog[]
  practiceLogs: FeedLog[]
  ruleLogs: FeedLog[]
  taskLogs: FeedLog[]
}

/* ── Dates (plain YYYY-MM-DD strings, no time zone maths) ── */
const p2 = (n: number) => (n < 10 ? '0' : '') + n
const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1))
}
const fmt = (d: Date) => `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`
export const addDays = (s: string, n: number) => fmt(new Date(parse(s).getTime() + n * 86400000))
export const diffDays = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000)
const weekday = (s: string) => parse(s).getUTCDay()

/** Today's date in a given IANA time zone. */
export function todayIn(timeZone: string, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  } catch {
    return now.toISOString().slice(0, 10)
  }
}
/** Current wall-clock "HH:MM" in a given IANA time zone. */
export function clockIn(timeZone: string, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(now).replace(/^24/, '00')
  } catch {
    return now.toISOString().slice(11, 16)
  }
}

const lagoEnd = (l: FeedLago) => {
  const end = addDays(l.startedAt, l.lengthDays - 1)
  return l.endedAt && l.endedAt < end ? l.endedAt : end
}
export function lagoDueOn(l: FeedLago, date: string): boolean {
  if (l.deletedAt || date < l.startedAt || date > lagoEnd(l)) return false
  const wd = weekday(date)
  if (l.frequency === 'weekdays') return wd >= 1 && wd <= 5
  if (l.frequency === 'weekly') return wd === weekday(l.startedAt)
  return true
}
const runEnd = (r: FeedRun) => addDays(r.startedAt, r.lengthDays - 1)
export const activeRunOf = (d: FeedData) => d.runs.find((r) => r.state === 'active' && !r.deletedAt)

/* ── ICS ───────────────────────────────────────────────────── */
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
/** Fold a content line at 75 octets, as RFC 5545 requires. */
export function fold(line: string): string {
  const enc = new TextEncoder()
  if (enc.encode(line).length <= 75) return line
  const out: string[] = []
  let cur = ''
  let bytes = 0
  for (const ch of line) {
    const n = enc.encode(ch).length
    if (bytes + n > (out.length ? 74 : 75)) {
      out.push(cur)
      cur = ''
      bytes = 0
    }
    cur += ch
    bytes += n
  }
  if (cur) out.push(cur)
  return out.join('\r\n ')
}
const ymd = (s: string) => s.replace(/-/g, '')
const hms = (t: string) => `${t.replace(':', '')}00`
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

interface Vevent {
  uid: string
  summary: string
  description?: string
  /** all-day when `time` is omitted */
  date: string
  time?: string
  minutes?: number
  rrule?: string
  alarm?: boolean
}

function vevent(e: Vevent, dtstamp: string): string[] {
  const lines = ['BEGIN:VEVENT', `UID:${e.uid}@onda`, `DTSTAMP:${dtstamp}`]
  if (e.time) {
    // Floating local time: 07:00 stays 07:00 wherever the phone is, which is what a habit wants.
    lines.push(`DTSTART:${ymd(e.date)}T${hms(e.time)}`, `DURATION:PT${Math.max(5, e.minutes ?? 15)}M`)
  } else {
    lines.push(`DTSTART;VALUE=DATE:${ymd(e.date)}`, `DTEND;VALUE=DATE:${ymd(addDays(e.date, 1))}`)
  }
  if (e.rrule) lines.push(`RRULE:${e.rrule}`)
  lines.push(`SUMMARY:${esc(e.summary)}`)
  if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`)
  lines.push('TRANSP:TRANSPARENT')
  if (e.alarm) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.summary)}`, 'TRIGGER:PT0M', 'END:VALARM')
  lines.push('END:VEVENT')
  return lines
}

const IMMERSE_KINDS = ['read', 'listen', 'watch', 'eat', 'words']
const pickForDay = <T>(items: T[], day: number) => (items.length ? items[(day - 1) % items.length] : undefined)

/** A subscribable calendar: Onda practices at their times, a daily immersion note, the reflection day, and Lago reminders. */
export function buildIcs(data: FeedData, opts: { now?: Date; name?: string } = {}): string {
  const now = opts.now ?? new Date()
  const dtstamp = stamp(now)
  const events: Vevent[] = []

  const run = activeRunOf(data)
  if (run?.snapshot) {
    const s = run.snapshot
    const until = `${ymd(runEnd(run))}T235959`
    for (const p of s.practices) {
      events.push({ uid: `practice-${run.id}-${p.id}`, summary: p.name, description: `${s.name} · Onda practice`, date: run.startedAt, time: p.time, minutes: p.minutes, rrule: `FREQ=DAILY;UNTIL=${until}`, alarm: true })
    }
    for (const t of s.tasks) {
      events.push({ uid: `task-${run.id}-${t.id}`, summary: t.name, description: `${s.name} · Onda task`, date: run.startedAt, time: t.time, minutes: 20, rrule: `FREQ=DAILY;UNTIL=${until}` })
    }
    for (let day = 1; day <= run.lengthDays; day++) {
      const picks = IMMERSE_KINDS.map((k) => pickForDay(s.immerse.filter((m) => m.kind === k), day)).filter((m): m is NonNullable<typeof m> => !!m)
      if (!picks.length) continue
      events.push({
        uid: `immerse-${run.id}-${day}`,
        summary: `${s.name} · Day ${day} of ${run.lengthDays}`,
        description: ['Immerse today:', ...picks.map((m) => `${m.kind[0]!.toUpperCase()}${m.kind.slice(1)}: ${m.title}`)].join('\n'),
        date: addDays(run.startedAt, day - 1),
      })
    }
    events.push({ uid: `reflection-${run.id}`, summary: `Final reflection · ${s.name}`, description: 'Look back, then choose which practices to carry forward as Lagos.', date: runEnd(run), time: '20:00', minutes: 30, alarm: true })
  }

  for (const l of data.lagos) {
    if (l.deletedAt || !l.reminder.on) continue
    const end = lagoEnd(l)
    if (end < addDays(todayOf(now), -1)) continue
    const until = `${ymd(end)}T235959`
    const rrule = l.frequency === 'daily' ? `FREQ=DAILY;UNTIL=${until}` : l.frequency === 'weekdays' ? `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=${until}` : `FREQ=WEEKLY;UNTIL=${until}`
    // Weekday Lagos that begin on a weekend start on the following Monday.
    let start = l.startedAt
    while (!lagoDueOn(l, start) && start <= end) start = addDays(start, 1)
    if (start > end) continue
    events.push({ uid: `lago-${l.id}`, summary: l.name, description: `Lago · ${l.lengthDays} days`, date: start, time: l.reminder.time, minutes: 10, rrule, alarm: true })
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Onda//Onda PWA//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(opts.name ?? 'Onda')}`,
    'X-WR-CALDESC:Onda practices\\, immersion and Lago reminders',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
    ...events.flatMap((e) => vevent(e, dtstamp)),
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}
const todayOf = (now: Date) => now.toISOString().slice(0, 10)

/* ── Reminders feed (read by the Shortcut) ─────────────────── */
export interface ReminderItem {
  /** Stable id: "lago:<id>", "practice:<id>", "rule:<id>" or "task:<id>" */
  id: string
  title: string
  notes: string
  /** "HH:MM" local, when the item has a time */
  due: string | null
  done: boolean
}
export interface RemindersFeed {
  version: 1
  date: string
  list: 'Onda'
  items: ReminderItem[]
}

const live = (x: { deletedAt?: number | null }) => !x.deletedAt

/** Everything due today: Lagos, then the running Onda's practices, tasks and rules. */
export function buildRemindersFeed(data: FeedData, today: string): RemindersFeed {
  const items: ReminderItem[] = []
  for (const l of data.lagos) {
    if (!lagoDueOn(l, today)) continue
    const c = data.checkIns.filter((x) => live(x) && x.lagoId === l.id && x.date === today).pop()
    items.push({ id: `lago:${l.id}`, title: l.name, notes: `Lago · Day ${Math.min(l.lengthDays, diffDays(l.startedAt, today) + 1)} of ${l.lengthDays}`, due: l.reminder.on ? l.reminder.time : null, done: c?.status === 'done' })
  }
  const run = activeRunOf(data)
  if (run?.snapshot && today >= run.startedAt && today <= runEnd(run)) {
    const s = run.snapshot
    const has = (logs: FeedLog[], key: 'practiceId' | 'itemId', id: string) => logs.some((x) => live(x) && x.runId === run.id && x.date === today && x[key] === id && x.done)
    for (const p of s.practices) items.push({ id: `practice:${p.id}`, title: p.name, notes: `${s.name} · Practice`, due: p.time, done: has(data.practiceLogs, 'practiceId', p.id) })
    for (const t of s.tasks) items.push({ id: `task:${t.id}`, title: t.name, notes: `${s.name} · Task`, due: t.time, done: has(data.taskLogs, 'itemId', t.id) })
    for (const r of s.rules) items.push({ id: `rule:${r.id}`, title: r.text, notes: `${s.name} · Rule`, due: null, done: has(data.ruleLogs, 'itemId', r.id) })
  }
  return { version: 1, date: today, list: 'Onda', items }
}
