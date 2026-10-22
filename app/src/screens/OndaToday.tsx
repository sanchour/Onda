import { Suspense, lazy, useMemo, useRef, useState } from 'react'
import { useDesk } from '@/lib/desk'
import { useTranslation } from 'react-i18next'
import { KIND_ICON, mediaFor, type MediaItem } from '@/content'
import { pickForDay, runDay } from '@/data/derive/onda'
import { planForDay } from '@/data/derive/plan'
import { useActiveRun, useLook, useOnda, useOndaIndex, useSettings } from '@/data/hooks'
import { useStore } from '@/data/store'
import { haptic } from '@/lib/haptics'
import { detId } from '@/lib/ids'
import { BackButton, BottomNote, ChromeTitle, Screen } from '@/nav/Screen'
import { useNav, type StackEntry } from '@/nav/store'
import { Button, GlassButton } from '@/ui/buttons'
import { DayScroller } from '@/ui/pickers'
import { OrnamentIcon } from './KindArt'
import { Cover, GroupedList, PlanList, QuoteBlock, Row, SectionHeader } from './onda7'
import c from './onda7/onda7.module.css'
import { RulesList, guardBeginOnda, useRunToday } from './ondaShared'
import s from './screens.module.css'

const TODAY_KINDS = ['read', 'listen', 'watch', 'eat', 'words'] as const

/** An Onda's page. The same layout serves a running Onda and the preview of one not yet begun:
 *  in preview everything is interactive but nothing is saved, run-only links are hidden, and Begin Onda sits at the bottom. */
// The desktop's two-column Onda page (src/desk/home); phones never load it.
const DeskOnda = lazy(() => import('@/desk/home/DeskOnda'))

export default function OndaToday({ entry }: { entry: Extract<StackEntry, { name: 'onda' }> }) {
  return useDesk() ? (
    <Suspense fallback={null}>
      <DeskOnda entry={entry} />
    </Suspense>
  ) : (
    <PhoneOndaToday entry={entry} />
  )
}

function PhoneOndaToday({ entry }: { entry: Extract<StackEntry, { name: 'onda' }> }) {
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
  const [more, setMore] = useState<string | null>(null) // the Think about idea shown in full
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
  const flip = (id: string) => setPv((x) => ({ ...x, [id]: !x[id] }))
  const open = (k: string) => !closed[k]
  const fold = (k: string) => () => setClosed((v) => ({ ...v, [k]: !v[k] }))

  const quote = content.quotes.length ? pickForDay([...(content.quote ? [content.quote] : []), ...content.quotes], day) : content.quote
  const word = pickForDay(content.words, day)
  const phil = pickForDay(content.philosophy, day)
  const theme = content.dayThemes[day - 1] ?? phil?.title ?? ''
  const prompt = pickForDay(content.journal, day) ?? ''
  const think = [
    phil && { kind: 'philosophy', ...phil },
    pickForDay(content.ethics, day) && { kind: 'ethics', ...pickForDay(content.ethics, day)! },
    pickForDay(content.philosophy, day + 1) && { kind: 'philosophy', ...pickForDay(content.philosophy, day + 1)! },
    pickForDay(content.ethics, day + 1) && { kind: 'ethics', ...pickForDay(content.ethics, day + 1)! },
  ].filter((v, i, a): v is NonNullable<typeof v> => !!v && a.findIndex((w) => w && w.title === v.title) === i)
  const mediaToday = TODAY_KINDS.map((k) => pickForDay(media.filter((m) => m.kind === k), day)).filter((m): m is MediaItem => !!m)
  const written = run ? journal.some((j) => j.id === detId('journal', run.id, day) && !j.deletedAt) : false
  const plan = planForDay(content, day, { includeFood: settings.includeFood })
  const pCount = plan.filter((p) => pSet.has(p.id)).length
  const rCount = content.rules.filter((r) => rSet.has(r.id)).length
  const info = { ondaId: index.id, style: look.vars, onda: settings.ondaThemes ? index.id : undefined }

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
      <Cover look={look} size="hero" level={1} glyph={look.themed ? look.glyph : undefined} title={index.name} sub={index.origin} mark={look.numeral(day)} days={{ day, length }} />
      {theme && <div className={c.lede}>{t('onda.todayTheme', { theme })}</div>}

      {!live && (
        <GroupedList inset={16} style={{ marginTop: 20 }}>
          <div className={c.inline}>
            <span style={{ whiteSpace: 'nowrap' }}>{t('onda.length', { count: len })}</span>
            <DayScroller value={len} min={7} max={30} onChange={setLen} ariaLabel={t('common.lengthLabel')} />
          </div>
        </GroupedList>
      )}
      {!live && content.sensitivity && (
        <GroupedList header={t('onda.sensitivity')} inset={16}>
          <div className={`${c.block} ${c.blockText}`}>{content.sensitivity.note}</div>
        </GroupedList>
      )}

      {!live && (
        <>
          <SectionHeader title={t('onda.practices')} meta={`${pCount}/${plan.length}`} open={open('p')} onToggle={fold('p')} />
          {open('p') && <PlanList plan={plan} done={pSet} onToggle={(id) => flip(id)} runId={undefined} info={info} footer={t('onda.holdHint')} />}

          {content.rules.length > 0 && (
            <>
              <SectionHeader title={t('onda.rules')} meta={`${rCount}/${content.rules.length}`} open={open('r')} onToggle={fold('r')} />
              {open('r') && <RulesList rules={content.rules} done={rSet} numeral={look.numeral} onToggle={(id) => flip(id)} />}
            </>
          )}

          {mediaToday.length > 0 && (
            <>
              <SectionHeader title={t('onda.immerse')} open={open('i')} onToggle={fold('i')} action={live ? { label: t('onda.seeAll'), onClick: () => push({ name: 'immersion' }) } : undefined} />
              {open('i') && (
                <GroupedList label={t('onda.immerse')}>
                  {mediaToday.map((m) => (
                    <Row key={m.id} icon={KIND_ICON[m.kind]} title={m.title} sub={[t(`kindLabel.${m.kind}`), m.meta].filter(Boolean).join(' · ')} chevron onClick={() => openSheet({ name: 'mediaInfo', item: m, ondaId: index.id, runId: undefined })} />
                  ))}
                </GroupedList>
              )}
            </>
          )}

          {think.length > 0 && (
            <>
              <SectionHeader title={t('onda.thinkAbout')} open={open('k')} onToggle={fold('k')} />
              {open('k') && (
                <GroupedList label={t('onda.thinkAbout')}>
                  {think.map((x) => (
                    <Row key={x.title} icon={x.kind === 'ethics' ? 'scales' : 'lightbulb'} title={x.title} sub={<span className={more === x.title ? undefined : c.clamp3}>{x.text}</span>} expanded={more === x.title} onClick={() => setMore((m) => (m === x.title ? null : x.title))} />
                  ))}
                </GroupedList>
              )}
            </>
          )}
        </>
      )}

      {quote && <QuoteBlock caps={look.caps} kicker={t('onda.quoteOfDay')} text={quote.text} by={quote.by} source={quote.source} ornament={look.themed ? <OrnamentIcon name={look.ornament} size={22} weight={1.25} /> : undefined} />}

      {word && (
        <GroupedList header={t('onda.wordOfDay')} inset={16} style={{ marginTop: 18 }}>
          <div className={c.block}>
            <div className={c.term}>{word.term}</div>
            {word.pronunciation && <div className={c.say}>{word.pronunciation}</div>}
            <div className={c.meaning}>{word.meaning}</div>
          </div>
        </GroupedList>
      )}

      {!live && (
        <GroupedList style={{ marginTop: 22 }}>
          <Row icon="book-open-text" title={t('ondas.guide')} sub={t('onda.guideSub')} chevron onClick={openGuide} />
        </GroupedList>
      )}

      <GroupedList header={t('onda.journalDay', { day })} style={{ marginTop: 4 }}>
        <div className={c.block}>
          <div className={c.prompt}>{prompt}</div>
        </div>
        {live && <Row icon={written ? 'check' : 'pencil-simple'} title={written ? t('onda.editEntry') : t('onda.write')} chevron onClick={() => openSheet({ name: 'journalEdit' })} />}
        {live && <Row icon="notebook" title={t('onda.finalReflection')} sub={day >= length ? t('onda.reflectionOpen') : t('onda.reflectionDay', { day: length })} chevron onClick={() => push({ name: 'reflection' })} />}
      </GroupedList>
    </Screen>
  )
}
