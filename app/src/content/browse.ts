/* How Browse Ondas is divided: five groups, each holding the Ondas that exist and a few that are on the way.
   An Onda lets you immerse in a time, culture, tradition or way of thinking, so the groups follow that. Since 7.2 the
   philosophies are split in two: schools of thought (a shared way of life) and minds (one thinker, writer or poet). */

export type BrowseGroup = 'religion' | 'school' | 'mind' | 'state' | 'culture'
export const BROWSE_GROUPS: BrowseGroup[] = ['religion', 'school', 'mind', 'state', 'culture']

/** Each group's Ondas in the order they stand on the shelf: religions by family, schools and minds by date,
 *  states by founding, cultures by region. The ids of placeholders (COMING_SOON) close each list. */
export const SHELVES: Record<BrowseGroup, string[]> = {
  religion: [
    'hindu', 'vedanta', 'jain', 'sikh', 'theravada', 'mahayana', 'zen', 'tibet', 'tao', 'shinto',
    'zoroaster', 'judaism', 'christian', 'sunni', 'shia', 'sufi', 'gnostic', 'hermes', 'norse', 'animism', 'rasta', 'discordia', 'druid',
  ],
  school: ['confucian', 'plato', 'cyrenaic', 'epicurus', 'stoic', 'transc', 'existential', 'ubuntu', 'postmodern'],
  mind: ['cynic', 'machiavelli', 'goethe', 'kant', 'dostoevsky', 'nietzsche', 'freud', 'gandhi', 'adler', 'jung', 'rumi', 'aquinas', 'spinoza', 'rousseau', 'hegel', 'schopenhauer', 'orwell'],
  state: ['egypt', 'rome', 'abbasid', 'hre', 'khmer', 'mongol', 'ottoman', 'burgundy', 'aztec', 'inca', 'mughal', 'johor', 'habsburg', 'qing', 'soviet', 'abyssinia'],
  culture: ['celtic', 'frisian', 'renaissance', 'twenties', 'sixties', 'cuba', 'yoruba', 'zulu', 'bantu', 'maasai', 'aboriginal', 'polynesia', 'melanesia', 'micronesia', 'maori', 'bedouin'],
}

/** Where each shipped Onda sits. An Onda not listed here (a custom one) is shown under "Yours". */
export const GROUP_OF: Record<string, BrowseGroup> = Object.fromEntries(
  BROWSE_GROUPS.flatMap((g) => SHELVES[g].map((id) => [id, g] as const)),
)

const RANK: Record<string, number> = Object.fromEntries(BROWSE_GROUPS.flatMap((g) => SHELVES[g]).map((id, i) => [id, i]))

/** Sorts Ondas into shelf order; custom Ondas keep their own order after the shipped ones. */
export const byShelf = <T extends { id: string }>(a: T, b: T) => (RANK[a.id] ?? 1e6) - (RANK[b.id] ?? 1e6)

export interface ComingSoon {
  /** The id the Onda ships under. Once it is in the index the placeholder is no longer shown. */
  id: string
  name: string
  origin: string
  group: BrowseGroup
}

/** Placeholders only: shown greyed out, not openable, with no content behind them yet. */
export const COMING_SOON: ComingSoon[] = [
  { id: 'druid', name: 'Druidism', origin: 'Celtic Britain, Ireland and Gaul', group: 'religion' },
  { id: 'rumi', name: 'Rumi', origin: 'Balkh and Konya', group: 'mind' },
  { id: 'aquinas', name: 'Thomas Aquinas', origin: 'Naples and Paris', group: 'mind' },
  { id: 'spinoza', name: 'Spinoza', origin: 'Amsterdam and The Hague', group: 'mind' },
  { id: 'rousseau', name: 'Rousseau', origin: 'Geneva and Paris', group: 'mind' },
  { id: 'hegel', name: 'Hegel', origin: 'Jena and Berlin', group: 'mind' },
  { id: 'schopenhauer', name: 'Schopenhauer', origin: 'Danzig and Frankfurt', group: 'mind' },
  { id: 'orwell', name: 'Orwell', origin: 'England, Burma and Spain', group: 'mind' },
  { id: 'abyssinia', name: 'Abyssinia', origin: 'The Ethiopian highlands', group: 'state' },
  { id: 'maori', name: 'Māori', origin: 'Aotearoa New Zealand', group: 'culture' },
  { id: 'bedouin', name: 'Bedouin', origin: 'The deserts of Arabia and the Levant', group: 'culture' },
]
