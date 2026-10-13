import type { TFunction } from 'i18next'
import { useMemo, useRef } from 'react'
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
import type { DayPractice } from '@/data/derive/plan'
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

/** Where a practice row lives, so that holding it can offer "How to do this" in that Onda's look. */
export interface PracticeInfo {
  ondaId: string
  style?: React.CSSProperties
  /** The Onda id when themes are on. */
  onda?: string
}

/** Tap ticks the practice. Holding it (or a right click) opens a small menu with "How to do this". */
export function PracticeRow({ p, done, onToggle, small, info, twist, note, open }: { p: Pick<Practice, 'id' | 'name' | 'icon' | 'meta'>; done: boolean; onToggle: () => void; small?: boolean; info?: PracticeInfo; twist?: string; note?: string; open?: { label: string; icon: string; onClick: () => void; holdOnly?: boolean } }) {
  const { t } = useTranslation()
  const ref = useRef<HTMLButtonElement>(null)
  const press = useRef<{ timer?: ReturnType<typeof setTimeout>; fired: boolean; x: number; y: number }>({ fired: false, x: 0, y: 0 })
  const cancel = () => clearTimeout(press.current.timer)
  const openHow = () => {
    if ((!info && !open) || !ref.current) return
    haptic('impact')
    const r = ref.current.getBoundingClientRect()
    nav().openMenu({
      anchor: { top: r.top, bottom: r.bottom, left: r.left + 12, right: r.right },
      width: 264,
      dim: true,
      scope: info ? { style: info.style, onda: info.onda } : undefined,
      items: [
        ...(info ? [{ label: t('onda.howTo'), icon: 'info', onClick: () => nav().openSheet({ name: 'practiceInfo', ondaId: info.ondaId, practiceId: p.id, twist }) }] : []),
        ...(open ? [open] : []),
      ],
    })
  }
  const held = !!info || !!open
  return (
    <div className={o.pWrap}>
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-haspopup={held ? 'menu' : undefined}
      className={[o.pRow, small ? o.pRowSm : '', open && !open.holdOnly ? o.pRowOpen : ''].join(' ')}
      onPointerDown={(e) => {
        if (!held) return
        const st = press.current
        st.fired = false
        st.x = e.clientX
        st.y = e.clientY
        cancel()
        st.timer = setTimeout(() => {
          st.fired = true
          openHow()
        }, 450)
      }}
      onPointerMove={(e) => {
        if (Math.abs(e.clientX - press.current.x) + Math.abs(e.clientY - press.current.y) > 10) cancel()
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => {
        if (!held) return
        e.preventDefault()
        cancel()
        // a touch hold has already opened the menu by the time the browser reports it
        if (!press.current.fired) openHow()
      }}
      onKeyDown={(e) => {
        if (held && (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10'))) {
          e.preventDefault()
          openHow()
        }
      }}
      onClick={() => {
        // the release that ends a hold opened the menu; it does not also tick the practice
        if (press.current.fired) {
          press.current.fired = false
          return
        }
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
        {twist && <span className={o.pTwist} style={{ display: 'block' }}>{t('plan.today', { text: twist })}</span>}
        {note && <span className={o.pNote} style={{ display: 'block' }}>{note}</span>}
      </span>
    </button>
    {open && !open.holdOnly && (
      <button type="button" className={o.pOpen} aria-label={`${open.label}: ${p.name}`} onClick={open.onClick}>
        <Icon name={open.icon} weight="bold" size={18} />
      </button>
    )}
    </div>
  )
}

/** The day's practices (see data/derive/plan.ts). Tap ticks one. A practice with a how-to opens it on a hold; one about a book,
 *  a film or a dish also has a button that opens it. `runId` is set for a running Onda: only then can a row open the Journal or a list. */
export function PlanList({ plan, done, onToggle, small, info, runId }: { plan: DayPractice[]; done: Set<string>; onToggle: (id: string) => void; small?: boolean; info: PracticeInfo; runId?: string }) {
  const { t } = useTranslation()
  const open = (p: DayPractice) => {
    if (p.item) return { holdOnly: true, label: t('plan.open'), icon: 'arrow-up-right', onClick: () => nav().openSheet({ name: 'mediaInfo', item: p.item!, ondaId: info.ondaId, runId, note: p.note }) }
    if (!p.action || !runId) return undefined
    const a = p.action
    return { label: t(`ondas.go.${a}`), icon: 'caret-right', onClick: () => (a === 'journal' ? nav().push({ name: 'journal' }) : a === 'philosophy' ? nav().push({ name: 'philosophy' }) : nav().push({ name: 'immersion', kind: a as MediaKind })) }
  }
  return (
    <>
      {plan.map((p) => (
        <PracticeRow
          key={p.id}
          small={small}
          p={{ id: p.id, icon: p.icon, name: p.lead ? `${t(`plan.lead.${p.lead}`)}: ${p.name}` : p.name, meta: p.kind === 'immerse' && p.item ? [t('plan.immerse'), p.meta].filter(Boolean).join(' · ') : p.meta }}
          twist={p.twist}
          note={p.item ? undefined : p.note}
          done={done.has(p.id)}
          onToggle={() => onToggle(p.id)}
          info={p.practiceId ? info : undefined}
          open={open(p)}
        />
      ))}
    </>
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
