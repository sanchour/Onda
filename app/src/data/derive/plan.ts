import { mediaFor, type MediaItem, type MediaKind } from '@/content'
import type { OndaContent } from '@/content/schema'

/* The day's practices. Since 5.2 an Onda no longer shows one fixed list of practices and a second list of tasks:
   every day gets up to five practices drawn from both. One for the morning, one for the afternoon, one for the
   evening, one small extra, and one that is about taking the world in (a book, a film, a song, a dish).
   The pick depends only on the content and the day number, so it is the same on every device and needs no storage. */

export type PlanSlot = 'Morning' | 'Afternoon' | 'Evening' | 'Immerse'
export interface DayPractice {
  /** The id a tick is logged under. A practice shown in one of its variations keeps the practice's own id. */
  id: string
  kind: 'practice' | 'task' | 'immerse'
  name: string
  icon: string
  meta: string
  slot: PlanSlot
  time: string
  /** Today's variation of a practice, in its own words. */
  twist?: string
  /** Set when "How to do this" has something to show. */
  practiceId?: string
  /** What the row can open: the Journal, Philosophy, or the Immerse list of a kind. */
  action?: string
  /** The book, film, song or dish this practice is about. */
  item?: MediaItem
  /** Immerse practices made from an item are shown as "Watch: title"; this is the kind to label them with. */
  lead?: MediaKind
}

const SLOTS = ['Morning', 'Afternoon', 'Evening'] as const
const SLOT_ICON: Record<string, string> = { Morning: 'sun-horizon', Afternoon: 'sun', Evening: 'moon' }
const ACTION_ICON: Record<string, string> = { journal: 'notebook', philosophy: 'lightbulb', read: 'book-open-text', watch: 'film-strip', listen: 'headphones', art: 'paint-brush', eat: 'bowl-food', drink: 'coffee', customs: 'hand-heart', games: 'game-controller', travel: 'map-trifold' }
/** The order the immerse practice walks through the kinds, one a day. */
export const IMMERSE_ORDER: MediaKind[] = ['read', 'listen', 'watch', 'art', 'eat', 'games', 'customs', 'drink', 'travel']
const isImmerse = (a: string | undefined): a is MediaKind => !!a && (IMMERSE_ORDER as string[]).includes(a)
/** Most practices in a day. */
export const PLAN_MAX = 5

type Task = OndaContent['tasks'][number]
const fromTask = (t: Task): DayPractice => ({ id: t.id, kind: 'task', name: t.name, icon: (t.action && ACTION_ICON[t.action]) || SLOT_ICON[t.slot] || 'sparkle', meta: t.meta, slot: t.slot, time: t.time, action: t.action })

/** Day 1 shows a practice as written. Each later round shows it in the next of its variations, then starts over. */
function face(p: OndaContent['practices'][number], round: number): DayPractice {
  const faces = p.variations.length + 1
  const k = round % faces
  return { id: p.id, kind: 'practice', name: p.name, icon: p.icon, meta: p.meta, slot: p.slot, time: p.time, practiceId: p.id, twist: k > 0 ? p.variations[k - 1] : undefined }
}

/** The immerse practice of a day: the kinds take turns, and within a kind the Onda's own hand-written task comes first, then its list from the top. */
function immerseFor(c: OndaContent, day: number, includeFood: boolean): DayPractice | undefined {
  const media = mediaFor(c, { includeFood })
  const kinds = IMMERSE_ORDER.filter((k) => media.some((m) => m.kind === k))
  if (!kinds.length) return undefined
  const kind = kinds[(day - 1) % kinds.length]!
  const round = Math.floor((day - 1) / kinds.length)
  const own = c.tasks.filter((t) => t.action === kind)
  const items = media.filter((m) => m.kind === kind)
  const n = own.length + items.length
  const i = round % n
  if (i < own.length) return { ...fromTask(own[i]!), kind: 'immerse', slot: 'Immerse' }
  const item = items[i - own.length]!
  return { id: `im-${item.id}`, kind: 'immerse', name: item.title, icon: ACTION_ICON[kind] ?? 'sparkle', meta: item.meta, slot: 'Immerse', time: '20:00', item, lead: kind }
}

/** Up to five practices for one day of an Onda. An Onda the user made keeps its own list unchanged. */
export function planForDay(c: OndaContent, day: number, opts: { includeFood: boolean } = { includeFood: true }): DayPractice[] {
  const d = Math.max(1, Math.floor(day))
  if (c.custom) return c.practices.map((p) => face(p, 0))

  const out: DayPractice[] = []
  // tasks that are not about a book, film or dish join the practices; the others feed the immerse practice
  const small = c.tasks.filter((t) => !isImmerse(t.action))
  const extra = small.length ? small[(d - 1) % small.length] : undefined

  for (const slot of SLOTS) {
    const core = c.practices.filter((p) => p.slot === slot)
    if (core.length) {
      out.push(face(core[(d - 1) % core.length]!, Math.floor((d - 1) / core.length)))
      continue
    }
    const fill = small.filter((t) => t.slot === slot && t.id !== extra?.id)
    if (fill.length) out.push(fromTask(fill[(d - 1) % fill.length]!))
  }
  if (extra) out.push(fromTask(extra))
  // an Onda with few tasks fills the fourth place with another of its practices
  if (out.length < PLAN_MAX - 1) {
    const rest = c.practices.filter((p) => !out.some((x) => x.id === p.id))
    if (rest.length) out.push(face(rest[(d - 1) % rest.length]!, Math.floor((d - 1) / rest.length)))
  }
  out.sort((a, b) => a.time.localeCompare(b.time))
  const im = immerseFor(c, d, opts.includeFood)
  if (im) out.push(im)
  return out.slice(0, PLAN_MAX)
}

/** How many practices a day of this Onda holds (used for rates and the day's total). */
export const planSize = (c: OndaContent) => planForDay(c, 1).length
