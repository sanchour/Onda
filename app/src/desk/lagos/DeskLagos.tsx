import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLagos } from '@/data/hooks'
import { useStore } from '@/data/store'
import { fromDateStr } from '@/lib/dates'
import { haptic } from '@/lib/haptics'
import { reducedMotion } from '@/lib/motion'
import { Screen } from '@/nav/Screen'
import { useNav } from '@/nav/store'
import { guardNewLago } from '@/screens/lagoActions'
import { OrnDivider, useOndaScope } from '@/screens/ondaShared'
import o from '@/screens/ondas.module.css'
import { ProgressRing } from '@/ui/data'
import { Icon } from '@/ui/Icon'
import { lagoRows, weekTotals, type Group, type LagoRowData } from './derive'
import k from './lagos.desk.module.css'
import { GalleryIdeas, LagoCard, WeekMatrix } from './parts'

/* Lagos on the desktop: today's progress and the week in numbers across the top, the Lagos as cards in the same four
   sections as the phone, and a side column with the week at a glance and ideas from the Gallery.
   A Lago checked in stays where it is while its ring and rays play, then moves to Checked In. */

const ORDER: { key: Group; label: string }[] = [
  { key: 'todo', label: 'lagos.toCheckIn' },
  { key: 'checked', label: 'lagos.checkedIn' },
  { key: 'notToday', label: 'lagos.notToday' },
  { key: 'finished', label: 'lagos.finished' },
]

export default function DeskLagos() {
  const { t } = useTranslation()
  const { push, openSheet } = useNav()
  const lagos = useLagos()
  const checkIns = useStore((x) => x.checkIns)
  const today = useStore((x) => x.today)
  const scope = useOndaScope()
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const [held, setHeld] = useState<Record<string, Group>>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), [])

  const rows = useMemo(() => lagoRows(lagos, checkIns, today), [lagos, checkIns, today])
  const groups = useMemo(() => {
    const g: Record<Group, LagoRowData[]> = { todo: [], checked: [], notToday: [], finished: [] }
    for (const r of rows) {
      const at = held[r.lago.id] ?? r.group
      if (at) g[at].push(r)
    }
    return g
  }, [rows, held])

  const due = rows.filter((r) => r.group === 'todo' || r.group === 'checked').length
  const done = rows.filter((r) => r.group === 'checked' && r.st.doneToday).length
  const week = useMemo(() => weekTotals(rows, today), [rows, today])
  const lead = rows.filter((r) => r.group).reduce<LagoRowData | null>((m, r) => (r.st.streak > (m?.st.streak ?? 0) ? r : m), null)
  const running = useMemo(() => new Set(rows.filter((r) => r.group && r.group !== 'finished').map((r) => r.lago.name.toLocaleLowerCase())), [rows])
  const none = rows.every((r) => !r.group)

  const toggle = (r: LagoRowData) => {
    const id = r.lago.id
    // hold the card in its section while the check plays, then let it move
    if (r.group && !reducedMotion()) {
      setHeld((h) => ({ ...h, [id]: r.group! }))
      clearTimeout(timers.current[id])
      timers.current[id] = setTimeout(() => {
        setHeld((h) => {
          const next = { ...h }
          delete next[id]
          return next
        })
      }, r.st.doneToday ? 450 : 1100)
    }
    haptic(r.st.doneToday ? 'select' : 'success')
    useStore.getState().toggleCheckInToday(id)
  }
  const newLago = () => guardNewLago(t) && openSheet({ name: 'lagoForm' })
  const dateLine = fromDateStr(today).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const left = due - done

  return (
    <Screen variant="root" desk="wide">
      <div className={`${k.page} ${scope ? o.scope : ''}`} {...scope?.props}>
        <header className={k.head}>
          <div>
            <div className={k.kicker}>{dateLine}</div>
            <h1 className={k.title}>{t('lagos.title')}</h1>
          </div>
          <div className={k.headActions}>
            <button type="button" className={k.pill} onClick={() => push({ name: 'gallery' })}>
              <Icon name="squares-four" weight="bold" size={17} />
              {t('lagos.gallery')}
            </button>
            <button type="button" className={`${k.pill} ${k.pillPrimary}`} onClick={newLago}>
              <Icon name="plus" weight="bold" size={17} />
              {t('lagos.newLago')}
            </button>
          </div>
        </header>
        {scope?.themed && <OrnDivider look={scope.look} className={k.orn} />}

        {none ? (
          <div className={k.emptyWrap}>
            <div className={k.empty}>
              <span className={k.emptyArt} aria-hidden>
                <Icon name="wave-soft" weight="bold" size={44} />
              </span>
              <h2 className={k.emptyTitle}>{t('lagos.empty')}</h2>
              <p className={k.emptySub}>{t('deskLagos.emptySub')}</p>
              <div className={k.emptyActions}>
                <button type="button" className={`${k.pill} ${k.pillPrimary}`} onClick={newLago}>
                  <Icon name="plus" weight="bold" size={17} />
                  {t('lagos.newLago')}
                </button>
                <button type="button" className={k.pill} onClick={() => push({ name: 'gallery' })}>
                  <Icon name="squares-four" weight="bold" size={17} />
                  {t('deskLagos.openGallery')}
                </button>
              </div>
            </div>
            <GalleryIdeas running={running} />
          </div>
        ) : (
          <div className={k.layout}>
            <div className={k.main}>
              <section className={k.today} aria-labelledby="dk-today">
                <div className={k.todayRing}>
                  <ProgressRing value={due ? done / due : 0} size={92} stroke={7} color="var(--accent)" track="color-mix(in srgb, var(--accent) 14%, transparent)">
                    <span className={k.todayCount} aria-hidden>
                      {done}
                      <small>/{due}</small>
                    </span>
                  </ProgressRing>
                </div>
                <div className={k.todayText}>
                  <h2 id="dk-today" className={k.todayTitle}>{t('lagos.today')}</h2>
                  <p className={k.todaySub}>{due === 0 ? t('deskLagos.nothingDue') : left === 0 ? t('deskLagos.allDone') : t('lagos.checkedInOf', { done, total: due })}</p>
                  {left > 0 && <p className={k.todayLeft}>{t('deskLagos.toGo', { count: left })}</p>}
                </div>
                <dl className={k.kpis}>
                  <div className={k.kpi}>
                    <dt>{t('deskLagos.weekScore')}</dt>
                    <dd>
                      {week.due ? Math.round((week.done / week.due) * 100) : 0}
                      <small>%</small>
                    </dd>
                    <span className={k.kpiNote}>{t('deskLagos.weekScoreNote')}</span>
                  </div>
                  <div className={k.kpi}>
                    <dt>{t('deskLagos.weekCheckIns')}</dt>
                    <dd>{week.done}</dd>
                    <span className={k.kpiNote}>{t('deskLagos.weekCheckInsNote')}</span>
                  </div>
                  <div className={k.kpi}>
                    <dt>{t('deskLagos.longest')}</dt>
                    <dd>
                      {lead?.st.streak ?? 0}
                      <small>{t('deskLagos.daysUnit', { count: lead?.st.streak ?? 0 })}</small>
                    </dd>
                    {lead && <span className={k.kpiNote}>{lead.lago.name}</span>}
                  </div>
                </dl>
              </section>

              {ORDER.map(({ key, label }) =>
                groups[key].length ? (
                  <section key={key} className={k.section} aria-labelledby={`dk-sec-${key}`}>
                    <button type="button" className={k.secHead} aria-expanded={!closed[key]} onClick={() => setClosed((c) => ({ ...c, [key]: !c[key] }))}>
                      <h2 id={`dk-sec-${key}`} className={k.secTitle}>{t(label)}</h2>
                      <span className={k.secCount}>{groups[key].length}</span>
                      <span className={k.secCaret} data-closed={closed[key] ? '' : undefined} aria-hidden>
                        <Icon name="caret-down" weight="bold" size={14} />
                      </span>
                    </button>
                    {!closed[key] && (
                      <div className={k.grid}>
                        {groups[key].map((r, i) => (
                          <LagoCard key={r.lago.id} row={r} index={i} onToggle={toggle} />
                        ))}
                      </div>
                    )}
                  </section>
                ) : null,
              )}
            </div>
            <aside className={k.side} aria-label={t('deskLagos.sideLabel')}>
              <WeekMatrix rows={rows} />
              <GalleryIdeas running={running} />
            </aside>
          </div>
        )}
      </div>
    </Screen>
  )
}
