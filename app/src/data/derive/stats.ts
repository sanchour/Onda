import { addDays, fromDateStr, toDateStr, type DateStr } from '@/lib/dates'
import type { CheckIn, JournalEntry, Lago, OndaRun, PracticeLog, Reflection } from '../types'
import { checkInsByDate, dueOn } from './lago'
import { runEndDate } from './onda'

export interface StatsInput {
  lagos: Lago[]
  checkIns: CheckIn[]
  runs: OndaRun[]
  practiceLogs: PracticeLog[]
  journal: JournalEntry[]
  reflections: Reflection[]
}
export type Range = 'week' | 'month' | 'all'

const live = <T extends { deletedAt?: number | null }>(x: T) => !x.deletedAt

export interface DayActivity {
  done: number
  due: number
}

/** Every day with something scheduled or done: Lago check ins plus Onda practices. */
export function activityByDate(s: StatsInput, today: DateStr): Map<DateStr, DayActivity> {
  const m = new Map<DateStr, DayActivity>()
  const at = (d: DateStr) => {
    let a = m.get(d)
    if (!a) m.set(d, (a = { done: 0, due: 0 }))
    return a
  }
  for (const l of s.lagos.filter(live)) {
    const by = checkInsByDate(s.checkIns, l.id)
    for (let d = l.startedAt; d <= today; d = addDays(d, 1)) {
      if (!dueOn(l, d)) {
        if (d > addDays(l.startedAt, l.lengthDays)) break
        continue
      }
      const a = at(d)
      a.due++
      if (by.get(d)?.status === 'done') a.done++
    }
  }
  const seen = new Set<string>()
  for (const r of s.runs.filter(live)) {
    const n = r.snapshot?.perDay ?? r.snapshot?.practices.length ?? 0
    const last = r.endedAt && r.endedAt < runEndDate(r) ? r.endedAt : runEndDate(r)
    for (let d = r.startedAt; d <= today && d <= last; d = addDays(d, 1)) at(d).due += n
  }
  for (const p of s.practiceLogs) {
    if (!p.done || !live(p) || p.date > today) continue
    const k = `${p.runId}:${p.practiceId}:${p.date}`
    if (seen.has(k)) continue
    seen.add(k)
    at(p.date).done++
  }
  return m
}

/** Longest run of consecutive days with at least one thing done. */
export function bestStreak(act: Map<DateStr, DayActivity>): number {
  const days = [...act.entries()].filter(([, a]) => a.done > 0).map(([d]) => d).sort()
  let best = 0
  let cur = 0
  let prev: DateStr | null = null
  for (const d of days) {
    cur = prev && addDays(prev, 1) === d ? cur + 1 : 1
    best = Math.max(best, cur)
    prev = d
  }
  return best
}

/** Consecutive days with something done, ending today (or yesterday if today is still open). */
export function currentStreak(act: Map<DateStr, DayActivity>, today: DateStr): number {
  let n = 0
  let d = (act.get(today)?.done ?? 0) > 0 ? today : addDays(today, -1)
  while ((act.get(d)?.done ?? 0) > 0) {
    n++
    d = addDays(d, -1)
  }
  return n
}

export function rangeStart(range: Range, today: DateStr, act: Map<DateStr, DayActivity>): DateStr {
  if (range === 'week') return addDays(today, -6)
  if (range === 'month') return addDays(today, -27)
  const first = [...act.keys()].sort()[0]
  return first ?? today
}

export interface Summary {
  checkIns: number
  streak: number
  completion: number
}
export function summarize(range: Range, act: Map<DateStr, DayActivity>, today: DateStr): Summary {
  const from = rangeStart(range, today, act)
  let done = 0
  let due = 0
  for (const [d, a] of act) {
    if (d < from || d > today) continue
    done += a.done
    // today only counts against completion once the day is over or fully done
    due += d === today ? Math.max(a.done, 0) : a.due
  }
  return { checkIns: done, streak: range === 'all' ? bestStreak(act) : currentStreak(act, today), completion: due ? Math.min(1, done / due) : 0 }
}

export interface Bar {
  label: string
  value: number
  current: boolean
}
const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Week: one bar per day (7). Month: one per week (4). All: one per month (last 6). */
export function activityBars(range: Range, act: Map<DateStr, DayActivity>, today: DateStr): Bar[] {
  const sum = (from: DateStr, to: DateStr) => {
    let n = 0
    for (let d = from; d <= to; d = addDays(d, 1)) n += act.get(d)?.done ?? 0
    return n
  }
  if (range === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, i - 6)
      return { label: WD[fromDateStr(d).getDay()]!, value: act.get(d)?.done ?? 0, current: i === 6 }
    })
  }
  if (range === 'month') {
    return Array.from({ length: 4 }, (_, i) => {
      const to = addDays(today, (i - 3) * 7)
      return { label: `W${i + 1}`, value: sum(addDays(to, -6), to), current: i === 3 }
    })
  }
  const t = fromDateStr(today)
  return Array.from({ length: 6 }, (_, i) => {
    const first = new Date(t.getFullYear(), t.getMonth() - (5 - i), 1)
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0)
    return { label: MON[first.getMonth()]!, value: sum(toDateStr(first), toDateStr(last)), current: i === 5 }
  })
}

export interface DayEvent {
  icon: string
  /** i18n key + params, resolved by the view */
  key: 'checkedIn' | 'missed' | 'practice' | 'journal' | 'ondaStarted' | 'ondaCompleted' | 'ondaEnded' | 'kept'
  name: string
  count?: number
  kind: 'lagos' | 'ondas' | 'journal'
  at: string | null
}

/** Everything logged on one day, newest first, for the History day sheet. */
export function dayEvents(date: DateStr, s: StatsInput): DayEvent[] {
  const out: DayEvent[] = []
  const lagos = new Map(s.lagos.map((l) => [l.id, l]))
  const runs = new Map(s.runs.map((r) => [r.id, r]))
  for (const l of s.lagos.filter(live)) {
    const c = checkInsByDate(s.checkIns, l.id).get(date)
    if (c) out.push({ icon: c.status === 'done' ? l.icon : 'x-circle', key: c.status === 'done' ? 'checkedIn' : 'missed', name: l.name, kind: 'lagos', at: c.at })
    if (l.origin.startsWith('onda:') && l.startedAt === date && lagos.has(l.id)) out.push({ icon: 'plus-circle', key: 'kept', name: l.name, kind: 'lagos', at: null })
  }
  const seen = new Set<string>()
  for (const p of s.practiceLogs) {
    if (p.date !== date || !p.done || !live(p) || seen.has(p.runId + p.practiceId)) continue
    seen.add(p.runId + p.practiceId)
    const snap = runs.get(p.runId)?.snapshot
    const pr = snap?.practices.find((x) => x.id === p.practiceId)
    // since 5.2 a day's practices also come from the Onda's tasks and its Immerse lists
    const other = pr ? undefined : (snap?.tasks.find((x) => x.id === p.practiceId)?.name ?? snap?.immerse.find((x) => `im-${x.id}` === p.practiceId)?.title)
    out.push({ icon: pr?.icon ?? 'sparkle', key: 'practice', name: pr?.name ?? other ?? '', kind: 'ondas', at: p.at ?? null })
  }
  for (const j of s.journal.filter(live)) {
    if (j.at.slice(0, 10) !== date && toDateStr(new Date(j.at)) !== date) continue
    out.push({ icon: 'notebook', key: 'journal', name: runs.get(j.runId)?.snapshot?.name ?? '', count: j.day, kind: 'journal', at: j.at })
  }
  for (const r of s.runs.filter(live)) {
    const name = r.snapshot?.name ?? ''
    if (r.startedAt === date) out.push({ icon: 'waves', key: 'ondaStarted', name, kind: 'ondas', at: null })
    if (r.endedAt === date) out.push({ icon: r.state === 'complete' ? 'flag-checkered' : 'stop-circle', key: r.state === 'complete' ? 'ondaCompleted' : 'ondaEnded', name, kind: 'ondas', at: null })
  }
  return out.sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))
}

/** Dates in a month that have at least one logged event. */
export function activeDates(s: StatsInput, act: Map<DateStr, DayActivity>): Set<DateStr> {
  const set = new Set<DateStr>()
  for (const [d, a] of act) if (a.done > 0) set.add(d)
  for (const c of s.checkIns) if (live(c)) set.add(c.date)
  for (const j of s.journal) if (live(j)) set.add(toDateStr(new Date(j.at)))
  for (const r of s.runs.filter(live)) {
    set.add(r.startedAt)
    if (r.endedAt) set.add(r.endedAt)
  }
  return set
}

export type ConsistencyTier = 'finding' | 'building' | 'steady' | 'lockedIn'
export interface Consistency {
  /** 0..1: the average share of what was scheduled that got done, over the last 28 days. */
  score: number
  /** score minus the previous 28 days, in points (-100..100). null until there is enough history. */
  delta: number | null
  tier: ConsistencyTier
  /** The last 14 days, oldest first. null = nothing scheduled that day. */
  days: (number | null)[]
}

/** Consistency: how reliably you do what you set out to do, not how much. A day counts as done / scheduled
 *  (capped at 1); days with nothing scheduled are ignored, and so is today until something is done, so a
 *  morning check does not drag the score down. Only days since your first activity count. */
export function consistency(act: Map<DateStr, DayActivity>, today: DateStr): Consistency {
  const first = [...act.keys()].sort()[0] ?? today
  const ratio = (d: DateStr): number | null => {
    const a = act.get(d)
    if (!a || a.due <= 0 || d < first) return null
    if (d === today && a.done === 0) return null
    return Math.min(1, a.done / a.due)
  }
  const window = (end: DateStr, n: number) => {
    const vals: number[] = []
    for (let i = 0; i < n; i++) {
      const r = ratio(addDays(end, -i))
      if (r !== null) vals.push(r)
    }
    return vals
  }
  const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length
  const now = window(today, 28)
  const before = window(addDays(today, -28), 28)
  const score = now.length ? mean(now) : 0
  return {
    score,
    delta: now.length >= 7 && before.length >= 7 ? Math.round((score - mean(before)) * 100) : null,
    tier: score < 0.4 ? 'finding' : score < 0.7 ? 'building' : score < 0.9 ? 'steady' : 'lockedIn',
    days: Array.from({ length: 14 }, (_, i) => ratio(addDays(today, i - 13))),
  }
}
