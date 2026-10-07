import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { immerseSet, pickForDay } from '@/data/derive/onda'
import { useLook, useOndaIndex } from '@/data/hooks'
import { useStore } from '@/data/store'
import { haptic } from '@/lib/haptics'
import { detId } from '@/lib/ids'
import { useNav, type SheetEntry } from '@/nav/store'
import { KindArt, OrnamentIcon } from '@/screens/KindArt'
import { Glyph, OndaBanner, useActiveOnda, useRunToday } from '@/screens/ondaShared'
import o from '@/screens/ondas.module.css'
import s from '@/screens/screens.module.css'
import { Button, GlassButton } from '@/ui/buttons'
import { Chip, SegmentedControl } from '@/ui/controls'
import { Icon } from '@/ui/Icon'
import { AppSheet, useSheet } from './common'
import { Deck, openExternal } from './guideParts'
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
              options={[{ value: 'ideas', label: t('philosophy.think') }, { value: 'ethics', label: t('philosophy.ethicsTab') }]}
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
