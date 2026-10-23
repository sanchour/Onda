import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { mediaFor, type MediaItem } from '@/content'
import { pickForDay, runDay } from '@/data/derive/onda'
import { planForDay } from '@/data/derive/plan'
import { useActiveRun, useLook, useOnda, useOndaIndex, useSettings } from '@/data/hooks'
import { useStore } from '@/data/store'
import { haptic } from '@/lib/haptics'
import { detId } from '@/lib/ids'
import { BackButton, ChromeTitle, Screen } from '@/nav/Screen'
import { useNav, type StackEntry } from '@/nav/store'
import { KindArt } from '@/screens/KindArt'
import { guardBeginOnda, useRunToday } from '@/screens/ondaShared'
import { GlassButton } from '@/ui/buttons'
import { Icon } from '@/ui/Icon'
import { DayScroller } from '@/ui/pickers'
import h from './home.module.css'
import { DayPlan, Hero, Panel, ProgressPanel, QuotePanel, RulesGrid, Section, WordPanel, dayContent } from './parts'

const TODAY_KINDS = ['read', 'listen', 'watch', 'eat', 'words'] as const

/* An Onda's page on the desktop: its cover across the stage, the day's content in a main column, and what belongs
   beside it (beginning, the quote, the word, the journal, the guide) in a side column. The same page serves the running
   Onda and the preview of one not yet begun; in preview everything is interactive but nothing is saved, as on the
   phone (screens/OndaToday.tsx), whose derivations and actions this follows line for line. */
export default function DeskOnda({ entry }: { entry: Extract<StackEntry, { name: 'onda' }> }) {
  const { t } = useTranslation()
  const push = useNav((n) => n.push)
  const pop = useNav((n) => n.pop)
  const openSheet = useNav((n) => n.openSheet)
  const openMenu = useNav((n) => n.openMenu)
  const showToast = useNav((n) => n.showToast)
  const settings = useSettings()
  const today = useStore((x) => x.today)
  const active = useActiveRun()
  const journal = useStore((x) => x.journal)
  const index = useOndaIndex(entry.id)
  const content = useOnda(entry.id)
  const look = useLook(index)
  const run = active?.ondaId === entry.id ? active : undefined
  const live = !!run
  const runDone = useRunToday(run?.id)
  const [len, setLen] = useState(entry.length ?? settings.defaultOndaLength)
  const [pv, setPv] = useState<Record<string, boolean>>({}) // preview-only ticks
  const [more, setMore] = useState<string | null>(null) // the Think about idea shown in full
  const dots = useRef<HTMLDivElement>(null)

  const day = run ? runDay(run, today) : 1
  const length = run?.lengthDays ?? len
  const media = useMemo(() => (content ? mediaFor(content, { includeFood: settings.includeFood }) : []), [content, settings.includeFood])

  if (!index || !content) {
    return (
      <Screen chrome={<BackButton />}>
        <div className={h.noteText} style={{ textAlign: 'center', paddingTop: 80 }}>{t('onda.loading')}</div>
      </Screen>
    )
  }

  const st = useStore.getState()
  const pSet = live ? runDone.practices : new Set(Object.keys(pv).filter((k) => pv[k]))
  const rSet = live ? runDone.rules : pSet
  const flip = (id: string) => setPv((x) => ({ ...x, [id]: !x[id] }))
  const { quote, word, theme, prompt, think } = dayContent(content, day)
  const mediaToday = TODAY_KINDS.map((k) => pickForDay(media.filter((m) => m.kind === k), day)).filter((m): m is MediaItem => !!m)
  const written = run ? journal.some((j) => j.id === detId('journal', run.id, day) && !j.deletedAt) : false
  const plan = planForDay(content, day, { includeFood: settings.includeFood })
  const pCount = plan.filter((p) => pSet.has(p.id)).length
  const rCount = content.rules.filter((r) => rSet.has(r.id)).length
  const themed = settings.ondaThemes
  const left = length - day

  const begin = () => {
    if (!guardBeginOnda(t, content.id)) return
    haptic('success')
    st.beginOnda(content, len)
  }
  const openGuide = () => push({ name: 'guide', ondaId: content.id })
  const menu = () => {
    const r = dots.current?.getBoundingClientRect()
    if (!r) return
    openMenu({
      anchor: r,
      align: 'end',
      items: live
        ? [
            { label: t('onda.menuImmersion'), icon: 'headphones', onClick: () => push({ name: 'immersion' }) },
            { label: t('onda.menuGuide'), icon: 'book-open-text', onClick: openGuide },
            { label: t('onda.menuReflection'), icon: 'notebook', divider: true, onClick: () => push({ name: 'reflection' }) },
            { label: t('onda.menuEnd'), icon: 'x-circle', destructive: true, onClick: () => { st.endOnda(run!.id); showToast(t('onda.ended', { name: content.name }), { icon: 'stop-circle' }); pop() } },
          ]
        : [{ label: t('onda.menuGuide'), icon: 'book-open-text', onClick: openGuide }],
    })
  }

  const beginBtn = (
    <button type="button" className={`${h.pill} ${h.pillSolid}`} onClick={begin}>
      {t('onda.begin')}
      <Icon name="arrow-right" weight="bold" size={16} />
    </button>
  )

  return (
    <Screen
      variant="bare"
      style={{ padding: 0 }}
      chrome={
        <>
          <BackButton />
          <ChromeTitle after={300}>{index.name}</ChromeTitle>
          <div ref={dots}>
            <GlassButton icon="dots-three" ariaLabel={t('a11y.more')} onClick={menu} />
          </div>
        </>
      }
    >
      <div className={h.page} style={look.vars} data-onda={themed ? index.id : undefined} data-chrome="">
        <Hero
          look={look}
          title={index.name}
          glyph={look.themed ? look.glyph : undefined}
          sub={index.origin}
          lede={theme ? t('onda.todayTheme', { theme }) : undefined}
          mark={look.numeral(day)}
          day={day}
          length={length}
          foot={live ? [t('ondas.dayOf', { day, length }), left > 0 ? t('deskHome.daysLeft', { count: left }) : t('deskHome.lastDay')] : [t('onda.length', { count: len })]}
          actions={live ? undefined : beginBtn}
        />

        <div className={h.wrap}>
          <div className={h.main}>
            {!live && (
              <Section title={t('onda.practices')} meta={`${pCount}/${plan.length}`} id="dko-practices">
                <DayPlan plan={plan} done={pSet} onToggle={flip} scope={{ look, ondaId: index.id, content, onda: themed ? index.id : undefined }} />
                <p className={h.hint}>{t('deskHome.hint')}</p>
              </Section>
            )}

            {!live && content.rules.length > 0 && (
              <Section title={t('onda.rules')} meta={`${rCount}/${content.rules.length}`} id="dko-rules">
                <RulesGrid rules={content.rules} done={rSet} numeral={look.numeral} onToggle={flip} />
              </Section>
            )}

            {mediaToday.length > 0 && (
              <Section
                title={t('onda.immerse')}
                id="dko-immerse"
                meta={live ? (
                  <button type="button" className={h.link} onClick={() => push({ name: 'immersion' })}>
                    {t('onda.seeAll')}
                    <Icon name="caret-right" weight="bold" size={12} />
                  </button>
                ) : undefined}
              >
                <div className={h.media}>
                  {mediaToday.map((m) => (
                    <button key={m.id} type="button" className={h.mediaCard} onClick={() => openSheet({ name: 'mediaInfo', item: m, ondaId: index.id, runId: undefined })}>
                      <span className={h.mediaArt} aria-hidden><KindArt kind={m.kind} /></span>
                      <span className={h.mediaText}>
                        <span className={h.kick}>{t(`kindLabel.${m.kind}`)}</span>
                        <span className={h.mediaTitle}>{m.title}</span>
                        {m.meta && <span className={h.mediaMeta}>{m.meta}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </Section>
            )}

            {think.length > 0 && (
              <Section title={t('onda.thinkAbout')} id="dko-think">
                <div className={h.ideas}>
                  {think.map((x) => {
                    const open = more === x.title
                    return (
                      <button key={x.title} type="button" className={h.idea} aria-expanded={open} onClick={() => setMore((m) => (m === x.title ? null : x.title))}>
                        <span className={h.ideaKick}>
                          <Icon name={x.kind === 'ethics' ? 'scales' : 'lightbulb'} size={18} />
                          <span className={h.kick}>{x.kind === 'ethics' ? t('onda.kindEthics') : t('onda.kindPhilosophy')}</span>
                        </span>
                        <span className={h.ideaTitle}>{x.title}</span>
                        <span className={open ? h.ideaText : `${h.ideaText} ${h.clamp4}`}>{x.text}</span>
                      </button>
                    )
                  })}
                </div>
              </Section>
            )}
          </div>

          <aside className={h.side} aria-label={t('deskHome.aside')}>
            {!live && (
              <Panel kicker={t('onda.begin')}>
                <div className={h.lenRow}>
                  <span style={{ whiteSpace: 'nowrap' }}>{t('onda.length', { count: len })}</span>
                  <DayScroller value={len} min={7} max={30} onChange={setLen} ariaLabel={t('common.lengthLabel')} />
                </div>
                <button type="button" className={`${h.btn} ${h.btnWide}`} onClick={begin}>
                  {t('onda.begin')}
                </button>
                {active && <p className={h.note}>{t('onda.endsNote', { name: active.snapshot?.name ?? '' })}</p>}
              </Panel>
            )}
            {!live && content.sensitivity && (
              <Panel kicker={t('onda.sensitivity')}>
                <p className={h.noteText}>{content.sensitivity.note}</p>
              </Panel>
            )}
            {live && <ProgressPanel look={look} plan={plan} done={pSet} rules={{ kept: rCount, total: content.rules.length }} />}
            {prompt && (
              <Panel kicker={t('onda.journalDay', { day })}>
                <p className={h.prompt} data-selectable>{prompt}</p>
                {live && (
                  <div className={h.panelBtns}>
                    <button type="button" className={written ? h.btnSoft : h.btn} onClick={() => push({ name: 'journalWrite' })}>
                      <Icon name={written ? 'check' : 'pencil-simple'} weight="bold" size={16} />
                      {written ? t('onda.editEntry') : t('onda.write')}
                    </button>
                    <button type="button" className={h.btnSoft} onClick={() => push({ name: 'reflection' })}>
                      <Icon name="notebook" size={16} />
                      {t('onda.finalReflection')}
                    </button>
                  </div>
                )}
                {live && <p className={h.note}>{day >= length ? t('onda.reflectionOpen') : t('deskHome.reflectionOn', { day: length })}</p>}
              </Panel>
            )}
            {quote && <QuotePanel look={look} quote={quote} />}
            {word && <WordPanel word={word} />}
            <Panel kicker={t('ondas.guide')}>
              <p className={h.noteText}>{t('onda.guideSub')}</p>
              <div className={h.panelBtns}>
                <button type="button" className={h.btnSoft} onClick={openGuide}>
                  <Icon name="book-open-text" size={16} />
                  {t('deskHome.openGuide')}
                </button>
              </div>
            </Panel>
          </aside>
        </div>
      </div>
    </Screen>
  )
}

