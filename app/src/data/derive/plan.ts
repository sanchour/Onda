import { mediaFor, type MediaItem, type MediaKind } from '@/content'
import type { OndaContent } from '@/content/schema'

/* The day's practices. An Onda no longer shows one fixed list of practices and a second list of tasks: every day gets up to five
   drawn from both, with a thread running through them (see planForDay). One for the morning, one for the afternoon, one for the
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

/** Up to five practices for one day of an Onda. An Onda the user made keeps its own list unchanged.
 *
 *  A thread runs through it. Each time of day has an anchor, the Onda's first practice for that time (or, with none, its first task).
 *  The anchor comes back two days in three, each time in its next variation, so it feels the same but a little new.
 *  On the third day the slot shows something else from that tradition instead, working through the rest of what the
 *  Onda has for that time of day before any comes round again. The three slots change on different days, so a day
 *  never loses all its anchors at once. The fourth practice is a small extra, a different one each day. */
export function planForDay(c: OndaContent, day: number, opts: { includeFood: boolean } = { includeFood: true }): DayPractice[] {
  const d = Math.max(1, Math.floor(day))
  if (c.custom) return c.practices.map((p) => face(p, 0))

  type Item = { kind: 'practice'; p: OndaContent['practices'][number] } | { kind: 'task'; t: Task }
  const small = c.tasks.filter((t) => !isImmerse(t.action))
  const used = new Set<string>()
  const out: DayPractice[] = []

  SLOTS.forEach((slot, off) => {
    const pool: Item[] = [...c.practices.filter((p) => p.slot === slot).map((p) => ({ kind: 'practice' as const, p })), ...small.filter((t) => t.slot === slot).map((t) => ({ kind: 'task' as const, t }))]
    if (!pool.length) return
    const [anchor, ...rest] = pool as [Item, ...Item[]]
    // how many of the days before this one were a "something else" day for this slot
    let elsewhere = 0
    if (rest.length > 0) for (let i = 1; i < d; i++) if ((i - 1 + off) % 3 === 2) elsewhere++
    const different = rest.length > 0 && (d - 1 + off) % 3 === 2
    const showAnchor = !different
    const item = showAnchor ? anchor : rest[elsewhere % rest.length]!
    // the anchor's variation moves on each time it appears; another practice's each time it comes round
    const round = showAnchor ? d - 1 - elsewhere : Math.floor(elsewhere / rest.length)
    const row = item.kind === 'practice' ? face(item.p, round) : fromTask(item.t)
    used.add(row.id)
    out.push(row)
  })

  // the small extra: a different one every day, from every task the Onda has that is not about a book, a film or a dish
  const extras = small.filter((t) => !used.has(t.id))
  for (let i = 0; i < extras.length && out.length < PLAN_MAX - 1; i++) {
    const t = extras[(d - 1 + i) % extras.length]!
    if (used.has(t.id)) continue
    used.add(t.id)
    out.push(fromTask(t))
  }
  // an Onda with hardly any tasks falls back on its remaining practices
  for (const p of c.practices) {
    if (out.length >= PLAN_MAX - 1) break
    if (!used.has(p.id)) {
      used.add(p.id)
      out.push(face(p, Math.floor((d - 1) / 3)))
    }
  }
  out.sort((x, y) => x.time.localeCompare(y.time))
  const im = immerseFor(c, d, opts.includeFood)
  if (im) out.push(im)
  return out.slice(0, PLAN_MAX)
}

/** How many practices a day of this Onda holds (used for rates and the day's total). */
export const planSize = (c: OndaContent) => planForDay(c, 1).length
