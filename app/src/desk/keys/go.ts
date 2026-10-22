import { EASE_ENTER, reducedMotion } from '@/lib/motion'
import { useNav, type Route, type Tab } from '@/nav/store'

/* Navigation from the keyboard and the palette: the same jump the sidebar makes, with the same short settle of the
   stage (DeskShell animates its <main> the same way when a sidebar item is clicked). */

export function go(tab: Tab, routes?: Route[]) {
  useNav.getState().jump(tab, routes)
  if (reducedMotion()) return
  document.querySelector('main')?.animate([{ opacity: 0.55, transform: 'translate3d(0,6px,0)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE_ENTER })
}

/** The sections the sidebar lists, by shortcut key. Settings opens over the tab you are on, as the sidebar does. */
export const SECTION_KEYS: Record<string, () => void> = {
  t: () => go('ondas'),
  b: () => go('ondas', [{ name: 'allOndas' }]),
  l: () => go('lagos'),
  s: () => go('stats'),
  ',': () => go(useNav.getState().tab, [{ name: 'settings' }]),
}

/** Back one step: a pushed page pops. Returns false when there is nothing to go back to. */
export function back(): boolean {
  const live = useNav.getState().stack.filter((e) => !e.leaving)
  if (!live.length) return false
  useNav.getState().pop()
  return true
}
