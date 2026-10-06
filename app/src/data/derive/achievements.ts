import type { DateStr } from '@/lib/dates'
import type { CheckIn, ImmerseLog, JournalEntry, Lago, OndaRun, PracticeLog, Reflection } from '../types'
import { isLagoCompleted } from './lago'
import { activityByDate, bestStreak } from './stats'

export const ACHIEVEMENTS = [
  { key: 'firstStep', icon: 'footprints' },
  { key: 'sevenDays', icon: 'calendar-check' },
  { key: 'habitBuilder', icon: 'hammer' },
  { key: 'earlyBird', icon: 'sun-horizon' },
  { key: 'firstOnda', icon: 'waves' },
  { key: 'ondaComplete', icon: 'flag-checkered' },
  { key: 'wanderer', icon: 'compass' },
  { key: 'linguist', icon: 'translate' },
  { key: 'reflector', icon: 'notebook' },
  { key: 'tableGuest', icon: 'bowl-food' },
  { key: 'keeper', icon: 'heart' },
  { key: 'devoted', icon: 'medal' },
] as const
export type AchievementKey = (typeof ACHIEVEMENTS)[number]['key']

export interface AchievementInput {
  lagos: Lago[]
  checkIns: CheckIn[]
  runs: OndaRun[]
  practiceLogs: PracticeLog[]
  immerseLogs: ImmerseLog[]
  journal: JournalEntry[]
  reflections: Reflection[]
}

const live = <T extends { deletedAt?: number | null }>(x: T) => !x.deletedAt

/** Progress toward each achievement as [current, target]. Unlocked when current >= target. */
export function achievementProgress(s: AchievementInput, today: DateStr): Record<AchievementKey, [number, number]> {
  const doneCheckIns = s.checkIns.filter((c) => live(c) && c.status === 'done')
  const donePractices = s.practiceLogs.filter((p) => live(p) && p.done)
  const totalDone = doneCheckIns.length + donePractices.length
  const act = activityByDate({ ...s, reflections: s.reflections }, today)
  const early = [...doneCheckIns.map((c) => c.at), ...donePractices.map((p) => p.at)].filter((at): at is string => !!at && new Date(at).getHours() < 7).length
  const runs = s.runs.filter(live)
  const complete = runs.filter((r) => r.state === 'complete')
  const kindOf = new Map<string, string>()
  for (const r of runs) for (const it of r.snapshot?.immerse ?? []) kindOf.set(`${r.id}:${it.id}`, it.kind)
  const ondaOf = new Map(runs.map((r) => [r.id, r.ondaId]))
  const words = new Set<string>()
  const table = new Set<string>()
  for (const l of s.immerseLogs) {
    if (!live(l) || !l.doneAt) continue
    const kind = kindOf.get(`${l.runId}:${l.itemId}`)
    const k = `${ondaOf.get(l.runId)}:${l.itemId}`
    if (kind === 'words') words.add(k)
    if (kind === 'eat' || kind === 'drink') table.add(k)
  }
  return {
    firstStep: [Math.min(1, totalDone), 1],
    sevenDays: [Math.min(7, bestStreak(act)), 7],
    habitBuilder: [s.lagos.filter(live).some((l) => isLagoCompleted(l, s.checkIns, today)) ? 1 : 0, 1],
    earlyBird: [Math.min(5, early), 5],
    firstOnda: [Math.min(1, runs.length), 1],
    ondaComplete: [Math.min(1, complete.length), 1],
    wanderer: [Math.min(3, new Set(complete.map((r) => r.ondaId)).size), 3],
    linguist: [Math.min(25, words.size), 25],
    reflector: [Math.min(10, s.journal.filter(live).length), 10],
    tableGuest: [Math.min(5, table.size), 5],
    keeper: [Math.min(3, s.reflections.filter(live).reduce((n, r) => n + r.kept.length, 0)), 3],
    devoted: [Math.min(100, totalDone), 100],
  }
}

export function earnedAchievements(s: AchievementInput, today: DateStr): AchievementKey[] {
  const p = achievementProgress(s, today)
  return ACHIEVEMENTS.map((a) => a.key).filter((k) => p[k][0] >= p[k][1])
}
