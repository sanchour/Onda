import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { lagoCalendar, lagoEndDate, lagoStats } from '@/data/derive/lago'
import { useStore } from '@/data/store'
import { MONTHS, fromDateStr } from '@/lib/dates'
import { BackButton, ChromeGroup, ChromeTitle, Screen } from '@/nav/Screen'
import { useNav, type StackEntry } from '@/nav/store'
import { Button, GlassButton } from '@/ui/buttons'
import { ProgressBar, ProgressRing } from '@/ui/data'
import { Icon } from '@/ui/Icon'
import { lagoMenu } from './lagoActions'
import s from './screens.module.css'

/** Lago insights: hero, progress, streak / check ins / score, month calendar and the Check In button. */
export default function LagoInsights({ entry }: { entry: Extract<StackEntry, { name: 'lago' }> }) {
  const { t } = useTranslation()
  const { openSheet, openMenu, popToRoot } = useNav()
  const lago = useStore((x) => x.lagos.find((l) => l.id === entry.id && !l.deletedAt))
  const checkIns = useStore((x) => x.checkIns)
  const today = useStore((x) => x.today)
  const dots = useRef<HTMLDivElement>(null)
  const [ym, setYm] = useState(() => {
    const d = fromDateStr(today)
    return { y: d.getFullYear(), m: d.getMonth() }
  })

  const st = useMemo(() => (lago ? lagoStats(lago, checkIns, today) : null), [lago, checkIns, today])
  const cells = useMemo(() => (lago ? lagoCalendar(lago, checkIns, ym.y, ym.m, today) : []), [lago, checkIns, ym, today])
  if (!lago || !st) return <Screen chrome={<BackButton />}>{null}</Screen>

  const idx = (d: Date) => d.getFullYear() * 12 + d.getMonth()
  const cur = ym.y * 12 + ym.m
  const canPrev = cur > idx(fromDateStr(lago.startedAt))
  const canNext = cur < Math.max(idx(fromDateStr(lagoEndDate(lago))), idx(fromDateStr(today)))
  const shift = (d: number) => setYm(({ y, m }) => ({ y: y + Math.floor((m + d) / 12), m: (((m + d) % 12) + 12) % 12 }))
  const dow = t('common.weekdays', { returnObjects: true }) as string[]

  const ringPct = Math.round(st.pct * 100)
  const cta = st.phase !== 'active' ? t('lago.finished') : st.doneToday || st.missedToday ? t('lago.editCheckIn') : t('lago.checkIn')

  return (
    <Screen
      variant="hero"
      chrome={
        <>
          <BackButton />
          <ChromeTitle>{t('lago.title')}</ChromeTitle>
          <ChromeGroup>
            <GlassButton icon="clock-counter-clockwise" iconWeight="regular" ariaLabel={t('a11y.history')} onClick={() => popToRoot('stats')} />
            <div ref={dots}>
              <GlassButton icon="dots-three" ariaLabel={t('a11y.more')} onClick={() => dots.current && openMenu({ ...lagoMenu(t, lago, dots.current.getBoundingClientRect()), anchor: { ...dots.current.getBoundingClientRect().toJSON(), left: 0, right: window.innerWidth - 16 }, align: 'end', dim: false })} />
            </div>
          </ChromeGroup>
        </>
      }
      bottom={
        <Button fullWidth disabled={st.phase !== 'active'} onClick={() => openSheet({ name: 'checkin', lagoId: lago.id })}>
          {cta}
        </Button>
      }
    >
      <div className={s.lagoAura} aria-hidden />
      <div className={`${s.center} ${s.hero} ${s.lagoHero}`}>
        <div className={s.lagoRing} role="img" aria-label={t('lago.progressValue', { day: st.day, length: lago.lengthDays })}>
          <ProgressRing value={st.pct} size={176} stroke={8} color="var(--accent)" track="color-mix(in srgb, var(--accent) 14%, transparent)">
            <span className={s.lagoDisc}>
              <Icon name={lago.icon} weight="fill" size={52} />
            </span>
          </ProgressRing>
          <span className={s.lagoRingPct} aria-hidden>{ringPct}%</span>
        </div>
        <h2 className={s.heroName}>{lago.name}</h2>
        {lago.why && <div className={s.heroDesc}>{lago.why}</div>}
        <div className={s.lagoStreakPill}>
          <Icon name="fire" weight="fill" size={16} color={st.streak ? 'var(--accent)' : 'var(--label-tertiary)'} />
          <span>{st.streak ? t('lago.dayStreak', { count: st.streak }) : t('lago.noStreak')}</span>
        </div>
      </div>

      <div className={`${s.card} ${s.glassCard} ${s.lagoStats}`}>
        <div className={s.lagoStat}>
          <div className={s.statV}>{st.day}<small>/{lago.lengthDays}</small></div>
          <div className={s.statL}>{t('lago.progress')}</div>
        </div>
        <div className={s.lagoStat}>
          <div className={s.statV}>{st.checkIns}</div>
          <div className={s.statL}>{t('lago.checkIns')}</div>
        </div>
        <div className={s.lagoStat}>
          <div className={s.statV}>{Math.round(st.score * 100)}<small>%</small></div>
          <div className={s.statL}>{t('lago.score')}</div>
        </div>
        <ProgressBar value={st.pct} height={6} style={{ gridColumn: '1 / -1', marginTop: 14 }} label={t('lago.progress')} />
      </div>

      <div className={`${s.card} ${s.calCard} ${s.glassCard}`}>
        <div className={s.calHead}>
          <button type="button" className={s.calNav} aria-label={t('a11y.previousMonth')} disabled={!canPrev} onClick={() => shift(-1)}>
            <Icon name="caret-left" weight="bold" size={18} />
          </button>
          <span className={s.calMonth} aria-live="polite">
            {MONTHS[ym.m]} {ym.y}
          </span>
          <button type="button" className={s.calNav} aria-label={t('a11y.nextMonth')} disabled={!canNext} onClick={() => shift(1)}>
            <Icon name="caret-right" weight="bold" size={18} />
          </button>
        </div>
        <div className={s.calDow} aria-hidden>
          {dow.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className={s.calGrid}>
          {cells.map((c, i) =>
            c ? (
              <span
                key={i}
                className={[s.calCell, c.state === 'done' ? s.calOn : '', c.state === 'missed' ? s.calMissed : '', c.state === 'future' ? s.calFuture : '', c.today && c.state !== 'done' ? s.calToday : ''].join(' ')}
                aria-label={`${c.day} ${MONTHS[ym.m]}${c.state === 'done' ? `, ${t('a11y.done')}` : c.state === 'missed' ? `, ${t('checkin.missed')}` : ''}`}
              >
                {c.day}
              </span>
            ) : (
              <span key={i} />
            ),
          )}
        </div>
      </div>
    </Screen>
  )
}
