import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { haptic } from '@/lib/haptics'
import s from './ui.module.css'

/* ── RulerPicker ──────────────────────────────────────────── */
interface RulerPickerProps {
  value: number
  min: number
  max: number
  unit?: string
  onChange: (v: number) => void
  ariaLabel?: string
  style?: CSSProperties
}
const PX = 100 // px per unit; minor tick every 10px

/** Horizontal ruler that scrolls under a fixed needle. Whole units only: it settles on the nearest mark. */
export function RulerPicker({ value, min, max, unit = '', onChange, ariaLabel, style }: RulerPickerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(342)
  const [v, setV] = useState(value)
  const last = useRef(value)
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth)
    el.scrollLeft = (value - min) * PX
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => clearTimeout(settle.current), [])

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    const nv = Math.max(min, Math.min(max, Math.round(min + el.scrollLeft / PX)))
    if (nv !== last.current) {
      last.current = nv
      setV(nv)
      haptic('select')
      onChange(nv)
    }
    clearTimeout(settle.current)
    settle.current = setTimeout(() => {
      const target = (last.current - min) * PX
      if (Math.abs(el.scrollLeft - target) > 1) el.scrollTo({ left: target, behavior: 'smooth' })
    }, 140)
  }

  const step = (d: number) => {
    const nv = Math.max(min, Math.min(max, last.current + d))
    ref.current?.scrollTo({ left: (nv - min) * PX, behavior: 'smooth' })
  }

  const ticks: number[] = []
  for (let i = 0; i <= (max - min) * 10; i++) ticks.push(i)

  return (
    <div className={s.ruler} style={style}>
      <div className={s.rulerValue} aria-hidden>
        {v} {unit}
      </div>
      <div className={s.rulerWrap}>
        <div
          ref={ref}
          className={`hscroll ${s.rulerScroll}`}
          role="slider"
          tabIndex={0}
          aria-label={ariaLabel}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={v}
          aria-valuetext={`${v} ${unit}`}
          onScroll={onScroll}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') step(1)
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') step(-1)
          }}
        >
          <div className={s.rulerTrack} style={{ width: (max - min) * PX + w }}>
            {ticks.map((i) => {
              const major = i % 10 === 0
              return (
                <div key={i} className={major ? `${s.rulerTick} ${s.rulerTickMajor}` : s.rulerTick} style={{ left: w / 2 + i * 10 }}>
                  {major && <span className={s.rulerTickLabel}>{min + i / 10}</span>}
                </div>
              )
            })}
          </div>
        </div>
        <div className={s.rulerNeedle} />
      </div>
    </div>
  )
}

/* ── WheelPicker ──────────────────────────────────────────── */
export interface WheelColumn<T extends string | number = string | number> {
  items: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  ariaLabel?: string
}

function WheelCol({ items, value, onChange, rowHeight, visible, ariaLabel }: WheelColumn & { rowHeight: number; visible: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const idx = Math.max(0, items.findIndex((i) => i.value === value))
  const [live, setLive] = useState(idx)
  const pad = rowHeight * Math.floor(visible / 2)

  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = idx * rowHeight
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    const i = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / rowHeight)))
    if (i !== live) {
      setLive(i)
      haptic('select')
    }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const it = items[i]
      if (it && it.value !== value) onChange(it.value)
    }, 80)
  }

  return (
    <div
      ref={ref}
      className={s.wheelCol}
      style={{ height: rowHeight * visible }}
      role="listbox"
      aria-label={ariaLabel}
      tabIndex={0}
      onScroll={onScroll}
      onKeyDown={(e) => {
        const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
        if (d) ref.current?.scrollTo({ top: Math.max(0, Math.min(items.length - 1, live + d)) * rowHeight, behavior: 'smooth' })
      }}
    >
      <div style={{ height: pad }} />
      {items.map((it, i) => {
        const d = Math.abs(i - live)
        return (
          <button
            key={String(it.value)}
            type="button"
            role="option"
            aria-selected={i === live}
            tabIndex={-1}
            className={s.wheelItem}
            style={{ height: rowHeight, lineHeight: `${rowHeight}px`, opacity: d === 0 ? 1 : d === 1 ? 0.35 : 0.18 }}
            onClick={() => ref.current?.scrollTo({ top: i * rowHeight, behavior: 'smooth' })}
          >
            {it.label}
          </button>
        )
      })}
      <div style={{ height: pad }} />
    </div>
  )
}

export function WheelPicker({ columns, rowHeight = 36, visible = 5, style }: { columns: WheelColumn[]; rowHeight?: number; visible?: number; style?: CSSProperties }) {
  const pad = rowHeight * Math.floor(visible / 2)
  return (
    <div className={s.wheel} style={style}>
      <div className={s.wheelBand} style={{ top: pad, height: rowHeight }} />
      {columns.map((c, i) => (
        <WheelCol key={i} rowHeight={rowHeight} visible={visible} {...c} />
      ))}
    </div>
  )
}
