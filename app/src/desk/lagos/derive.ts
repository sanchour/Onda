import { checkInsByDate, dueOn, lagoEndDate, lagoStats, type LagoStats } from '@/data/derive/lago'
import type { CheckIn, Lago } from '@/data/types'
import { addDays, type DateStr } from '@/lib/dates'

/* The desktop's extra readings of the same Lago maths (data/derive/lago.ts): what each day looked like, the best
   streak, week by week completion and the usual time. Pure, like the phone's: pass `today` in. */

/** done / missed: a check in that day. open: scheduled, gone by, nothing logged. today: scheduled today, not logged yet.
 *  rest: inside the Lago but not scheduled (weekdays, weekly). outside: before it began, after it ended, or still to come. */
export type DayState = 'done' | 'missed' | 'open' | 'today' | 'rest' | 'outside'

export function dayState(l: Lago, byDate: Map<DateStr, CheckIn>, date: DateStr, today: DateStr): DayState {
  if (date > today) return 'outside'
  const c = byDate.get(date)
  if (c) return c.status
  if (date < l.startedAt || date > lagoEndDate(l) || (l.endedAt && date > l.endedAt)) return 'outside'
  if (!dueOn(l, date)) return 'rest'
  return date === today ? 'today' : 'open'
}

export interface Day {
  date: DateStr
  state: DayState
}

/** The `n` days ending on `last`, oldest first. */
export function lagoDays(l: Lago, byDate: Map<DateStr, CheckIn>, last: DateStr, n: number, today: DateStr): Day[] {
  return Array.from({ length: n }, (_, i) => {
    const date = addDays(last, i - (n - 1))
    return { date, state: dayState(l, byDate, date, today) }
  })
}

/** The last day that counts: today, or the day the Lago ended or finished if that came first. */
const lastDay = (l: Lago, today: DateStr) => [today, lagoEndDate(l), l.endedAt ?? today].sort()[0]!

/** The longest run of scheduled days checked in as done. Today left open does not break it, as in lagoStreak. */
export function bestStreak(l: Lago, byDate: Map<DateStr, CheckIn>, today: DateStr): number {
  let best = 0
  let cur = 0
  for (let d = l.startedAt; d <= lastDay(l, today); d = addDays(d, 1)) {
    if (!dueOn(l, d)) continue
    const c = byDate.get(d)
    if (c?.status === 'done') best = Math.max(best, ++cur)
    else if (!(d === today && !c)) cur = 0
  }
  return best
}

export interface WeekBlock {
  n: number
  done: number
  /** Scheduled days so far; today counts once it is logged, the same rule as the Lago's score. */
  due: number
  current: boolean
}

/** Completion for each seven days of the Lago, from its first day up to today. */
export function weekBlocks(l: Lago, byDate: Map<DateStr, CheckIn>, today: DateStr): WeekBlock[] {
  const out: WeekBlock[] = []
  const last = lastDay(l, today)
  for (let from = l.startedAt, n = 1; from <= last; from = addDays(from, 7), n++) {
    let done = 0
    let due = 0
    const to = addDays(from, 6)
    for (let d = from; d <= to && d <= last; d = addDays(d, 1)) {
      if (!dueOn(l, d)) continue
      const c = byDate.get(d)
      if (c?.status === 'done') done++
      if (d < today || c) due++
    }
    out.push({ n, done, due, current: today >= from && today <= to })
  }
  return out
}

/** The middle of the times you checked in as done, as minutes after midnight, or null with nothing to go on. */
export function usualMinutes(byDate: Map<DateStr, CheckIn>): number | null {
  const mins = [...byDate.values()]
    .filter((c) => c.status === 'done' && c.at)
    .map((c) => {
      const d = new Date(c.at)
      return d.getHours() * 60 + d.getMinutes()
    })
    .sort((a, b) => a - b)
  if (mins.length < 3) return null
  return mins[Math.floor(mins.length / 2)]!
}

export type Group = 'todo' | 'checked' | 'notToday' | 'finished'
export interface LagoRowData {
  lago: Lago
  st: LagoStats
  byDate: Map<DateStr, CheckIn>
  group: Group | null
}

/** Every Lago with its stats and section, newest first, as the phone sorts them. Ended Lagos have no section. */
export function lagoRows(lagos: Lago[], checkIns: CheckIn[], today: DateStr): LagoRowData[] {
  return lagos
    .map((lago) => {
      const st = lagoStats(lago, checkIns, today)
      const group: Group | null =
        st.phase === 'finished' ? 'finished' : st.phase !== 'active' ? null : st.doneToday || st.missedToday ? 'checked' : st.dueToday ? 'todo' : 'notToday'
      return { lago, st, byDate: checkInsByDate(checkIns, lago.id), group }
    })
    .sort((a, b) => b.lago.startedAt.localeCompare(a.lago.startedAt) || b.lago.updatedAt - a.lago.updatedAt)
}

/** Across the Lagos: done and scheduled over the seven days ending today (today only once it is logged). */
export function weekTotals(rows: LagoRowData[], today: DateStr): { done: number; due: number } {
  let done = 0
  let due = 0
  for (const r of rows) {
    if (!r.group) continue
    for (let i = 6; i >= 0; i--) {
      const d = addDays(today, -i)
      const s = dayState(r.lago, r.byDate, d, today)
      if (s === 'done') done++
      if (s === 'done' || s === 'missed' || s === 'open') due++
    }
  }
  return { done, due }
}
