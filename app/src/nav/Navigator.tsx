import { useEffect, useLayoutEffect, useRef, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { haptic } from '@/lib/haptics'
import { EASE_ENTER, PUSH_MS, grab, pointerVelocity, pushSample, reducedMotion, rubber, springTo, tx, type Sample } from '@/lib/motion'
import s from './nav.module.css'
import { useNav, type StackEntry } from './store'

const PARALLAX = -0.28 // the page underneath trails behind, as in UIKit

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

  // Edge-swipe back: the page follows the finger from the left edge, then springs away or back.
  const edge = {
    onPointerDown(e: RPointerEvent<HTMLDivElement>) {
      const el = ref.current
      if (!el || !isTop || entry.leaving) return
      const st = S.current
      st.down = true
      st.sx = e.clientX
      st.x = 0
      st.W = el.offsetWidth || 1
      st.s = [[e.timeStamp, e.clientX]]
      e.currentTarget.setPointerCapture(e.pointerId)
      grab(el)
      const u = getUnder()
      if (u) u.style.visibility = ''
    },
    onPointerMove(e: RPointerEvent<HTMLDivElement>) {
      const st = S.current
      const el = ref.current
      if (!st.down || !el) return
      pushSample(st.s, e.timeStamp, e.clientX)
      st.x = rubber(e.clientX - st.sx, 0, st.W, 0.2)
      el.style.transform = tx(st.x)
      moveUnder(1 - st.x / st.W)
    },
    onPointerUp() {
      const st = S.current
      const el = ref.current
      if (!st.down || !el) return
      st.down = false
      const v = pointerVelocity(st.s)
      const go = st.x + v * 0.2 > st.W * 0.5
      if (go) haptic('impact')
      springTo(el, { from: st.x, to: go ? st.W : 0, velocity: v, spring: 'smooth', onDone: () => go && remove(entry.key) })
      settleUnder(go ? 0 : 1, 300)
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
    >
      {children}
      {isTop && <div className={s.edge} {...edge} onPointerCancel={edge.onPointerUp} />}
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
      if (top && !top.leaving && under) under.style.visibility = 'hidden'
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
