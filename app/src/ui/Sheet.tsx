import { useEffect, useLayoutEffect, useRef, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { haptic } from '@/lib/haptics'
import { EASE_ENTER, currentY, grab, pointerVelocity, pushSample, rubber, springTo, ty, type Sample } from '@/lib/motion'
import s from './ui.module.css'

interface SheetProps {
  /** False starts the exit animation; `onExited` fires when it has finished. */
  open: boolean
  title?: string
  leading?: ReactNode
  trailing?: ReactNode
  /** Fraction of the full sheet height, e.g. 0.6. Full height when omitted. */
  detent?: number
  background?: string
  /** Scrim tap. Defaults to dismissing. */
  onScrimClick?: () => void
  /** Called after the sheet has left the screen, by gesture or by `open` turning false. */
  onExited: () => void
  children: ReactNode
  style?: CSSProperties
}

/** Bottom sheet that rises on a spring, follows the finger, rubber-bands past its detent and
 *  dismisses on a downward swipe. Content scrolls inside; dragging starts only when it is scrolled to the top. */
export function Sheet({ open, title, leading, trailing, detent = 1, background, onScrimClick, onExited, children, style }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null)
  const scrim = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const D = useRef({ down: false, drag: false, sy: 0, y0: 0, y: 0, s: [] as Sample[], gone: false })
  const exited = useRef(onExited)
  exited.current = onExited

  const ph = () => panel.current?.offsetHeight ?? 0
  const fade = (y: number) => {
    if (scrim.current) scrim.current.style.opacity = String(Math.max(0, Math.min(1, 1 - y / Math.max(1, ph()))))
  }
  const dismiss = (v = 0) => {
    const p = panel.current
    const d = D.current
    if (!p || d.gone) return
    d.gone = true
    springTo(p, { from: grab(p, currentY), to: ph() + 12, velocity: v, spring: 'smooth', prop: ty, onDone: () => exited.current() })
    scrim.current?.animate([{ opacity: Number(scrim.current.style.opacity) || 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' })
  }

  // Enter
  useLayoutEffect(() => {
    const p = panel.current
    if (!p) return
    springTo(p, { from: ph(), to: 0, spring: 'smooth', prop: ty })
    if (scrim.current) {
      scrim.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: EASE_ENTER })
      scrim.current.style.opacity = '1'
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Programmatic close
  useEffect(() => {
    if (!open) dismiss(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Focus management + Escape
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    panel.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        ;(onScrimClick ?? dismiss)()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus?.({ preventScroll: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Claim downward drags that start at the top of the content before the browser turns them into a scroll.
  useEffect(() => {
    const p = panel.current
    if (!p) return
    let sy = 0
    let claim: boolean | null = null
    const start = (e: TouchEvent) => {
      sy = e.touches[0]?.clientY ?? 0
      claim = null
    }
    const move = (e: TouchEvent) => {
      if (claim === null) {
        const t = e.target as HTMLElement
        const sc = scroller.current
        const atTop = !sc || !sc.contains(t) || sc.scrollTop <= 0
        claim = (e.touches[0]?.clientY ?? 0) - sy > 0 && atTop && !t.closest('input,textarea,[role=slider],[role=listbox],[data-no-drag]')
      }
      if (claim && e.cancelable) e.preventDefault()
    }
    p.addEventListener('touchstart', start, { passive: true })
    p.addEventListener('touchmove', move, { passive: false })
    return () => {
      p.removeEventListener('touchstart', start)
      p.removeEventListener('touchmove', move)
    }
  }, [])

  // Keep the focused field above the keyboard
  const onFocus = (e: React.FocusEvent) => {
    const el = e.target as HTMLElement
    if (el.matches('input,textarea')) setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 280)
  }

  const up = () => {
    const d = D.current
    const p = panel.current
    if (!d.down || !p) return
    d.down = false
    if (!d.drag) return
    const v = pointerVelocity(d.s)
    const proj = d.y + v * 0.15
    if (proj > ph() * 0.25) {
      haptic('impact')
      dismiss(v)
      return
    }
    springTo(p, { from: grab(p, currentY), to: 0, velocity: v, spring: 'smooth', prop: ty })
    fade(0)
  }

  return (
    <div className={s.sheetRoot}>
      <div ref={scrim} className={s.sheetScrim} onClick={() => (onScrimClick ?? dismiss)()} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title || undefined}
        tabIndex={-1}
        className={s.sheetPanel}
        style={{ '--detent': detent, background, ...style } as CSSProperties}
        onFocus={onFocus}
        onPointerDown={(e: RPointerEvent<HTMLDivElement>) => {
          const d = D.current
          const t = e.target as HTMLElement
          if (d.gone || t.closest('input,textarea,[role=switch],[role=slider],[role=tablist],[role=listbox],[data-no-drag]')) return
          if (scroller.current && scroller.current.contains(t) && scroller.current.scrollTop > 0) return
          d.down = true
          d.drag = false
          d.sy = e.clientY
          d.s = [[e.timeStamp, e.clientY]]
        }}
        onPointerMove={(e) => {
          const d = D.current
          const p = panel.current
          if (!d.down || !p) return
          const dy = e.clientY - d.sy
          if (!d.drag) {
            if (Math.abs(dy) < 6) return
            // An upward move over scrollable content is a scroll, not a drag.
            if (dy < 0 && scroller.current?.contains(e.target as Node)) {
              d.down = false
              return
            }
            d.drag = true
            d.y0 = grab(p, currentY)
            e.currentTarget.setPointerCapture(e.pointerId)
            ;(document.activeElement as HTMLElement | null)?.blur?.()
          }
          pushSample(d.s, e.timeStamp, e.clientY)
          d.y = rubber(d.y0 + dy, 0, ph() + 12, 0.3)
          p.style.transform = ty(d.y)
          fade(d.y)
        }}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <div aria-hidden className={s.sheetGrab}>
          <span />
        </div>
        {(title !== undefined || leading || trailing) && (
          <div className={s.sheetHeader}>
            <div className={s.sheetSide}>{leading}</div>
            {title && <h1 className={s.sheetTitle}>{title}</h1>}
            <div className={`${s.sheetSide} ${s.sheetSideEnd}`}>{trailing}</div>
          </div>
        )}
        <div ref={scroller} className={`scroll ${s.sheetBody}`}>
          {children}
        </div>
      </div>
    </div>
  )
}
