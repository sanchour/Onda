import { useSyncExternalStore } from 'react'
import { DESK_QUERY, isDesk } from './desk'

/* Light effects (8.0). Glass blur, turning emblems and page grain are lovely on a phone or a fast Mac and make scrolling
   stutter on an older laptop. With light effects on (html[data-lite]) every backdrop blur becomes a solid surface, the page
   grain goes and nothing animates for ever (rules marked "Light effects" in the stylesheets).
   "auto" turns them on for a desktop with few cores or little memory, for a Windows laptop on Intel's built-in graphics
   (8.1), and for one whose frames have been seen to run slow while scrolling; that is remembered for the next launch. Appearance lets the owner choose on or off instead.
   The choice belongs to this device, not to the account, so it lives in localStorage. index.html applies it before the
   first paint with the same rules. */

export type LiteMode = 'auto' | 'on' | 'off'
const KEY = 'onda.lite'
const SEEN = 'onda.liteSeen'
const GPU = 'onda.liteGpu'
const listeners = new Set<() => void>()

const read = (k: string) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}

export function liteMode(): LiteMode {
  const v = read(KEY)
  return v === 'on' || v === 'off' ? v : 'auto'
}

/** A machine that is likely to struggle with layered blur: four threads or fewer, or 4 GB of memory or less. */
function weak(): boolean {
  const n = navigator as Navigator & { deviceMemory?: number }
  return (n.hardwareConcurrency ?? 8) <= 4 || (n.deviceMemory ?? 8) <= 4
}

export function liteOn(): boolean {
  const m = liteMode()
  if (m !== 'auto') return m === 'on'
  return isDesk() && (weak() || read(SEEN) === '1' || read(GPU) === '1')
}

/** A Windows laptop drawing with Intel's built-in graphics (HD, UHD, Iris) or with no graphics chip at all: a few layers
 *  of blur are enough to make it stutter, whatever its processor. Asked once, through WebGL, and remembered. */
function slowGpu(): boolean {
  try {
    if (!/Windows|CrOS|Linux/.test(navigator.userAgent)) return false
    const gl = document.createElement('canvas').getContext('webgl')
    if (!gl) return true
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER))
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return /Intel.*(HD|UHD|Iris)|SwiftShader|llvmpipe|Basic Render|Software/i.test(name)
  } catch {
    return false
  }
}

function apply() {
  const root = document.documentElement
  if (liteOn()) root.dataset.lite = '1'
  else delete root.dataset.lite
  listeners.forEach((l) => l())
}

export function setLiteMode(m: LiteMode) {
  try {
    if (m === 'auto') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, m)
    // choosing again starts the watch afresh
    localStorage.removeItem(SEEN)
  } catch {
    /* private mode */
  }
  apply()
}

/** Applies the choice, then on a desktop in "auto" watches the first few scrolls: if their frames run slow
 *  (a median over 28ms, under 36 frames a second), light effects turn on and stay on for this device. */
export function initLite() {
  if (isDesk() && read(GPU) === null) {
    try {
      localStorage.setItem(GPU, slowGpu() ? '1' : '0')
    } catch {
      /* private mode */
    }
  }
  apply()
  if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') return
  let bursts = 0
  let sampling = false
  const sample = () => {
    if (sampling || liteMode() !== 'auto' || liteOn() || !isDesk()) return
    sampling = true
    const times: number[] = []
    let last = performance.now()
    const tick = (t: number) => {
      times.push(t - last)
      last = t
      if (times.length < 40) return void requestAnimationFrame(tick)
      sampling = false
      bursts++
      times.sort((a, b) => a - b)
      if (times[Math.floor(times.length / 2)]! > 28) {
        try {
          localStorage.setItem(SEEN, '1')
        } catch {
          /* private mode */
        }
        apply()
      }
      if (bursts >= 4) document.removeEventListener('scroll', sample, true)
    }
    requestAnimationFrame(tick)
  }
  document.addEventListener('scroll', sample, { capture: true, passive: true })
  // a window dragged across the desktop breakpoint changes what auto means
  matchMedia(DESK_QUERY).addEventListener('change', apply)
}

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
/** Light effects are on (re-renders when that changes). */
export const useLite = () => useSyncExternalStore(subscribe, liteOn, () => false)
/** The owner's choice: auto, on or off. */
export const useLiteMode = () => useSyncExternalStore(subscribe, liteMode, () => 'auto' as LiteMode)
