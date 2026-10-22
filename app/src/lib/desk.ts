import { useSyncExternalStore } from 'react'

/* Desktop layout. At this width and above Onda becomes a desktop app: a sidebar, a stage for the screens, dialogs
   instead of bottom sheets. Phones never reach it (an iPhone in landscape is at most 956pt wide); an iPad in
   landscape and every laptop do. index.html sets html[data-desk] from the same query before the first paint,
   so CSS can use `:global(html[data-desk])` and never flashes the phone layout first. */

export const DESK_QUERY = '(min-width: 1100px)'

const mq = () => (typeof matchMedia === 'undefined' ? null : matchMedia(DESK_QUERY))

export function isDesk(): boolean {
  return !!mq()?.matches
}

function subscribe(cb: () => void) {
  const m = mq()
  m?.addEventListener('change', cb)
  return () => m?.removeEventListener('change', cb)
}

/** True while the window is desktop sized. Re-renders when the window crosses the breakpoint. */
export function useDesk(): boolean {
  return useSyncExternalStore(subscribe, isDesk, () => false)
}

/** Platform shortcut key name for labels: ⌘ on Apple devices, Ctrl elsewhere. */
export const MOD_LABEL = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl'
