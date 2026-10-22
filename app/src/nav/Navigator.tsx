import { useEffect, useLayoutEffect, useRef, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { haptic } from '@/lib/haptics'
import { EASE_ENTER, PUSH_MS, grab, pointerVelocity, pushSample, reducedMotion, rubber, springTo, tx, type Sample } from '@/lib/motion'
import s from './nav.module.css'
import { useNav, type StackEntry } from './store'

const PARALLAX = -0.28 // the page underneath trails behind, as in UIKit

/** Stops whatever animation runs on `el` and keeps it where it is on screen, so a new gesture starts from there. */
function hold(el: HTMLElement) {
  const m = getComputedStyle(el).transform
  el.getAnimations().forEach((a) => a.cancel())
  el.style.transform = m === 'none' ? '' : m
}

/** True when the touch starts on something that handles sideways drags itself, so a swipe back must not take it. */
function ownsGesture(target: EventTarget | null, page: HTMLElement | null): boolean {
  for (let n = target instanceof HTMLElement ? target : null; n && n !== page; n = n.parentElement) {
    if (n.matches('input, textarea, select, [contenteditable="true"], [role="slider"], [role="switch"]')) return true
    if (n.classList.contains('scroll')) return false // the page's own vertical scroller: everything above it is chrome
    const cs = getComputedStyle(n)
    if (cs.touchAction !== 'auto' && cs.touchAction !== 'manipulation') return true
    if (n.scrollWidth > n.clientWidth + 1 && /auto|scroll/.test(cs.overflowX)) return true
  }
  return false
}

interface PageProps {
  entry: StackEntry
  /** Element directly underneath (previous page, or the tab root). */
  getUnder: () => HTMLElement | null
  isTop: boolean
  /** Covered by a page that has finished arriving: hidden so it costs nothing to composite. */
  covered: boolean
  register: (key: string, el: HTMLElement | null) => void
  children: ReactNode
}

function Page({ entry, getUnder, isTop, covered, register, children }: PageProps) {
  const ref = useRef<HTMLDivElement>(null)
  const remove = useNav((n) => n.remove)
  const pop = useNav((n) => n.pop)
  const S = useRef({ down: false, sx: 0, x: 0, W: 1, s: [] as Sample[] })

  const moveUnder = (progress: number) => {
    // progress 1 = this page fully covers the one beneath
    const u = getUnder()
    if (u) u.style.transform = `translate3d(${PARALLAX * 100 * progress}%,0,0)`
  }
  const settleUnder = (to: number, ms = PUSH_MS) => {
    const u = getUnder()
    if (!u) return
    const from = u.style.transform || 'translate3d(0,0,0)'
    const end = `translate3d(${PARALLAX * 100 * to}%,0,0)`
    u.style.transform = to === 0 ? '' : end
    if (!reducedMotion()) u.animate([{ transform: from }, { transform: end }], { duration: ms, easing: EASE_ENTER })
  }

  // Enter: slide in from the right (fade when motion is reduced)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    register(entry.key, el)
    const u = getUnder()
    if (u) u.style.visibility = ''
    if (reducedMotion()) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 })
    } else {
      el.animate([{ transform: 'translate3d(100%,0,0)' }, { transform: 'translate3d(0,0,0)' }], { duration: PUSH_MS, easing: EASE_ENTER })
      settleUnder(1)
    }
    return () => register(entry.key, null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Programmatic pop: slide out, then leave the stack
  useEffect(() => {
    const el = ref.current
    if (!entry.leaving || !el) return
    const u = getUnder()
    if (u) u.style.visibility = ''
    if (reducedMotion()) {
      const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' })
      a.onfinish = () => remove(entry.key)
      settleUnder(0, 0)
      return
    }
    const from = grab(el)
    const a = el.animate([{ transform: tx(from) }, { transform: 'translate3d(100%,0,0)' }], { duration: PUSH_MS * 0.8, easing: EASE_ENTER, fill: 'forwards' })
    a.onfinish = () => remove(entry.key)
    settleUnder(0, PUSH_MS * 0.8)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.leaving])

  // Swipe back, as on iOS: from the left edge at once, or from anywhere on the page once a drag is clearly to the right.
  // The page follows the finger; on release it and the page beneath spring together on one curve, away or back.
  const cand = useRef<{ id: number; x: number; y: number } | null>(null)
  const unclick = useRef<(() => void) | null>(null)
  const begin = (e: RPointerEvent<HTMLDivElement>) => {
    const el = ref.current
    const st = S.current
    if (!el || !isTop || entry.leaving || st.down) return
    st.down = true
    st.sx = e.clientX
    st.x = 0
    st.W = el.offsetWidth || 1
    st.s = [[e.timeStamp, e.clientX]]
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // the pointer already ended: nothing to capture
    }
    el.dataset.dragging = '1'
    grab(el)
    const u = getUnder()
    if (u) {
      hold(u)
      u.style.visibility = ''
    }
    // a drag is not a tap: the release must not also press whatever is under the finger
    const stop = (ev: Event) => {
      ev.stopPropagation()
      ev.preventDefault()
    }
    window.addEventListener('click', stop, true)
    unclick.current = () => window.removeEventListener('click', stop, true)
  }
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    const st = S.current
    const el = ref.current
    if (!st.down || !el) return
    pushSample(st.s, e.timeStamp, e.clientX)
    st.x = rubber(e.clientX - st.sx, 0, st.W, 0.2)
    el.style.transform = tx(st.x)
    moveUnder(1 - st.x / st.W)
  }
  const end = (e: RPointerEvent<HTMLDivElement>) => {
    const st = S.current
    const el = ref.current
    if (!st.down || !el) return
    st.down = false
    delete el.dataset.dragging
    const off = unclick.current
    unclick.current = null
    setTimeout(() => off?.(), 350)
    // a pause before letting go counts as no fling
    if (e.type === 'pointerup') pushSample(st.s, e.timeStamp, e.clientX)
    const v = pointerVelocity(st.s)
    const W = st.W
    const go = st.x + v * 0.2 > W * 0.5
    if (go) haptic('impact')
    springTo(el, { from: st.x, to: go ? W : 0, velocity: v, spring: 'smooth', onDone: () => go && remove(entry.key) })
    const u = getUnder()
    if (u) {
      springTo(u, {
        from: st.x,
        to: go ? W : 0,
        velocity: v,
        spring: 'smooth',
        prop: (x) => `translate3d(${PARALLAX * 100 * (1 - x / W)}%,0,0)`,
        onDone: () => {
          if (go) u.style.transform = ''
          else if (!S.current.down) u.style.visibility = 'hidden' // covered again: costs nothing to composite
        },
      })
    }
  }
  // Anywhere on the page: wait until the drag shows its direction. Up or down is a scroll; clearly right is a swipe back.
  // Controls that own their own sideways gestures (rows that scroll sideways, decks, sliders, switches, text) keep them.
  const page = {
    onPointerDown(e: RPointerEvent<HTMLDivElement>) {
      cand.current = null
      if (!isTop || entry.leaving || S.current.down || e.pointerType === 'mouse' || ownsGesture(e.target, ref.current)) return
      cand.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
    },
    onPointerMove(e: RPointerEvent<HTMLDivElement>) {
      if (S.current.down) return move(e)
      const c = cand.current
      if (!c || c.id !== e.pointerId) return
      const dx = e.clientX - c.x
      const dy = e.clientY - c.y
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) cand.current = null
      else if (dx > 12 && dx > Math.abs(dy) * 1.3) {
        cand.current = null
        begin(e)
      }
    },
    onPointerUp(e: RPointerEvent<HTMLDivElement>) {
      cand.current = null
      end(e)
    },
    onPointerCancel(e: RPointerEvent<HTMLDivElement>) {
      cand.current = null
      end(e)
    },
  }

  return (
    <div
      ref={ref}
      className={s.page}
      style={covered ? { visibility: 'hidden' } : undefined}
      aria-hidden={!isTop}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && isTop) pop()
      }}
      {...page}
    >
      {children}
      {isTop && <div className={s.edge} onPointerDown={begin} />}
    </div>
  )
}

interface NavigatorProps {
  root: ReactNode
  renderRoute: (entry: StackEntry) => ReactNode
}

/** Stack navigator: a tab root with pushed pages on top. Pages slide in over about 360ms and support edge-swipe back. */
export function Navigator({ root, renderRoute }: NavigatorProps) {
  const stack = useNav((n) => n.stack)
  const rootRef = useRef<HTMLDivElement>(null)
  const els = useRef(new Map<string, HTMLElement>())
  const register = (key: string, el: HTMLElement | null) => {
    if (el) els.current.set(key, el)
    else els.current.delete(key)
  }

  // Once the top page has arrived, hide what it covers; reveal it again when the stack shrinks.
  const settled = useRef<ReturnType<typeof setTimeout>>(undefined)
  const topKey = stack[stack.length - 1]?.key
  const leaving = !!stack[stack.length - 1]?.leaving
  useEffect(() => {
    clearTimeout(settled.current)
    if (leaving) return // a pop is under way: the page beneath must stay visible
    const hideCovered = () => {
      const now = useNav.getState().stack // read fresh: the stack may have changed since this timer was set
      const top = now[now.length - 1]
      const under = now.length > 1 ? els.current.get(now[now.length - 2]!.key) : rootRef.current
      // never mid-swipe: the page beneath is what the finger is uncovering
      if (top && !top.leaving && under && !els.current.get(top.key)?.dataset.dragging) under.style.visibility = 'hidden'
    }
    if (stack.length === 0 && rootRef.current) {
      rootRef.current.style.visibility = ''
      rootRef.current.style.transform = ''
    } else settled.current = setTimeout(hideCovered, PUSH_MS + 40)
    return () => clearTimeout(settled.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topKey, stack.length, leaving])

  return (
    <div className={s.nav}>
      <div ref={rootRef} className={s.root} aria-hidden={stack.length > 0}>
        {root}
      </div>
      {stack.map((entry, i) => (
        <Page
          key={entry.key}
          entry={entry}
          isTop={i === stack.length - 1}
          covered={i < stack.length - 2}
          register={register}
          getUnder={() => (i === 0 ? rootRef.current : (els.current.get(stack[i - 1]!.key) ?? null))}
        >
          {renderRoute(entry)}
        </Page>
      ))}
    </div>
  )
}
