import { useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { MediaKind } from '@/content'
import type { OndaContent } from '@/content/schema'
import type { OndaLook } from '@/content/themes'
import { pickForDay } from '@/data/derive/onda'
import type { DayPractice, PlanSlot } from '@/data/derive/plan'
import { now } from '@/lib/dates'
import { fitSize } from '@/lib/fit'
import { haptic } from '@/lib/haptics'
import { reducedMotion } from '@/lib/motion'
import { nav } from '@/nav/store'
import { EmblemArt } from '@/screens/emblems'
import { KindArt, OrnamentIcon } from '@/screens/KindArt'
import { Icon } from '@/ui/Icon'
import { useDeskUI } from '../store'
import h from './home.module.css'
import { slotHead, useHead } from '@/i18n/native'

/* Pieces the desktop Today view and the desktop Onda page share. Every one reads the same store data and calls the
   same actions as the phone screens (ondaShared, onda7); only the arrangement is new. */

/** The day's words from the content, exactly as the phone Onda page picks them. */
export function dayContent(content: OndaContent, day: number) {
  const quote = content.quotes.length ? pickForDay([...(content.quote ? [content.quote] : []), ...content.quotes], day) : content.quote
  const word = pickForDay(content.words, day)
  const phil = pickForDay(content.philosophy, day)
  const theme = content.dayThemes[day - 1] ?? phil?.title ?? ''
  const prompt = pickForDay(content.journal, day) ?? ''
  const think = [
    phil && { kind: 'philosophy', ...phil },
    pickForDay(content.ethics, day) && { kind: 'ethics', ...pickForDay(content.ethics, day)! },
    pickForDay(content.philosophy, day + 1) && { kind: 'philosophy', ...pickForDay(content.philosophy, day + 1)! },
    pickForDay(content.ethics, day + 1) && { kind: 'ethics', ...pickForDay(content.ethics, day + 1)! },
  ].filter((v, i, a): v is NonNullable<typeof v> => !!v && a.findIndex((w) => w && w.title === v.title) === i)
  return { quote, word, phil, theme, prompt, think }
}

/** Minutes for a focus session: the practice's own, else the "10 min" in its meta line, else ten. */
export function minutesOf(p: DayPractice, content: OndaContent | undefined): number {
  const own = p.practiceId ? content?.practices.find((x) => x.id === p.practiceId)?.minutes : undefined
  const m = own ?? Number(/(\d+)\s*min/.exec(p.meta)?.[1])
  return m > 0 ? m : 10
}

/** The cover leans a little toward the pointer, as if lit from where you look. Writes CSS variables, never state. */
export function lean(e: PointerEvent<HTMLElement>, strength = 1) {
  if (e.pointerType !== 'mouse' || reducedMotion()) return
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const x = (e.clientX - r.left) / r.width
  const y = (e.clientY - r.top) / r.height
  el.style.setProperty('--px', (x - 0.5).toFixed(3))
  el.style.setProperty('--py', (y - 0.5).toFixed(3))
  el.style.setProperty('--rx', `${((0.5 - y) * 9 * strength).toFixed(2)}deg`)
  el.style.setProperty('--ry', `${((x - 0.5) * 11 * strength).toFixed(2)}deg`)
  el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`)
  el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`)
}
export function unlean(e: PointerEvent<HTMLElement>) {
  for (const k of ['--px', '--py', '--rx', '--ry']) e.currentTarget.style.removeProperty(k)
}

/* ── Hero ───────────────────────────────────────────────── */

export function DaySegments({ day, length }: { day: number; length: number }) {
  const { t } = useTranslation()
  return (
    <span className={h.days} role="img" aria-label={t('ondas.dayOf', { day, length })}>
      {Array.from({ length }, (_, i) => (
        <i key={i} data-past={i < day - 1 ? '' : undefined} data-now={i === day - 1 ? '' : undefined} />
      ))}
    </span>
  )
}

/** The Onda's cover across the top of the stage: its material, emblem and face, the day in its numerals, the days as segments. */
export function Hero({ look, title, kicker, glyph, sub, lede, mark, day, length, foot, actions }: {
  look: OndaLook
  title: string
  /** Small capitals at the top left; a glyph in the tradition's script takes its place when there is no kicker. */
  kicker?: string
  glyph?: string
  sub?: string
  lede?: string
  /** Top right: the day in the tradition's numerals. Decorative. */
  mark?: string
  day: number
  length: number
  /** Under the day segments: left and right. */
  foot?: [ReactNode, ReactNode?]
  actions?: ReactNode
}) {
  const fs = fitSize(title, 640, 92, 40, look.caps)
  const left = look.layout === 'left'
  return (
    <header className={h.hero} data-layout={look.layout} style={{ background: look.cover, color: look.ink }} onPointerMove={(e) => lean(e)} onPointerLeave={unlean}>
      {look.emblem && (
        <span className={h.heroEmblem} aria-hidden>
          {!left && <span className={h.seal} />}
          <EmblemArt id={look.emblem} size={left ? 540 : 236} line={left ? 1.25 : 1.1} />
        </span>
      )}
      <div className={h.heroTop}>
        {kicker ? <span className={h.heroKicker}>{kicker}</span> : glyph ? <span className={h.heroGlyphTop} aria-hidden>{glyph}</span> : <span />}
        {mark && <span className={h.heroMark} aria-hidden>{mark}</span>}
      </div>
      <div className={h.heroBody}>
        {kicker && glyph && <span className={h.heroGlyph} aria-hidden>{glyph}</span>}
        <h1 className={h.heroTitle} style={{ fontSize: fs }}>{title}</h1>
        {sub && <p className={h.heroSub}>{sub}</p>}
        {lede && <p className={h.heroLede}>{lede}</p>}
        {actions && <div className={h.heroActions}>{actions}</div>}
      </div>
      <div className={h.heroFoot}>
        <DaySegments day={day} length={length} />
        {foot && (
          <div className={h.daysFoot}>
            <span>{foot[0]}</span>
            <span>{foot[1]}</span>
          </div>
        )}
      </div>
    </header>
  )
}

/* ── The day's practices ────────────────────────────────── */

const SLOT_ORDER: PlanSlot[] = ['Immerse', 'Morning', 'Afternoon', 'Evening', 'Special']
const SLOT_ICON: Record<PlanSlot, string> = { Immerse: 'sparkle', Morning: 'sun-horizon', Afternoon: 'sun', Evening: 'moon-stars', Special: 'clock' }
/** The time of day it is now, marked on a running Onda's plan. */
const slotNow = (): PlanSlot => {
  const hr = now().getHours()
  return hr < 12 ? 'Morning' : hr < 17 ? 'Afternoon' : 'Evening'
}

interface PlanScope {
  look: OndaLook
  ondaId: string
  /** Set for a running Onda: only then can a card start a focus session or open the Journal, Philosophy or Immersion. */
  runId?: string
  content?: OndaContent
  /** The Onda id when themes are on, for the menu's look. */
  onda?: string
}

interface CardAction {
  key: string
  icon: string
  label: string
  /** Shown as an icon alone on the card (the label is its name and tooltip). */
  short?: boolean
  run: () => void
}

/** One practice as a card. The card is the checkbox; How To, Focus and Open sit on it and show on hover or focus.
 *  A right click, the context menu key or Shift F10 offers the same actions as a menu, as a hold does on the phone. */
export function PracticeCard({ p, done, onToggle, scope }: { p: DayPractice; done: boolean; onToggle: () => void; scope: PlanScope }) {
  const { t } = useTranslation()
  const [burst, setBurst] = useState(0)
  const { look, ondaId, runId, content } = scope
  const name = p.lead ? `${t(`plan.lead.${p.lead}`)}: ${p.name}` : p.name
  const head = t(`slot.${p.slot}`)
  // the slot names the time of day, so a meta that starts with it drops that word (as PlanList does)
  const meta = p.meta.startsWith(`${head} · `) ? p.meta.slice(head.length + 3) : p.meta
  const imm = p.slot === 'Immerse' && !!p.item

  const acts: CardAction[] = []
  if (p.practiceId) acts.push({ key: 'how', icon: 'info', label: t('deskHome.howTo'), run: () => nav().openSheet({ name: 'practiceInfo', ondaId, practiceId: p.practiceId!, twist: p.twist }) })
  if (p.item) acts.push({ key: 'open', icon: 'arrow-up-right', label: t('plan.open'), short: !imm, run: () => nav().openSheet({ name: 'mediaInfo', item: p.item!, ondaId, runId, note: p.note }) })
  else if (p.action && runId) {
    const a = p.action
    acts.push({ key: 'go', icon: 'arrow-right', label: t(`ondas.go.${a}`), short: true, run: () => (a === 'journal' ? nav().push({ name: 'journal' }) : a === 'philosophy' ? nav().push({ name: 'philosophy' }) : nav().push({ name: 'immersion', kind: a as MediaKind })) })
  }
  if (runId) acts.push({ key: 'focus', icon: 'timer', label: t('deskHome.focus'), run: () => useDeskUI.getState().startFocus({ runId, practiceId: p.id, name, minutes: minutesOf(p, content) }) })

  const toggle = () => {
    haptic(done ? 'select' : 'success')
    if (!done) setBurst((b) => b + 1)
    onToggle()
  }
  const menu = (r: DOMRect) => {
    if (!acts.length) return
    nav().openMenu({
      anchor: { top: r.top, bottom: r.bottom, left: r.left + 12, right: r.right },
      width: 264,
      scope: { style: look.vars, onda: scope.onda },
      items: acts.map((a) => ({ label: a.key === 'how' ? t('onda.howTo') : a.label, icon: a.icon, onClick: a.run })),
    })
  }

  const check = (
    <span className={h.checkWrap} aria-hidden>
      <span className={h.check}>{done && <Icon name="check" weight="bold" size={15} />}</span>
      {done && burst > 0 && (
        <span key={burst} className={h.bloom}>
          <span className={h.bloomOrn}><OrnamentIcon name={look.ornament} size={30} weight={1.4} /></span>
          {[0, 60, 120, 180, 240, 300].map((a) => <i key={a} style={{ '--a': `${a}deg` } as CSSProperties} />)}
        </span>
      )}
    </span>
  )
  const foot = (
    <div className={h.cardFoot}>
      <span className={h.cardMeta}>
        <Icon name="clock" size={15} />
        <span>{meta}</span>
      </span>
      {acts.length > 0 && (
        <span className={h.acts}>
          {acts.map((a) => (
            <button key={a.key} type="button" className={a.short ? `${h.act} ${h.actIcon}` : h.act} aria-label={`${a.label}: ${p.name}`} title={a.short ? a.label : undefined} onClick={a.run}>
              <Icon name={a.icon} weight={a.short ? 'bold' : 'regular'} size={16} />
              {!a.short && <span>{a.label}</span>}
            </button>
          ))}
        </span>
      )}
    </div>
  )

  return (
    <div className={imm ? `${h.card} ${h.imm}` : h.card} data-done={done ? '' : undefined} data-burst={done && burst > 0 ? burst : undefined}>
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-haspopup={acts.length ? 'menu' : undefined}
        aria-label={name}
        className={h.hit}
        onClick={toggle}
        onContextMenu={(e) => {
          if (!acts.length) return
          e.preventDefault()
          menu(e.currentTarget.getBoundingClientRect())
        }}
        onKeyDown={(e) => {
          if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
            e.preventDefault()
            menu(e.currentTarget.getBoundingClientRect())
          }
        }}
      />
      {imm ? (
        <>
          <span className={h.immArt} aria-hidden><KindArt kind={p.item!.kind} /></span>
          <span className={h.immBody}>
            <span className={h.cardTop}>
              <span className={h.immKick}>{t(`kindLabel.${p.item!.kind}`)}</span>
              {check}
            </span>
            <span className={h.cardTitle}>{name}</span>
            {p.note && <span className={h.cardNote}>{p.note}</span>}
            {foot}
          </span>
        </>
      ) : (
        <>
          <span className={h.cardTop}>
            <span className={h.cardIcon} aria-hidden><Icon name={p.icon} size={22} /></span>
            {check}
          </span>
          <span className={h.cardTitle}>{name}</span>
          {!p.item && p.note && <span className={h.cardNote}>{p.note}</span>}
          {foot}
        </>
      )}
    </div>
  )
}

/** The day as a path: Immerse first, then morning, afternoon and evening, each a node in the Onda's ornament that fills
 *  once its practices are done. The time of day it is now is marked on a running Onda. */
export function DayPlan({ plan, done, onToggle, scope }: { plan: DayPractice[]; done: Set<string>; onToggle: (id: string) => void; scope: PlanScope }) {
  const { t } = useTranslation()
  const nh = useHead()
  const slots = SLOT_ORDER.filter((s) => plan.some((p) => p.slot === s))
  const cur = scope.runId ? slotNow() : undefined
  return (
    <ol className={h.plan}>
      {slots.map((slot) => {
        const items = plan.filter((p) => p.slot === slot)
        const n = items.filter((p) => done.has(p.id)).length
        const all = n === items.length
        return (
          <li key={slot} className={h.slot} data-done={all ? '' : undefined}>
            <div className={h.slotHead}>
              <span className={h.node} aria-hidden>
                {all ? <OrnamentIcon name={scope.look.ornament} size={20} weight={1.6} /> : <Icon name={SLOT_ICON[slot]} size={19} />}
              </span>
              <h3 className={h.slotName}>{slotHead(slot) ? nh(slotHead(slot)!, t(`slot.${slot}`)) : t(`slot.${slot}`)}</h3>
              {cur === slot && <span className={h.now}>{t('deskHome.now')}</span>}
              <span className={h.slotCount}>{n}/{items.length}</span>
            </div>
            <div className={h.cards}>
              {items.map((p) => (
                <PracticeCard key={p.id} p={p} done={done.has(p.id)} onToggle={() => onToggle(p.id)} scope={scope} />
              ))}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** Rules as cards: the number in the tradition's numerals, the rule and its reason, a check in the Onda's mark shape. */
export function RulesGrid({ rules, done, onToggle, numeral }: { rules: { id: string; text: string; why?: string }[]; done: Set<string>; onToggle: (id: string) => void; numeral: (n: number) => string }) {
  const { t } = useTranslation()
  return (
    <div className={h.rules} role="group" aria-label={t('onda.rules')}>
      {rules.map((r, i) => {
        const on = done.has(r.id)
        return (
          <button key={r.id} type="button" role="checkbox" aria-checked={on} className={h.rule} data-done={on ? '' : undefined} onClick={() => { haptic(on ? 'select' : 'success'); onToggle(r.id) }}>
            <span className={h.ruleNum} aria-hidden>{numeral(i + 1)}</span>
            <span className={h.ruleBody}>
              <span className={h.ruleText}>{r.text}</span>
              {r.why && <span className={h.ruleWhy}>{r.why}</span>}
            </span>
            <span className={h.check} aria-hidden>{on && <Icon name="check" weight="bold" size={13} />}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ── Side panels ────────────────────────────────────────── */

/** Today's practices as a ring and as a row of the Onda's ornament, one bead for each. */
export function ProgressPanel({ look, plan, done, rules }: { look: OndaLook; plan: DayPractice[]; done: Set<string>; rules?: { kept: number; total: number } }) {
  const { t } = useTranslation()
  const nh = useHead()
  const n = plan.filter((p) => done.has(p.id)).length
  const total = plan.length
  const full = total > 0 && n === total
  const C = 2 * Math.PI * 46
  const label = t('ondas.practicesOf', { done: n, total })
  return (
    <section className={h.panel} aria-label={label}>
      <div className={h.prog}>
        <div className={h.ring} data-full={full ? '' : undefined} role="img" aria-label={label}>
          <svg viewBox="0 0 104 104" aria-hidden>
            <circle className={h.ringTrack} cx="52" cy="52" r="46" />
            <circle className={h.ringFill} cx="52" cy="52" r="46" strokeDasharray={`${total ? (n / total) * C : 0} ${C}`} />
          </svg>
          <span className={h.ringIn} aria-hidden>
            {full ? <OrnamentIcon name={look.ornament} size={40} weight={1.3} /> : (
              <>
                <span className={h.ringNum}>{n}</span>
                <span className={h.ringOf}>{t('deskHome.ofTotal', { total })}</span>
              </>
            )}
          </span>
        </div>
        <div className={h.progText}>
          <span className={h.kick}>{nh('today', t('ondas.today'))}</span>
          <span className={h.progTitle}>{full ? t('deskHome.dayDone') : label}</span>
          {rules && rules.total > 0 && <span className={h.progSub}>{t('ondas.rulesOf', { done: rules.kept, total: rules.total })}</span>}
        </div>
      </div>
      {total > 0 && (
        <div className={h.beads} aria-hidden>
          {plan.map((p) => (
            <span key={p.id} className={done.has(p.id) ? `${h.bead} ${h.beadOn}` : h.bead}>
              <OrnamentIcon name={look.ornament} size={20} />
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

export function QuotePanel({ look, quote }: { look: OndaLook; quote: { text: string; by: string; source?: string } }) {
  const { t } = useTranslation()
  return (
    <figure className={`${h.panel} ${h.quote}`} style={{ margin: 0 }}>
      <div className={h.qOrn} aria-hidden><OrnamentIcon name={look.ornament} size={24} weight={1.25} /></div>
      <span className={h.kick}>{t('onda.quoteOfDay')}</span>
      <blockquote className={look.caps ? `${h.qText} ${h.qCaps}` : h.qText} data-selectable>{quote.text}</blockquote>
      <figcaption className={h.qBy}>
        {quote.by}
        {quote.source && <span>, {quote.source}</span>}
      </figcaption>
    </figure>
  )
}

export function WordPanel({ word }: { word: { term: string; pronunciation?: string; meaning: string } }) {
  const { t } = useTranslation()
  return (
    <section className={h.panel} aria-label={t('onda.wordOfDay')}>
      <span className={h.kick}>{t('onda.wordOfDay')}</span>
      <div className={h.term} data-selectable>{word.term}</div>
      {word.pronunciation && <div className={h.say}>{word.pronunciation}</div>}
      <div className={h.meaning}>{word.meaning}</div>
    </section>
  )
}

export function Panel({ kicker, children, label }: { kicker?: string; children: ReactNode; label?: string }) {
  return (
    <section className={h.panel} aria-label={label ?? kicker}>
      {kicker && <span className={h.kick}>{kicker}</span>}
      {children}
    </section>
  )
}

/** A room of the Onda (Immerse, Journal, Philosophy, Guide). On hover it takes on the Onda's cover. */
export function Tile({ icon, title, sub, onClick }: { icon: string; title: string; sub?: string; onClick: () => void }) {
  return (
    <button type="button" className={h.tile} onClick={onClick}>
      <span className={h.tileIcon} aria-hidden><Icon name={icon} size={22} /></span>
      <span className={h.tileGo} aria-hidden><Icon name="arrow-up-right" weight="bold" size={16} /></span>
      <span className={h.tileTitle}>{title}</span>
      {sub && <span className={h.tileSub}>{sub}</span>}
    </button>
  )
}

export function Section({ title, meta, children, id }: { title: string; meta?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className={h.sec} aria-labelledby={id}>
      <div className={h.secHead}>
        <h2 className={h.secTitle} id={id}>{title}</h2>
        {meta != null && <span className={h.secMeta}>{meta}</span>}
      </div>
      {children}
    </section>
  )
}
