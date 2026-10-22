import { Suspense, lazy, useDeferredValue, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BROWSE_GROUPS, COMING_SOON, GROUP_OF, byShelf, type BrowseGroup } from '@/content/browse'
import { planForDay, type DayPractice } from '@/data/derive/plan'
import { useLookFn, useOndaList, useSettings } from '@/data/hooks'
import { useStore } from '@/data/store'
import { useDesk } from '@/lib/desk'
import { BackButton, Screen } from '@/nav/Screen'
import { useNav } from '@/nav/store'
import { Button, GlassButton } from '@/ui/buttons'
import { Icon } from '@/ui/Icon'
import { Cover, GroupedList, PlanList, Row, SearchField, SectionHeader, ShortcutBar } from './onda7'
import c from './onda7/onda7.module.css'
import { EmblemArt } from './emblems'
import { OrnamentIcon } from './KindArt'
import { guardCreateOnda, useActiveOnda, useRunToday } from './ondaShared'
import s from './screens.module.css'

/** Ondas tab: the running Onda's cover, a glass row of shortcuts, Today's plan by time of day, then the quote. */
// The desktop has its own Today and Browse (src/desk/home); phones never load them.
const DeskToday = lazy(() => import('@/desk/home/DeskToday'))
const DeskBrowse = lazy(() => import('@/desk/home/DeskBrowse'))

export default function OndasTab() {
  return useDesk() ? (
    <Suspense fallback={null}>
      <DeskToday />
    </Suspense>
  ) : (
    <PhoneOndasTab />
  )
}

function PhoneOndasTab() {
  const { t } = useTranslation()
  const { push, openSheet } = useNav()
  const active = useActiveOnda()
  const settings = useSettings()
  const done = useRunToday(active?.run.id)
  const { togglePractice } = useStore.getState()

  const header = (
    <div className={s.titleRow}>
      <h1 className={s.largeTitle}>
        {t('ondas.title')}
      </h1>
      <div className={s.actions}>
        <GlassButton icon="plus" prominent ariaLabel={t('ondas.newOnda')} onClick={() => guardCreateOnda(t) && openSheet({ name: 'createOnda' })} />
        <GlassButton icon="compass" ariaLabel={t('ondas.browse')} onClick={() => push({ name: 'allOndas' })} />
        <GlassButton icon="gear-six" ariaLabel={t('a11y.settings')} onClick={() => push({ name: 'settings' })} />
      </div>
    </div>
  )

  if (!active) {
    return (
      <Screen variant="root">
        {header}
        <div className={c.empty}>
          <div className={c.emptyTitle}>{t('ondas.noRunning')}</div>
          <div className={c.emptySub}>{t('ondas.noRunningSub')}</div>
          <div style={{ marginTop: 18 }}>
            <Button size="md" onClick={() => push({ name: 'allOndas' })}>
              {t('ondas.browse')}
            </Button>
          </div>
        </div>
      </Screen>
    )
  }

  const { run, content, look, day, index } = active
  // until the content file has loaded, the run's own snapshot keeps the list from being empty
  const plan: DayPractice[] = content
    ? planForDay(content, day, { includeFood: settings.includeFood })
    : (run.snapshot?.practices ?? []).slice(0, 4).map((p) => ({ id: p.id, kind: 'practice', name: p.name, icon: p.icon, meta: p.time, slot: 'Morning', time: p.time }))
  const pDone = plan.filter((p) => done.practices.has(p.id)).length
  const progress = t('ondas.practicesOf', { done: pDone, total: plan.length })
  const name = index?.name ?? run.snapshot?.name ?? ''
  const kicker = t('ondas.kicker', { label: t('ondas.dayOf', { day, length: run.lengthDays }) })
  const rules = content?.rules ?? []
  const kept = rules.filter((r) => done.rules.has(r.id)).length

  return (
    <Screen variant="root">
      <div style={look.vars} className={settings.ondaThemes ? c.home : undefined} data-onda={settings.ondaThemes ? run.ondaId : undefined} data-soul={look.themed ? look.motion : undefined}>
        {header}
        <Cover
          look={look}
          size="hero"
          kicker={kicker}
          title={name}
          sub={index?.origin}
          mark={look.numeral(day)}
          days={{ day, length: run.lengthDays }}
          ariaLabel={`${kicker}, ${name}`}
          onClick={() => push({ name: 'onda', id: run.ondaId })}
        />

        <ShortcutBar
          label={t('ondas.shortcuts')}
          items={[
            { icon: 'headphones', label: t('ondas.immerse'), onClick: () => push({ name: 'immersion' }) },
            { icon: 'notebook', label: t('ondas.journal'), onClick: () => push({ name: 'journal' }) },
            { icon: 'lightbulb', label: t('ondas.philosophy'), onClick: () => push({ name: 'philosophy' }) },
            { icon: 'book-open-text', label: t('ondas.guideShort'), onClick: () => push({ name: 'guide', ondaId: run.ondaId }) },
          ]}
        />

        <SectionHeader title={t('ondas.today')} meta={progress} />
        {/* today's progress as a row of the Onda's own ornament, one for each practice */}
        <div className={c.beads} role="img" aria-label={progress}>
          {plan.map((p) => (
            <span key={p.id} className={done.practices.has(p.id) ? `${c.bead} ${c.beadOn}` : c.bead}>
              <OrnamentIcon name={look.ornament} size={22} />
            </span>
          ))}
        </div>
        {look.themed && plan.length > 0 && pDone === plan.length && (
          <div className={c.seal} role="status">
            <span className={c.sealMark} aria-hidden>
              <EmblemArt id={look.emblem} size={36} line={1.1} />
            </span>
            <span className={c.sealText}>
              <span className={c.sealTitle}>{t('ondas.sealed')}</span>
              <span className={c.sealSub}>{t('ondas.sealedSub', { count: plan.length })}</span>
            </span>
          </div>
        )}
        <PlanList
          ornament={look.themed ? look.ornament : undefined}
          plan={plan}
          done={done.practices}
          onToggle={(id) => togglePractice(run.id, id)}
          runId={run.id}
          info={{ ondaId: run.ondaId, style: look.vars, onda: settings.ondaThemes ? run.ondaId : undefined }}
          footer={plan.length ? t('onda.holdHint') : undefined}
        />

        {rules.length > 0 && (
          <GroupedList style={{ marginTop: 22 }}>
            <Row icon="scales" title={t('ondas.rules')} value={t('ondas.rulesKept', { done: kept, total: rules.length })} chevron onClick={() => push({ name: 'rules' })} />
          </GroupedList>
        )}

      </div>
    </Screen>
  )
}

type OndaItem = ReturnType<typeof useOndaList>[number]

/** One Onda as a cover tile, used by All Ondas and the Gallery picker. */
export function OndaTile({ x, onOpen, active }: { x: OndaItem; onOpen: () => void; active?: boolean }) {
  const { t } = useTranslation()
  const look = useLookFn()(x)
  return (
    <Cover
      look={look}
      size="tile"
      title={x.name}
      sub={x.origin}
      badge={active ? t('ondas.active') : x.custom ? t('ondas.mine') : undefined}
      mark={look.themed && look.glyph.length <= 3 ? look.glyph : undefined}
      onClick={onOpen}
    />
  )
}

const matches = (q: string, ...fields: (string | undefined)[]) => fields.some((f) => f?.toLocaleLowerCase().includes(q))

/** The four groups (religions, philosophies, states, cultures) with a collapsible header each, then the user's own Ondas.
 *  All Ondas also lists the worlds that are on the way; a picker shows only what exists. `query` filters by name and origin. */
export function OndaGroups({ onOpen, soon, query = '' }: { onOpen: (id: string) => void; soon?: boolean; query?: string }) {
  const { t } = useTranslation()
  const list = useOndaList()
  const activeId = useActiveOnda()?.run.ondaId
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const toggle = (k: string) => () => setClosed((v) => ({ ...v, [k]: !v[k] }))
  const q = query.trim().toLocaleLowerCase()
  const found = q ? list.filter((x) => matches(q, x.name, x.origin)) : list
  const mine = found.filter((x) => !GROUP_OF[x.id])
  const shipped = new Set(list.map((x) => x.id))
  const later = soon ? COMING_SOON.filter((c) => !shipped.has(c.id) && (!q || matches(q, c.name, c.origin))) : []
  const sections = [
    ...BROWSE_GROUPS.map((g) => ({ key: g, title: t(`browse.${g}`), real: found.filter((x) => GROUP_OF[x.id] === g).sort(byShelf), soon: later.filter((c) => c.group === g) })),
    ...(mine.length ? [{ key: 'mine', title: t('browse.mine'), real: mine, soon: [] as typeof COMING_SOON }] : []),
  ].filter((sec) => sec.real.length + sec.soon.length > 0)
  if (!sections.length) return <div className={c.noMatch}>{t('ondas.noMatch')}</div>
  return (
    <>
      {sections.map((sec) => {
        const open = !!q || !closed[sec.key]
        return (
          <section key={sec.key} aria-label={sec.title} className={c.browseSec}>
            <SectionHeader title={sec.title} meta={sec.real.length + sec.soon.length} open={open} onToggle={toggle(sec.key)} />
            {open && (
              <div className={c.grid}>
                {sec.real.map((x) => (
                  <OndaTile key={x.id} x={x} active={activeId === x.id} onOpen={() => onOpen(x.id)} />
                ))}
                {sec.soon.map((x) => (
                  <div key={x.name} className={c.soon} aria-disabled="true">
                    <span>
                      <span className={c.soonName}>{x.name}</span>
                      <span className={c.soonOrigin}>{x.origin}</span>
                    </span>
                    <span className={c.soonBadge}>{t('browse.soon')}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </>
  )
}

/** A large cover for the Featured row of All Ondas. */
function FeatureCover({ x, kicker, onOpen }: { x: OndaItem; kicker: string; onOpen: () => void }) {
  const look = useLookFn()(x)
  return <Cover look={look} size="hero" title={x.name} kicker={kicker} sub={x.line} onClick={onOpen} />
}

type Shelf = BrowseGroup | 'mine'

/** All Ondas, laid out like a bookshop: a search field and filter chips, a Featured row of large covers that changes each day,
 *  then one shelf per group that scrolls sideways, each with See All. A chip or See All shows that group as a grid. */
export function AllOndas() {
  return useDesk() ? (
    <Suspense fallback={null}>
      <DeskBrowse />
    </Suspense>
  ) : (
    <PhoneAllOndas />
  )
}

function PhoneAllOndas() {
  const { t } = useTranslation()
  const push = useNav((n) => n.push)
  const list = useOndaList()
  const today = useStore((x) => x.today)
  const activeId = useActiveOnda()?.run.ondaId
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<Shelf | 'all'>('all')
  const deferred = useDeferredValue(query)
  const q = deferred.trim()
  const open = (id: string) => push({ name: 'onda', id })
  const shipped = new Set(list.map((x) => x.id))
  const mine = list.filter((x) => !GROUP_OF[x.id])
  const shelves: Shelf[] = [...BROWSE_GROUPS, ...(mine.length ? (['mine'] as const) : [])]
  const inShelf = (g: Shelf) => (g === 'mine' ? mine : list.filter((x) => GROUP_OF[x.id] === g).sort(byShelf))
  const soonOf = (g: Shelf) => (g === 'mine' ? [] : COMING_SOON.filter((x) => x.group === g && !shipped.has(x.id)))
  const short = (g: Shelf | 'all') => t(`browse.short.${g}`)
  // the running Onda first, then four that change with the day
  const pool = list.filter((x) => GROUP_OF[x.id] && x.id !== activeId)
  const seed = [...today].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7)
  const featured = [...list.filter((x) => x.id === activeId), ...(pool.length ? Array.from({ length: 4 }, (_, i) => pool[(seed + i * 17) % pool.length]!) : [])]
    .filter((x, i, all) => all.findIndex((y) => y.id === x.id) === i)
  const tile = (x: OndaItem) => <OndaTile key={x.id} x={x} active={activeId === x.id} onOpen={() => open(x.id)} />
  const soonTile = (x: (typeof COMING_SOON)[number]) => (
    <div key={x.name} className={c.soon} aria-disabled="true">
      <span>
        <span className={c.soonName}>{x.name}</span>
        <span className={c.soonOrigin}>{x.origin}</span>
      </span>
      <span className={c.soonBadge}>{t('browse.soon')}</span>
    </div>
  )

  return (
    <Screen chrome={<BackButton />}>
      <div className={s.pageHead} style={{ paddingBottom: 4 }}>
        <h1 className={s.largeTitle}>{t('ondas.allTitle')}</h1>
        <div className={`${s.sub} ${s.sub2}`}>{t('ondas.allSub')}</div>
      </div>
      <SearchField value={query} onChange={setQuery} placeholder={t('ondas.search')} clearLabel={t('ondas.clearSearch')} />
      {!q && (
        <div className={`hscroll ${c.chips}`} role="tablist" aria-label={t('ondas.allTitle')}>
          {(['all', ...shelves] as const).map((g) => (
            <button key={g} type="button" role="tab" aria-selected={group === g} className={group === g ? `${c.chip} ${c.chipOn}` : c.chip} onClick={() => setGroup(g)}>
              {short(g)}
            </button>
          ))}
        </div>
      )}
      {q ? (
        <OndaGroups soon query={deferred} onOpen={open} />
      ) : group === 'all' ? (
        <>
          {featured.length > 0 && (
            <section aria-label={t('browse.featured')}>
              <h2 className={`${c.shelfTitle} ${c.featHead}`}>{t('browse.featured')}</h2>
              <div className={`hscroll ${c.feat}`}>
                {featured.map((x) => (
                  <div key={x.id} className={c.featItem}>
                    <FeatureCover x={x} kicker={x.id === activeId ? t('ondas.active') : short(GROUP_OF[x.id] ?? 'mine')} onOpen={() => open(x.id)} />
                  </div>
                ))}
              </div>
            </section>
          )}
          {shelves.map((g) => {
            const items = inShelf(g)
            const later = soonOf(g)
            return (
              <section key={g} aria-label={t(`browse.${g}`)} className={c.shelf}>
                <button type="button" className={c.shelfHead} onClick={() => setGroup(g)} aria-label={`${t(`browse.${g}`)}, ${items.length + later.length}, ${t('browse.seeAll')}`}>
                  <span className={c.shelfTitle}>{t(`browse.${g}`)}</span>
                  <span className={c.shelfMore} aria-hidden>
                    {t('browse.seeAll')}
                    <Icon name="caret-right" weight="bold" size={13} />
                  </span>
                </button>
                <div className={`hscroll ${c.shelfRow}`}>
                  {items.map((x) => <div key={x.id} className={c.shelfItem}>{tile(x)}</div>)}
                  {later.map((x) => <div key={x.name} className={c.shelfItem}>{soonTile(x)}</div>)}
                </div>
              </section>
            )
          })}
        </>
      ) : (
        <section aria-label={t(`browse.${group}`)}>
          <h2 className={`${c.shelfTitle} ${c.featHead}`}>{t(`browse.${group}`)}</h2>
          <div className={c.grid}>
            {inShelf(group).map(tile)}
            {soonOf(group).map(soonTile)}
          </div>
        </section>
      )}
    </Screen>
  )
}
