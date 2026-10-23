import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ONDA_INDEX, KIND_ICON, MEDIA_KINDS, mediaFor, type MediaItem, type MediaKind } from '@/content'
import { immerseSet, runSummary } from '@/data/derive/onda'
import { useLook, useOndaIndex, useSettings } from '@/data/hooks'
import { useStore } from '@/data/store'
import { haptic } from '@/lib/haptics'
import { EASE_ENTER, PUSH_MS, reducedMotion } from '@/lib/motion'
import { BackButton, ChromeSpacer, ChromeTitle, GlassHead, Screen } from '@/nav/Screen'
import navCss from '@/nav/nav.module.css'
import { useNav, type StackEntry } from '@/nav/store'
import { Button } from '@/ui/buttons'
import { GlassTabs, Switch } from '@/ui/controls'
import { StepBar } from '@/ui/data'
import { Icon } from '@/ui/Icon'
import { MediaCard } from './MediaCard'
import { useActiveOnda } from './ondaShared'
import { Cover } from './onda7'
import o from './ondas.module.css'
import s from './screens.module.css'

/* ── Immersion (8.0): a glass header with a pill per kind. Featured shows what is up next in each kind, then every kind as a
   shelf of cards shaped like its medium; a kind's tab shows its next item large, then the whole list. ── */
type ImTab = MediaKind | 'featured'

export function Immersion({ entry }: { entry: Extract<StackEntry, { name: 'immersion' }> }) {
  const { t } = useTranslation()
  const openSheet = useNav((n) => n.openSheet)
  const active = useActiveOnda()
  const settings = useSettings()
  const immerseLogs = useStore((x) => x.immerseLogs)
  const pane = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<ImTab>(entry.kind ?? 'featured')
  const media = useMemo(() => (active?.content ? mediaFor(active.content, { includeFood: settings.includeFood }) : []), [active?.content, settings.includeFood])
  const done = useMemo(() => (active ? immerseSet(immerseLogs, active.run.id) : new Set<string>()), [immerseLogs, active])
  if (!active) return <Screen chrome={<BackButton />}>{null}</Screen>

  const { look, run } = active
  const kinds = MEDIA_KINDS.filter((k) => media.some((m) => m.kind === k))
  const kind = tab !== 'featured' && kinds.includes(tab) ? tab : undefined
  const ofKind = (k: MediaKind) => media.filter((m) => m.kind === k)
  const count = (k: MediaKind) => {
    const all = ofKind(k)
    return { total: all.length, seen: all.filter((m) => done.has(m.id)).length }
  }
  // the next item you have not yet experienced, one per kind
  const next = kinds.map((k) => media.find((m) => m.kind === k && !done.has(m.id))).filter((m): m is NonNullable<typeof m> => !!m)
  const frame = look.layout === 'frame'
  const pick = (k: ImTab) => {
    setTab(k)
    pane.current?.scrollTo({ top: 0 })
  }
  const toggle = (m: MediaItem) => {
    haptic(done.has(m.id) ? 'select' : 'success')
    useStore.getState().toggleImmerse(run.id, m.id)
  }
  const about = (m: MediaItem) => openSheet({ name: 'mediaInfo', item: m, ondaId: run.ondaId, runId: run.id })
  const seenOf = (k: MediaKind) => t('immersion.kindCount', { done: count(k).seen, total: count(k).total })

  const head = (
    <GlassHead
      title={t('immersion.title')}
      tabs={
        kinds.length > 0 && (
          <GlassTabs<ImTab>
            label={t('immersion.title')}
            items={[{ key: 'featured', label: t('immersion.featured') }, ...kinds.map((k) => ({ key: k, label: t(`kindLabel.${k}`) }))]}
            value={kind ?? 'featured'}
            onChange={pick}
          />
        )
      }
    />
  )

  const hero = (m: MediaItem, tag: string, onClick: () => void, wide?: boolean) => (
    <button type="button" className={wide ? `${o.upCard} ${o.upWide}` : o.upCard} data-frame={frame ? '' : undefined} onClick={onClick}>
      <span className={o.upWater} aria-hidden><Icon name={KIND_ICON[m.kind]} weight="regular" size={176} /></span>
      <span className={o.upTop}>
        <span className={o.upTag}>{tag}</span>
        <Icon name={KIND_ICON[m.kind]} weight="regular" size={22} />
      </span>
      <span className={o.upTitle}>{m.title}</span>
      {(m.creator || m.meta) && <span className={o.upBy}>{m.creator || m.meta}</span>}
    </button>
  )

  return (
    <Screen variant="glass" head={head} scrollRef={pane} desk="wide" style={look.vars} dataOnda={settings.ondaThemes ? run.ondaId : undefined}>
      {kinds.length === 0 && <div className={s.empty}><div className={s.sub}>{t('immersion.empty')}</div></div>}

      {!kind && kinds.length > 0 && (
        <>
          {next.length > 0 && (
            <section aria-label={t('immersion.upNext')}>
              <div className={`hscroll ${o.upRow}`}>
                {next.map((m) => (
                  <div key={m.id} className={o.upItem}>
                    {hero(m, `${t('immersion.upNext')} · ${t(`kindLabel.${m.kind}`)}`, () => pick(m.kind))}
                  </div>
                ))}
              </div>
            </section>
          )}
          {kinds.map((k) => (
            <section key={k} aria-label={t(`kindLabel.${k}`)} className={o.imSec}>
              <button type="button" className={o.imSecHead} onClick={() => pick(k)} aria-label={`${t(`kindLabel.${k}`)}, ${seenOf(k)}`}>
                <span className={o.imSecTitle}>{t(`kindLabel.${k}`)}</span>
                <Icon name="caret-right" weight="bold" size={17} />
                <span className={o.imSecCount}>{seenOf(k)}</span>
              </button>
              <div className={`hscroll ${o.imShelf}`}>
                {ofKind(k).map((m) => (
                  <MediaCard key={m.id} item={m} done={done.has(m.id)} onToggle={() => toggle(m)} onOpen={() => about(m)} ornament={look.ornament} frame={frame} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      {kind && (() => {
        const list = ofKind(kind)
        const first = list.find((m) => !done.has(m.id))
        const top = first ?? list[0]!
        return (
          <>
            <div className={o.kindHero}>{hero(top, first ? t('immersion.nextUp') : t('immersion.allDone'), () => toggle(top), true)}</div>
            <div className={o.imSecHead} role="presentation">
              <span className={o.imSecTitle}>{t(`kindLabel.${kind}`)}</span>
              <span className={o.imSecCount}>{seenOf(kind)}</span>
            </div>
            <ul className={o.kindList}>
              {list.map((m) => {
                const on = done.has(m.id)
                return (
                  <li key={m.id} className={o.kindRow}>
                    <button type="button" className={o.kindOpen} aria-label={t('immersion.about', { name: m.title })} onClick={() => about(m)}>
                      <span className={o.kindTile} aria-hidden><Icon name={KIND_ICON[m.kind]} weight="regular" size={24} /></span>
                      <span className={o.kindText}>
                        <span className={o.kindTitle}>{m.title}</span>
                        {(m.creator || m.year || m.meta) && <span className={o.kindMeta}>{m.kind === 'words' ? m.meta : [m.creator, m.year].filter(Boolean).join(' · ') || m.meta}</span>}
                        {m.why && <span className={o.kindWhy}>{m.why}</span>}
                      </span>
                    </button>
                    <button type="button" role="checkbox" aria-checked={on} aria-label={t('a11y.markDone', { name: m.title })} className={o.kindCheck} onClick={() => toggle(m)}>
                      <span data-on={on ? '' : undefined} aria-hidden>{on && <Icon name="check" weight="bold" size={15} />}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className={o.footnote}>{t('immersion.footer')}</div>
          </>
        )
      })()}
    </Screen>
  )
}

/* ── Final reflection ─────────────────────────────────────── */
export function Reflection() {
  const { t } = useTranslation()
  const { pop, replaceTop } = useNav()
  const active = useActiveOnda()
  const today = useStore((x) => x.today)
  const practiceLogs = useStore((x) => x.practiceLogs)
  const journal = useStore((x) => x.journal)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [keep, setKeep] = useState<Record<string, boolean>>({})
  const body = useRef<HTMLDivElement>(null)
  const last = useRef(0)

  useLayoutEffect(() => {
    const el = body.current
    if (!el || last.current === step) return
    const dx = reducedMotion() ? 0 : step > last.current ? 48 : -48
    last.current = step
    el.scrollTop = 0
    el.animate([{ transform: `translate3d(${dx}px,0,0)`, opacity: 0.4 }, { transform: 'translate3d(0,0,0)', opacity: 1 }], { duration: PUSH_MS, easing: EASE_ENTER })
  }, [step])

  const prompts = active?.content?.reflect ?? []
  const practices = active?.run.snapshot?.practices ?? []
  const sum = useMemo(
    () => (active ? runSummary(active.run, practices.map((p) => p.id), practiceLogs, journal, today, active.run.snapshot?.perDay) : null),
    [active, practices, practiceLogs, journal, today],
  )
  if (!active || !sum) return <Screen chrome={<BackButton icon="x" />}>{null}</Screen>

  const { run, look, index, day } = active
  const steps = 2 + prompts.length
  const carry = step === steps - 1
  const kept = practices.filter((p) => keep[p.id]).map((p) => p.id)
  // an Onda has twenty practices: offer the ones that were done most, not all of them
  const carryList = [...practices].filter((p) => (sum?.perPractice[p.id] ?? 0) > 0).sort((a, b) => (sum?.perPractice[b.id] ?? 0) - (sum?.perPractice[a.id] ?? 0)).slice(0, 8)
  const finish = () => {
    haptic('success')
    const n = useStore.getState().completeOnda(run.id, prompts.map((p, i) => ({ prompt: p, text: (answers[i] ?? '').trim() })), kept)
    replaceTop({ name: 'done', ondaId: run.ondaId, kept: n })
  }
  const nextLabel = step === 0 ? t('reflection.begin') : !carry ? t('common.next') : kept.length ? t('reflection.completeAdd', { count: kept.length }) : t('reflection.complete')

  return (
    <div className={o.flow} style={look.vars}>
      <div className={navCss.chrome}>
        <BackButton icon="x" onClick={pop} />
        <ChromeTitle>{t('reflection.title')}</ChromeTitle>
        <ChromeSpacer />
      </div>
      <div className={o.flowBar}>
        <StepBar value={(step + 1) / steps} />
      </div>
      <div ref={body} className={`scroll ${o.flowBody}`}>
        {step === 0 && (
          <>
            <div style={{ margin: '8px -16px 0' }}>
              <Cover look={look} size="hero" title={index?.name ?? run.snapshot?.name ?? ''} kicker={t('reflection.title')} days={{ day: run.lengthDays + 1, length: run.lengthDays }} />
            </div>
            <div className={s.center} style={{ paddingTop: 24 }}>
              <h2 className={o.rfTitle}>{t('reflection.daysOf', { count: day, name: index?.name ?? run.snapshot?.name })}</h2>
              <div className={o.rfLead}>{t('reflection.lookBack')}</div>
            </div>
            <div className={`${o.rfStats} ${s.stat3}`}>
              {[
                [String(sum.practiceCheckIns), t('reflection.checkIns')],
                [`${Math.round(sum.practiceRate * 100)}%`, t('reflection.practices')],
                [String(sum.journalEntries), t('reflection.journal')],
              ].map(([v, l]) => (
                <div key={l}>
                  <div className={s.statV}>{v}</div>
                  <div className={s.statL}>{l}</div>
                </div>
              ))}
            </div>
          </>
        )}
        {step > 0 && !carry && (
          <>
            <div className={o.rfLabel}>{t('reflection.stepOf', { n: step, total: prompts.length })}</div>
            <h2 className={o.rfPrompt}>{prompts[step - 1]}</h2>
            <div className={o.rfField}>
              <textarea aria-label={prompts[step - 1]} placeholder={t('reflection.placeholder')} value={answers[step - 1] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [step - 1]: e.target.value }))} style={{ minHeight: 240, lineHeight: 1.45 }} />
            </div>
          </>
        )}
        {carry && (
          <>
            <div className={o.rfLabel}>{t('reflection.carry')}</div>
            <h2 className={o.rfPrompt}>{t('reflection.carryTitle')}</h2>
            <div className={s.sub} style={{ marginTop: 8 }}>{t('reflection.carrySub')}</div>
            <div className={o.keepList}>
              {carryList.map((p) => (
                <div key={p.id} className={o.keepRow}>
                  <span className={o.keepIcon} aria-hidden>
                    <Icon name={p.icon} weight="regular" size={22} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={o.pName}>{p.name}</div>
                    <div className={s.sub}>{t('reflection.daysOfTotal', { done: sum.perPractice[p.id] ?? 0, total: run.lengthDays })}</div>
                  </div>
                  <Switch checked={!!keep[p.id]} onChange={(v) => setKeep((k) => ({ ...k, [p.id]: v }))} ariaLabel={t('reflection.keep', { name: p.name })} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div className={`${navCss.bottom} ${navCss.bottomRow}`}>
        {step > 0 && (
          <Button variant="secondary" style={{ flex: 'none', width: 110 }} onClick={() => setStep(step - 1)}>
            {t('common.back')}
          </Button>
        )}
        <div style={{ flex: 1 }}>
          <Button fullWidth onClick={() => (carry ? finish() : setStep(step + 1))}>
            {nextLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── Onda complete ────────────────────────────────────────── */
export function Done({ entry }: { entry: Extract<StackEntry, { name: 'done' }> }) {
  const { t } = useTranslation()
  const popToRoot = useNav((n) => n.popToRoot)
  const index = useOndaIndex(entry.ondaId) ?? ONDA_INDEX[0]
  const look = useLook(index)
  const name = index?.name ?? ''
  return (
    <div className={o.doneWrap} style={look.vars}>
      <div className={o.doneCover}>
        {look && <Cover look={look} size="hero" title={name} kicker={t('done.title')} />}
      </div>
      <h1 className={o.doneTitle}>{t('done.title')}</h1>
      <div className={o.rfLead} style={{ textWrap: 'pretty' }}>{entry.kept ? t('done.kept', { count: entry.kept, name }) : t('done.none', { name })}</div>
      <div className={navCss.bottom}>
        <Button fullWidth onClick={() => popToRoot('lagos')}>
          {t('done.viewLagos')}
        </Button>
        <Button variant="plain" fullWidth onClick={() => popToRoot('ondas')}>
          {t('done.next')}
        </Button>
      </div>
    </div>
  )
}
