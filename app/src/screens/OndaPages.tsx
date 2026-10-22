import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/data/hooks'
import { useStore } from '@/data/store'
import { haptic } from '@/lib/haptics'
import { BackButton, ChromeSpacer, ChromeTitle, LargeTitle, Screen } from '@/nav/Screen'
import { useNav } from '@/nav/store'
import g from '@/sheets/guide.module.css'
import { Button, GlassButton } from '@/ui/buttons'
import { SegmentedControl } from '@/ui/controls'
import { ProgressBar } from '@/ui/data'
import { Icon } from '@/ui/Icon'
import { OndaBanner, useActiveOnda, useRunToday } from './ondaShared'
import o from './ondas.module.css'
import s from './screens.module.css'

/** Shared frame for the three full-screen pages that used to be sheets: back button, title, Onda look. */
function OndaPage({ title, large, trailing, desk, children }: { title: string; large?: { sub?: string }; trailing?: React.ReactNode; desk?: 'wide'; children: React.ReactNode }) {
  const active = useActiveOnda()
  const themed = useSettings().ondaThemes
  return (
    <Screen
      variant="page"
      desk={desk}
      style={active?.look.vars}
      dataOnda={themed ? active?.run.ondaId : undefined}
      chrome={
        <>
          <span className={g.topMask} aria-hidden />
          <BackButton />
          <ChromeTitle after={large ? 44 : undefined}>{title}</ChromeTitle>
          {trailing ?? <ChromeSpacer />}
        </>
      }
    >
      {large && <LargeTitle title={title} sub={large.sub} />}
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
    <OndaPage title={t('journal.title')} desk="wide" trailing={<GlassButton icon="plus" prominent ariaLabel={t('a11y.newEntry')} onClick={() => write()} />}>
      <div className={o.jrWrap} style={{ padding: '4px 16px 24px' }}>
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

/* ── Philosophy: today's idea first, large, with one thing to try. Then every idea and every ethical teaching as a calm index:
   a numeral, the title and a first line; a tap opens it in place to read in full and pick up its practice. ── */
export function PhilosophyPage() {
  const { t } = useTranslation()
  const active = useActiveOnda()
  const c = active?.content
  const look = active?.look
  const day = active?.day ?? 1
  const ideas = c?.philosophy ?? []
  const ethics = c?.ethics ?? []
  const [open, setOpen] = useState<string | null>(null)
  const [tab, setTab] = useState<'ideas' | 'ethics'>('ideas')
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const pickedCount = Object.values(picked).filter(Boolean).length
  const num = (n: number) => (look ? look.numeral(n) : String(n))
  const ti = ideas.length ? (day - 1) % ideas.length : -1
  const today = ti >= 0 ? ideas[ti] : undefined
  const tryIt = (k: string, practice: string, onCover?: boolean) => (
    <button
      type="button"
      role="checkbox"
      aria-checked={!!picked[k]}
      className={[o.phTry, onCover ? '' : o.phTryPlain, picked[k] ? o.phTryOn : ''].filter(Boolean).join(' ')}
      onClick={() => {
        haptic(picked[k] ? 'select' : 'success')
        setPicked((v) => ({ ...v, [k]: !v[k] }))
      }}
    >
      <span className={o.phTryBox} aria-hidden>{picked[k] && <Icon name="check" weight="bold" size={14} />}</span>
      <span className={o.phTryText}>
        <b>{picked[k] ? t('philosophy.onList') : t('philosophy.tryThis')}</b>
        {practice}
      </span>
    </button>
  )
  const sections = [
    { key: 'ideas' as const, label: t('philosophy.think'), short: t('philosophy.think'), set: ideas },
    { key: 'ethics' as const, label: t('philosophy.ethics'), short: t('philosophy.ethicsTab'), set: ethics },
  ].filter((x) => x.set.length > 0)
  const shown = sections.length > 1 ? sections.filter((x) => x.key === tab) : sections

  return (
    <OndaPage title={t('philosophy.title')} large={{ sub: t('philosophy.lead') }} desk="wide">
      <div className={o.phWrap}>
        {today && (
          <article className={o.phToday}>
            <span className={o.phKicker}>{t('philosophy.todayIdea', { day })}</span>
            <h2 className={o.phTodayTitle}>{today.title}</h2>
            <p className={o.phTodayText} data-selectable>{today.text}</p>
            {today.practice && tryIt(`ideas:${ti}`, today.practice, true)}
          </article>
        )}
        {pickedCount > 0 && <div className={o.phPickedBar}><Icon name="check-circle" weight="regular" size={18} />{t('philosophy.pickedCount', { count: pickedCount })}</div>}
        {sections.length > 1 && (
          <div className={o.phSeg}>
            <SegmentedControl options={sections.map((x) => ({ value: x.key, label: `${x.short} ${x.set.length}` }))} value={tab} onChange={(v) => { setTab(v); setOpen(null) }} fullWidth ariaLabel={t('philosophy.title')} />
          </div>
        )}
        {shown.map((sec) => (
          <section key={sec.key} aria-label={sec.label}>
            {sections.length < 2 && (
              <h3 className={o.phSec}>
                {sec.label}
                <small>{sec.set.length}</small>
              </h3>
            )}
            <div className={o.phIndex}>
              {sec.set.map((x, n) => {
                const k = `${sec.key}:${n}`
                const isOpen = open === k
                return (
                  <div key={k} className={isOpen ? `${o.phItem} ${o.phItemOpen}` : o.phItem}>
                    <button type="button" className={o.phItemHead} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : k)}>
                      <span className={o.phRowN} aria-hidden>{num(n + 1)}</span>
                      <span className={o.phItemText}>
                        <span className={o.phItemTitle}>{x.title}</span>
                        {!isOpen && <span className={o.phItemPeek}>{x.text}</span>}
                      </span>
                      {picked[k] && <span className={o.phItemDone} aria-label={t('philosophy.onList')}><Icon name="check" weight="bold" size={14} /></span>}
                      <span className={isOpen ? `${o.phCaret} ${o.phCaretOpen}` : o.phCaret} aria-hidden><Icon name="caret-down" weight="bold" size={14} /></span>
                    </button>
                    {isOpen && (
                      <div className={o.phItemBody}>
                        <p data-selectable>{x.text}</p>
                        {x.practice && tryIt(k, x.practice)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))}
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
