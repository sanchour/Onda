import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { immerseSet, pickForDay } from '@/data/derive/onda'
import { useLook, useOnda, useOndaIndex } from '@/data/hooks'
import { useStore } from '@/data/store'
import { haptic } from '@/lib/haptics'
import { detId } from '@/lib/ids'
import { useNav, type SheetEntry } from '@/nav/store'
import { KindArt } from '@/screens/KindArt'
import { Glyph, OndaBanner, OrnDivider, useActiveOnda, useRunToday } from '@/screens/ondaShared'
import o from '@/screens/ondas.module.css'
import s from '@/screens/screens.module.css'
import { Button } from '@/ui/buttons'
import { Chip } from '@/ui/controls'
import { Icon } from '@/ui/Icon'
import { AppSheet, useSheet } from './common'
import { openExternal } from './guideParts'
import g from './guide.module.css'

type E<N extends SheetEntry['name']> = { entry: Extract<SheetEntry, { name: N }> }

/* ── Journal editor: the day's question, free text, practiced chips ── */
export function JournalEditSheet({ entry }: E<'journalEdit'>) {
  const { t } = useTranslation()
  const sh = useSheet(entry)
  const { showToast } = useNav()
  const active = useActiveOnda()
  const done = useRunToday(active?.run.id)
  const day = entry.day ?? active?.day ?? 1
  const id = active ? detId('journal', active.run.id, day) : ''
  const existing = useStore((x) => x.journal.find((j) => j.id === id && !j.deletedAt))
  const [text, setText] = useState(existing?.text ?? '')
  if (!active) return null

  const prompt = existing?.prompt || pickForDay(active.content?.journal ?? [], day) || ''
  const back = () => sh.close()
  const save = () => {
    if (text.trim()) {
      useStore.getState().saveJournal(active.run.id, day, prompt, text.trim())
      showToast(t('journal.saved'), { icon: 'notebook' })
    }
    back()
  }
  const practices = active.content?.practices ?? []

  return (
    <AppSheet entry={entry} look={active.look} title={t('journal.title')} leading="cancel" onCancel={back} onSave={save}>
      <div style={{ padding: '8px 20px 40px' }}>
        <div className={`${o.jeCard} ${o.themed}`}>
          <Glyph look={active.look} opacity={0.12} right={14} bottom={4} />
          <div className={o.jeKicker} style={{ color: 'inherit', opacity: 0.8 }}>{t('journal.dayLabel', { day, name: active.index?.name ?? '' })}</div>
          <h2 className={o.jePrompt}>{prompt}</h2>
        </div>
        <div className={s.card} style={{ margin: '20px 0 0', padding: '16px 20px' }}>
          <textarea aria-label={prompt} placeholder={t('journal.placeholder')} value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 240, lineHeight: 1.45 }} />
        </div>
        {day === active.day && practices.length > 0 && (
          <>
            <div style={{ font: '600 var(--fs-15) var(--font-sans)', marginTop: 24 }}>{t('journal.practicedToday')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {practices.map((p) => (
                <Chip key={p.id} icon={p.icon} label={p.name} selected={done.practices.has(p.id)} onClick={() => useStore.getState().togglePractice(active.run.id, p.id)} />
              ))}
            </div>
          </>
        )}
      </div>
    </AppSheet>
  )
}

/* ── Quick look at one book, film, song, dish or word ─────── */
export function MediaInfoSheet({ entry }: E<'mediaInfo'>) {
  const { t } = useTranslation()
  const item = entry.item
  const index = useOndaIndex(entry.ondaId)
  const look = useLook(index)
  const logs = useStore((x) => x.immerseLogs)
  const on = useMemo(() => (entry.runId ? immerseSet(logs, entry.runId).has(item.id) : false), [logs, entry.runId, item.id])
  const sub = item.kind === 'words' ? item.meta : [item.creator, item.year].filter(Boolean).join(', ')

  return (
    <AppSheet entry={entry} look={look} detent={0.72}>
      <div style={{ padding: '4px 20px 40px' }}>
        <div className={`${g.miHero} ${o.themed}`}>
          <Glyph look={look} opacity={0.12} right={12} bottom={2} />
          <span className={g.miKind}>{t(`kindLabel.${item.kind}`)}</span>
          <KindArt kind={item.kind} className={g.miArt} />
        </div>
        <h2 className={g.miTitle}>{item.title}</h2>
        {sub && <div className={g.miMeta}>{sub}</div>}
        {item.extra && <div className={g.miExtra}>{item.extra}</div>}
        <p className={g.miWhy} data-selectable>{item.why || t('immersion.noNote')}</p>
        {item.unverified && <div className={g.tag} style={{ marginTop: 10, color: 'var(--label-tertiary)' }}>{t('guide.unverified')}</div>}
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
  const head = (icon: string, label: string) => (
    <div className={o.howHead}>
      <Icon name={icon} weight="fill" size={16} />
      {label}
    </div>
  )

  return (
    <AppSheet entry={entry} look={look} detent={0.82}>
      <div style={{ padding: '4px 16px 40px' }}>
        <OndaBanner icon={p?.icon ?? snap?.icon ?? 'circle'} kicker={index?.name} title={name} sub={p?.meta ?? snap?.time} />
        {!content && !snap && <div className={s.sub} style={{ textAlign: 'center', padding: 24 }}>{t('onda.loading')}</div>}
        {p?.instructions && (
          <div className={o.howCard} data-selectable>
            {head('play', t('onda.howTo'))}
            {p.instructions}
          </div>
        )}
        {p?.why && (
          <div className={o.howCard} data-selectable>
            {head('lightbulb', t('onda.why'))}
            {p.why}
          </div>
        )}
        {!!p?.variations.length && (
          <div className={o.howCard} data-selectable>
            {head('repeat', t('onda.variations'))}
            <ul className={o.howList}>
              {p.variations.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </div>
        )}
        {(content || snap) && !p?.instructions && !p?.why && <div className={o.howCard}>{t('onda.noHowTo')}</div>}
        <OrnDivider look={look} />
        {run && (
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
        )}
      </div>
    </AppSheet>
  )
}
