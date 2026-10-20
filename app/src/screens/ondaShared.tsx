import type { TFunction } from 'i18next'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { OndaContent, OndaIndex } from '@/content/schema'
import type { OndaLook } from '@/content/themes'
import { canBeginOnda, canCreateOnda, plusState } from '@/data/entitlement'
import { doneSet, runDay } from '@/data/derive/onda'
import { useActiveRun, useLook, useOnda, useOndaIndex, useSettings } from '@/data/hooks'
import { useStore } from '@/data/store'
import type { OndaRun } from '@/data/types'
import { now } from '@/lib/dates'
import { columnWidth, fitSize } from '@/lib/fit'
import { haptic } from '@/lib/haptics'
import { nav } from '@/nav/store'
import { Icon } from '@/ui/Icon'
import { OrnamentIcon } from './KindArt'
import { CheckCircle, GroupedList } from './onda7'
import c from './onda7/onda7.module.css'
import o from './ondas.module.css'

export { PlanList, PracticeRow, type PracticeInfo } from './onda7'

export interface ActiveOnda {
  run: OndaRun
  index: OndaIndex | undefined
  content: OndaContent | undefined
  look: OndaLook
  day: number
}

/** The running Onda with its content and look, or undefined when none is running. */
export function useActiveOnda(): ActiveOnda | undefined {
  const run = useActiveRun()
  const today = useStore((s) => s.today)
  const index = useOndaIndex(run?.ondaId)
  const content = useOnda(run?.ondaId)
  const look = useLook(index)
  return useMemo(() => (run ? { run, index, content, look, day: runDay(run, today) } : undefined), [run, index, content, look, today])
}

export function guardBeginOnda(t: TFunction, ondaId: string): boolean {
  if (canBeginOnda(plusState(useStore.getState().user, now().getTime()), ondaId)) return true
  nav().showToast(t('paywall.gateOnda'), { icon: 'seal-check' })
  nav().push({ name: 'paywall' })
  return false
}
export function guardCreateOnda(t: TFunction): boolean {
  if (canCreateOnda(plusState(useStore.getState().user, now().getTime()))) return true
  nav().showToast(t('paywall.gateCustom'), { icon: 'seal-check' })
  nav().push({ name: 'paywall' })
  return false
}

/** Font size for an Onda's name so its longest word fits `inner` px (the column minus the card's own padding). */
export function nameSize(look: OndaLook, name: string, inner: number, max: number, min = 13): number {
  return fitSize(name, columnWidth() - inner, max, min, look.caps)
}

/** Faint glyph watermark in the corner of a themed card. */
export function Glyph({ look, opacity, right, top, bottom }: { look: OndaLook; opacity: number; right: number; top?: number; bottom?: number }) {
  if (!look.glyph) return null
  return (
    <span aria-hidden className={o.glyph} style={{ right, top, bottom, opacity, fontSize: `calc(var(--u) * ${look.glyphSize})` }}>
      {look.glyph}
    </span>
  )
}

/** A hairline, a small emblem of the tradition, a hairline. */
export function OrnDivider({ look, className }: { look: OndaLook; className?: string }) {
  return (
    <div className={className ?? o.orn} aria-hidden>
      <i />
      <OrnamentIcon name={look.ornament} size={22} />
      <i />
    </div>
  )
}

/** Rules as a grouped list: the number in the tradition's numerals, the rule and its reason, a trailing check. */
export function RulesList({ rules, done, onToggle, numeral = String }: { rules: { id: string; text: string; why?: string }[]; done: Set<string>; onToggle: (id: string) => void; numeral?: (n: number) => string }) {
  const { t } = useTranslation()
  if (!rules.length) return <GroupedList inset={16}><div className={c.row} style={{ justifyContent: 'center', color: 'var(--label-secondary)' }}>{t('ondas.noRules')}</div></GroupedList>
  return (
    <GroupedList label={t('onda.rules')}>
      {rules.map((r, i) => {
        const on = done.has(r.id)
        return (
          <button key={r.id} type="button" role="checkbox" aria-checked={on} className={c.row} onClick={() => { haptic(on ? 'select' : 'success'); onToggle(r.id) }}>
            <span className={`${c.lead} ${c.num}`} aria-hidden>{numeral(i + 1)}</span>
            <span className={c.text}>
              <span className={c.rTitle}>{r.text}</span>
              {r.why && <span className={`${c.rSub} ${c.clamp2}`}>{r.why}</span>}
            </span>
            <CheckCircle on={on} />
          </button>
        )
      })}
    </GroupedList>
  )
}

/** The running Onda's look as props for a wrapper element, so Lagos and Stats pick up its character (type, ornament, bar shapes). */
export function useOndaScope() {
  const active = useActiveOnda()
  const themed = useSettings().ondaThemes
  if (!active) return null
  return { look: active.look, themed, props: { style: active.look.vars, 'data-onda': themed ? active.run.ondaId : undefined } as { style: React.CSSProperties; 'data-onda'?: string } }
}

/** Today's done sets for a run. */
export function useRunToday(runId: string | undefined) {
  const today = useStore((s) => s.today)
  const practiceLogs = useStore((s) => s.practiceLogs)
  const ruleLogs = useStore((s) => s.ruleLogs)
  const taskLogs = useStore((s) => s.taskLogs)
  return useMemo(
    () => ({
      practices: runId ? doneSet(practiceLogs, runId, today, 'practiceId') : new Set<string>(),
      rules: runId ? doneSet(ruleLogs, runId, today, 'itemId') : new Set<string>(),
      tasks: runId ? doneSet(taskLogs, runId, today, 'itemId') : new Set<string>(),
    }),
    [runId, today, practiceLogs, ruleLogs, taskLogs],
  )
}

/** A compact cover for the top of sheets and pages: the Onda's material, a line icon and the display face.
 *  Reads --onda-* from the wrapper. */
export function OndaBanner({ icon, kicker, title, sub }: { look?: OndaLook; icon: string; kicker?: string; title: string; sub?: string }) {
  return (
    <div className={`${c.cover} ${c.banner}`}>
      <span className={c.bannerIcon} aria-hidden>
        <Icon name={icon} weight="regular" size={30} />
      </span>
      <span className={c.bannerText}>
        {kicker && <span className={c.kicker}>{kicker}</span>}
        <span className={c.title} style={{ fontSize: 'var(--fs-26)' }}>{title}</span>
        {sub && <span className={c.sub} style={{ marginTop: 2 }}>{sub}</span>}
      </span>
    </div>
  )
}
