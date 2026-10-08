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
}

export interface ComingSoon {
  name: string
  origin: string
  group: BrowseGroup
}

/** Placeholders only: shown greyed out, not openable, with no content behind them yet. */
export const COMING_SOON: ComingSoon[] = [
  // Religions and spiritual traditions
  { name: 'Hinduism', origin: 'India', group: 'religion' },
  { name: 'Mahayana Buddhism', origin: 'East Asia', group: 'religion' },
  { name: 'Theravada Buddhism', origin: 'South and Southeast Asia', group: 'religion' },
  { name: 'Shinto', origin: 'Japan', group: 'religion' },
  { name: 'Jainism', origin: 'India', group: 'religion' },
  { name: 'Sikhism', origin: 'Punjab', group: 'religion' },
  { name: 'Zoroastrianism', origin: 'Persia', group: 'religion' },
  { name: 'Judaism', origin: 'The Levant and the diaspora', group: 'religion' },
  { name: 'Christianity', origin: 'The Mediterranean world', group: 'religion' },
  { name: 'Islam: Sunni', origin: 'Arabia and beyond', group: 'religion' },
  { name: 'Islam: Shia', origin: 'Arabia and beyond', group: 'religion' },
  { name: 'Rastafari', origin: 'Jamaica', group: 'religion' },
  { name: 'Discordianism', origin: 'United States', group: 'religion' },
  // Philosophy, thinkers and schools of thought
  { name: 'Platonism', origin: 'Greece', group: 'philosophy' },
  { name: 'Epicureanism', origin: 'Greece', group: 'philosophy' },
  { name: 'Hedonism', origin: 'Greece', group: 'philosophy' },
  { name: 'Kant', origin: 'Prussia', group: 'philosophy' },
  { name: 'Nietzsche', origin: 'Germany', group: 'philosophy' },
  { name: 'Freud', origin: 'Vienna', group: 'philosophy' },
  { name: 'Existentialism', origin: 'Europe', group: 'philosophy' },
  { name: 'Gandhi', origin: 'India', group: 'philosophy' },
  // Empires, states and political systems
  { name: 'Roman Empire', origin: 'The Mediterranean', group: 'state' },
  { name: 'Qing Dynasty', origin: 'China', group: 'state' },
  { name: 'Mongol Empire', origin: 'Central Asia', group: 'state' },
  { name: 'Ottoman Empire', origin: 'Anatolia and beyond', group: 'state' },
  { name: 'Mughal Empire', origin: 'South Asia', group: 'state' },
  { name: 'Johor Sultanate', origin: 'The Malay world', group: 'state' },
  { name: 'Inca Empire', origin: 'The Andes', group: 'state' },
  { name: 'Habsburg Monarchy', origin: 'Central Europe', group: 'state' },
  { name: 'Holy Roman Empire', origin: 'Central Europe', group: 'state' },
  { name: 'Nazi Germany', origin: 'Germany', group: 'state' },
  // Cultures, eras and peoples
  { name: 'The 1960s', origin: 'United States', group: 'culture' },
  { name: 'The Renaissance', origin: 'Italy', group: 'culture' },
  { name: 'Maasai', origin: 'East Africa', group: 'culture' },
  { name: 'Aboriginal Australian', origin: 'Australia', group: 'culture' },
  { name: 'Frisian', origin: 'Friesland', group: 'culture' },
  { name: 'Polynesian', origin: 'The Pacific', group: 'culture' },
  { name: 'Melanesian', origin: 'The Pacific', group: 'culture' },
  { name: 'Micronesian', origin: 'The Pacific', group: 'culture' },
]
