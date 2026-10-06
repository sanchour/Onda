import { addDays, diffDays, type DateStr } from '@/lib/dates'
import type { ImmerseLog, ItemLog, JournalEntry, OndaRun, PracticeLog } from '../types'

/** 1-based day of the run, clamped to its length. */
export function runDay(run: OndaRun, today: DateStr): number {
  return Math.max(1, Math.min(run.lengthDays, diffDays(run.startedAt, today) + 1))
}
export const runEndDate = (run: OndaRun): DateStr => addDays(run.startedAt, run.lengthDays - 1)
/** The final reflection opens on the last day. */
export const reflectionDue = (run: OndaRun, today: DateStr) => today >= runEndDate(run)

export const activeRun = (runs: OndaRun[]) => runs.find((r) => r.state === 'active' && !r.deletedAt)

const live = <T extends { deletedAt?: number | null }>(x: T) => !x.deletedAt

export function doneSet(logs: (PracticeLog | ItemLog)[], runId: string, date: DateStr, key: 'practiceId' | 'itemId'): Set<string> {
  const s = new Set<string>()
  for (const l of logs) {
    if (l.runId === runId && l.date === date && l.done && live(l)) s.add((l as unknown as Record<string, string>)[key]!)
  }
  return s
}

export function immerseSet(logs: ImmerseLog[], runId: string): Set<string> {
  const s = new Set<string>()
  for (const l of logs) if (l.runId === runId && l.doneAt && live(l)) s.add(l.itemId)
  return s
}

export interface RunSummary {
  practiceCheckIns: number
  practiceRate: number
  journalEntries: number
  /** days each practice was done, by practice id */
  perPractice: Record<string, number>
}

/** Totals for the reflection screen: how much of the Onda was actually lived. */
export function runSummary(run: OndaRun, practiceIds: string[], practiceLogs: PracticeLog[], journal: JournalEntry[], today: DateStr): RunSummary {
  const perPractice: Record<string, number> = Object.fromEntries(practiceIds.map((id) => [id, 0]))
  let n = 0
  for (const l of practiceLogs) {
    if (l.runId !== run.id || !l.done || !live(l)) continue
    n++
    if (l.practiceId in perPractice) perPractice[l.practiceId]!++
  }
  const days = runDay(run, today)
  const possible = days * practiceIds.length
  return {
    practiceCheckIns: n,
    practiceRate: possible ? Math.min(1, n / possible) : 0,
    journalEntries: journal.filter((j) => j.runId === run.id && live(j)).length,
    perPractice,
  }
}

/** Day-indexed pick that wraps: day 1 gets item 0. */
export function pickForDay<T>(items: T[], day: number): T | undefined {
  return items.length ? items[(Math.max(1, day) - 1) % items.length] : undefined
}
