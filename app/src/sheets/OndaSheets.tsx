import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { MediaKind } from '@/content'
import type { OndaContent } from '@/content/schema'
import { immerseSet, pickForDay } from '@/data/derive/onda'
import { useLook, useOnda, useOndaIndex } from '@/data/hooks'
import { useStore } from '@/data/store'
import { fitSize, columnWidth } from '@/lib/fit'
import { haptic } from '@/lib/haptics'
import { detId } from '@/lib/ids'
import { reducedMotion } from '@/lib/motion'
import { useNav, type SheetEntry } from '@/nav/store'
import { KindArt, OrnamentIcon } from '@/screens/KindArt'
import { Glyph, OndaBanner, useActiveOnda, useRunToday } from '@/screens/ondaShared'
import o from '@/screens/ondas.module.css'
import s from '@/screens/screens.module.css'
import { Button, GlassButton } from '@/ui/buttons'
import { Chip, SegmentedControl } from '@/ui/controls'
import { Icon } from '@/ui/Icon'
import { AppSheet, useSheet } from './common'
import { Collapse, Deck, Fold, openExternal } from './guideParts'
import g from './guide.module.css'

type E<N extends SheetEntry['name']> = { entry: Extract<SheetEntry, { name: N }> }

/* ── Journal: all past reflections, newest first ──────────── */
export function JournalListSheet({ entry }: E<'journalList'>) {
  const { t } = useTranslation()
  const swapSheet = useNav((n) => n.swapSheet)
  const active = useActiveOnda()
  const journal = useStore((x) => x.journal)
  const entries = useMemo(() => journal.filter((j) => j.runId === active?.run.id && !j.deletedAt).sort((a, b) => b.day - a.day), [journal, active?.run.id])
  const name = active?.index?.name ?? ''
  const write = (day?: number) => swapSheet({ name: 'journalEdit', day, fromList: true })

  return (
    <AppSheet entry={entry} look={active?.look} title={t('journal.title')} detent={0.78} trailing={<GlassButton icon="plus" prominent ariaLabel={t('a11y.newEntry')} onClick={() => write()} />}>
      <div style={{ padding: '4px 16px 48px' }}>
        {active?.look && <div style={{ marginBottom: 16 }}><OndaBanner look={active.look} icon="notebook" kicker={name} title={t('journal.title')} sub={t('journal.count', { count: entries.length })} /></div>}
        <Button fullWidth icon="pencil-simple" onClick={() => write()}>
          {t('journal.newEntry')}
        </Button>
        <div className={s.stack12} style={{ marginTop: 20 }}>
          {entries.map((e) => (
            <button key={e.id} type="button" className={o.softCard} onClick={() => write(e.day)}>
              <span className={s.kicker} style={{ display: 'block', letterSpacing: '.06em' }}>{t('journal.dayLabel', { day: e.day, name })}</span>
              <span className={o.entryPrompt} style={{ display: 'block' }}>{e.prompt}</span>
              <span className={o.entryText} style={{ display: 'block' }}>{e.text}</span>
            </button>
          ))}
          {entries.length === 0 && (
            <div className={s.empty} style={{ padding: '32px 20px' }}>
              <div className={s.emptyTitle}>{t('journal.empty')}</div>
              <div className={s.sub} style={{ marginTop: 4 }}>{t('journal.emptySub')}</div>
            </div>
          )}
        </div>
      </div>
    </AppSheet>
  )
}

/* ── Journal editor: the day's question, free text, practiced chips ── */
export function JournalEditSheet({ entry }: E<'journalEdit'>) {
  const { t } = useTranslation()
  const sh = useSheet(entry)
  const { swapSheet, showToast } = useNav()
  const active = useActiveOnda()
  const done = useRunToday(active?.run.id)
  const day = entry.day ?? active?.day ?? 1
  const id = active ? detId('journal', active.run.id, day) : ''
  const existing = useStore((x) => x.journal.find((j) => j.id === id && !j.deletedAt))
  const [text, setText] = useState(existing?.text ?? '')
  if (!active) return null

  const prompt = existing?.prompt || pickForDay(active.content?.journal ?? [], day) || ''
  const back = () => (entry.fromList ? swapSheet({ name: 'journalList' }) : sh.close())
  const save = () => {
    if (text.trim()) {
      useStore.getState().saveJournal(active.run.id, day, prompt, text.trim())
      showToast(t('journal.saved'), { icon: 'notebook' })
    }
    back()
  }
  const practices = active.content?.practices ?? []

  return (
    <AppSheet entry={entry} look={active.look} title={t('journal.title')} leading="cancel" onCancel={back} onSave={save}>
      <div style={{ padding: '8px 20px 40px' }}>
        <div className={`${o.jeCard} ${o.themed}`}>
          <Glyph look={active.look} opacity={0.12} right={14} bottom={4} />
          <div className={o.jeKicker} style={{ color: 'inherit', opacity: 0.8 }}>{t('journal.dayLabel', { day, name: active.index?.name ?? '' })}</div>
          <h2 className={o.jePrompt}>{prompt}</h2>
        </div>
        <div className={s.card} style={{ margin: '20px 0 0', padding: '16px 20px' }}>
          <textarea aria-label={prompt} placeholder={t('journal.placeholder')} value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 240, lineHeight: 1.45 }} />
        </div>
        {day === active.day && practices.length > 0 && (
          <>
            <div style={{ font: '600 var(--fs-15) var(--font-sans)', marginTop: 24 }}>{t('journal.practicedToday')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {practices.map((p) => (
                <Chip key={p.id} icon={p.icon} label={p.name} selected={done.practices.has(p.id)} onClick={() => useStore.getState().togglePractice(active.run.id, p.id)} />
              ))}
            </div>
          </>
        )}
      </div>
    </AppSheet>
  )
}

/* ── Quick look at one book, film, song, dish or word ─────── */
export function MediaInfoSheet({ entry }: E<'mediaInfo'>) {
  const { t } = useTranslation()
  const item = entry.item
  const index = useOndaIndex(entry.ondaId)
  const look = useLook(index)
  const logs = useStore((x) => x.immerseLogs)
  const on = useMemo(() => (entry.runId ? immerseSet(logs, entry.runId).has(item.id) : false), [logs, entry.runId, item.id])
  const sub = item.kind === 'words' ? item.meta : [item.creator, item.year].filter(Boolean).join(', ')

  return (
    <AppSheet entry={entry} look={look} detent={0.72}>
      <div style={{ padding: '4px 20px 40px' }}>
        <div className={`${g.miHero} ${o.themed}`}>
          <Glyph look={look} opacity={0.12} right={12} bottom={2} />
          <span className={g.miKind}>{t(`kindLabel.${item.kind}`)}</span>
          <KindArt kind={item.kind} className={g.miArt} />
        </div>
        <h2 className={g.miTitle}>{item.title}</h2>
        {sub && <div className={g.miMeta}>{sub}</div>}
        {item.extra && <div className={g.miExtra}>{item.extra}</div>}
        <p className={g.miWhy} data-selectable>{item.why || t('immersion.noNote')}</p>
        {item.unverified && <div className={g.tag} style={{ marginTop: 10, color: 'var(--label-tertiary)' }}>{t('guide.unverified')}</div>}
        <div className={g.miActions}>
          {entry.runId && (
            <Button
              fullWidth
              variant={on ? 'secondary' : 'primary'}
              icon={on ? 'check' : undefined}
              onClick={() => {
                haptic(on ? 'select' : 'success')
                useStore.getState().toggleImmerse(entry.runId!, item.id)
              }}
            >
              {on ? t('immersion.experiencedBtn') : t('immersion.markExperienced')}
            </Button>
          )}
          {item.link && (
            <Button fullWidth variant="plain" icon="arrow-up-right" onClick={() => openExternal(item.link!)}>
              {t('immersion.learnMore')}
            </Button>
          )}
        </div>
      </div>
    </AppSheet>
  )
}

/* ── Philosophy: a deck of idea cards, each with something to try ── */
export function PhilosophySheet({ entry }: E<'philosophy'>) {
  const { t } = useTranslation()
  const active = useActiveOnda()
  const c = active?.content
  const look = active?.look
  const sets = { ideas: c?.philosophy ?? [], ethics: c?.ethics ?? [] }
  const available = (['ideas', 'ethics'] as const).filter((k) => sets[k].length > 0)
  const [part, setPart] = useState<'ideas' | 'ethics'>('ideas')
  const [at, setAt] = useState(0)
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const shown = sets[available.includes(part) ? part : (available[0] ?? 'ideas')]
  const key = (i: number) => `${part}:${i}`
  const pickedCount = Object.values(picked).filter(Boolean).length

  const choose = (v: 'ideas' | 'ethics') => {
    setPart(v)
    setAt(0)
  }

  return (
    <AppSheet entry={entry} look={look} title={t('philosophy.title')} detent={0.86}>
      <div style={{ padding: '4px 16px 56px' }}>
        {look && <OndaBanner look={look} icon="lightbulb" kicker={active?.index?.name} title={t('philosophy.title')} sub={t('philosophy.lead')} />}
        {available.length > 1 && (
          <div style={{ marginTop: 16 }}>
            <SegmentedControl<'ideas' | 'ethics'>
              options={[{ value: 'ideas', label: t('philosophy.think') }, { value: 'ethics', label: t('philosophy.ethics') }]}
              value={part}
              onChange={choose}
              fullWidth
              ariaLabel={t('philosophy.title')}
            />
          </div>
        )}
        <div style={{ marginTop: 18 }}>
          {look && shown.length > 0 && (
            <Deck
              label={t(part === 'ideas' ? 'philosophy.think' : 'philosophy.ethics')}
              index={at}
              onIndex={setAt}
              slides={shown.map((x, i) => (
                <article key={x.title} className={`${g.phCard} ${o.themed}`}>
                  <Glyph look={look} opacity={0.1} right={10} bottom={-6} />
                  <div className={g.phTop}>
                    <span className={g.phNum} aria-hidden>{look.numeral(i + 1)}</span>
                    <span className={g.phOrn}><OrnamentIcon name={look.ornament} size={28} /></span>
                  </div>
                  <h3 className={g.phTitle}>{x.title}</h3>
                  <p className={g.phText} data-selectable>{x.text}</p>
                  {x.practice && (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={!!picked[key(i)]}
                      className={picked[key(i)] ? `${g.phTry} ${g.phTryOn}` : g.phTry}
                      onClick={() => {
                        haptic(picked[key(i)] ? 'select' : 'success')
                        setPicked((p) => ({ ...p, [key(i)]: !p[key(i)] }))
                      }}
                    >
                      <span className={g.phTryBox} aria-hidden>{picked[key(i)] && <Icon name="check" weight="bold" size={15} />}</span>
                      <span className={g.phTryText}>
                        <b>{picked[key(i)] ? t('philosophy.onList') : t('philosophy.tryThis')}</b>
                        {x.practice}
                      </span>
                    </button>
                  )}
                </article>
              ))}
            />
          )}
        </div>
        {shown.length > 1 && look && (
          <div className={g.jump} role="group" aria-label={t('philosophy.all')}>
            {shown.map((x, i) => (
              <button key={x.title} type="button" className={i === at ? `${g.jumpBtn} ${g.jumpOn}` : g.jumpBtn} onClick={() => setAt(i)}>
                <span className={g.jumpNum}>{look.numeral(i + 1)}</span>
                <span>{x.title}</span>
              </button>
            ))}
          </div>
        )}
        {pickedCount > 0 && <div className={g.picked}>{t('philosophy.pickedCount', { count: pickedCount })}</div>}
      </div>
    </AppSheet>
  )
}

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

export function GuideSheet({ entry }: E<'guide'>) {
  const { t } = useTranslation()
  const index = useOndaIndex(entry.ondaId)
  const content = useOnda(entry.ondaId)
  const look = useLook(index)
  const [tab, setTab] = useState<GuideTab>('overview')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [more, setMore] = useState(false)
  const [fact, setFact] = useState(0)
  const tabsRef = useRef<HTMLDivElement>(null)
  const groups = useMemo(() => (content ? guideGroups(content, tab, t) : []), [content, tab, t])
  const rows = groups.flatMap((x) => x.rows)
  const expandable = (r: GRow) => !!(r.body || r.tryIt || r.steps || r.list || r.link)
  const foldable = rows.filter(expandable)
  const allOpen = foldable.length > 0 && foldable.every((r) => open[`${tab}:${r.key}`])
  const flip = (k: string) => setOpen((x) => ({ ...x, [k]: !x[k] }))
  const setAll = (v: boolean) => setOpen((x) => ({ ...x, ...Object.fromEntries(foldable.map((r) => [`${tab}:${r.key}`, v])) }))
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
        {groups.map((grp) => (
          <section key={grp.key}>
            {grp.kind ? (
              <div className={g.kindHead}>
                <KindArt kind={grp.kind} />
                <h3>{grp.title}</h3>
                <small>{grp.rows.length}</small>
              </div>
            ) : (
              grp.title && <h3 className={g.sectionHead}>{grp.title}<small>{grp.rows.length}</small></h3>
            )}
            {tab === 'history' ? (
              <div className={g.timeline}>{grp.rows.map((r) => renderRow(r, 'timeline'))}</div>
            ) : (
              <div className={g.stack}>{grp.rows.map((r) => renderRow(r, tab === 'language' && grp.key === 'words' ? 'word' : 'card'))}</div>
            )}
          </section>
        ))}
      </>
    )
  }

  return (
    <AppSheet entry={entry} look={look} title={index?.name ?? ''}>
      <div style={{ padding: '0 0 60px' }}>
        <div className={`${o.gBanner} ${o.themed}`}>
          <Glyph look={look} opacity={0.14} right={14} bottom={4} />
          <div className={s.kicker} style={{ color: 'inherit' }}>{index?.origin}</div>
          <h2 className={o.gName} style={{ fontSize: nameFit }}>{index?.name}</h2>
          {look && <div style={{ marginTop: 10, opacity: 0.7 }}><OrnamentIcon name={look.ornament} size={20} /></div>}
        </div>
        <div ref={tabsRef} className={`hscroll ${g.tabs}`} role="tablist">
          {TABS.map((k) => (
            <button key={k} type="button" role="tab" data-tab={k} aria-selected={tab === k} className={tab === k ? `${g.tab} ${g.tabOn}` : g.tab} onClick={() => pick(k)}>
              <Icon name={TAB_ICON[k]} weight={tab === k ? 'fill' : 'regular'} size={18} />
              {t(`guide.tabs.${k}`)}
            </button>
          ))}
        </div>
        <div className={g.panel} key={tab} role="tabpanel">
          <div className={g.lead} style={{ margin: '16px 4px 18px' }}>{lead}</div>
          {body()}
        </div>
      </div>
    </AppSheet>
  )
}
