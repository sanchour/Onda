import { useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { haptic } from '@/lib/haptics'
import { grab, pointerVelocity, pushSample, rubber, springTo, tx, type Sample } from '@/lib/motion'

/** Glass lens that scrubs across N equal slots (tab bar, segmented control). Follows the finger 1:1,
 *  rubber-bands at the ends, settles with a velocity-aware spring, haptic per slot. */
export function useSlotScrub({ count, index, onCommit, pad = 4 }: { count: number; index: number; onCommit: (i: number) => void; pad?: number }) {
  const trackRef = useRef<HTMLElement | null>(null)
  const thumbRef = useRef<HTMLSpanElement | null>(null)
  const [w, setW] = useState(0)
  const [hover, setHover] = useState(index)
  const [pressed, setPressed] = useState(false)
  const S = useRef({ down: false, drag: false, sx: 0, h: index, s: [] as Sample[], x: 0, vel: 0, placed: false })

  useLayoutEffect(() => {
    const el = trackRef.current
    if (!el) return
    const measure = () => setW((el.clientWidth - pad * 2) / count)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [count, pad])

  useLayoutEffect(() => {
    const el = thumbRef.current
    const st = S.current
    if (!w || st.down || !el) return
    const to = index * w
    if (!st.placed) {
      el.style.transform = tx(to)
      st.placed = true
    } else springTo(el, { from: grab(el), to, velocity: st.vel, spring: 'snappy' })
    st.vel = 0
    st.h = index
    setHover(index)
  }, [index, w])

  const rect = () => trackRef.current!.getBoundingClientRect()
  const slot = (clientX: number) => Math.max(0, Math.min(count - 1, Math.floor((clientX - rect().left - pad) / w)))

  const finish = (clientX: number, cancel: boolean) => {
    const st = S.current
    const el = thumbRef.current
    if (!st.down || !el) return
    st.down = false
    setPressed(false)
    const v = st.drag ? pointerVelocity(st.s) : 0
    const f = cancel ? index : st.drag ? Math.max(0, Math.min(count - 1, Math.round(st.x / w))) : slot(clientX)
    if (f === index) springTo(el, { from: grab(el), to: index * w, velocity: v, spring: 'snappy' })
    else {
      st.vel = v
      haptic('select')
    }
    setHover(f)
    st.h = f
    if (f !== index) onCommit(f)
  }

  const handlers = {
    onPointerDown(e: RPointerEvent<HTMLElement>) {
      const el = thumbRef.current
      if (!w || e.button > 0 || !el) return
      const st = S.current
      st.down = true
      st.drag = false
      st.sx = e.clientX
      st.s = [[e.timeStamp, e.clientX]]
      e.currentTarget.setPointerCapture(e.pointerId)
      setPressed(true)
      const h = slot(e.clientX)
      if (h !== st.h) haptic('select')
      st.h = h
      setHover(h)
      springTo(el, { from: grab(el), to: h * w, spring: 'snappy' })
      st.x = h * w
    },
    onPointerMove(e: RPointerEvent<HTMLElement>) {
      const st = S.current
      const el = thumbRef.current
      if (!st.down || !el) return
      if (Math.abs(e.clientX - st.sx) > 4) st.drag = true
      if (!st.drag) return
      pushSample(st.s, e.timeStamp, e.clientX)
      grab(el)
      const x = rubber(e.clientX - rect().left - pad - w / 2, 0, (count - 1) * w)
      st.x = x
      el.style.transform = tx(x)
      const h = Math.max(0, Math.min(count - 1, Math.round(x / w)))
      if (h !== st.h) {
        st.h = h
        setHover(h)
        haptic('select')
      }
    },
    onPointerUp(e: RPointerEvent<HTMLElement>) {
      finish(e.clientX, false)
    },
    onPointerCancel(e: RPointerEvent<HTMLElement>) {
      finish(e.clientX, true)
    },
  }

  return { trackRef, thumbRef, w, hover, pressed, handlers }
}
