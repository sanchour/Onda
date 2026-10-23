import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { lagoStats, type LagoStats } from '@/data/derive/lago'
import { useLagos } from '@/data/hooks'
import { useStore } from '@/data/store'
import type { Lago } from '@/data/types'
import { haptic } from '@/lib/haptics'
import { useNav } from '@/nav/store'
import { ProgressBar } from '@/ui/data'
import { Icon } from '@/ui/Icon'
import { SectionToggle } from '@/ui/lists'
import { lagoMenu } from './lagoActions'
import c from './onda7/onda7.module.css'
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

/** Lagos (8.0) live on the Ondas tab, under the day's practices: the ones to check in today and the ones checked in, then
 *  those not due today and the finished ones, folded away. Starting a Lago and the Gallery are in Settings, under Add New. */
export function LagosSection() {
  const { t } = useTranslation()
  const push = useNav((n) => n.push)
  const lagos = useLagos()
  const checkIns = useStore((x) => x.checkIns)
  const today = useStore((x) => x.today)
  const [closed, setClosed] = useState<Record<string, boolean>>({ notToday: true, finished: true })

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
    <section className={c.lagos} aria-labelledby="ondas-lagos">
      <h2 id="ondas-lagos" className={c.todayHead}>{t('lagos.title')}</h2>
      {none ? (
        <div className={c.lagosEmpty}>
          <p>{t('lagos.emptyHere')}</p>
          <button type="button" className={c.lagosAdd} onClick={() => push({ name: 'settings', page: 'add' })}>
            <Icon name="plus" weight="bold" size={15} />
            {t('lagos.addInSettings')}
          </button>
        </div>
      ) : (
        <>
          {due > 0 && (
            <div className={c.lagosBar}>
              <span>{t('lagos.checkedInOf', { done, total: due })}</span>
              <ProgressBar value={done / due} height={6} label={t('lagos.today')} />
            </div>
          )}
          {section('todo', t('lagos.toCheckIn'))}
          {section('checked', t('lagos.checkedIn'))}
          {section('notToday', t('lagos.notToday'))}
          {section('finished', t('lagos.finished'))}
        </>
      )}
    </section>
  )
}
