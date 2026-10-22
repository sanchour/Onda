import { useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { CATEGORIES, FEATURED, type GalleryLago } from '@/data/catalog'
import type { LagoStats } from '@/data/derive/lago'
import { useStore } from '@/data/store'
import type { Lago } from '@/data/types'
import { addDays, fmtDayTitle, fmtShortDate, fromDateStr, type DateStr } from '@/lib/dates'
import { haptic } from '@/lib/haptics'
import { nav, useNav } from '@/nav/store'
import { lagoMenu } from '@/screens/lagoActions'
import { Icon } from '@/ui/Icon'
import { dayState, lagoDays, type Day, type DayState, type LagoRowData } from './derive'
import k from './lagos.desk.module.css'

/* Desktop Lago pieces: the check disc, the fourteen day strip, the card, the week matrix and the Gallery ideas.
   Every action goes through the same store calls and sheets as the phone. */

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
const RAYS = [0, 1, 2, 3, 4, 5, 6, 7]

/** The Lago actions menu at a point or under a button, rather than at the phone's screen edge. */
export function openLagoMenu(t: Parameters<typeof lagoMenu>[0], lago: Lago, at: { top: number; bottom: number; left: number; right: number }, align: 'start' | 'end') {
  const spec = lagoMenu(t, lago, new DOMRect(at.left, at.top, at.right - at.left, at.bottom - at.top))
  nav().openMenu({ ...spec, anchor: at, align, dim: false })
}
export const pointAt = (e: MouseEvent) => ({ top: e.clientY, bottom: e.clientY, left: e.clientX, right: e.clientX })

/** The check in sheet for a given day. The sheet starts on today unless the entry carries a date. */
export function openCheckIn(lagoId: string, date?: DateStr) {
  const route = { name: 'checkin' as const, lagoId, ...(date ? { date } : {}) }
  nav().openSheet(route)
}

/** A day in the week matrix or the calendar. Today toggles, as the phone's circle does; an open day before it is checked
 *  in as done at once (the phone's sheet allows the same back dating); a day with a check in opens it to edit. */
export function actOnDay(lago: Lago, date: DateStr, state: DayState, today: DateStr) {
  const st = useStore.getState()
  if (date === today && (state === 'today' || state === 'done')) {
    haptic(state === 'done' ? 'select' : 'success')
    st.toggleCheckInToday(lago.id)
  } else if (state === 'open') {
    const [y = 1970, m = 1, d = 1] = date.split('-').map(Number)
    const now = new Date()
    haptic('success')
    st.checkIn(lago.id, { date, status: 'done', at: new Date(y, m - 1, d, now.getHours(), now.getMinutes()).toISOString() })
  } else if (state === 'done' || state === 'missed') openCheckIn(lago.id, date)
}

/** The Lago's icon in a ring that fills with the accent when today is checked in. Hovering shows the check it will
 *  make; checking in sends a ring and a burst of rays out from it. */
export function CheckDisc({ lago, st, onToggle, size = 52 }: { lago: Lago; st: LagoStats; onToggle: () => void; size?: number }) {
  const { t } = useTranslation()
  const [pop, setPop] = useState(0)
  const active = st.phase === 'active'
  const on = st.doneToday
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={on ? t('a11y.undoCheckIn', { name: lago.name }) : t('a11y.checkInLago', { name: lago.name })}
      disabled={!active}
      className={cx(k.disc, on && k.discOn, st.missedToday && k.discMissed)}
      style={{ '--disc': `${size}px` } as CSSProperties}
      onClick={(e) => {
        e.stopPropagation()
        setPop((n) => n + 1)
        onToggle()
      }}
    >
      {/* keyed by the press, so the spring plays again each time without the button losing focus */}
      <span key={pop} className={k.discFace} data-pop={pop ? (on ? 'in' : 'out') : undefined}>
        <Icon name={lago.icon} weight="fill" size={Math.round(size * 0.46)} />
      </span>
      {!on && active && (
        <span className={k.discCheck} aria-hidden>
          <Icon name="check" weight="bold" size={Math.round(size * 0.42)} />
        </span>
      )}
      {st.missedToday && (
        <span className={k.discBadge} aria-hidden>
          <Icon name="x" weight="bold" size={10} />
        </span>
      )}
      {on && pop > 0 && (
        <span key={`b${pop}`} className={k.burst} aria-hidden>
          {RAYS.map((i) => (
            <i key={i} style={{ '--a': `${i * 45 + 22.5}deg` } as CSSProperties} />
          ))}
        </span>
      )}
    </button>
  )
}

/** Fourteen days as a row of marks: done fills with the accent, missed is struck, open is an empty slot. */
export function HistoryStrip({ days, label, className }: { days: Day[]; label: string; className?: string }) {
  return (
    <div className={cx(k.strip, className)} role="img" aria-label={label}>
      {days.map((d) => (
        <i key={d.date} data-s={d.state} />
      ))}
    </div>
  )
}

export function stripLabel(t: ReturnType<typeof useTranslation>['t'], days: Day[]) {
  return t('deskLagos.last14', { done: days.filter((d) => d.state === 'done').length, missed: days.filter((d) => d.state === 'missed').length })
}

/** A Lago as a card: check disc, name and day, the last fourteen days, streak and score, and its progress as a thin
 *  ribbon along the bottom. The card opens the Lago; the menu sits behind the dots and a right click. */
export function LagoCard({ row, index, onToggle }: { row: LagoRowData; index: number; onToggle: (r: LagoRowData) => void }) {
  const { t } = useTranslation()
  const push = useNav((n) => n.push)
  const today = useStore((x) => x.today)
  const more = useRef<HTMLButtonElement>(null)
  const { lago, st, byDate } = row
  const days = useMemo(() => lagoDays(lago, byDate, today, 14, today), [lago, byDate, today])
  const meta = st.phase === 'finished' ? t('lagos.finishedMeta', { count: lago.lengthDays }) : t('deskLagos.dayOf', { day: st.day, length: lago.lengthDays, freq: t(`freq.${lago.frequency}`) })
  return (
    <article
      className={k.card}
      data-done={st.doneToday ? '' : undefined}
      data-phase={st.phase}
      style={{ '--i': index } as CSSProperties}
      onContextMenu={(e) => {
        e.preventDefault()
        openLagoMenu(t, lago, pointAt(e), 'start')
      }}
    >
      <button type="button" className={k.cardOpen} aria-label={t('a11y.openLago', { name: lago.name, day: st.day, length: lago.lengthDays })} onClick={() => push({ name: 'lago', id: lago.id })} />
      <div className={k.cardHead}>
        <CheckDisc lago={lago} st={st} onToggle={() => onToggle(row)} />
        <div className={k.cardText}>
          <h3 className={k.cardName}>{lago.name}</h3>
          <div className={k.cardMeta}>{meta}</div>
        </div>
        <button
          ref={more}
          type="button"
          className={k.more}
          aria-label={t('a11y.more')}
          aria-haspopup="menu"
          onClick={() => more.current && openLagoMenu(t, lago, more.current.getBoundingClientRect(), 'end')}
        >
          <Icon name="dots-three" weight="bold" size={20} />
        </button>
      </div>
      <HistoryStrip days={days} label={stripLabel(t, days)} />
      <div className={k.cardFoot}>
        <span className={k.streak} data-on={st.streak ? '' : undefined}>
          <Icon name="fire" weight="fill" size={15} />
          {st.streak ? t('lago.dayStreak', { count: st.streak }) : t('lago.noStreak')}
        </span>
        <span className={k.score}>
          <b>{Math.round(st.score * 100)}%</b> {t('lago.score')}
        </span>
      </div>
      <span className={k.ribbon} aria-hidden>
        <i style={{ transform: `scaleX(${st.pct})` }} />
      </span>
    </article>
  )
}

const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/** The week at a glance: each Lago by the last seven days. Cells check in, back date or open a day's check in. */
export function WeekMatrix({ rows }: { rows: LagoRowData[] }) {
  const { t } = useTranslation()
  const today = useStore((x) => x.today)
  const [back, setBack] = useState(0)
  const last = addDays(today, -7 * back)
  const first = addDays(last, -6)
  const dates = Array.from({ length: 7 }, (_, i) => addDays(first, i))
  const live = rows.filter((r) => r.group)
  const shown = live.filter((r) => r.lago.startedAt <= last && lagoLast(r.lago) >= first)
  const earliest = live.reduce((m, r) => (r.lago.startedAt < m ? r.lago.startedAt : m), today)
  const range = t('deskLagos.range', { from: fmtShortDate(first), to: fmtShortDate(last) })

  return (
    <section className={k.panel} aria-labelledby="dk-week">
      <div className={k.panelHead}>
        <h2 id="dk-week" className={k.panelTitle}>{t('deskLagos.glance')}</h2>
        <div className={k.weekNav}>
          <button type="button" aria-label={t('deskLagos.earlier')} disabled={first <= earliest} onClick={() => setBack((b) => b + 1)}>
            <Icon name="caret-left" weight="bold" size={14} />
          </button>
          <button type="button" aria-label={t('deskLagos.later')} disabled={back === 0} onClick={() => setBack((b) => Math.max(0, b - 1))}>
            <Icon name="caret-right" weight="bold" size={14} />
          </button>
        </div>
      </div>
      <div className={k.panelSub} aria-live="polite">{range}</div>
      <div className={k.matrix} data-now={back === 0 ? '' : undefined}>
        <div className={k.mHead} aria-hidden>
          {dates.map((d) => (
            <span key={d} data-today={d === today ? '' : undefined}>
              {WD[fromDateStr(d).getDay()]}
              <b>{fromDateStr(d).getDate()}</b>
            </span>
          ))}
        </div>
        {shown.map((r) => (
          <div key={r.lago.id} className={k.mRow}>
            <div className={k.mName}>
              <Icon name={r.lago.icon} weight="fill" size={14} />
              <span>{r.lago.name}</span>
            </div>
            <div className={k.mCells}>
              {dates.map((d) => (
                <MatrixCell key={d} r={r} date={d} today={today} />
              ))}
            </div>
          </div>
        ))}
        {shown.length === 0 && <div className={k.mEmpty}>{t('deskLagos.weekEmpty')}</div>}
      </div>
      <div className={k.legend} aria-hidden>
        <span><i data-s="done" />{t('deskLagos.done')}</span>
        <span><i data-s="missed" />{t('checkin.missed')}</span>
        <span><i data-s="open" />{t('deskLagos.open')}</span>
        <span><i data-s="rest" />{t('deskLagos.rest')}</span>
      </div>
    </section>
  )
}

const lagoLast = (l: Lago) => {
  const end = addDays(l.startedAt, l.lengthDays - 1)
  return l.endedAt && l.endedAt < end ? l.endedAt : end
}

function MatrixCell({ r, date, today }: { r: LagoRowData; date: DateStr; today: DateStr }) {
  const { t } = useTranslation()
  const [pop, setPop] = useState(0)
  const state = dayState(r.lago, r.byDate, date, today)
  const day = fmtDayTitle(date)
  const live = r.st.phase === 'active' && (state === 'done' || state === 'missed' || state === 'open' || state === 'today')
  if (!live) return <span className={k.cell} data-s={state} aria-hidden />
  const label =
    state === 'done'
      ? t(date === today ? 'deskLagos.cellUndo' : 'deskLagos.cellDone', { name: r.lago.name, day })
      : state === 'missed'
        ? t('deskLagos.cellMissed', { name: r.lago.name, day })
        : t('deskLagos.cellOpen', { name: r.lago.name, day })
  return (
    <button
      type="button"
      className={k.cell}
      data-s={state}
      aria-label={label}
      title={label}
      onClick={() => {
        if (state === 'open' || state === 'today') setPop((n) => n + 1)
        actOnDay(r.lago, date, state, today)
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        openCheckIn(r.lago.id, date)
      }}
    >
      <span key={pop} className={k.cellFace} data-pop={pop ? '' : undefined}>
        {state === 'missed' ? <Icon name="x" weight="bold" size={11} /> : <Icon name="check" weight="bold" size={13} />}
      </span>
    </button>
  )
}

/** Three Lagos from the Gallery you are not running yet, a different three each day. */
export function GalleryIdeas({ running }: { running: Set<string> }) {
  const { t } = useTranslation()
  const { push, openSheet } = useNav()
  const today = useStore((x) => x.today)
  const ideas = useMemo(() => {
    const seen = new Set<string>()
    const pool: GalleryLago[] = []
    for (const it of [...Object.values(CATEGORIES).flat(), ...FEATURED]) {
      if (seen.has(it.name) || running.has(it.name.toLocaleLowerCase())) continue
      seen.add(it.name)
      pool.push(it)
    }
    const day = Math.floor(fromDateStr(today).getTime() / 864e5)
    return Array.from({ length: Math.min(3, pool.length) }, (_, i) => pool[(day * 7 + i * 11) % pool.length]!).filter((x, i, a) => a.indexOf(x) === i)
  }, [running, today])
  if (!ideas.length) return null
  return (
    <section className={k.panel} aria-labelledby="dk-ideas">
      <div className={k.panelHead}>
        <h2 id="dk-ideas" className={k.panelTitle}>{t('deskLagos.ideas')}</h2>
        <button type="button" className={k.panelLink} onClick={() => push({ name: 'gallery' })}>
          {t('deskLagos.seeAll')}
        </button>
      </div>
      <div className={k.ideas}>
        {ideas.map((it) => (
          <button key={it.name} type="button" className={k.idea} onClick={() => openSheet({ name: 'lagoInfo', info: it })}>
            <span className={k.ideaIcon}>
              <Icon name={it.icon} weight="fill" size={20} />
            </span>
            <span className={k.ideaText}>
              <span className={k.ideaName}>{it.name}</span>
              <span className={k.ideaMeta}>{t('deskLagos.ideaMeta', { count: it.length, cat: it.cat })}</span>
            </span>
            <Icon name="plus" weight="bold" size={16} className={k.ideaPlus} />
          </button>
        ))}
      </div>
    </section>
  )
}
