import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/data/hooks'
import { pickForDay } from '@/data/derive/onda'
import { useStore } from '@/data/store'
import { haptic } from '@/lib/haptics'
import { detId } from '@/lib/ids'
import { BackButton, ChromeSpacer, ChromeTitle, LargeTitle, Screen } from '@/nav/Screen'
import { useNav, type StackEntry } from '@/nav/store'
import g from '@/sheets/guide.module.css'
import { Button, GlassButton } from '@/ui/buttons'
import { SegmentedControl } from '@/ui/controls'
import { ProgressBar } from '@/ui/data'
import { Icon } from '@/ui/Icon'
import { OrnamentIcon } from './KindArt'
import { OndaBanner, useActiveOnda, useRunToday } from './ondaShared'
import o from './ondas.module.css'
import s from './screens.module.css'

/** Shared frame for the three full-screen pages that used to be sheets: back button, title, Onda look. */
function OndaPage({ title, large, face, trailing, desk, children }: { title: string; large?: { sub?: string }; face?: boolean; trailing?: React.ReactNode; desk?: 'wide'; children: React.ReactNode }) {
  const active = useActiveOnda()
  const themed = useSettings().ondaThemes
  return (
    <Screen
      variant="page"
      desk={desk}
      style={active?.look.vars}
      dataOnda={themed ? active?.run.ondaId : undefined}
      chrome={
        <>
          <span className={g.topMask} aria-hidden />
          <BackButton />
          <ChromeTitle after={large ? 44 : undefined} onda={face}>{title}</ChromeTitle>
          {trailing ?? <ChromeSpacer />}
        </>
      }
    >
      {large && <LargeTitle title={title} sub={large.sub} />}
      {children}
    </Screen>
  )
}

/* ── Journal (8.0): a cover banner, New Entry, then every entry as its own card, numbered in the Onda's numerals ── */
export function JournalPage() {
  const { t } = useTranslation()
  const push = useNav((n) => n.push)
  const active = useActiveOnda()
  const journal = useStore((x) => x.journal)
  const entries = useMemo(() => journal.filter((j) => j.runId === active?.run.id && !j.deletedAt).sort((a, b) => b.day - a.day), [journal, active?.run.id])
  const write = (day?: number) => push({ name: 'journalWrite', day })
  const look = active?.look

  return (
    <OndaPage title={t('journal.title')} face desk="wide" trailing={<GlassButton icon="plus" prominent ariaLabel={t('a11y.newEntry')} onClick={() => write()} />}>
      <div className={o.jrWrap}>
        <div className={o.jrSide}>
          {look && (
            <div className={o.jrBanner} data-frame={look.layout === 'frame' ? '' : undefined}>
              <span className={o.jrOrn} aria-hidden><OrnamentIcon name={look.ornament} size={30} weight={1.2} /></span>
              <span className={o.jrTitle}>{t('journal.title')}</span>
              <span className={o.jrCount}>{t('journal.count', { count: entries.length })}</span>
            </div>
          )}
          <Button fullWidth icon="pencil-simple" onClick={() => write()}>
            {t('journal.newEntry')}
          </Button>
        </div>
        <div className={o.jrList}>
          {entries.map((e) => (
            <button key={e.id} type="button" className={o.jrEntry} aria-label={`${t('journal.dayLabel', { day: e.day, name: active?.index?.name ?? '' })}, ${e.prompt}`} onClick={() => write(e.day)}>
              <span className={o.jrNum} aria-hidden>{look ? look.numeral(e.day) : e.day}</span>
              <span className={o.jrBody}>
                <span className={o.jrPrompt}>{e.prompt}</span>
                <span className={o.jrText}>{e.text}</span>
              </span>
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

/* ── Writing an entry (8.0): a full page with only back and done. The day's question stays large and centred above the
   keyboard while the text below it takes the rest of the screen. Leaving the page in any way keeps what was written. ── */
export function JournalWritePage({ entry }: { entry: Extract<StackEntry, { name: 'journalWrite' }> }) {
  const { t } = useTranslation()
  const pop = useNav((n) => n.pop)
  const showToast = useNav((n) => n.showToast)
  const active = useActiveOnda()
  const themed = useSettings().ondaThemes
  const day = entry.day ?? active?.day ?? 1
  const id = active ? detId('journal', active.run.id, day) : ''
  const existing = useStore((x) => x.journal.find((j) => j.id === id && !j.deletedAt))
  const [text, setText] = useState(existing?.text ?? '')
  const prompt = existing?.prompt || pickForDay(active?.content?.journal ?? [], day) || ''
  // what is on the page now, for the save on the way out
  const latest = useRef({ text, prompt, runId: active?.run.id, before: existing?.text ?? '' })
  latest.current = { ...latest.current, text, prompt, runId: active?.run.id }
  useEffect(
    () => () => {
      const l = latest.current
      const body = l.text.trim()
      if (l.runId && body && body !== l.before.trim()) useStore.getState().saveJournal(l.runId, day, l.prompt, body)
    },
    [day],
  )
  if (!active) return <Screen chrome={<BackButton />}>{null}</Screen>
  const { look } = active
  const done = () => {
    if (text.trim()) showToast(t('journal.saved'), { icon: 'notebook' })
    pop()
  }

  return (
    <Screen
      variant="bare"
      bg="page"
      style={look.vars}
      dataOnda={themed ? active.run.ondaId : undefined}
      chrome={
        <>
          <BackButton />
          <GlassButton icon="check" prominent ariaLabel={t('common.done')} onClick={done} />
        </>
      }
    >
      <div className={o.jwPage}>
        <div className={o.jwHead}>
          <span className={o.jwOrn} aria-hidden><OrnamentIcon name={look.ornament} size={30} /></span>
          <span className={o.jwDay}>{t('journal.dayLabel', { day: look.numeral(day), name: active.index?.name ?? '' })}</span>
          <h1 className={o.jwQ}>{prompt}</h1>
          <i className={o.jwRule} aria-hidden />
        </div>
        <textarea className={o.jwText} aria-label={prompt} placeholder={t('journal.startWriting')} value={text} onChange={(e) => setText(e.target.value)} />
      </div>
    </Screen>
  )
}

/* ── Philosophy: today's idea first, large, with one thing to try. Then every idea and every ethical teaching as a calm index:
   a numeral, the title and a first line; a tap opens it in place to read in full and pick up its practice. ── */
export function PhilosophyPage() {
  const { t } = useTranslation()
  const active = useActiveOnda()
  const c = active?.content
  const look = active?.look
  const day = active?.day ?? 1
  const ideas = c?.philosophy ?? []
  const ethics = c?.ethics ?? []
  const [open, setOpen] = useState<string | null>(null)
  const [tab, setTab] = useState<'ideas' | 'ethics'>('ideas')
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const pickedCount = Object.values(picked).filter(Boolean).length
  const num = (n: number) => (look ? look.numeral(n) : String(n))
  const ti = ideas.length ? (day - 1) % ideas.length : -1
  const today = ti >= 0 ? ideas[ti] : undefined
  const tryIt = (k: string, practice: string, onCover?: boolean) => (
    <button
      type="button"
      role="checkbox"
      aria-checked={!!picked[k]}
      className={[o.phTry, onCover ? '' : o.phTryPlain, picked[k] ? o.phTryOn : ''].filter(Boolean).join(' ')}
      onClick={() => {
        haptic(picked[k] ? 'select' : 'success')
        setPicked((v) => ({ ...v, [k]: !v[k] }))
      }}
    >
      <span className={o.phTryBox} aria-hidden>{picked[k] && <Icon name="check" weight="bold" size={14} />}</span>
      <span className={o.phTryText}>
        <b>{picked[k] ? t('philosophy.onList') : t('philosophy.tryThis')}</b>
        {practice}
      </span>
    </button>
  )
  const sections = [
    { key: 'ideas' as const, label: t('philosophy.think'), short: t('philosophy.think'), set: ideas },
    { key: 'ethics' as const, label: t('philosophy.ethics'), short: t('philosophy.ethicsTab'), set: ethics },
  ].filter((x) => x.set.length > 0)
  const shown = sections.length > 1 ? sections.filter((x) => x.key === tab) : sections

  return (
    <OndaPage title={t('philosophy.title')} large={{ sub: t('philosophy.lead') }} desk="wide">
      <div className={o.phWrap}>
        {today && (
          <article className={o.phToday}>
            <span className={o.phKicker}>{t('philosophy.todayIdea', { day })}</span>
            <h2 className={o.phTodayTitle}>{today.title}</h2>
            <p className={o.phTodayText} data-selectable>{today.text}</p>
            {today.practice && tryIt(`ideas:${ti}`, today.practice, true)}
          </article>
        )}
        {pickedCount > 0 && <div className={o.phPickedBar}><Icon name="check-circle" weight="regular" size={18} />{t('philosophy.pickedCount', { count: pickedCount })}</div>}
        {sections.length > 1 && (
          <div className={o.phSeg}>
            <SegmentedControl options={sections.map((x) => ({ value: x.key, label: `${x.short} ${x.set.length}` }))} value={tab} onChange={(v) => { setTab(v); setOpen(null) }} fullWidth ariaLabel={t('philosophy.title')} />
          </div>
        )}
        {shown.map((sec) => (
          <section key={sec.key} aria-label={sec.label}>
            {sections.length < 2 && (
              <h3 className={o.phSec}>
                {sec.label}
                <small>{sec.set.length}</small>
              </h3>
            )}
            <div className={o.phIndex}>
              {sec.set.map((x, n) => {
                const k = `${sec.key}:${n}`
                const isOpen = open === k
                return (
                  <div key={k} className={isOpen ? `${o.phItem} ${o.phItemOpen}` : o.phItem}>
                    <button type="button" className={o.phItemHead} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : k)}>
                      <span className={o.phRowN} aria-hidden>{num(n + 1)}</span>
                      <span className={o.phItemText}>
                        <span className={o.phItemTitle}>{x.title}</span>
                        {!isOpen && <span className={o.phItemPeek}>{x.text}</span>}
                      </span>
                      {picked[k] && <span className={o.phItemDone} aria-label={t('philosophy.onList')}><Icon name="check" weight="bold" size={14} /></span>}
                      <span className={isOpen ? `${o.phCaret} ${o.phCaretOpen}` : o.phCaret} aria-hidden><Icon name="caret-down" weight="bold" size={14} /></span>
                    </button>
                    {isOpen && (
                      <div className={o.phItemBody}>
                        <p data-selectable>{x.text}</p>
                        {x.practice && tryIt(k, x.practice)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </OndaPage>
  )
}

/* ── Rules: the Onda's rules. Tap one when you have kept it today. ── */
export function RulesPage() {
  const { t } = useTranslation()
  const active = useActiveOnda()
  const look = active?.look
  const done = useRunToday(active?.run.id).rules
  const rules = active?.content?.rules ?? active?.run.snapshot?.rules.map((r) => ({ ...r, why: '' })) ?? []
  const kept = rules.filter((r) => done.has(r.id)).length
  return (
    <OndaPage title={t('ondas.rules')}>
      <div style={{ padding: '4px 16px 24px' }}>
        {look && <OndaBanner look={look} icon="scales" kicker={active?.index?.name} title={t('ondas.rules')} sub={t('rulesPage.lead', { count: rules.length })} />}
        {rules.length > 0 && (
          <div className={o.rulesMeter}>
            <span style={{ flex: 'none' }}>{t('ondas.rulesOf', { done: kept, total: rules.length })}</span>
            <span style={{ flex: 1 }} className={o.todayBar}>
              <ProgressBar value={kept / rules.length} tone="var(--onda-strong)" height={6} label={t('ondas.rulesOf', { done: kept, total: rules.length })} />
            </span>
          </div>
        )}
        <div className={o.rulesKeep}>
          {rules.map((r, i) => {
            const on = done.has(r.id)
            return (
              <button
                key={r.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                className={on ? `${o.rule} ${o.ruleOn}` : o.rule}
                onClick={() => {
                  if (!active) return
                  haptic(on ? 'select' : 'success')
                  useStore.getState().toggleItem('ruleLogs', active.run.id, r.id)
                }}
              >
                <span className={o.ruleNum} aria-hidden>{on ? <Icon name="check" weight="bold" size={20} /> : look ? look.numeral(i + 1) : i + 1}</span>
                <span className={o.ruleBody}>
                  <span className={o.ruleText}>{r.text}</span>
                  {r.why && <span className={o.ruleWhy}>{r.why}</span>}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </OndaPage>
  )
}
