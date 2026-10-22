import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Settings } from '@/data/types'
import { reducedMotion } from '@/lib/motion'
import { BackButton } from '@/nav/Screen'
import type { SettingsPage } from '@/nav/store'
import { Button } from '@/ui/buttons'
import { Icon } from '@/ui/Icon'
import d from './settings.desk.module.css'

/* Settings on the desktop, as macOS System Settings: the sections in a list on the left, the chosen one on the right.
   Choosing a section swaps the pane instead of pushing a page. The panes are the phone's own (Settings.tsx builds them),
   so every row does exactly what it does on the phone; this file only adds the frame, the search and a few desk-only
   pictures (the three looks, the Ondas+ card). */

type Pane = 'account' | SettingsPage
type Key = Pane | 'link'
type Theme = Settings['themeMode']

export interface DeskSettingsProps {
  /** A section asked for by whoever opened Settings. */
  page?: SettingsPage
  hub: [string, SettingsPage][]
  pages: Record<SettingsPage, ReactNode>
  name: string
  memberSince: string
  avatar: (size: number) => ReactNode
  stats: [number, string][]
  onProfile: () => void
  plus: { title: string; badge: string; line: string; cta: string; open: () => void }
  danger: ReactNode
  version: string
  theme: Theme
  onTheme: (v: Theme) => void
  onBack: () => void
  onLink: () => void
}

// Grouped as System Settings groups them: the plan, how Onda looks and nudges, where your data goes, help.
const GROUPS: Key[][] = [['subscription'], ['appearance', 'notifications', 'practice'], ['integrations', 'data', 'link', 'privacy'], ['help']]

/** The labels on each pane, so a search finds a setting by its own name and not only by its section's. */
const WORDS: Record<Pane, string[]> = {
  account: ['account.title', 'deskSet.editProfile', 'settings.streak', 'settings.danger.reset', 'settings.danger.signOut', 'settings.danger.deleteAccount'],
  subscription: ['settings.sub.plan', 'settings.sub.trialLeft', 'settings.sub.getLifetime', 'settings.sub.getMonthly', 'settings.sub.restore'],
  appearance: ['settings.display.light', 'settings.display.dark', 'settings.display.auto', 'settings.display.defaultLength', 'settings.display.themes', 'settings.display.tint'],
  notifications: ['settings.notif.status', 'settings.notif.daily', 'settings.notif.time', 'settings.notif.evening', 'settings.notif.eveningTime', 'settings.notif.milestones'],
  practice: ['settings.practice.weekStarts', 'settings.practice.includeFood', 'settings.practice.haptics', 'settings.practice.sounds'],
  integrations: ['settings.integrations.reminders', 'settings.integrations.calendar', 'settings.integrations.notion'],
  data: ['settings.data.history', 'settings.data.export', 'settings.data.import', 'settings.data.account', 'settings.data.lastSynced', 'settings.data.syncNow'],
  privacy: ['settings.privacy.appLock', 'settings.privacy.hide'],
  help: ['settings.help.help', 'settings.help.whatsNew', 'settings.help.privacyPolicy', 'settings.help.terms', 'settings.help.versionRow', 'settings.help.replay', 'settings.help.install'],
}

/** A small window in each look: a sidebar, a cover and a few lines of text. */
function Mini({ dark }: { dark?: boolean }) {
  return (
    <span className={d.mini} data-dark={dark ? '' : undefined}>
      <span className={d.mSide}>
        <i />
        <i />
        <i />
      </span>
      <span className={d.mStage}>
        <span className={d.mCover} />
        <i />
        <i />
        <i />
      </span>
    </span>
  )
}

function ThemePicker({ value, onChange }: { value: Theme; onChange: (v: Theme) => void }) {
  const { t } = useTranslation()
  return (
    <div className={d.themes} role="radiogroup" aria-label={t('settings.hub.appearance')}>
      {(['light', 'dark', 'auto'] as const).map((v) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} className={d.theme} onClick={() => onChange(v)}>
          <span className={d.thumb}>
            <Mini dark={v === 'dark'} />
            {v === 'auto' && (
              <span className={d.half}>
                <Mini dark />
              </span>
            )}
          </span>
          <span className={d.themeLabel}>{t(`settings.display.${v}`)}</span>
        </button>
      ))}
    </div>
  )
}

export default function DeskSettings(p: DeskSettingsProps) {
  const { t } = useTranslation()
  const [sel, setSel] = useState<Pane>(p.page ?? 'account')
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<{ word: string; n: number } | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const pane = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const icon = useMemo(() => Object.fromEntries([['account', 'user'], ['link', 'devices'], ...p.hub.map(([i, k]) => [k, i])]) as Record<Key, string>, [p.hub])
  const label = (k: Key) => (k === 'account' ? p.name : k === 'link' ? t('link.title') : t(`settings.hub.${k}`))

  // a section asked for from elsewhere (a link into Settings) wins over the one on show
  useEffect(() => {
    if (p.page) setSel(p.page)
  }, [p.page])

  const choose = (k: Key, word?: string) => {
    if (k === 'link') return p.onLink()
    setSel(k)
    setFound(word ? { word, n: Date.now() } : null)
  }

  // a new pane starts at its top
  useLayoutEffect(() => {
    pane.current?.scrollTo({ top: 0 })
    setScrolled(false)
  }, [sel])

  // then points at the setting a search found: scrolled into view with a soft glow
  useEffect(() => {
    const root = pane.current
    if (!found || !root) return
    const hit = [...root.querySelectorAll<HTMLElement>('span,div,h2,h3')].find((n) => !n.children.length && n.textContent?.trim() === found.word)
    const row = hit ? (hit.closest<HTMLElement>('button') ?? hit.parentElement?.parentElement) : null
    if (!row) return
    row.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' })
    row.dataset.found = ''
    const id = setTimeout(() => delete row.dataset.found, 1900)
    return () => {
      clearTimeout(id)
      delete row.dataset.found
    }
  }, [found, sel])

  const q = query.trim().toLowerCase()
  const results = useMemo(() => {
    if (!q) return null
    const keys: Key[] = ['account', ...GROUPS.flat()]
    return keys.flatMap((k) => {
      const hits = (k === 'link' ? [] : WORDS[k]).map((w) => t(w)).filter((w) => w.toLowerCase().includes(q))
      return label(k).toLowerCase().includes(q) || hits.length ? [{ k, hits }] : []
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, t, p.name])

  // up and down walk the list, as in a Mac sidebar
  const walk = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const items = [...(list.current?.querySelectorAll<HTMLButtonElement>('[data-item]') ?? [])]
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    const next = items[i < 0 ? 0 : Math.max(0, Math.min(items.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))]
    if (!next) return
    e.preventDefault()
    next.focus()
    if (next.dataset.item !== 'link') next.click()
  }

  const item = (k: Key, hits?: string[]) => {
    const me = k === 'account'
    return (
      <button key={k} type="button" data-item={k} className={me ? `${d.item} ${d.me}` : d.item} aria-current={sel === k ? 'page' : undefined} onClick={() => choose(k, hits?.[0])}>
        {me ? (
          p.avatar(hits ? 28 : 40)
        ) : (
          <span className={d.tile} data-k={k}>
            <Icon name={icon[k]} weight="fill" size={16} />
          </span>
        )}
        <span className={d.itemText}>
          <span className={me && !hits ? d.meName : d.itemTitle}>{label(k)}</span>
          {me && !hits && <span className={d.itemSub}>{`${p.plus.title} · ${p.plus.badge}`}</span>}
          {hits && hits.length > 0 && <span className={d.itemSub}>{hits.slice(0, 3).join(', ')}</span>}
        </span>
        {k === 'link' && <Icon name="caret-right" weight="bold" size={13} className={d.itemGo} />}
      </button>
    )
  }

  const plusCard = (
    <button type="button" className={d.plus} onClick={p.plus.open}>
      <span className={d.plusTop}>
        <span className={d.plusTitle}>{p.plus.title}</span>
        <span className={d.plusBadge}>{p.plus.badge}</span>
      </span>
      <span className={d.plusLine}>{p.plus.line}</span>
      <span className={d.plusCta}>
        {p.plus.cta}
        <Icon name="arrow-right" weight="bold" size={14} />
      </span>
    </button>
  )

  const perks = [
    { icon: 'waves', title: t('paywall.b1'), text: t('paywall.b1t') },
    { icon: 'infinity', title: t('paywall.b2'), text: t('paywall.b2t') },
    { icon: 'arrows-clockwise', title: t('paywall.b3'), text: t('paywall.b3t') },
    { icon: 'lock', title: t('paywall.b4'), text: t('paywall.b4t') },
  ]

  // desk-only pictures around a phone pane
  const before: Partial<Record<SettingsPage, ReactNode>> = {
    subscription: plusCard,
    appearance: <ThemePicker value={p.theme} onChange={p.onTheme} />,
  }
  const after: Partial<Record<SettingsPage, ReactNode>> = {
    subscription: (
      <section className={d.perksWrap}>
        <h3 className={d.subHead}>{t('deskSet.included')}</h3>
        <div className={d.perks}>
          {perks.map((b) => (
            <div key={b.title} className={d.perk}>
              <span className={d.perkIcon}>
                <Icon name={b.icon} weight="fill" size={20} />
              </span>
              <span className={d.perkTitle}>{b.title}</span>
              <span className={d.perkText}>{b.text}</span>
            </div>
          ))}
        </div>
      </section>
    ),
  }

  const overview = (
    <>
      <section className={d.hero}>
        {p.avatar(88)}
        <div className={d.heroText}>
          <h2 className={d.heroName}>{p.name}</h2>
          <p className={d.heroSub}>{p.memberSince}</p>
        </div>
        <Button variant="secondary" size="md" icon="pencil-simple" onClick={p.onProfile}>
          {t('deskSet.editProfile')}
        </Button>
      </section>
      <div className={d.stats}>
        {p.stats.map(([v, l]) => (
          <div key={l} className={d.stat}>
            <span className={d.statV}>{v}</span>
            <span className={d.statL}>{l}</span>
          </div>
        ))}
      </div>
      {plusCard}
      <div className={d.gap}>{p.danger}</div>
      <p className={d.version}>{p.version}</p>
    </>
  )

  return (
    <div className={d.split}>
      <aside className={d.side}>
        <div className={d.sideHead}>
          <BackButton onClick={p.onBack} />
          <h1 className={d.sideTitle}>{t('settings.title')}</h1>
        </div>
        <label className={d.search}>
          <Icon name="magnifying-glass" size={16} />
          <input
            type="search"
            value={query}
            placeholder={t('deskSet.search')}
            aria-label={t('deskSet.search')}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && query) {
                e.stopPropagation()
                setQuery('')
              } else if (e.key === 'Enter' && results?.[0]) choose(results[0].k, results[0].hits[0])
              else if (e.key === 'ArrowDown') {
                e.preventDefault()
                list.current?.querySelector<HTMLButtonElement>('[data-item]')?.focus()
              }
            }}
          />
          {query && (
            <button type="button" className={d.searchClear} aria-label={t('deskSet.clear')} onClick={() => setQuery('')}>
              <Icon name="x-circle" weight="fill" size={16} />
            </button>
          )}
        </label>
        <nav ref={list} className={`scroll ${d.list}`} aria-label={t('settings.title')} onKeyDown={walk}>
          {results ? (
            results.length ? (
              <div className={d.group}>{results.map((r) => item(r.k, r.hits))}</div>
            ) : (
              <div className={d.empty} role="status">
                <span className={d.emptyTitle}>{t('deskSet.noResults')}</span>
                <span className={d.itemSub}>{t('deskSet.noResultsSub')}</span>
              </div>
            )
          ) : (
            <>
              <div className={d.group}>{item('account')}</div>
              {GROUPS.map((g) => (
                <div key={g[0]} className={d.group}>
                  {g.map((k) => item(k))}
                </div>
              ))}
            </>
          )}
        </nav>
      </aside>

      <section className={d.main} aria-label={label(sel)}>
        <div ref={pane} className={`scroll ${d.pane}`} onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 64)}>
          <div key={sel} className={d.col}>
            {sel === 'account' ? (
              overview
            ) : (
              <>
                <header className={d.head}>
                  <span className={`${d.tile} ${d.bigTile}`} data-k={sel}>
                    <Icon name={icon[sel]} weight="fill" size={28} />
                  </span>
                  <div>
                    <h2 className={d.title}>{t(`settings.hub.${sel}`)}</h2>
                    <p className={d.desc}>{t(`deskSet.about.${sel}`)}</p>
                  </div>
                </header>
                {before[sel]}
                {p.pages[sel]}
                {after[sel]}
              </>
            )}
          </div>
        </div>
        <div className={d.bar} data-on={scrolled ? '' : undefined} aria-hidden>
          {label(sel)}
        </div>
      </section>
    </div>
  )
}
