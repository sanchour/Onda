/* Motion helpers, ported from the design system's motion.jsx. Everything animates transform/opacity only,
   through the Web Animations API. Springs are sampled from real physics so gestures hand off their velocity. */

export type SpringName = 'snappy' | 'smooth' | 'gentle'
const PRESETS: Record<SpringName, { k: number; c: number }> = {
  snappy: { k: 400, c: 30 },
  smooth: { k: 220, c: 26 },
  gentle: { k: 120, c: 20 },
}

export function reducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Sample a damped spring (unit mass) into evenly spaced frames. Velocity-aware (px/s). */
export function springFrames(from: number, to: number, velocity = 0, name: SpringName = 'snappy') {
  const { k, c } = PRESETS[name]
  const dt = 1 / 120
  let x = from
  let v = velocity
  let t = 0
  let still = 0
  const frames = [x]
  while (t < 2.5) {
    v += (-k * (x - to) - c * v) * dt
    x += v * dt
    t += dt
    frames.push(x)
    if (Math.abs(x - to) < 0.05 && Math.abs(v) < 1) {
      if (++still > 3) break
    } else still = 0
  }
  frames[frames.length - 1] = to
  return { frames, duration: Math.max(60, t * 1000) }
}

type Springy = HTMLElement & { _spring?: Animation | null }

export const tx = (x: number) => `translate3d(${x}px,0,0)`
export const ty = (y: number) => `translate3d(0,${y}px,0)`

export function currentX(el: HTMLElement): number {
  const m = getComputedStyle(el).transform
  return !m || m === 'none' ? 0 : new DOMMatrixReadOnly(m).m41
}
export function currentY(el: HTMLElement): number {
  const m = getComputedStyle(el).transform
  return !m || m === 'none' ? 0 : new DOMMatrixReadOnly(m).m42
}

/** Interrupt a running spring and freeze the element where it is (interruptible + reversible). */
export function grab(el: HTMLElement, read: (el: HTMLElement) => number = currentX): number {
  const v = read(el)
  const s = el as Springy
  if (s._spring) {
    const a = s._spring
    s._spring = null
    a.cancel()
  }
  return v
}

export interface SpringOpts {
  from: number
  to: number
  velocity?: number
  spring?: SpringName
  prop?: (v: number) => string
  onDone?: () => void
}

/** Spring an element along one axis. will-change lives only while animating. Reduced motion: jump and fade. */
export function springTo(el: HTMLElement, o: SpringOpts): Animation | null {
  const prop = o.prop ?? tx
  const s = el as Springy
  if (s._spring) {
    const a = s._spring
    s._spring = null
    a.cancel()
  }
  if (reducedMotion() || typeof el.animate !== 'function') {
    el.style.transform = prop(o.to)
    el.animate?.([{ opacity: 0.5 }, { opacity: 1 }], { duration: 120 })
    o.onDone?.()
    return null
  }
  const f = springFrames(o.from, o.to, o.velocity, o.spring ?? 'snappy')
  el.style.willChange = 'transform'
  const a = el.animate(
    f.frames.map((x) => ({ transform: prop(x) })),
    { duration: f.duration, easing: 'linear' },
  )
  el.style.transform = prop(o.to)
  s._spring = a
  a.onfinish = () => {
    el.style.willChange = ''
    if (s._spring === a) s._spring = null
    o.onDone?.()
  }
  a.oncancel = () => {
    el.style.willChange = ''
  }
  return a
}

/** Rubber-band: resist past [min,max]. */
export function rubber(x: number, min: number, max: number, k = 0.35): number {
  return x < min ? min + (x - min) * k : x > max ? max + (x - max) * k : x
}

export type Sample = [time: number, pos: number]
/** Pointer velocity in px/s from the last few samples. */
export function pointerVelocity(samples: Sample[]): number {
  if (samples.length < 2) return 0
  const a = samples[0]!
  const b = samples[samples.length - 1]!
  const dt = (b[0] - a[0]) / 1000
  return dt > 0 ? (b[1] - a[1]) / dt : 0
}
export function pushSample(samples: Sample[], t: number, p: number) {
  samples.push([t, p])
  if (samples.length > 5) samples.shift()
}

export const EASE_ENTER = 'cubic-bezier(.2,.8,.2,1)'
export const EASE_EXIT = 'cubic-bezier(.4,0,1,1)'
export const PUSH_MS = 360
