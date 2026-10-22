import { create } from 'zustand'

/* Desktop-only UI state: the command palette, the keyboard shortcut sheet and the practice focus session.
   None of it is saved; it lives as long as the window. */

export interface FocusSession {
  runId: string
  practiceId: string
  /** Shown while the content loads, and for practices from a run snapshot. */
  name: string
  minutes: number
}

interface DeskUI {
  palette: boolean
  shortcuts: boolean
  focus: FocusSession | null
  /** The sidebar can fold away to give the stage the whole window. */
  sidebar: boolean
  openPalette: () => void
  closePalette: () => void
  togglePalette: () => void
  setShortcuts: (on: boolean) => void
  startFocus: (f: FocusSession) => void
  endFocus: () => void
  toggleSidebar: () => void
}

const SIDEBAR_KEY = 'onda.desk.sidebar'
const sidebarStart = () => {
  try {
    return localStorage.getItem(SIDEBAR_KEY) !== '0'
  } catch {
    return true
  }
}

export const useDeskUI = create<DeskUI>()((set, get) => ({
  palette: false,
  shortcuts: false,
  focus: null,
  sidebar: sidebarStart(),
  openPalette: () => set({ palette: true, shortcuts: false }),
  closePalette: () => set({ palette: false }),
  togglePalette: () => set({ palette: !get().palette, shortcuts: false }),
  setShortcuts: (shortcuts) => set({ shortcuts, palette: false }),
  startFocus: (focus) => set({ focus, palette: false, shortcuts: false }),
  endFocus: () => set({ focus: null }),
  toggleSidebar: () => {
    const sidebar = !get().sidebar
    try {
      localStorage.setItem(SIDEBAR_KEY, sidebar ? '1' : '0')
    } catch {
      /* private mode */
    }
    set({ sidebar })
  },
}))
