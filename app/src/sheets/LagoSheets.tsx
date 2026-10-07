import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LAGO_ICONS } from '@/data/catalog'
import { useActiveRun, useLook, useOnda, useOndaIndex, useSettings } from '@/data/hooks'
import { savePhoto, usePhotoUrl } from '@/data/photos'
import { useStore } from '@/data/store'
import type { Frequency } from '@/data/types'
import { addDays, fmtClock, fmtDate, fmtLongDate, fromClock, toClock } from '@/lib/dates'
import { haptic } from '@/lib/haptics'
import { detId } from '@/lib/ids'
import { useNav, type SheetEntry } from '@/nav/store'
import { share, startLago } from '@/screens/lagoActions'
import { OndaBanner } from '@/screens/ondaShared'
import o from '@/screens/ondas.module.css'
import s from '@/screens/screens.module.css'
import { Button, GlassButton } from '@/ui/buttons'
import { SegmentedControl, Stepper } from '@/ui/controls'
import { Icon } from '@/ui/Icon'
import { ListRow, ListSection } from '@/ui/lists'
import { WheelPicker } from '@/ui/pickers'
import { AppSheet, useSheet } from './common'

type E<N extends SheetEntry['name']> = { entry: Extract<SheetEntry, { name: N }> }

/* ── Check In ─────────────────────────────────────────────── */
export function CheckInSheet({ entry }: E<'checkin'>) {
  const { t } = useTranslation()
  const sh = useSheet(entry)
  const lago = useStore((x) => x.lagos.find((l) => l.id === entry.lagoId))
  const today = useStore((x) => x.today)
  const checkIns = useStore((x) => x.checkIns)
  const [date, setDate] = useState(today)
  const id = detId('checkin', entry.lagoId, date)
  const existing = useMemo(() => checkIns.find((c) => c.id === id && !c.deletedAt), [checkIns, id])
  const nowClock = () => new Date().toTimeString().slice(0, 5)
  const [status, setStatus] = useState<'done' | 'missed'>(existing?.status ?? 'done')
  const [time, setTime] = useState(existing ? new Date(existing.at).toTimeString().slice(0, 5) : nowClock())
  const [note, setNote] = useState(existing?.note ?? '')
  const [photoPath, setPhotoPath] = useState<string | null>(existing?.photoPath ?? null)
  const [photoRev, setPhotoRev] = useState(0)
  const file = useRef<HTMLInputElement>(null)
  const photoUrl = usePhotoUrl(photoPath ? id : undefined, photoPath, photoRev)
  if (!lago) return null

  const pickDate = (d: string) => {
    if (!d || d > today || d < lago.startedAt) return
    setDate(d)
    const c = checkIns.find((x) => x.id === detId('checkin', entry.lagoId, d) && !x.deletedAt)
    setStatus(c?.status ?? 'done')
    setNote(c?.note ?? '')
    setPhotoPath(c?.photoPath ?? null)
    setTime(c ? new Date(c.at).toTimeString().slice(0, 5) : nowClock())
  }
  const save = () => {
    const [h = 0, m = 0] = time.split(':').map(Number)
    const [y = 1970, mo = 1, d = 1] = date.split('-').map(Number)
    haptic(status === 'done' ? 'success' : 'select')
    useStore.getState().checkIn(entry.lagoId, { date, status, note: note.trim(), photoPath, at: new Date(y, mo - 1, d, h, m).toISOString() })
    sh.close()
  }
  const onFile = async (f: File | undefined) => {
    if (!f) return
    setPhotoPath(await savePhoto(id, f))
    setPhotoRev((n) => n + 1)
  }

  return (
    <AppSheet entry={entry} title={t('checkin.title')} leading="cancel" onSave={save}>
      <div style={{ padding: '8px 0 40px' }}>
        <div className={s.center}>
          <div className={`${s.circle} ${s.ciRing}`}>
            <Icon name={lago.icon} weight="fill" size={44} />
          </div>
          <h2 className={s.ciName}>{lago.name}</h2>
        </div>
        <div style={{ paddingTop: 24 }} role="radiogroup" aria-label={t('checkin.title')}>
          <ListSection>
            <ListRow title={t('checkin.completed')} accessory={status === 'done' ? 'check' : 'none'} onClick={() => setStatus('done')} />
            <ListRow title={t('checkin.missed')} accessory={status === 'missed' ? 'check' : 'none'} onClick={() => setStatus('missed')} />
          </ListSection>
        </div>
        <div className={s.card} style={{ marginTop: 16 }}>
          <div className={`${s.inlineRow}`} style={{ borderBottom: '1px solid var(--separator)' }}>
            <span>{t('checkin.when')}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <label className={`${s.pill} ${s.pillInput}`}>
                {fmtDate(date)}
                <input type="date" aria-label={t('checkin.when')} value={date} min={lago.startedAt} max={today} onChange={(e) => pickDate(e.target.value)} />
              </label>
              <label className={`${s.pill} ${s.pillInput}`}>
                {fmtClock(time)}
                <input type="time" aria-label={t('a11y.time')} value={time} onChange={(e) => e.target.value && setTime(e.target.value)} />
              </label>
            </div>
          </div>
          <div style={{ padding: '14px 20px' }}>
            <textarea aria-label={t('checkin.notePlaceholder')} placeholder={t('checkin.notePlaceholder')} value={note} onChange={(e) => setNote(e.target.value)} style={{ minHeight: 110 }} />
          </div>
          {photoUrl && <img className={s.photo} src={photoUrl} alt={t('checkin.photoAlt')} />}
          <button type="button" className={`${s.photoRow} ${s.sep}`} onClick={() => file.current?.click()}>
            <Icon name="camera" size={22} color="var(--accent)" />
            <span>{photoPath ? t('checkin.changePhoto') : t('checkin.addPhoto')}</span>
          </button>
          {photoPath && (
            <button type="button" className={`${s.photoRow} ${s.sep}`} style={{ color: 'var(--destructive)' }} onClick={() => setPhotoPath(null)}>
              <Icon name="trash" size={22} />
              <span>{t('checkin.removePhoto')}</span>
            </button>
          )}
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
        </div>
      </div>
    </AppSheet>
  )
}

/* ── New / Edit Lago ──────────────────────────────────────── */
const FREQS: Frequency[] = ['daily', 'weekdays', 'weekly']

export function LagoFormSheet({ entry }: E<'lagoForm'>) {
  const { t } = useTranslation()
  const sh = useSheet(entry)
  const openSheet = useNav((n) => n.openSheet)
  const settings = useSettings()
  const editing = useStore((x) => (entry.editId ? x.lagos.find((l) => l.id === entry.editId) : undefined))
  const [name, setName] = useState(editing?.name ?? '')
  const [why, setWhy] = useState(editing?.why ?? '')
  const [icon, setIcon] = useState(editing?.icon ?? 'drop')
  const [length, setLength] = useState(editing?.lengthDays ?? 30)
  const [freq, setFreq] = useState<Frequency>(editing?.frequency ?? 'daily')
  const [remind, setRemind] = useState(editing?.reminder.on ?? true)
  const [time, setTime] = useState(editing?.reminder.time ?? settings.reminderTime)
  const icons = LAGO_ICONS.includes(icon) ? LAGO_ICONS : [icon, ...LAGO_ICONS.slice(0, 11)]
  // Practices of the running Onda can become Lagos; the two then share one tick per day.
  const run = useActiveRun()
  const ondaContent = useOnda(run?.ondaId)
  const lagos = useStore((x) => x.lagos)
  const [link, setLink] = useState<{ runId: string; practiceId: string } | null>(editing?.link ?? null)
  const taken = new Set(lagos.filter((l) => !l.deletedAt && l.link && l.id !== editing?.id).map((l) => `${l.link!.runId}:${l.link!.practiceId}`))
  const offered = !editing && run?.snapshot ? (ondaContent?.practices ?? run.snapshot.practices).filter((p) => !taken.has(`${run.id}:${p.id}`)) : []
  const pickPractice = (p: { id: string; name: string; icon: string; time: string }) => {
    if (!run) return
    if (link?.practiceId === p.id) return setLink(null)
    setLink({ runId: run.id, practiceId: p.id })
    setName(p.name)
    setIcon(p.icon)
    setTime(p.time)
    setRemind(true)
    setFreq('daily')
    if (!why.trim()) setWhy(t('lagoForm.fromOnda', { name: run.snapshot?.name ?? '' }))
  }

  const save = () => {
    const input = { name: name.trim() || t('lagoForm.defaultName'), why: why.trim(), icon, lengthDays: length, frequency: freq, reminder: { on: remind, time }, link, ...(link && run ? { origin: `onda:${run.ondaId}` } : {}) }
    if (editing) useStore.getState().updateLago(editing.id, input)
    else if (!startLago(t, input)) return
    sh.close()
  }

  return (
    <AppSheet entry={entry} title={editing ? t('lagoForm.editTitle') : t('lagoForm.newTitle')} leading="cancel" onSave={save}>
      <div style={{ padding: '8px 0 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className={`${s.circle} ${s.formHero}`}>
            <Icon name={icon} weight="fill" size={44} />
          </div>
        </div>
        {offered.length > 0 && (
          <div className={s.fromOnda}>
            <h2 className={`${s.h20} ${s.formH}`}>{t('lagoForm.fromTitle', { name: run?.snapshot?.name ?? '' })}</h2>
            <div className={s.fromChips} role="group" aria-label={t('lagoForm.fromTitle', { name: run?.snapshot?.name ?? '' })}>
              {offered.map((p) => (
                <button key={p.id} type="button" aria-pressed={link?.practiceId === p.id} className={link?.practiceId === p.id ? `${s.fromChip} ${s.fromChipOn}` : s.fromChip} onClick={() => pickPractice(p)}>
                  <Icon name={p.icon} weight="fill" size={18} />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
            <div className={s.fromNote}>{link ? t('lagoForm.linkedNote', { name: run?.snapshot?.name ?? '' }) : t('lagoForm.fromHint')}</div>
          </div>
        )}
        <div className={s.card} style={{ marginTop: 24 }}>
          <div className={s.fieldRow} style={{ borderBottom: '1px solid var(--separator)' }}>
            <input aria-label={t('lagoForm.name')} placeholder={t('lagoForm.name')} value={name} maxLength={60} enterKeyHint="next" autoCapitalize="sentences" onChange={(e) => setName(e.target.value)} />
          </div>
          <div className={s.fieldRow}>
            <input aria-label={t('lagoForm.why')} placeholder={t('lagoForm.why')} value={why} maxLength={160} enterKeyHint="done" onChange={(e) => setWhy(e.target.value)} />
          </div>
        </div>
        <h2 className={`${s.h20} ${s.formH}`}>{t('lagoForm.icon')}</h2>
        <div className={s.iconGrid} role="radiogroup" aria-label={t('lagoForm.icon')}>
          {icons.map((ic, i) => (
            <button key={ic} type="button" role="radio" aria-checked={ic === icon} aria-label={t('lagoForm.iconNamed', { n: i + 1 })} className={`${s.circle} ${s.iconPick} ${ic === icon ? s.iconPickOn : ''}`} onClick={() => setIcon(ic)}>
              <Icon name={ic} weight="fill" size={22} />
            </button>
          ))}
        </div>
        <h2 className={`${s.h20} ${s.formH}`}>{t('lagoForm.schedule')}</h2>
        <div className={s.card}>
          <div className={s.inlineRow} style={{ borderBottom: '1px solid var(--separator)' }}>
            <span>{t('common.lengthDays', { count: length })}</span>
            <Stepper onDecrement={() => setLength((n) => Math.max(3, n - 1))} onIncrement={() => setLength((n) => Math.min(365, n + 1))} decrementDisabled={length <= 3} incrementDisabled={length >= 365} />
          </div>
          <div style={{ padding: '12px 16px' }}>
            <SegmentedControl<Frequency> options={FREQS.map((f) => ({ value: f, label: t(`freq.${f}`) }))} value={freq} onChange={setFreq} fullWidth ariaLabel={t('lagoForm.schedule')} />
          </div>
        </div>
        <div style={{ paddingTop: 28 }}>
          <ListSection footer={t('lagoForm.reminderFooter')}>
            <ListRow icon="bell" title={t('lagoForm.reminder')} accessory="switch" switchOn={remind} onSwitchChange={setRemind} />
            <ListRow icon="clock" title={t('lagoForm.time')} value={fmtClock(time)} onClick={() => openSheet({ name: 'time', title: t('lagoForm.time'), value: time, onPick: setTime })} />
          </ListSection>
          {editing && <ListSection footer={t('calendar.nudgeSub')}><ListRow icon="calendar-dots" title={t('calendar.nudgeTitle')} onClick={() => openSheet({ name: 'calendar' })} /></ListSection>}
        </div>
      </div>
    </AppSheet>
  )
}

/* ── Gallery Lago detail ──────────────────────────────────── */
export function LagoInfoSheet({ entry }: E<'lagoInfo'>) {
  const { t } = useTranslation()
  const { popToRoot, showToast } = useNav()
  const today = useStore((x) => x.today)
  const reminderTime = useSettings().reminderTime
  const i = entry.info
  const desc = i.desc || t('gallery.defaultDesc', { count: i.length })

  const start = () => {
    if (!startLago(t, { name: i.name, icon: i.icon, why: desc, lengthDays: i.length, frequency: 'daily', reminder: { on: true, time: reminderTime }, origin: 'gallery' })) return
    popToRoot('lagos')
    showToast(t('gallery.started'), { icon: i.icon })
  }

  return (
    <AppSheet entry={entry} background="var(--surface-page)" trailing={<GlassButton icon="export" iconWeight="regular" ariaLabel={t('a11y.share')} onClick={() => void share(`${i.name}: ${desc}`)} />}>
      <div style={{ padding: '4px 24px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className={`${s.circle} ${s.infoRing}`}>
            <Icon name={i.icon} weight="fill" size={56} />
          </div>
        </div>
        <div className={s.infoCat}>{i.cat}</div>
        <h2 className={s.infoTitle}>{i.name}</h2>
        <div className={s.infoText} style={{ marginTop: 6 }}>{desc}</div>
        <div className={`${s.infoFacts} ${s.infoText}`}>
          <div className={s.infoFact}>
            <Icon name="calendar-dots" weight="fill" size={24} />
            <span>{t('common.daysCap', { count: i.length })}</span>
          </div>
        </div>
        <div className={s.infoText} style={{ marginTop: 20 }}>{t('gallery.endsOn', { date: fmtLongDate(addDays(today, i.length - 1)) })}</div>
        <div className={s.infoNote}>
          <Icon name="info" size={22} />
          <span>{t('gallery.disclaimer')}</span>
        </div>
        <div style={{ marginTop: 24 }}>
          <Button fullWidth icon="play" onClick={start}>
            {t('gallery.startLago')}
          </Button>
        </div>
      </div>
    </AppSheet>
  )
}

/* ── Choose practices from an Onda and start them as Lagos ── */
export function OndaPracticesSheet({ entry }: E<'ondaPractices'>) {
  const { t } = useTranslation()
  const running = useActiveRun()
  const { popToRoot, showToast } = useNav()
  const index = useOndaIndex(entry.ondaId)
  const content = useOnda(entry.ondaId)
  const look = useLook(index)
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const [days, setDays] = useState('14')
  const practices = content?.practices ?? []
  const chosen = practices.filter((p) => picked[p.id])
  const all = practices.length > 0 && chosen.length === practices.length

  const start = () => {
    let n = 0
    for (const p of chosen) {
      if (!startLago(t, { name: p.name, icon: p.icon, why: p.why || p.meta, lengthDays: Number(days), frequency: 'daily', reminder: { on: true, time: p.time }, origin: `onda:${entry.ondaId}`, link: running && running.ondaId === entry.ondaId && running.snapshot?.practices.some((q) => q.id === p.id) ? { runId: running.id, practiceId: p.id } : null })) break
      n++
    }
    if (!n) return
    popToRoot('lagos')
    showToast(t('gallery.startedN', { count: n }), { icon: 'seal-check' })
  }

  return (
    <AppSheet entry={entry} look={look} title={index?.name ?? ''} detent={0.9}>
      <div style={{ padding: '4px 16px 120px' }}>
        {index && <OndaBanner look={look} icon={index.icon} kicker={t('gallery.fromOndas')} title={index.name} sub={t('gallery.fromOndasSub')} />}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 4px 10px' }}>
          <h3 className={s.h20} style={{ margin: 0 }}>{t('gallery.practicesTitle')}</h3>
          {practices.length > 1 && (
            <button type="button" style={{ color: 'var(--accent)', font: '500 var(--fs-15) var(--font-sans)', padding: '8px 4px' }} onClick={() => setPicked(all ? {} : Object.fromEntries(practices.map((p) => [p.id, true])))}>
              {all ? t('gallery.selectNone') : t('gallery.selectAll')}
            </button>
          )}
        </div>
        <div className={s.stack10}>
          {practices.map((p) => (
            <button key={p.id} type="button" role="checkbox" aria-checked={!!picked[p.id]} className={picked[p.id] ? `${o.pickRow} ${o.pickOn}` : o.pickRow} onClick={() => setPicked((x) => ({ ...x, [p.id]: !x[p.id] }))}>
              <span className={`${s.circle} ${o.pickIcon} ${o.solidCircle}`}>
                <Icon name={p.icon} weight="fill" size={22} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span className={o.pName} style={{ display: 'block' }}>{p.name}</span>
                <span className={o.pMeta} style={{ display: 'block' }}>{p.meta}</span>
              </span>
              <span className={o.pickBox} aria-hidden>
                <Icon name="check" weight="bold" size={15} />
              </span>
            </button>
          ))}
          {!content && <div className={s.sub} style={{ textAlign: 'center', padding: 24 }}>{t('onda.loading')}</div>}
        </div>
        <h3 className={s.h20} style={{ margin: '24px 4px 10px' }}>{t('gallery.lengthLabel')}</h3>
        <SegmentedControl<string> options={['7', '14', '21', '30'].map((d) => ({ value: d, label: t('common.daysCap', { count: Number(d) }) }))} value={days} onChange={setDays} fullWidth ariaLabel={t('gallery.lengthLabel')} />
      </div>
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 'max(var(--sab), 16px)' }}>
        <Button fullWidth disabled={!chosen.length} onClick={start}>
          {chosen.length ? t('gallery.startN', { count: chosen.length }) : t('gallery.pickSome')}
        </Button>
      </div>
    </AppSheet>
  )
}

/* ── Time picker (wheel) ──────────────────────────────────── */
const HOURS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))
const MINS = Array.from({ length: 12 }, (_, i) => ({ value: i * 5, label: (i * 5 < 10 ? '0' : '') + i * 5 }))
const AP = [{ value: 'AM', label: 'AM' }, { value: 'PM', label: 'PM' }]

export function TimeSheet({ entry }: E<'time'>) {
  const { t } = useTranslation()
  const sh = useSheet(entry)
  const [v, setV] = useState(() => {
    const c = fromClock(entry.value)
    return { ...c, m: Math.round(c.m / 5) * 5 % 60 }
  })
  return (
    <AppSheet
      entry={entry}
      title={entry.title}
      leading="cancel"
      detent={0.5}
      saveLabel={t('common.done')}
      onSave={() => {
        entry.onPick(toClock(v.h, v.m, v.ap))
        sh.close()
      }}
    >
      <div style={{ padding: '24px 40px' }}>
        <WheelPicker
          columns={[
            { items: HOURS, value: v.h, onChange: (x) => setV((p) => ({ ...p, h: Number(x) })), ariaLabel: t('common.hour') },
            { items: MINS, value: v.m, onChange: (x) => setV((p) => ({ ...p, m: Number(x) })), ariaLabel: t('common.minute') },
            { items: AP, value: v.ap, onChange: (x) => setV((p) => ({ ...p, ap: x as 'AM' | 'PM' })), ariaLabel: t('common.period') },
          ]}
        />
      </div>
    </AppSheet>
  )
}
