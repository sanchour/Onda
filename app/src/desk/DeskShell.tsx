import { Suspense, lazy, useRef, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { planForDay } from '@/data/derive/plan'
import { useActiveRun, useLook, useOndaIndex, useSettings } from '@/data/hooks'
import { MOD_LABEL } from '@/lib/desk'
import { EASE_ENTER, reducedMotion } from '@/lib/motion'
import { useNav, type Route, type Tab } from '@/nav/store'
import { EmblemArt } from '@/screens/emblems'
import { useActiveOnda, useRunToday } from '@/screens/ondaShared'
import { Icon } from '@/ui/Icon'
import d from './desk.module.css'
import { useDeskUI } from './store'
import { SyncPill } from './SyncPill'

/* The desktop app: a living background in the running Onda's colours, a glass sidebar, and a stage that holds the
   same screens the phone shows. Sheets become dialogs (ui/Sheet.tsx) and the stage's pages lay themselves out for
   the width (each screen's desk styles). Phones never mount any of this. */

const DeskOverlays = lazy(() => import('./Overlays'))

type Section = 'home' | 'browse' | 'stats' | 'settings' | 'link'

const SECTIONS: { key: Exclude<Section, 'settings' | 'link'>; icon: string; label: string; tab: Tab; routes?: Route[] }[] = [
  { key: 'home', icon: 'sun-horizon', label: 'desk.today', tab: 'ondas' },
  { key: 'browse', icon: 'compass', label: 'desk.browse', tab: 'ondas', routes: [{ name: 'allOndas' }] },
  { key: 'stats', icon: 'chart-bar', label: 'tabs.stats', tab: 'stats' },
]

/** Which sidebar item the stage is showing: the first pushed page decides, otherwise the tab. */
function useSection(): Section {
  const tab = useNav((n) => n.tab)
  const first = useNav((n) => n.stack[0]?.name)
  if (first === 'allOndas') return 'browse'
  if (first === 'settings') return 'settings'
  // the sync pill in the footer marks itself
  if (first === 'link') return 'link'
  return tab === 'ondas' ? 'home' : tab
}

/** The Onda's colour as still light behind the glass, its pattern as a faint texture, and paper grain. */
function Ambient() {
  const run = useActiveRun()
  const index = useOndaIndex(run?.ondaId)
  const look = useLook(index)
  const tint = useSettings().ondaTint
  const on = !!run && tint
  const style = (on ? { '--amb-a': look.strong, '--amb-b': look.solid, '--amb-cover': look.cover } : {}) as CSSProperties
  return (
    <div className={d.ambient} style={style} data-on={on ? '' : undefined} aria-hidden>
      {on && <div className={d.pattern} />}
      <div className={d.grain} />
    </div>
  )
}

/** The running Onda as a small cover: its world, the day, and today's practices as a thin bar. */
function NowCard({ rail }: { rail: boolean }) {
  const { t } = useTranslation()
  const active = useActiveOnda()
  const settings = useSettings()
  const done = useRunToday(active?.run.id)
  const jump = useNav((n) => n.jump)
  if (!active) {
    if (rail) return null
    return (
      <button type="button" className={d.nowEmpty} onClick={() => jump('ondas', [{ name: 'allOndas' }])}>
        <span className={d.nowEmptyTitle}>{t('desk.noOnda')}</span>
        <span className={d.nowEmptySub}>{t('desk.noOndaSub')}</span>
      </button>
    )
  }
  const { run, content, look, day, index } = active
  const plan = content ? planForDay(content, day, { includeFood: settings.includeFood }) : []
  const total = plan.length
  const n = plan.filter((p) => done.practices.has(p.id)).length
  const name = index?.name ?? run.snapshot?.name ?? ''
  const dayLabel = t('ondas.dayOf', { day, length: run.lengthDays })
  const open = () => jump('ondas', [{ name: 'onda', id: run.ondaId }])
  const pct = total ? n / total : 0

  if (rail) {
    return (
      <button type="button" className={d.nowRail} style={look.vars} onClick={open} aria-label={`${name}, ${dayLabel}`} title={`${name} · ${dayLabel}`}>
        <svg className={d.nowRing} viewBox="0 0 48 48" aria-hidden>
          <circle cx="24" cy="24" r="22" />
          <circle cx="24" cy="24" r="22" strokeDasharray={`${pct * 138.2} 138.2`} />
        </svg>
        <span className={d.nowRailArt}>{look.emblem ? <EmblemArt id={look.emblem} size={26} line={1} /> : <Icon name="waves" size={20} />}</span>
      </button>
    )
  }
  return (
    <div className={d.nowWrap}>
      <div className={d.sideHead}>{t('desk.yourOnda')}</div>
      <button type="button" className={d.now} style={{ ...look.vars, background: look.cover, color: look.ink }} onClick={open} data-onda={settings.ondaThemes ? run.ondaId : undefined}>
        <span className={d.nowTop}>
          <span className={d.nowKicker}>{dayLabel}</span>
          <span className={d.nowMark} aria-hidden>{look.numeral(day)}</span>
        </span>
        {look.emblem && (
          <span className={d.nowArt} aria-hidden>
            <EmblemArt id={look.emblem} size={92} line={1} />
          </span>
        )}
        <span className={d.nowName} style={{ fontFamily: look.font, textTransform: look.caps ? 'uppercase' : undefined }}>{name}</span>
        <span className={d.nowDays} aria-hidden>
          {Array.from({ length: run.lengthDays }, (_, i) => (
            <i key={i} data-past={i < day - 1 ? '' : undefined} data-now={i === day - 1 ? '' : undefined} />
          ))}
        </span>
      </button>
      {total > 0 && (
        <div className={d.nowToday} role="img" aria-label={t('desk.practicesToday', { done: n, total })}>
          <span className={d.nowBar}>
            <span style={{ transform: `scaleX(${pct})`, background: look.strong }} />
          </span>
          <span className={d.nowCount}>{t('desk.practicesToday', { done: n, total })}</span>
        </div>
      )}
    </div>
  )
}

function Sidebar({ onJump }: { onJump: () => void }) {
  const { t } = useTranslation()
  const section = useSection()
  const jump = useNav((n) => n.jump)
  const tab = useNav((n) => n.tab)
  const rail = !useDeskUI((s) => s.sidebar)
  const { toggleSidebar, openPalette } = useDeskUI.getState()
  const go = (tab: Tab, routes?: Route[]) => {
    jump(tab, routes)
    onJump()
  }
  const item = (key: Section, icon: string, label: string, onClick: () => void) => (
    <button key={key} type="button" className={d.navItem} aria-current={section === key ? 'page' : undefined} onClick={onClick} title={rail ? label : undefined} aria-label={rail ? label : undefined}>
      <Icon name={icon} weight={section === key ? 'fill' : 'regular'} size={20} />
      {!rail && <span>{label}</span>}
    </button>
  )
  return (
    <aside className={d.side} data-rail={rail ? '' : undefined}>
      <div className={d.brandRow}>
        {!rail && (
          <span className={d.brand}>
            <svg viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="34" strokeLinecap="round" aria-hidden>
              <path d="M132 190c42-34 82-34 124 0s82 34 124 0" />
              <path d="M132 256c42-34 82-34 124 0s82 34 124 0" />
              <path d="M132 322c42-34 82-34 124 0s82 34 124 0" />
            </svg>
            <span>Onda</span>
          </span>
        )}
        <button type="button" className={d.iconBtn} onClick={toggleSidebar} aria-label={rail ? t('desk.showSidebar') : t('desk.hideSidebar')} title={rail ? t('desk.showSidebar') : t('desk.hideSidebar')}>
          <Icon name="sidebar-simple" size={20} />
        </button>
      </div>

      <button type="button" className={d.search} onClick={openPalette} aria-label={t('desk.search')} title={rail ? t('desk.search') : undefined}>
        <Icon name="magnifying-glass" size={18} />
        {!rail && (
          <>
            <span className={d.searchText}>{t('desk.search')}</span>
            <kbd className={d.kbd}>{MOD_LABEL} K</kbd>
          </>
        )}
      </button>

      <nav className={d.nav} aria-label={t('desk.sections')}>
        {SECTIONS.map((s) => item(s.key, s.icon, t(s.label), () => go(s.tab, s.routes)))}
      </nav>

      <NowCard rail={rail} />

      <div className={d.sideFoot}>
        <SyncPill rail={rail} />
        {item('settings', 'gear-six', t('a11y.settings'), () => go(tab, [{ name: 'settings' }]))}
      </div>
    </aside>
  )
}

export function DeskShell({ children }: { children: ReactNode }) {
  const stage = useRef<HTMLDivElement>(null)
  const sidebar = useDeskUI((s) => s.sidebar)
  // a sidebar jump swaps the whole stage: a short settle rather than a cut
  const settle = () => {
    if (reducedMotion()) return
    stage.current?.animate([{ opacity: 0.55, transform: 'translate3d(0,6px,0)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE_ENTER })
  }
  return (
    <div className={d.shell} data-rail={sidebar ? undefined : ''}>
      <Ambient />
      <Sidebar onJump={settle} />
      <main ref={stage} className={d.stage}>
        {children}
      </main>
      <Suspense fallback={null}>
        <DeskOverlays />
      </Suspense>
    </div>
  )
}
