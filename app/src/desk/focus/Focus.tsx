import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '@/data/store'
import { reducedMotion } from '@/lib/motion'
import { EmblemArt } from '@/screens/emblems'
import { useActiveOnda, useRunToday } from '@/screens/ondaShared'
import { Icon } from '@/ui/Icon'
import { useReturnFocus } from '../keys/dialog'
import { useDeskUI, type FocusSession } from '../store'
import f from './focus.module.css'

/* Focus: one practice, the whole window, in its Onda's world. The emblem breathes slowly, a ring counts the practice's
   minutes down, and at the end it can be marked done. Space starts and pauses, R resets, Escape leaves. */

const R = 140
const CIRC = 2 * Math.PI * R

export default function Focus({ session }: { session: FocusSession }) {
  const { t } = useTranslation()
  const active = useActiveOnda()
  const done = useRunToday(session.runId).practices.has(session.practiceId)
  const end = useDeskUI((s) => s.endFocus)
  const total = session.minutes * 60_000
  // elapsed time while paused, plus the moment the current run began
  const [clock, setClock] = useState({ spent: 0, since: 0 })
  const [, frame] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const restore = useReturnFocus()
  const running = clock.since > 0
  const spent = Math.min(total, clock.spent + (running ? Date.now() - clock.since : 0))
  const left = total - spent
  const over = left <= 0

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => frame((n) => n + 1), 250)
    return () => clearInterval(id)
  }, [running])
  useEffect(() => {
    if (over && running) setClock({ spent: total, since: 0 })
  }, [over, running, total])

  const toggle = () => setClock((c) => (c.since ? { spent: c.spent + Date.now() - c.since, since: 0 } : over ? { spent: 0, since: Date.now() } : { spent: c.spent, since: Date.now() }))
  const reset = () => setClock({ spent: 0, since: 0 })
  const leave = () => {
    end()
    restore()
  }
  const keys = useRef({ toggle, reset, leave })
  keys.current = { toggle, reset, leave }
  useEffect(() => {
    root.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') keys.current.leave()
      else if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) keys.current.toggle()
      else if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey) keys.current.reset()
      else return
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  const content = active?.run.id === session.runId ? active.content : undefined
  const practice = content?.practices.find((p) => p.id === session.practiceId)
  const how = practice?.instructions || content?.immersePlan.find((x) => `im-${x.item}` === session.practiceId)?.text || ''
  const look = active?.look
  const secs = Math.ceil(left / 1000)
  const mm = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
  const still = reducedMotion()

  return (
    <div
      ref={root}
      className={f.focus}
      role="dialog"
      aria-modal="true"
      aria-label={t('power.focus.label', { name: session.name })}
      tabIndex={-1}
      style={{ ...look?.vars, background: look?.cover, color: look?.ink }}
      data-running={running ? '' : undefined}
      data-still={still ? '' : undefined}
    >
      <div className={f.veil} aria-hidden />
      <button type="button" className={f.close} onClick={leave} aria-label={t('power.focus.leave')} title={t('power.focus.leave')}>
        <Icon name="x" weight="bold" size={20} />
      </button>
      <div className={f.body}>
        <div className={f.dial}>
          <svg className={f.ring} viewBox="0 0 320 320" aria-hidden>
            <circle cx="160" cy="160" r={R} />
            <circle cx="160" cy="160" r={R} strokeDasharray={`${(left / total) * CIRC} ${CIRC}`} />
          </svg>
          <div className={f.breath} aria-hidden>
            {look?.emblem ? <EmblemArt id={look.emblem} size={132} line={1.1} /> : <Icon name="flower-lotus" size={96} />}
          </div>
          <div className={f.time} role="timer" aria-live="off">
            {over ? t('power.focus.timeUp') : mm}
          </div>
        </div>
        <h1 className={f.name} style={{ fontFamily: look?.font, textTransform: look?.caps ? 'uppercase' : undefined }}>{session.name}</h1>
        <div className={f.meta}>{running ? t('power.focus.breathe') : t('power.focus.minutes', { count: session.minutes })}</div>
        {how && <p className={f.how}>{how}</p>}
        <div className={f.actions}>
          {over && !done ? (
            <button
              type="button"
              className={f.primary}
              onClick={() => {
                useStore.getState().togglePractice(session.runId, session.practiceId)
                leave()
              }}
            >
              <Icon name="check" weight="bold" size={18} />
              {t('power.focus.markDone')}
            </button>
          ) : (
            <button type="button" className={f.primary} onClick={toggle}>
              <Icon name={running ? 'pause' : 'play'} weight="fill" size={18} />
              {running ? t('power.focus.pause') : spent > 0 && !over ? t('power.focus.resume') : t('power.focus.start')}
            </button>
          )}
          <button type="button" className={f.secondary} onClick={reset} disabled={spent === 0}>
            <Icon name="arrow-counter-clockwise" weight="bold" size={18} />
            {t('power.focus.reset')}
          </button>
          {done && (
            <span className={f.kept}>
              <Icon name="check-circle" weight="fill" size={18} />
              {t('power.focus.marked')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
