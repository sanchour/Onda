import { useDeferredValue, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BROWSE_GROUPS, COMING_SOON, GROUP_OF } from '@/content/browse'
import { planForDay, type DayPractice } from '@/data/derive/plan'
import { useLookFn, useOndaList, useSettings } from '@/data/hooks'
import { useStore } from '@/data/store'
import { BackButton, Screen } from '@/nav/Screen'
import { useNav } from '@/nav/store'
import { Button, GlassButton } from '@/ui/buttons'
import { ProgressBar } from '@/ui/data'
import { Cover, GroupedList, PlanList, Row, SearchField, SectionHeader, ShortcutBar } from './onda7'
import c from './onda7/onda7.module.css'
import { guardCreateOnda, useActiveOnda, useRunToday } from './ondaShared'
import s from './screens.module.css'

/** Ondas tab: the running Onda's cover, a glass row of shortcuts, Today's plan by time of day, then the quote. */
export default function OndasTab() {
  const { t } = useTranslation()
  const { push, openSheet } = useNav()
  const active = useActiveOnda()
  const settings = useSettings()
  const done = useRunToday(active?.run.id)
  const { togglePractice } = useStore.getState()

  const header = (
    <div className={s.titleRow}>
      <h1 className={s.largeTitle}>{t('ondas.title')}</h1>
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
      <div style={look.vars} data-onda={settings.ondaThemes ? run.ondaId : undefined}>
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
        <div className={c.progress}>
          <ProgressBar value={plan.length ? pDone / plan.length : 0} tone="var(--onda-accent)" height={4} label={progress} />
        </div>
        <PlanList
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
    ...BROWSE_GROUPS.map((g) => ({ key: g, title: t(`browse.${g}`), real: found.filter((x) => GROUP_OF[x.id] === g), soon: later.filter((c) => c.group === g) })),
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

/** All Ondas: a search field, then every Onda by group, with quiet placeholders for the ones still to come. */
export function AllOndas() {
  const { t } = useTranslation()
  const push = useNav((n) => n.push)
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  return (
    <Screen chrome={<BackButton />}>
      <div className={s.pageHead} style={{ paddingBottom: 4 }}>
        <h1 className={s.largeTitle}>{t('ondas.allTitle')}</h1>
        <div className={`${s.sub} ${s.sub2}`}>{t('ondas.allSub')}</div>
      </div>
      <SearchField value={query} onChange={setQuery} placeholder={t('ondas.search')} clearLabel={t('ondas.clearSearch')} />
      <OndaGroups soon query={deferred} onOpen={(id) => push({ name: 'onda', id })} />
    </Screen>
  )
}
