import indexJson from '@content/index.json'
import type { ImmerseItem, OndaContent, OndaIndex } from './schema'

/** The shipped Ondas, in display order. Tiles render from this without loading any content file.
 *  Shipped content is validated at build time (content:check and a unit test), so it is not parsed again at launch. */
export const ONDA_INDEX = indexJson as OndaIndex[]

// One chunk per Onda: content is fetched (and precached by the service worker) only when that Onda is opened.
const files = import.meta.glob<{ default: unknown }>('../../../content/ondas/*.json')
const cache = new Map<string, OndaContent>()

export const isShipped = (id: string) => ONDA_INDEX.some((o) => o.id === id)

export async function loadOnda(id: string): Promise<OndaContent> {
  const hit = cache.get(id)
  if (hit) return hit
  const load = files[`../../../content/ondas/${id}.json`]
  if (!load) throw new Error(`Unknown Onda: ${id}`)
  const content = (await load()).default as OndaContent
  cache.set(id, content)
  return content
}

/** Warm the cache so every Onda works offline right after first load (called when idle). */
export function preloadAllOndas() {
  for (const o of ONDA_INDEX) void loadOnda(o.id).catch(() => undefined)
}

export const MEDIA_KINDS = ['read', 'watch', 'listen', 'art', 'eat', 'drink', 'customs', 'games', 'travel', 'words'] as const
export const KIND_ICON: Record<(typeof MEDIA_KINDS)[number], string> = { read: 'book-open', listen: 'headphones', watch: 'film-strip', art: 'paint-brush', eat: 'bowl-food', drink: 'coffee', customs: 'hand-heart', games: 'game-controller', travel: 'map-trifold', words: 'translate' }
export type MediaKind = (typeof MEDIA_KINDS)[number]

export interface MediaItem {
  id: string
  kind: MediaKind
  title: string
  meta: string
  why: string
  creator?: string
  year?: string
  link?: string
  unverified?: boolean
  /** Words only: how to say it and where it is from. */
  extra?: string
}

const metaOf = (it: ImmerseItem) => [it.creator, it.year].filter(Boolean).join(', ')

/** Flat immersion list: every book, film, dish, custom and word, each with a stable id for logging. */
export function mediaFor(c: OndaContent, opts: { includeFood: boolean } = { includeFood: true }): MediaItem[] {
  const out: MediaItem[] = []
  const add = (kind: MediaKind, list: ImmerseItem[] | undefined) => {
    for (const it of list ?? []) out.push({ id: it.id, kind, title: it.title, meta: metaOf(it), why: it.why, creator: it.creator, year: it.year, link: it.link, unverified: it.unverified })
  }
  for (const kind of ['read', 'watch', 'listen', 'art', 'eat', 'drink', 'customs', 'games'] as const) {
    if (!opts.includeFood && (kind === 'eat' || kind === 'drink')) continue
    add(kind, c.immerse[kind])
  }
  // Travel: the calendar first, then the places
  add('travel', c.immerse.festivals)
  add('travel', c.immerse.places)
  for (const w of c.words) out.push({ id: w.id, kind: 'words', title: w.term, meta: w.meaning, why: w.usage ?? '', unverified: w.unverified, extra: [w.pronunciation, w.language].filter(Boolean).join(' · ') })
  return out
}

export function toIndex(c: OndaContent): OndaIndex {
  return { id: c.id, name: c.name, origin: c.origin, tone: c.tone, icon: c.icon, line: c.line, custom: c.custom }
}
