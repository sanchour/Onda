import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { GROUP_OF } from '@/content/browse'
import type { OndaIndex } from '@/content/schema'
import type { OndaLook } from '@/content/themes'
import { lagoStats, type LagoStats } from '@/data/derive/lago'
import type { DayPractice } from '@/data/derive/plan'
import { useLagos, useLookFn, useOndaList, useSettings } from '@/data/hooks'
import { useStore } from '@/data/store'
import type { Lago } from '@/data/types'
import { useNav, type SettingsPage } from '@/nav/store'
import { guardNewLago } from '@/screens/lagoActions'
import { guardCreateOnda } from '@/screens/ondaShared'
import { focusFor, nextUndone, practiceTitle, useTodayPlan } from '../focus/today'
import { go } from '../keys/go'
import type { KeyName } from '../keys/Kbd'
import { useDeskUI } from '../store'
import { match, normQuery, type Field } from './fuzzy'

/* Everything the palette can find, built from the same stores and derivations the screens use, and the search over it.
   Each item has one primary action (Enter) and up to two more (Cmd or Ctrl+Enter, Shift+Enter). */

export type Group = 'today' | 'lagos' | 'ondas' | 'go' | 'settings' | 'actions'
export type Kind = 'onda' | 'practice' | 'lago' | 'page' | 'action'

export interface Act {
  label: string
  icon?: string
  run: () => void
  /** Keep the palette open afterwards (ticks and switches). */
  stay?: boolean
}

export interface PItem {
  key: string
  group: Group
  kind: Kind
  title: string
  sub?: string
  /** Searched but not shown. */
  terms?: string
  icon: string
  /** Onda results show a small cover. */
  look?: OndaLook
  /** A tick or switch: practices, Lagos, appearance. */
  checked?: boolean
  badge?: string
  /** Its own keyboard shortcut, shown at the end of the row. */
  keys?: KeyName[]
  primary: Act
  alt?: Act
  focus?: Act
  /** Only offered while the query is empty. */
  suggestOnly?: boolean
  /** Hidden from the empty palette (found by searching). */
  searchOnly?: boolean
  onda?: OndaIndex & { groupLabel?: string; dayLabel?: string }
  practice?: DayPractice
  lago?: { lago: Lago; st: LagoStats }
}

export interface Row {
  item: PItem
  marks: Map<number, number[]>
  score: number
}
export interface Section {
  group: Group
  rows: Row[]
}

const GROUPS: Group[] = ['today', 'lagos', 'go', 'actions', 'ondas', 'settings']
const LIMIT: Record<Group, number> = { today: 6, lagos: 6, ondas: 8, go: 6, settings: 6, actions: 6 }
// Settings opens over the tab you are on, as the sidebar does
const here = () => useNav.getState().tab
const HUB: [string, SettingsPage][] = [['seal-check', 'subscription'], ['paint-brush', 'appearance'], ['arrows-clockwise', 'integrations'], ['database', 'data'], ['question', 'help']]

export function usePaletteItems(): PItem[] {
  const { t } = useTranslation()
  const today = useTodayPlan()
  const ondas = useOndaList()
  const lookFn = useLookFn()
  const lagos = useLagos()
  const checkIns = useStore((s) => s.checkIns)
  const date = useStore((s) => s.today)
  const themeMode = useSettings().themeMode

  return useMemo(() => {
    const { openSheet } = useNav.getState()
    const ui = useDeskUI.getState()
    const store = useStore.getState()
    const out: PItem[] = []
    const lead = (k: string) => t(`plan.lead.${k}`)
    const active = today?.active
    const runName = active ? active.index?.name ?? active.run.snapshot?.name ?? '' : ''

    // ── Today's practices ──
    if (today && active) {
      const { run, content } = active
      for (const p of today.plan) {
        const done = today.done.has(p.id)
        const title = practiceTitle(p, lead)
        const head = t(`slot.${p.slot}`)
        const meta = p.meta.startsWith(`${head} · `) ? p.meta.slice(head.length + 3) : p.meta
        out.push({
          key: `p:${p.id}`,
          group: 'today',
          kind: 'practice',
          title,
          sub: [head, meta].filter(Boolean).join(' · '),
          terms: runName,
          icon: p.icon,
          checked: done,
          practice: p,
          primary: { label: done ? t('power.palette.markNotDone') : t('power.palette.markDone'), stay: true, run: () => store.togglePractice(run.id, p.id) },
          alt: p.practiceId
            ? { label: t('power.palette.howTo'), icon: 'info', run: () => openSheet({ name: 'practiceInfo', ondaId: run.ondaId, practiceId: p.id, twist: p.twist }) }
            : p.item
              ? { label: t('plan.open'), icon: 'arrow-up-right', run: () => openSheet({ name: 'mediaInfo', item: p.item!, ondaId: run.ondaId, runId: run.id, note: p.note }) }
              : undefined,
          focus: { label: t('power.palette.focus'), icon: 'timer', run: () => ui.startFocus(focusFor(run.id, p, title, content)) },
        })
      }
    }

    // ── Lagos: tick today's check in, or open the insights ──
    const rows = lagos.map((lago) => ({ lago, st: lagoStats(lago, checkIns, date) }))
    const order = (r: (typeof rows)[number]) => (r.st.phase !== 'active' ? 2 : r.st.doneToday ? 1 : 0)
    rows.sort((a, b) => order(a) - order(b))
    for (const { lago, st } of rows) {
      const live = st.phase === 'active'
      const insights = { label: t('power.palette.insights'), icon: 'chart-bar', run: () => go('lagos', [{ name: 'lago', id: lago.id }]) }
      out.push({
        key: `l:${lago.id}`,
        group: 'lagos',
        kind: 'lago',
        title: lago.name,
        sub: st.phase === 'finished' ? t('lagos.finishedMeta', { count: lago.lengthDays }) : st.phase === 'ended' ? t('lagos.endedMeta', { day: st.day }) : t('lagos.dayMeta', { day: st.day, freq: t(`freq.${lago.frequency}`) }),
        terms: lago.why,
        icon: lago.icon,
        checked: live ? st.doneToday : undefined,
        searchOnly: !live,
        lago: { lago, st },
        primary: live ? { label: st.doneToday ? t('power.palette.undoCheckIn') : t('power.palette.checkIn'), stay: true, run: () => store.toggleCheckInToday(lago.id) } : insights,
        alt: live ? insights : undefined,
      })
    }

    // ── Places ──
    const page = (key: string, icon: string, title: string, run: () => void, extra: Partial<PItem> = {}): PItem => ({ key: `g:${key}`, group: 'go', kind: 'page', title, icon, primary: { label: t('power.palette.open'), run }, ...extra })
    if (active) {
      const { run, look, index } = active
      out.push(page('onda', index?.icon ?? 'waves', runName, () => go('ondas', [{ name: 'onda', id: run.ondaId }]), { kind: 'onda', look, sub: t('ondas.dayOf', { day: active.day, length: run.lengthDays }), suggestOnly: true, onda: index && { ...index, dayLabel: t('ondas.dayOf', { day: active.day, length: run.lengthDays }) } }))
    }
    out.push(
      page('today', 'sun-horizon', t('desk.today'), () => go('ondas'), { keys: ['t'], terms: t('power.palette.kw.today') }),
      page('browse', 'compass', t('desk.browse'), () => go('ondas', [{ name: 'allOndas' }]), { keys: ['b'], terms: t('power.palette.kw.browse') }),
      page('lagos', 'wave-soft', t('tabs.lagos'), () => go('lagos'), { keys: ['l'] }),
      page('stats', 'chart-bar', t('tabs.stats'), () => go('stats'), { keys: ['s'], terms: t('power.palette.kw.stats') }),
      page('settings', 'gear-six', t('settings.title'), () => go(here(), [{ name: 'settings' }]), { keys: [','] }),
      page('gallery', 'squares-four', t('power.palette.gallery'), () => go('lagos', [{ name: 'gallery' }]), { searchOnly: true, terms: t('power.palette.kw.gallery') }),
    )
    if (active) {
      const { run } = active
      const sub = runName
      out.push(
        page('immersion', 'headphones', t('immersion.title'), () => go('ondas', [{ name: 'immersion' }]), { sub, searchOnly: true }),
        page('journal', 'notebook', t('journal.title'), () => go('ondas', [{ name: 'journal' }]), { sub, searchOnly: true }),
        page('philosophy', 'lightbulb', t('philosophy.title'), () => go('ondas', [{ name: 'philosophy' }]), { sub, searchOnly: true }),
        page('guide', 'book-open-text', t('ondas.guide'), () => go('ondas', [{ name: 'guide', ondaId: run.ondaId }]), { sub, searchOnly: true }),
        page('rules', 'scales', t('ondas.rules'), () => go('ondas', [{ name: 'rules' }]), { sub, searchOnly: true }),
      )
    }

    // ── Settings pages ──
    for (const [icon, key] of HUB) {
      out.push({
        key: `s:${key}`,
        group: 'settings',
        kind: 'page',
        title: t(`settings.hub.${key}`),
        sub: t('settings.title'),
        terms: t(`power.palette.kw.${key}`),
        icon,
        searchOnly: true,
        primary: { label: t('power.palette.open'), run: () => go(here(), [{ name: 'settings' }, { name: 'settings', page: key }]) },
      })
    }

    // ── Actions ──
    const action = (key: string, icon: string, title: string, run: () => void, extra: Partial<PItem> = {}): PItem => ({ key: `a:${key}`, group: 'actions', kind: 'action', title, icon, primary: { label: t('power.palette.run'), run }, ...extra })
    out.push(
      action('newLago', 'plus-circle', t('power.palette.newLago'), () => guardNewLago(t) && openSheet({ name: 'lagoForm' }), { terms: t('power.palette.kw.newLago') }),
      action('createOnda', 'plus', t('power.palette.createOnda'), () => guardCreateOnda(t) && openSheet({ name: 'createOnda' }), { terms: t('power.palette.kw.createOnda') }),
    )
    if (active) {
      out.push(action('journal', 'pencil-simple', t('power.palette.writeJournal'), () => openSheet({ name: 'journalEdit' }), { sub: runName }))
      const next = today && nextUndone(today.plan, today.done)
      if (next) {
        const title = practiceTitle(next, lead)
        out.push(action('focus', 'timer', t('power.palette.focusNext'), () => ui.startFocus(focusFor(active.run.id, next, title, active.content)), { sub: title, keys: ['f'], terms: t('power.palette.kw.focus') }))
      }
    }
    out.push(
      action('link', 'devices', t('power.palette.link'), () => go(here(), [{ name: 'link' }]), { terms: t('power.palette.kw.link') }),
      action('shortcuts', 'keyboard', t('power.palette.shortcuts'), () => ui.setShortcuts(true), { keys: ['?'], terms: t('power.palette.kw.shortcuts') }),
    )
    for (const [mode, icon] of [['light', 'sun'], ['dark', 'moon'], ['auto', 'sun-dim']] as const) {
      out.push(
        action(`theme-${mode}`, icon, t(`power.palette.theme.${mode}`), () => store.updateSettings({ themeMode: mode }), {
          checked: themeMode === mode,
          terms: t('power.palette.kw.appearance'),
          searchOnly: true,
          primary: { label: t('power.palette.choose'), stay: true, run: () => store.updateSettings({ themeMode: mode }) },
        }),
      )
    }
    out.push(action('sidebar', 'sidebar-simple', t('power.palette.sidebar'), () => ui.toggleSidebar(), { keys: ['mod', '\\'], searchOnly: true }))

    // ── Ondas: all sixty-four and your own ──
    for (const o of ondas) {
      const g = GROUP_OF[o.id] ?? (o.custom ? 'mine' : undefined)
      const groupLabel = g ? t(`browse.short.${g}`) : undefined
      const running = active?.run.ondaId === o.id
      out.push({
        key: `o:${o.id}`,
        group: 'ondas',
        kind: 'onda',
        title: o.name,
        sub: o.origin,
        terms: groupLabel,
        icon: o.icon,
        look: lookFn(o),
        badge: running ? t('ondas.active') : o.custom ? t('ondas.mine') : undefined,
        searchOnly: true,
        onda: { ...o, groupLabel, dayLabel: running && active ? t('ondas.dayOf', { day: active.day, length: active.run.lengthDays }) : undefined },
        primary: { label: t('power.palette.open'), run: () => go('ondas', [{ name: 'onda', id: o.id }]) },
      })
    }
    return out
  }, [t, today, ondas, lookFn, lagos, checkIns, date, themeMode])
}

/** The palette's sections for a query: suggestions when it is empty, else matches ranked within and across groups. */
export function search(items: PItem[], query: string): Section[] {
  const words = normQuery(query)
  if (!words.length) {
    return GROUPS.map((group) => ({ group, rows: items.filter((it) => it.group === group && !it.searchOnly).map((item) => ({ item, marks: new Map(), score: 0 })) })).filter((s) => s.rows.length)
  }
  const by = new Map<Group, Row[]>()
  for (const item of items) {
    if (item.suggestOnly) continue
    const fields: Field[] = [{ text: item.title, weight: 1, show: true }]
    if (item.sub) fields.push({ text: item.sub, weight: 0.62, show: true })
    if (item.terms) fields.push({ text: item.terms, weight: 0.5 })
    const hit = match(words, fields)
    if (!hit) continue
    const list = by.get(item.group) ?? []
    list.push({ item, marks: hit.marks, score: hit.score })
    by.set(item.group, list)
  }
  const sections: Section[] = []
  for (const [group, rows] of by) {
    rows.sort((a, b) => b.score - a.score)
    sections.push({ group, rows: rows.slice(0, LIMIT[group]) })
  }
  // the group holding the best match comes first; ties keep the usual order
  return sections.sort((a, b) => b.rows[0]!.score - a.rows[0]!.score || GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group))
}
