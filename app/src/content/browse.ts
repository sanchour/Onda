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
  school: ['confucian', 'plato', 'cyrenaic', 'epicurus', 'stoic', 'transc', 'existential', 'ubuntu', 'postmodern', 'bushido'],
  mind: ['cynic', 'machiavelli', 'goethe', 'kant', 'dostoevsky', 'nietzsche', 'freud', 'gandhi', 'adler', 'jung', 'rumi', 'aquinas', 'spinoza', 'voltaire', 'rousseau', 'hegel', 'schopenhauer', 'kierkegaard', 'tolstoy', 'hemingway', 'orwell', 'mishima'],
  state: ['egypt', 'rome', 'abbasid', 'hre', 'khmer', 'mongol', 'ottoman', 'burgundy', 'aztec', 'inca', 'mughal', 'johor', 'habsburg', 'qing', 'soviet', 'assyria', 'babylon', 'sparta', 'han', 'abyssinia', 'tang'],
  culture: ['celtic', 'frisian', 'renaissance', 'twenties', 'sixties', 'cuba', 'yoruba', 'zulu', 'bantu', 'maasai', 'aboriginal', 'polynesia', 'melanesia', 'micronesia', 'maori', 'bedouin', 'sumer', 'edo', 'sioux', 'huntergatherer'],
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
  { id: 'voltaire', name: 'Voltaire', origin: 'Paris and Ferney', group: 'mind' },
  { id: 'rousseau', name: 'Rousseau', origin: 'Geneva and Paris', group: 'mind' },
  { id: 'hegel', name: 'Hegel', origin: 'Jena and Berlin', group: 'mind' },
  { id: 'schopenhauer', name: 'Schopenhauer', origin: 'Danzig and Frankfurt', group: 'mind' },
  { id: 'kierkegaard', name: 'Kierkegaard', origin: 'Copenhagen', group: 'mind' },
  { id: 'tolstoy', name: 'Tolstoy', origin: 'Yasnaya Polyana', group: 'mind' },
  { id: 'hemingway', name: 'Ernest Hemingway', origin: 'Paris, Key West and Havana', group: 'mind' },
  { id: 'orwell', name: 'Orwell', origin: 'England, Burma and Spain', group: 'mind' },
  { id: 'mishima', name: 'Yukio Mishima', origin: 'Tokyo', group: 'mind' },
  { id: 'bushido', name: 'Bushidō', origin: 'The samurai of Japan', group: 'school' },
  { id: 'assyria', name: 'Assyrian', origin: 'Assur and Nineveh', group: 'state' },
  { id: 'babylon', name: 'Babylonian', origin: 'Babylon, on the Euphrates', group: 'state' },
  { id: 'sparta', name: 'Sparta', origin: 'Laconia, in the Peloponnese', group: 'state' },
  { id: 'han', name: 'Han Dynasty', origin: 'Chang’an and Luoyang', group: 'state' },
  { id: 'tang', name: 'Tang Dynasty', origin: 'Chang’an', group: 'state' },
  { id: 'abyssinia', name: 'Abyssinia', origin: 'The Ethiopian highlands', group: 'state' },
  { id: 'maori', name: 'Māori', origin: 'Aotearoa New Zealand', group: 'culture' },
  { id: 'bedouin', name: 'Bedouin', origin: 'The deserts of Arabia and the Levant', group: 'culture' },
  { id: 'sumer', name: 'Sumerian', origin: 'Uruk, Ur and southern Mesopotamia', group: 'culture' },
  { id: 'edo', name: 'Edo Japan', origin: 'Edo, now Tokyo', group: 'culture' },
  { id: 'sioux', name: 'Sioux', origin: 'The Oceti Sakowin of the Great Plains', group: 'culture' },
  { id: 'huntergatherer', name: 'Hunter-Gatherer', origin: 'Everywhere, before farming', group: 'culture' },
]
