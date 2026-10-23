import { create } from 'zustand'
import type { MediaItem, MediaKind } from '@/content'
import type { GalleryLago } from '@/data/catalog'
import type { AchievementKey } from '@/data/derive/achievements'
import type { MenuSpec } from '@/ui/Menu'

export type Tab = 'lagos' | 'ondas' | 'stats'
export type SettingsPage = 'subscription' | 'appearance' | 'integrations' | 'data' | 'help'

/** Pushed, full-screen pages. They slide in from the right and support edge-swipe back. */
export type Route =
  | { name: 'gallery' }
  | { name: 'category'; cat: string }
  | { name: 'lago'; id: string }
  | { name: 'allOndas' }
  | { name: 'onda'; id: string; length?: number }
  | { name: 'immersion'; kind?: MediaKind }
  | { name: 'guide'; ondaId: string }
  | { name: 'journal' }
  | { name: 'journalWrite'; day?: number }
  | { name: 'philosophy' }
  | { name: 'rules' }
  | { name: 'pickOndas' }
  | { name: 'reflection' }
  | { name: 'done'; ondaId: string; kept: number }
  | { name: 'settings'; page?: SettingsPage }
  | { name: 'paywall' }
  | { name: 'link' }

export type SheetRoute =
  | { name: 'checkin'; lagoId: string }
  | { name: 'lagoForm'; editId?: string }
  | { name: 'lagoInfo'; info: GalleryLago }
  | { name: 'ondaPractices'; ondaId: string }
  | { name: 'mediaInfo'; item: MediaItem; ondaId: string; runId?: string; note?: string }
  | { name: 'practiceInfo'; ondaId: string; practiceId: string; twist?: string }
  | { name: 'createOnda' }
  | { name: 'achievements'; focus?: AchievementKey }
  | { name: 'dayLog'; date: string }
  | { name: 'notion' }
  | { name: 'calendar' }
  | { name: 'reminders' }
  | { name: 'notifPrompt' }
  | { name: 'time'; title: string; value: string; onPick: (hhmm: string) => void }
  | { name: 'account' }
  | { name: 'whatsNew' }
  | { name: 'legal'; doc: 'privacy' | 'terms' }

/** `instant`: arrived by a sidebar jump on the desktop, so it fades in instead of sliding. */
export type StackEntry = Route & { key: string; leaving?: boolean; instant?: boolean }
export type SheetEntry = SheetRoute & { key: string; closing?: boolean }

interface NavState {
  tab: Tab
  stack: StackEntry[]
  sheets: SheetEntry[]
  menu: MenuSpec | null
  toast: { id: number; text: string; icon?: string; action?: { label: string; run: () => void } } | null

  setTab: (t: Tab) => void
  push: (r: Route) => void
  /** Animated pop of the top page. */
  pop: () => void
  /** Remove a page with no animation (the gesture already moved it off screen). */
  remove: (key: string) => void
  popToRoot: (tab?: Tab) => void
  replaceTop: (r: Route) => void
  /** Put back a tab and its pushed pages, with no animation history (after a reload). */
  restore: (tab: Tab, routes: Route[]) => void
  /** Desktop sidebar: show a tab and these pages at once, with a fade rather than a slide. */
  jump: (tab: Tab, routes?: Route[]) => void
  openSheet: (s: SheetRoute) => void
  closeSheet: (key?: string) => void
  /** Swap the top sheet for another one, e.g. journal list -> editor -> back to list. */
  swapSheet: (s: SheetRoute) => void
  sheetExited: (key: string) => void
  openMenu: (m: MenuSpec) => void
  closeMenu: () => void
  showToast: (text: string, opts?: { icon?: string; action?: { label: string; run: () => void } }) => void
  clearToast: () => void
}

let n = 0
const key = () => `k${++n}`

export const useNav = create<NavState>()((set, get) => ({
  tab: 'ondas',
  stack: [],
  sheets: [],
  menu: null,
  toast: null,

  setTab: (tab) => set({ tab, menu: null }),
  push: (r) => {
    const live = get().stack.filter((e) => !e.leaving)
    const top = live[live.length - 1]
    // Tapping twice on a slow page must not push it twice
    if (top && top.name === r.name && JSON.stringify({ ...top, key: 0 }) === JSON.stringify({ ...r, key: 0 })) return
    set({ stack: [...live, { ...r, key: key() }], menu: null })
  },
  pop: () => {
    const st = get().stack
    const top = st[st.length - 1]
    if (top && !top.leaving) set({ stack: st.map((e) => (e === top ? { ...e, leaving: true } : e)), menu: null })
  },
  remove: (k) => set({ stack: get().stack.filter((e) => e.key !== k) }),
  popToRoot: (tab) => set({ stack: [], sheets: [], menu: null, ...(tab ? { tab } : {}) }),
  replaceTop: (r) => set({ stack: [...get().stack.slice(0, -1), { ...r, key: key() }] }),
  restore: (tab, routes) => set({ tab, stack: routes.map((r) => ({ ...r, key: key() })), sheets: [], menu: null }),
  jump: (tab, routes = []) => set({ tab, stack: routes.map((r) => ({ ...r, key: key(), instant: true })), sheets: [], menu: null }),
  openSheet: (s) => {
    // A second tap while the first sheet is still arriving must not stack another one.
    const top = get().sheets.find((e) => !e.closing && e.name === s.name && s.name !== 'time')
    if (top && (s.name === 'createOnda' || s.name === 'achievements')) return
    set({ sheets: [...get().sheets, { ...s, key: key() }], menu: null })
  },
  closeSheet: (k) => {
    const sh = get().sheets
    const target = k ?? sh[sh.length - 1]?.key
    set({ sheets: sh.map((e) => (e.key === target ? { ...e, closing: true } : e)) })
  },
  swapSheet: (s) => {
    const sh = get().sheets
    set({ sheets: [...sh.map((e, i) => (i === sh.length - 1 ? { ...e, closing: true } : e)), { ...s, key: key() }] })
  },
  sheetExited: (k) => set({ sheets: get().sheets.filter((e) => e.key !== k) }),
  openMenu: (menu) => set({ menu }),
  closeMenu: () => set({ menu: null }),
  showToast: (text, opts) => set({ toast: { id: ++n, text, ...opts } }),
  clearToast: () => set({ toast: null }),
}))

/** Imperative handle for non-component code. */
export const nav = () => useNav.getState()
