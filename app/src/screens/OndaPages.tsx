import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/data/hooks'
import { useStore } from '@/data/store'
import { haptic } from '@/lib/haptics'
import { BackButton, ChromeSpacer, ChromeTitle, Screen } from '@/nav/Screen'
import { useNav } from '@/nav/store'
import { Deck } from '@/sheets/guideParts'
import g from '@/sheets/guide.module.css'
import { Button, GlassButton } from '@/ui/buttons'
import { SegmentedControl } from '@/ui/controls'
import { ProgressBar } from '@/ui/data'
import { Icon } from '@/ui/Icon'
import { OndaBanner, useActiveOnda, useRunToday } from './ondaShared'
import o from './ondas.module.css'
import s from './screens.module.css'

/** Shared frame for the three full-screen pages that used to be sheets: back button, title, Onda look. */
function OndaPage({ title, trailing, children }: { title: string; trailing?: React.ReactNode; children: React.ReactNode }) {
  const active = useActiveOnda()
  const themed = useSettings().ondaThemes
  return (
    <Screen
      variant="page"
      style={active?.look.vars}
      dataOnda={themed ? active?.run.ondaId : undefined}
      chrome={
        <>
          <span className={g.topMask} aria-hidden />
          <BackButton />
          <ChromeTitle>{title}</ChromeTitle>
          {trailing ?? <ChromeSpacer />}
        </>
      }
    >
      {children}
    </Screen>
  )
}

/* ── Journal: all past reflections, newest first ──────────── */
export function JournalPage() {
  const { t } = useTranslation()
  const openSheet = useNav((n) => n.openSheet)
  const active = useActiveOnda()
  const journal = useStore((x) => x.journal)
  const entries = useMemo(() => journal.filter((j) => j.runId === active?.run.id && !j.deletedAt).sort((a, b) => b.day - a.day), [journal, active?.run.id])
  const name = active?.index?.name ?? ''
  const write = (day?: number) => openSheet({ name: 'journalEdit', day })

  return (
    <OndaPage title={t('journal.title')} trailing={<GlassButton icon="plus" prominent ariaLabel={t('a11y.newEntry')} onClick={() => write()} />}>
      <div style={{ padding: '4px 16px 24px' }}>
        {active?.look && (
          <div style={{ marginBottom: 16 }}>
            <OndaBanner look={active.look} icon="notebook" kicker={name} title={t('journal.title')} sub={t('journal.count', { count: entries.length })} />
          </div>
        )}
        <Button fullWidth icon="pencil-simple" onClick={() => write()}>
          {t('journal.newEntry')}
        </Button>
        <div className={entries.length ? o.journalList : undefined} style={{ marginTop: 20 }}>
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
    </OndaPage>
  )
}

/* ── Philosophy: one idea at a time. A deck of cards to swipe through, each with one thing to try today,
   then every idea as a short list to jump to. Think about and Ethics are two decks. ── */
export function PhilosophyPage() {
  const { t } = useTranslation()
  const active = useActiveOnda()
  const c = active?.content
  const look = active?.look
  const sets = { ideas: c?.philosophy ?? [], ethics: c?.ethics ?? [] }
  const available = (['ideas', 'ethics'] as const).filter((k) => sets[k].length > 0)
  const [chosen, setPart] = useState<'ideas' | 'ethics'>('ideas')
  const part = available.includes(chosen) ? chosen : (available[0] ?? 'ideas')
  const [at, setAt] = useState<Record<string, number>>({})
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const shown = sets[part]
  const i = Math.min(at[part] ?? 0, Math.max(0, shown.length - 1))
  const go = (n: number) => setAt((v) => ({ ...v, [part]: n }))
  const pickedCount = Object.values(picked).filter(Boolean).length
  const num = (n: number) => (look ? look.numeral(n) : String(n))

  return (
    <OndaPage title={t('philosophy.title')}>
      <div className={o.phWrap}>
        <p className={o.phLead}>{t('philosophy.lead')}</p>
        {available.length > 1 && (
          <SegmentedControl<'ideas' | 'ethics'>
            options={[{ value: 'ideas', label: t('philosophy.think') }, { value: 'ethics', label: t('philosophy.ethicsTab') }]}
            value={part}
            onChange={setPart}
            fullWidth
            ariaLabel={t('philosophy.title')}
          />
        )}
      </div>
      {shown.length > 0 && (
        <div className={o.phWrap}>
        <Deck
          key={part}
          label={part === 'ideas' ? t('philosophy.think') : t('philosophy.ethics')}
          index={i}
          onIndex={go}
          slides={shown.map((x, n) => {
            const k = `${part}:${n}`
            return (
              <article key={k} className={o.phCard}>
                <span className={o.phNum} aria-hidden>{num(n + 1)}</span>
                <span className={o.phOf}>{t('guide.nOf', { n: n + 1, total: shown.length })}</span>
                <h2 className={o.phTitle}>{x.title}</h2>
                <p className={o.phText} data-selectable>{x.text}</p>
                {x.practice && (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={!!picked[k]}
                    className={picked[k] ? `${o.phTry} ${o.phTryOn}` : o.phTry}
                    onClick={() => {
                      haptic(picked[k] ? 'select' : 'success')
                      setPicked((v) => ({ ...v, [k]: !v[k] }))
                    }}
                  >
                    <span className={o.phTryBox} aria-hidden>{picked[k] && <Icon name="check" weight="bold" size={14} />}</span>
                    <span className={o.phTryText}>
                      <b>{picked[k] ? t('philosophy.onList') : t('philosophy.tryThis')}</b>
                      {x.practice}
                    </span>
                  </button>
                )}
              </article>
            )
          })}
        />
        </div>
      )}
      <div className={o.phWrap}>
        <div className={o.phCount}>
          <span>{t('philosophy.count', { count: shown.length })}</span>
          {pickedCount > 0 && <span className={o.phPicked}>{t('philosophy.pickedCount', { count: pickedCount })}</span>}
        </div>
        <div className={o.phList}>
          {shown.map((x, n) => (
            <button key={x.title} type="button" className={n === i ? `${o.phRow} ${o.phRowOn}` : o.phRow} aria-current={n === i || undefined} onClick={() => go(n)}>
              <span className={o.phRowN} aria-hidden>{num(n + 1)}</span>
              <span className={o.phRowTitle}>{x.title}</span>
              {picked[`${part}:${n}`] && <Icon name="check" weight="bold" size={15} />}
            </button>
          ))}
        </div>
      </div>
    </OndaPage>
  )
}

/* ── Rules: the Onda's rules. Tap one when you have kept it today. ── */
export function RulesPage() {
  const { t } = useTranslation()
  const active = useActiveOnda()
  const look = active?.look
  const done = useRunToday(active?.run.id).rules
  const rules = active?.content?.rules ?? active?.run.snapshot?.rules.map((r) => ({ ...r, why: '' })) ?? []
  const kept = rules.filter((r) => done.has(r.id)).length
  return (
    <OndaPage title={t('ondas.rules')}>
      <div style={{ padding: '4px 16px 24px' }}>
        {look && <OndaBanner look={look} icon="scales" kicker={active?.index?.name} title={t('ondas.rules')} sub={t('rulesPage.lead', { count: rules.length })} />}
        {rules.length > 0 && (
          <div className={o.rulesMeter}>
            <span style={{ flex: 'none' }}>{t('ondas.rulesOf', { done: kept, total: rules.length })}</span>
            <span style={{ flex: 1 }} className={o.todayBar}>
              <ProgressBar value={kept / rules.length} tone="var(--onda-strong)" height={6} label={t('ondas.rulesOf', { done: kept, total: rules.length })} />
            </span>
          </div>
        )}
        <div className={o.rulesKeep}>
          {rules.map((r, i) => {
            const on = done.has(r.id)
            return (
              <button
                key={r.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                className={on ? `${o.rule} ${o.ruleOn}` : o.rule}
                onClick={() => {
                  if (!active) return
                  haptic(on ? 'select' : 'success')
                  useStore.getState().toggleItem('ruleLogs', active.run.id, r.id)
                }}
              >
                <span className={o.ruleNum} aria-hidden>{on ? <Icon name="check" weight="bold" size={20} /> : look ? look.numeral(i + 1) : i + 1}</span>
                <span className={o.ruleBody}>
                  <span className={o.ruleText}>{r.text}</span>
                  {r.why && <span className={o.ruleWhy}>{r.why}</span>}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </OndaPage>
  )
}
