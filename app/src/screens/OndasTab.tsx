import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BROWSE_GROUPS, COMING_SOON, GROUP_OF } from '@/content/browse'
import { planForDay, type DayPractice } from '@/data/derive/plan'
import { useLookFn, useOndaList, useSettings } from '@/data/hooks'
import { columnWidth, fitSize } from '@/lib/fit'
import { useStore } from '@/data/store'
import { BackButton, Screen } from '@/nav/Screen'
import { useNav } from '@/nav/store'
import { Button, GlassButton } from '@/ui/buttons'
import { ProgressBar } from '@/ui/data'
import { Icon } from '@/ui/Icon'
import { SectionToggle } from '@/ui/lists'
import { DayBar, OrnDivider, PlanList, guardCreateOnda, nameSize, useActiveOnda, useRunToday } from './ondaShared'
import o from './ondas.module.css'
import s from './screens.module.css'

/** Ondas tab: the running Onda's banner, four shortcuts, then today's practices. */
export default function OndasTab() {
  const { t } = useTranslation()
  const { push, openSheet } = useNav()
  const active = useActiveOnda()
  const settings = useSettings()
  const themed = settings.ondaThemes
  const done = useRunToday(active?.run.id)
  const { togglePractice } = useStore.getState()

  const header = (
    <div className={s.titleRow}>
      <h1 className={active && themed ? `${s.largeTitle} ${o.hdrTitle}` : s.largeTitle}>
        {t('ondas.title')}
      </h1>
      <div className={s.actions}>
        <GlassButton icon="plus" prominent ariaLabel={t('ondas.newOnda')} onClick={() => guardCreateOnda(t) && openSheet({ name: 'createOnda' })} />
        <GlassButton icon="compass" ariaLabel={t('ondas.browse')} onClick={() => push({ name: 'allOndas' })} />
        <GlassButton icon="gear-six" ariaLabel={t('a11y.settings')} onClick={() => push({ name: 'settings' })} />
      </div>
    </div>
  )

  if (!active) {
    return (
      <Screen variant="root">
        {header}
        <div className={o.emptyCard}>
          <div className={s.emptyTitle}>{t('ondas.noRunning')}</div>
          <div className={s.sub} style={{ marginTop: 4 }}>{t('ondas.noRunningSub')}</div>
          <div style={{ marginTop: 16 }}>
            <Button size="md" onClick={() => push({ name: 'allOndas' })}>
              {t('ondas.browse')}
            </Button>
          </div>
        </div>
      </Screen>
    )
  }

  const { run, content, look, day, index } = active
  // until the content file has loaded, the run's own snapshot keeps the list from being empty
  const plan: DayPractice[] = content
    ? planForDay(content, day, { includeFood: settings.includeFood })
    : (run.snapshot?.practices ?? []).slice(0, 4).map((p) => ({ id: p.id, kind: 'practice', name: p.name, icon: p.icon, meta: p.time, slot: 'Morning', time: p.time }))
  const pDone = plan.filter((p) => done.practices.has(p.id)).length
  const bar = { n: pDone, total: plan.length, key: 'practicesOf' }
  const name = index?.name ?? run.snapshot?.name ?? ''
  const quick: [string, string, () => void][] = [
    ['headphones', t('ondas.immerse'), () => push({ name: 'immersion' })],
    ['notebook', t('ondas.journal'), () => push({ name: 'journal' })],
    ['lightbulb', t('ondas.philosophy'), () => push({ name: 'philosophy' })],
    ['scales', t('ondas.rules'), () => push({ name: 'rules' })],
  ]

  return (
    <Screen variant="root">
      <div style={look.vars} data-onda={themed ? run.ondaId : undefined}>
      {header}
      {themed && <OrnDivider look={look} />}
      <div>
        <button type="button" className={`${o.banner} ${o.themed}`} onClick={() => push({ name: 'guide', ondaId: run.ondaId })} aria-label={`${t('ondas.kicker', { label: t('ondas.dayOf', { day, length: run.lengthDays }) })}, ${name}. ${t('ondas.guide')}`}>
          <span className={o.bannerKicker}>
            <Icon name={index?.icon ?? 'sparkle'} weight="fill" size={16} />
            <span>{t('ondas.kicker', { label: t('ondas.dayOf', { day, length: run.lengthDays }) })}</span>
          </span>
          <span className={o.bannerName} style={{ display: 'block', fontSize: nameSize(look, name, 84, 30, 18) }}>{name}</span>
          <DayBar day={day} length={run.lengthDays} />
        </button>

        <div className={o.quick}>
          {quick.map(([icon, label, go]) => (
            <button key={label} type="button" className={o.quickTile} onClick={go}>
              <span className={`${s.circle} ${o.quickCircle} ${o.solidCircle}`}>
                <Icon name={icon} weight="regular" size={29} />
              </span>
              <span style={{ fontSize: fitSize(label, 78, 14, 11) }}>{label}</span>
            </button>
          ))}
        </div>

        <div className={o.todayHead}>
          <div className={s.todayRow}>
            <h2 className={o.todayH}>{t('ondas.today')}</h2>
            <span className={s.sub}>{t(`ondas.${bar.key}`, { done: bar.n, total: bar.total })}</span>
          </div>
          <div className={o.todayBar} style={{ marginTop: 18 }}>
            <ProgressBar value={bar.total ? bar.n / bar.total : 0} tone="var(--onda-strong)" height={8} label={t(`ondas.${bar.key}`, { done: bar.n, total: bar.total })} />
          </div>
        </div>
        <div className={s.stack14} style={{ paddingTop: 18 }}>
          <PlanList plan={plan} done={done.practices} onToggle={(id) => togglePractice(run.id, id)} runId={run.id} info={{ ondaId: run.ondaId, style: look.vars, onda: themed ? run.ondaId : undefined }} />
          {plan.length > 0 && <div className={o.holdHint}>{t('onda.holdHint')}</div>}
        </div>
      </div>
      </div>
    </Screen>
  )
}

/** One Onda as a themed tile, used by Browse Ondas and the Gallery picker. */
export function OndaTile({ x, onOpen, active }: { x: ReturnType<typeof useOndaList>[number]; onOpen: () => void; active?: boolean }) {
  const { t } = useTranslation()
  const look = useLookFn()(x)
  return (
    <button type="button" className={`${o.ondaTile} ${o.themed}`} style={look.vars} onClick={onOpen}>
      <span className={o.ondaTileTop}>
        <span className={`${s.circle} ${o.ondaTileIcon} ${o.chipCircle}`}>
          <Icon name={x.icon} weight="fill" size={20} />
        </span>
        {active ? <span className={o.badge}>{t('ondas.active')}</span> : x.custom ? <span className={o.badge}>{t('ondas.mine')}</span> : null}
      </span>
      <span>
        <span className={o.ondaTileName} style={{ display: 'block', fontSize: fitSize(x.name, columnWidth() / 2 - 58, 22, 13, look.caps) }}>{x.name}</span>
        <span className={o.ondaTileOrigin} style={{ display: 'block' }}>{x.origin}</span>
      </span>
    </button>
  )
}

/** The four groups (religions, philosophies, states, cultures) with a toggle each, then the user's own Ondas.
 *  Browse Ondas also lists the worlds that are on the way; a picker shows only what exists. */
export function OndaGroups({ onOpen, soon }: { onOpen: (id: string) => void; soon?: boolean }) {
  const { t } = useTranslation()
  const list = useOndaList()
  const activeId = useActiveOnda()?.run.ondaId
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const toggle = (k: string) => () => setClosed((c) => ({ ...c, [k]: !c[k] }))
  const mine = list.filter((x) => !GROUP_OF[x.id])
  const shipped = new Set(list.map((x) => x.id))
  const sections = [
    ...BROWSE_GROUPS.map((g) => ({ key: g, title: t(`browse.${g}`), real: list.filter((x) => GROUP_OF[x.id] === g), soon: soon ? COMING_SOON.filter((c) => c.group === g && !shipped.has(c.id)) : [] })),
    ...(mine.length ? [{ key: 'mine', title: t('browse.mine'), real: mine, soon: [] as typeof COMING_SOON }] : []),
  ].filter((sec) => sec.real.length + sec.soon.length > 0)
  return (
    <>
      {sections.map((sec) => (
        <section key={sec.key} aria-label={sec.title} className={o.browseSec}>
          <SectionToggle title={sec.title} meta={sec.real.length + sec.soon.length} open={!closed[sec.key]} onToggle={toggle(sec.key)} />
          {!closed[sec.key] && (
            <div className={s.grid2}>
              {sec.real.map((x) => (
                <OndaTile key={x.id} x={x} active={activeId === x.id} onOpen={() => onOpen(x.id)} />
              ))}
              {sec.soon.map((c) => (
                <div key={c.name} className={o.soonTile} aria-disabled="true">
                  <span className={o.soonName}>{c.name}</span>
                  <span className={o.soonOrigin}>{c.origin}</span>
                  <span className={o.soonBadge}>{t('browse.soon')}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </>
  )
}

/** Browse Ondas: every Onda by group, with greyed placeholders for the ones still to come. */
export function AllOndas() {
  const { t } = useTranslation()
  const push = useNav((n) => n.push)
  return (
    <Screen chrome={<BackButton />}>
      <div className={s.pageHead} style={{ paddingBottom: 8 }}>
        <h1 className={s.largeTitle}>{t('ondas.allTitle')}</h1>
        <div className={`${s.sub} ${s.sub2}`}>{t('ondas.allSub')}</div>
      </div>
      <OndaGroups soon onOpen={(id) => push({ name: 'onda', id })} />
    </Screen>
  )
}
