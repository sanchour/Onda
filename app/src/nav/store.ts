import { create } from 'zustand'
import type { GalleryLago } from '@/data/catalog'
import type { AchievementKey } from '@/data/derive/achievements'
import type { MenuSpec } from '@/ui/Menu'

export type Tab = 'lagos' | 'ondas' | 'stats'
export type SettingsPage = 'subscription' | 'appearance' | 'notifications' | 'practice' | 'integrations' | 'data' | 'privacy' | 'help'

/** Pushed, full-screen pages. They slide in from the right and support edge-swipe back. */
export type Route =
  | { name: 'gallery' }
  | { name: 'category'; cat: string }
  | { name: 'top' }
  | { name: 'lago'; id: string }
  | { name: 'allOndas' }
  | { name: 'onda'; id: string }
  | { name: 'immersion' }
  | { name: 'reflection' }
  | { name: 'done'; ondaId: string; kept: number }
  | { name: 'settings'; page?: SettingsPage }
  | { name: 'paywall' }

export type SheetRoute =
  | { name: 'checkin'; lagoId: string }
  | { name: 'lagoForm'; editId?: string }
  | { name: 'lagoInfo'; info: GalleryLago }
  | { name: 'journalList' }
  | { name: 'journalEdit' }
  | { name: 'philosophy' }
  | { name: 'guide'; ondaId: string }
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

export type StackEntry = Route & { key: string; leaving?: boolean }
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
  tab: 'lagos',
  stack: [],
  sheets: [],
  menu: null,
  toast: null,

  setTab: (tab) => set({ tab, menu: null }),
  push: (r) => set({ stack: [...get().stack.filter((e) => !e.leaving), { ...r, key: key() }], menu: null }),
  pop: () => {
    const st = get().stack
    const top = st[st.length - 1]
    if (top && !top.leaving) set({ stack: st.map((e) => (e === top ? { ...e, leaving: true } : e)), menu: null })
  },
  remove: (k) => set({ stack: get().stack.filter((e) => e.key !== k) }),
  popToRoot: (tab) => set({ stack: [], sheets: [], menu: null, ...(tab ? { tab } : {}) }),
  replaceTop: (r) => set({ stack: [...get().stack.slice(0, -1), { ...r, key: key() }] }),
  openSheet: (s) => set({ sheets: [...get().sheets, { ...s, key: key() }], menu: null }),
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
