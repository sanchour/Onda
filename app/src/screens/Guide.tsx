import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { GROUP_OF } from '@/content/browse'
import { useLook, useOnda, useOndaIndex, useSettings } from '@/data/hooks'
import { useDesk } from '@/lib/desk'
import { haptic } from '@/lib/haptics'
import { reducedMotion } from '@/lib/motion'
import { BackButton, ChromeSpacer, ChromeTitle, Screen } from '@/nav/Screen'
import { useNav, type StackEntry } from '@/nav/store'
import { GlassButton } from '@/ui/buttons'
import { Icon } from '@/ui/Icon'
import { Sheet } from '@/ui/Sheet'
import { Collapse, openExternal } from '@/sheets/guideParts'
import g from '@/sheets/guide.module.css'
import { OrnamentIcon } from './KindArt'
import { MediaCard } from './MediaCard'
import { Cover } from './onda7'
import { useActiveOnda } from './ondaShared'
import { OndaMapWidget, OndaPlacesMap } from './OndaMap'
import s from './screens.module.css'

/* ── Full guide (8.0): one article, read like Wikipedia ──
   The cover first, then the name, a lead that opens on Read more, note of respect widget, an infobox, interactive map,
   and the Onda's quote. Then numbered chapters (People, History, Ideas, Practices, Culture, Language, Places,
   Did you know, References). Sections support horizontal swiping with minimal iOS tab indicators or header action icons. */

const CHAPTERS = ['people', 'history', 'ideas', 'practices', 'culture', 'language', 'places', 'facts', 'refs'] as const
type Chapter = (typeof CHAPTERS)[number]
const CULTURE = ['read', 'watch', 'listen', 'art', 'eat', 'drink', 'games', 'customs'] as const
type CultureKind = (typeof CULTURE)[number]
const CAP = 5
/** A chapter is current once its top is this close to the top of the screen. */
const SPY = 140

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^\p{Lu}/u.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('') || name.slice(0, 2).toUpperCase()

/** Minimal iOS tab indicator underneath horizontally scrollable cards */
function IosTabs({ total, active }: { total: number; active: number }) {
  if (total <= 1) return null
  return (
    <div className={g.iosTabs} aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={g.iosTabDot}
          data-active={i === active || undefined}
          data-near={Math.abs(i - active) === 1 || undefined}
        />
      ))}
    </div>
  )
}

export default function Guide({ entry }: { entry: Extract<StackEntry, { name: 'guide' }> }) {
  const { t } = useTranslation()
  const { openSheet } = useNav()
  const desk = useDesk()
  const themed = useSettings().ondaThemes
  const index = useOndaIndex(entry.ondaId)
  const content = useOnda(entry.ondaId)
  const look = useLook(index)
  const pane = useRef<HTMLDivElement>(null)
  const secs = useRef(new Map<Chapter, HTMLElement>())
  const [drawer, setDrawer] = useState(false)
  const [at, setAt] = useState<Chapter | 'top'>('top')
  const [all, setAll] = useState<Partial<Record<string, boolean>>>({})
  const [introOpen, setIntroOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [tl, setTl] = useState(0)
  const [cultureTab, setCultureTab] = useState<CultureKind | undefined>()
  const [fact, setFact] = useState(0)

  // Active sheets for interactive details
  const [activeIdea, setActiveIdea] = useState<{
    title: string
    text: string
    practice?: string
    kind: 'think' | 'ethics' | 'concept'
  } | null>(null)

  const [wordsFullScreen, setWordsFullScreen] = useState(false)

  const [activeWord, setActiveWord] = useState<{
    term: string
    meaning: string
    pronunciation?: string
    usage?: string
    language?: string
    unverified?: boolean
  } | null>(null)

  // Tab indices for iOS minimal indicator
  const [thinkIdx, setThinkIdx] = useState(0)
  const [ethicsIdx, setEthicsIdx] = useState(0)
  const [ruleIdx, setRuleIdx] = useState(0)
  const [glossaryIdx, setGlossaryIdx] = useState(0)

  const gd = content?.guide
  const flip = (k: string) => setAll((x) => ({ ...x, [k]: !x[k] }))
  const cap = <T,>(k: string, list: readonly T[]) => (all[k] ? list : list.slice(0, CAP))

  const cultureKinds = useMemo(() => CULTURE.filter((k) => (content?.immerse[k]?.length ?? 0) > 0), [content])
  const places = useMemo(
    () => [
      ...(content?.immerse.festivals ?? []).map((x) => ({ ...x, icon: 'calendar-star' })),
      ...(content?.immerse.places ?? []).map((x) => ({ ...x, icon: 'map-pin' })),
    ],
    [content],
  )
  const has: Record<Chapter, boolean> = {
    people: !!gd?.figures.length,
    history: !!gd?.history.length,
    ideas: !!(gd?.concepts.length || content?.philosophy.length || content?.ethics.length),
    practices: !!(content?.practices.length || content?.rules.length),
    culture: cultureKinds.length > 0,
    language: !!(content?.words.length || gd?.glossary.length),
    places: places.length > 0,
    facts: !!gd?.facts.length,
    refs: !!(gd?.sources.length || gd?.furtherReading.length || gd?.learnFrom.length),
  }
  const present = CHAPTERS.filter((k) => has[k])
  const label = (k: Chapter) => t(`guide.ch.${k}`)

  // Scroll spy
  useEffect(() => {
    const root = pane.current
    if (!root) return
    let raf = 0
    const spy = () => {
      raf = 0
      const top = root.getBoundingClientRect().top
      let cur: Chapter | 'top' = 'top'
      for (const k of present) {
        const el = secs.current.get(k)
        if (el && el.getBoundingClientRect().top - top <= SPY) cur = k
      }
      setAt(cur)
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(spy)
    }
    root.addEventListener('scroll', on, { passive: true })
    return () => {
      root.removeEventListener('scroll', on)
      cancelAnimationFrame(raf)
    }
  }, [present.join()])

  useEffect(() => {
    if (!drawer) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [drawer])

  const go = (k: Chapter | 'top') => {
    setDrawer(false)
    const root = pane.current
    if (!root) return
    const el = k === 'top' ? undefined : secs.current.get(k)
    const top = el ? el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 104 : 0
    root.scrollTo({ top, behavior: reducedMotion() ? 'auto' : 'smooth' })
  }

  const chapter = (
    k: Chapter,
    body: ReactNode,
    action?: { icon?: string; label?: string; onClick: () => void; active?: boolean },
  ) => (
    <section
      key={k}
      data-sec={k}
      aria-labelledby={`wk-${k}`}
      className={g.wkSec}
      ref={(el) => {
        if (el) secs.current.set(k, el)
        else secs.current.delete(k)
      }}
    >
      <h2 id={`wk-${k}`} className={g.wkH2}>
        <span className={g.wkH2Title}>
          {label(k)}
        </span>
        {action && (
          <button
            type="button"
            className={g.wkH2Action}
            aria-label={action.label}
            aria-expanded={action.active}
            onClick={action.onClick}
          >
            <Icon name={action.icon || 'caret-right'} weight="bold" size={17} />
          </button>
        )}
      </h2>
      {body}
    </section>
  )
  const unverified = (u?: boolean) => u && <span className={g.wkTag}>{t('guide.unverified')}</span>

  const body = (k: Chapter): ReactNode => {
    if (!content || !gd) return null
    switch (k) {
      case 'people':
        return (
          <div className={`hscroll ${g.wkPeople}`}>
            {gd.figures.map((f) => (
              <article key={f.name} className={g.wkPerson}>
                <div className={g.wkPersonTop}>
                  <span className={g.wkInit} aria-hidden>{initials(f.name)}</span>
                  <span className={g.wkPersonName}>
                    <b>{f.name}</b>
                    {f.dates && <small>{f.dates}</small>}
                  </span>
                </div>
                <p className={g.wkBio} data-selectable>{f.bio}</p>
                {unverified(f.unverified)}
              </article>
            ))}
          </div>
        )
      case 'history': {
        const list = gd.history
        const i = Math.min(tl, list.length - 1)
        const h = list[i]!
        const step = (to: number) => {
          setTl(to)
          haptic('select')
        }
        return (
          <>
            <div className={`hscroll ${g.wkLine}`} role="tablist" aria-label={label('history')}>
              {list.map((x, n) => (
                <button key={n} type="button" role="tab" aria-selected={n === i} className={g.wkNode} onClick={() => step(n)}>
                  <span className={g.wkDot} data-on={n === i || undefined} aria-hidden />
                  <span className={g.wkWhen}>{x.when}</span>
                </button>
              ))}
            </div>
            <div className={g.wkCard} role="tabpanel" aria-live="polite">
              <span className={g.wkCardKicker}>{h.when}</span>
              <h3 className={g.wkCardTitle}>{h.what}</h3>
              {h.detail && <p className={g.wkCardText} data-selectable>{h.detail}</p>}
              {unverified(h.unverified)}
              <div className={g.wkStep}>
                <span>{t('guide.nOf', { n: i + 1, total: list.length })}</span>
                <button type="button" className={g.wkRound} aria-label={t('guide.previous')} disabled={i === 0} onClick={() => step(i - 1)}>
                  <Icon name="caret-left" weight="bold" size={18} />
                </button>
                <button type="button" className={g.wkRound} aria-label={t('guide.next')} disabled={i === list.length - 1} onClick={() => step(i + 1)}>
                  <Icon name="caret-right" weight="bold" size={18} />
                </button>
              </div>
            </div>
          </>
        )
      }
      case 'ideas': {
        const list = gd.concepts
        return (
          <>
            {list.length > 0 && (
              all.ideas ? (
                <div className={g.wkIdeaGrid}>
                  {list.map((c) => (
                    <article
                      key={c.term}
                      className={g.wkIdeaCard}
                      style={{ width: 'auto' }}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        haptic('select')
                        setActiveIdea({
                          title: c.term,
                          text: [c.text, c.detail].filter(Boolean).join('\n\n'),
                          kind: 'concept',
                        })
                      }}
                    >
                      <h3 className={g.wkIdeaTitle}>{c.term}</h3>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={`hscroll ${g.wkSwipeCards}`}>
                  {list.map((c) => (
                    <article
                      key={c.term}
                      className={g.wkIdeaCard}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        haptic('select')
                        setActiveIdea({
                          title: c.term,
                          text: [c.text, c.detail].filter(Boolean).join('\n\n'),
                          kind: 'concept',
                        })
                      }}
                    >
                      <h3 className={g.wkIdeaTitle}>{c.term}</h3>
                    </article>
                  ))}
                </div>
              )
            )}

            {/* Think about: horizontally swipable cards with minimal iOS tabs */}
            {content.philosophy.length > 0 && (
              <div className={g.wkSub}>
                <div className={g.wkH3}>
                  <span className={g.wkH3Title}>{t('philosophy.think')}</span>
                </div>
                <div
                  className={`hscroll ${g.wkSwipeCards}`}
                  onScroll={(e) => {
                    const el = e.currentTarget
                    const w = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 1
                    const n = Math.round(el.scrollLeft / (w + 12))
                    if (n !== thinkIdx) setThinkIdx(n)
                  }}
                >
                  {content.philosophy.map((p, n) => (
                    <article
                      key={n}
                      className={g.wkIdeaCard}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        haptic('select')
                        setActiveIdea({
                          title: p.title,
                          text: p.text,
                          practice: p.practice,
                          kind: 'think',
                        })
                      }}
                    >
                      <h4 className={g.wkIdeaTitle}>{p.title}</h4>
                    </article>
                  ))}
                </div>
                <IosTabs total={content.philosophy.length} active={thinkIdx} />
              </div>
            )}

            {/* Ethics and morality: same as think about */}
            {content.ethics.length > 0 && (
              <div className={g.wkSub}>
                <div className={g.wkH3}>
                  <span className={g.wkH3Title}>{t('philosophy.ethics')}</span>
                </div>
                <div
                  className={`hscroll ${g.wkSwipeCards}`}
                  onScroll={(e) => {
                    const el = e.currentTarget
                    const w = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 1
                    const n = Math.round(el.scrollLeft / (w + 12))
                    if (n !== ethicsIdx) setEthicsIdx(n)
                  }}
                >
                  {content.ethics.map((p, n) => (
                    <article
                      key={n}
                      className={g.wkIdeaCard}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        haptic('select')
                        setActiveIdea({
                          title: p.title,
                          text: p.text,
                          practice: p.practice,
                          kind: 'ethics',
                        })
                      }}
                    >
                      <h4 className={g.wkIdeaTitle}>{p.title}</h4>
                    </article>
                  ))}
                </div>
                <IosTabs total={content.ethics.length} active={ethicsIdx} />
              </div>
            )}
          </>
        )
      }
      case 'practices':
        return (
          <>
            {content.practices.length > 0 && (
              all.practices ? (
                <div className={g.wkPracticeStack}>
                  {content.practices.map((p) => (
                    <article
                      key={p.id}
                      className={g.wkPracticeCard}
                      style={{ width: 'auto' }}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        haptic('select')
                        openSheet({ name: 'practiceInfo', ondaId: entry.ondaId, practiceId: p.id })
                      }}
                    >
                      <div className={g.wkPracticeHead}>
                        <span className={g.wkPracticeIcon}><Icon name={p.icon} weight="regular" size={20} /></span>
                        <div className={g.wkPracticeText}>
                          <h4 className={g.wkPracticeTitle}>{p.name}</h4>
                          {(p.why || p.meta) && <span className={g.wkPracticeSub}>{p.why || p.meta}</span>}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={`hscroll ${g.wkSwipeCards}`}>
                  {content.practices.map((p) => (
                    <article
                      key={p.id}
                      className={g.wkPracticeCard}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        haptic('select')
                        openSheet({ name: 'practiceInfo', ondaId: entry.ondaId, practiceId: p.id })
                      }}
                    >
                      <div className={g.wkPracticeHead}>
                        <span className={g.wkPracticeIcon}><Icon name={p.icon} weight="regular" size={20} /></span>
                        <div className={g.wkPracticeText}>
                          <h4 className={g.wkPracticeTitle}>{p.name}</h4>
                          {(p.why || p.meta) && <span className={g.wkPracticeSub}>{p.why || p.meta}</span>}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )
            )}

            {/* Rules: same as think about */}
            {content.rules.length > 0 && (
              <div className={g.wkSub}>
                <div className={g.wkH3}>
                  <span className={g.wkH3Title}>{t('guide.rules')}</span>
                </div>
                <div
                  className={`hscroll ${g.wkSwipeCards}`}
                  onScroll={(e) => {
                    const el = e.currentTarget
                    const w = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 1
                    const n = Math.round(el.scrollLeft / (w + 12))
                    if (n !== ruleIdx) setRuleIdx(n)
                  }}
                >
                  {content.rules.map((r) => (
                    <article key={r.id} className={g.wkRuleCard} data-frame={look.layout === 'frame' || undefined}>
                      <b className={g.wkRuleText}>{r.text}</b>
                      {r.why && <span className={g.wkRuleWhy}>{r.why}</span>}
                    </article>
                  ))}
                </div>
                <IosTabs total={content.rules.length} active={ruleIdx} />
              </div>
            )}
          </>
        )
      case 'culture': {
        const kind = cultureTab && cultureKinds.includes(cultureTab) ? cultureTab : cultureKinds[0]!
        const items = content.immerse[kind] ?? []
        return (
          <>
            <div className={`hscroll ${g.wkTabs}`} role="tablist" aria-label={label('culture')}>
              {cultureKinds.map((k) => (
                <button key={k} type="button" role="tab" aria-selected={k === kind} className={g.wkTab} onClick={() => setCultureTab(k)}>
                  {t(`kindLabel.${k}`)}
                </button>
              ))}
            </div>
            {all.culture ? (
              <ul className={g.wkList} role="tabpanel">
                {items.map((x) => {
                  const mediaItem = {
                    ...x,
                    kind,
                    meta: [x.creator, x.year].filter(Boolean).join(', '),
                  }
                  return (
                    <li
                      key={x.id}
                      className={g.wkRow}
                      role="button"
                      tabIndex={0}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        haptic('select')
                        openSheet({ name: 'mediaInfo', item: mediaItem, ondaId: entry.ondaId })
                      }}
                    >
                      <span className={g.wkRowText}>
                        <b>{x.title}</b>
                        {(x.creator || x.year) && <small>{[x.creator, x.year].filter(Boolean).join(', ')}</small>}
                        {x.why && <span>{x.why}</span>}
                        {unverified(x.unverified)}
                      </span>
                      <span className={g.wkLink} aria-hidden>
                        <Icon name="caret-right" weight="bold" size={16} />
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className={`hscroll ${g.wkCultureMedia}`} role="tabpanel">
                {items.map((x) => {
                  const mediaItem = {
                    id: x.id,
                    kind,
                    title: x.title,
                    meta: [x.creator, x.year].filter(Boolean).join(', '),
                    why: x.why,
                    creator: x.creator,
                    year: x.year,
                    link: x.link,
                    unverified: x.unverified,
                  }
                  return (
                    <MediaCard
                      key={x.id}
                      item={mediaItem}
                      done={false}
                      onToggle={() => {
                        haptic('select')
                        openSheet({ name: 'mediaInfo', item: mediaItem, ondaId: entry.ondaId })
                      }}
                      onOpen={() => {
                        haptic('select')
                        openSheet({ name: 'mediaInfo', item: mediaItem, ondaId: entry.ondaId })
                      }}
                      ornament={look.ornament}
                      frame={look.layout === 'frame'}
                    />
                  )
                })}
              </div>
            )}
          </>
        )
      }
      case 'language':
        return (
          <>
            {content.words.length > 0 && (
              all.words ? (
                <div className={g.wkFolds}>
                  {content.words.map((w) => (
                    <article
                      key={w.id}
                      className={g.wkFold}
                      role="button"
                      tabIndex={0}
                      style={{ padding: '16px', cursor: 'pointer' }}
                      onClick={() => {
                        haptic('select')
                        setActiveWord(w)
                      }}
                    >
                      {w.language && <span className={g.wkPill}>{w.language}</span>}
                      <span className={g.wkWordTerm} style={{ display: 'block', margin: '6px 0 2px' }}>{w.term}</span>
                      {w.pronunciation && <span className={g.wkSay} style={{ display: 'block', marginBottom: '4px' }}>{w.pronunciation}</span>}
                      <span className={g.wkMeaning} style={{ display: 'block', marginBottom: '4px' }}>{w.meaning}</span>
                      {w.usage && <span className={g.wkUsage} style={{ display: 'block' }}>{w.usage}</span>}
                      {unverified(w.unverified)}
                    </article>
                  ))}
                </div>
              ) : (
                <div className={`hscroll ${g.wkWords}`}>
                  {content.words.map((w) => (
                    <article
                      key={w.id}
                      className={g.wkWord}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        haptic('select')
                        setActiveWord(w)
                      }}
                    >
                      {w.language && <span className={g.wkPill}>{w.language}</span>}
                      <span className={g.wkWordTerm}>{w.term}</span>
                      {w.pronunciation && <span className={g.wkSay}>{w.pronunciation}</span>}
                      <span className={g.wkMeaning}>{w.meaning}</span>
                      {w.usage && <span className={g.wkUsage}>{w.usage}</span>}
                      {unverified(w.unverified)}
                    </article>
                  ))}
                </div>
              )
            )}

            {/* Glossary: same as think about */}
            {gd.glossary.length > 0 && (
              <div className={g.wkSub}>
                <div className={g.wkH3}>
                  <span className={g.wkH3Title}>{t('guide.glossary')}</span>
                </div>
                <div
                  className={`hscroll ${g.wkSwipeCards}`}
                  onScroll={(e) => {
                    const el = e.currentTarget
                    const w = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 1
                    const n = Math.round(el.scrollLeft / (w + 12))
                    if (n !== glossaryIdx) setGlossaryIdx(n)
                  }}
                >
                  {gd.glossary.map((x) => (
                    <article
                      key={x.term}
                      className={g.wkGlossCard}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        haptic('select')
                        setActiveWord({ term: x.term, meaning: x.meaning })
                      }}
                    >
                      <span className={g.wkGlossTerm}>{x.term}</span>
                      <span className={g.wkGlossMeaning}>{x.meaning}</span>
                    </article>
                  ))}
                </div>
                <IosTabs total={gd.glossary.length} active={glossaryIdx} />
              </div>
            )}
          </>
        )
      case 'places':
        return <OndaPlacesMap ondaId={entry.ondaId} places={places} look={look} />
      case 'facts': {
        const facts = all.facts ? gd.facts : cap('facts', gd.facts)
        return (
          <>
            <div
              className={`hscroll ${g.wkFacts}`}
              onScroll={(e) => {
                const el = e.currentTarget
                const w = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 1
                const n = Math.round(el.scrollLeft / (w + 12))
                if (n !== fact) setFact(n)
              }}
            >
              {facts.map((f, n) => (
                <article key={n} className={g.wkFact} data-frame={look.layout === 'frame' || undefined}>
                  <span className={g.wkFactN}>{t('guide.nOf', { n: n + 1, total: gd.facts.length })}</span>
                  <p data-selectable>{f.text}</p>
                  <span className={g.wkFactOrn} aria-hidden><OrnamentIcon name={look.ornament} size={22} /></span>
                  {unverified(f.unverified)}
                </article>
              ))}
            </div>
            {facts.length > 1 && (
              <div className={g.wkDots} aria-hidden>
                {facts.map((_, n) => <i key={n} data-on={n === fact || undefined} />)}
              </div>
            )}
          </>
        )
      }
      case 'refs': {
        const lists: { key: string; title: string; rows: { title: string; meta?: string; link?: string }[] }[] = [
          { key: 'further', title: t('guide.furtherReading'), rows: gd.furtherReading.map((r) => ({ title: r.title, meta: [r.creator, r.year, r.note].filter(Boolean).join(', ') })) },
          { key: 'learn', title: t('guide.learnFrom'), rows: gd.learnFrom.map((r) => ({ title: r.name, meta: r.note, link: r.link })) },
          { key: 'sources', title: t('guide.sources'), rows: gd.sources.map((r) => ({ title: r.title, meta: [r.creator, r.publisher, r.year].filter(Boolean).join(', '), link: r.link })) },
        ].filter((x) => x.rows.length)
        return lists.map((l) => (
          <div key={l.key} className={g.wkSub}>
            <div className={g.wkH3}>
              <span className={g.wkH3Title}>{l.title}</span>
              {l.rows.length > CAP && (
                <button
                  type="button"
                  className={g.wkH3Action}
                  aria-label={t('guide.showAll', { count: l.rows.length })}
                  aria-expanded={!!all[l.key]}
                  onClick={() => flip(l.key)}
                >
                  <Icon name="caret-right" weight="bold" size={14} />
                </button>
              )}
            </div>
            <ol className={g.refs}>
              {cap(l.key, l.rows).map((r, n) => {
                const url = r.link && /^https?:\/\//i.test(r.link) ? r.link : undefined
                return (
                  <li key={n}>
                    {url ? (
                      <button type="button" className={g.refLink} onClick={() => openExternal(url)}>
                        {r.title}
                        <Icon name="arrow-up-right" weight="bold" size={12} />
                      </button>
                    ) : (
                      <span className={g.refTitle}>{r.title}</span>
                    )}
                    {r.meta && <span className={g.refMeta}>{r.meta}</span>}
                  </li>
                )
              })}
            </ol>
          </div>
        ))
      }
    }
  }

  const name = index?.name ?? ''
  const origin = gd?.origin || index?.origin || ''
  const active = useActiveOnda()
  const day = active?.day ?? 1
  const quote = useMemo(() => {
    if (!content) return null
    if (content.quotes && content.quotes.length > 0) {
      return content.quotes[(day - 1) % content.quotes.length] ?? content.quote
    }
    return content.quote ?? null
  }, [content, day])
  const keyTexts = (content?.immerse.read ?? []).slice(0, 2).map((x) => x.title).join(', ')
  const glance: [string, string][] = gd
    ? ([
        [t('guide.origin'), origin],
        [t('guide.era'), gd.era || content?.era || ''],
        [t('guide.keyFigures'), gd.figures.slice(0, 3).map((f) => f.name).join(', ')],
        [t('guide.keyTexts'), keyTexts],
      ] as [string, string][]).filter(([, v]) => v)
    : []
  const intro = gd?.intro ?? []
  const frame = look.layout === 'frame'

  const article = (
    <article className={g.wk}>
      <Cover look={{ ...look, layout: frame ? 'frame' : 'center' }} size="hero" article title="" glyph={look.themed ? look.glyph : undefined} ariaLabel={name}>
        {index?.line && <span className={g.wkEssence}>{index.line}</span>}
        {quote && (
          <div className={g.wkCoverQuote}>
            <span className={g.wkCoverQuoteText}>"{quote.text}"</span>
            {quote.by && <span className={g.wkCoverQuoteBy}>— {quote.by}</span>}
          </div>
        )}
      </Cover>
      <header className={g.wkHead}>
        <h1 className={g.wkName}>{name}</h1>
        {origin && <p className={g.wkSubtitle}>{t('guide.subtitle', { kind: t(`browse.kind.${GROUP_OF[entry.ondaId] ?? 'mine'}`), origin })}</p>}
        <i className={g.wkRule} aria-hidden />
        {intro[0] && <p className={g.wkLead} data-selectable>{intro[0]}</p>}
        {intro.length > 1 && (
          <>
            <Collapse open={introOpen}>
              <p className={g.wkLead} data-selectable style={{ whiteSpace: 'pre-line' }}>{intro.slice(1).join('\n\n')}</p>
            </Collapse>
            <button type="button" className={g.wkMore} aria-expanded={introOpen} onClick={() => setIntroOpen((v) => !v)}>
              {introOpen ? t('guide.showLess') : t('guide.readMore')}
              <Icon name={introOpen ? 'caret-up' : 'caret-down'} weight="bold" size={13} />
            </button>
          </>
        )}

        {/* The note of respect: small expandable widget */}
        {content?.sensitivity && (
          <div className={g.noteWidget} data-open={noteOpen || undefined}>
            <button
              type="button"
              className={g.noteWidgetHead}
              aria-expanded={noteOpen}
              onClick={() => setNoteOpen((v) => !v)}
            >
              <span className={g.noteWidgetTitle}>
                {t('guide.noteOfRespect', { defaultValue: 'A note on respect' })}
              </span>
              <span className={g.noteWidgetCaret} aria-hidden>
                <Icon name="caret-down" weight="bold" size={16} />
              </span>
            </button>
            <Collapse open={noteOpen}>
              <div className={g.noteWidgetBody} data-selectable>
                <p>{content.sensitivity.note}</p>
                {content.sensitivity.requiredCaveats.length > 0 && (
                  <ul className={g.steps} style={{ marginTop: 8 }}>
                    {content.sensitivity.requiredCaveats.map((x) => <li key={x}>{x}</li>)}
                  </ul>
                )}
              </div>
            </Collapse>
          </div>
        )}
      </header>

      {/* At a glance (centered) */}
      {glance.length > 0 && (
        <aside className={g.wkBox} aria-label={t('guide.atAGlance')}>
          <div className={g.wkBoxHead}>{t('guide.atAGlance')}</div>
          <dl>
            {glance.map(([k, v]) => (
              <div key={k} className={g.wkBoxRow}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </aside>
      )}

      {/* Map with relevant locations marked */}
      <OndaMapWidget
        ondaId={entry.ondaId}
        origin={origin}
        places={places}
        look={look}
      />

      {!content || !gd ? (
        <div className={s.empty} style={{ padding: '32px 20px' }}>
          <div className={s.sub}>{t('onda.loading')}</div>
        </div>
      ) : (
        present.map((k) => {
          let action: { icon?: string; label?: string; onClick: () => void; active?: boolean } | undefined
          if (k === 'ideas' && gd.concepts.length > 0) {
            action = {
              icon: 'caret-right',
              label: t('guide.showAll', { count: gd.concepts.length }),
              active: !!all.ideas,
              onClick: () => flip('ideas'),
            }
          } else if (k === 'practices' && content.practices.length > 0) {
            action = {
              icon: 'caret-right',
              label: t('guide.showAll', { count: content.practices.length }),
              active: !!all.practices,
              onClick: () => flip('practices'),
            }
          } else if (k === 'language' && content.words.length > 0) {
            action = {
              icon: 'caret-right',
              label: t('guide.showAll', { count: content.words.length }),
              onClick: () => setWordsFullScreen(true),
            }
          }
          // k === 'culture' and k === 'facts' have no action button per request
          return chapter(k, body(k), action)
        })
      )}
    </article>
  )

  const contents = (
    <>
      <button type="button" className={g.wkTocItem} aria-current={at === 'top' ? 'true' : undefined} onClick={() => go('top')}>
        <span className={`${g.wkTocLabel} ${g.wkTocName}`}>{name}</span>
      </button>
      {present.map((k) => (
        <button key={k} type="button" className={g.wkTocItem} aria-current={at === k ? 'true' : undefined} onClick={() => go(k)}>
          <span className={g.wkTocLabel}>{label(k)}</span>
        </button>
      ))}
    </>
  )

  return (
    <>
      <Screen
        variant="bare"
        desk={desk ? 'wide' : undefined}
        style={look.vars}
        dataOnda={themed ? entry.ondaId : undefined}
        scrollRef={pane}
        chrome={
          <>
            <span className={g.topMask} aria-hidden />
            <BackButton />
            <ChromeTitle after={380}>{name}</ChromeTitle>
            <ChromeSpacer />
          </>
        }
        overlay={
          !desk && (
            <>
              <button type="button" className={g.wkTocBtn} aria-label={t('guide.contents')} aria-expanded={drawer} onClick={() => setDrawer(true)}>
                <Icon name="list" weight="bold" size={24} />
              </button>
              {drawer && (
                <div className={g.wkScrim} onClick={() => setDrawer(false)}>
                  <nav className={g.wkDrawer} aria-label={t('guide.contents')} style={look.vars} onClick={(e) => e.stopPropagation()}>
                    <div className={g.wkDrawerHead}>
                      <OrnamentIcon name={look.ornament} size={20} />
                      {t('guide.contents')}
                    </div>
                    {contents}
                  </nav>
                </div>
              )}
            </>
          )
        }
      >
        <div className={g.wkTop}>
          {desk ? (
            <div className={g.wkDesk}>
              <nav className={g.wkToc} aria-label={t('guide.contents')}>
                <div className={g.wkDrawerHead}>
                  <OrnamentIcon name={look.ornament} size={20} />
                  {t('guide.contents')}
                </div>
                {contents}
              </nav>
              {article}
            </div>
          ) : (
            article
          )}
        </div>
      </Screen>

      {/* Idea / Think About / Ethics Detail Sheet */}
      {activeIdea && (
        <Sheet
          open={!!activeIdea}
          onExited={() => setActiveIdea(null)}
          detent={0.75}
          style={{ ...look.vars, zIndex: 95 }}
          background={look.themed ? 'color-mix(in srgb, var(--onda-solid) 25%, var(--surface-grouped))' : undefined}
          leading={<GlassButton icon="x" ariaLabel={t('a11y.close')} onClick={() => setActiveIdea(null)} />}
          onScrimClick={() => setActiveIdea(null)}
        >
          <div style={{ padding: '4px 20px 40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <OrnamentIcon name={look.ornament} size={26} />
              <div>
                <span style={{ fontSize: 'var(--fs-12)', fontWeight: 600, color: 'var(--onda-text, var(--accent))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {activeIdea.kind === 'think' ? t('philosophy.think') : activeIdea.kind === 'ethics' ? t('philosophy.ethics') : t('guide.ch.ideas')}
                </span>
              </div>
            </div>

            <h2 style={{ margin: '0 0 14px', font: '600 var(--fs-26)/1.2 var(--onda-font, var(--font-serif))', color: 'var(--label)', textWrap: 'pretty' }}>
              {activeIdea.title}
            </h2>

            <p style={{ margin: '0 0 16px', font: '400 var(--fs-17)/1.6 var(--onda-font, var(--font-serif))', color: 'var(--label)', whiteSpace: 'pre-line' }} data-selectable>
              {activeIdea.text}
            </p>

            {activeIdea.practice && (
              <div className={g.tryBox} style={{ marginTop: 20, padding: '16px 18px', borderRadius: 16 }}>
                <Icon name="play" weight="fill" size={20} />
                <div>
                  <span className={g.tryLabel} style={{ fontSize: 'var(--fs-13)', marginBottom: 4, display: 'block' }}>{t('philosophy.tryIt')}</span>
                  <p style={{ margin: 0, fontSize: 'var(--fs-15)', lineHeight: 1.45, color: 'var(--label)' }} data-selectable>{activeIdea.practice}</p>
                </div>
              </div>
            )}
          </div>
        </Sheet>
      )}

      {/* Language Full Screen Sheet: all words two per row */}
      {wordsFullScreen && (
        <Sheet
          open={wordsFullScreen}
          onExited={() => setWordsFullScreen(false)}
          detent={1}
          title={t('guide.ch.language')}
          style={look.vars}
          background={look.themed ? 'color-mix(in srgb, var(--onda-solid) 20%, var(--surface-grouped))' : undefined}
          leading={<GlassButton icon="x" ariaLabel={t('a11y.close')} onClick={() => setWordsFullScreen(false)} />}
          onScrimClick={() => setWordsFullScreen(false)}
        >
          <div className={g.wkWordsGrid}>
            {content?.words.map((w) => (
              <article
                key={w.id}
                className={g.wkWordGridCard}
                role="button"
                tabIndex={0}
                onClick={() => {
                  haptic('select')
                  setActiveWord(w)
                }}
              >
                {w.language && <span className={g.wkPill}>{w.language}</span>}
                <span className={g.wkWordTerm}>{w.term}</span>
                {w.pronunciation && <span className={g.wkSay}>{w.pronunciation}</span>}
                <span className={g.wkMeaning}>{w.meaning}</span>
              </article>
            ))}
          </div>
        </Sheet>
      )}

      {/* Language Word / Glossary Detail Sheet */}
      {activeWord && (
        <Sheet
          open={!!activeWord}
          onExited={() => setActiveWord(null)}
          detent={0.6}
          style={{ ...look.vars, zIndex: 95 }}
          background={look.themed ? 'color-mix(in srgb, var(--onda-solid) 25%, var(--surface-grouped))' : undefined}
          leading={<GlassButton icon="x" ariaLabel={t('a11y.close')} onClick={() => setActiveWord(null)} />}
          onScrimClick={() => setActiveWord(null)}
        >
          <div style={{ padding: '4px 20px 40px' }}>
            {activeWord.language && (
              <span className={g.wkPill} style={{ marginBottom: 12, display: 'inline-block' }}>
                {activeWord.language}
              </span>
            )}
            <h2 style={{ margin: '2px 0 6px', font: '500 var(--fs-32)/1.15 var(--onda-font, var(--font-serif))', letterSpacing: 'var(--onda-track, 0)', color: 'var(--label)' }}>
              {activeWord.term}
            </h2>
            {activeWord.pronunciation && (
              <div style={{ font: 'italic 400 var(--fs-17) var(--font-serif)', color: 'var(--label-secondary)', marginBottom: 14 }}>
                {activeWord.pronunciation}
              </div>
            )}
            <div style={{ borderTop: '.5px solid var(--separator)', margin: '12px 0 16px' }} />
            <div style={{ marginBottom: 14 }}>
              <span style={{ display: 'block', fontSize: 'var(--fs-11)', fontWeight: 600, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                {t('guide.meaning', { defaultValue: 'Translation & Meaning' })}
              </span>
              <p style={{ margin: 0, font: '600 var(--fs-17)/1.4 var(--font-sans)', color: 'var(--label)' }} data-selectable>
                {activeWord.meaning}
              </p>
            </div>
            {activeWord.usage && (
              <div style={{ marginTop: 14, padding: '14px 16px', background: 'var(--surface-card)', borderRadius: 14, borderLeft: '3px solid var(--onda-accent, var(--accent))' }}>
                <span style={{ display: 'block', fontSize: 'var(--fs-11)', fontWeight: 600, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  {t('guide.usage', { defaultValue: 'Context & Usage' })}
                </span>
                <p style={{ margin: 0, font: 'italic 400 var(--fs-15)/1.45 var(--onda-font, var(--font-serif))', color: 'var(--label-secondary)' }} data-selectable>
                  “{activeWord.usage}”
                </p>
              </div>
            )}
            {activeWord.unverified && (
              <div style={{ marginTop: 12, fontSize: 'var(--fs-12)', color: 'var(--label-tertiary)' }}>
                {t('guide.unverified')}
              </div>
            )}
          </div>
        </Sheet>
      )}
    </>
  )
}
