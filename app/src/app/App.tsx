import { Suspense, lazy, useEffect, useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useActiveRun, useDark, useLook, useOndaIndex, useSettings } from '@/data/hooks'
import { ondaLook } from '@/content/themes'
import { accentFor, mix } from '@/lib/color'
import i18n from '@/i18n'
import { refreshEntitlement } from '@/sync/entitlement'
import { useStore } from '@/data/store'
import { EASE_ENTER, PUSH_MS, reducedMotion } from '@/lib/motion'
import { Navigator } from '@/nav/Navigator'
import navCss from '@/nav/nav.module.css'
import { useNav, type Tab } from '@/nav/store'
import { Menu } from '@/ui/Menu'
import { TabBar } from '@/ui/TabBar'
import { useSync } from '@/sync/useSync'
import { ROUTES, SHEETS, prefetchChunks } from './registry'
import { Overlays } from './Overlays'

const Onboarding = lazy(() => import('@/screens/Onboarding'))
const LagosTab = lazy(() => import('@/screens/LagosTab'))
const OndasTab = lazy(() => import('@/screens/OndasTab'))
const StatsTab = lazy(() => import('@/screens/StatsTab'))

const TABS: Record<Tab, React.LazyExoticComponent<() => React.ReactNode>> = { lagos: LagosTab, ondas: OndasTab, stats: StatsTab }

function Tabs() {
  const { t } = useTranslation()
  const tab = useNav((n) => n.tab)
  const setTab = useNav((n) => n.setTab)
  const pane = useRef<HTMLDivElement>(null)
  const first = useRef(true)
  const Current = TABS[tab]

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    pane.current?.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: reducedMotion() ? 120 : PUSH_MS, easing: EASE_ENTER })
  }, [tab])

  return (
    <>
      <div ref={pane} className={navCss.tabPane} role="tabpanel">
        <Suspense fallback={null}>
          <Current />
        </Suspense>
      </div>
      <div className={navCss.tabBarWrap}>
        <TabBar<Tab>
          items={[
            { key: 'ondas', icon: 'waves', label: t('tabs.ondas') },
            { key: 'lagos', icon: 'wave-soft', label: t('tabs.lagos') },
            { key: 'stats', icon: 'chart-bar', label: t('tabs.stats') },
          ]}
          activeKey={tab}
          onChange={setTab}
        />
      </div>
    </>
  )
}

function SheetHost() {
  const sheets = useNav((n) => n.sheets)
  return (
    <Suspense fallback={null}>
      {sheets.map((entry) => {
        const C = SHEETS[entry.name] as React.ComponentType<{ entry: typeof entry }>
        return <C key={entry.key} entry={entry} />
      })}
    </Suspense>
  )
}

/** Keeps the document in step with the app: appearance, status bar style, keyboard inset and the calendar day. */
function useShell() {
  const dark = useDark()
  const mode = useSettings().themeMode
  const tick = useStore((s) => s.tick)

  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.theme = dark ? 'dark' : 'light'
    try {
      localStorage.setItem('onda.theme', mode)
    } catch {
      /* private mode */
    }
  }, [dark, mode])

  // The accent, and a very light wash behind every screen, follow the running Onda in all three tabs and in Settings.
  // Turning the wash off (Settings, Appearance) returns the plain light or dark background.
  const run = useActiveRun()
  const index = useOndaIndex(run?.ondaId)
  const look = useLook(index)
  const tint = useSettings().ondaTint
  const themed = useSettings().ondaThemes
  useLayoutEffect(() => {
    const root = document.documentElement
    const baseOf = (d: boolean) => (d ? { grouped: '#1B1C1F', page: '#1B1C1F' } : { grouped: '#F5F1E8', page: '#FDFBF6' })
    const washOf = (d: boolean, solid: string) => (run && tint ? { grouped: mix(baseOf(d).grouped, solid, d ? 0.34 : 0.3), page: mix(baseOf(d).page, solid, d ? 0.34 : 0.14) } : null)
    const base = baseOf(dark)
    const wash = washOf(dark, look.solid)
    for (const [k, v] of [['--surface-grouped', wash?.grouped], ['--surface-page', wash?.page]] as const) {
      if (v) root.style.setProperty(k, v)
      else root.style.removeProperty(k)
    }
    const bg = wash?.grouped ?? base.grouped
    root.style.backgroundColor = bg
    document.body.style.backgroundColor = bg
    // iOS colours the bar behind the clock and battery from these. It does not always notice an attribute changing on
    // an existing tag, so the theme-color tag is replaced, the colour scheme is pinned to the app's own appearance,
    // and both are applied once more on the next frame and whenever the app comes back to the front.
    const paintBar = () => {
      document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove())
      const meta = document.createElement('meta')
      meta.name = 'theme-color'
      meta.content = bg
      document.head.prepend(meta)
      document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', dark ? 'dark' : 'light')
      root.style.colorScheme = dark ? 'dark' : 'light'
    }
    paintBar()
    const raf = requestAnimationFrame(paintBar)
    const onShow = () => document.visibilityState === 'visible' && paintBar()
    document.addEventListener('visibilitychange', onShow)
    const stopBar = () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onShow)
    }
    // iOS takes the colour behind the clock and battery from the page as it is at launch, before this code runs.
    // So the background for both appearances is saved here and index.html applies it before the first paint.
    try {
      for (const d of [false, true]) {
        const solid = ondaLook(index, { themed, dark: d }).solid
        localStorage.setItem(d ? 'onda.bg.dark' : 'onda.bg.light', washOf(d, solid)?.grouped ?? baseOf(d).grouped)
      }
    } catch {
      /* private mode */
    }
    if (!run) {
      root.style.removeProperty('--accent')
      root.style.removeProperty('--accent-contrast')
      return stopBar
    }
    const { accent, on } = accentFor(look.strong, dark)
    root.style.setProperty('--accent', accent)
    root.style.setProperty('--accent-contrast', on)
    return stopBar
  }, [run, index, themed, look.strong, look.solid, dark, tint])

  useEffect(() => {
    // On-screen keyboard height, so sheets can keep the focused field visible
    const vv = window.visualViewport
    const onVV = () => document.documentElement.style.setProperty('--kb', `${Math.max(0, window.innerHeight - (vv?.height ?? window.innerHeight) - (vv?.offsetTop ?? 0))}px`)
    vv?.addEventListener('resize', onVV)
    vv?.addEventListener('scroll', onVV)
    const onVisible = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(tick, 60_000)
    return () => {
      vv?.removeEventListener('resize', onVV)
      vv?.removeEventListener('scroll', onVV)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
    }
  }, [tick])
}

export function App() {
  const ready = useStore((s) => s.ready)
  const init = useStore((s) => s.init)
  const onboarded = useStore((s) => s.user?.settings.onboarded)
  useEffect(() => {
    try {
      if (onboarded) localStorage.setItem('onda.ob', '1')
    } catch {
      /* private mode */
    }
  }, [onboarded])
  const menu = useNav((n) => n.menu)
  const closeMenu = useNav((n) => n.closeMenu)
  const overlay = useNav((n) => n.sheets.length > 0 || !!n.menu)
  useShell()
  useSync()

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    if (!ready) return
    const q = new URLSearchParams(location.search)
    const tab = q.get('tab')
    if (tab === 'lagos' || tab === 'ondas' || tab === 'stats') useNav.getState().setTab(tab)
    // Returning from Notion's consent page or from Stripe Checkout
    if (q.get('notion')) {
      const ok = q.get('notion') === 'connected'
      history.replaceState(null, '', location.pathname)
      useNav.getState().push({ name: 'settings', page: 'integrations' })
      if (ok) useNav.getState().openSheet({ name: 'notion' })
      else useNav.getState().showToast(i18n.t('common.error'), { icon: 'warning-circle' })
    }
    if (q.get('purchase')) {
      const ok = q.get('purchase') === 'success'
      history.replaceState(null, '', location.pathname)
      if (ok) void refreshEntitlement().then((e) => e?.plus === 'lifetime' && useNav.getState().showToast(i18n.t('paywall.thanks'), { icon: 'seal-check' }))
    }
    // ?seed=demo loads the demo data set (Stoicism day 4 of 14, five Lagos)
    if (q.get('seed') === 'demo') {
      void import('@/data/seed').then((m) => m.loadDemoSeed()).then(() => {
        history.replaceState(null, '', location.pathname)
        useNav.getState().popToRoot('ondas')
      }).catch((e) => console.error('[onda] demo seed failed', e))
    }
    // Offline: the service worker precaches every screen and every Onda. Here we only warm the screens, one per idle slice.
    prefetchChunks()
  }, [ready])

  // 3.0: appearance follows the phone unless you choose otherwise. People on the old default (Light) are moved over once.
  useEffect(() => {
    if (!ready) return
    try {
      if (localStorage.getItem('onda.auto3')) return
      localStorage.setItem('onda.auto3', '1')
      const st = useStore.getState()
      if (st.user?.settings.themeMode === 'light') st.updateSettings({ themeMode: 'auto' })
    } catch {
      /* private mode */
    }
  }, [ready])

  // Ask the browser to keep our data when space is tight (installed apps are usually granted it silently; a refusal is fine).
  useEffect(() => {
    if (ready && onboarded) void navigator.storage?.persist?.().catch(() => undefined)
  }, [ready, onboarded])
  useEffect(() => {
    const full = () => useNav.getState().showToast(i18n.t('common.storageFull'), { icon: 'warning-circle' })
    window.addEventListener('onda:storage-full', full)
    return () => window.removeEventListener('onda:storage-full', full)
  }, [])

  // The HTML carries a tiny launch shell; take it away once the app can paint
  useEffect(() => {
    if (ready) requestAnimationFrame(() => document.getElementById('boot')?.remove())
  }, [ready])

  if (!ready) return null

  return (
    <div style={{ position: 'absolute', inset: 0 }} data-overlay={overlay ? '1' : undefined}>
      {onboarded ? (
        <Navigator
          root={<Tabs />}
          renderRoute={(entry) => {
            const C = ROUTES[entry.name] as React.ComponentType<{ entry: typeof entry }>
            return (
              <Suspense fallback={null}>
                <C entry={entry} />
              </Suspense>
            )
          }}
        />
      ) : (
        <Suspense fallback={null}>
          <Onboarding />
        </Suspense>
      )}
      <SheetHost />
      <div className={navCss.statusFill} aria-hidden />
      {menu && <Menu spec={menu} onClose={closeMenu} />}
      <Overlays />
    </div>
  )
}
