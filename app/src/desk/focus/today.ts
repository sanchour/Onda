import { useMemo } from 'react'
import type { OndaContent } from '@/content/schema'
import { planForDay, type DayPractice } from '@/data/derive/plan'
import { useSettings } from '@/data/hooks'
import { useActiveOnda, useRunToday, type ActiveOnda } from '@/screens/ondaShared'
import type { FocusSession } from '../store'

/* Today's practices of the running Onda, derived exactly as the Ondas tab does, for the palette, the f key and Focus. */

export interface TodayPlan {
  active: ActiveOnda
  plan: DayPractice[]
  done: Set<string>
}

/** The day's plan; until the content file has loaded, the run's own snapshot keeps it from being empty (as on the phone). */
export function planOf(active: ActiveOnda, includeFood: boolean): DayPractice[] {
  const { content, day, run } = active
  return content
    ? planForDay(content, day, { includeFood })
    : (run.snapshot?.practices ?? []).slice(0, 4).map((p) => ({ id: p.id, kind: 'practice', name: p.name, icon: p.icon, meta: p.time, slot: 'Morning', time: p.time }))
}

export function useTodayPlan(): TodayPlan | undefined {
  const active = useActiveOnda()
  const includeFood = useSettings().includeFood
  const done = useRunToday(active?.run.id).practices
  return useMemo(() => (active ? { active, plan: planOf(active, includeFood), done } : undefined), [active, includeFood, done])
}

/** The first practice of the day, in plan order, that is not ticked yet. */
export const nextUndone = (plan: DayPractice[], done: Set<string>) => plan.find((p) => !done.has(p.id))

/** How long a practice takes: the minutes in its meta line ("Morning · 5 min"), else what the content says, else ten. */
export function practiceMinutes(p: Pick<DayPractice, 'id' | 'meta'>, content?: OndaContent): number {
  const m = /(\d+)\s*min/i.exec(p.meta)
  const fromContent = content?.practices.find((x) => x.id === p.id)?.minutes ?? content?.immersePlan.find((x) => `im-${x.item}` === p.id)?.minutes
  const n = m ? Number(m[1]) : fromContent ?? 10
  return Math.max(1, Math.min(180, n))
}

/** The name a practice is shown under: legacy Immerse rows read "Watch: title". */
export const practiceTitle = (p: DayPractice, lead: (kind: string) => string) => (p.lead ? `${lead(p.lead)}: ${p.name}` : p.name)

export function focusFor(runId: string, p: DayPractice, name: string, content?: OndaContent): FocusSession {
  return { runId, practiceId: p.id, name, minutes: practiceMinutes(p, content) }
}
