import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { mediaFor } from '@/content'
import { immerseSet } from '@/data/derive/onda'
import { planForDay, type DayPractice } from '@/data/derive/plan'
import { useLookFn, useOndaList, useSettings } from '@/data/hooks'
import { useStore } from '@/data/store'
import { fromDateStr } from '@/lib/dates'
import { detId } from '@/lib/ids'
import { Screen } from '@/nav/Screen'
import { useNav } from '@/nav/store'
import { EmblemArt } from '@/screens/emblems'
import { guardCreateOnda, useActiveOnda, useRunToday, type ActiveOnda } from '@/screens/ondaShared'
import { Icon } from '@/ui/Icon'
import { Book, featuredOndas } from './books'
import h from './home.module.css'
import { DayPlan, Hero, Panel, ProgressPanel, QuotePanel, RulesGrid, Section, Tile, WordPanel, dayContent } from './parts'

/* Today on the desktop: the running Onda's cover across the stage, the day as a path of practice cards beside a column
   of today's progress, quote, word and journal prompt, then its rules and its other rooms. With no Onda running, an
   invitation and a few covers on a shelf. Same data and actions as the phone's Ondas tab (screens/OndasTab.tsx). */

const longDate = (d: string) => fromDateStr(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

export default function DeskToday() {
  const active = useActiveOnda()
  return active ? <Running active={active} /> : <Empty />
}

function Running({ active }: { active: ActiveOnda }) {
  const { t } = useTranslation()
  const push = useNav((n) => n.push)
  const openSheet = useNav((n) => n.openSheet)
  const settings = useSettings()
  const today = useStore((x) => x.today)
  const journal = useStore((x) => x.journal)
  const immerseLogs = useStore((x) => x.immerseLogs)
  const done = useRunToday(active.run.id)
  const pane = useRef<HTMLDivElement>(null)
  const top = useRef<HTMLDivElement>(null)
  const mini = useRef<HTMLDivElement>(null)
  const { run, content, look, day, index } = active
  const media = useMemo(() => (content ? mediaFor(content, { includeFood: settings.includeFood }) : []), [content, settings.includeFood])
  const seen = useMemo(() => immerseSet(immerseLogs, run.id), [immerseLogs, run.id])

  // the small bar takes over once the cover has scrolled away
  useEffect(() => {
    const root = pane.current
    const el = top.current
    const bar = mini.current
    if (!root || !el || !bar || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => e && bar.toggleAttribute('data-on', !e.isIntersecting), { root, rootMargin: '-64px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // until the content file has loaded, the run's own snapshot keeps the plan from being empty (as on the phone)
  const plan: DayPractice[] = content
    ? planForDay(content, day, { includeFood: settings.includeFood })
    : (run.snapshot?.practices ?? []).slice(0, 4).map((p) => ({ id: p.id, kind: 'practice', name: p.name, icon: p.icon, meta: p.time, slot: 'Morning', time: p.time }))
  const pDone = plan.filter((p) => done.practices.has(p.id)).length
  const name = index?.name ?? run.snapshot?.name ?? ''
  const dayLabel = t('ondas.dayOf', { day, length: run.lengthDays })
  const rules = content?.rules ?? []
  const kept = rules.filter((r) => done.rules.has(r.id)).length
  const words = content ? dayContent(content, day) : undefined
  const left = run.lengthDays - day
  const written = journal.some((j) => j.id === detId('journal', run.id, day) && !j.deletedAt)
  const entries = journal.filter((j) => j.runId === run.id && !j.deletedAt).length
  const themed = settings.ondaThemes
  const { togglePractice, toggleItem } = useStore.getState()
  const openOnda = () => push({ name: 'onda', id: run.ondaId })
  const newOnda = () => guardCreateOnda(t) && openSheet({ name: 'createOnda' })

  return (
    <Screen variant="bare" style={{ padding: 0 }} scrollRef={pane}>
      <div className={h.page} style={look.vars} data-onda={themed ? run.ondaId : undefined}>
        <div ref={top}>
          <Hero
            look={look}
            title={name}
            kicker={t('ondas.kicker', { label: dayLabel })}
            glyph={look.themed ? look.glyph : undefined}
            sub={index?.origin}
            lede={words?.theme ? t('onda.todayTheme', { theme: words.theme }) : undefined}
            mark={look.numeral(day)}
            day={day}
            length={run.lengthDays}
            foot={[longDate(today), left > 0 ? t('deskHome.daysLeft', { count: left }) : t('deskHome.lastDay')]}
            actions={
              <>
                <button type="button" className={`${h.pill} ${h.pillSolid}`} onClick={openOnda}>
                  {t('deskHome.openOnda')}
                  <Icon name="arrow-right" weight="bold" size={16} />
                </button>
                <button type="button" className={`${h.pill} ${h.pillGlass}`} onClick={newOnda}>
                  <Icon name="plus" weight="bold" size={16} />
                  {t('ondas.newOnda')}
                </button>
              </>
            }
          />
        </div>

        <div ref={mini} className={h.mini}>
          <div className={h.miniBar}>
            <span className={h.miniArt} style={{ background: look.cover, color: look.ink }} aria-hidden>
              {look.emblem ? <EmblemArt id={look.emblem} size={26} line={1} /> : <Icon name="waves" size={18} />}
            </span>
            <span className={h.miniName}>{name}</span>
            <span className={h.miniDay}>{dayLabel}</span>
            <span className={h.miniEnd}>{t('ondas.practicesOf', { done: pDone, total: plan.length })}</span>
          </div>
        </div>

        <div className={h.wrap}>
          <div className={h.main}>
            <Section title={t('onda.practices')} meta={t('deskHome.doneOf', { done: pDone, total: plan.length })} id="dk-practices">
              <DayPlan plan={plan} done={done.practices} onToggle={(id) => togglePractice(run.id, id)} scope={{ look, ondaId: run.ondaId, runId: run.id, content, onda: themed ? run.ondaId : undefined }} />
              {plan.length > 0 && <p className={h.hint}>{t('deskHome.hint')}</p>}
            </Section>

            {rules.length > 0 && (
              <Section title={t('ondas.rules')} meta={t('ondas.rulesKept', { done: kept, total: rules.length })} id="dk-rules">
                <RulesGrid rules={rules} done={done.rules} numeral={look.numeral} onToggle={(id) => toggleItem('ruleLogs', run.id, id)} />
              </Section>
            )}

            <Section title={t('deskHome.deeper')} id="dk-deeper">
              <div className={h.tiles}>
                <Tile icon="headphones" title={t('ondas.immerse')} sub={media.length ? t('immersion.experienced', { done: media.filter((m) => seen.has(m.id)).length, total: media.length }) : undefined} onClick={() => push({ name: 'immersion' })} />
                <Tile icon="notebook" title={t('ondas.journal')} sub={t('journal.count', { count: entries })} onClick={() => push({ name: 'journal' })} />
                <Tile icon="lightbulb" title={t('ondas.philosophy')} sub={words?.phil?.title} onClick={() => push({ name: 'philosophy' })} />
                <Tile icon="book-open-text" title={t('ondas.guideShort')} sub={t('onda.guideSub')} onClick={() => push({ name: 'guide', ondaId: run.ondaId })} />
              </div>
            </Section>
          </div>

          <aside className={h.side} aria-label={t('deskHome.aside')}>
            <ProgressPanel look={look} plan={plan} done={done.practices} rules={{ kept, total: rules.length }} />
            {words?.prompt && (
              <Panel kicker={t('onda.journalDay', { day })}>
                <p className={h.prompt} data-selectable>{words.prompt}</p>
                <div className={h.panelBtns}>
                  <button type="button" className={written ? h.btnSoft : h.btn} onClick={() => openSheet({ name: 'journalEdit' })}>
                    <Icon name={written ? 'check' : 'pencil-simple'} weight="bold" size={16} />
                    {written ? t('onda.editEntry') : t('onda.write')}
                  </button>
                </div>
              </Panel>
            )}
            {words?.quote && <QuotePanel look={look} quote={words.quote} />}
            {words?.word && <WordPanel word={words.word} />}
          </aside>
        </div>
      </div>
    </Screen>
  )
}

const LEAN = [-4, -1.5, 0, 2, 4.5]

/** No Onda running: an invitation, and the day's featured covers stood on a shelf. */
function Empty() {
  const { t } = useTranslation()
  const push = useNav((n) => n.push)
  const openSheet = useNav((n) => n.openSheet)
  const list = useOndaList()
  const lookOf = useLookFn()
  const today = useStore((x) => x.today)
  const picks = featuredOndas(list, undefined, today)
  return (
    <Screen variant="bare" style={{ padding: 0 }}>
      <div className={h.page}>
        <div className={h.empty}>
          <span className={h.emptyKick}>{longDate(today)}</span>
          <h1 className={h.emptyTitle}>{t('deskHome.emptyTitle')}</h1>
          <p className={h.emptySub}>{t('deskHome.emptySub')}</p>
          <div className={h.emptyBtns}>
            <button type="button" className={`${h.pill} ${h.pillSolid}`} onClick={() => push({ name: 'allOndas' })}>
              <Icon name="compass" weight="bold" size={17} />
              {t('ondas.browse')}
            </button>
            <button type="button" className={`${h.pill} ${h.pillGlass}`} onClick={() => guardCreateOnda(t) && openSheet({ name: 'createOnda' })}>
              <Icon name="plus" weight="bold" size={16} />
              {t('ondas.newOnda')}
            </button>
          </div>
          {picks.length > 0 && (
            <div className={h.shelf} role="group" aria-label={t('browse.featured')}>
              {picks.map((x, i) => (
                <div key={x.id} className={h.shelfBook} style={{ '--lean': `${LEAN[i] ?? 0}deg` } as CSSProperties}>
                  <Book x={x} look={lookOf(x)} onOpen={() => push({ name: 'onda', id: x.id })} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Screen>
  )
}
