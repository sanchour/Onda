import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ACHIEVEMENTS, achievementProgress, type AchievementKey } from '@/data/derive/achievements'
import { dayEvents } from '@/data/derive/stats'
import { useStore } from '@/data/store'
import { fmtDayTitle, fmtShortDate, fmtTime, toDateStr } from '@/lib/dates'
import { useNav, type SheetEntry } from '@/nav/store'
import m from '@/screens/more.module.css'
import s from '@/screens/screens.module.css'
import { VIZ } from '@/screens/StatsTab'
import { Button } from '@/ui/buttons'
import { Icon } from '@/ui/Icon'
import { AppSheet } from './common'
import { useHead } from '@/i18n/native'

type E<N extends SheetEntry['name']> = { entry: Extract<SheetEntry, { name: N }> }
const VIZ_HEX = ['#A9C4F7', '#FDDF9A', '#9FD9B8', '#FFB19C', '#B7A8F0']

/** Draw a share card for an unlocked achievement: 1080×1350, pastel field, icon, name, description. */
async function shareCard(svg: SVGElement | null, color: string, name: string, desc: string, text: string): Promise<'shared' | 'saved' | 'failed'> {
  try {
    const W = 1080
    const H = 1350
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const g = c.getContext('2d')!
    g.fillStyle = color
    g.fillRect(0, 0, W, H)
    g.strokeStyle = 'rgba(0,0,0,.07)'
    g.lineWidth = 3
    for (let r = 80; r < 1500; r += 54) {
      g.beginPath()
      g.arc(W / 2, H * 1.25, r, 0, Math.PI * 2)
      g.stroke()
    }
    g.fillStyle = 'rgba(255,255,255,.6)'
    g.beginPath()
    g.arc(W / 2, 470, 170, 0, Math.PI * 2)
    g.fill()
    if (svg) {
      const clone = svg.cloneNode(true) as SVGElement
      clone.setAttribute('width', '180')
      clone.setAttribute('height', '180')
      clone.setAttribute('fill', '#000')
      clone.setAttribute('color', '#000')
      const img = new Image()
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`
      await img.decode()
      g.drawImage(img, W / 2 - 90, 380, 180, 180)
    }
    g.fillStyle = '#000'
    g.textAlign = 'center'
    g.font = '600 96px Newsreader, Georgia, serif'
    g.fillText(name, W / 2, 800)
    g.font = '400 44px -apple-system, Inter, sans-serif'
    g.fillText(desc, W / 2, 880)
    g.font = '600 40px -apple-system, Inter, sans-serif'
    g.fillText('Onda', W / 2, H - 110)
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'))
    if (!blob) return 'failed'
    const file = new File([blob], 'onda-achievement.png', { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text })
      return 'shared'
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    return 'saved'
  } catch {
    return 'failed'
  }
}

/* ── Achievements: all twelve, with real progress ─────────── */
export function AchievementsSheet({ entry }: E<'achievements'>) {
  const { t } = useTranslation()
  const head = useHead()
  const showToast = useNav((n) => n.showToast)
  const state = useStore()
  const [sel, setSel] = useState<AchievementKey>(entry.focus ?? 'firstStep')
  const grid = useRef<HTMLDivElement>(null)
  const unlocked = useMemo(() => new Map(state.achievements.filter((a) => !a.deletedAt).map((a) => [a.key, a.unlockedAt])), [state.achievements])
  const progress = useMemo(() => achievementProgress(state, state.today), [state])
  const i = ACHIEVEMENTS.findIndex((a) => a.key === sel)
  const on = unlocked.has(sel)
  const [now, target] = progress[sel]
  const name = t(`ach.names.${sel}`)
  const desc = t(`ach.desc.${sel}`)

  const share = async () => {
    const svg = grid.current?.querySelector<SVGElement>(`[data-key="${sel}"] svg`) ?? null
    const r = await shareCard(svg, VIZ_HEX[i % 5]!, name, desc, t('ach.shareText', { name, desc }))
    if (r === 'saved') showToast(t('ach.shared'), { icon: 'image' })
  }

  return (
    <AppSheet entry={entry} title={head('achievements', t('stats.achievements'))} detent={0.78}>
      <div style={{ padding: '8px 16px 40px' }}>
        <div className={s.card} style={{ margin: 0, padding: '20px 12px 16px' }}>
          <div ref={grid} className={m.achGrid} role="radiogroup" aria-label={t('stats.achievements')}>
            {ACHIEVEMENTS.map((a, idx) => {
              const u = unlocked.has(a.key)
              return (
                <button key={a.key} type="button" role="radio" aria-checked={a.key === sel} data-key={a.key} className={m.achItem} aria-label={`${t(`ach.names.${a.key}`)}, ${u ? t('ach.unlocked') : t('ach.locked')}`} onClick={() => setSel(a.key)}>
                  <span className={[m.achBig, u ? m.achOn : '', a.key === sel ? m.achSel : ''].join(' ')} style={u ? { backgroundColor: VIZ[idx % 5] } : undefined}>
                    <Icon name={a.icon} weight="fill" size={26} />
                  </span>
                  <span className={u ? `${m.achName} ${m.achNameOn}` : m.achName}>{t(`ach.names.${a.key}`)}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className={s.card} style={{ margin: '12px 0 0', padding: '16px 20px' }} aria-live="polite">
          <div style={{ font: '600 var(--fs-20) var(--font-sans)' }}>{name}</div>
          <div className={s.sub} style={{ marginTop: 2 }}>
            {desc} · {on ? `${t('ach.unlocked')} ${fmtShortDate(toDateStr(new Date(unlocked.get(sel)!)))}` : `${t('ach.locked')} · ${t('ach.progress', { now, target })}`}
          </div>
          {on && (
            <div style={{ marginTop: 14 }}>
              <Button variant="secondary" size="md" icon="export" onClick={() => void share()}>
                {t('ach.share')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppSheet>
  )
}

/* ── History: one day's log ───────────────────────────────── */
export function DayLogSheet({ entry }: E<'dayLog'>) {
  const { t } = useTranslation()
  const lagos = useStore((x) => x.lagos)
  const checkIns = useStore((x) => x.checkIns)
  const runs = useStore((x) => x.runs)
  const practiceLogs = useStore((x) => x.practiceLogs)
  const journal = useStore((x) => x.journal)
  const reflections = useStore((x) => x.reflections)
  const events = useMemo(() => dayEvents(entry.date, { lagos, checkIns, runs, practiceLogs, journal, reflections }), [entry.date, lagos, checkIns, runs, practiceLogs, journal, reflections])
  return (
    <AppSheet entry={entry} title={fmtDayTitle(entry.date)} detent={0.6}>
      <div style={{ padding: '8px 16px 40px' }}>
        <div className={s.card} style={{ margin: 0, padding: '4px 16px' }}>
          {events.map((e, i) => (
            <div key={i} className={m.logRow}>
              <div className={m.logIcon}>
                <Icon name={e.icon} weight="fill" size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: '400 var(--fs-17)/1.3 var(--font-sans)' }}>{t(`stats.ev.${e.key}`, { name: e.name, count: e.count })}</div>
                <div className={s.statL}>{t(`stats.kind.${e.kind}`)}</div>
              </div>
              {e.at && <span className={m.logTime}>{fmtTime(e.at)}</span>}
            </div>
          ))}
          {events.length === 0 && <div className={s.sub} style={{ padding: '26px 0', textAlign: 'center' }}>{t('stats.nothingLogged')}</div>}
        </div>
      </div>
    </AppSheet>
  )
}
