import type { TFunction } from 'i18next'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { OndaContent, OndaIndex, Practice } from '@/content/schema'
import type { OndaLook } from '@/content/themes'
import { canBeginOnda, canCreateOnda, plusState } from '@/data/entitlement'
import { doneSet, runDay } from '@/data/derive/onda'
import { useActiveRun, useLook, useOnda, useOndaIndex } from '@/data/hooks'
import { useStore } from '@/data/store'
import type { OndaRun } from '@/data/types'
import { now } from '@/lib/dates'
import { haptic } from '@/lib/haptics'
import { nav } from '@/nav/store'
import { CheckDot, StatusCircle } from '@/ui/controls'
import { Icon } from '@/ui/Icon'
import o from './ondas.module.css'

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

/** Faint glyph watermark in the corner of a themed card. */
export function Glyph({ look, opacity, right, top, bottom }: { look: OndaLook; opacity: number; right: number; top?: number; bottom?: number }) {
  if (!look.glyph) return null
  return (
    <span aria-hidden className={o.glyph} style={{ right, top, bottom, opacity, fontSize: `calc(var(--u) * ${look.glyphSize})` }}>
      {look.glyph}
    </span>
  )
}

/** One segment per day: past, today, still to come. */
export function DayBar({ day, length, strong }: { day: number; length: number; strong?: boolean }) {
  const { t } = useTranslation()
  return (
    <div className={strong ? `${o.dayBar} ${o.dayBarStrong}` : o.dayBar} role="img" aria-label={t('ondas.dayOf', { day, length })}>
      {Array.from({ length }, (_, i) => (
        <span key={i} className={i < day - 1 ? o.dPast : i === day - 1 ? o.dNow : undefined} />
      ))}
    </div>
  )
}

export function PracticeRow({ p, done, onToggle, small }: { p: Pick<Practice, 'id' | 'name' | 'icon' | 'meta'>; done: boolean; onToggle: () => void; small?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      className={small ? `${o.pRow} ${o.pRowSm}` : o.pRow}
      onClick={() => {
        haptic(done ? 'select' : 'success')
        onToggle()
      }}
    >
      <span className={[o.pCircle, small ? o.pCircleSm : '', done ? o.pCircleOn : ''].join(' ')} style={{ borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <Icon name={p.icon} weight="fill" size={small ? 22 : 24} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span className={o.pName} style={{ display: 'block' }}>{p.name}</span>
        <span className={o.pMeta} style={{ display: 'block' }}>{p.meta}</span>
      </span>
    </button>
  )
}

export function RulesList({ rules, done, onToggle }: { rules: { id: string; text: string }[]; done: Set<string>; onToggle: (id: string) => void }) {
  const { t } = useTranslation()
  if (!rules.length) return <div className={o.rulesCard} style={{ padding: '20px', textAlign: 'center', color: 'var(--label-secondary)' }}>{t('ondas.noRules')}</div>
  return (
    <div className={o.rulesCard}>
      {rules.map((r) => (
        <button key={r.id} type="button" role="checkbox" aria-checked={done.has(r.id)} className={o.ruleRow} onClick={() => { haptic('select'); onToggle(r.id) }}>
          <CheckDot on={done.has(r.id)} />
          <span>{r.text}</span>
        </button>
      ))}
    </div>
  )
}

export function TasksList({ tasks, done, onToggle }: { tasks: { id: string; name: string; meta: string }[]; done: Set<string>; onToggle: (id: string) => void }) {
  const { t } = useTranslation()
  if (!tasks.length) return <div className={o.rulesCard} style={{ padding: '20px', textAlign: 'center', color: 'var(--label-secondary)' }}>{t('ondas.noTasks')}</div>
  return (
    <div className={o.tasksCard}>
      {tasks.map((k) => (
        <button key={k.id} type="button" role="checkbox" aria-checked={done.has(k.id)} className={o.taskRow} onClick={() => { haptic('select'); onToggle(k.id) }}>
          <StatusCircle status={done.has(k.id) ? 'done' : 'todo'} />
          <span>
            <span className={done.has(k.id) ? `${o.taskName} ${o.taskDone}` : o.taskName} style={{ display: 'block' }}>{k.name}</span>
            <span className={o.pMeta} style={{ display: 'block', marginTop: 0 }}>{k.meta}</span>
          </span>
        </button>
      ))}
    </div>
  )
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
