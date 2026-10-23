import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { linksFor } from '@/content/links'
import { immerseSet } from '@/data/derive/onda'
import { useLook, useOnda, useOndaIndex } from '@/data/hooks'
import { useStore } from '@/data/store'
import { haptic } from '@/lib/haptics'
import type { SheetEntry } from '@/nav/store'
import { useActiveOnda, useRunToday } from '@/screens/ondaShared'
import o from '@/screens/ondas.module.css'
import s from '@/screens/screens.module.css'
import { Button } from '@/ui/buttons'
import { Icon } from '@/ui/Icon'
import { AppSheet } from './common'
import { openExternal } from './guideParts'
import g from './guide.module.css'

type E<N extends SheetEntry['name']> = { entry: Extract<SheetEntry, { name: N }> }

/* ── Quick look at one book, film, song, dish or word ─────── */
export function MediaInfoSheet({ entry }: E<'mediaInfo'>) {
  const { t } = useTranslation()
  const item = entry.item
  const index = useOndaIndex(entry.ondaId)
  const look = useLook(index)
  const logs = useStore((x) => x.immerseLogs)
  const on = useMemo(() => (entry.runId ? immerseSet(logs, entry.runId).has(item.id) : false), [logs, entry.runId, item.id])
  const sub = item.kind === 'words' ? item.meta : [item.creator, item.year].filter(Boolean).join(', ')
  const links = linksFor(item)

  return (
    <AppSheet entry={entry} look={look} detent={0.8}>
      <div style={{ padding: '8px 20px 40px' }}>
        <h2 className={g.miTitle}>{item.title}</h2>
        {sub && <div className={g.miMeta}>{sub}</div>}
        {item.extra && <div className={g.miExtra}>{item.extra}</div>}
        {entry.note && (
          <div className={`${o.howCard} ${o.howToday}`} data-selectable>
            <div className={o.howHead}>
              <Icon name="sparkle" weight="fill" size={16} />
              {t('plan.todayDo')}
            </div>
            {entry.note}
          </div>
        )}
        <p className={g.miWhy} data-selectable>{item.why || t('immersion.noNote')}</p>
        {item.unverified && <div className={g.tag} style={{ marginTop: 10, color: 'var(--label-tertiary)' }}>{t('guide.unverified')}</div>}
        {links.length > 0 && (
          <div className={g.miFind}>
            <div className={g.miFindHead}>{t('immersion.find')}</div>
            <div className={g.miLinks}>
              {links.map((l) => (
                <button key={l.label} type="button" className={g.miLink} onClick={() => openExternal(l.url)}>
                  <Icon name={l.icon} weight="fill" size={16} />
                  <span>{l.label}</span>
                  <Icon name="arrow-up-right" weight="bold" size={12} />
                </button>
              ))}
            </div>
          </div>
        )}
        <div className={g.miActions}>
          {entry.runId && (
            <Button
              fullWidth
              variant={on ? 'secondary' : 'primary'}
              icon={on ? 'check' : undefined}
              onClick={() => {
                haptic(on ? 'select' : 'success')
                useStore.getState().toggleImmerse(entry.runId!, item.id)
              }}
            >
              {on ? t('immersion.experiencedBtn') : t('immersion.markExperienced')}
            </Button>
          )}
          {item.link && (
            <Button fullWidth variant="plain" icon="arrow-up-right" onClick={() => openExternal(item.link!)}>
              {t('immersion.learnMore')}
            </Button>
          )}
        </div>
      </div>
    </AppSheet>
  )
}

/* ── How to do one practice: opened by holding its row ─────── */
export function PracticeInfoSheet({ entry }: E<'practiceInfo'>) {
  const { t } = useTranslation()
  const index = useOndaIndex(entry.ondaId)
  const content = useOnda(entry.ondaId)
  const look = useLook(index)
  const active = useActiveOnda()
  const run = active?.run.ondaId === entry.ondaId ? active.run : undefined
  const done = useRunToday(run?.id)
  const snap = run?.snapshot?.practices.find((x) => x.id === entry.practiceId)
  const p = content?.practices.find((x) => x.id === entry.practiceId)
  const name = p?.name ?? snap?.name ?? ''
  const on = done.practices.has(entry.practiceId)
  // instructions read as steps: one sentence each
  const steps = (p?.instructions ?? '').split(/(?<=[.?])\s+(?=[A-Z“‘"])/).map((x) => x.trim()).filter(Boolean)

  return (
    <AppSheet entry={entry} look={look} detent={0.86}>
      <div className={o.px}>
        <header className={o.pxHead}>
          <span className={o.pxIcon} aria-hidden><Icon name={p?.icon ?? snap?.icon ?? 'circle'} weight="regular" size={30} /></span>
          <span className={o.pxKicker}>{[index?.name, p?.meta ?? snap?.time].filter(Boolean).join(' · ')}</span>
          <h2 className={o.pxTitle}>{name}</h2>
        </header>
        {!content && !snap && <div className={s.sub} style={{ textAlign: 'center', padding: 24 }}>{t('onda.loading')}</div>}
        {entry.twist && (
          <div className={o.pxToday} data-selectable>
            <span className={o.pxLabel}>{t('plan.todayHead')}</span>
            {entry.twist}
          </div>
        )}
        {steps.length > 0 && (
          <section aria-label={t('onda.howTo')}>
            <h3 className={o.pxSec}>{t('onda.howTo')}</h3>
            <ol className={o.pxSteps} data-selectable>
              {steps.map((x, i) => (
                <li key={i}>
                  <span className={o.pxN} aria-hidden>{look ? look.numeral(i + 1) : i + 1}</span>
                  <span>{x}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
        {p?.why && (
          <section aria-label={t('onda.why')}>
            <h3 className={o.pxSec}>{t('onda.why')}</h3>
            <p className={o.pxWhy} data-selectable>{p.why}</p>
          </section>
        )}
        {!!p?.variations.length && (
          <section aria-label={t('onda.variations')}>
            <h3 className={o.pxSec}>{t('onda.variations')}</h3>
            <ul className={o.pxVars} data-selectable>
              {p.variations.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </section>
        )}
        {(content || snap) && !p?.instructions && !p?.why && <p className={o.pxWhy}>{t('onda.noHowTo')}</p>}
        {run && (
          <div className={o.pxAction}>
            <Button
              fullWidth
              variant={on ? 'secondary' : 'primary'}
              icon={on ? 'check' : undefined}
              onClick={() => {
                haptic(on ? 'select' : 'success')
                useStore.getState().togglePractice(run.id, entry.practiceId)
              }}
            >
              {on ? t('onda.doneToday') : t('onda.markDone')}
            </Button>
          </div>
        )}
      </div>
    </AppSheet>
  )
}
