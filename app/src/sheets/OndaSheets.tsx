import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { OndaContent } from '@/content/schema'
import { pickForDay } from '@/data/derive/onda'
import { useLook, useOnda, useOndaIndex } from '@/data/hooks'
import { useStore } from '@/data/store'
import { detId } from '@/lib/ids'
import { useNav, type SheetEntry } from '@/nav/store'
import { Glyph, OndaBanner, useActiveOnda, useRunToday } from '@/screens/ondaShared'
import o from '@/screens/ondas.module.css'
import s from '@/screens/screens.module.css'
import { Button, GlassButton } from '@/ui/buttons'
import { Chip } from '@/ui/controls'
import { Icon } from '@/ui/Icon'
import { AppSheet, useSheet } from './common'

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

/* ── Philosophy ───────────────────────────────────────────── */
export function PhilosophySheet({ entry }: E<'philosophy'>) {
  const { t } = useTranslation()
  const active = useActiveOnda()
  const c = active?.content
  const block = (title: string, items: OndaContent['philosophy'], first?: boolean) =>
    items.length > 0 && (
      <>
        <h2 className={s.h20} style={{ marginTop: first ? 24 : 28 }}>{title}</h2>
        <div className={s.stack12} style={{ marginTop: 12 }}>
          {items.map((x) => (
            <article key={x.title} className={o.softCard}>
              <h3 className={o.ideaTitle} style={{ margin: 0 }}>{x.title}</h3>
              <p className={o.ideaText} style={{ marginBottom: 0 }}>{x.text}</p>
              {x.practice && (
                <p className={o.ideaText} style={{ marginBottom: 0, color: 'var(--label)' }}>
                  <strong>{t('philosophy.tryIt')}: </strong>
                  {x.practice}
                </p>
              )}
            </article>
          ))}
        </div>
      </>
    )
  return (
    <AppSheet entry={entry} look={active?.look} title={t('philosophy.title')} detent={0.78}>
      <div style={{ padding: '4px 20px 48px' }}>
        {active?.look && <OndaBanner look={active.look} icon="lightbulb" kicker={active.index?.name} title={t('philosophy.title')} sub={t('philosophy.lead')} />}
        {block(t('philosophy.think'), c?.philosophy ?? [], true)}
        {block(t('philosophy.ethics'), c?.ethics ?? [])}
      </div>
    </AppSheet>
  )
}

/* ── Full guide ───────────────────────────────────────────── */
const TABS = ['overview', 'history', 'ideas', 'ways', 'culture', 'language', 'facts'] as const
type GuideTab = (typeof TABS)[number]
interface GItem {
  title: string
  sub?: string
  detail?: string
  tag?: string
  group?: string
}

function guideItems(c: OndaContent, tab: GuideTab, t: (k: string, o?: Record<string, unknown>) => string): GItem[] {
  const g = c.guide
  const unv = (u?: boolean) => (u ? t('guide.unverified') : undefined)
  const join = (...p: (string | undefined)[]) => p.filter(Boolean).join('\n\n')
  switch (tab) {
    case 'overview':
      return [
        ...(g.intro.length ? [{ title: t('guide.introduction'), sub: g.intro[0], detail: g.intro.slice(1).join('\n\n') }] : []),
        ...(c.sensitivity ? [{ title: t('guide.framing'), sub: c.sensitivity.note, detail: c.sensitivity.requiredCaveats.map((x) => `• ${x}`).join('\n') }] : []),
        ...(g.origin ? [{ title: t('guide.origin'), sub: g.origin }] : []),
        ...(g.era ? [{ title: t('guide.era'), sub: g.era }] : []),
        ...g.figures.map((f) => ({ title: f.name, sub: [f.dates, f.bio].filter(Boolean).join(' · '), tag: unv(f.unverified) })),
      ]
    case 'history':
      return g.history.map((h) => ({ title: h.when, sub: h.what, detail: h.detail, tag: unv(h.unverified) }))
    case 'ideas':
      return [...g.concepts.map((x) => ({ title: x.term, sub: x.text, detail: x.detail })), ...c.philosophy.map((p) => ({ title: p.title, sub: p.text, detail: p.practice ? `${t('philosophy.tryIt')}: ${p.practice}` : '' }))]
    case 'ways':
      return [
        ...c.ethics.map((e) => ({ title: e.title, sub: e.text, detail: e.practice ? `${t('philosophy.tryIt')}: ${e.practice}` : '' })),
        ...c.practices.map((p) => ({ tag: t('guide.practice'), title: p.name, sub: p.why || p.meta, detail: join(p.instructions && `${t('onda.how')}\n${p.instructions}`, p.variations.length ? `${t('onda.variations')}\n${p.variations.map((v) => `• ${v}`).join('\n')}` : undefined) })),
        ...c.rules.map((r) => ({ tag: t('guide.rule'), title: r.text, sub: r.why })),
        ...c.immerse.customs.map((x) => ({ title: x.title, sub: x.creator, detail: x.why, tag: unv(x.unverified) })),
      ]
    case 'culture':
      return [
        ...(['read', 'watch', 'listen', 'art', 'eat', 'drink'] as const).flatMap((k) => c.immerse[k].map((it) => ({ title: it.title, sub: [t(`kindLabel.${k}`), [it.creator, it.year].filter(Boolean).join(', ')].filter(Boolean).join(' · '), detail: it.why, tag: unv(it.unverified) }))),
        ...g.furtherReading.map((r, i) => ({ group: i === 0 ? t('guide.furtherReading') : undefined, title: r.title, sub: [r.creator, r.year].filter(Boolean).join(', '), detail: r.note })),
        ...g.learnFrom.map((r, i) => ({ group: i === 0 ? t('guide.learnFrom') : undefined, title: r.name, sub: r.note, detail: r.link })),
      ]
    case 'language':
      return [
        ...c.words.map((w) => ({ title: w.term, sub: w.meaning, detail: join(w.pronunciation, w.language, w.usage), tag: unv(w.unverified) })),
        ...g.glossary.map((x) => ({ title: x.term, sub: x.meaning })),
      ]
    case 'facts':
      return [
        ...g.facts.map((f) => ({ title: t('guide.didYouKnow'), sub: f.text, tag: unv(f.unverified) })),
        ...g.sources.map((r, i) => ({ group: i === 0 ? t('guide.sources') : undefined, title: r.title, sub: [r.creator, r.publisher, r.year].filter(Boolean).join(', '), detail: r.link })),
      ]
  }
}

export function GuideSheet({ entry }: E<'guide'>) {
  const { t } = useTranslation()
  const index = useOndaIndex(entry.ondaId)
  const content = useOnda(entry.ondaId)
  const look = useLook(index)
  const [tab, setTab] = useState<GuideTab>('overview')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const items = useMemo(() => (content ? guideItems(content, tab, t) : []), [content, tab, t])
  const lead = tab === 'overview' ? index?.line : t(`guide.lead${tab[0]!.toUpperCase()}${tab.slice(1)}`)

  return (
    <AppSheet entry={entry} look={look} title={index?.name ?? ''}>
      <div style={{ padding: '0 0 60px' }}>
        <div className={`${o.gBanner} ${o.themed}`}>
          <Glyph look={look} opacity={0.14} right={14} bottom={4} />
          <div className={s.kicker} style={{ color: 'inherit' }}>{index?.origin}</div>
          <h2 className={o.gName}>{index?.name}</h2>
        </div>
        <div className={`hscroll ${o.chips}`} style={{ paddingTop: 0 }} role="tablist">
          {TABS.map((k) => (
            <Chip key={k} label={t(`guide.tabs.${k}`)} selected={tab === k} onClick={() => setTab(k)} />
          ))}
        </div>
        <div style={{ padding: '0 20px' }}>
          <div className={o.lead} style={{ marginTop: 18 }}>{lead}</div>
        </div>
        <div className={s.stack12} style={{ margin: '18px 16px 0' }}>
          {items.map((g, i) => {
            const key = tab + i
            const has = !!g.detail
            const body = (
              <>
                <span style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    {g.tag && <span className={o.gTag} style={{ display: 'block' }}>{g.tag}</span>}
                    <span className={o.gItemTitle} style={{ display: 'block' }}>{g.title}</span>
                    {g.sub && <span className={o.gItemSub} style={{ display: 'block' }} data-selectable>{g.sub}</span>}
                  </span>
                  {has && (
                    <span className={open[key] ? `${o.gCaret} ${o.gCaretOpen}` : o.gCaret}>
                      <Icon name="caret-down" weight="bold" size={16} color="var(--label-tertiary)" />
                    </span>
                  )}
                </span>
                {has && open[key] && <span className={o.gDetail} style={{ display: 'block' }} data-selectable>{g.detail}</span>}
              </>
            )
            return (
              <div key={key}>
                {g.group && <h3 className={o.gGroup} style={{ marginBottom: 12 }}>{g.group}</h3>}
                {has ? (
                  <button type="button" className={o.softCard} aria-expanded={!!open[key]} onClick={() => setOpen((x) => ({ ...x, [key]: !x[key] }))}>
                    {body}
                  </button>
                ) : (
                  <div className={o.softCard}>{body}</div>
                )}
              </div>
            )
          })}
          {items.length === 0 && <div className={s.empty} style={{ padding: '32px 20px' }}><div className={s.sub}>{content ? t('guide.empty') : t('onda.loading')}</div></div>}
        </div>
      </div>
    </AppSheet>
  )
}
