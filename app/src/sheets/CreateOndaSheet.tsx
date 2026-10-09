import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { OndaContentSchema } from '@/content/schema'
import { TONE_KEYS, toneFill } from '@/content/themes'
import { useDark, useSettings } from '@/data/hooks'
import { useStore } from '@/data/store'
import { slug, uuid } from '@/lib/ids'
import { useNav, type SheetEntry } from '@/nav/store'
import o from '@/screens/ondas.module.css'
import s from '@/screens/screens.module.css'
import { GlassButton } from '@/ui/buttons'
import { DayScroller } from '@/ui/pickers'
import { Icon } from '@/ui/Icon'
import { AppSheet, useSheet } from './common'

type Tone = (typeof TONE_KEYS)[number]
const TIMES = ['07:00', '12:00', '18:00', '21:00']
const SLOTS = ['Morning', 'Afternoon', 'Evening', 'Evening'] as const

function Field({ label, value, onChange, last, area }: { label: string; value: string; onChange: (v: string) => void; last?: boolean; area?: boolean }) {
  return (
    <div className={s.fieldRow} style={last ? undefined : { borderBottom: '1px solid var(--separator)' }}>
      {area ? (
        <textarea aria-label={label} placeholder={label} value={value} onChange={(e) => onChange(e.target.value)} style={{ minHeight: 84 }} />
      ) : (
        <input aria-label={label} placeholder={label} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}

function AddList({ items, icon, render, onRemove, children }: { items: string[]; icon: string; render?: (i: number) => ReactNode; onRemove: (i: number) => void; children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className={s.card}>
      {items.map((it, i) => (
        <div key={i} className={o.listRow}>
          <Icon name={icon} weight={icon === 'drop' ? 'fill' : 'regular'} size={20} color="var(--accent)" />
          {render ? render(i) : <span>{it}</span>}
          <button type="button" className={o.listRowX} aria-label={t('createOnda.remove', { name: it })} onClick={() => onRemove(i)}>
            <Icon name="x" weight="bold" size={14} />
          </button>
        </div>
      ))}
      <div className={o.addRow}>{children}</div>
    </div>
  )
}

/** Create your own Onda: name, tradition, color, length, daily Lagos, quote, rules, context, history, vocabulary, food. */
export function CreateOndaSheet({ entry }: { entry: Extract<SheetEntry, { name: 'createOnda' }> }) {
  const { t } = useTranslation()
  const sh = useSheet(entry)
  const push = useNav((n) => n.push)
  const dark = useDark()
  const defaultLen = useSettings().defaultOndaLength
  const [f, setF] = useState({ name: '', origin: '', era: '', figures: '', about: '', quote: '', quoteBy: '', rules: '', history: '' })
  const [tone, setTone] = useState<Tone>('green')
  const [length, setLength] = useState(defaultLen)
  const [lagos, setLagos] = useState<string[]>([])
  const [vocab, setVocab] = useState<{ w: string; m: string }[]>([])
  const [food, setFood] = useState<string[]>([])
  const [draft, setDraft] = useState({ lago: '', w: '', m: '', food: '' })
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }))
  const setD = (k: keyof typeof draft) => (v: string) => setDraft((x) => ({ ...x, [k]: v }))

  const addLago = () => draft.lago.trim() && (setLagos((l) => [...l, draft.lago.trim()]), setD('lago')(''))
  const addVocab = () => draft.w.trim() && (setVocab((v) => [...v, { w: draft.w.trim(), m: draft.m.trim() }]), setDraft((x) => ({ ...x, w: '', m: '' })))
  const addFood = () => draft.food.trim() && (setFood((l) => [...l, draft.food.trim()]), setD('food')(''))
  const onEnter = (fn: () => void) => (e: React.KeyboardEvent) => e.key === 'Enter' && (e.preventDefault(), fn())

  const save = () => {
    const id = `custom-${uuid()}`
    const g = (k: string) => t(`createOnda.generic.${k}`)
    const named = lagos.length
      ? lagos.map((name, i) => ({ id: `p${i + 1}-${slug(name)}`, name, icon: 'drop', slot: SLOTS[i % 4]!, time: TIMES[i % 4]!, meta: g('daily') }))
      : [
          { id: 'p1', name: g('morning'), icon: 'sun-horizon', slot: 'Morning' as const, time: '07:00', meta: g('metaMorning') },
          { id: 'p2', name: g('midday'), icon: 'sparkle', slot: 'Afternoon' as const, time: '12:00', meta: g('metaMidday') },
          { id: 'p3', name: g('evening'), icon: 'moon', slot: 'Evening' as const, time: '21:00', meta: g('metaEvening') },
        ]
    const content = OndaContentSchema.parse({
      id,
      name: f.name.trim() || t('createOnda.defaultName'),
      origin: f.origin.trim() || t('createOnda.custom'),
      era: f.era.trim(),
      tone,
      icon: 'sparkle',
      line: t('createOnda.line'),
      custom: true,
      quote: f.quote.trim() ? { text: f.quote.trim(), by: f.quoteBy.trim(), source: '' } : null,
      words: vocab.map((v, i) => ({ id: `word-${i}-${slug(v.w)}`, term: v.w, meaning: v.m })),
      practices: named,
      rules: f.rules.split('\n').map((x) => x.trim()).filter(Boolean).map((text, i) => ({ id: `r${i + 1}`, text })),
      immerse: { eat: food.map((title, i) => ({ id: `eat-${i}-${slug(title)}`, title })) },
      journal: [g('journal')],
      reflect: [g('r1'), g('r2'), g('r3'), g('r4'), g('r5')],
      guide: {
        intro: f.about.trim() ? f.about.trim().split(/\n{2,}/) : [],
        origin: f.origin.trim(),
        era: f.era.trim(),
        figures: f.figures.split(',').map((x) => x.trim()).filter(Boolean).map((name) => ({ name, bio: '' })),
        history: f.history.split('\n').map((x) => x.trim()).filter(Boolean).map((what) => ({ when: '', what })),
      },
    })
    useStore.getState().saveCustomOnda(content)
    sh.close()
    push({ name: 'onda', id, length })
  }

  const h = (label: string) => <h2 className={`${s.h20} ${s.formH}`}>{label}</h2>
  const plus = (onClick: () => void, label: string) => <GlassButton icon="plus" size={36} prominent ariaLabel={label} onClick={onClick} />

  return (
    <AppSheet entry={entry} title={t('createOnda.title')} leading="cancel" onSave={save}>
      <div style={{ padding: '8px 0 60px' }}>
        <div className={o.coPreview} style={{ background: toneFill(tone, dark), color: dark ? '#F4F4F5' : '#000' }}>
          <div className={o.coName}>{f.name || t('createOnda.placeholderName')}</div>
          <div style={{ font: '400 var(--fs-13) var(--font-sans)', marginTop: 4 }}>{t('common.days', { count: length })}</div>
        </div>
        <div className={s.card} style={{ marginTop: 16 }}>
          <Field label={t('createOnda.name')} value={f.name} onChange={set('name')} />
          <Field label={t('createOnda.origin')} value={f.origin} onChange={set('origin')} last />
        </div>
        <div className={s.card} style={{ marginTop: 12 }}>
          <div className={s.inlineRow} style={{ borderBottom: '1px solid var(--separator)' }}>
            <span>{t('createOnda.color')}</span>
            <div style={{ display: 'flex', gap: 8 }} role="radiogroup" aria-label={t('createOnda.color')}>
              {TONE_KEYS.map((k) => (
                <button key={k} type="button" role="radio" aria-checked={tone === k} aria-label={t(`createOnda.tones.${k}`)} className={tone === k ? `${o.swatch} ${o.swatchOn}` : o.swatch} style={{ background: toneFill(k, dark) }} onClick={() => setTone(k)} />
              ))}
            </div>
          </div>
          <div className={s.inlineRow}>
            <span>{t('common.lengthDays', { count: length })}</span>
            <DayScroller value={length} min={7} max={30} onChange={setLength} ariaLabel={t('common.lengthLabel')} />
          </div>
        </div>

        {h(t('createOnda.dailyLagos'))}
        <AddList items={lagos} icon="drop" onRemove={(i) => setLagos((l) => l.filter((_, j) => j !== i))}>
          <input aria-label={t('createOnda.addPractice')} placeholder={t('createOnda.addPractice')} value={draft.lago} enterKeyHint="done" onChange={(e) => setD('lago')(e.target.value)} onKeyDown={onEnter(addLago)} style={{ flex: 1 }} />
          {plus(addLago, t('a11y.add'))}
        </AddList>

        {h(t('createOnda.context'))}
        <div className={s.card}>
          <Field label={t('createOnda.era')} value={f.era} onChange={set('era')} />
          <Field label={t('createOnda.figures')} value={f.figures} onChange={set('figures')} />
          <Field label={t('createOnda.about')} value={f.about} onChange={set('about')} last area />
        </div>

        {h(t('createOnda.quote'))}
        <div className={s.card}>
          <Field label={t('createOnda.quoteText')} value={f.quote} onChange={set('quote')} />
          <Field label={t('createOnda.quoteBy')} value={f.quoteBy} onChange={set('quoteBy')} last />
        </div>

        {h(t('createOnda.rules'))}
        <div className={s.card}>
          <Field label={t('createOnda.rulesPlaceholder')} value={f.rules} onChange={set('rules')} last area />
        </div>

        {h(t('createOnda.history'))}
        <div className={s.card}>
          <Field label={t('createOnda.historyPlaceholder')} value={f.history} onChange={set('history')} last area />
        </div>

        {h(t('createOnda.vocabulary'))}
        <AddList
          items={vocab.map((v) => v.w)}
          icon="translate"
          onRemove={(i) => setVocab((l) => l.filter((_, j) => j !== i))}
          render={(i) => (
            <span>
              <span style={{ display: 'block', fontWeight: 600 }}>{vocab[i]!.w}</span>
              <span className={s.sub} style={{ display: 'block' }}>{vocab[i]!.m}</span>
            </span>
          )}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input aria-label={t('createOnda.word')} placeholder={t('createOnda.word')} value={draft.w} onChange={(e) => setD('w')(e.target.value)} />
            <input aria-label={t('createOnda.meaning')} placeholder={t('createOnda.meaning')} value={draft.m} enterKeyHint="done" onChange={(e) => setD('m')(e.target.value)} onKeyDown={onEnter(addVocab)} />
          </div>
          {plus(addVocab, t('a11y.add'))}
        </AddList>

        {h(t('createOnda.food'))}
        <AddList items={food} icon="bowl-food" onRemove={(i) => setFood((l) => l.filter((_, j) => j !== i))}>
          <input aria-label={t('createOnda.dish')} placeholder={t('createOnda.dish')} value={draft.food} enterKeyHint="done" onChange={(e) => setD('food')(e.target.value)} onKeyDown={onEnter(addFood)} style={{ flex: 1 }} />
          {plus(addFood, t('a11y.add'))}
        </AddList>
      </div>
    </AppSheet>
  )
}
