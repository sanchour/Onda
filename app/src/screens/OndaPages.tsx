import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/data/hooks'
import { useStore } from '@/data/store'
import { haptic } from '@/lib/haptics'
import { BackButton, ChromeSpacer, ChromeTitle, Screen } from '@/nav/Screen'
import { useNav } from '@/nav/store'
import { Fold } from '@/sheets/guideParts'
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

/* ── Philosophy: a calm list. Every idea shows its title and first lines; tap one to read it and pick up something to try. ── */
export function PhilosophyPage() {
  const { t } = useTranslation()
  const active = useActiveOnda()
  const c = active?.content
  const look = active?.look
  const sets = { ideas: c?.philosophy ?? [], ethics: c?.ethics ?? [] }
  const available = (['ideas', 'ethics'] as const).filter((k) => sets[k].length > 0)
  const [chosen, setPart] = useState<'ideas' | 'ethics'>('ideas')
  const part = available.includes(chosen) ? chosen : (available[0] ?? 'ideas')
  const [open, setOpen] = useState<Record<string, boolean>>({ 'ideas:0': true, 'ethics:0': true })
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const shown = sets[part]
  const pickedCount = Object.values(picked).filter(Boolean).length

  return (
    <OndaPage title={t('philosophy.title')}>
      <div style={{ padding: '4px 16px 24px' }}>
        {look && <OndaBanner look={look} icon="lightbulb" kicker={active?.index?.name} title={t('philosophy.title')} sub={t('philosophy.lead')} />}
        {available.length > 1 && (
          <div style={{ marginTop: 16 }}>
            <SegmentedControl<'ideas' | 'ethics'>
              options={[{ value: 'ideas', label: t('philosophy.think') }, { value: 'ethics', label: t('philosophy.ethicsTab') }]}
              value={part}
              onChange={setPart}
              fullWidth
              ariaLabel={t('philosophy.title')}
            />
          </div>
        )}
        <div className={g.phCount}>
          <span>{t('philosophy.count', { count: shown.length })}</span>
          {pickedCount > 0 && <span className={g.phPicked}>{t('philosophy.pickedCount', { count: pickedCount })}</span>}
        </div>
        <div className={g.stack}>
          {shown.map((x, i) => {
            const k = `${part}:${i}`
            return (
              <Fold key={k} title={x.title} sub={x.text} badge={look ? look.numeral(i + 1) : String(i + 1)} open={!!open[k]} onToggle={() => setOpen((v) => ({ ...v, [k]: !v[k] }))} expandable>
                {x.practice && (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={!!picked[k]}
                    className={picked[k] ? `${g.phTry} ${g.phTryOn}` : g.phTry}
                    onClick={() => {
                      haptic(picked[k] ? 'select' : 'success')
                      setPicked((p) => ({ ...p, [k]: !p[k] }))
                    }}
                  >
                    <span className={g.phTryBox} aria-hidden>{picked[k] && <Icon name="check" weight="bold" size={15} />}</span>
                    <span className={g.phTryText}>
                      <b>{picked[k] ? t('philosophy.onList') : t('philosophy.tryThis')}</b>
                      {x.practice}
                    </span>
                  </button>
                )}
              </Fold>
            )
          })}
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
