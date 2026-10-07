import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { mediaFor, type MediaItem } from '@/content'
import { pickForDay, runDay } from '@/data/derive/onda'
import { useActiveRun, useLook, useOnda, useOndaIndex, useSettings } from '@/data/hooks'
import { useStore } from '@/data/store'
import { haptic } from '@/lib/haptics'
import { detId } from '@/lib/ids'
import { BackButton, BottomNote, ChromeTitle, Screen } from '@/nav/Screen'
import { useNav, type StackEntry } from '@/nav/store'
import { Button, GlassButton } from '@/ui/buttons'
import { Stepper } from '@/ui/controls'
import { Icon } from '@/ui/Icon'
import { SectionToggle } from '@/ui/lists'
import { KindArt } from './KindArt'
import { DayBar, PracticeRow, RulesList, TasksList, guardBeginOnda, nameSize, useRunToday } from './ondaShared'
import o from './ondas.module.css'
import s from './screens.module.css'

const TODAY_KINDS = ['read', 'listen', 'watch', 'eat', 'words'] as const

/** An Onda's Today page. The same layout serves a running Onda and the preview of one not yet begun:
 *  in preview everything is interactive but nothing is saved, run-only links are hidden, and Begin Onda sits at the bottom. */
export default function OndaToday({ entry }: { entry: Extract<StackEntry, { name: 'onda' }> }) {
  const { t } = useTranslation()
  const { push, pop, openSheet, openMenu, showToast } = useNav()
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
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const dots = useRef<HTMLDivElement>(null)

  const day = run ? runDay(run, today) : 1
  const length = run?.lengthDays ?? len
  const media = useMemo(() => (content ? mediaFor(content, { includeFood: settings.includeFood }) : []), [content, settings.includeFood])

  if (!index || !content) {
    return (
      <Screen chrome={<BackButton />}>
        <div className={s.empty}>
          <div className={s.sub}>{t('onda.loading')}</div>
        </div>
      </Screen>
    )
  }

  const st = useStore.getState()
  const pSet = live ? runDone.practices : new Set(Object.keys(pv).filter((k) => pv[k]))
  const rSet = live ? runDone.rules : pSet
  const tSet = live ? runDone.tasks : pSet
  const flip = (id: string) => setPv((x) => ({ ...x, [id]: !x[id] }))
  const toggle = { open: (k: string) => !closed[k], flip: (k: string) => () => setClosed((c) => ({ ...c, [k]: !c[k] })) }

  const quote = content.quotes.length ? pickForDay([...(content.quote ? [content.quote] : []), ...content.quotes], day) : content.quote
  const word = pickForDay(content.words, day)
  const phil = pickForDay(content.philosophy, day)
  const theme = content.dayThemes[day - 1] ?? phil?.title ?? ''
  const prompt = pickForDay(content.journal, day) ?? ''
  const think = [
    phil && { kind: t('onda.kindPhilosophy'), ...phil },
    pickForDay(content.ethics, day) && { kind: t('onda.kindEthics'), ...pickForDay(content.ethics, day)! },
    pickForDay(content.philosophy, day + 1) && { kind: t('onda.kindPhilosophy'), ...pickForDay(content.philosophy, day + 1)! },
    pickForDay(content.ethics, day + 1) && { kind: t('onda.kindEthics'), ...pickForDay(content.ethics, day + 1)! },
  ].filter((v, i, a): v is NonNullable<typeof v> => !!v && a.findIndex((w) => w && w.title === v.title) === i)
  const mediaToday = TODAY_KINDS.map((k) => pickForDay(media.filter((m) => m.kind === k), day)).filter((m): m is MediaItem => !!m)
  const written = run ? journal.some((j) => j.id === detId('journal', run.id, day) && !j.deletedAt) : false
  const pCount = content.practices.filter((p) => pSet.has(p.id)).length
  const rCount = content.rules.filter((r) => rSet.has(r.id)).length

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

  return (
    <Screen
      variant={live ? 'page' : 'cta'}
      dataOnda={settings.ondaThemes ? index.id : undefined}
      style={{ ...look.vars, paddingTop: 'calc(var(--chrome-top) + 56px)' }}
      chrome={
        <>
          <BackButton />
          <ChromeTitle>{live ? t('ondas.dayOf', { day, length }) : t('common.days', { count: len })}</ChromeTitle>
          <div ref={dots}>
            <GlassButton icon="dots-three" ariaLabel={t('a11y.more')} onClick={menu} />
          </div>
        </>
      }
      bottom={
        live ? undefined : (
          <>
            {active && <BottomNote>{t('onda.endsNote', { name: active.snapshot?.name ?? '' })}</BottomNote>}
            <Button fullWidth onClick={begin}>
              {t('onda.begin')}
            </Button>
          </>
        )
      }
    >
      <div className={o.odHead}>
        <div className={o.odTitleRow}>
          <div className={`${s.circle} ${o.odIcon} ${o.solidCircle}`}>
            <Icon name={index.icon} weight="fill" size={30} />
          </div>
          <h1 className={o.odName} style={{ fontSize: nameSize(look, index.name, 40 + 70 + 14 + 8, 38, 20) }}>{index.name}</h1>
        </div>
        {theme && <div className={o.odTheme}>{t('onda.todayTheme', { theme })}</div>}
        <DayBar day={day} length={length} strong />
      </div>

      {!live && (
        <div className={`${s.card} ${s.inlineRow}`} style={{ marginTop: 20 }}>
          <span style={{ whiteSpace: 'nowrap' }}>{t('onda.length', { count: len })}</span>
          <Stepper onDecrement={() => setLen((n) => Math.max(7, n - 1))} onIncrement={() => setLen((n) => Math.min(30, n + 1))} decrementDisabled={len <= 7} incrementDisabled={len >= 30} />
        </div>
      )}
      {!live && content.sensitivity && (
        <div className={o.noteCard}>
          <div className={s.kicker}>{t('onda.sensitivity')}</div>
          <div className={o.noteText}>{content.sensitivity.note}</div>
        </div>
      )}

      {quote && (
        <figure className={`${o.quoteCard} ${o.themed}`}>
          <div className={s.kicker} style={{ color: 'inherit' }}>{t('onda.quoteOfDay')}</div>
          <div className={o.quoteMark} aria-hidden>“</div>
          <blockquote className={o.quoteText} data-selectable>{quote.text}</blockquote>
          <figcaption className={o.quoteBy}>
            <i aria-hidden />
            <span>
              {quote.by}
              {quote.source && <span className={o.quoteSrc}>, {quote.source}</span>}
            </span>
          </figcaption>
        </figure>
      )}

      {word && (
        <div className={o.wordCard}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className={s.kicker}>{t('onda.wordOfDay')}</div>
            <div className={o.wordTerm}>{word.term}</div>
            <div className={o.wordMeaning}>{word.meaning}</div>
            {word.pronunciation && <div className={o.wordSay}>{word.pronunciation}</div>}
          </div>
          <div className={`${s.circle} ${o.wordIcon} ${o.solidCircle}`}>
            <Icon name="translate" weight="fill" size={22} />
          </div>
        </div>
      )}

      <button type="button" className={`${o.guideCard} ${o.themed}`} onClick={openGuide}>
        <span className={o.guideRow}>
          <span className={`${s.circle} ${o.guideIcon} ${o.chipCircle}`}>
            <Icon name="book-open-text" weight="fill" size={22} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className={o.guideTitle} style={{ display: 'block' }}>{t('ondas.guide')}</span>
            <span className={o.guideSub} style={{ display: 'block' }}>{t('onda.guideSub')}</span>
          </span>
          <Icon name="caret-right" weight="bold" size={18} />
        </span>
      </button>

      <SectionToggle title={t('onda.practices')} meta={`${pCount}/${content.practices.length}`} open={toggle.open('p')} onToggle={toggle.flip('p')} />
      {toggle.open('p') && (
        <div className={s.stack10} style={{ padding: '0 16px' }}>
          {content.practices.map((p) => (
            <PracticeRow key={p.id} small p={p} done={pSet.has(p.id)} onToggle={() => (run ? st.togglePractice(run.id, p.id) : flip(p.id))} />
          ))}
        </div>
      )}

      {content.rules.length > 0 && (
        <>
          <SectionToggle title={t('onda.rules')} meta={`${rCount}/${content.rules.length}`} open={toggle.open('r')} onToggle={toggle.flip('r')} />
          {toggle.open('r') && <RulesList rules={content.rules} done={rSet} onToggle={(id) => (run ? st.toggleItem('ruleLogs', run.id, id) : flip(id))} />}
        </>
      )}

      {content.tasks.length > 0 && (
        <>
          <SectionToggle title={t('onda.tasks')} open={toggle.open('t')} onToggle={toggle.flip('t')} />
          {toggle.open('t') && <TasksList tasks={content.tasks} done={tSet} go={!!run} onToggle={(id) => (run ? st.toggleItem('taskLogs', run.id, id) : flip(id))} />}
        </>
      )}

      {mediaToday.length > 0 && (
        <>
          <SectionToggle
            title={t('onda.immerse')}
            open={toggle.open('i')}
            onToggle={toggle.flip('i')}
            action={live ? { label: t('onda.seeAll'), onClick: () => push({ name: 'immersion' }) } : undefined}
          />
          {toggle.open('i') && (
            <div className={`hscroll ${o.mediaScroll}`}>
              {mediaToday.map((m) => (
                <button key={m.id} type="button" className={o.mediaItem} onClick={() => openSheet({ name: 'mediaInfo', item: m, ondaId: index.id, runId: run?.id })}>
                  <span className={`${o.mediaTile} ${o.themed}`}>
                    <span className={o.mediaKind}>{t(`kindLabel.${m.kind}`)}</span>
                    <KindArt kind={m.kind} className={o.mediaArt} />
                  </span>
                  <span className={o.mediaTitle} style={{ display: 'block' }}>{m.title}</span>
                  <span className={o.mediaMeta} style={{ display: 'block' }}>{m.meta}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {think.length > 0 && (
        <>
          <SectionToggle title={t('onda.thinkAbout')} open={toggle.open('k')} onToggle={toggle.flip('k')} />
          {toggle.open('k') && (
            <div className={`hscroll ${o.thinkScroll}`}>
              {think.map((x) => (
                <article key={x.title} className={o.thinkCard}>
                  <div className={s.kicker} style={{ letterSpacing: '.06em' }}>{x.kind}</div>
                  <h3 className={o.thinkTitle} style={{ margin: '6px 0 0' }}>{x.title}</h3>
                  <p className={o.thinkText} style={{ marginBottom: 0 }}>{x.text}</p>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      <div className={o.journalCard}>
        <div className={s.kicker}>{t('onda.journalDay', { day })}</div>
        <div className={o.journalPrompt}>{prompt}</div>
        {live && (
          <>
            <div style={{ marginTop: 16 }}>
              <Button variant="secondary" size="md" icon={written ? 'check' : 'pencil-simple'} onClick={() => openSheet({ name: 'journalEdit' })}>
                {written ? t('onda.editEntry') : t('onda.write')}
              </Button>
            </div>
            <button type="button" className={o.reflRow} onClick={() => push({ name: 'reflection' })}>
              <Icon name="notebook" size={22} />
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', font: '400 var(--fs-17) var(--font-sans)' }}>{t('onda.finalReflection')}</span>
                <span className={s.statL} style={{ display: 'block' }}>{day >= length ? t('onda.reflectionOpen') : t('onda.reflectionDay', { day: length })}</span>
              </span>
              <Icon name="caret-right" weight="bold" size={18} color="var(--label-quaternary)" />
            </button>
          </>
        )}
      </div>
    </Screen>
  )
}
