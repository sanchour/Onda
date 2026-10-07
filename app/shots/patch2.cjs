const fs = require('fs')
const edit = (f, fn) => { const t = fs.readFileSync(f, 'utf8'); const r = fn(t); if (r === t) console.log('NO CHANGE', f); fs.writeFileSync(f, r) }
const must = (t, a, b) => { if (!t.includes(a)) throw new Error('missing: ' + a.slice(0, 70)); return t.replace(a, b) }

edit('src/data/derive/stats.ts', (t) => t + `
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
`)

edit('src/screens/StatsTab.tsx', (t) => {
  t = must(t, "import { activeDates, activityBars, activityByDate, summarize, type Range } from '@/data/derive/stats'", "import { activeDates, activityBars, activityByDate, consistency, summarize, type Range } from '@/data/derive/stats'")
  t = must(t, "import { GlassButton } from '@/ui/buttons'", "import { GlassButton } from '@/ui/buttons'\nimport { ProgressRing } from '@/ui/data'")
  t = must(t, "  const bars = useMemo(", "  const cons = useMemo(() => consistency(act, today), [act, today])\n  const bars = useMemo(")
  t = must(t, "      <SectionToggle title={t('stats.activity')}", fs.readFileSync('shots/cons-ui.txt', 'utf8') + "\n      <SectionToggle title={t('stats.activity')}")
  return t
})
edit('src/screens/more.module.css', (t) => t + fs.readFileSync('shots/cons.css', 'utf8'))
edit('src/i18n/en.ts', (t) => must(t, "    noteWeek:", "    consistency: 'Consistency', consistencyNote: 'How reliably you do what you set out to do, over the last four weeks.', consistencyTrendUp: '{{count}} points up on the four weeks before', consistencyTrendDown: '{{count}} points down on the four weeks before', consistencyTrendFlat: 'Level with the four weeks before', consistencyNew: 'Keep going: a trend appears after a week or two', tierFinding: 'Finding rhythm', tierBuilding: 'Building', tierSteady: 'Steady', tierLockedIn: 'Locked in', consistencyAria: 'Consistency {{pct}} percent, {{tier}}', last14: 'Last 14 days',\n    noteWeek:"))
console.log('patched')
