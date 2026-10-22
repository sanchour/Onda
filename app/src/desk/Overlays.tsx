import { Suspense, lazy } from 'react'
import { useTodayPlan } from './focus/today'
import { useDeskKeys } from './keys/useDeskKeys'
import { useWindowTitle } from './keys/useWindowTitle'
import { useDeskUI } from './store'

/** Desktop-only overlays: the command palette, the keyboard shortcut sheet and the practice focus session, plus the
 *  keyboard and the window title. Lazy, so phones never download it. */

const Palette = lazy(() => import('./palette/Palette'))
const ShortcutSheet = lazy(() => import('./keys/ShortcutSheet'))
const Focus = lazy(() => import('./focus/Focus'))

export default function DeskOverlays() {
  const focus = useDeskUI((s) => s.focus)
  useDeskKeys(useTodayPlan())
  useWindowTitle(!!focus)
  return (
    <Suspense fallback={null}>
      <Palette />
      <ShortcutSheet />
      {focus && <Focus key={`${focus.runId}:${focus.practiceId}`} session={focus} />}
    </Suspense>
  )
}
