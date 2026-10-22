import { useDeferredValue, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BROWSE_GROUPS, COMING_SOON, GROUP_OF, type BrowseGroup, type ComingSoon } from '@/content/browse'
import type { OndaIndex } from '@/content/schema'
import { useLookFn, useOndaList } from '@/data/hooks'
import { useStore } from '@/data/store'
import { BackButton, Screen } from '@/nav/Screen'
import { useNav, type StackEntry } from '@/nav/store'
import { useActiveOnda } from '@/screens/ondaShared'
import { Icon } from '@/ui/Icon'
import { Book, FeatureCover, SoonBook, featuredOndas } from './books'
import w from './browse.module.css'

/* All Ondas on the desktop, as a bookshop: a Featured spread that changes each day, a toolbar with search and the groups
   that stays at the top, then each group as a grid of covers, two rows of it with See All. A chip or See All shows one
   group in full; a search shows every match by group, with the worlds on the way. Same lists as the phone's All Ondas. */

type Shelf = BrowseGroup | 'mine'
const MIN = 196 // the grid's narrowest cover, as in browse.module.css
const GAP = 20

const matches = (q: string, ...fields: (string | undefined)[]) => fields.some((f) => f?.toLocaleLowerCase().includes(q))

export default function DeskBrowse({ entry }: { entry?: StackEntry }) {
  const { t } = useTranslation()
  const push = useNav((n) => n.push)
  const first = useNav((n) => n.stack[0]?.key)
  const list = useOndaList()
  const lookOf = useLookFn()
  const today = useStore((x) => x.today)
  const activeId = useActiveOnda()?.run.ondaId
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<Shelf | 'all'>('all')
  const [cols, setCols] = useState(5)
  const deferred = useDeferredValue(query)
  const q = deferred.trim().toLocaleLowerCase()
  const pane = useRef<HTMLDivElement>(null)
  const mark = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLInputElement>(null)
  // reached from the sidebar it is a section of its own; pushed over another page it keeps a way back
  const section = !entry || entry.key === first

  // two rows of each shelf: as many covers as fit across
  useLayoutEffect(() => {
    const el = body.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => {
      if (e) setCols(Math.max(2, Math.floor((e.contentRect.width + GAP) / (MIN + GAP))))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // the toolbar turns to glass once the page runs under it
  useEffect(() => {
    const root = pane.current
    const el = mark.current
    const b = bar.current
    if (!root || !el || !b || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => e && b.toggleAttribute('data-stuck', !e.isIntersecting), { root })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // "/" finds, as on the web; Escape in the field clears it
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || el?.closest('input,textarea,[contenteditable="true"]')) return
      if (!pane.current?.offsetParent) return
      e.preventDefault()
      field.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const open = (id: string) => push({ name: 'onda', id })
  const shipped = new Set(list.map((x) => x.id))
  const mine = list.filter((x) => !GROUP_OF[x.id])
  const shelves: Shelf[] = [...BROWSE_GROUPS, ...(mine.length ? (['mine'] as const) : [])]
  const inShelf = (g: Shelf) => (g === 'mine' ? mine : list.filter((x) => GROUP_OF[x.id] === g))
  const soonOf = (g: Shelf) => (g === 'mine' ? [] : COMING_SOON.filter((x) => x.group === g && !shipped.has(x.id)))
  const featured = featuredOndas(list, activeId, today)

  const book = (x: OndaIndex) => <Book key={x.id} x={x} look={lookOf(x)} badge={x.id === activeId ? t('ondas.active') : x.custom ? t('ondas.mine') : undefined} onOpen={() => open(x.id)} />
  const soon = (x: ComingSoon) => <SoonBook key={x.name} x={x} />
  const head = (title: string, count: number, more?: { label: string; onClick: () => void }) => (
    <div className={w.secHead}>
      <h2 className={w.h2}>
        {title}
        <span className={w.count}>{count}</span>
      </h2>
      {more && (
        <button type="button" className={w.more} onClick={more.onClick} aria-label={`${title}, ${count}, ${more.label}`}>
          {more.label}
          <Icon name="caret-right" weight="bold" size={13} />
        </button>
      )}
    </div>
  )
  const pick = (g: Shelf | 'all') => {
    setGroup(g)
    pane.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  let content
  if (q) {
    const found = list.filter((x) => matches(q, x.name, x.origin))
    const later = COMING_SOON.filter((c) => !shipped.has(c.id) && matches(q, c.name, c.origin))
    const secs = shelves
      .map((g) => ({ g, real: g === 'mine' ? found.filter((x) => !GROUP_OF[x.id]) : found.filter((x) => GROUP_OF[x.id] === g), soon: later.filter((c) => c.group === g) }))
      .filter((s) => s.real.length + s.soon.length > 0)
    content = secs.length ? (
      secs.map((s) => (
        <section key={s.g} className={w.sec} aria-label={t(`browse.${s.g}`)}>
          {head(t(`browse.${s.g}`), s.real.length + s.soon.length)}
          <div className={w.grid}>
            {s.real.map(book)}
            {s.soon.map(soon)}
          </div>
        </section>
      ))
    ) : (
      <div className={w.none}>{t('ondas.noMatch')}</div>
    )
  } else if (group === 'all') {
    content = (
      <>
        {featured.length > 0 && (
          <section className={w.feat} aria-label={t('browse.featured')}>
            <div className={w.secHead}>
              <h2 className={w.h2}>{t('browse.featured')}</h2>
            </div>
            <div className={w.spread}>
              {featured.map((x, i) => (
                <div key={x.id} className={i === 0 ? w.lead : w.cell}>
                  <FeatureCover x={x} look={lookOf(x)} big={i === 0} kicker={x.id === activeId ? t('ondas.active') : t(`browse.short.${GROUP_OF[x.id] ?? 'mine'}`)} onOpen={() => open(x.id)} />
                </div>
              ))}
            </div>
          </section>
        )}
        {shelves.map((g) => {
          const all = [...inShelf(g).map((x) => ({ x })), ...soonOf(g).map((c) => ({ c }))]
          const shown = all.slice(0, cols * 2)
          return (
            <section key={g} className={w.sec} aria-label={t(`browse.${g}`)}>
              {head(t(`browse.${g}`), all.length, { label: t('browse.seeAll'), onClick: () => pick(g) })}
              <div className={w.grid}>{shown.map((it) => ('x' in it ? book(it.x) : soon(it.c)))}</div>
            </section>
          )
        })}
      </>
    )
  } else {
    content = (
      <section className={w.sec} aria-label={t(`browse.${group}`)} style={{ contentVisibility: 'visible' }}>
        {head(t(`browse.${group}`), inShelf(group).length + soonOf(group).length)}
        <div className={w.grid}>
          {inShelf(group).map(book)}
          {soonOf(group).map(soon)}
        </div>
      </section>
    )
  }

  return (
    <Screen variant="bare" style={{ padding: 0 }} scrollRef={pane} chrome={section ? undefined : <BackButton />}>
      <div className={w.page} data-chrome={section ? undefined : ''}>
        <header className={w.head}>
          <h1 className={w.title}>{t('ondas.allTitle')}</h1>
          <p className={w.sub}>{t('ondas.allSub')}</p>
        </header>
        <div ref={mark} aria-hidden />
        <div ref={bar} className={w.bar}>
          <label className={w.search}>
            <Icon name="magnifying-glass" size={17} />
            <input
              ref={field}
              type="search"
              value={query}
              placeholder={t('ondas.search')}
              aria-label={t('ondas.search')}
              autoComplete="off"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && query) {
                  e.preventDefault()
                  e.stopPropagation()
                  setQuery('')
                }
              }}
            />
            {query ? (
              <button type="button" className={w.clear} aria-label={t('ondas.clearSearch')} onClick={() => setQuery('')}>
                <Icon name="x-circle" weight="fill" size={18} />
              </button>
            ) : (
              <kbd className={w.kbd} aria-hidden>/</kbd>
            )}
          </label>
          {!q && (
            <div className={w.chips} role="tablist" aria-label={t('ondas.allTitle')}>
              {(['all', ...shelves] as const).map((g) => (
                <button key={g} type="button" role="tab" aria-selected={group === g} className={group === g ? `${w.chip} ${w.chipOn}` : w.chip} onClick={() => pick(g)}>
                  {t(`browse.short.${g}`)}
                  {g !== 'all' && <span className={w.chipN}>{inShelf(g).length}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div ref={body} className={w.body}>
          {content}
        </div>
      </div>
    </Screen>
  )
}
