import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { Route, SheetRoute } from '@/nav/store'

/* Route-level code splitting: pushed pages and sheets load on demand, grouped by area. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Lazy = LazyExoticComponent<ComponentType<any>>
const pick = <M, K extends keyof M>(load: () => Promise<M>, key: K): Lazy => lazy(() => load().then((m) => ({ default: m[key] as ComponentType<unknown> })))

const gallery = () => import('@/screens/Gallery')
const ondasTab = () => import('@/screens/OndasTab')
const ondaFlow = () => import('@/screens/OndaFlow')
const lagoSheets = () => import('@/sheets/LagoSheets')
const ondaSheets = () => import('@/sheets/OndaSheets')
const statsSheets = () => import('@/sheets/StatsSheets')
const settingsSheets = () => import('@/sheets/SettingsSheets')

export const ROUTES: Record<Route['name'], Lazy> = {
  gallery: pick(gallery, 'Gallery'),
  category: pick(gallery, 'Category'),
  lago: lazy(() => import('@/screens/LagoInsights')),
  paywall: lazy(() => import('@/screens/Paywall')),
  allOndas: pick(ondasTab, 'AllOndas'),
  onda: lazy(() => import('@/screens/OndaToday')),
  immersion: pick(ondaFlow, 'Immersion'),
  reflection: pick(ondaFlow, 'Reflection'),
  done: pick(ondaFlow, 'Done'),
  settings: lazy(() => import('@/screens/Settings')),
}

export const SHEETS: Record<SheetRoute['name'], Lazy> = {
  checkin: pick(lagoSheets, 'CheckInSheet'),
  lagoForm: pick(lagoSheets, 'LagoFormSheet'),
  lagoInfo: pick(lagoSheets, 'LagoInfoSheet'),
  time: pick(lagoSheets, 'TimeSheet'),
  journalList: pick(ondaSheets, 'JournalListSheet'),
  journalEdit: pick(ondaSheets, 'JournalEditSheet'),
  mediaInfo: pick(ondaSheets, 'MediaInfoSheet'),
  philosophy: pick(ondaSheets, 'PhilosophySheet'),
  guide: pick(ondaSheets, 'GuideSheet'),
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
