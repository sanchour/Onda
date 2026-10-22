import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { MediaKind } from '@/content'
import type { OndaContent } from '@/content/schema'
import { useLook, useOnda, useOndaIndex } from '@/data/hooks'
import { useDesk } from '@/lib/desk'
import { reducedMotion } from '@/lib/motion'
import { BackButton, ChromeSpacer, ChromeTitle, Screen } from '@/nav/Screen'
import type { StackEntry } from '@/nav/store'
import { Icon } from '@/ui/Icon'
import { Collapse, Deck, Fold, openExternal } from '@/sheets/guideParts'
import g from '@/sheets/guide.module.css'
import { OrnamentIcon } from './KindArt'
import { Cover } from './onda7'
import s from './screens.module.css'

/* ── Full guide ───────────────────────────────────────────── */
const TABS = ['overview', 'history', 'ideas', 'ethics', 'ways', 'culture', 'travel', 'language', 'facts'] as const
type GuideTab = (typeof TABS)[number]

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
    case 'ethics':
      return [{ key: 'ethics', rows: c.ethics.map((e, i) => ({ key: `e${i}`, title: e.title, sub: e.text, tryIt: tryOf(e.practice), tag: String(i + 1) })) }].filter((x) => x.rows.length)
    case 'travel':
      return [
        {
          key: 'festivals',
          title: t('guide.festivals'),
          rows: (c.immerse.festivals ?? []).map((x) => ({
            key: x.id,
            title: x.title,
            sub: x.creator || undefined,
            body: x.why || undefined,
            icon: 'calendar-star',
            tag: unv(x.unverified),
            link: x.link,
          })),
        },
        {
          key: 'places',
          title: t('guide.places'),
          rows: (c.immerse.places ?? []).map((x) => ({ key: x.id, title: x.title, sub: x.creator || undefined, body: x.why || undefined, icon: 'map-pin', tag: unv(x.unverified), link: x.link })),
        },
      ].filter((x) => x.rows.length)
    case 'ways':
      return [
        {
          key: 'practices',
          title: t('guide.practices'),
          rows: c.practices.map((p) => ({ key: p.id, title: p.name, sub: p.why || p.meta, icon: p.icon, steps: p.instructions || undefined, list: p.variations.length ? p.variations : undefined })),
        },
        { key: 'rules', title: t('guide.rules'), rows: c.rules.map((r, i) => ({ key: r.id, title: r.text, sub: r.why || undefined, tag: String(i + 1) })) },
        {
          key: 'customs',
          title: t('guide.customs'),
          rows: c.immerse.customs.map((x) => ({ key: x.id, title: x.title, sub: x.creator || undefined, body: x.why || undefined, tag: unv(x.unverified) })),
        },
      ].filter((x) => x.rows.length)
    case 'culture':
      return [
        ...(['read', 'watch', 'listen', 'art', 'eat', 'drink', 'games'] as const)
          .map((k) => ({
            key: k,
            title: t(`kindLabel.${k}`),
            kind: k as MediaKind,
            rows: (c.immerse[k] ?? []).map((it) => ({
              key: it.id,
              title: it.title,
              sub: [it.creator, it.year].filter(Boolean).join(', ') || undefined,
              body: it.why || undefined,
              tag: unv(it.unverified),
              link: it.link,
            })),
          }))
          .filter((x) => x.rows.length),
        {
          key: 'further',
          title: t('guide.furtherReading'),
          rows: g.furtherReading.map((r, i) => ({ key: `f${i}`, title: r.title, sub: [r.creator, r.year].filter(Boolean).join(', ') || undefined, body: r.note || undefined })),
        },
        { key: 'learn', title: t('guide.learnFrom'), rows: g.learnFrom.map((r, i) => ({ key: `l${i}`, title: r.name, sub: r.note, link: r.link })) },
      ].filter((x) => x.rows.length)
    case 'language':
      return [
        {
          key: 'words',
          title: t('guide.words'),
          rows: c.words.map((w) => ({ key: w.id, title: w.term, sub: w.meaning, body: w.usage || undefined, chips: compact([w.pronunciation, w.language]), tag: unv(w.unverified) })),
        },
        { key: 'glossary', title: g.glossary.length ? t('guide.glossary') : undefined, rows: g.glossary.map((x, i) => ({ key: `g${i}`, title: x.term, sub: x.meaning })) },
      ].filter((x) => x.rows.length)
    default:
      return []
  }
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')

/** The guide's chapters in reading order. People are the key figures; the rest come from guideGroups. */
const SECTIONS = ['overview', 'people', 'history', 'ideas', 'ethics', 'ways', 'culture', 'travel', 'language', 'facts'] as const
type Section = (typeof SECTIONS)[number]
type Listed = Exclude<Section, 'overview' | 'people' | 'facts'>
const LISTED: Listed[] = ['history', 'ideas', 'ethics', 'ways', 'culture', 'travel', 'language']
/** Rows shown per group before Show All. */
const LIMIT = 4

/** The Full guide as one long read: the cover, the essence, then every chapter in order on one page.
 *  A sticky chapter bar jumps to any chapter and follows the reading position. Long groups show their first few rows. */
export default function Guide({ entry }: { entry: Extract<StackEntry, { name: 'guide' }> }) {
  const { t } = useTranslation()
  const desk = useDesk()
  const index = useOndaIndex(entry.ondaId)
  const content = useOnda(entry.ondaId)
  const look = useLook(index)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [all, setAll] = useState<Record<string, boolean>>({})
  const [more, setMore] = useState(false)
  const [fact, setFact] = useState(0)
  const [at, setAt] = useState<Section>('overview')
  const [shut, setShut] = useState<Partial<Record<Section, boolean>>>({})
  const bar = useRef<HTMLDivElement>(null)
  const secs = useRef(new Map<Section, HTMLElement>())
  const flip = (k: string) => setOpen((x) => ({ ...x, [k]: !x[k] }))
  const g_ = content?.guide
  const groupsOf = useMemo(() => {
    const out: Partial<Record<Listed, GGroup[]>> = {}
    if (content) for (const k of LISTED) out[k] = guideGroups(content, k, t)
    return out
  }, [content, t])
  const present = SECTIONS.filter((k) => (k === 'overview' ? true : k === 'people' ? !!g_?.figures.length : k === 'facts' ? !!(g_?.facts.length || g_?.sources.length) : !!groupsOf[k]?.length))
  const label = (k: Section) => t(`guide.tabs.${k}`)
  const leadOf = (k: Section) => (k === 'overview' ? '' : t(`guide.lead${k[0]!.toUpperCase()}${k.slice(1)}`))

  // the chapter bar follows the reading position
  useEffect(() => {
    const first = secs.current.values().next().value as HTMLElement | undefined
    const root = first?.closest('.scroll') as HTMLElement | null
    if (!root || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (es) => {
        const v = es.filter((e) => e.isIntersecting).sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top)[0]
        if (v) setAt(v.target.getAttribute('data-sec') as Section)
      },
      { root, rootMargin: '-25% 0px -65% 0px' },
    )
    secs.current.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [present.length, content])
  useEffect(() => {
    const b = bar.current
    const el = b?.querySelector<HTMLElement>(`[data-sec="${at}"]`)
    if (b && el) b.scrollTo({ left: el.offsetLeft - b.clientWidth / 2 + el.clientWidth / 2, behavior: reducedMotion() ? 'auto' : 'smooth' })
  }, [at])
  const go = (k: Section) => {
    setAt(k)
    setShut((x) => ({ ...x, [k]: false }))
    secs.current.get(k)?.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' })
  }

  const renderRow = (r: GRow, sec: Section, variant: 'card' | 'timeline' | 'word' = 'card') => {
    const k = `${sec}:${r.key}`
    const exp = !!(r.body || r.tryIt || r.steps || r.list || r.link)
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

  const groupBlock = (sec: Section, grp: GGroup, variant: 'card' | 'timeline' | 'word') => {
    const k = `${sec}:${grp.key}`
    const limit = sec === 'history' ? 6 : LIMIT
    const long = grp.rows.length > limit + 1
    const rows = long && !all[k] ? grp.rows.slice(0, limit) : grp.rows
    return (
      <div key={grp.key} className={g.block}>
        {grp.title && (
          <h3 className={g.blockHead}>
            {grp.title}
            <small>{grp.rows.length}</small>
          </h3>
        )}
        <div className={variant === 'timeline' ? g.timeline : g.stack}>
          {rows.map((r) => renderRow(r, sec, variant))}
          {long && (
            <button type="button" className={g.showRow} aria-expanded={!!all[k]} onClick={() => setAll((x) => ({ ...x, [k]: !x[k] }))}>
              {all[k] ? t('guide.showFewer') : t('guide.showAll', { count: grp.rows.length })}
              <Icon name={all[k] ? 'caret-up' : 'caret-down'} weight="bold" size={14} />
            </button>
          )}
        </div>
      </div>
    )
  }

  const sectionBody = (k: Section) => {
    if (!content || !g_) return null
    if (k === 'overview') {
      const intro = g_.intro
      return (
        <>
          {(g_.origin || g_.era) && (
            <div className={`${g.glance} ${g.infobox}`}>
              <div className={g.infoHead}>{index?.name}</div>
              {g_.origin && (
                <div className={g.glanceRow}>
                  <span>{t('guide.origin')}</span>
                  <b>{g_.origin}</b>
                </div>
              )}
              {g_.era && (
                <div className={g.glanceRow}>
                  <span>{t('guide.era')}</span>
                  <b>{g_.era}</b>
                </div>
              )}
              {g_.figures.length > 0 && (
                <div className={g.glanceRow}>
                  <span>{t('guide.keyFigures')}</span>
                  <b>
                    {g_.figures
                      .slice(0, 3)
                      .map((f) => f.name)
                      .join(', ')}
                  </b>
                </div>
              )}
            </div>
          )}
          {intro[0] && (
            <p className={g.introLead} data-selectable>
              {intro[0]}
            </p>
          )}
          {intro.length > 1 && (
            <>
              <Collapse open={more}>
                <p className={g.introMore} data-selectable>
                  {intro.slice(1).join('\n\n')}
                </p>
              </Collapse>
              <button type="button" className={g.showAll} aria-expanded={more} onClick={() => setMore((v) => !v)}>
                {more ? t('guide.showLess') : t('guide.readMore')}
                <Icon name={more ? 'caret-up' : 'caret-down'} weight="bold" size={13} />
              </button>
            </>
          )}
          {content.sensitivity && (
            <div className={g.note}>
              <Icon name="heart" weight="regular" size={20} />
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
        </>
      )
    }
    if (k === 'people') {
      return (
        <div className={`hscroll ${g.figures}`} style={{ display: 'flex', gap: 12 }}>
          {g_.figures.map((f) => (
            <article key={f.name} className={g.figure}>
              <div className={g.figureTop}>
                <span className={g.figureAv} aria-hidden>
                  {initials(f.name)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className={g.figureName}>{f.name}</div>
                  {f.dates && <div className={g.figureDates}>{f.dates}</div>}
                </div>
              </div>
              <p className={g.figureBio} style={{ margin: 0 }} data-selectable>
                {f.bio}
              </p>
              {f.unverified && (
                <span className={g.tag} style={{ color: 'var(--label-tertiary)' }}>
                  {t('guide.unverified')}
                </span>
              )}
            </article>
          ))}
        </div>
      )
    }
    if (k === 'facts') {
      return (
        <>
          {g_.facts.length > 0 && look && (
            <Deck
              label={t('guide.didYouKnow')}
              index={fact}
              onIndex={setFact}
              slides={g_.facts.map((f, i) => (
                <article key={i} className={g.factCard}>
                  <span className={g.factN}>
                    {t('guide.didYouKnow')} · {t('guide.nOf', { n: i + 1, total: g_.facts.length })}
                  </span>
                  <p className={g.factText} style={{ margin: 0 }} data-selectable>
                    {f.text}
                  </p>
                  <span className={g.phOrn}>
                    <OrnamentIcon name={look.ornament} size={22} />
                  </span>
                  {f.unverified && (
                    <span className={g.tag} style={{ color: 'inherit', opacity: 0.7 }}>
                      {t('guide.unverified')}
                    </span>
                  )}
                </article>
              ))}
            />
          )}
          {g_.sources.length > 0 && (
            <div className={g.block}>
              <h3 className={g.blockHead}>
                {t('guide.sources')}
                <small>{g_.sources.length}</small>
              </h3>
              <ol className={g.refs}>
                {g_.sources.map((r, i) => {
                  const meta = [r.creator, r.publisher, r.year].filter(Boolean).join(', ')
                  const url = r.link && /^https?:\/\//i.test(r.link) ? r.link : undefined
                  return (
                    <li key={i}>
                      {url ? (
                        <button type="button" className={g.refLink} onClick={() => openExternal(url)}>
                          {r.title}
                          <Icon name="arrow-up-right" weight="bold" size={12} />
                        </button>
                      ) : (
                        <span className={g.refTitle}>{r.title}</span>
                      )}
                      {meta && <span className={g.refMeta}>{meta}</span>}
                    </li>
                  )
                })}
              </ol>
            </div>
          )}
        </>
      )
    }
    return (groupsOf[k] ?? []).map((grp) => groupBlock(k, grp, k === 'history' ? 'timeline' : k === 'language' && grp.key === 'words' ? 'word' : 'card'))
  }

  const chapters =
    !content || !g_ ? (
      <div className={s.empty} style={{ padding: '32px 20px' }}>
        <div className={s.sub}>{t('onda.loading')}</div>
      </div>
    ) : (
      present.map((k, i) => (
        <section
          key={k}
          data-sec={k}
          aria-label={label(k)}
          className={g.chapterSec}
          ref={(el) => {
            if (el) secs.current.set(k, el)
            else secs.current.delete(k)
          }}
        >
          <div className={g.chapterNo} aria-hidden>
            {t('guide.chapterN', { n: look ? look.numeral(i + 1) : i + 1 })}
          </div>
          <h2 className={g.chapterTitle}>
            <button type="button" className={g.chapterBtn} aria-expanded={!shut[k]} onClick={() => setShut((x) => ({ ...x, [k]: !x[k] }))}>
              {label(k)}
              <span className={shut[k] ? `${g.chapterCaret} ${g.chapterShut}` : g.chapterCaret} aria-hidden>
                <Icon name="caret-down" weight="bold" size={16} />
              </span>
            </button>
          </h2>
          {!shut[k] && (
            <>
              {leadOf(k) && <p className={g.lead}>{leadOf(k)}</p>}
              {sectionBody(k)}
            </>
          )}
        </section>
      ))
    )

  return (
    <Screen
      variant="bare"
      desk={desk ? 'wide' : undefined}
      style={look.vars}
      chrome={
        <>
          <span className={g.topMask} aria-hidden />
          <BackButton />
          <ChromeTitle after={260}>{index?.name ?? ''}</ChromeTitle>
          <ChromeSpacer />
        </>
      }
    >
      <div className={g.pageTop}>
        {look && index && <Cover look={look} size="hero" level={1} title={index.name} kicker={index.origin} />}
        {index?.line && (
          <p className={g.essence} data-selectable>
            {index.line}
          </p>
        )}
      </div>
      {desk ? (
        <div className={g.deskBody}>
          <nav className={g.toc} aria-label={t('guide.chapters')}>
            <div className={g.tocHead}>{t('guide.chapters')}</div>
            {present.map((k, i) => (
              <button key={k} type="button" className={g.tocItem} aria-current={at === k ? 'true' : undefined} onClick={() => go(k)}>
                <span className={g.tocN} aria-hidden>
                  {look ? look.numeral(i + 1) : i + 1}
                </span>
                {label(k)}
              </button>
            ))}
          </nav>
          <div className={g.deskMain}>{chapters}</div>
        </div>
      ) : (
        <>
          <div className={g.sticky}>
            <div ref={bar} className={`hscroll ${g.tabs}`} role="tablist" aria-label={t('guide.chapters')}>
              {present.map((k) => (
                <button key={k} type="button" role="tab" data-sec={k} aria-selected={at === k} className={at === k ? `${g.tab} ${g.tabOn}` : g.tab} onClick={() => go(k)}>
                  {label(k)}
                </button>
              ))}
            </div>
          </div>
          {chapters}
        </>
      )}
      <div style={{ height: 'calc(48px + max(var(--sab), 16px))' }} />
    </Screen>
  )
}
