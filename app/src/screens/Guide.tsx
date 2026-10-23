import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { GROUP_OF } from '@/content/browse'
import { useLook, useOnda, useOndaIndex, useSettings } from '@/data/hooks'
import { useDesk } from '@/lib/desk'
import { haptic } from '@/lib/haptics'
import { reducedMotion } from '@/lib/motion'
import { BackButton, ChromeSpacer, ChromeTitle, Screen } from '@/nav/Screen'
import type { StackEntry } from '@/nav/store'
import { Icon } from '@/ui/Icon'
import { Collapse, openExternal } from '@/sheets/guideParts'
import g from '@/sheets/guide.module.css'
import { OrnamentIcon } from './KindArt'
import { Cover, ShowAll } from './onda7'
import s from './screens.module.css'

/* ── Full guide (8.0): one article, read like Wikipedia ──
   The cover first, then the name, a lead that opens on Read more, an infobox and the Onda's quote. Then numbered chapters
   (People, History, Ideas, Practices, Culture, Language, Places, Did you know, References), each showing five items before
   Show all. History is a timeline to step through, Ideas a set of chips. A round contents button opens a drawer with every
   chapter; a scroll spy keeps it on the chapter being read. The desktop keeps the contents beside the article instead. */

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

export default function Guide({ entry }: { entry: Extract<StackEntry, { name: 'guide' }> }) {
  const { t } = useTranslation()
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
  const [tl, setTl] = useState(0)
  const [concept, setConcept] = useState(0)
  const [cultureTab, setCultureTab] = useState<CultureKind | undefined>()
  const [openRows, setOpenRows] = useState<Set<string>>(new Set())
  const [fact, setFact] = useState(0)
  const gd = content?.guide
  const flip = (k: string) => setAll((x) => ({ ...x, [k]: !x[k] }))
  const cap = <T,>(k: string, list: readonly T[]) => (all[k] ? list : list.slice(0, CAP))
  const more = (k: string, total: number) =>
    total > CAP && <ShowAll open={!!all[k]} onToggle={() => flip(k)} showLabel={t('guide.showAll', { count: total })} lessLabel={t('guide.showLess')} />
  const toggleRow = (k: string) =>
    setOpenRows((x) => {
      const n = new Set(x)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })

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
  const num = (k: Chapter) => look.numeral(present.indexOf(k) + 1)
  const label = (k: Chapter) => t(`guide.ch.${k}`)

  // the scroll spy: the last chapter whose top has reached the top of the screen
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

  const chapter = (k: Chapter, body: ReactNode) => (
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
        <span className={g.wkNum} aria-hidden>{num(k)}</span>
        {label(k)}
      </h2>
      {body}
    </section>
  )
  const unverified = (u?: boolean) => u && <span className={g.wkTag}>{t('guide.unverified')}</span>

  /** A card that opens to show more: an icon, the name, a line, and what is inside. */
  const fold = (k: string, title: string, sub: string | undefined, body: ReactNode, icon?: ReactNode) => {
    const open = openRows.has(k)
    return (
      <div key={k} className={g.wkFold} data-open={open || undefined}>
        <button type="button" className={g.wkFoldHead} aria-expanded={open} onClick={() => toggleRow(k)}>
          {icon && <span className={g.wkFoldIcon} aria-hidden>{icon}</span>}
          <span className={g.wkFoldText}>
            <span className={g.wkFoldTitle}>{title}</span>
            {sub && <span className={g.wkFoldSub}>{sub}</span>}
          </span>
          <span className={g.wkCaret} aria-hidden><Icon name="caret-down" weight="bold" size={16} /></span>
        </button>
        <Collapse open={open}>
          <div className={g.wkFoldBody} data-selectable>{body}</div>
        </Collapse>
      </div>
    )
  }

  const body = (k: Chapter): ReactNode => {
    if (!content || !gd) return null
    switch (k) {
      case 'people':
        return (
          <>
            <div className={`hscroll ${g.wkPeople}`}>
              {cap('people', gd.figures).map((f) => (
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
            {more('people', gd.figures.length)}
          </>
        )
      case 'history': {
        const list = gd.history
        const shown = cap('history', list)
        const i = Math.min(tl, list.length - 1)
        const h = list[i]!
        const step = (to: number) => {
          if (to >= CAP && !all.history) setAll((x) => ({ ...x, history: true }))
          setTl(to)
          haptic('select')
        }
        return (
          <>
            <div className={`hscroll ${g.wkLine}`} role="tablist" aria-label={label('history')}>
              {shown.map((x, n) => (
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
            {more('history', list.length)}
          </>
        )
      }
      case 'ideas': {
        const list = gd.concepts
        const c = list[Math.min(concept, list.length - 1)]
        const chips = all.ideas ? list : list.slice(0, CAP)
        return (
          <>
            {list.length > 0 && (
              <>
                <div className={g.wkChips} role="tablist" aria-label={label('ideas')}>
                  {chips.map((x, n) => (
                    <button key={x.term} type="button" role="tab" aria-selected={n === concept} className={g.wkChip} onClick={() => setConcept(n)}>
                      {x.term}
                    </button>
                  ))}
                  {list.length > CAP && (
                    <button type="button" className={`${g.wkChip} ${g.wkChipMore}`} aria-expanded={!!all.ideas} onClick={() => flip('ideas')}>
                      {all.ideas ? t('guide.showLess') : t('guide.showAll', { count: list.length })}
                    </button>
                  )}
                </div>
                {c && (
                  <div className={g.wkCard} role="tabpanel">
                    <h3 className={g.wkTerm}>{c.term}</h3>
                    <p className={g.wkSerif} data-selectable>{c.text}</p>
                    {c.detail && <p className={g.wkCardText} data-selectable>{c.detail}</p>}
                  </div>
                )}
              </>
            )}
            {(['philosophy', 'ethics'] as const).map((key) => {
              const items = content[key]
              if (!items.length) return null
              return (
                <div key={key} className={g.wkSub}>
                  <h3 className={g.wkH3}>{key === 'philosophy' ? t('philosophy.think') : t('philosophy.ethics')}</h3>
                  <div className={g.wkFolds}>
                    {cap(key, items).map((p, n) =>
                      fold(`${key}${n}`, p.title, p.text, p.practice && (
                        <div className={g.tryBox}>
                          <Icon name="play" weight="fill" size={16} />
                          <span>
                            <span className={g.tryLabel}>{t('philosophy.tryIt')}</span>
                            {p.practice}
                          </span>
                        </div>
                      ), <span className={g.wkFoldNum}>{look.numeral(n + 1)}</span>),
                    )}
                  </div>
                  {more(key, items.length)}
                </div>
              )
            })}
          </>
        )
      }
      case 'practices':
        return (
          <>
            {content.practices.length > 0 && (
              <>
                <div className={g.wkFolds}>
                  {cap('practices', content.practices).map((p) =>
                    fold(
                      p.id,
                      p.name,
                      p.why || p.meta,
                      <>
                        {p.instructions && <p>{p.instructions}</p>}
                        {p.variations.length > 0 && (
                          <>
                            <span className={g.subHead}>{t('onda.variations')}</span>
                            <ul className={g.steps}>
                              {p.variations.map((v) => <li key={v}>{v}</li>)}
                            </ul>
                          </>
                        )}
                      </>,
                      <Icon name={p.icon} weight="regular" size={22} />,
                    ),
                  )}
                </div>
                {more('practices', content.practices.length)}
              </>
            )}
            {content.rules.length > 0 && (
              <div className={g.wkSub}>
                <h3 className={g.wkH3}>{t('guide.rules')}</h3>
                <ol className={g.wkList}>
                  {cap('rules', content.rules).map((r, n) => (
                    <li key={r.id} className={g.wkRow}>
                      <span className={g.wkRowNum} aria-hidden>{look.numeral(n + 1)}</span>
                      <span className={g.wkRowText}>
                        <b>{r.text}</b>
                        {r.why && <span>{r.why}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
                {more('rules', content.rules.length)}
              </div>
            )}
          </>
        )
      case 'culture': {
        const kind = cultureTab && cultureKinds.includes(cultureTab) ? cultureTab : cultureKinds[0]!
        const items = content.immerse[kind] ?? []
        const key = `culture:${kind}`
        return (
          <>
            <div className={`hscroll ${g.wkTabs}`} role="tablist" aria-label={label('culture')}>
              {cultureKinds.map((k) => (
                <button key={k} type="button" role="tab" aria-selected={k === kind} className={g.wkTab} onClick={() => setCultureTab(k)}>
                  {t(`kindLabel.${k}`)}
                </button>
              ))}
            </div>
            <ul className={g.wkList} role="tabpanel">
              {cap(key, items).map((x) => (
                <li key={x.id} className={g.wkRow}>
                  <span className={g.wkRowText}>
                    <b>{x.title}</b>
                    {(x.creator || x.year) && <small>{[x.creator, x.year].filter(Boolean).join(', ')}</small>}
                    {x.why && <span>{x.why}</span>}
                    {unverified(x.unverified)}
                  </span>
                  {x.link && /^https?:\/\//i.test(x.link) && (
                    <button type="button" className={g.wkLink} aria-label={`${t('guide.openLink')}: ${x.title}`} onClick={() => openExternal(x.link!)}>
                      <Icon name="arrow-up-right" weight="bold" size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {more(key, items.length)}
          </>
        )
      }
      case 'language':
        return (
          <>
            {content.words.length > 0 && (
              <>
                <div className={`hscroll ${g.wkWords}`}>
                  {cap('words', content.words).map((w) => (
                    <article key={w.id} className={g.wkWord}>
                      {w.language && <span className={g.wkPill}>{w.language}</span>}
                      <span className={g.wkWordTerm}>{w.term}</span>
                      {w.pronunciation && <span className={g.wkSay}>{w.pronunciation}</span>}
                      <span className={g.wkMeaning}>{w.meaning}</span>
                      {w.usage && <span className={g.wkUsage}>{w.usage}</span>}
                      {unverified(w.unverified)}
                    </article>
                  ))}
                </div>
                {more('words', content.words.length)}
              </>
            )}
            {gd.glossary.length > 0 && (
              <div className={g.wkSub}>
                <h3 className={g.wkH3}>{t('guide.glossary')}</h3>
                <ul className={g.wkList}>
                  {cap('glossary', gd.glossary).map((x) => (
                    <li key={x.term} className={g.wkRow}>
                      <span className={g.wkRowText}>
                        <b>{x.term}</b>
                        <span>{x.meaning}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                {more('glossary', gd.glossary.length)}
              </div>
            )}
          </>
        )
      case 'places':
        return (
          <>
            <ul className={g.wkList}>
              {cap('places', places).map((x) => (
                <li key={x.id} className={g.wkRow}>
                  <span className={g.wkRowIcon} aria-hidden><Icon name={x.icon} weight="regular" size={22} /></span>
                  <span className={g.wkRowText}>
                    <b>{x.title}</b>
                    {x.creator && <small>{x.creator}</small>}
                    {x.why && <span>{x.why}</span>}
                    {unverified(x.unverified)}
                  </span>
                  {x.link && /^https?:\/\//i.test(x.link) && (
                    <button type="button" className={g.wkLink} aria-label={`${t('guide.openLink')}: ${x.title}`} onClick={() => openExternal(x.link!)}>
                      <Icon name="arrow-up-right" weight="bold" size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {more('places', places.length)}
          </>
        )
      case 'facts': {
        const facts = cap('facts', gd.facts)
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
            {more('facts', gd.facts.length)}
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
            <h3 className={g.wkH3}>{l.title}</h3>
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
            {more(l.key, l.rows.length)}
          </div>
        ))
      }
    }
  }

  const name = index?.name ?? ''
  const origin = gd?.origin || index?.origin || ''
  const quote = content?.quote ?? content?.quotes[0]
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
        {content?.sensitivity && (
          <div className={g.note}>
            <Icon name="heart" weight="regular" size={20} />
            <div>
              <b>{t('guide.framing')}</b>
              {content.sensitivity.note}
              {content.sensitivity.requiredCaveats.length > 0 && (
                <ul className={g.steps} style={{ marginTop: 8 }}>
                  {content.sensitivity.requiredCaveats.map((x) => <li key={x}>{x}</li>)}
                </ul>
              )}
            </div>
          </div>
        )}
      </header>
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
      {quote && (
        <figure className={g.wkQuote}>
          <span className={g.wkQuoteOrn} aria-hidden><OrnamentIcon name={look.ornament} size={28} /></span>
          <blockquote data-selectable>“{quote.text}”</blockquote>
          <figcaption>{[quote.by, quote.source].filter(Boolean).join(' · ')}</figcaption>
        </figure>
      )}
      {!content || !gd ? (
        <div className={s.empty} style={{ padding: '32px 20px' }}>
          <div className={s.sub}>{t('onda.loading')}</div>
        </div>
      ) : (
        present.map((k) => chapter(k, body(k)))
      )}
    </article>
  )

  const contents = (
    <>
      <button type="button" className={g.wkTocItem} aria-current={at === 'top' ? 'true' : undefined} onClick={() => go('top')}>
        <span className={g.wkTocNum} aria-hidden />
        <span className={`${g.wkTocLabel} ${g.wkTocName}`}>{name}</span>
      </button>
      {present.map((k) => (
        <button key={k} type="button" className={g.wkTocItem} aria-current={at === k ? 'true' : undefined} onClick={() => go(k)}>
          <span className={g.wkTocNum} aria-hidden>{num(k)}</span>
          <span className={g.wkTocLabel}>{label(k)}</span>
        </button>
      ))}
    </>
  )

  return (
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
  )
}
