import { mediaFor, type MediaItem, type MediaKind } from '@/content'
import type { OndaContent } from '@/content/schema'

/* The day's practices. Every day an Onda gives five, shown in this order: one Immerse practice (a book, a film, a song, a dish,
   a game, a custom, a place, a word), then the day's four from the morning, afternoon and evening and, now and then, a special.
   The pick depends only on the content and the day number, so it is the same on every device and needs no storage.
   Onda 6.0 rewrote the content for this (see planV6). An Onda that has not been rewritten yet still uses planLegacy. */

export type PlanSlot = 'Morning' | 'Afternoon' | 'Evening' | 'Special' | 'Immerse'
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
  /** What to do with the item today, in one or two sentences (Immerse practices). */
  note?: string
  /** Legacy Immerse practices made from an item are shown as "Watch: title"; this is the kind to label them with. */
  lead?: MediaKind
}

const SLOTS = ['Morning', 'Afternoon', 'Evening'] as const
const SLOT_ICON: Record<string, string> = { Morning: 'sun-horizon', Afternoon: 'sun', Evening: 'moon' }
const ACTION_ICON: Record<string, string> = { journal: 'notebook', philosophy: 'lightbulb', read: 'book-open-text', watch: 'film-strip', listen: 'headphones', art: 'paint-brush', eat: 'bowl-food', drink: 'coffee', customs: 'hand-heart', games: 'game-controller', travel: 'map-trifold', words: 'translate' }
/** The order the legacy immerse practice walks through the kinds, one a day. */
export const IMMERSE_ORDER: MediaKind[] = ['read', 'listen', 'watch', 'art', 'eat', 'games', 'customs', 'drink', 'travel']
/** The order the Immerse practice walks through the kinds in 6.0. */
export const IMMERSE_ORDER_V6: MediaKind[] = ['read', 'listen', 'watch', 'eat', 'art', 'games', 'customs', 'drink', 'travel', 'words']
const isImmerse = (a: string | undefined): a is MediaKind => !!a && (IMMERSE_ORDER as string[]).includes(a)
/** Most practices in a day. */
export const PLAN_MAX = 5

/** True for an Onda written for the 6.0 plan: twenty practices and thirty Immerse practices. */
export const hasV6Plan = (c: OndaContent) => !c.custom && c.immersePlan.length >= 30

type Practice = OndaContent['practices'][number]
type Task = OndaContent['tasks'][number]
const fromTask = (t: Task): DayPractice => ({ id: t.id, kind: 'task', name: t.name, icon: (t.action && ACTION_ICON[t.action]) || SLOT_ICON[t.slot] || 'sparkle', meta: t.meta, slot: t.slot === 'Special' ? 'Special' : t.slot, time: t.time, action: t.action })

/** Day 1 shows a practice as written. Each later round shows it in the next of its variations, then starts over. */
function face(p: Practice, round: number): DayPractice {
  const faces = p.variations.length + 1
  const k = round % faces
  return { id: p.id, kind: 'practice', name: p.name, icon: p.icon, meta: p.meta, slot: p.slot, time: p.time, practiceId: p.id, twist: k > 0 ? p.variations[k - 1] : undefined, action: p.action }
}

/* ── Onda 6.0 ──────────────────────────────────────────────────────────────────────────────────────────────── */

/** How many of the four practices fall in the morning, the afternoon and the evening, turn by turn: two mornings one day, two afternoons the next. */
const SHAPES = [[2, 1, 1], [1, 2, 1], [1, 1, 2]] as const
/** On every fifth day a special replaces the second practice of the doubled time of day. */
const SPECIAL_EVERY = 5

/** The pool of a time of day shows its first practice, the core one, on every third appearance, and works through the rest between,
 *  each in the next of its variations the next time it comes round. So there is a thread, and something new in between. */
function nth(pool: Practice[], s: number): DayPractice {
  const [core, ...rest] = pool as [Practice, ...Practice[]]
  if (s % 3 === 0 || rest.length === 0) return face(core, Math.floor(s / 3))
  const k = s - Math.floor(s / 3) - 1
  return face(rest[k % rest.length]!, Math.floor(k / rest.length))
}

/** The Immerse practice of a day: the kinds take turns, and each kind has three practices to work through in turn. */
function immerseV6(c: OndaContent, day: number, includeFood: boolean): DayPractice | undefined {
  const plan = c.immersePlan.filter((e) => includeFood || (e.kind !== 'eat' && e.kind !== 'drink'))
  const kinds = IMMERSE_ORDER_V6.filter((k) => plan.some((e) => e.kind === k))
  if (!kinds.length) return undefined
  const media = mediaFor(c, { includeFood: true })
  const kind = kinds[(day - 1) % kinds.length]!
  const of = plan.filter((e) => e.kind === kind)
  const e = of[Math.floor((day - 1) / kinds.length) % of.length]!
  const item = media.find((m) => m.id === e.item)
  if (!item) return undefined
  return { id: `im-${item.id}`, kind: 'immerse', name: e.name, icon: ACTION_ICON[kind] ?? 'sparkle', meta: [item.meta, e.minutes ? `${e.minutes} min` : ''].filter(Boolean).join(' · '), slot: 'Immerse', time: '00:00', item, note: e.text }
}

function planV6(c: OndaContent, d: number, includeFood: boolean): DayPractice[] {
  const pools = SLOTS.map((s) => c.practices.filter((p) => p.slot === s))
  const specials = c.practices.filter((p) => p.slot === 'Special')
  const seen = [0, 0, 0]
  let out: DayPractice[] = []
  for (let i = 1; i <= d; i++) {
    const shape = SHAPES[(i - 1) % SHAPES.length]!
    const special = specials.length && i % SPECIAL_EVERY === 0 ? specials[(i / SPECIAL_EVERY - 1) % specials.length] : undefined
    out = []
    let replaced = false
    SLOTS.forEach((_, k) => {
      const pool = pools[k]!
      if (!pool.length) return
      for (let j = 0; j < shape[k]!; j++) {
        // the special takes the place of the second practice of the doubled time of day
        if (special && j === 1 && !replaced) {
          replaced = true
          out.push(face(special, Math.floor(i / SPECIAL_EVERY / specials.length)))
          continue
        }
        out.push(nth(pool, seen[k]!++))
      }
    })
  }
  // clock order, so an evening practice never sits above a morning one
  out.sort((x, y) => x.time.localeCompare(y.time))
  const im = immerseV6(c, d, includeFood)
  return im ? [im, ...out].slice(0, PLAN_MAX) : out.slice(0, PLAN_MAX)
}

/* ── Before 6.0 ────────────────────────────────────────────────────────────────────────────────────────────── */

/** The legacy immerse practice: the kinds take turns, and within a kind the Onda's own hand-written task comes first, then its list from the top. */
function immerseLegacy(c: OndaContent, day: number, includeFood: boolean): DayPractice | undefined {
  const media = mediaFor(c, { includeFood })
  const kinds = IMMERSE_ORDER.filter((k) => media.some((m) => m.kind === k))
  if (!kinds.length) return undefined
  const kind = kinds[(day - 1) % kinds.length]!
  const round = Math.floor((day - 1) / kinds.length)
  const own = c.tasks.filter((t) => t.action === kind)
  const items = media.filter((m) => m.kind === kind)
  const n = own.length + items.length
  const i = round % n
  if (i < own.length) return { ...fromTask(own[i]!), kind: 'immerse', slot: 'Immerse', time: '00:00' }
  const item = items[i - own.length]!
  return { id: `im-${item.id}`, kind: 'immerse', name: item.title, icon: ACTION_ICON[kind] ?? 'sparkle', meta: item.meta, slot: 'Immerse', time: '00:00', item, lead: kind }
}

/** The 5.2.1 plan. A thread runs through it. Each time of day has an anchor, the Onda's first practice for that time (or, with none, its first task).
 *  The anchor comes back two days in three, each time in its next variation. On the third day the slot shows something else from that tradition. */
function planLegacy(c: OndaContent, d: number, includeFood: boolean): DayPractice[] {
  type Item = { kind: 'practice'; p: Practice } | { kind: 'task'; t: Task }
  const small = c.tasks.filter((t) => !isImmerse(t.action))
  const used = new Set<string>()
  const out: DayPractice[] = []

  SLOTS.forEach((slot, off) => {
    const pool: Item[] = [...c.practices.filter((p) => p.slot === slot).map((p) => ({ kind: 'practice' as const, p })), ...small.filter((t) => t.slot === slot).map((t) => ({ kind: 'task' as const, t }))]
    if (!pool.length) return
    const [anchor, ...rest] = pool as [Item, ...Item[]]
    let elsewhere = 0
    if (rest.length > 0) for (let i = 1; i < d; i++) if ((i - 1 + off) % 3 === 2) elsewhere++
    const different = rest.length > 0 && (d - 1 + off) % 3 === 2
    const showAnchor = !different
    const item = showAnchor ? anchor : rest[elsewhere % rest.length]!
    const round = showAnchor ? d - 1 - elsewhere : Math.floor(elsewhere / rest.length)
    const row = item.kind === 'practice' ? face(item.p, round) : fromTask(item.t)
    used.add(row.id)
    out.push(row)
  })

  const extras = small.filter((t) => !used.has(t.id))
  for (let i = 0; i < extras.length && out.length < PLAN_MAX - 1; i++) {
    const t = extras[(d - 1 + i) % extras.length]!
    if (used.has(t.id)) continue
    used.add(t.id)
    out.push(fromTask(t))
  }
  for (const p of c.practices) {
    if (out.length >= PLAN_MAX - 1) break
    if (!used.has(p.id)) {
      used.add(p.id)
      out.push(face(p, Math.floor((d - 1) / 3)))
    }
  }
  out.sort((x, y) => x.time.localeCompare(y.time))
  const im = immerseLegacy(c, d, includeFood)
  return im ? [im, ...out].slice(0, PLAN_MAX) : out.slice(0, PLAN_MAX)
}

/** Up to five practices for one day of an Onda, the Immerse practice first. An Onda the user made keeps its own list unchanged. */
export function planForDay(c: OndaContent, day: number, opts: { includeFood: boolean } = { includeFood: true }): DayPractice[] {
  const d = Math.max(1, Math.floor(day))
  if (c.custom) return c.practices.map((p) => face(p, 0))
  return hasV6Plan(c) ? planV6(c, d, opts.includeFood) : planLegacy(c, d, opts.includeFood)
}

/** How many practices a day of this Onda holds (used for rates and the day's total). */
export const planSize = (c: OndaContent) => planForDay(c, 1).length
