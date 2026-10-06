import { addDays, dateOf, diffDays, monthGrid, weekday, type DateStr } from '@/lib/dates'
import type { CheckIn, Lago } from '../types'

/* Pure Lago maths. Nothing here reads the clock or the store: pass `today` in. */

export const lagoEndDate = (l: Lago): DateStr => addDays(l.startedAt, l.lengthDays - 1)

/** Is the Lago scheduled on this date? Daily: every day. Weekdays: Mon to Fri. Weekly: the weekday it started on. */
export function dueOn(l: Lago, date: DateStr): boolean {
  if (date < l.startedAt || date > lagoEndDate(l)) return false
  if (l.endedAt && date > l.endedAt) return false
  const wd = weekday(date)
  if (l.frequency === 'weekdays') return wd >= 1 && wd <= 5
  if (l.frequency === 'weekly') return wd === weekday(l.startedAt)
  return true
}

/** 1-based calendar day of the experiment, clamped to its length. */
export function lagoDay(l: Lago, today: DateStr): number {
  return Math.max(1, Math.min(l.lengthDays, diffDays(l.startedAt, today) + 1))
}

export type LagoPhase = 'active' | 'finished' | 'ended'
export function lagoPhase(l: Lago, today: DateStr): LagoPhase {
  if (l.endedAt) return 'ended'
  return today > lagoEndDate(l) ? 'finished' : 'active'
}

/** One check in per day: when devices disagree the most recently written one wins. */
export function checkInsByDate(checkIns: CheckIn[], lagoId: string): Map<DateStr, CheckIn> {
  const m = new Map<DateStr, CheckIn>()
  for (const c of checkIns) {
    if (c.lagoId !== lagoId || c.deletedAt) continue
    const prev = m.get(c.date)
    if (!prev || c.updatedAt >= prev.updatedAt) m.set(c.date, c)
  }
  return m
}

/** Consecutive scheduled days checked in as done, counting back from today.
 *  A scheduled today that is not yet checked in does not break the streak; a missed or empty earlier day does. */
export function lagoStreak(l: Lago, byDate: Map<DateStr, CheckIn>, today: DateStr): number {
  let n = 0
  const last = today > lagoEndDate(l) ? lagoEndDate(l) : today
  for (let d = last; d >= l.startedAt; d = addDays(d, -1)) {
    if (!dueOn(l, d)) continue
    const c = byDate.get(d)
    if (c?.status === 'done') n++
    else if (d === today && !c) continue
    else break
  }
  return n
}

export interface LagoStats {
  day: number
  pct: number
  streak: number
  checkIns: number
  /** done / scheduled days so far, 0..1. Today counts only once it has been checked in. */
  score: number
  doneToday: boolean
  missedToday: boolean
  dueToday: boolean
  phase: LagoPhase
}

export function lagoStats(l: Lago, checkIns: CheckIn[], today: DateStr): LagoStats {
  const byDate = checkInsByDate(checkIns, l.id)
  const day = lagoDay(l, today)
  const end = lagoEndDate(l)
  const last = l.endedAt && l.endedAt < end ? l.endedAt : end
  let due = 0
  let done = 0
  for (let d = l.startedAt; d <= last && d <= today; d = addDays(d, 1)) {
    if (!dueOn(l, d)) continue
    const c = byDate.get(d)
    if (c?.status === 'done') done++
    if (d < today || c) due++
  }
  const t = byDate.get(today)
  return {
    day,
    pct: Math.min(1, day / l.lengthDays),
    streak: lagoStreak(l, byDate, today),
    checkIns: done,
    score: due ? done / due : 0,
    doneToday: t?.status === 'done',
    missedToday: t?.status === 'missed',
    dueToday: dueOn(l, today),
    phase: lagoPhase(l, today),
  }
}

export type CalCell = { day: number; date: DateStr; state: 'empty' | 'done' | 'missed' | 'future' | 'outside'; today: boolean } | null

/** Month grid for the Lago insights calendar. Leading nulls pad to the first weekday (Sunday first). */
export function lagoCalendar(l: Lago, checkIns: CheckIn[], year: number, month: number, today: DateStr): CalCell[] {
  const byDate = checkInsByDate(checkIns, l.id)
  const { offset, days } = monthGrid(year, month)
  const cells: CalCell[] = Array.from({ length: offset }, () => null)
  for (let d = 1; d <= days; d++) {
    const date = dateOf(year, month, d)
    const c = byDate.get(date)
    const state = date > today ? 'future' : c ? c.status : date < l.startedAt || date > lagoEndDate(l) ? 'outside' : 'empty'
    cells.push({ day: d, date, state, today: date === today })
  }
  return cells
}

/** "Complete a 30 day Lago": a Lago of 30+ days that has run its full length with a score of at least 80%. */
export function isLagoCompleted(l: Lago, checkIns: CheckIn[], today: DateStr): boolean {
  if (l.lengthDays < 30 || l.endedAt) return false
  const s = lagoStats(l, checkIns, today)
  const byDate = checkInsByDate(checkIns, l.id)
  const reachedEnd = today > lagoEndDate(l) || (today === lagoEndDate(l) && byDate.get(today)?.status === 'done')
  return reachedEnd && s.score >= 0.8
}
