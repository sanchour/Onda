import { z } from 'zod'
import type { Collection } from './types'

/* Local-first data model. Dexie is the source of truth on the device; the server is a replica.
   Every record carries id, updatedAt, deletedAt?, deviceId, plus `_f`: a per-field timestamp map
   used to resolve conflicts last-write-wins per field (see merge.ts). */

const base = {
  id: z.string(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable().optional(),
  deviceId: z.string(),
  _f: z.record(z.string(), z.number()).optional(),
}

export const SettingsSchema = z.object({
  onboarded: z.boolean().default(false),
  /** Profile picture: a small square photo (data URL), or an icon on a colour. Empty icon means initials. */
  avatarPhoto: z.string().default(''),
  avatarIcon: z.string().default(''),
  avatarTone: z.enum(['blue', 'green', 'yellow', 'coral', 'purple']).default('blue'),
  themeMode: z.enum(['light', 'dark', 'auto']).default('auto'),
  ondaThemes: z.boolean().default(true),
  /** A very light wash of the running Onda's colour behind every screen. */
  ondaTint: z.boolean().default(true),
  defaultOndaLength: z.number().int().min(7).max(30).default(14),
  reminderTime: z.string().default('08:00'),
  eveningTime: z.string().default('21:30'),
  notifDaily: z.boolean().default(true),
  notifEvening: z.boolean().default(true),
  notifMilestones: z.boolean().default(true),
  weekStart: z.enum(['monday', 'sunday']).default('monday'),
  includeFood: z.boolean().default(true),
  haptics: z.boolean().default(true),
  sounds: z.boolean().default(false),
  appLock: z.boolean().default(false),
  hideInSwitcher: z.boolean().default(false),
  a2hsDismissed: z.boolean().default(false),
  timezone: z.string().default('UTC'),
  notionLagos: z.boolean().default(true),
  notionOndas: z.boolean().default(true),
  notionReflections: z.boolean().default(true),
  notionAuto: z.boolean().default(true),
})
export type Settings = z.infer<typeof SettingsSchema>

export const UserSchema = z.object({
  ...base,
  name: z.string(),
  createdAt: z.string(),
  plus: z.enum(['none', 'trial', 'lifetime']),
  trialStartedAt: z.string().nullable().optional(),
  settings: SettingsSchema,
})
export type User = z.infer<typeof UserSchema>

export const FrequencySchema = z.enum(['daily', 'weekdays', 'weekly'])
export type Frequency = z.infer<typeof FrequencySchema>

export const LagoSchema = z.object({
  ...base,
  name: z.string(),
  icon: z.string(),
  why: z.string(),
  lengthDays: z.number().int().min(1),
  frequency: FrequencySchema,
  startedAt: z.string(), // YYYY-MM-DD
  endedAt: z.string().nullable().optional(),
  reminder: z.object({ on: z.boolean(), time: z.string() }),
  /** 'user' | 'gallery' | 'onda:<ondaId>' */
  origin: z.string(),
  /** Set when the Lago was made from an Onda practice: both share one tick per day. */
  link: z.object({ runId: z.string(), practiceId: z.string() }).nullable().optional(),
})
export type Lago = z.infer<typeof LagoSchema>

export const CheckInSchema = z.object({
  ...base,
  lagoId: z.string(),
  date: z.string(),
  status: z.enum(['done', 'missed']),
  note: z.string(),
  photoPath: z.string().nullable().optional(),
  at: z.string(), // ISO timestamp
})
export type CheckIn = z.infer<typeof CheckInSchema>

/** Frozen copy of what the calendar feed, the Reminders feed and Notion need, so the server never has to load content. */
export const RunSnapshotSchema = z.object({
  name: z.string(),
  practices: z.array(z.object({ id: z.string(), name: z.string(), icon: z.string(), time: z.string(), minutes: z.number().optional() })),
  rules: z.array(z.object({ id: z.string(), text: z.string() })),
  tasks: z.array(z.object({ id: z.string(), name: z.string(), time: z.string() })),
  immerse: z.array(z.object({ id: z.string(), kind: z.string(), title: z.string() })),
})
export type RunSnapshot = z.infer<typeof RunSnapshotSchema>

export const OndaRunSchema = z.object({
  ...base,
  ondaId: z.string(),
  lengthDays: z.number().int().min(7).max(30),
  startedAt: z.string(),
  endedAt: z.string().nullable().optional(),
  intention: z.string(),
  state: z.enum(['active', 'complete', 'ended']),
  snapshot: RunSnapshotSchema.optional(),
})
export type OndaRun = z.infer<typeof OndaRunSchema>

export const PracticeLogSchema = z.object({ ...base, runId: z.string(), practiceId: z.string(), date: z.string(), done: z.boolean(), at: z.string().optional() })
export type PracticeLog = z.infer<typeof PracticeLogSchema>

export const ItemLogSchema = z.object({ ...base, runId: z.string(), itemId: z.string(), date: z.string(), done: z.boolean() })
export type ItemLog = z.infer<typeof ItemLogSchema>

export const ImmerseLogSchema = z.object({ ...base, runId: z.string(), itemId: z.string(), doneAt: z.string().nullable() })
export type ImmerseLog = z.infer<typeof ImmerseLogSchema>

export const JournalEntrySchema = z.object({ ...base, runId: z.string(), day: z.number().int(), prompt: z.string(), text: z.string(), at: z.string() })
export type JournalEntry = z.infer<typeof JournalEntrySchema>

export const ReflectionSchema = z.object({ ...base, runId: z.string(), answers: z.array(z.object({ prompt: z.string(), text: z.string() })), kept: z.array(z.string()), at: z.string().optional() })
export type Reflection = z.infer<typeof ReflectionSchema>

export const AchievementSchema = z.object({ ...base, key: z.string(), unlockedAt: z.string() })
export type Achievement = z.infer<typeof AchievementSchema>

/** A user-made Onda. `content` follows the OndaContent schema (content/schema.ts). */
export const CustomOndaSchema = z.object({ ...base, content: z.unknown() })
export type CustomOnda = z.infer<typeof CustomOndaSchema>

export interface Tables {
  user: User
  lagos: Lago
  checkIns: CheckIn
  runs: OndaRun
  practiceLogs: PracticeLog
  ruleLogs: ItemLog
  taskLogs: ItemLog
  immerseLogs: ImmerseLog
  journal: JournalEntry
  reflections: Reflection
  achievements: Achievement
  customOndas: CustomOnda
}

export const SCHEMAS: { [K in Collection]: z.ZodType<Tables[K]> } = {
  user: UserSchema,
  lagos: LagoSchema,
  checkIns: CheckInSchema,
  runs: OndaRunSchema,
  practiceLogs: PracticeLogSchema,
  ruleLogs: ItemLogSchema,
  taskLogs: ItemLogSchema,
  immerseLogs: ImmerseLogSchema,
  journal: JournalEntrySchema,
  reflections: ReflectionSchema,
  achievements: AchievementSchema,
  customOndas: CustomOndaSchema,
}

export type AnyRecord = Tables[Collection]
export interface BaseRecord {
  id: string
  updatedAt: number
  deletedAt?: number | null
  deviceId: string
  _f?: Record<string, number>
}
