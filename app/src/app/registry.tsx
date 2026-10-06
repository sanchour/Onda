import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { Route, SheetRoute } from '@/nav/store'

/* Route-level code splitting: every pushed page and every sheet is its own chunk. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Lazy = LazyExoticComponent<ComponentType<any>>
const pick = <M, K extends keyof M>(load: () => Promise<M>, key: K): Lazy => lazy(() => load().then((m) => ({ default: m[key] as ComponentType<unknown> })))

const gallery = () => import('@/screens/Gallery')
const lagoSheets = () => import('@/sheets/LagoSheets')

export const ROUTES: Record<Route['name'], Lazy> = {
  gallery: pick(gallery, 'Gallery'),
  category: pick(gallery, 'Category'),
  top: pick(gallery, 'TopLagos'),
  lago: lazy(() => import('@/screens/LagoInsights')),
  paywall: lazy(() => import('@/screens/Paywall')),
  allOndas: lazy(() => import('@/screens/Stub')),
  onda: lazy(() => import('@/screens/Stub')),
  immersion: lazy(() => import('@/screens/Stub')),
  reflection: lazy(() => import('@/screens/Stub')),
  done: lazy(() => import('@/screens/Stub')),
  settings: lazy(() => import('@/screens/Stub')),
}

const stubSheet = lazy(() => import('@/screens/Stub'))
export const SHEETS: Record<SheetRoute['name'], Lazy> = {
  checkin: pick(lagoSheets, 'CheckInSheet'),
  lagoForm: pick(lagoSheets, 'LagoFormSheet'),
  lagoInfo: pick(lagoSheets, 'LagoInfoSheet'),
  time: pick(lagoSheets, 'TimeSheet'),
  journalList: stubSheet, journalEdit: stubSheet, philosophy: stubSheet, guide: stubSheet, createOnda: stubSheet, achievements: stubSheet,
  dayLog: stubSheet, notion: stubSheet, calendar: stubSheet, reminders: stubSheet, notifPrompt: stubSheet, account: stubSheet, whatsNew: stubSheet, legal: stubSheet,
}
