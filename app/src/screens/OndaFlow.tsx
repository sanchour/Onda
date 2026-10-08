import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ONDA_INDEX, KIND_ICON, MEDIA_KINDS, mediaFor, type MediaKind } from '@/content'
import { immerseSet, runSummary } from '@/data/derive/onda'
import { useLook, useOndaIndex, useSettings } from '@/data/hooks'
import { useStore } from '@/data/store'
import { haptic } from '@/lib/haptics'
import { EASE_ENTER, PUSH_MS, reducedMotion } from '@/lib/motion'
import { BackButton, ChromeSpacer, ChromeTitle, Screen } from '@/nav/Screen'
import navCss from '@/nav/nav.module.css'
import { useNav, type StackEntry } from '@/nav/store'
import { Button } from '@/ui/buttons'
import { Switch } from '@/ui/controls'
import { ProgressRing, StepBar } from '@/ui/data'
import { Icon } from '@/ui/Icon'
import { KindArt } from './KindArt'
import { OndaBanner, useActiveOnda } from './ondaShared'
import o from './ondas.module.css'
import s from './screens.module.css'

/* ── Immersion: a grid of kinds (Read, Watch, Listen, ...), then the list for one kind ── */
export function Immersion({ entry }: { entry: Extract<StackEntry, { name: 'immersion' }> }) {
  const { t } = useTranslation()
  const push = useNav((n) => n.push)
  const openSheet = useNav((n) => n.openSheet)
  const active = useActiveOnda()
  const settings = useSettings()
  const immerseLogs = useStore((x) => x.immerseLogs)
  const media = useMemo(() => (active?.content ? mediaFor(active.content, { includeFood: settings.includeFood }) : []), [active?.content, settings.includeFood])
  const done = useMemo(() => (active ? immerseSet(immerseLogs, active.run.id) : new Set<string>()), [immerseLogs, active])
  if (!active) return <Screen chrome={<BackButton />}>{null}</Screen>

  const kinds = MEDIA_KINDS.filter((k) => media.some((m) => m.kind === k))
  const kind = entry.kind && kinds.includes(entry.kind) ? entry.kind : undefined
  const list = kind ? media.filter((m) => m.kind === kind) : []
  const count = (k: MediaKind) => {
    const all = media.filter((m) => m.kind === k)
    return { total: all.length, seen: all.filter((m) => done.has(m.id)).length }
  }

  return (
    <Screen chrome={<BackButton />} style={active.look.vars} dataOnda={settings.ondaThemes ? active.run.ondaId : undefined}>
      <div style={{ padding: '0 16px' }}>
        <OndaBanner
          look={active.look}
          icon={kind ? KIND_ICON[kind] : 'headphones'}
          kicker={active.index?.name}
          title={kind ? t(`kindLabel.${kind}`) : t('immersion.title')}
          sub={t('immersion.experienced', kind ? { done: count(kind).seen, total: count(kind).total } : { done: media.filter((m) => done.has(m.id)).length, total: media.length })}
        />
      </div>

      {!kind && (
        <>
          <div className={o.kindGrid}>
            {kinds.map((k) => {
              const c = count(k)
              return (
                <button key={k} type="button" className={o.kindTile} onClick={() => push({ name: 'immersion', kind: k })}>
                  <span className={o.kindArt}>
                    <KindArt kind={k} />
                  </span>
                  <span className={o.kindName}>{t(`kindLabel.${k}`)}</span>
                  <span className={o.kindCount}>
                    <span className={o.kindDots} aria-hidden>
                      {Array.from({ length: Math.min(c.total, 8) }, (_, i) => (
                        <i key={i} data-on={i < Math.round((c.seen / c.total) * Math.min(c.total, 8)) || undefined} />
                      ))}
                    </span>
                    {t('immersion.kindCount', { done: c.seen, total: c.total })}
                  </span>
                </button>
              )
            })}
          </div>
          {kinds.length === 0 && <div className={s.empty}><div className={s.sub}>{t('immersion.empty')}</div></div>}
        </>
      )}

      {kind && (
        <>
          <div className={o.libHead}>
            <span>{t('immersion.shelf', { count: list.length })}</span>
            <span className={o.libMeter} aria-hidden>
              <i style={{ width: `${list.length ? (count(kind).seen / list.length) * 100 : 0}%` }} />
            </span>
          </div>
          <ul className={o.lib}>
            {list.map((m, i) => {
              const on = done.has(m.id)
              return (
                <li key={m.id} className={on ? `${o.libCard} ${o.libOn}` : o.libCard}>
                  <button type="button" className={o.libOpen} aria-label={t('immersion.about', { name: m.title })} onClick={() => openSheet({ name: 'mediaInfo', item: m, ondaId: active.run.ondaId, runId: active.run.id })}>
                    <span className={o.libNo} aria-hidden>{t('immersion.no', { n: active.look.numeral(i + 1) })}</span>
                    <span className={o.libArt} aria-hidden>
                      <KindArt kind={m.kind} />
                    </span>
                    <span className={o.libTitle}>{m.title}</span>
                    {m.meta && <span className={o.libBy}>{m.meta}</span>}
                  </button>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    aria-label={t('a11y.markDone', { name: m.title })}
                    className={o.libStamp}
                    onClick={() => {
                      haptic(on ? 'select' : 'success')
                      useStore.getState().toggleImmerse(active.run.id, m.id)
                    }}
                  >
                    <Icon name="check" weight="bold" size={16} />
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
      {kind && <div className={o.footnote}>{t('immersion.footer')}</div>}
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
    () => (active ? runSummary(active.run, practices.map((p) => p.id), practiceLogs, journal, today) : null),
    [active, practices, practiceLogs, journal, today],
  )
  if (!active || !sum) return <Screen chrome={<BackButton icon="x" />}>{null}</Screen>

  const { run, look, index, day } = active
  const steps = 2 + prompts.length
  const carry = step === steps - 1
  const kept = practices.filter((p) => keep[p.id]).map((p) => p.id)
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
            <div className={s.center} style={{ paddingTop: 40 }}>
              <div className={`${s.circle} ${o.rfIcon} ${o.solidCircle}`}>
                <Icon name={index?.icon ?? 'sparkle'} weight="fill" size={44} />
              </div>
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
            <div className={s.stack10} style={{ marginTop: 20 }}>
              {practices.map((p) => (
                <div key={p.id} className={o.keepRow}>
                  <div className={`${s.circle} ${o.keepIcon} ${o.solidCircle}`}>
                    <Icon name={p.icon} weight="fill" size={20} />
                  </div>
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
      <ProgressRing value={1} size={160} stroke={12} color="var(--onda-strong)">
        <Icon name={index?.icon ?? 'sparkle'} weight="fill" size={56} />
      </ProgressRing>
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
