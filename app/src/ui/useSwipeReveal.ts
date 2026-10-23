import { useEffect, useRef, useState } from 'react'

/* Swipe a row left to reveal buttons behind it, as in iOS Mail (8.1: a practice's "How to", a journal entry's Delete).
   The gesture only claims the pointer once it is clearly sideways, so the list still scrolls. The row moves through its
   style, not through React state, so a drag costs no renders. Only one row is open at a time; a tap elsewhere closes it. */

let closeOpen: (() => void) | null = null

export function useSwipeReveal(width: number) {
  const row = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const g = useRef({ id: -1, x: 0, y: 0, base: 0, dx: 0, mode: '' as '' | 'x' | 'y', swallow: false })

  const place = (x: number, animate: boolean) => {
    const el = row.current
    if (!el) return
    el.style.transition = animate ? 'transform 260ms cubic-bezier(.2,.9,.3,1)' : 'none'
    el.style.transform = x ? `translateX(${x}px)` : ''
  }
  const close = () => {
    place(0, true)
    setOpen(false)
  }
  const show = () => {
    if (closeOpen && closeOpen !== close) closeOpen()
    closeOpen = close
    place(-width, true)
    setOpen(true)
  }

  // a tap anywhere outside the open row closes it
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!row.current?.parentElement?.contains(e.target as Node)) close()
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      if (closeOpen === close) closeOpen = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return
      g.current = { id: e.pointerId, x: e.clientX, y: e.clientY, base: open ? -width : 0, dx: 0, mode: '', swallow: false }
    },
    onPointerMove: (e: React.PointerEvent) => {
      const s = g.current
      if (e.pointerId !== s.id || s.mode === 'y') return
      const dx = e.clientX - s.x
      const dy = e.clientY - s.y
      if (!s.mode) {
        if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) return void (s.mode = 'y')
        if (Math.abs(dx) < 8) return
        s.mode = 'x'
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      }
      s.dx = dx
      let x = s.base + dx
      // rubber band past either end
      if (x > 0) x = x / 4
      if (x < -width) x = -width + (x + width) / 4
      place(x, false)
    },
    onPointerUp: (e: React.PointerEvent) => {
      const s = g.current
      if (e.pointerId !== s.id) return
      s.id = -1
      if (s.mode !== 'x') return
      // the click that ends a swipe is not a tap on the row
      s.swallow = true
      if (s.base + s.dx < -width / 2) show()
      else close()
    },
    onPointerCancel: () => {
      if (g.current.mode === 'x') (open ? show : close)()
      g.current.id = -1
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (g.current.swallow) {
        g.current.swallow = false
        e.stopPropagation()
        e.preventDefault()
      } else if (open) {
        // a tap on an open row closes it instead of acting
        e.stopPropagation()
        e.preventDefault()
        close()
      }
    },
  }

  return { row, open, show, close, handlers }
}
