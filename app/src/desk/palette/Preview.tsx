import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { EmblemArt } from '@/screens/emblems'
import { useActiveOnda } from '@/screens/ondaShared'
import { Icon } from '@/ui/Icon'
import { Keys } from '../keys/Kbd'
import type { PItem } from './items'
import p from './palette.module.css'

/* The palette's right-hand column: a closer look at the chosen result. An Onda shows its cover, a practice its
   how-to, a Lago its numbers, a place or action its icon and shortcut. */

export function Preview({ item }: { item: PItem }) {
  if (item.kind === 'onda' && item.look) return <OndaPreview item={item} />
  if (item.kind === 'practice' && item.practice) return <PracticePreview item={item} />
  if (item.kind === 'lago' && item.lago) return <LagoPreview item={item} />
  return (
    <div className={`${p.pv} ${p.pvCentre}`}>
      <span className={p.pvBig} aria-hidden>
        <Icon name={item.icon} size={34} />
      </span>
      <div className={p.pvTitle}>{item.title}</div>
      {item.sub && <div className={p.pvKicker}>{item.sub}</div>}
      {item.checked && (
        <span className={p.pvDone}>
          <Icon name="check" weight="bold" size={12} />
          {item.title}
        </span>
      )}
      {item.keys && (
        <div className={p.pvKeys}>
          <Keys keys={item.keys} />
        </div>
      )}
    </div>
  )
}

function OndaPreview({ item }: { item: PItem }) {
  const look = item.look!
  const o = item.onda
  return (
    <div className={p.pv}>
      <div className={p.pvCover} style={{ ...(look.vars as CSSProperties), background: look.cover, color: look.ink }}>
        <span className={p.pvEmblem} aria-hidden>
          {look.emblem ? <EmblemArt id={look.emblem} size={92} line={1} /> : <Icon name={item.icon} size={44} />}
        </span>
        <span className={p.pvName} style={{ fontFamily: look.font, textTransform: look.caps ? 'uppercase' : undefined, letterSpacing: look.caps ? '.05em' : undefined }}>
          {item.title}
        </span>
        {o?.origin && <span className={p.pvOrigin}>{o.origin}</span>}
      </div>
      {o?.line && <p className={p.pvText}>{o.line}</p>}
      <div className={p.pvTags}>
        {o?.dayLabel && <span className={p.tag} data-on="">{o.dayLabel}</span>}
        {o?.groupLabel && <span className={p.tag}>{o.groupLabel}</span>}
      </div>
    </div>
  )
}

function PracticePreview({ item }: { item: PItem }) {
  const { t } = useTranslation()
  const active = useActiveOnda()
  const pr = item.practice!
  const look = active?.look
  const full = active?.content?.practices.find((x) => x.id === pr.id)
  // instructions read as steps, one sentence each (as the How To sheet sets them)
  const steps = (full?.instructions ?? '').split(/(?<=[.?])\s+(?=[A-Z“‘"])/).map((x) => x.trim()).filter(Boolean)
  return (
    <div className={p.pv}>
      <div className={p.pvHead}>
        <span className={p.pvIcon} aria-hidden>
          <Icon name={pr.icon} size={24} />
        </span>
        {item.checked && (
          <span className={p.pvDone}>
            <Icon name="check" weight="bold" size={12} />
            {t('onda.doneToday')}
          </span>
        )}
      </div>
      <div className={p.pvKicker}>{item.sub}</div>
      <div className={p.pvTitle} style={{ fontFamily: look?.font }}>
        {item.title}
      </div>
      {pr.twist && <div className={p.pvTwist}>{t('plan.today', { text: pr.twist })}</div>}
      {pr.note && <p className={p.pvText}>{pr.note}</p>}
      {steps.length > 0 && (
        <ol className={p.pvSteps}>
          {steps.slice(0, 4).map((s, i) => (
            <li key={i}>
              <span className={p.pvN} aria-hidden>{look ? look.numeral(i + 1) : i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function LagoPreview({ item }: { item: PItem }) {
  const { t } = useTranslation()
  const { lago, st } = item.lago!
  return (
    <div className={p.pv}>
      <div className={p.pvHead}>
        <span className={p.pvLago} data-on={st.doneToday ? '' : undefined} aria-hidden>
          <Icon name={lago.icon} weight="fill" size={26} />
        </span>
        {st.doneToday && (
          <span className={p.pvDone}>
            <Icon name="check" weight="bold" size={12} />
            {t('power.palette.checkedIn')}
          </span>
        )}
      </div>
      <div className={p.pvKicker}>{item.sub}</div>
      <div className={p.pvTitle}>{lago.name}</div>
      {lago.why && <p className={p.pvText}>{lago.why}</p>}
      <div className={p.pvBar} role="img" aria-label={t('lago.progressValue', { day: st.day, length: lago.lengthDays })}>
        <i style={{ transform: `scaleX(${st.pct})` }} />
      </div>
      <dl className={p.pvStats}>
        <div>
          <dt>{t('lago.streak')}</dt>
          <dd>{st.streak}</dd>
        </div>
        <div>
          <dt>{t('lago.checkIns')}</dt>
          <dd>{st.checkIns}</dd>
        </div>
        <div>
          <dt>{t('lago.score')}</dt>
          <dd>{Math.round(st.score * 100)}%</dd>
        </div>
      </dl>
      {st.phase === 'active' && !st.dueToday && <div className={p.pvNote}>{t('lago.notDueToday')}</div>}
    </div>
  )
}
