import { useRef, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { MediaKind } from '@/content'
import type { Ornament } from '@/content/themeKit'
import type { Practice } from '@/content/schema'
import type { DayPractice } from '@/data/derive/plan'
import { haptic } from '@/lib/haptics'
import { nav } from '@/nav/store'
import { Icon } from '@/ui/Icon'
import { OrnamentIcon } from '../KindArt'
import { CheckCircle, GroupedList } from './lists'
import c from './onda7.module.css'

/** Where a practice row lives, so that holding it can offer "How to do this" in that Onda's look. */
export interface PracticeInfo {
  ondaId: string
  style?: CSSProperties
  /** The Onda id when themes are on. */
  onda?: string
}

export interface PracticeOpen {
  label: string
  icon: string
  onClick: () => void
  /** Offered only in the hold menu, with no button on the row. */
  holdOnly?: boolean
}

/** One practice in a grouped list. Tap ticks it (the row is the checkbox; its name is the practice name).
 *  Holding it, a right click or the context menu key opens a small menu with "How to do this". */
export function PracticeRow({ p, done, onToggle, info, twist, note, open, burst }: { p: Pick<Practice, 'id' | 'name' | 'icon' | 'meta'>; done: boolean; onToggle: () => void; info?: PracticeInfo; twist?: string; note?: string; open?: PracticeOpen; burst?: React.ReactNode }) {
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
  const button = !!open && !open.holdOnly
  return (
    <div>
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-haspopup={held ? 'menu' : undefined}
        className={button ? `${c.row} ${c.pOpenRow}` : c.row}
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
        <span className={c.lead} aria-hidden>
          <Icon name={p.icon} weight="regular" size={22} />
        </span>
        <span className={c.text}>
          <span className={c.rTitle}>{p.name}</span>
          {p.meta && <span className={c.rSub}>{p.meta}</span>}
          {twist && <span className={c.rTwist}>{t('plan.today', { text: twist })}</span>}
          {note && <span className={c.rNote}>{note}</span>}
        </span>
        <CheckCircle on={done} burst={burst} />
      </button>
      {button && (
        <button type="button" className={c.pOpen} aria-label={`${open.label}: ${p.name}`} onClick={open.onClick}>
          <Icon name={open.icon} weight="regular" size={20} />
        </button>
      )}
    </div>
  )
}

const SLOT_ORDER = ['Immerse', 'Morning', 'Afternoon', 'Evening', 'Special'] as const

/** The day's practices (see data/derive/plan.ts) as grouped lists, one per time of day, in plan order (Immerse first).
 *  A practice with a how-to opens it on a hold; one about a book, a film or a dish also opens the piece from the hold menu.
 *  `runId` is set for a running Onda: only then can a row open the Journal, Philosophy or the Immersion list. */
export function PlanList({ plan, done, onToggle, info, runId, footer, ornament }: { plan: DayPractice[]; done: Set<string>; onToggle: (id: string) => void; info: PracticeInfo; runId?: string; footer?: string; ornament?: Ornament }) {
  const { t } = useTranslation()
  const open = (p: DayPractice): PracticeOpen | undefined => {
    if (p.item) return { holdOnly: true, label: t('plan.open'), icon: 'arrow-up-right', onClick: () => nav().openSheet({ name: 'mediaInfo', item: p.item!, ondaId: info.ondaId, runId, note: p.note }) }
    if (!p.action || !runId) return undefined
    const a = p.action
    return { label: t(`ondas.go.${a}`), icon: 'caret-right', onClick: () => (a === 'journal' ? nav().push({ name: 'journal' }) : a === 'philosophy' ? nav().push({ name: 'philosophy' }) : nav().push({ name: 'immersion', kind: a as MediaKind })) }
  }
  const slots = SLOT_ORDER.filter((s) => plan.some((p) => p.slot === s))
  return (
    <>
      {slots.map((slot, i) => {
        const head = t(`slot.${slot}`)
        // the header names the time of day, so a meta that starts with it drops that word
        const meta = (m: string) => (m.startsWith(`${head} · `) ? m.slice(head.length + 3) : m)
        return (
        <GroupedList key={slot} header={head} mark={ornament && <OrnamentIcon name={ornament} size={15} weight={1.6} />} footer={i === slots.length - 1 ? footer : undefined}>
          {plan.filter((p) => p.slot === slot).map((p) => (
            <PracticeRow
              key={p.id}
              p={{ id: p.id, icon: p.icon, name: p.lead ? `${t(`plan.lead.${p.lead}`)}: ${p.name}` : p.name, meta: meta(p.meta) }}
              twist={p.twist}
              note={p.item ? undefined : p.note}
              done={done.has(p.id)}
              onToggle={() => onToggle(p.id)}
              info={p.practiceId ? info : undefined}
              open={open(p)}
              burst={ornament && <OrnamentIcon name={ornament} size={20} weight={1.7} />}
            />
          ))}
        </GroupedList>
        )
      })}
    </>
  )
}
