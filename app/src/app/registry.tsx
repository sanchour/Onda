import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { Route, SheetRoute } from '@/nav/store'

/* Route-level code splitting: pushed pages and sheets load on demand, grouped by area. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Lazy = LazyExoticComponent<ComponentType<any>>
const pick = <M, K extends keyof M>(load: () => Promise<M>, key: K): Lazy => lazy(() => load().then((m) => ({ default: m[key] as ComponentType<unknown> })))

const gallery = () => import('@/screens/Gallery')
const ondasTab = () => import('@/screens/OndasTab')
const ondaFlow = () => import('@/screens/OndaFlow')
const ondaPages = () => import('@/screens/OndaPages')
const lagoSheets = () => import('@/sheets/LagoSheets')
const ondaSheets = () => import('@/sheets/OndaSheets')
const statsSheets = () => import('@/sheets/StatsSheets')
const settingsSheets = () => import('@/sheets/SettingsSheets')

/** Warm the on-demand screens so a tap never waits on the network (a first tap that shows nothing makes people tap twice).
 *  One chunk per idle slice, so launch and the first interactions are never competing with it. */
export function prefetchChunks() {
  const loaders = [ondaPages, lagoSheets, ondaSheets, () => import('@/screens/Settings'), gallery, () => import('@/screens/Guide'), () => import('@/screens/OndaToday'), ondaFlow, statsSheets, settingsSheets, () => import('@/screens/LagoInsights')]
  const idle = (cb: () => void) => ('requestIdleCallback' in window ? window.requestIdleCallback(cb, { timeout: 3000 }) : setTimeout(cb, 600))
  const next = (i: number) => {
    const load = loaders[i]
    if (!load) return
    idle(() => {
      void load().catch(() => undefined)
      next(i + 1)
    })
  }
  next(0)
}

export const ROUTES: Record<Route['name'], Lazy> = {
  gallery: pick(gallery, 'Gallery'),
  category: pick(gallery, 'Category'),
  lago: lazy(() => import('@/screens/LagoInsights')),
  paywall: lazy(() => import('@/screens/Paywall')),
  allOndas: pick(ondasTab, 'AllOndas'),
  onda: lazy(() => import('@/screens/OndaToday')),
  immersion: pick(ondaFlow, 'Immersion'),
  guide: lazy(() => import('@/screens/Guide')),
  journal: pick(ondaPages, 'JournalPage'),
  philosophy: pick(ondaPages, 'PhilosophyPage'),
  rules: pick(ondaPages, 'RulesPage'),
  pickOndas: pick(gallery, 'PickOndas'),
  reflection: pick(ondaFlow, 'Reflection'),
  done: pick(ondaFlow, 'Done'),
  settings: lazy(() => import('@/screens/Settings')),
  link: lazy(() => import('@/screens/LinkDevices')),
}

export const SHEETS: Record<SheetRoute['name'], Lazy> = {
  checkin: pick(lagoSheets, 'CheckInSheet'),
  lagoForm: pick(lagoSheets, 'LagoFormSheet'),
  lagoInfo: pick(lagoSheets, 'LagoInfoSheet'),
  ondaPractices: pick(lagoSheets, 'OndaPracticesSheet'),
  time: pick(lagoSheets, 'TimeSheet'),
  journalEdit: pick(ondaSheets, 'JournalEditSheet'),
  mediaInfo: pick(ondaSheets, 'MediaInfoSheet'),
  practiceInfo: pick(ondaSheets, 'PracticeInfoSheet'),
  createOnda: pick(() => import('@/sheets/CreateOndaSheet'), 'CreateOndaSheet'),
  achievements: pick(statsSheets, 'AchievementsSheet'),
  dayLog: pick(statsSheets, 'DayLogSheet'),
  notion: pick(settingsSheets, 'NotionSheet'),
  calendar: pick(settingsSheets, 'CalendarSheet'),
  reminders: pick(settingsSheets, 'RemindersSheet'),
  notifPrompt: pick(settingsSheets, 'NotifPromptSheet'),
  account: pick(settingsSheets, 'AccountSheet'),
  whatsNew: pick(settingsSheets, 'WhatsNewSheet'),
  legal: pick(settingsSheets, 'LegalSheet'),
}
