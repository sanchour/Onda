import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ACHIEVEMENTS } from '@/data/derive/achievements'
import { runDay } from '@/data/derive/onda'
import { activeDates, activityBars, activityByDate, consistency, summarize, type Range } from '@/data/derive/stats'
import { useLookFn, useOndaList } from '@/data/hooks'
import { useStore } from '@/data/store'
import { MONTHS, dateOf, fmtShortDate, fromDateStr, monthGrid } from '@/lib/dates'
import { Screen } from '@/nav/Screen'
import { useNav } from '@/nav/store'
import { GlassButton } from '@/ui/buttons'
import { ProgressRing } from '@/ui/data'
import { SegmentedControl } from '@/ui/controls'
import { Icon } from '@/ui/Icon'
import { SectionToggle } from '@/ui/lists'
import m from './more.module.css'
import s from './screens.module.css'

export const VIZ = ['var(--viz-blue)', 'var(--viz-yellow)', 'var(--viz-green)', 'var(--viz-coral)', 'var(--viz-purple)']

/** Stats: range switch, three summary cards, activity chart, achievements, Ondas and the monthly history calendar. */
export default function StatsTab() {
  const { t } = useTranslation()
  const { push, openSheet } = useNav()
  const lagos = useStore((x) => x.lagos)
  const checkIns = useStore((x) => x.checkIns)
  const runs = useStore((x) => x.runs)
  const practiceLogs = useStore((x) => x.practiceLogs)
  const journal = useStore((x) => x.journal)
  const reflections = useStore((x) => x.reflections)
  const achievements = useStore((x) => x.achievements)
  const today = useStore((x) => x.today)
  const ondas = useOndaList()
  const look = useLookFn()
  const [range, setRange] = useState<Range>('week')
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const [back, setBack] = useState(0) // months before the current one, 0..11

  const input = useMemo(() => ({ lagos, checkIns, runs, practiceLogs, journal, reflections }), [lagos, checkIns, runs, practiceLogs, journal, reflections])
  const act = useMemo(() => activityByDate(input, today), [input, today])
  const sum = useMemo(() => summarize(range, act, today), [range, act, today])
  const cons = useMemo(() => consistency(act, today), [act, today])
  const bars = useMemo(() => activityBars(range, act, today), [range, act, today])
  const has = useMemo(() => activeDates(input, act), [input, act])
  const max = Math.max(1, ...bars.map((b) => b.value))
  const unlocked = new Set(achievements.filter((a) => !a.deletedAt).map((a) => a.key))
  const myRuns = runs.filter((r) => !r.deletedAt).sort((a, b) => (a.state === 'active' ? -1 : b.state === 'active' ? 1 : (b.endedAt ?? '').localeCompare(a.endedAt ?? '')))

  const now = fromDateStr(today)
  const view = new Date(now.getFullYear(), now.getMonth() - back, 1)
  const { offset, days } = monthGrid(view.getFullYear(), view.getMonth())
  const toggle = (k: string) => () => setClosed((c) => ({ ...c, [k]: !c[k] }))
  const dow = t('common.weekdays', { returnObjects: true }) as string[]

  return (
    <Screen variant="root">
      <div className={s.titleRow}>
        <h1 className={s.largeTitle}>{t('stats.title')}</h1>
        <GlassButton icon="gear-six" ariaLabel={t('a11y.settings')} onClick={() => push({ name: 'settings' })} />
      </div>
      <div style={{ padding: '18px 16px 0' }}>
        <SegmentedControl<Range> options={[{ value: 'week', label: t('stats.week') }, { value: 'month', label: t('stats.month') }, { value: 'all', label: t('stats.all') }]} value={range} onChange={setRange} fullWidth ariaLabel={t('stats.title')} />
      </div>
      <div className={m.sumGrid}>
        {[
          [String(sum.checkIns), t('stats.checkIns')],
          [String(sum.streak), range === 'all' ? t('stats.bestStreak') : t('stats.dayStreak')],
          [`${Math.round(sum.completion * 100)}%`, t('stats.completion')],
        ].map(([v, l]) => (
          <div key={l} className={m.sumCard}>
            <div className={m.sumV}>{v}</div>
            <div className={m.sumL}>{l}</div>
          </div>
        ))}
      </div>

      <div className={m.consCard} role="group" aria-label={t('stats.consistency')}>
        <div className={m.consTop}>
          <div role="img" aria-label={t('stats.consistencyAria', { pct: Math.round(cons.score * 100), tier: t(`stats.tier${cons.tier[0]!.toUpperCase()}${cons.tier.slice(1)}`) })}>
            <ProgressRing value={cons.score} size={96} stroke={10} color="var(--accent)" track="var(--viz-track)">
              <span className={m.consPct}>{Math.round(cons.score * 100)}<small>%</small></span>
            </ProgressRing>
          </div>
          <div className={m.consText}>
            <h2 className={s.h20}>{t('stats.consistency')}</h2>
            <div className={m.consTier}>{t(`stats.tier${cons.tier[0]!.toUpperCase()}${cons.tier.slice(1)}`)}</div>
            <div className={m.consTrend}>
              {cons.delta === null ? t('stats.consistencyNew') : cons.delta === 0 ? t('stats.consistencyTrendFlat') : t(cons.delta > 0 ? 'stats.consistencyTrendUp' : 'stats.consistencyTrendDown', { count: Math.abs(cons.delta) })}
            </div>
          </div>
        </div>
        <div className={m.consDays} aria-hidden>
          {cons.days.map((r, i) => (
            <span key={i} className={m.consDay} data-empty={r === null || undefined}>
              <span className={m.consFill} style={{ height: r === null ? 4 : Math.max(6, Math.round(r * 34)), opacity: r === null ? 0.5 : 0.35 + 0.65 * r }} />
            </span>
          ))}
        </div>
        <div className={m.consCaption}>{t('stats.last14')} · {t('stats.consistencyNote')}</div>
      </div>

      <SectionToggle title={t('stats.activity')} meta={t(`stats.${range}`)} open={!closed.act} onToggle={toggle('act')} />
      {!closed.act && (
        <>
          <div className={m.note}>{t(`stats.note${range[0]!.toUpperCase()}${range.slice(1)}`)}</div>
          <div className={m.chart}>
            <div className={m.bars} key={range} role="img" aria-label={bars.map((b) => t('stats.barLabel', { label: b.label, count: b.value })).join(', ')}>
              {bars.map((b, i) => (
                <div key={i} className={m.barCol}>
                  <div className={b.current ? `${m.bar} ${m.barNow}` : m.bar} style={{ height: Math.max(8, Math.round((b.value / max) * 120)) }} />
                </div>
              ))}
            </div>
            <div className={m.barLabels} aria-hidden>
              {bars.map((b, i) => (
                <span key={i}>{b.label}</span>
              ))}
            </div>
          </div>
        </>
      )}

      <button type="button" className={m.achCard} onClick={() => openSheet({ name: 'achievements' })}>
        <span className={m.achHead}>
          <span className={s.h20}>{t('stats.achievements')}</span>
          <span className={m.achMeta}>
            <span>{t('stats.achCount', { count: unlocked.size })}</span>
            <Icon name="caret-right" weight="bold" size={16} color="var(--label-tertiary)" />
          </span>
        </span>
        <span className={m.achPreview} aria-hidden>
          {ACHIEVEMENTS.slice(0, 6).map((a, i) => (
            <span key={a.key} className={unlocked.has(a.key) ? `${m.achDot} ${m.achOn}` : m.achDot} style={unlocked.has(a.key) ? { background: VIZ[i % 5] } : undefined}>
              <Icon name={a.icon} weight="fill" size={22} />
            </span>
          ))}
        </span>
      </button>

      <SectionToggle title={t('stats.ondas')} meta={myRuns.length} open={!closed.ondas} onToggle={toggle('ondas')} />
      {!closed.ondas && (
        <div className={s.stack14}>
          {myRuns.map((r) => {
            const idx = ondas.find((x) => x.id === r.ondaId)
            const kept = reflections.find((x) => x.runId === r.id && !x.deletedAt)?.kept.length ?? 0
            const meta =
              r.state === 'active'
                ? t('stats.runActive', { day: runDay(r, today), length: r.lengthDays })
                : r.state === 'complete'
                  ? t('stats.runComplete', { length: r.lengthDays, date: fmtShortDate(r.endedAt ?? r.startedAt), kept })
                  : t('stats.runEnded', { length: r.lengthDays, date: fmtShortDate(r.endedAt ?? r.startedAt) })
            return (
              <button key={r.id} type="button" className={m.runRow} style={look(idx).vars} onClick={() => push({ name: 'onda', id: r.ondaId })}>
                <span className={m.runIcon}>
                  <Icon name={idx?.icon ?? 'sparkle'} weight="fill" size={24} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className={m.runName} style={{ display: 'block' }}>{idx?.name ?? r.snapshot?.name}</span>
                  <span className={m.runMeta} style={{ display: 'block' }}>{meta}</span>
                </span>
                <Icon name="caret-right" weight="bold" size={18} />
              </button>
            )
          })}
          {myRuns.length === 0 && <div className={s.sub} style={{ textAlign: 'center', padding: '8px 0' }}>{t('stats.noOndas')}</div>}
        </div>
      )}

      <SectionToggle title={t('stats.history')} open={!closed.hist} onToggle={toggle('hist')} />
      {!closed.hist && (
        <div className={`${s.card} ${s.calCard}`} style={{ marginTop: 0 }}>
          <div className={s.calHead}>
            <button type="button" className={s.calNav} aria-label={t('a11y.previousMonth')} disabled={back >= 11} onClick={() => setBack((b) => Math.min(11, b + 1))}>
              <Icon name="caret-left" weight="bold" size={18} />
            </button>
            <span className={s.calMonth} aria-live="polite">
              {MONTHS[view.getMonth()]} {view.getFullYear()}
            </span>
            <button type="button" className={s.calNav} aria-label={t('a11y.nextMonth')} disabled={back <= 0} onClick={() => setBack((b) => Math.max(0, b - 1))}>
              <Icon name="caret-right" weight="bold" size={18} />
            </button>
          </div>
          <div className={s.calDow} aria-hidden>
            {dow.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className={s.calGrid}>
            {Array.from({ length: offset }, (_, i) => (
              <span key={`o${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const date = dateOf(view.getFullYear(), view.getMonth(), i + 1)
              const future = date > today
              return (
                <button
                  key={date}
                  type="button"
                  disabled={future}
                  aria-label={`${i + 1} ${MONTHS[view.getMonth()]}`}
                  className={[m.dayBtn, !future && has.has(date) ? m.dayHas : '', date === today ? m.dayToday : ''].join(' ')}
                  onClick={() => openSheet({ name: 'dayLog', date })}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </Screen>
  )
}
