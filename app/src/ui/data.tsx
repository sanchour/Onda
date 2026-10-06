import type { CSSProperties, ReactNode } from 'react'
import s from './ui.module.css'

const clamp01 = (v: number) => Math.max(0, Math.min(1, v || 0))

interface ProgressBarProps {
  value: number
  /** CSS color for the fill. */
  tone?: string
  height?: number
  style?: CSSProperties
  label?: string
}
/** Rounded progress track. The fill moves with a transform, never by animating width. */
export function ProgressBar({ value, tone = 'var(--accent)', height = 6, style, label }: ProgressBarProps) {
  const v = clamp01(value)
  return (
    <div className={s.bar} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} style={{ height, ...style }}>
      <div className={s.barFill} style={{ background: tone, transform: `translate3d(${-(1 - v) * 100}%,0,0)`, opacity: v > 0 ? 1 : 0 }} />
    </div>
  )
}

interface ProgressRingProps {
  value: number
  size?: number
  stroke?: number
  color?: string
  track?: string
  children?: ReactNode
  style?: CSSProperties
}
export function ProgressRing({ value, size = 56, stroke = 6, color = 'var(--viz-green-strong)', track = 'var(--viz-track)', children, style }: ProgressRingProps) {
  const r = (size - stroke) / 2
  const C = 2 * Math.PI * r
  const p = { cx: size / 2, cy: size / 2, r, fill: 'none', strokeWidth: stroke, strokeLinecap: 'round' as const }
  return (
    <div className={s.ring} style={{ width: size, height: size, ...style }}>
      <svg aria-hidden width={size} height={size} className={s.ringSvg}>
        <circle {...p} stroke={track} />
        {value > 0 && <circle {...p} className={s.ringArc} stroke={color} strokeDasharray={`${C * clamp01(value)} ${C}`} />}
      </svg>
      <div className={s.ringInner}>{children}</div>
    </div>
  )
}

export function StepBar({ value, style }: { value: number; style?: CSSProperties }) {
  return (
    <div className={s.stepBar} style={style} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamp01(value) * 100)}>
      <div className={s.stepBarFill} style={{ transform: `scaleX(${clamp01(value)})` }} />
    </div>
  )
}

export function Avatar({ initials, size = 64 }: { initials: string; size?: number }) {
  return (
    <span aria-hidden className={s.avatar} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}>
      {initials}
    </span>
  )
}
