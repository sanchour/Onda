import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ACHIEVEMENTS } from '@/data/derive/achievements'
import { lagoPhase } from '@/data/derive/lago'
import { useSettings } from '@/data/hooks'
import { useStore } from '@/data/store'
import { unlock } from '@/lib/applock'
import { haptic } from '@/lib/haptics'
import { isIOSSafari, isStandalone } from '@/lib/platform'
import navCss from '@/nav/nav.module.css'
import { useNav } from '@/nav/store'
import m from '@/screens/more.module.css'
import { saveSubscription } from '@/sync/push'
import { Button } from '@/ui/buttons'
import { Icon } from '@/ui/Icon'

/** Toast: one quiet line at the top, with an optional action. */
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

/** Announces achievement unlocks one at a time. */
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

/** First-run "Add to Home Screen" coachmark: Safari only, not when already installed, dismissible, shown once. */
function InstallCoachmark() {
  const { t } = useTranslation()
  const settings = useSettings()
  const update = useStore((s) => s.updateSettings)
  const busy = useNav((n) => n.stack.length > 0 || n.sheets.length > 0)
  if (!settings.onboarded || settings.a2hsDismissed || busy || isStandalone() || !isIOSSafari()) return null
  return (
    <div className={m.coach} role="note">
      <Icon name="export" size={26} color="var(--accent)" style={{ marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={m.coachTitle}>{t('a2hs.title')}</div>
        <div className={m.coachBody}>{t('a2hs.body')}</div>
      </div>
      <button type="button" className={m.coachX} aria-label={t('a2hs.dismiss')} onClick={() => update({ a2hsDismissed: true })}>
        <Icon name="x" weight="bold" size={16} />
      </button>
    </div>
  )
}

/** Face ID Lock and the app-switcher cover. */
function PrivacyGate() {
  const { t } = useTranslation()
  const { appLock, hideInSwitcher } = useSettings()
  const [locked, setLocked] = useState(appLock)
  const [hidden, setHidden] = useState(false)
  const away = useRef(0)
  const tryUnlock = () => void unlock().then((ok) => ok && setLocked(false))

  useEffect(() => {
    if (appLock) tryUnlock()
    else setLocked(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appLock])

  useEffect(() => {
    const onVis = () => {
      const gone = document.visibilityState === 'hidden'
      // iOS snapshots the app for the switcher as it goes to the background: cover it first.
      setHidden(gone && hideInSwitcher)
      if (gone) away.current = Date.now()
      else if (appLock && Date.now() - away.current > 60_000) {
        setLocked(true)
        tryUnlock()
      }
    }
    const onBlur = () => hideInSwitcher && setHidden(true)
    const onFocus = () => setHidden(false)
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appLock, hideInSwitcher])

  if (!locked && !hidden) return null
  return (
    <div className={navCss.cover} role={locked ? 'dialog' : undefined} aria-modal={locked || undefined} aria-label={locked ? t('settings.privacy.locked') : undefined}>
      <Icon name="waves" weight="bold" size={44} color="var(--accent)" />
      {locked && (
        <>
          <div className={m.lockTitle}>{t('settings.privacy.locked')}</div>
          <Button size="md" icon="lock" onClick={tryUnlock}>
            {t('settings.privacy.unlock')}
          </Button>
        </>
      )}
    </div>
  )
}

/** Service worker: register in production, offer the new version instead of swapping mid-session,
 *  and act on notification taps (Check In, Open, evening journal). */
function ServiceWorkerBridge() {
  const { t } = useTranslation()
  useEffect(() => {
    const act = (action: string | null, lagoId: string | null) => {
      const st = useStore.getState()
      const n = useNav.getState()
      if (action === 'journal' && st.runs.some((r) => r.state === 'active' && !r.deletedAt)) {
        n.popToRoot('ondas')
        n.openSheet({ name: 'journalEdit' })
        return
      }
      if (action !== 'checkin') return
      const lago = st.lagos.find((l) => l.id === lagoId && !l.deletedAt && lagoPhase(l, st.today) === 'active')
      n.popToRoot('lagos')
      if (lago) n.openSheet({ name: 'checkin', lagoId: lago.id })
    }
    const q = new URLSearchParams(location.search)
    if (q.get('action')) {
      act(q.get('action'), q.get('lago'))
      history.replaceState(null, '', location.pathname)
    }
    if (!('serviceWorker' in navigator)) return
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; action?: string | null; lagoId?: string | null } | null
      if (d?.type === 'NOTIFICATION_ACTION') act(d.action ?? null, d.lagoId ?? null)
      if (d?.type === 'PUSH_SUBSCRIPTION_CHANGED') void saveSubscription()
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    if (import.meta.env.PROD) {
      void import('virtual:pwa-register').then(({ registerSW }) => {
        const update = registerSW({
          onNeedRefresh: () => useNav.getState().showToast(t('sw.updateReady'), { icon: 'arrows-clockwise', action: { label: t('sw.reload'), run: () => void update(true) } }),
          onRegisteredSW: (_url, reg) => {
            // An installed PWA can stay open for days: look for a new version every hour.
            if (reg) setInterval(() => void reg.update().catch(() => undefined), 60 * 60 * 1000)
          },
        })
      })
    }
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [t])
  return null
}

/** Fetches the newest version and restarts into it. For when the Reload prompt was missed. */
export async function fetchLatestVersion(): Promise<void> {
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration().catch(() => undefined) : undefined
  if (!reg) return location.reload()
  await reg.update().catch(() => undefined)
  const pending = reg.installing
  if (pending && !reg.waiting) {
    await new Promise<void>((done) => {
      const t = setTimeout(done, 15000)
      pending.addEventListener('statechange', () => {
        if (pending.state === 'installed' || pending.state === 'redundant') {
          clearTimeout(t)
          done()
        }
      })
    })
  }
  if (!reg.waiting) return location.reload()
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true })
  reg.waiting.postMessage({ type: 'SKIP_WAITING' })
  setTimeout(() => location.reload(), 3000)
}

export function Overlays() {
  return (
    <>
      <ServiceWorkerBridge />
      <UnlockWatcher />
      <InstallCoachmark />
      <Toast />
      <PrivacyGate />
    </>
  )
}
