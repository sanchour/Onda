import { useEffect, useRef, useState } from 'react'
import { reducedMotion } from '@/lib/motion'

/* Small helpers shared by the desktop overlays (palette, shortcut sheet, focus): staying mounted for an exit
   animation, keeping Tab inside a modal, and handing focus back to whatever had it before. */

/** True while `open`, and for `ms` after it turns false so the overlay can play its exit. */
export function usePresence(open: boolean, ms: number): boolean {
  const [mounted, setMounted] = useState(open)
  useEffect(() => {
    if (open) return setMounted(true)
    const t = setTimeout(() => setMounted(false), reducedMotion() ? 0 : ms)
    return () => clearTimeout(t)
  }, [open, ms])
  return open || mounted
}

const FOCUSABLE = 'button:not([disabled]):not([tabindex="-1"]),input:not([disabled]),[href],[tabindex]:not([tabindex="-1"])'

/** Keep Tab and Shift+Tab cycling inside `root` (an aria-modal dialog). */
export function trapTab(e: KeyboardEvent | React.KeyboardEvent, root: HTMLElement | null) {
  if (e.key !== 'Tab' || !root) return
  const els = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
  if (!els.length) return e.preventDefault()
  const first = els[0]!
  const last = els[els.length - 1]!
  const at = document.activeElement
  if (e.shiftKey && (at === first || !root.contains(at))) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && (at === last || !root.contains(at))) {
    e.preventDefault()
    first.focus()
  }
}

/** Remembers what had focus when a dialog opened; `restore()` gives it back (once), if it is still on the page. */
export function useReturnFocus() {
  const prev = useRef<HTMLElement | null>(typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null))
  const done = useRef(false)
  const restore = () => {
    if (done.current) return
    done.current = true
    const el = prev.current
    if (el && el.isConnected && el !== document.body) el.focus({ preventScroll: true })
    else (document.activeElement as HTMLElement | null)?.blur?.()
  }
  // closing by any other path (the store flag flipping) still hands focus back
  useEffect(() => restore, []) // eslint-disable-line react-hooks/exhaustive-deps
  return restore
}

/** Typing into a field: single-key shortcuts stand aside. */
export const isTyping = (el: EventTarget | null) => {
  const e = el as HTMLElement | null
  return !!e && (e.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName))
}
