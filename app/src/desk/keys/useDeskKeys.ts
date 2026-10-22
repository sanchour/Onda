import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNav } from '@/nav/store'
import { focusFor, nextUndone, practiceTitle, type TodayPlan } from '../focus/today'
import { useDeskUI } from '../store'
import { isTyping } from './dialog'
import { SECTION_KEYS, back } from './go'

/* The one keyboard handler for the desktop app (the list is in shortcuts.ts). Single keys stand aside while you type
   in a field. While a sheet or menu is open it does nothing: they handle Escape themselves. The palette, the shortcut
   sheet and Focus handle their own keys too, so only Cmd or Ctrl+K reaches through to toggle the palette. */

export function useDeskKeys(today: TodayPlan | undefined) {
  const { t } = useTranslation()
  const plan = useRef(today)
  plan.current = today

  useEffect(() => {
    const blocked = () => {
      const n = useNav.getState()
      return n.sheets.length > 0 || !!n.menu
    }

    const focusNext = () => {
      const tp = plan.current
      const { showToast } = useNav.getState()
      if (!tp) return showToast(t('power.focus.noOnda'), { icon: 'timer' })
      const p = nextUndone(tp.plan, tp.done)
      if (!p) return showToast(t('power.focus.allDone'), { icon: 'check-circle' })
      useDeskUI.getState().startFocus(focusFor(tp.active.run.id, p, practiceTitle(p, (k) => t(`plan.lead.${k}`)), tp.active.content))
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing) return
      const ui = useDeskUI.getState()
      const mod = e.metaKey || e.ctrlKey
      const overlay = ui.palette || ui.shortcuts || !!ui.focus

      if (mod && !e.altKey && !e.shiftKey && e.code === 'KeyK') {
        if (blocked() || ui.focus) return
        e.preventDefault()
        ui.togglePalette()
        return
      }
      if (overlay || blocked() || e.defaultPrevented) return

      if (mod && !e.altKey && e.code === 'Backslash') {
        e.preventDefault()
        ui.toggleSidebar()
        return
      }
      if (e.altKey && !mod && e.key === 'ArrowLeft') {
        if (back()) e.preventDefault()
        return
      }
      if (isTyping(e.target) || mod || e.altKey || e.repeat) return
      if (e.key === 'Escape') {
        back()
        return
      }
      // ? and / are shifted on some layouts, so these two ignore Shift
      if (e.key === '?') {
        e.preventDefault()
        ui.setShortcuts(true)
        return
      }
      if (e.key === '/') {
        e.preventDefault()
        ui.openPalette()
        return
      }
      if (e.shiftKey) return
      const key = e.key.toLowerCase()
      if (SECTION_KEYS[key]) {
        e.preventDefault()
        SECTION_KEYS[key]()
        return
      }
      if (key === 'f') {
        e.preventDefault()
        focusNext()
      }
    }

    // The mouse's back button (button 3) steps back too: a sheet or an overlay first, then a pushed page.
    const onMouse = (e: MouseEvent) => {
      if (e.button !== 3) return
      const n = useNav.getState()
      const ui = useDeskUI.getState()
      const handled = n.sheets.length > 0 || !!n.menu || ui.palette || ui.shortcuts || !!ui.focus || n.stack.some((x) => !x.leaving)
      if (!handled) return
      // the browser would otherwise leave the app (its back button acts on mouseup)
      e.preventDefault()
      if (e.type !== 'mouseup') return
      if (n.menu) n.closeMenu()
      else if (n.sheets.length) n.closeSheet()
      else if (ui.palette) ui.closePalette()
      else if (ui.shortcuts) ui.setShortcuts(false)
      else if (ui.focus) ui.endFocus()
      else back()
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onMouse)
    window.addEventListener('mouseup', onMouse)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onMouse)
      window.removeEventListener('mouseup', onMouse)
    }
  }, [t])
}
