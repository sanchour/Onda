import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ACHIEVEMENTS } from '@/data/derive/achievements'
import { useStore } from '@/data/store'
import { haptic } from '@/lib/haptics'
import navCss from '@/nav/nav.module.css'
import { useNav } from '@/nav/store'
import { Icon } from '@/ui/Icon'

/** Toast: one quiet line at the top, with an optional action. Also announces achievement unlocks. */
function Toast() {
  const toast = useNav((n) => n.toast)
  const clear = useNav((n) => n.clearToast)
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(clear, toast.action ? 5000 : 2600)
    return () => clearTimeout(id)
  }, [toast, clear])
  if (!toast) return null
  return (
    <div className={navCss.toast} role="status" aria-live="polite">
      <div key={toast.id} className={navCss.toastCard} onClick={clear}>
        <span className={navCss.toastIcon}>
          <Icon name={toast.icon ?? 'check'} weight="fill" size={18} />
        </span>
        <span className={navCss.toastText}>{toast.text}</span>
        {toast.action && (
          <button
            type="button"
            className={navCss.toastAction}
            onClick={(e) => {
              e.stopPropagation()
              toast.action!.run()
              clear()
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
    </div>
  )
}

function UnlockWatcher() {
  const { t } = useTranslation()
  const next = useStore((s) => s.unlockQueue[0])
  const shift = useStore((s) => s.shiftUnlock)
  const toast = useNav((n) => n.toast)
  useEffect(() => {
    if (!next || toast) return
    const a = ACHIEVEMENTS.find((x) => x.key === next)
    haptic('success')
    useNav.getState().showToast(t('ach.toast', { name: t(`ach.names.${next}`) }), {
      icon: a?.icon ?? 'medal',
      action: { label: t('ach.view'), run: () => useNav.getState().openSheet({ name: 'achievements', focus: next }) },
    })
    shift()
  }, [next, toast, shift, t])
  return null
}

export function Overlays() {
  return (
    <>
      <UnlockWatcher />
      <Toast />
    </>
  )
}
