import { z } from 'zod'

/* Onda content schema. One JSON file per Onda in /content/ondas, lazy-loaded and versioned.
   Custom Ondas made in the app use the same shape with most lists empty. */

const hhmm = z.string().regex(/^\d{2}:\d{2}$/)
export const SlotSchema = z.enum(['Morning', 'Afternoon', 'Evening'])

export const WordSchema = z.object({
  id: z.string(),
  term: z.string(),
  meaning: z.string(),
  pronunciation: z.string().optional(),
  usage: z.string().optional(),
  language: z.string().optional(),
  unverified: z.boolean().optional(),
})

export const PracticeSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  slot: SlotSchema,
  time: hhmm,
  minutes: z.number().optional(),
  /** Short line under the name, e.g. "Morning · 5 min" */
  meta: z.string(),
  instructions: z.string().default(''),
  why: z.string().default(''),
  variations: z.array(z.string()).default([]),
})

/** What a task offers to open: the Journal, the Philosophy sheet, or the Immerse list for a kind. */
export const TASK_ACTIONS = ['journal', 'philosophy', 'read', 'watch', 'listen', 'art', 'eat', 'drink', 'customs'] as const
export type TaskAction = (typeof TASK_ACTIONS)[number]
export const TaskSchema = z.object({ id: z.string(), name: z.string(), meta: z.string(), time: hhmm, slot: SlotSchema, action: z.enum(TASK_ACTIONS).optional() })
export const RuleSchema = z.object({ id: z.string(), text: z.string(), why: z.string().default('') })

export const ImmerseItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  creator: z.string().default(''),
  year: z.string().optional(),
  why: z.string().default(''),
  link: z.string().url().optional(),
  unverified: z.boolean().optional(),
})
export const IMMERSE_KINDS = ['read', 'watch', 'listen', 'art', 'eat', 'drink', 'customs'] as const
export type ImmerseKind = (typeof IMMERSE_KINDS)[number]
const items = z.array(ImmerseItemSchema).default([])

export const IdeaSchema = z.object({ title: z.string(), text: z.string(), practice: z.string().optional() })
export const QuoteSchema = z.object({ text: z.string(), by: z.string(), source: z.string().default(''), unverified: z.boolean().optional() })

export const GuideSchema = z.object({
  intro: z.array(z.string()).default([]),
  origin: z.string().default(''),
  era: z.string().default(''),
  figures: z.array(z.object({ name: z.string(), dates: z.string().default(''), bio: z.string(), unverified: z.boolean().optional() })).default([]),
  history: z.array(z.object({ when: z.string(), what: z.string(), detail: z.string().default(''), unverified: z.boolean().optional() })).default([]),
  concepts: z.array(z.object({ term: z.string(), text: z.string(), detail: z.string().default('') })).default([]),
  facts: z.array(z.object({ text: z.string(), unverified: z.boolean().optional() })).default([]),
  glossary: z.array(z.object({ term: z.string(), meaning: z.string() })).default([]),
  furtherReading: z.array(z.object({ title: z.string(), creator: z.string(), year: z.string().optional(), note: z.string().optional() })).default([]),
  /** Community-run or tradition-bearer sources to learn from directly. */
  learnFrom: z.array(z.object({ name: z.string(), note: z.string(), link: z.string().url().optional() })).default([]),
  sources: z.array(z.object({ title: z.string(), creator: z.string().optional(), publisher: z.string().optional(), year: z.string().optional(), link: z.string().url().optional() })).default([]),
})

export const OndaContentSchema = z.object({
  version: z.number().int().default(1),
  id: z.string(),
  name: z.string(),
  origin: z.string(),
  era: z.string().default(''),
  /** Fallback data-viz tone when themes are off or for custom Ondas. */
  tone: z.enum(['blue', 'green', 'yellow', 'coral', 'purple']),
  icon: z.string(),
  font: z.string().default(''),
  pattern: z.string().default(''),
  glyph: z.string().default(''),
  line: z.string(),
  custom: z.boolean().optional(),
  quote: QuoteSchema.nullable().default(null),
  quotes: z.array(QuoteSchema).default([]),
  words: z.array(WordSchema).default([]),
  practices: z.array(PracticeSchema).default([]),
  tasks: z.array(TaskSchema).default([]),
  rules: z.array(RuleSchema).default([]),
  immerse: z.object({ read: items, watch: items, listen: items, art: items, eat: items, drink: items, customs: items }).default({ read: [], watch: [], listen: [], art: [], eat: [], drink: [], customs: [] }),
  ethics: z.array(IdeaSchema).default([]),
  philosophy: z.array(IdeaSchema).default([]),
  journal: z.array(z.string()).default([]),
  reflect: z.array(z.string()).default([]),
  dayThemes: z.array(z.string()).default([]),
  guide: GuideSchema.default(() => GuideSchema.parse({})),
  sensitivity: z.object({ note: z.string(), requiredCaveats: z.array(z.string()).default([]), reviewRequired: z.boolean().default(false) }).optional(),
})
export type OndaContent = z.infer<typeof OndaContentSchema>
export type OndaContentInput = z.input<typeof OndaContentSchema>
export type Practice = z.infer<typeof PracticeSchema>
export type ImmerseItem = z.infer<typeof ImmerseItemSchema>
export type Word = z.infer<typeof WordSchema>

/** Light index entry: enough to draw a tile without loading the full file. */
export const OndaIndexSchema = z.object({ id: z.string(), name: z.string(), origin: z.string(), tone: OndaContentSchema.shape.tone, icon: z.string(), line: z.string(), custom: z.boolean().optional() })
export type OndaIndex = z.infer<typeof OndaIndexSchema>

/** Quality bar for the ten shipped Ondas (enforced by `npm run content:check` and a unit test). */
export const SHIPPED_MINIMUMS = { words: 30, journal: 30, reflect: 5, dayThemes: 30, history: 10, concepts: 8, practices: 5, rules: 4 } as const
