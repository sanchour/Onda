import { useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { haptic } from '@/lib/haptics'
import { grab, pointerVelocity, pushSample, reducedMotion, rubber, springTo, tx, type Sample } from '@/lib/motion'
import { Icon, type IconWeight } from './Icon'
import { useSlotScrub } from './useSlotScrub'
import s from './ui.module.css'

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ')

/* ── Chip ─────────────────────────────────────────────────── */
interface ChipProps {
  label: string
  icon?: string
  iconWeight?: IconWeight
  selected?: boolean
  onClick?: () => void
  style?: CSSProperties
}
export function Chip({ label, icon, iconWeight = 'regular', selected, onClick, style }: ChipProps) {
  return (
    <button type="button" aria-pressed={!!selected} className={cx(s.chip, selected && s.chipOn)} style={style} onClick={onClick}>
      {icon && <Icon name={icon} weight={iconWeight} size={18} />}
      {label}
    </button>
  )
}

/* ── Switch ───────────────────────────────────────────────── */
interface SwitchProps {
  checked: boolean
  onChange?: (next: boolean) => void
  disabled?: boolean
  ariaLabel?: string
}
/** iOS 26 switch: 63×28 with a pill thumb that follows the finger and settles on a spring. */
export function Switch({ checked, onChange, disabled, ariaLabel }: SwitchProps) {
  const thumb = useRef<HTMLSpanElement>(null)
  const S = useRef({ down: false, drag: false, sx: 0, x0: 0, x: 0, s: [] as Sample[], placed: false, vel: 0 })
  const [pressed, setPressed] = useState(false)
  const pos = (c: boolean) => (c ? 24 : 0)

  useLayoutEffect(() => {
    const el = thumb.current
    const st = S.current
    if (!el || st.down) return
    if (!st.placed) {
      el.style.transform = tx(pos(checked))
      st.placed = true
    } else springTo(el, { from: grab(el), to: pos(checked), velocity: st.vel, spring: 'snappy' })
    st.vel = 0
  }, [checked])

  const end = () => {
    const st = S.current
    const el = thumb.current
    if (!st.down || !el) return
    st.down = false
    setPressed(false)
    const v = st.drag ? pointerVelocity(st.s) : 0
    const next = st.drag ? st.x + v * 0.08 > 12 : !checked
    if (next !== checked) {
      st.vel = v
      haptic('select')
      onChange?.(next)
    } else springTo(el, { from: grab(el), to: pos(checked), velocity: v, spring: 'snappy' })
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cx(s.switch, checked && s.switchOn, pressed && s.switchPressed)}
      onPointerDown={(e: RPointerEvent<HTMLButtonElement>) => {
        if (disabled || !thumb.current) return
        const st = S.current
        st.down = true
        st.drag = false
        st.sx = e.clientX
        st.x0 = grab(thumb.current)
        st.s = [[e.timeStamp, e.clientX]]
        e.currentTarget.setPointerCapture(e.pointerId)
        setPressed(true)
      }}
      onPointerMove={(e) => {
        const st = S.current
        if (!st.down || !thumb.current) return
        if (Math.abs(e.clientX - st.sx) > 3) st.drag = true
        if (!st.drag) return
        pushSample(st.s, e.timeStamp, e.clientX)
        st.x = rubber(st.x0 + e.clientX - st.sx, 0, 24, 0.2)
        thumb.current.style.transform = tx(st.x)
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onClick={(e) => {
        e.stopPropagation()
        // keyboard / assistive activation (pointer taps are handled above)
        if (e.detail === 0 && !disabled) onChange?.(!checked)
      }}
    >
      <span ref={thumb} className={s.switchThumb}>
        <span className={s.switchKnob} style={{ transformOrigin: checked ? '100% 50%' : '0 50%' }} />
      </span>
    </button>
  )
}

/* ── Stepper ──────────────────────────────────────────────── */
interface StepperProps {
  onDecrement: () => void
  onIncrement: () => void
  decrementDisabled?: boolean
  incrementDisabled?: boolean
}
export function Stepper({ onDecrement, onIncrement, decrementDisabled, incrementDisabled }: StepperProps) {
  const { t } = useTranslation()
  const tap = (fn: () => void) => () => {
    haptic('select')
    fn()
  }
  return (
    <div className={s.stepper}>
      <button type="button" className={s.stepperBtn} aria-label={t('a11y.decrease')} disabled={decrementDisabled} onClick={tap(onDecrement)}>
        <Icon name="minus" weight="bold" size={18} />
      </button>
      <span className={s.stepperSep} />
      <button type="button" className={s.stepperBtn} aria-label={t('a11y.increase')} disabled={incrementDisabled} onClick={tap(onIncrement)}>
        <Icon name="plus" weight="bold" size={18} />
      </button>
    </div>
  )
}

/* ── StatusCircle ─────────────────────────────────────────── */
/** Three-state task circle (ring, half, ring + dot). Decorative: the row that owns it is the control. */
export function StatusCircle({ status = 'todo', size = 22 }: { status?: 'todo' | 'progress' | 'done'; size?: number }) {
  const ring = Math.max(1.5, size / 14)
  return (
    <span aria-hidden className={s.status} style={{ width: size, height: size, borderWidth: ring }}>
      {status !== 'todo' && (
        <span className={s.statusFill} style={{ inset: 2, background: status === 'progress' ? 'linear-gradient(90deg, transparent 50%, var(--label) 50%)' : undefined }} />
      )}
    </span>
  )
}

/* ── CheckDot ─────────────────────────────────────────────── */
/** Round check used on rules, immersion items and timeline rows. `soft` uses the lighter ring. */
export function CheckDot({ on, size = 28, icon = 14, soft }: { on: boolean; size?: number; icon?: number; soft?: boolean }) {
  return (
    <span aria-hidden className={cx(s.checkDot, soft && s.checkDotSoft, on && s.checkDotOn)} style={{ width: size, height: size }}>
      <Icon name="check" weight="bold" size={icon} />
    </span>
  )
}

/* ── SegmentedControl ─────────────────────────────────────── */
interface SegProps<T extends string> {
  options: readonly (T | { value: T; label: string })[]
  value: T
  onChange: (v: T) => void
  fullWidth?: boolean
  ariaLabel?: string
}
export function SegmentedControl<T extends string>({ options, value, onChange, fullWidth, ariaLabel }: SegProps<T>) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o as string } : o))
  const idx = Math.max(0, opts.findIndex((o) => o.value === value))
  const sc = useSlotScrub({ count: opts.length, index: idx, onCommit: (i) => onChange(opts[i]!.value) })
  return (
    <div ref={sc.trackRef as React.RefObject<HTMLDivElement>} role="tablist" aria-label={ariaLabel} className={cx(s.seg, fullWidth && s.segFull)} {...sc.handlers}>
      <span ref={sc.thumbRef} aria-hidden className={s.segThumb} style={{ width: sc.w || 0 }}>
        <span className={cx(s.lens, sc.pressed && s.lensPressed)} />
      </span>
      {opts.map((o, i) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className={cx(s.segBtn, i === sc.hover && s.segBtnOn)}
          onClick={(e) => {
            if (e.detail === 0) onChange(o.value)
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ── GlassTabs ────────────────────────────────────────────── */
export interface GlassTab<K extends string> {
  key: K
  label: string
}
/** 8.0: a sideways row of frosted pills under a glass header (Immersion, All Ondas). The chosen pill turns solid white
 *  and scrolls into view. Not a Chip: chips stay as they are elsewhere. */
export function GlassTabs<K extends string>({ items, value, onChange, label }: { items: GlassTab<K>[]; value: K; onChange: (k: K) => void; label: string }) {
  const row = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = row.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    const r = row.current
    if (!el || !r) return
    const left = el.offsetLeft - 16
    const right = el.offsetLeft + el.offsetWidth + 16 - r.clientWidth
    const behavior = reducedMotion() ? 'auto' : 'smooth'
    if (r.scrollLeft > left) r.scrollTo({ left, behavior })
    else if (r.scrollLeft < right) r.scrollTo({ left: right, behavior })
  }, [value])
  return (
    <div ref={row} className={`hscroll ${s.gTabs}`} role="tablist" aria-label={label}>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          role="tab"
          aria-selected={it.key === value}
          className={it.key === value ? `${s.gTab} ${s.gTabOn}` : s.gTab}
          onClick={() => {
            if (it.key !== value) haptic('select')
            onChange(it.key)
          }}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}
