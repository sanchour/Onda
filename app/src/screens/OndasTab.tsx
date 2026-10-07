import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLookFn, useOndaList } from '@/data/hooks'
import { columnWidth, fitSize } from '@/lib/fit'
import { useStore } from '@/data/store'
import { BackButton, Screen } from '@/nav/Screen'
import { useNav } from '@/nav/store'
import { Button, GlassButton } from '@/ui/buttons'
import { SegmentedControl } from '@/ui/controls'
import { ProgressBar } from '@/ui/data'
import { Icon } from '@/ui/Icon'
import { DayBar, Glyph, PracticeRow, RulesList, TasksList, guardCreateOnda, nameSize, useActiveOnda, useRunToday } from './ondaShared'
import o from './ondas.module.css'
import s from './screens.module.css'

type Seg = 'practices' | 'rules' | 'tasks'

/** Ondas tab: the running Onda's banner, four shortcuts, then Today with one list at a time. */
export default function OndasTab() {
  const { t } = useTranslation()
  const { push, openSheet } = useNav()
  const active = useActiveOnda()
  const done = useRunToday(active?.run.id)
  const [seg, setSeg] = useState<Seg>('practices')
  const { togglePractice, toggleItem } = useStore.getState()

  const header = (
    <div className={s.titleRow}>
      <h1 className={s.largeTitle}>{t('ondas.title')}</h1>
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
  const practices = content?.practices ?? run.snapshot?.practices.map((p) => ({ ...p, meta: p.time })) ?? []
  const pDone = practices.filter((p) => done.practices.has(p.id)).length
  const name = index?.name ?? run.snapshot?.name ?? ''
  const quick: [string, string, () => void][] = [
    ['headphones', t('ondas.immerse'), () => push({ name: 'immersion' })],
    ['notebook', t('ondas.journal'), () => openSheet({ name: 'journalList' })],
    ['lightbulb', t('ondas.philosophy'), () => openSheet({ name: 'philosophy' })],
    ['book-open-text', t('ondas.guide'), () => openSheet({ name: 'guide', ondaId: run.ondaId })],
  ]

  return (
    <Screen variant="root">
      {header}
      <div style={look.vars}>
        <button type="button" className={`${o.banner} ${o.themed}`} onClick={() => push({ name: 'onda', id: run.ondaId })}>
          <Glyph look={look} opacity={0.16} right={16} top={8} />
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
                <Icon name={icon} weight="fill" size={22} />
              </span>
              <span style={{ fontSize: fitSize(label, 74, 13, 11) }}>{label}</span>
            </button>
          ))}
        </div>

        <div className={o.todayHead}>
          <div className={s.todayRow}>
            <h2 className={o.todayH}>{t('ondas.today')}</h2>
            <span className={s.sub}>{t('ondas.practicesOf', { done: pDone, total: practices.length })}</span>
          </div>
          <ProgressBar value={practices.length ? pDone / practices.length : 0} tone="var(--onda-strong)" height={8} style={{ marginTop: 18 }} label={t('ondas.today')} />
        </div>
        <div style={{ padding: '16px 16px 0' }}>
          <SegmentedControl<Seg>
            options={[{ value: 'practices', label: t('ondas.practices') }, { value: 'rules', label: t('ondas.rules') }, { value: 'tasks', label: t('ondas.tasks') }]}
            value={seg}
            onChange={setSeg}
            fullWidth
            ariaLabel={t('ondas.today')}
          />
        </div>
        <div style={{ paddingTop: 14 }}>
          {seg === 'practices' && (
            <div className={s.stack14}>
              {practices.map((p) => (
                <PracticeRow key={p.id} p={p} done={done.practices.has(p.id)} onToggle={() => togglePractice(run.id, p.id)} />
              ))}
            </div>
          )}
          {seg === 'rules' && <RulesList rules={content?.rules ?? run.snapshot?.rules ?? []} done={done.rules} onToggle={(id) => toggleItem('ruleLogs', run.id, id)} />}
          {seg === 'tasks' && <TasksList tasks={content?.tasks ?? []} done={done.tasks} onToggle={(id) => toggleItem('taskLogs', run.id, id)} />}
        </div>
      </div>
    </Screen>
  )
}

/** All Ondas: two-column grid of themed tiles, the user's own Ondas last. */
export function AllOndas() {
  const { t } = useTranslation()
  const push = useNav((n) => n.push)
  const list = useOndaList()
  const look = useLookFn()
  const activeId = useActiveOnda()?.run.ondaId
  return (
    <Screen chrome={<BackButton />}>
      <div className={s.pageHead} style={{ paddingBottom: 16 }}>
        <h1 className={s.largeTitle}>{t('ondas.allTitle')}</h1>
        <div className={`${s.sub} ${s.sub2}`}>{t('ondas.allSub')}</div>
      </div>
      <div className={s.grid2}>
        {list.map((x) => (
          <button key={x.id} type="button" className={`${o.ondaTile} ${o.themed}`} style={look(x).vars} onClick={() => push({ name: 'onda', id: x.id })}>
            <span className={o.ondaTileTop}>
              <span className={`${s.circle} ${o.ondaTileIcon} ${o.chipCircle}`}>
                <Icon name={x.icon} weight="fill" size={20} />
              </span>
              {activeId === x.id ? <span className={o.badge}>{t('ondas.active')}</span> : x.custom ? <span className={o.badge}>{t('ondas.mine')}</span> : null}
            </span>
            <span>
              <span className={o.ondaTileName} style={{ display: 'block', fontSize: fitSize(x.name, columnWidth() / 2 - 58, 22, 13, look(x).caps) }}>{x.name}</span>
              <span className={o.ondaTileOrigin} style={{ display: 'block' }}>{x.origin}</span>
            </span>
          </button>
        ))}
      </div>
    </Screen>
  )
}
