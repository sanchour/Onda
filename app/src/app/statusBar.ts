import { db } from '@/data/db'
import { useStore } from '@/data/store'
import { isIOS, isStandalone } from '@/lib/platform'
import { nav, type Route, type Tab } from '@/nav/store'

/* The bar behind the clock and battery on an iPhone.

   Since iOS 26 WebKit does not take that colour from theme-color. It looks a few pixels below the top edge of the page for
   an opaque fixed element and uses its background (LocalFrameView::fixedContainerEdges). It does this when the page loads
   and then keeps the colour, so a change of appearance while the app is open leaves the bar as it was until the next launch.
   Reports from real devices (see DECISIONS.md, 5.1) agree that only a fresh page load updates it.

   So there are two parts:
   1. #status-strip in index.html: an opaque strip, fixed to the top edge and at least 6px tall on iOS, painted in the page
      colour before the first paint. That is the element iOS samples. On installs where the page runs under the bar it is
      also simply what you see behind the clock.
   2. When the colour iOS sampled no longer matches the page, the app reloads itself and comes back on the same screen.
      A switch between light and dark does this at once. A smaller change (the wash of a new Onda) waits until the app
      goes to the background. It never happens while a sheet is open or something is being typed. */

const RESUME = 'onda.resume'
const TARGET = 'onda.barTarget'

const root = typeof document === 'undefined' ? null : document.documentElement
/** What index.html painted before the first paint, which is what iOS sampled for the bar. */
const launch = { bg: root?.style.getPropertyValue('--boot-bg').trim().toLowerCase() ?? '', dark: root?.dataset.theme === 'dark' }
let current = { ...launch }
let armed = false
let reloading = false

const stale = () => current.bg !== launch.bg || current.dark !== launch.dark
const target = () => `${current.dark ? 'd' : 'l'}${current.bg}`

function typing(): boolean {
  const a = document.activeElement as HTMLElement | null
  if (!a) return false
  // sliders, switches and the like hold no text that a reload could lose
  if (a.tagName === 'INPUT') return !['range', 'checkbox', 'radio', 'button', 'file', 'color', 'submit'].includes((a as HTMLInputElement).type)
  return a.tagName === 'TEXTAREA' || a.isContentEditable
}

/** Nothing would be lost by a reload right now. */
function idle(): boolean {
  const n = nav()
  return n.sheets.length === 0 && !n.menu && !typing() && !!useStore.getState().user?.settings.onboarded
}

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function clearTarget() {
  try {
    sessionStorage.removeItem(TARGET)
  } catch {
    /* private mode */
  }
}

async function reload(): Promise<void> {
  // One reload per colour: if iOS still shows the old one afterwards, reloading again would not help.
  if (reloading || read<string>(TARGET) === target()) return
  reloading = true
  try {
    const n = nav()
    const stack = n.stack.filter((e) => !e.leaving).map((e) => {
      const { key: _key, leaving: _leaving, ...route } = e
      return route
    })
    sessionStorage.setItem(RESUME, JSON.stringify({ at: Date.now(), tab: n.tab, stack, count: (read<{ count?: number }>(RESUME)?.count ?? Number(root?.dataset.resumed ?? 0)) + 1 }))
    sessionStorage.setItem(TARGET, JSON.stringify(target()))
  } catch {
    /* private mode: the app comes back on its first screen */
  }
  try {
    // The appearance setting is written in the background. Make sure it is on disk before the page goes away.
    const u = useStore.getState().user
    if (u) await db.table('user').put(u)
  } catch {
    /* the localStorage copy still carries the appearance across */
  }
  location.reload()
}

/** Replace the strip with a fresh element, which makes WebKit look at the top edge again where it is willing to. */
function refreshStrip() {
  const old = document.getElementById('status-strip')
  if (old) old.replaceWith(old.cloneNode(false))
}

/** Called by the shell whenever the page colour or the appearance changes. */
export function barChanged(bg: string, dark: boolean) {
  const next = { bg: bg.toLowerCase(), dark }
  const flipped = next.dark !== current.dark
  // The page matches what iOS sampled: the one-reload-per-colour guard can be lifted
  if (next.bg === launch.bg && next.dark === launch.dark) clearTarget()
  if (next.bg === current.bg && !flipped) return
  current = next
  refreshStrip()
  if (!isIOS() || !launch.bg) return
  if (!stale()) {
    armed = false
    return
  }
  armed = true
  // Light to dark or back is something you look at straight away, so do not wait for the app to be put away.
  if (current.dark !== launch.dark) setTimeout(() => stale() && current.dark !== launch.dark && idle() && void reload(), 350)
}

let leaving = false
let pickerAt = 0

if (typeof document !== 'undefined') {
  // The page is being left for another one (a consent page, a checkout): a reload now would cancel that.
  window.addEventListener('pagehide', () => (leaving = true))
  window.addEventListener('pageshow', () => (leaving = false))
  // A file or photo picker can put the page in the background while it is open. Its result must not be lost.
  document.addEventListener('click', (e) => (e.target as HTMLElement | null)?.closest?.('input[type=file],label') && (pickerAt = Date.now()), true)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden' || !armed) return
    setTimeout(() => {
      if (!leaving && document.visibilityState === 'hidden' && armed && stale() && idle() && Date.now() - pickerAt > 120_000) void reload()
    }, 250)
  })
}

/** After a reload for the bar: the screen the person was on. Read once. */
export function takeResume(): { tab: Tab; stack: Route[] } | null {
  const r = read<{ at: number; tab: Tab; stack: Route[]; count: number }>(RESUME)
  if (!r) return null
  try {
    sessionStorage.setItem(RESUME, JSON.stringify({ count: r.count }))
  } catch {
    /* private mode */
  }
  if (!r.at || Date.now() - r.at > 10 * 60_000 || !Array.isArray(r.stack)) return null
  if (root) root.dataset.resumed = String(r.count)
  return { tab: r.tab, stack: r.stack }
}

/** For the Settings screen: how this copy of the app meets the status bar. Helps when reporting a problem. */
export function barKind(): 'browser' | 'system' | 'page' {
  if (!isStandalone()) return 'browser'
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:env(safe-area-inset-top,0px);visibility:hidden'
  document.body.appendChild(probe)
  const inset = probe.offsetHeight
  probe.remove()
  return inset > 0 ? 'page' : 'system'
}
