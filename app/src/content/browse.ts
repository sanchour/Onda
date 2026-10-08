/* How Browse Ondas is divided: four groups, each holding the Ondas that exist and a few that are on the way.
   An Onda lets you immerse in a time, culture, tradition or way of thinking, so the groups follow that. */

export type BrowseGroup = 'religion' | 'philosophy' | 'state' | 'culture'
export const BROWSE_GROUPS: BrowseGroup[] = ['religion', 'philosophy', 'state', 'culture']

/** Where each shipped Onda sits. An Onda not listed here (a custom one) is shown under "Yours". */
export const GROUP_OF: Record<string, BrowseGroup> = {
  zen: 'religion',
  tao: 'religion',
  tibet: 'religion',
  vedanta: 'religion',
  sufi: 'religion',
  animism: 'religion',
  hermes: 'religion',
  gnostic: 'religion',
  stoic: 'philosophy',
  jung: 'philosophy',
  transc: 'philosophy',
  ubuntu: 'philosophy',
  soviet: 'state',
  aztec: 'state',
  egypt: 'state',
  yoruba: 'culture',
  norse: 'religion',
  cynic: 'philosophy',
  confucian: 'philosophy',
  abbasid: 'state',
  twenties: 'culture',
  cuba: 'culture',
  hindu: 'religion',
  mahayana: 'religion',
  theravada: 'religion',
  shinto: 'religion',
  jain: 'religion',
  sikh: 'religion',
  zoroaster: 'religion',
  judaism: 'religion',
  christian: 'religion',
  sunni: 'religion',
  shia: 'religion',
  rasta: 'religion',
  discordia: 'religion',
  plato: 'philosophy',
  epicurus: 'philosophy',
  cyrenaic: 'philosophy',
  kant: 'philosophy',
  nietzsche: 'philosophy',
  freud: 'philosophy',
  existential: 'philosophy',
  gandhi: 'philosophy',
  rome: 'state',
  qing: 'state',
  mongol: 'state',
  ottoman: 'state',
  mughal: 'state',
  johor: 'state',
  inca: 'state',
  habsburg: 'state',
  hre: 'state',
  thirdreich: 'state',
  sixties: 'culture',
  renaissance: 'culture',
  maasai: 'culture',
  aboriginal: 'culture',
  frisian: 'culture',
  polynesia: 'culture',
  melanesia: 'culture',
  micronesia: 'culture',
}

export interface ComingSoon {
  /** The id the Onda ships under. Once it is in the index the placeholder is no longer shown. */
  id: string
  name: string
  origin: string
  group: BrowseGroup
}

/** Placeholders only: shown greyed out, not openable, with no content behind them yet. */
export const COMING_SOON: ComingSoon[] = [
  // Religions and spiritual traditions
  { id: 'hindu', name: 'Hinduism', origin: 'India', group: 'religion' },
  { id: 'mahayana', name: 'Mahayana Buddhism', origin: 'East Asia', group: 'religion' },
  { id: 'theravada', name: 'Theravada Buddhism', origin: 'South and Southeast Asia', group: 'religion' },
  { id: 'shinto', name: 'Shinto', origin: 'Japan', group: 'religion' },
  { id: 'jain', name: 'Jainism', origin: 'India', group: 'religion' },
  { id: 'sikh', name: 'Sikhism', origin: 'Punjab', group: 'religion' },
  { id: 'zoroaster', name: 'Zoroastrianism', origin: 'Persia', group: 'religion' },
  { id: 'judaism', name: 'Judaism', origin: 'The Levant and the diaspora', group: 'religion' },
  { id: 'christian', name: 'Christianity', origin: 'The Mediterranean world', group: 'religion' },
  { id: 'sunni', name: 'Islam: Sunni', origin: 'Arabia and beyond', group: 'religion' },
  { id: 'shia', name: 'Islam: Shia', origin: 'Arabia and beyond', group: 'religion' },
  { id: 'rasta', name: 'Rastafari', origin: 'Jamaica', group: 'religion' },
  { id: 'discordia', name: 'Discordianism', origin: 'United States', group: 'religion' },
  // Philosophy, thinkers and schools of thought
  { id: 'plato', name: 'Platonism', origin: 'Greece', group: 'philosophy' },
  { id: 'epicurus', name: 'Epicureanism', origin: 'Greece', group: 'philosophy' },
  { id: 'cyrenaic', name: 'Hedonism', origin: 'Greece', group: 'philosophy' },
  { id: 'kant', name: 'Kant', origin: 'Prussia', group: 'philosophy' },
  { id: 'nietzsche', name: 'Nietzsche', origin: 'Germany', group: 'philosophy' },
  { id: 'freud', name: 'Freud', origin: 'Vienna', group: 'philosophy' },
  { id: 'existential', name: 'Existentialism', origin: 'Europe', group: 'philosophy' },
  { id: 'gandhi', name: 'Gandhi', origin: 'India', group: 'philosophy' },
  // Empires, states and political systems
  { id: 'rome', name: 'Roman Empire', origin: 'The Mediterranean', group: 'state' },
  { id: 'qing', name: 'Qing Dynasty', origin: 'China', group: 'state' },
  { id: 'mongol', name: 'Mongol Empire', origin: 'Central Asia', group: 'state' },
  { id: 'ottoman', name: 'Ottoman Empire', origin: 'Anatolia and beyond', group: 'state' },
  { id: 'mughal', name: 'Mughal Empire', origin: 'South Asia', group: 'state' },
  { id: 'johor', name: 'Johor Sultanate', origin: 'The Malay world', group: 'state' },
  { id: 'inca', name: 'Inca Empire', origin: 'The Andes', group: 'state' },
  { id: 'habsburg', name: 'Habsburg Monarchy', origin: 'Central Europe', group: 'state' },
  { id: 'hre', name: 'Holy Roman Empire', origin: 'Central Europe', group: 'state' },
  { id: 'thirdreich', name: 'Nazi Germany', origin: 'Germany', group: 'state' },
  // Cultures, eras and peoples
  { id: 'sixties', name: 'The 1960s', origin: 'United States', group: 'culture' },
  { id: 'renaissance', name: 'The Renaissance', origin: 'Italy', group: 'culture' },
  { id: 'maasai', name: 'Maasai', origin: 'East Africa', group: 'culture' },
  { id: 'aboriginal', name: 'Aboriginal Australian', origin: 'Australia', group: 'culture' },
  { id: 'frisian', name: 'Frisian', origin: 'Friesland', group: 'culture' },
  { id: 'polynesia', name: 'Polynesian', origin: 'The Pacific', group: 'culture' },
  { id: 'melanesia', name: 'Melanesian', origin: 'The Pacific', group: 'culture' },
  { id: 'micronesia', name: 'Micronesian', origin: 'The Pacific', group: 'culture' },
]
