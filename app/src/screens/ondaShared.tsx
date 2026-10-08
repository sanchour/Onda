import type { TFunction } from 'i18next'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { OndaContent, OndaIndex, Practice } from '@/content/schema'
import type { OndaLook } from '@/content/themes'
import { canBeginOnda, canCreateOnda, plusState } from '@/data/entitlement'
import { doneSet, runDay } from '@/data/derive/onda'
import { useActiveRun, useLook, useOnda, useOndaIndex, useSettings } from '@/data/hooks'
import { useStore } from '@/data/store'
import type { OndaRun } from '@/data/types'
import { now } from '@/lib/dates'
import { columnWidth, fitSize } from '@/lib/fit'
import { haptic } from '@/lib/haptics'
import type { MediaKind } from '@/content'
import { nav, useNav } from '@/nav/store'
import { Icon } from '@/ui/Icon'
import { OrnamentIcon } from './KindArt'
import o from './ondas.module.css'
import s from './screens.module.css'

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
      <span className={[o.pCircle, small ? o.pCircleSm : '', done ? o.pCircleOn : ''].join(' ')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <Icon name={p.icon} weight="fill" size={small ? 22 : 24} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span className={o.pName} style={{ display: 'block' }}>{p.name}</span>
        <span className={o.pMeta} style={{ display: 'block' }}>{p.meta}</span>
      </span>
    </button>
  )
}

/** Rules: numbered squircle cards that read like commandments. Done rules fill with the Onda's colour. */
export function RulesList({ rules, done, onToggle }: { rules: { id: string; text: string; why?: string }[]; done: Set<string>; onToggle: (id: string) => void }) {
  const { t } = useTranslation()
  if (!rules.length) return <div className={o.rulesCard} style={{ padding: '20px', textAlign: 'center', color: 'var(--label-secondary)' }}>{t('ondas.noRules')}</div>
  return (
    <div className={s.stack10} style={{ padding: '0 16px' }}>
      {rules.map((r, i) => {
        const on = done.has(r.id)
        return (
          <button key={r.id} type="button" role="checkbox" aria-checked={on} className={on ? `${o.rule} ${o.ruleOn}` : o.rule} onClick={() => { haptic(on ? 'select' : 'success'); onToggle(r.id) }}>
            <span className={o.ruleNum} aria-hidden>{on ? <Icon name="check" weight="bold" size={20} /> : i + 1}</span>
            <span className={o.ruleBody}>
              <span className={o.ruleText}>{r.text}</span>
              {r.why && <span className={o.ruleWhy}>{r.why}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Tasks: cards with an accent bar on the left, a time pill and a square checkbox. */
const GO_ICON: Record<string, string> = { journal: 'notebook', philosophy: 'lightbulb', read: 'book-open-text', watch: 'film-strip', listen: 'headphones', art: 'paint-brush', eat: 'bowl-food', drink: 'coffee', customs: 'hand-heart', games: 'game-controller', travel: 'map-trifold' }

export function TasksList({ tasks, done, onToggle, go }: { tasks: { id: string; name: string; meta: string; time?: string; action?: string }[]; done: Set<string>; onToggle: (id: string) => void; go?: boolean }) {
  const { t } = useTranslation()
  const { push } = useNav()
  const open = (a: string) => {
    if (a === 'journal') push({ name: 'journal' })
    else if (a === 'philosophy') push({ name: 'philosophy' })
    else push({ name: 'immersion', kind: a as MediaKind })
  }
  if (!tasks.length) return <div className={o.rulesCard} style={{ padding: '20px', textAlign: 'center', color: 'var(--label-secondary)' }}>{t('ondas.noTasks')}</div>
  return (
    <div className={s.stack10} style={{ padding: '0 16px' }}>
      {tasks.map((k) => {
        const on = done.has(k.id)
        return (
          <div key={k.id} className={on ? `${o.taskCard} ${o.taskOn}` : o.taskCard}>
          <button type="button" role="checkbox" aria-checked={on} className={o.task} onClick={() => { haptic(on ? 'select' : 'success'); onToggle(k.id) }}>
            <span className={o.taskBar} aria-hidden />
            <span className={o.taskBody}>
              <span className={on ? `${o.taskTitle} ${o.taskDone}` : o.taskTitle}>{k.name}</span>
              <span className={o.taskMeta}>
                {k.time && (
                  <span className={o.taskTime}>
                    <Icon name="clock" weight="bold" size={12} />
                    {k.time}
                  </span>
                )}
                <span>{k.meta}</span>
              </span>
            </span>
            <span className={on ? `${o.taskBox} ${o.taskBoxOn}` : o.taskBox} aria-hidden>
              <Icon name="check" weight="bold" size={16} />
            </span>
          </button>
          {go && k.action && (
            <button type="button" className={o.taskGo} onClick={() => open(k.action!)}>
              <Icon name={GO_ICON[k.action] ?? 'sparkle'} weight="fill" size={16} />
              <span>{t(`ondas.go.${k.action}`)}</span>
              <Icon name="caret-right" weight="bold" size={14} />
            </button>
          )}
          </div>
        )
      })}
    </div>
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

/** A themed header card for sheets and pages: the Onda's fill, glyph watermark, icon and display face. */
export function OndaBanner({ icon, kicker, title, sub }: { look?: OndaLook; icon: string; kicker?: string; title: string; sub?: string }) {
  return (
    <div className={`${o.sBanner} ${o.themed}`}>
      <span className={`${o.sBannerIcon} ${o.chipCircle}`}>
        <Icon name={icon} weight="fill" size={22} />
      </span>
      <span className={o.sBannerText}>
        {kicker && <span className={o.sBannerKicker}>{kicker}</span>}
        <span className={o.sBannerTitle}>{title}</span>
        {sub && <span className={o.sBannerSub}>{sub}</span>}
      </span>
    </div>
  )
}
