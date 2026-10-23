/* Light, zod-free half of the data model. The schemas (and zod itself) live in schemas.ts and are loaded only when a file is
   imported, a sync row is checked or a custom Onda is read, so they stay off the start-up path. Types come from the schemas. */
import type { Settings } from './schemas'

export type * from './schemas'

export const COLLECTIONS = ['user', 'lagos', 'checkIns', 'runs', 'practiceLogs', 'ruleLogs', 'taskLogs', 'immerseLogs', 'journal', 'reflections', 'achievements', 'customOndas'] as const
export type Collection = (typeof COLLECTIONS)[number]

/** What SettingsSchema.parse({}) returns. A unit test keeps the two in step. */
export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  avatarPhoto: '',
  avatarIcon: '',
  avatarTone: 'blue',
  themeMode: 'auto',
  ondaThemes: true,
  ondaTint: true,
  nativeHeads: false,
  defaultOndaLength: 14,
  reminderTime: '08:00',
  eveningTime: '21:30',
  notifDaily: true,
  notifEvening: true,
  notifMilestones: true,
  weekStart: 'monday',
  includeFood: true,
  haptics: true,
  sounds: false,
  appLock: false,
  hideInSwitcher: false,
  a2hsDismissed: false,
  timezone: 'UTC',
  notionLagos: true,
  notionOndas: true,
  notionReflections: true,
  notionAuto: true,
}

/** Fill any missing setting with its default (older records predate newer settings). */
export const withDefaults = (s: Partial<Settings> | undefined | null): Settings => ({ ...DEFAULT_SETTINGS, ...s })
