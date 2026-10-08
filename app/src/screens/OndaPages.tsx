import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/data/hooks'
import { useStore } from '@/data/store'
import { haptic } from '@/lib/haptics'
import { BackButton, ChromeSpacer, ChromeTitle, Screen } from '@/nav/Screen'
import { useNav } from '@/nav/store'
import { Deck } from '@/sheets/guideParts'
import g from '@/sheets/guide.module.css'
import { Button, GlassButton } from '@/ui/buttons'
import { SegmentedControl } from '@/ui/controls'
import { Icon } from '@/ui/Icon'
import { OrnamentIcon } from './KindArt'
import { OndaBanner, useActiveOnda } from './ondaShared'
import o from './ondas.module.css'
import s from './screens.module.css'

/** Shared frame for the three full-screen pages that used to be sheets: back button, title, Onda look. */
function OndaPage({ title, trailing, children }: { title: string; trailing?: React.ReactNode; children: React.ReactNode }) {
  const active = useActiveOnda()
  const themed = useSettings().ondaThemes
  return (
    <Screen
      variant="page"
      style={active?.look.vars}
      dataOnda={themed ? active?.run.ondaId : undefined}
      chrome={
        <>
          <BackButton />
          <ChromeTitle>{title}</ChromeTitle>
          {trailing ?? <ChromeSpacer />}
        </>
      }
    >
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
    <OndaPage title={t('journal.title')} trailing={<GlassButton icon="plus" prominent ariaLabel={t('a11y.newEntry')} onClick={() => write()} />}>
      <div style={{ padding: '4px 16px 24px' }}>
        {active?.look && (
          <div style={{ marginBottom: 16 }}>
            <OndaBanner look={active.look} icon="notebook" kicker={name} title={t('journal.title')} sub={t('journal.count', { count: entries.length })} />
          </div>
        )}
        <Button fullWidth icon="pencil-simple" onClick={() => write()}>
          {t('journal.newEntry')}
        </Button>
        <div className={s.stack12} style={{ marginTop: 20 }}>
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

/* ── Philosophy: a deck of idea cards, each with something to try ── */
export function PhilosophyPage() {
  const { t } = useTranslation()
  const active = useActiveOnda()
  const c = active?.content
  const look = active?.look
  const sets = { ideas: c?.philosophy ?? [], ethics: c?.ethics ?? [] }
  const available = (['ideas', 'ethics'] as const).filter((k) => sets[k].length > 0)
  const [part, setPart] = useState<'ideas' | 'ethics'>('ideas')
  const [at, setAt] = useState(0)
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const shown = sets[available.includes(part) ? part : (available[0] ?? 'ideas')]
  const key = (i: number) => `${part}:${i}`
  const pickedCount = Object.values(picked).filter(Boolean).length

  const choose = (v: 'ideas' | 'ethics') => {
    setPart(v)
    setAt(0)
  }

  return (
    <OndaPage title={t('philosophy.title')}>
      <div style={{ padding: '4px 16px 24px' }}>
        {look && <OndaBanner look={look} icon="lightbulb" kicker={active?.index?.name} title={t('philosophy.title')} sub={t('philosophy.lead')} />}
        {available.length > 1 && (
          <div style={{ marginTop: 16 }}>
            <SegmentedControl<'ideas' | 'ethics'>
              options={[{ value: 'ideas', label: t('philosophy.think') }, { value: 'ethics', label: t('philosophy.ethicsTab') }]}
              value={part}
              onChange={choose}
              fullWidth
              ariaLabel={t('philosophy.title')}
            />
          </div>
        )}
        <div style={{ marginTop: 18 }}>
          {look && shown.length > 0 && (
            <Deck
              label={t(part === 'ideas' ? 'philosophy.think' : 'philosophy.ethics')}
              index={at}
              onIndex={setAt}
              slides={shown.map((x, i) => (
                <article key={x.title} className={`${g.phCard} ${o.themed}`}>
                  <div className={g.phTop}>
                    <span className={g.phNum} aria-hidden>{look.numeral(i + 1)}</span>
                    <span className={g.phOrn}><OrnamentIcon name={look.ornament} size={28} /></span>
                  </div>
                  <h3 className={g.phTitle}>{x.title}</h3>
                  <p className={g.phText} data-selectable>{x.text}</p>
                  {x.practice && (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={!!picked[key(i)]}
                      className={picked[key(i)] ? `${g.phTry} ${g.phTryOn}` : g.phTry}
                      onClick={() => {
                        haptic(picked[key(i)] ? 'select' : 'success')
                        setPicked((p) => ({ ...p, [key(i)]: !p[key(i)] }))
                      }}
                    >
                      <span className={g.phTryBox} aria-hidden>{picked[key(i)] && <Icon name="check" weight="bold" size={15} />}</span>
                      <span className={g.phTryText}>
                        <b>{picked[key(i)] ? t('philosophy.onList') : t('philosophy.tryThis')}</b>
                        {x.practice}
                      </span>
                    </button>
                  )}
                </article>
              ))}
            />
          )}
        </div>
        {shown.length > 1 && look && (
          <div className={g.jump} role="group" aria-label={t('philosophy.all')}>
            {shown.map((x, i) => (
              <button key={x.title} type="button" className={i === at ? `${g.jumpBtn} ${g.jumpOn}` : g.jumpBtn} onClick={() => setAt(i)}>
                <span className={g.jumpNum}>{look.numeral(i + 1)}</span>
                <span>{x.title}</span>
              </button>
            ))}
          </div>
        )}
        {pickedCount > 0 && <div className={g.picked}>{t('philosophy.pickedCount', { count: pickedCount })}</div>}
      </div>
    </OndaPage>
  )
}

/* ── Rules: the Onda's rules to read and live by. Nothing to tick here. ── */
export function RulesPage() {
  const { t } = useTranslation()
  const active = useActiveOnda()
  const look = active?.look
  const rules = active?.content?.rules ?? active?.run.snapshot?.rules.map((r) => ({ ...r, why: '' })) ?? []
  return (
    <OndaPage title={t('ondas.rules')}>
      <div style={{ padding: '4px 16px 24px' }}>
        {look && <OndaBanner look={look} icon="scales" kicker={active?.index?.name} title={t('ondas.rules')} sub={t('rulesPage.lead', { count: rules.length })} />}
        <ol className={o.rulesPage}>
          {rules.map((r, i) => (
            <li key={r.id} className={o.rulesItem}>
              <span className={o.rulesNum} aria-hidden>{look ? look.numeral(i + 1) : i + 1}</span>
              <span className={o.ruleBody}>
                <span className={o.ruleText}>{r.text}</span>
                {r.why && <span className={o.ruleWhy}>{r.why}</span>}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </OndaPage>
  )
}
