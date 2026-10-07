import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { lagoStats, type LagoStats } from '@/data/derive/lago'
import { useLagos } from '@/data/hooks'
import { useStore } from '@/data/store'
import type { Lago } from '@/data/types'
import { haptic } from '@/lib/haptics'
import { Screen } from '@/nav/Screen'
import { useNav } from '@/nav/store'
import { GlassButton } from '@/ui/buttons'
import { ProgressBar } from '@/ui/data'
import { Icon } from '@/ui/Icon'
import { SectionToggle } from '@/ui/lists'
import { guardNewLago, lagoMenu } from './lagoActions'
import s from './screens.module.css'

type Row = { lago: Lago; st: LagoStats }

function LagoRow({ lago, st }: Row) {
  const { t } = useTranslation()
  const { push, openMenu } = useNav()
  const toggle = useStore((x) => x.toggleCheckInToday)
  const ref = useRef<HTMLDivElement>(null)
  const press = useRef<{ timer?: ReturnType<typeof setTimeout>; fired: boolean; x: number; y: number }>({ fired: false, x: 0, y: 0 })

  const openActions = () => {
    if (!ref.current) return
    haptic('impact')
    openMenu(lagoMenu(t, lago, ref.current.getBoundingClientRect()))
  }
  const cancel = () => clearTimeout(press.current.timer)
  const active = st.phase === 'active'
  const meta =
    st.phase === 'finished'
      ? t('lagos.finishedMeta', { count: lago.lengthDays })
      : t('lagos.dayMeta', { day: st.day, freq: t(`freq.${lago.frequency}`) })

  return (
    <div
      ref={ref}
      className={s.lagoRow}
      onPointerDown={(e) => {
        const p = press.current
        p.fired = false
        p.x = e.clientX
        p.y = e.clientY
        cancel()
        // Long-press opens the actions menu
        p.timer = setTimeout(() => {
          p.fired = true
          openActions()
        }, 450)
      }}
      onPointerMove={(e) => {
        if (Math.abs(e.clientX - press.current.x) + Math.abs(e.clientY - press.current.y) > 10) cancel()
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => {
        e.preventDefault()
        cancel()
        if (!press.current.fired) openActions()
      }}
    >
      <button
        type="button"
        className={s.lagoOpen}
        aria-label={t('a11y.openLago', { name: lago.name, day: st.day, length: lago.lengthDays })}
        onClick={() => {
          if (press.current.fired) return
          push({ name: 'lago', id: lago.id })
        }}
      />
      <div className={s.lagoMain}>
        <button
          type="button"
          role="checkbox"
          aria-checked={st.doneToday}
          aria-label={st.doneToday ? t('a11y.undoCheckIn', { name: lago.name }) : t('a11y.checkInLago', { name: lago.name })}
          disabled={!active}
          className={`${s.circle} ${s.lagoCircle} ${st.doneToday ? s.lagoCircleOn : ''} ${!active ? s.lagoCircleMuted : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            if (press.current.fired) return
            haptic(st.doneToday ? 'select' : 'success')
            toggle(lago.id)
          }}
        >
          <Icon name={lago.icon} weight="fill" size={24} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={s.lagoName}>{lago.name}</div>
          <div className={s.lagoMeta}>{meta}</div>
          <div className={s.lagoBar}>
            <ProgressBar value={st.pct} height={4} />
          </div>
        </div>
      </div>
      <button type="button" className={s.lagoDots} aria-label={t('a11y.more')} aria-haspopup="menu" onClick={openActions}>
        <Icon name="dots-three-vertical" weight="bold" size={20} />
      </button>
    </div>
  )
}

/** Lagos tab: today's progress, then collapsible To Check In / Checked In lists. */
export default function LagosTab() {
  const { t } = useTranslation()
  const { push, openSheet } = useNav()
  const lagos = useLagos()
  const checkIns = useStore((x) => x.checkIns)
  const today = useStore((x) => x.today)
  const [closed, setClosed] = useState<Record<string, boolean>>({})

  const groups = useMemo(() => {
    const rows = lagos.map((lago) => ({ lago, st: lagoStats(lago, checkIns, today) })).sort((a, b) => b.lago.startedAt.localeCompare(a.lago.startedAt) || b.lago.updatedAt - a.lago.updatedAt)
    const active = rows.filter((r) => r.st.phase === 'active')
    return {
      todo: active.filter((r) => r.st.dueToday && !r.st.doneToday && !r.st.missedToday),
      checked: active.filter((r) => r.st.doneToday || r.st.missedToday),
      notToday: active.filter((r) => !r.st.dueToday && !r.st.doneToday && !r.st.missedToday),
      finished: rows.filter((r) => r.st.phase === 'finished'),
    }
  }, [lagos, checkIns, today])

  const due = groups.todo.length + groups.checked.length
  const done = groups.checked.filter((r) => r.st.doneToday).length
  const none = due + groups.notToday.length + groups.finished.length === 0

  const section = (key: keyof typeof groups, title: string) =>
    groups[key].length > 0 && (
      <section key={key}>
        <SectionToggle title={title} meta={groups[key].length} open={!closed[key]} onToggle={() => setClosed((c) => ({ ...c, [key]: !c[key] }))} />
        {!closed[key] && (
          <div className={s.stack14}>
            {groups[key].map((r) => (
              <LagoRow key={r.lago.id} {...r} />
            ))}
          </div>
        )}
      </section>
    )

  return (
    <Screen variant="root">
      <div className={s.titleRow}>
        <h1 className={s.largeTitle}>{t('lagos.title')}</h1>
        <div className={s.actions}>
          <GlassButton icon="plus" prominent ariaLabel={t('lagos.newLago')} onClick={() => guardNewLago(t) && openSheet({ name: 'lagoForm' })} />
          <GlassButton icon="squares-four" ariaLabel={t('lagos.gallery')} onClick={() => push({ name: 'gallery' })} />
          <GlassButton icon="gear-six" ariaLabel={t('a11y.settings')} onClick={() => push({ name: 'settings' })} />
        </div>
      </div>
      <div className={s.todayCard}>
        <div className={s.todayRow}>
          <span className={s.todayTitle}>{t('lagos.today')}</span>
          <span className={s.sub}>{t('lagos.checkedInOf', { done, total: due })}</span>
        </div>
        <ProgressBar value={due ? done / due : 0} height={10} style={{ marginTop: 14 }} label={t('lagos.today')} />
      </div>
      {section('todo', t('lagos.toCheckIn'))}
      {section('checked', t('lagos.checkedIn'))}
      {section('notToday', t('lagos.notToday'))}
      {section('finished', t('lagos.finished'))}
      {none && (
        <>
          <div className={s.empty}>
            <div className={s.emptyTitle}>{t('lagos.empty')}</div>
            <div className={`${s.sub}`} style={{ marginTop: 4 }}>{t('lagos.emptySub')}</div>
          </div>
          <button type="button" className={s.tipCard} onClick={() => push({ name: 'gallery' })}>
            <span className={`${s.circle} ${s.tipIcon}`}>
              <Icon name="lightbulb" weight="fill" size={22} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className={s.tipTitle}>{t('lagos.tipTitle')}</span>
              <span className={s.tipText}>{t('lagos.tipText')}</span>
            </span>
            <Icon name="caret-right" weight="bold" size={18} color="var(--label-quaternary)" />
          </button>
        </>
      )}
    </Screen>
  )
}
