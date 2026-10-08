import { ln, tile, type Theme } from './themeKit'

/* Themes for the Ondas added in 5.0. Same shape as THEMES in themes.ts, which spreads this in. */

const OCT = 'polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)'
const DIAMOND = 'polygon(50% 0,100% 50%,50% 100%,0 50%)'
const PENT = 'polygon(50% 0,100% 38%,81% 100%,19% 100%,0 38%)'

const STEP = 'polygon(22% 0,78% 0,78% 22%,100% 22%,100% 78%,78% 78%,78% 100%,22% 100%,22% 78%,0 78%,0 22%,22% 22%)'
const GATE = 'polygon(0 100%,0 34%,50% 0,100% 34%,100% 100%)'
const SHIELD5 = 'polygon(0 0,100% 0,100% 60%,50% 100%,0 60%)'
const g = (deg: number, a: string, on: number, gap: number) => (i: string) => `repeating-linear-gradient(${deg}deg,rgba(${i},${a}) 0 ${on}px,transparent ${on}px ${gap}px)`

export const THEMES5: Record<string, Theme> = {
  // Religions and spiritual traditions
  hindu: {
    shape: '50%', radius: '28px', numerals: 'devanagari', ornament: 'diya',
    bg: '#FFE3B3', strong: '#D96A00', darkBg: '#4A2E0E', darkStrong: '#FFA640', glyph: 'धर्म', font: 'Eczar,serif',
    pattern: tile(16, 12, "<circle cx='8' cy='7' r='4' fill='$.09)'/><circle cx='8' cy='7' r='1.5' fill='$.12)'/>", true),
  },
  mahayana: {
    shape: '50% 50% 50% 50%/62% 62% 38% 38%', radius: '34px', numerals: 'kanji', ornament: 'wheel',
    bg: '#F1DCE5', strong: '#A8507A', darkBg: '#3F2230', darkStrong: '#E794BA', glyph: '空', font: "'Zen Old Mincho',serif",
    pattern: tile(28, 16, ln('M0 16Q7 2 14 16Q21 2 28 16M7 16Q14 6 21 16'), true),
  },
  theravada: {
    shape: '50%', radius: '18px', numerals: 'thai', ornament: 'stupa',
    bg: '#EBD4CE', strong: '#7E2A2A', darkBg: '#3B1D1C', darkStrong: '#E38F86', glyph: 'Dhamma', font: 'Trirong,serif',
    pattern: (i) => `repeating-linear-gradient(112deg,rgba(${i},.05) 0 2px,transparent 2px 19px)`,
  },
  shinto: {
    shape: '8px', radius: '6px', numerals: 'kanji', ornament: 'torii',
    bg: '#F6F1EA', strong: '#D43C27', darkBg: '#2E2522', darkStrong: '#F58270', glyph: '神', font: "'Kaisei Opti',serif",
    pattern: tile(20, 18, ln('M5 0V4L11 8L5 12L11 16V18', '.13'), true),
  },
  jain: {
    shape: '50%', radius: '22px', numerals: 'devanagari', ornament: 'hand',
    bg: '#F7ECBE', strong: '#94760A', darkBg: '#3E3612', darkStrong: '#E8CB52', glyph: 'अहिंसा', font: "'Rozha One',serif",
    pattern: tile(26, 26, "<g fill='$.13)'><circle cx='9' cy='9' r='1.3'/><circle cx='17' cy='9' r='1.3'/><circle cx='9' cy='17' r='1.3'/><circle cx='17' cy='17' r='1.3'/></g>"),
  },
  sikh: {
    shape: '50%', radius: '26px 26px 10px 10px', numerals: 'gurmukhi', ornament: 'khanda',
    bg: '#D3E3F5', strong: '#0E4C92', darkBg: '#14283F', darkStrong: '#F2A33A', glyph: 'ੴ', font: "'Anek Gurmukhi',sans-serif",
    pattern: tile(30, 30, "<g fill='none' stroke='$.10)' stroke-width='1.4'><circle cx='15' cy='15' r='6'/><path d='M4 6C1 13 2 21 9 26M26 6C29 13 28 21 21 26'/></g>"),
  },
  zoroaster: {
    shape: '50% 50% 50% 50%/70% 70% 30% 30%', radius: '30px 30px 8px 8px', numerals: 'persian', ornament: 'flame',
    bg: '#F6E4D2', strong: '#B5451B', darkBg: '#2B1B13', darkStrong: '#FF9D52', glyph: 'Asha', font: "'Gilda Display',serif",
    pattern: tile(18, 16, ln('M9 16C3 12 6 7 9 1C12 7 15 12 9 16Z', '.13'), true),
  },
  judaism: {
    shape: '10px', radius: '14px', numerals: 'hebrew', ornament: 'menorah',
    bg: '#E5E9F3', strong: '#1C2E6B', darkBg: '#171F3A', darkStrong: '#9DB2F2', glyph: 'חי', font: "'Frank Ruhl Libre',serif",
    pattern: (i) => `repeating-linear-gradient(0deg,rgba(${i},.07) 0 3px,transparent 3px 9px,rgba(${i},.05) 9px 10px,transparent 10px 30px)`,
  },
  christian: {
    shape: '50% 50% 8px 8px', radius: '40px 40px 10px 10px', numerals: 'roman', ornament: 'cross',
    bg: '#F1E1D6', strong: '#7B1E3A', darkBg: '#3A1722', darkStrong: '#E6C36A', glyph: 'ΙΧΘΥΣ', font: "'EB Garamond',serif",
    pattern: tile(28, 28, "<g fill='none' stroke='$.09)' stroke-width='1.2'><circle cx='14' cy='7' r='6'/><circle cx='14' cy='21' r='6'/><circle cx='7' cy='14' r='6'/><circle cx='21' cy='14' r='6'/></g>"),
  },
  sunni: {
    shape: '0', clip: OCT, radius: '20px', numerals: 'arabic', ornament: 'crescent',
    bg: '#D8EBDA', strong: '#17683A', darkBg: '#15301F', darkStrong: '#6CCB8F', glyph: 'توحيد', font: "'Aref Ruqaa',serif",
    pattern: tile(24, 42, ln('M12 0L24 7V21L12 28L0 21V7ZM12 28V42', '.09')),
  },
  shia: {
    shape: '50% 50% 6px 6px', radius: '36px 36px 12px 12px', numerals: 'persian', ornament: 'dome',
    bg: '#D1E6E2', strong: '#14605E', darkBg: '#132B2A', darkStrong: '#5CC5BE', glyph: 'عدل', font: "'Markazi Text',serif",
    pattern: tile(24, 24, ln('M12 2L22 12L12 22L2 12ZM12 7L17 12L12 17L7 12Z', '.09')),
  },
  rasta: {
    shape: '50%', radius: '30px', numerals: 'latin', ornament: 'lion', track: '.01em',
    bg: '#FBE89C', strong: '#1B7F37', darkBg: '#2B2A12', darkStrong: '#F4C531', glyph: 'I&I', font: "'Alfa Slab One',serif",
    pattern: () => 'linear-gradient(90deg,#C8102E 0 33.4%,#F4C531 33.4% 66.7%,#1B7F37 66.7% 100%) 0 0/100% 7px no-repeat',
  },
  discordia: {
    shape: '0', clip: PENT, radius: '6px 26px 10px 30px', numerals: 'latin', ornament: 'apple',
    bg: '#FBEF9C', strong: '#4B2BE0', darkBg: '#201A45', darkStrong: '#F7E060', glyph: 'Fnord', font: "'Special Elite',monospace",
    pattern: tile(34, 34, ln('M17 5L28 13L24 26H10L6 13Z', '.09') + "<circle cx='31' cy='31' r='1.6' fill='$.16)'/>"),
  },
  // Philosophy, thinkers and schools of thought
  plato: {
    shape: '50% 50% 4px 4px', radius: '4px', numerals: 'greek', ornament: 'solid', track: '.02em',
    bg: '#E2EDF7', strong: '#1668B8', darkBg: '#15283D', darkStrong: '#7DB9F5', glyph: 'εἶδος', font: "'GFS Didot',serif",
    pattern: tile(24, 20, ln('M0 20L12 0L24 20Z', '.08')),
  },
  epicurus: {
    shape: '50% 0 50% 50%', radius: '30px 8px 30px 30px', numerals: 'greek', ornament: 'atom',
    bg: '#E3EDC4', strong: '#55861A', darkBg: '#29351A', darkStrong: '#B1D965', glyph: 'κῆπος', font: 'Alegreya,serif',
    pattern: tile(30, 30, ln('M4 26C10 14 18 10 26 4', '.10') + "<circle cx='10' cy='15' r='2' fill='$.11)'/><circle cx='20' cy='8' r='2' fill='$.11)'/>"),
  },
  cyrenaic: {
    shape: '50%', radius: '38px', numerals: 'greek', ornament: 'cup',
    bg: '#F3D9EE', strong: '#A8328F', darkBg: '#3D1A36', darkStrong: '#EE8FD9', glyph: 'ἡδονή', font: "'Playfair Display',serif",
    pattern: tile(36, 12, ln('M0 6C6 0 12 0 18 6S30 12 36 6', '.11')),
  },
  kant: {
    shape: '4px', radius: '4px', numerals: 'roman', ornament: 'starsky',
    bg: '#DFE5EA', strong: '#36506B', darkBg: '#18212B', darkStrong: '#A3C0D9', glyph: 'Pflicht', font: "'Old Standard TT',serif",
    pattern: (i) => `radial-gradient(rgba(${i},.24) 1px,transparent 1.4px) 0 0/22px 22px,radial-gradient(rgba(${i},.15) 1px,transparent 1.7px) 11px 7px/34px 34px`,
  },
  nietzsche: {
    shape: '0 50% 0 50%', radius: '2px 22px 2px 22px', numerals: 'roman', ornament: 'bolt',
    bg: '#E9E4D4', strong: '#1F2937', darkBg: '#17181C', darkStrong: '#F5C518', glyph: 'Ja', font: "'Abril Fatface',serif",
    pattern: tile(40, 16, ln('M0 16L9 5L14 10L24 0L32 9L36 6L40 16', '.14'), true),
  },
  freud: {
    shape: '34%', radius: '16px', numerals: 'roman', ornament: 'couch',
    bg: '#DCE7E0', strong: '#2F5D50', darkBg: '#1A2B26', darkStrong: '#86C5B0', glyph: 'Traum', font: 'Rufina,serif',
    pattern: tile(20, 20, ln('M10 1L19 10L10 19L1 10Z', '.09') + "<circle cx='10' cy='10' r='1.4' fill='$.13)'/>"),
  },
  existential: {
    shape: '0', radius: '0', numerals: 'latin', ornament: 'boulder', caps: true, track: '.07em',
    bg: '#E9E7E1', strong: '#1A1A1A', darkBg: '#2A2A2C', darkStrong: '#F4F1E8', glyph: 'Être', font: "'Bebas Neue',sans-serif",
    pattern: g(0, '.05', 1, 18),
  },
  gandhi: {
    shape: '50%', radius: '20px', numerals: 'devanagari', ornament: 'charkha',
    bg: '#F3EEDC', strong: '#7A6A3A', darkBg: '#33301F', darkStrong: '#D6C48A', glyph: 'सत्य', font: 'Martel,serif',
    pattern: (i) => `repeating-linear-gradient(0deg,rgba(${i},.05) 0 1px,transparent 1px 5px),repeating-linear-gradient(90deg,rgba(${i},.05) 0 1px,transparent 1px 5px)`,
  },
  // Empires, states and political systems
  rome: {
    shape: '12px', radius: '12px', numerals: 'roman', ornament: 'laurel', caps: true, track: '.04em',
    bg: '#EEDCE4', strong: '#6A1B4D', darkBg: '#351526', darkStrong: '#E8B24A', glyph: 'SPQR', font: "'Marcellus SC',serif",
    pattern: tile(12, 12, "<rect x='1.5' y='1.5' width='9' height='9' fill='none' stroke='$.08)'/>"),
  },
  qing: {
    shape: '50%', radius: '24px 24px 6px 6px', numerals: 'kanji', ornament: 'cash',
    bg: '#F7E7A8', strong: '#1D4E9E', darkBg: '#1A2440', darkStrong: '#F5D04A', glyph: '清', font: "'ZCOOL XiaoWei',serif",
    pattern: tile(32, 18, ln('M0 14H8C12 14 12 8 8 8S4 12 8 12M16 14H24C28 14 28 8 24 8S20 12 24 12', '.13'), true),
  },
  mongol: {
    shape: '50% 50% 12px 12px', radius: '44px 44px 14px 14px', numerals: 'latin', ornament: 'ger',
    bg: '#D8E8F8', strong: '#2A7BD1', darkBg: '#132C44', darkStrong: '#76BBF7', glyph: 'Тэнгэр', font: 'Kurale,serif',
    pattern: tile(32, 16, ln('M0 12C6 12 6 4 12 4S18 12 24 12S26 6 32 6', '.13'), true),
  },
  ottoman: {
    shape: '50% 50% 50% 50%/36% 36% 64% 64%', radius: '34px 34px 20px 20px', numerals: 'arabic', ornament: 'tulip',
    bg: '#D3EDEA', strong: '#B8242C', darkBg: '#142F2E', darkStrong: '#FF8E7A', glyph: 'دولت', font: "'El Messiri',sans-serif",
    pattern: tile(26, 30, ln('M13 27V16M13 16C8 14 8 8 9 4L13 8L17 4C18 8 18 14 13 16Z', '.09')),
  },
  mughal: {
    shape: '50% 50% 4px 4px/70% 70% 4px 4px', radius: '48px 48px 10px 10px', numerals: 'persian', ornament: 'paisley',
    bg: '#F3EBDD', strong: '#0F6B4F', darkBg: '#1A2B24', darkStrong: '#E7C15A', glyph: 'نور', font: "'Yatra One',serif",
    pattern: tile(26, 26, ln('M13 1L16 10L25 13L16 16L13 25L10 16L1 13L10 10Z', '.08')),
  },
  johor: {
    shape: '0', clip: DIAMOND, radius: '8px 28px 8px 28px', numerals: 'arabic', ornament: 'kris',
    bg: '#F2E6C0', strong: '#0E6F73', darkBg: '#10302F', darkStrong: '#EBC758', glyph: 'جوهر', font: 'Harmattan,sans-serif',
    pattern: (i) => `repeating-linear-gradient(60deg,rgba(${i},.07) 0 1px,transparent 1px 12px),repeating-linear-gradient(-60deg,rgba(${i},.07) 0 1px,transparent 1px 12px)`,
  },
  inca: {
    shape: '0', clip: STEP, radius: '2px', numerals: 'latin', ornament: 'chakana',
    bg: '#F7DFA0', strong: '#A8341E', darkBg: '#3D1F14', darkStrong: '#F6C445', glyph: 'Inti', font: "'Andada Pro',serif",
    pattern: tile(24, 24, ln('M0 12H6V6H12V0M12 24V18H18V12H24', '.11')),
  },
  habsburg: {
    shape: '50%', radius: '18px', numerals: 'roman', ornament: 'crown',
    bg: '#F6DD8B', strong: '#3A2A14', darkBg: '#262014', darkStrong: '#F2CF55', glyph: 'AEIOU', font: "'Bodoni Moda',serif",
    pattern: g(90, '.06', 10, 20),
  },
  hre: {
    shape: '0', clip: SHIELD5, radius: '4px 4px 20px 20px', numerals: 'roman', ornament: 'orb',
    bg: '#EDE3C8', strong: '#8A1C1C', darkBg: '#2E2318', darkStrong: '#E9B949', glyph: 'Sacrum', font: "'Grenze Gotisch',serif",
    pattern: (i) => `linear-gradient(45deg,rgba(${i},.05) 25%,transparent 25% 75%,rgba(${i},.05) 75%) 0 0/20px 20px`,
  },
  // Cultures, eras and peoples
  sixties: {
    shape: '50%', radius: '34px 12px 34px 12px', numerals: 'latin', ornament: 'peace',
    bg: '#FBD3E9', strong: '#E8590C', darkBg: '#3A1A3A', darkStrong: '#FFB000', glyph: 'Peace', font: 'Shrikhand,serif',
    pattern: (i) => `repeating-radial-gradient(circle at 50% 0,rgba(${i},.07) 0 6px,transparent 6px 14px)`,
  },
  renaissance: {
    shape: '50% 50% 6px 6px', radius: '30px 30px 6px 6px', numerals: 'roman', ornament: 'dividers',
    bg: '#F2E3D0', strong: '#A5432F', darkBg: '#3A2018', darkStrong: '#F0A283', glyph: 'Virtù', font: 'Cardo,serif',
    pattern: (i) => `repeating-linear-gradient(90deg,rgba(${i},.05) 0 1px,transparent 1px 22px),repeating-linear-gradient(0deg,rgba(${i},.05) 0 1px,transparent 1px 22px)`,
  },
  maasai: {
    shape: '50% 50% 50% 50%/34% 34% 66% 66%', radius: '26px', numerals: 'latin', ornament: 'shield',
    bg: '#F7D7D7', strong: '#C8102E', darkBg: '#45141C', darkStrong: '#FF7B8C', glyph: 'Enkai', font: 'Rubik,sans-serif',
    pattern: (i) => `repeating-linear-gradient(0deg,rgba(${i},.08) 0 4px,transparent 4px 26px),repeating-linear-gradient(90deg,rgba(${i},.08) 0 4px,transparent 4px 26px)`,
  },
  aboriginal: {
    shape: '44% 56% 52% 48%', radius: '26px 34px 28px 36px', numerals: 'latin', ornament: 'boomerang',
    bg: '#F0DCC0', strong: '#8C4A12', darkBg: '#33241A', darkStrong: '#E8B36A', glyph: 'Country', font: 'Nunito,sans-serif',
    pattern: g(0, '.05', 6, 16),
  },
  frisian: {
    shape: '50% 50% 50% 50%/40% 40% 60% 60%', radius: '14px', numerals: 'latin', ornament: 'pompeblad',
    bg: '#E6EEF8', strong: '#2456A6', darkBg: '#17253F', darkStrong: '#8DB6F7', glyph: 'Frysk', font: 'Bitter,serif',
    pattern: tile(30, 30, "<path d='M15 22C8 16 7 11 10 9C12.5 7.5 15 9.5 15 11C15 9.5 17.5 7.5 20 9C23 11 22 16 15 22Z' fill='rgba(200,40,50,.13)'/>"),
  },
  polynesia: {
    shape: '0', clip: GATE, radius: '4px 24px 4px 24px', numerals: 'latin', ornament: 'hook', track: '.03em',
    bg: '#EBDCC3', strong: '#5A3418', darkBg: '#2B2017', darkStrong: '#E0B98A', glyph: 'Mana', font: "'Josefin Sans',sans-serif",
    pattern: tile(20, 20, "<path d='M0 20L10 10L20 20Z' fill='$.06)'/>" + ln('M0 0L10 10L20 0', '.10')),
  },
  melanesia: {
    shape: '50%', radius: '10px 30px 10px 30px', numerals: 'latin', ornament: 'shell',
    bg: '#F5E0C8', strong: '#A62B1F', darkBg: '#38190F', darkStrong: '#FF9B6B', glyph: 'Wantok', font: 'Chivo,sans-serif',
    pattern: tile(20, 12, ln('M0 10L5 2L10 10L15 2L20 10', '.09')),
  },
  micronesia: {
    shape: '50%', radius: '32px', numerals: 'latin', ornament: 'stickchart',
    bg: '#D2F0F2', strong: '#0B8FA8', darkBg: '#0F3038', darkStrong: '#62D8E8', glyph: 'Etak', font: 'Quicksand,sans-serif',
    pattern: tile(40, 40, ln('M0 30L40 10M10 0L30 40M0 8L18 40', '.08') + "<circle cx='20' cy='20' r='1.8' fill='$.16)'/>"),
  },
  // Added in 5.1
  zulu: {
    shape: '0', clip: DIAMOND, radius: '6px 26px 6px 26px', numerals: 'latin', ornament: 'beads',
    bg: '#F4E7D3', strong: '#1E1E1E', darkBg: '#221C17', darkStrong: '#F2B632', glyph: 'Sawubona', font: 'Lexend,sans-serif',
    pattern: tile(24, 24, "<path d='M12 2L22 12L12 22L2 12Z' fill='none' stroke='$.10)' stroke-width='1.5'/><path d='M12 8L16 12L12 16L8 12Z' fill='rgba(200,30,40,.12)'/>"),
  },
  bantu: {
    shape: '50% 50% 14px 14px', radius: '30px 30px 12px 12px', numerals: 'latin', ornament: 'mbira',
    bg: '#EAE4C8', strong: '#2F6B3A', darkBg: '#1B2A1D', darkStrong: '#8FD49A', glyph: 'Ntu', font: 'Sora,sans-serif',
    pattern: tile(18, 18, "<circle cx='9' cy='9' r='5' fill='none' stroke='$.09)' stroke-width='1.2'/><circle cx='9' cy='9' r='1.4' fill='$.12)'/>"),
  },
  khmer: {
    shape: '0', clip: GATE, radius: '4px 4px 22px 22px', numerals: 'khmer', ornament: 'prasat',
    bg: '#E9DFC6', strong: '#7A5A1E', darkBg: '#2A2416', darkStrong: '#E3BE6A', glyph: 'អង្គរ', font: 'Suwannaphum,serif',
    pattern: tile(24, 14, ln('M0 14C4 14 4 6 8 6S12 14 12 14M12 14C16 14 16 6 20 6S24 14 24 14M12 6V2', '.10'), true),
  },
  celtic: {
    shape: '50%', radius: '30px', numerals: 'latin', ornament: 'triskele',
    bg: '#DDEBDD', strong: '#1F6B4A', darkBg: '#14281F', darkStrong: '#7FD3A8', glyph: 'Awen', font: "'Uncial Antiqua',serif",
    pattern: tile(28, 28, ln('M0 7C7 7 7 21 14 21S21 7 28 7M0 21C7 21 7 7 14 7S21 21 28 21', '.09')),
  },
}
