import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { MediaKind } from '@/content'
import type { OndaContent } from '@/content/schema'
import { useLook, useOnda, useOndaIndex } from '@/data/hooks'
import { columnWidth, fitSize } from '@/lib/fit'
import { reducedMotion } from '@/lib/motion'
import { BackButton, ChromeSpacer, ChromeTitle, Screen } from '@/nav/Screen'
import type { StackEntry } from '@/nav/store'
import { Icon } from '@/ui/Icon'
import { Collapse, Deck, Fold, openExternal } from '@/sheets/guideParts'
import g from '@/sheets/guide.module.css'
import { KindArt, OrnamentIcon } from './KindArt'
import { Glyph } from './ondaShared'
import o from './ondas.module.css'
import s from './screens.module.css'

/* ── Full guide ───────────────────────────────────────────── */
const TABS = ['overview', 'history', 'ideas', 'ways', 'culture', 'language', 'facts'] as const
type GuideTab = (typeof TABS)[number]
const TAB_ICON: Record<GuideTab, string> = { overview: 'compass', history: 'clock-counter-clockwise', ideas: 'lightbulb', ways: 'footprints', culture: 'book-open-text', language: 'translate', facts: 'sparkle' }

interface GRow {
  key: string
  title: string
  sub?: string
  body?: string
  tag?: string
  icon?: string
  chips?: string[]
  tryIt?: string
  steps?: string
  list?: string[]
  link?: string
}
interface GGroup {
  key: string
  title?: string
  kind?: MediaKind
  rows: GRow[]
}

type TFn = (k: string, o?: Record<string, unknown>) => string
const compact = <T,>(a: (T | undefined | false | '')[]) => a.filter(Boolean) as T[]

function guideGroups(c: OndaContent, tab: GuideTab, t: TFn): GGroup[] {
  const g = c.guide
  const unv = (u?: boolean) => (u ? t('guide.unverified') : undefined)
  const tryOf = (p?: string) => p || undefined
  switch (tab) {
    case 'history':
      return [{ key: 'h', rows: g.history.map((h, i) => ({ key: `h${i}`, title: h.when, sub: h.what, body: h.detail || undefined, tag: unv(h.unverified) })) }]
    case 'ideas':
      return [
        { key: 'concepts', title: g.concepts.length ? t('guide.concepts') : undefined, rows: g.concepts.map((x, i) => ({ key: `c${i}`, title: x.term, sub: x.text, body: x.detail || undefined })) },
        { key: 'ideas', title: c.philosophy.length ? t('philosophy.think') : undefined, rows: c.philosophy.map((p, i) => ({ key: `p${i}`, title: p.title, sub: p.text, tryIt: tryOf(p.practice) })) },
      ].filter((x) => x.rows.length)
    case 'ways':
      return [
        { key: 'practices', title: t('guide.practices'), rows: c.practices.map((p) => ({ key: p.id, title: p.name, sub: p.why || p.meta, icon: p.icon, steps: p.instructions || undefined, list: p.variations.length ? p.variations : undefined })) },
        { key: 'rules', title: t('guide.rules'), rows: c.rules.map((r, i) => ({ key: r.id, title: r.text, sub: r.why || undefined, tag: String(i + 1) })) },
        { key: 'ethics', title: t('philosophy.ethics'), rows: c.ethics.map((e, i) => ({ key: `e${i}`, title: e.title, sub: e.text, tryIt: tryOf(e.practice) })) },
        { key: 'customs', title: t('guide.customs'), rows: c.immerse.customs.map((x) => ({ key: x.id, title: x.title, sub: x.creator || undefined, body: x.why || undefined, tag: unv(x.unverified) })) },
      ].filter((x) => x.rows.length)
    case 'culture':
      return [
        ...(['read', 'watch', 'listen', 'art', 'eat', 'drink'] as const)
          .map((k) => ({
            key: k,
            title: t(`kindLabel.${k}`),
            kind: k as MediaKind,
            rows: c.immerse[k].map((it) => ({ key: it.id, title: it.title, sub: [it.creator, it.year].filter(Boolean).join(', ') || undefined, body: it.why || undefined, tag: unv(it.unverified), link: it.link })),
          }))
          .filter((x) => x.rows.length),
        { key: 'further', title: t('guide.furtherReading'), rows: g.furtherReading.map((r, i) => ({ key: `f${i}`, title: r.title, sub: [r.creator, r.year].filter(Boolean).join(', ') || undefined, body: r.note || undefined })) },
        { key: 'learn', title: t('guide.learnFrom'), rows: g.learnFrom.map((r, i) => ({ key: `l${i}`, title: r.name, sub: r.note, link: r.link })) },
      ].filter((x) => x.rows.length)
    case 'language':
      return [
        { key: 'words', title: t('guide.words'), rows: c.words.map((w) => ({ key: w.id, title: w.term, sub: w.meaning, body: w.usage || undefined, chips: compact([w.pronunciation, w.language]), tag: unv(w.unverified) })) },
        { key: 'glossary', title: g.glossary.length ? t('guide.glossary') : undefined, rows: g.glossary.map((x, i) => ({ key: `g${i}`, title: x.term, sub: x.meaning })) },
      ].filter((x) => x.rows.length)
    default:
      return []
  }
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')

export default function Guide({ entry }: { entry: Extract<StackEntry, { name: 'guide' }> }) {
  const { t } = useTranslation()
  const index = useOndaIndex(entry.ondaId)
  const content = useOnda(entry.ondaId)
  const look = useLook(index)
  const [tab, setTab] = useState<GuideTab>('overview')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [more, setMore] = useState(false)
  const [fact, setFact] = useState(0)
  const tabsRef = useRef<HTMLDivElement>(null)
  const [shut, setShut] = useState<Record<string, boolean>>({})
  const anchors = useRef(new Map<string, HTMLElement>())
  const groups = useMemo(() => (content ? guideGroups(content, tab, t) : []), [content, tab, t])
  const rows = groups.flatMap((x) => x.rows)
  const expandable = (r: GRow) => !!(r.body || r.tryIt || r.steps || r.list || r.link)
  const foldable = rows.filter(expandable)
  const allOpen = foldable.length > 0 && foldable.every((r) => open[`${tab}:${r.key}`])
  const flip = (k: string) => setOpen((x) => ({ ...x, [k]: !x[k] }))
  const setAll = (v: boolean) => {
    setOpen((x) => ({ ...x, ...Object.fromEntries(foldable.map((r) => [`${tab}:${r.key}`, v])) }))
    setShut((x) => ({ ...x, ...Object.fromEntries(groups.map((grp) => [`${tab}:${grp.key}`, !v])) }))
  }
  // Long groups start folded (the first one stays open), so a tab opens as a short list of sections.
  const isShut = (grp: GGroup, i: number) => shut[`${tab}:${grp.key}`] ?? (i > 0 && grp.rows.length > 6)
  const jump = (grp: GGroup) => {
    setShut((x) => ({ ...x, [`${tab}:${grp.key}`]: false }))
    requestAnimationFrame(() => anchors.current.get(`${tab}:${grp.key}`)?.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' }))
  }
  const lead = tab === 'overview' ? index?.line : t(`guide.lead${tab[0]!.toUpperCase()}${tab.slice(1)}`)
  const g_ = content?.guide
  const nameFit = index ? fitSize(index.name, columnWidth() - 72, 36, 22) : 36

  const pick = (k: GuideTab) => {
    setTab(k)
    setMore(false)
    const el = tabsRef.current?.querySelector<HTMLElement>(`[data-tab="${k}"]`)
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' })
  }

  const renderRow = (r: GRow, variant: 'card' | 'timeline' | 'word' = 'card') => {
    const k = `${tab}:${r.key}`
    const exp = expandable(r)
    const fold = (
      <Fold
        title={r.title}
        sub={r.sub}
        tag={r.tag && !/^\d+$/.test(r.tag) ? r.tag : undefined}
        badge={r.tag && /^\d+$/.test(r.tag) && look ? look.numeral(Number(r.tag)) : undefined}
        icon={r.icon}
        display={variant === 'word'}
        chips={r.chips}
        open={!!open[k]}
        onToggle={() => flip(k)}
        expandable={exp}
      >
        {r.body && <div>{r.body}</div>}
        {r.steps && (
          <div>
            <span className={g.subHead}>{t('onda.how')}</span>
            {r.steps}
          </div>
        )}
        {r.list && (
          <div>
            <span className={g.subHead}>{t('onda.variations')}</span>
            <ul className={g.steps}>
              {r.list.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </div>
        )}
        {r.tryIt && (
          <div className={g.tryBox}>
            <Icon name="play" weight="fill" size={16} />
            <span>
              <span className={g.tryLabel}>{t('philosophy.tryIt')}</span>
              {r.tryIt}
            </span>
          </div>
        )}
        {r.link && /^https?:\/\//i.test(r.link) && (
          <button type="button" className={g.linkBtn} onClick={() => openExternal(r.link!)}>
            <Icon name="arrow-up-right" weight="bold" size={16} />
            {t('guide.openLink')}
          </button>
        )}
      </Fold>
    )
    if (variant !== 'timeline') return <div key={r.key}>{fold}</div>
    return (
      <div key={r.key} className={open[k] ? `${g.tlItem} ${g.tlOpen}` : g.tlItem}>
        {fold}
      </div>
    )
  }

  const body = () => {
    if (!content || !g_) return <div className={s.empty} style={{ padding: '32px 20px' }}><div className={s.sub}>{t('onda.loading')}</div></div>
    if (tab === 'overview') {
      const intro = g_.intro
      return (
        <>
          {intro[0] && <p className={g.introLead} data-selectable>{intro[0]}</p>}
          {intro.length > 1 && (
            <>
              <Collapse open={more}>
                <p className={g.introMore} data-selectable>{intro.slice(1).join('\n\n')}</p>
              </Collapse>
              <button type="button" className={g.readMore} aria-expanded={more} onClick={() => setMore((v) => !v)}>
                {more ? t('guide.showLess') : t('guide.readMore')}
              </button>
            </>
          )}
          {(g_.origin || g_.era) && (
            <div className={g.pair}>
              {g_.origin && (
                <div className={g.pairCard}>
                  <span className={g.pairLabel}><Icon name="compass" weight="fill" size={14} />{t('guide.origin')}</span>
                  <div className={g.pairValue}>{g_.origin}</div>
                </div>
              )}
              {g_.era && (
                <div className={g.pairCard}>
                  <span className={g.pairLabel}><Icon name="clock" weight="fill" size={14} />{t('guide.era')}</span>
                  <div className={g.pairValue}>{g_.era}</div>
                </div>
              )}
            </div>
          )}
          {content.sensitivity && (
            <div className={g.note}>
              <Icon name="heart" weight="fill" size={20} />
              <div>
                <b>{t('guide.framing')}</b>
                {content.sensitivity.note}
                <Collapse open={!!open['sens']}>
                  <ul className={g.steps} style={{ marginTop: 8 }}>
                    {content.sensitivity.requiredCaveats.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </Collapse>
                {content.sensitivity.requiredCaveats.length > 0 && (
                  <button type="button" className={g.linkBtn} style={{ marginTop: 4 }} aria-expanded={!!open['sens']} onClick={() => flip('sens')}>
                    {open['sens'] ? t('guide.showLess') : t('guide.readMore')}
                  </button>
                )}
              </div>
            </div>
          )}
          {g_.figures.length > 0 && (
            <>
              <h3 className={g.sectionHead} style={{ marginTop: 28 }}>{t('guide.figures')}<small>{g_.figures.length}</small></h3>
              <div className={`hscroll ${g.figures}`} style={{ display: 'flex', gap: 12 }}>
                {g_.figures.map((f) => (
                  <article key={f.name} className={g.figure}>
                    <div className={g.figureTop}>
                      <span className={g.figureAv} aria-hidden>{initials(f.name)}</span>
                      <div style={{ minWidth: 0 }}>
                        <div className={g.figureName}>{f.name}</div>
                        {f.dates && <div className={g.figureDates}>{f.dates}</div>}
                      </div>
                    </div>
                    <p className={g.figureBio} style={{ margin: 0 }} data-selectable>{f.bio}</p>
                    {f.unverified && <span className={g.tag} style={{ color: 'var(--label-tertiary)' }}>{t('guide.unverified')}</span>}
                  </article>
                ))}
              </div>
            </>
          )}
        </>
      )
    }
    if (tab === 'facts') {
      const facts = g_.facts
      return (
        <>
          {facts.length > 0 && look && (
            <Deck
              label={t('guide.didYouKnow')}
              index={fact}
              onIndex={setFact}
              slides={facts.map((f, i) => (
                <article key={i} className={g.factCard}>
                  <span className={g.factN}>{t('guide.didYouKnow')} · {t('guide.nOf', { n: i + 1, total: facts.length })}</span>
                  <p className={g.factText} style={{ margin: 0 }} data-selectable>{f.text}</p>
                  <span className={g.phOrn}><OrnamentIcon name={look.ornament} size={22} /></span>
                  {f.unverified && <span className={g.tag} style={{ color: 'inherit', opacity: 0.7 }}>{t('guide.unverified')}</span>}
                </article>
              ))}
            />
          )}
          {g_.sources.length > 0 && (
            <>
              <h3 className={g.sectionHead} style={{ marginTop: 26 }}>{t('guide.sources')}<small>{g_.sources.length}</small></h3>
              <div className={g.stack}>
                {g_.sources.map((r, i) => {
                  const link = r.link && /^https?:\/\//i.test(r.link) ? r.link : undefined
                  return (
                    <div key={i} className={g.fold}>
                      <div className={g.foldBtn}>
                        <span className={g.foldHead}>
                          <span className={g.foldText}>
                            <span className={g.foldTitle}>{r.title}</span>
                            <span className={g.foldSub}>{[r.creator, r.publisher, r.year].filter(Boolean).join(', ')}</span>
                            {link && (
                              <button type="button" className={g.linkBtn} onClick={() => openExternal(link)}>
                                <Icon name="arrow-up-right" weight="bold" size={16} />
                                {t('guide.openLink')}
                              </button>
                            )}
                          </span>
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
          {facts.length === 0 && g_.sources.length === 0 && <div className={s.empty} style={{ padding: '32px 20px' }}><div className={s.sub}>{t('guide.empty')}</div></div>}
        </>
      )
    }
    if (groups.length === 0) return <div className={s.empty} style={{ padding: '32px 20px' }}><div className={s.sub}>{t('guide.empty')}</div></div>
    return (
      <>
        {foldable.length > 1 && (
          <div className={g.toolbar}>
            <span className={s.sub}>{t('guide.count', { count: rows.length })}</span>
            <button type="button" className={g.toggleAll} onClick={() => setAll(!allOpen)}>
              {allOpen ? t('guide.collapseAll') : t('guide.expandAll')}
            </button>
          </div>
        )}
        {groups.map((grp, gi) => {
          const closed = !!grp.title && isShut(grp, gi)
          const head = grp.kind ? (
            <>
              <KindArt kind={grp.kind} />
              <h3>{grp.title}</h3>
            </>
          ) : (
            <h3>{grp.title}</h3>
          )
          return (
            <section key={grp.key} ref={(el) => { if (el) anchors.current.set(`${tab}:${grp.key}`, el); else anchors.current.delete(`${tab}:${grp.key}`) }} className={g.group}>
              {grp.title && (
                <button type="button" className={grp.kind ? `${g.groupHead} ${g.groupKind}` : g.groupHead} aria-expanded={!closed} onClick={() => setShut((x) => ({ ...x, [`${tab}:${grp.key}`]: !closed }))}>
                  {head}
                  <small>{grp.rows.length}</small>
                  <span className={closed ? g.caret : `${g.caret} ${g.caretOpen}`} aria-hidden>
                    <Icon name="caret-down" weight="bold" size={16} color="var(--label-tertiary)" />
                  </span>
                </button>
              )}
              <Collapse open={!closed}>
                <div style={{ paddingBottom: 4 }}>
                  {tab === 'history' ? (
                    <div className={g.timeline}>{grp.rows.map((r) => renderRow(r, 'timeline'))}</div>
                  ) : (
                    <div className={g.stack}>{grp.rows.map((r) => renderRow(r, tab === 'language' && grp.key === 'words' ? 'word' : 'card'))}</div>
                  )}
                </div>
              </Collapse>
            </section>
          )
        })}
      </>
    )
  }

  const jumpable = tab !== 'overview' && tab !== 'facts' && groups.filter((x) => x.title).length > 1

  return (
    <Screen
      variant="bare"
      style={look.vars}
      chrome={
        <>
          <span className={g.topMask} aria-hidden />
          <BackButton />
          <ChromeTitle>{index?.name ?? ''}</ChromeTitle>
          <ChromeSpacer />
        </>
      }
    >
      <div className={g.pageTop}>
        <div className={`${o.gBanner} ${o.themed}`} style={{ marginTop: 0 }}>
          <Glyph look={look} opacity={0.14} right={14} bottom={4} />
          <div className={s.kicker} style={{ color: 'inherit' }}>{index?.origin}</div>
          <h2 className={o.gName} style={{ fontSize: nameFit }}>{index?.name}</h2>
          {look && <div style={{ marginTop: 10, opacity: 0.7 }}><OrnamentIcon name={look.ornament} size={20} /></div>}
        </div>
      </div>
      <div className={g.sticky}>
        <div ref={tabsRef} className={`hscroll ${g.tabs}`} role="tablist">
          {TABS.map((k) => (
            <button key={k} type="button" role="tab" data-tab={k} aria-selected={tab === k} className={tab === k ? `${g.tab} ${g.tabOn}` : g.tab} onClick={() => pick(k)}>
              <Icon name={TAB_ICON[k]} weight={tab === k ? 'fill' : 'regular'} size={18} />
              {t(`guide.tabs.${k}`)}
            </button>
          ))}
        </div>
        {jumpable && (
          <div className={`hscroll ${g.jumpRow}`} role="group" aria-label={t('guide.jumpTo')}>
            {groups.filter((x) => x.title).map((grp) => (
              <button key={grp.key} type="button" className={g.jumpChip} onClick={() => jump(grp)}>
                {grp.title}
                <small>{grp.rows.length}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className={g.panel} key={tab} role="tabpanel" style={{ paddingBottom: 'calc(40px + max(var(--sab), 16px))' }}>
        <div className={g.lead} style={{ margin: '16px 4px 18px' }}>{lead}</div>
        {body()}
      </div>
    </Screen>
  )
}
