import { CLIP, ln, sv, tile, type ThemeSet } from '../themeKit'

/* Themes, part B: the later philosophies, states and cultures.
   Each entry is one tradition's world: palettes for light and dark, the cover material, its display face, numerals,
   the small line ornament, the cover layout and a pattern drawn in the cover ink. See docs/ONDA7_DESIGN.md.
   Covers are taken from each culture's own pigments and materials; a few are light grounds with dark ink. */

/** Dots on a circle, for `tile` bodies. */
const ring = (cx: number, cy: number, r: number, n: number, d: number, a: string) =>
  Array.from({ length: n }, (_, k) => {
    const t = (k / n) * Math.PI * 2
    return `<circle cx='${(cx + r * Math.cos(t)).toFixed(1)}' cy='${(cy + r * Math.sin(t)).toFixed(1)}' r='${d}' fill='$${a})'/>`
  }).join('')

/** Two sets of hairlines crossing at ±deg. */
const lattice = (deg: number, a: string, gap: number) => (i: string) =>
  `repeating-linear-gradient(${deg}deg,rgba(${i},${a}) 0 1px,transparent 1px ${gap}px),repeating-linear-gradient(${-deg}deg,rgba(${i},${a}) 0 1px,transparent 1px ${gap}px)`

/** Alberti's pavimento: a floor of tiles in one point perspective along the bottom of the cover. */
const pavimento = (i: string) => {
  const rays = [-150, -110, -70, -30, 10, 50, 90, 130, 170, 210, 250].map((x) => `M50 -20L${x} 40`).join('')
  const body = `<path d='${rays}M0 7H100M0 15H100M0 25H100M0 38H100' fill='none' stroke='rgba(${i},.1)' stroke-width='1' vector-effect='non-scaling-stroke'/>`
  return `${sv(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40' preserveAspectRatio='none'>${body}</svg>`)} 0 100%/100% 44% no-repeat`
}

export const THEMES_B: ThemeSet = {
  // Isfahan haft-rangi tile: ultramarine from lapis lazuli under a gilded dome. Zulfiqar among the twelve, Persian interlocking circles.
  shia: {
    light: { paper: '#DFE4F5', accent: '#2A3F9E', cover: ['#1F2F80', '#0C1641'], ink: '#EFCE6E' },
    dark: { paper: '#121A36', accent: '#E9C86C', cover: ['#18245F', '#0A1130'], ink: '#EDCB6A' },
    font: "'Markazi Text',serif", glyph: 'عدل', numerals: 'persian', ornament: 'dome', layout: 'frame',
    mark: { shape: '50% 50% 6px 6px' },
    pattern: tile(28, 28, ln('M0 14A14 14 0 0 0 14 0A14 14 0 0 0 28 14A14 14 0 0 0 14 28A14 14 0 0 0 0 14Z', '.08') + "<circle cx='14' cy='14' r='1.6' fill='$.12)'/>"),
  },
  // Ital green deepening to black, Lion of Judah in Ethiopian gold, the red, gold and green woven band.
  rasta: {
    light: { paper: '#F6EDC2', accent: '#1A7A36', cover: ['#155B2A', '#08200F'], ink: '#F5CD48' },
    dark: { paper: '#22200F', accent: '#F4C531', cover: ['#0C361A', '#05150A'], ink: '#F4CC4A' },
    font: "'Alfa Slab One',serif", glyph: 'I&I', numerals: 'latin', ornament: 'lion', layout: 'left', track: '.01em',
    mark: { shape: '50%' },
    pattern: () => 'linear-gradient(90deg,#C8102E 0 33.4%,#F4C531 33.4% 66.7%,#1B7F37 66.7% 100%) 0 0/100% 4px no-repeat',
  },
  // Ditto-machine methyl violet of the mimeographed Principia, the golden apple of Kallisti, the Law of Fives.
  discordia: {
    light: { paper: '#F8F0B4', accent: '#4F2CC4', cover: ['#4A26B0', '#210F5C'], ink: '#F8DB55' },
    dark: { paper: '#1D1840', accent: '#F7E060', cover: ['#2E1880', '#150A3C'], ink: '#F7DA5A' },
    font: "'Special Elite',monospace", glyph: 'Fnord', numerals: 'latin', ornament: 'apple', layout: 'center',
    mark: { shape: '0', clip: CLIP.PENT },
    pattern: tile(34, 34, ln('M17 6L27.5 13.6L23.5 26H10.5L6.5 13.6Z', '.09') + "<circle cx='31' cy='31' r='1.5' fill='$.14)'/>"),
  },
  // Attic black-figure: orange clay and black glaze (red-figure in the dark). The dodecahedron of the Timaeus, its triangles.
  plato: {
    light: { paper: '#F7E3D0', accent: '#A4481C', cover: ['#E39058', '#D07B41'], ink: '#1E130B' },
    dark: { paper: '#2B1D14', accent: '#F0A070', cover: ['#241812', '#100A07'], ink: '#F0A874' },
    font: "'GFS Didot',serif", glyph: 'εἶδος', numerals: 'greek', ornament: 'solid', layout: 'center', track: '.02em',
    mark: { shape: '50% 50% 4px 4px' },
    pattern: (i) => [0, 60, -60].map((d) => `repeating-linear-gradient(${d}deg,rgba(${i},.07) 0 1px,transparent 1px 21px)`).join(','),
  },
  // The Garden: olive leaf and its silver underside. A hydria of water for bread and water, olive leaves.
  epicurus: {
    light: { paper: '#EBEED3', accent: '#56671F', cover: ['#556222', '#26300E'], ink: '#F8F4E2' },
    dark: { paper: '#22280F', accent: '#BCD46E', cover: ['#3A4416', '#1A200A'], ink: '#F3EEE0' },
    font: 'Alegreya,serif', glyph: 'κῆπος', numerals: 'greek', ornament: 'atom', layout: 'left',
    mark: { shape: '50% 0 50% 50%' },
    pattern: tile(32, 32, "<path d='M5 11Q11 4 18 7Q12 14 5 11Z' fill='$.09)'/><path d='M18 27Q22 19 30 19Q26 27 18 27Z' fill='$.07)'/>" + ln('M5 11L18 7M18 27L30 19', '.08', 1)),
  },
  // Rose madder for the roses of Cyrene. Silphium, the plant on the city's coins, and five-petalled rosettes.
  cyrenaic: {
    light: { paper: '#F8DFE8', accent: '#A12F5B', cover: ['#A3325C', '#4C102D'], ink: '#FBF4EF' },
    dark: { paper: '#33131F', accent: '#F390B6', cover: ['#74203F', '#360A1C'], ink: '#F6ECEC' },
    font: "'Playfair Display',serif", glyph: 'ἡδονή', numerals: 'greek', ornament: 'cup', layout: 'center',
    mark: { shape: '50%' },
    pattern: tile(30, 30, ring(15, 15, 4, 5, 1.3, '.11') + "<circle cx='15' cy='15' r='1.2' fill='$.14)'/>"),
  },
  // Prussian blue, the pigment of Berlin, 1706. The starry heavens above: a spiral nebula of his Universal Natural History.
  kant: {
    light: { paper: '#DDE9F0', accent: '#1B5A7A', cover: ['#133E57', '#071725'], ink: '#EEF3F8' },
    dark: { paper: '#0F1F2A', accent: '#8EC3E3', cover: ['#0E2F44', '#051220'], ink: '#E8EFF5' },
    font: "'Old Standard TT',serif", glyph: 'Pflicht', numerals: 'roman', ornament: 'starsky', layout: 'frame',
    mark: { shape: '4px' },
    pattern: (i) => `radial-gradient(rgba(${i},.16) 1px,transparent 1.5px) 0 0/23px 23px,radial-gradient(rgba(${i},.1) .8px,transparent 1.3px) 9px 13px/37px 37px`,
  },
  // Dionysian wine-dark and black. Zarathustra's eagle with the serpent at its neck, the Engadin ridge at Sils.
  nietzsche: {
    light: { paper: '#F1DDE5', accent: '#7A1F48', cover: ['#46153A', '#170610'], ink: '#F6EEE8' },
    dark: { paper: '#2A1020', accent: '#E79BC0', cover: ['#36102C', '#12040C'], ink: '#F3EAE6' },
    font: "'Abril Fatface',serif", glyph: 'Ja', numerals: 'roman', ornament: 'bolt', layout: 'left',
    mark: { shape: '0 50% 0 50%' },
    pattern: tile(48, 18, ln('M0 18L8 8L13 12L22 3L30 11L35 8L42 14L48 9', '.12'), true),
  },
  // The Qashqai rug on the couch at Berggasse 19: madder red into indigo. The couch, the rug's medallions.
  freud: {
    light: { paper: '#F1E0E0', accent: '#8A2F3A', cover: ['#8A2F3A', '#22204D'], ink: '#FBF4EC' },
    dark: { paper: '#22182A', accent: '#E89AA2', cover: ['#5E1F28', '#16142F'], ink: '#F3ECE6' },
    font: 'Rufina,serif', glyph: 'Traum', numerals: 'roman', ornament: 'couch', layout: 'left',
    mark: { shape: '34%' },
    pattern: tile(24, 24, ln('M12 3L21 12L12 21L3 12Z', '.08') + "<path d='M12 8L16 12L12 16L8 12Z' fill='$.08)'/>"),
  },
  // A Paris paperback: cream laid paper, black type and a red rule (charcoal at night). Sisyphus and his stone.
  existential: {
    light: { paper: '#F3ECDD', accent: '#B0261E', cover: ['#F2E8D0', '#E3D2AE'], ink: '#1B1815' },
    dark: { paper: '#211F1C', accent: '#F07A6E', cover: ['#272522', '#121110'], ink: '#EFE6D2' },
    font: "'Bebas Neue',sans-serif", glyph: 'Être', numerals: 'latin', ornament: 'boulder', layout: 'frame', caps: true, track: '.07em',
    mark: { shape: '0' },
    pattern: (i) => `repeating-linear-gradient(0deg,rgba(${i},.05) 0 1px,transparent 1px 4px),repeating-linear-gradient(90deg,rgba(${i},.08) 0 1px,transparent 1px 28px)`,
  },
  // Champaran indigo on handspun khadi: the charkha, and the weave of the cloth.
  gandhi: {
    light: { paper: '#E6E6F1', accent: '#383F86', cover: ['#3A4078', '#171A3C'], ink: '#F4ECD8' },
    dark: { paper: '#16182E', accent: '#B4BAF2', cover: ['#262A58', '#0E1026'], ink: '#F1E8D3' },
    font: 'Martel,serif', glyph: 'सत्य', numerals: 'devanagari', ornament: 'charkha', layout: 'center',
    mark: { shape: '50%' },
    pattern: (i) => `repeating-linear-gradient(0deg,rgba(${i},.07) 0 1px,transparent 1px 4px),repeating-linear-gradient(90deg,rgba(${i},.05) 0 1px,transparent 1px 4px)`,
  },
  // Pompeian cinnabar red with gold leaf. The triumphal laurel, the net of opus reticulatum.
  rome: {
    light: { paper: '#F4DCD4', accent: '#9A2A1A', cover: ['#8C2618', '#4A0F08'], ink: '#F0CB70' },
    dark: { paper: '#2E1310', accent: '#EFC060', cover: ['#5E180E', '#260805'], ink: '#EFC96C' },
    font: "'Marcellus SC',serif", glyph: 'SPQR', numerals: 'roman', ornament: 'laurel', layout: 'frame', caps: true, track: '.04em',
    mark: { shape: '12px' },
    pattern: lattice(45, '.07', 14),
  },
  // Imperial bright yellow, the emperor's own colour, inked in cinnabar (yellow on lacquer at night). A cash coin on a knotted cord, the lishui hem of a dragon robe.
  qing: {
    light: { paper: '#FBF0C8', accent: '#A8261A', cover: ['#F2C127', '#E2A417'], ink: '#6B1507' },
    dark: { paper: '#2A2008', accent: '#F2C53A', cover: ['#3A2A07', '#1A1303'], ink: '#F2C53A' },
    font: "'ZCOOL XiaoWei',serif", glyph: '清', numerals: 'kanji', ornament: 'cash', layout: 'center',
    mark: { shape: '50%' },
    pattern: tile(28, 26, ln('M0 7C3.5 1.5 7 1.5 10.5 7S17.5 12.5 21 7S24.5 1.5 28 7', '.12') + ln('M-14 26L0 12M-7 26L7 12M0 26L14 12M7 26L21 12M14 26L28 12M21 26L35 12', '.09'), true),
  },
  // The eternal blue sky of Tengri, khadag silk (a night steppe in the dark). A felt ger, the alkhan hammer band.
  mongol: {
    light: { paper: '#E2F0FA', accent: '#1F5FA8', cover: ['#92C6EA', '#66A4D6'], ink: '#0C2340' },
    dark: { paper: '#10223A', accent: '#7DBDF5', cover: ['#163F6E', '#0A1E38'], ink: '#CFE6F8' },
    font: 'Kurale,serif', glyph: 'Тэнгэр', numerals: 'latin', ornament: 'ger', layout: 'left',
    mark: { shape: '50% 50% 12px 12px' },
    pattern: tile(24, 14, ln('M0 11H4V3H14V11H20V3H24M9 3V8', '.13'), true),
  },
  // Iznik: turquoise glaze deepening to the cobalt-green of Rüstem Pasha, with bole red. The tulip in an ogee, a field of tulips.
  ottoman: {
    light: { paper: '#D8EEEE', accent: '#B0282B', cover: ['#0B6F7A', '#08364A'], ink: '#FBF7EF' },
    dark: { paper: '#0E2A2E', accent: '#FF8E7A', cover: ['#084C56', '#05222E'], ink: '#F3EEE4' },
    font: "'El Messiri',sans-serif", glyph: 'دولت', numerals: 'arabic', ornament: 'tulip', layout: 'left',
    mark: { shape: '50% 50% 50% 50%/36% 36% 64% 64%' },
    pattern: tile(28, 32, ln('M14 29V18M14 18C9 16 9 10 10 5L14 9L18 5C19 10 19 16 14 18Z', '.09') + "<path d='M11.5 13Q14 16 16.5 13L14 9Z' fill='rgba(214,60,60,.14)'/>"),
  },
  // White Makrana marble inlaid with onyx and carnelian (red sandstone at night). A chhatri, a jali screen.
  mughal: {
    light: { paper: '#F1EEE8', accent: '#9C3A22', cover: ['#F3F0EA', '#DCD5C8'], ink: '#1E1B18' },
    dark: { paper: '#2C1810', accent: '#EBA684', cover: ['#5E2716', '#260E07'], ink: '#F3EEE6' },
    font: "'Yatra One',serif", glyph: 'نور', numerals: 'persian', ornament: 'paisley', layout: 'frame',
    mark: { shape: '50% 50% 4px 4px/70% 70% 4px 4px' },
    pattern: tile(24, 13.86, ln('M4 0H12L16 6.93L12 13.86H4L0 6.93Z M16 6.93H24', '.08')),
  },
  // Songket: royal purple silk woven with gold thread. The keris, the pucuk rebung border.
  johor: {
    light: { paper: '#EADDF0', accent: '#5E2A7E', cover: ['#4A1A63', '#1E0A2A'], ink: '#EFC95E' },
    dark: { paper: '#22142C', accent: '#EFC95E', cover: ['#341048', '#14051C'], ink: '#EEC85C' },
    font: 'Harmattan,sans-serif', glyph: 'جوهر', numerals: 'arabic', ornament: 'kris', layout: 'center',
    mark: { shape: '0', clip: CLIP.DIAMOND },
    pattern: (i) => `${tile(18, 26, "<path d='M0 26L9 6L18 26' fill='$.07)' stroke='$.12)' stroke-width='1'/>" + ln('M9 14V26M5 22L9 18L13 22', '.1'), true)(i)},${lattice(60, '.05', 10)(i)}`,
  },
  // Cochineal crimson of cumbi cloth and the gold of Inti. The chakana, tocapu squares.
  inca: {
    light: { paper: '#F5DCE0', accent: '#9A1C3E', cover: ['#8A1838', '#3A0717'], ink: '#F2CB5A' },
    dark: { paper: '#2E0F18', accent: '#F3C95A', cover: ['#5A0F24', '#24050D'], ink: '#F2CA58' },
    font: "'Andada Pro',serif", glyph: 'Inti', numerals: 'latin', ornament: 'chakana', layout: 'center',
    mark: { shape: '0', clip: CLIP.STEP },
    pattern: tile(24, 24, ln('M2 2H22V22H2Z', '.08') + ln('M7 12H12V7M12 17H17V12', '.1')),
  },
  // Schwarz-Gelb: court black and the gold of the Golden Fleece. The imperial crown of Rudolf II, a double pinstripe.
  habsburg: {
    light: { paper: '#F4EBCF', accent: '#7A5C10', cover: ['#211E18', '#0C0B09'], ink: '#E9C760' },
    dark: { paper: '#1E1B12', accent: '#F2CF55', cover: ['#1A1813', '#090807'], ink: '#E9C760' },
    font: "'Bodoni Moda',serif", glyph: 'AEIOU', numerals: 'roman', ornament: 'crown', layout: 'frame', caps: true, track: '.05em',
    mark: { shape: '50%' },
    pattern: (i) => `repeating-linear-gradient(90deg,rgba(${i},.07) 0 1px,transparent 1px 5px,rgba(${i},.07) 5px 6px,transparent 6px 24px)`,
  },
  // The imperial eagle's field: gold leaf with black (the crimson coronation mantle at night). The Reichsapfel, a heraldic diaper.
  hre: {
    light: { paper: '#F5EAD0', accent: '#8A1C2C', cover: ['#D6AE4E', '#BF9535'], ink: '#18120A' },
    dark: { paper: '#2A1014', accent: '#E9B949', cover: ['#3A0E14', '#18050A'], ink: '#E8C460' },
    font: "'Grenze Gotisch',serif", glyph: 'Sacrum', numerals: 'roman', ornament: 'orb', layout: 'frame',
    mark: { shape: '0', clip: CLIP.SHIELD5 },
    pattern: tile(22, 22, ln('M11 0L22 11L11 22L0 11Z', '.08') + ln('M11 8V14M8 11H14', '.1')),
  },
  // Day-glo poster ink: tangerine into hot pink, printed in purple (purple and orange at night). Flower power, op-art ripples.
  sixties: {
    light: { paper: '#FDE3D0', accent: '#C2410C', cover: ['#F58A2A', '#EE5F95'], ink: '#2A0A3C' },
    dark: { paper: '#2A1236', accent: '#FFB000', cover: ['#3D1155', '#1A0628'], ink: '#FFB65C' },
    font: 'Shrikhand,serif', glyph: 'Peace', numerals: 'latin', ornament: 'peace', layout: 'left',
    mark: { shape: '50%' },
    pattern: (i) => `repeating-radial-gradient(circle at 78% 115%,rgba(${i},.08) 0 5px,transparent 5px 13px)`,
  },
  // Della Robbia glazed terracotta: cerulean ground, white figures. Vitruvian circle and square with dividers, Alberti's pavimento.
  renaissance: {
    light: { paper: '#E0ECF6', accent: '#2A6496', cover: ['#2B6599', '#163A60'], ink: '#FBF8F2' },
    dark: { paper: '#122233', accent: '#9CC8EE', cover: ['#184466', '#0A1E33'], ink: '#F4F1EA' },
    font: 'Cardo,serif', glyph: 'Virtù', numerals: 'roman', ornament: 'dividers', layout: 'left',
    mark: { shape: '50% 50% 6px 6px' },
    pattern: pavimento,
  },
  // The red shuka with its fine checks. A beaded collar, the shuka plaid.
  maasai: {
    light: { paper: '#F8DCDC', accent: '#B5121B', cover: ['#BC1620', '#640810'], ink: '#FBF7EF' },
    dark: { paper: '#3A1216', accent: '#FF7B85', cover: ['#7E0C16', '#360408'], ink: '#F5EEE6' },
    font: 'Rubik,sans-serif', glyph: 'Enkai', numerals: 'latin', ornament: 'shield', layout: 'center',
    mark: { shape: '50% 50% 50% 50%/34% 34% 66% 66%' },
    pattern: (i) => [0, 90].map((d) => `repeating-linear-gradient(${d}deg,rgba(${i},.09) 0 1.5px,transparent 1.5px 5px,rgba(${i},.09) 5px 6.5px,transparent 6.5px 30px)`).join(','),
  },
  // Desert ground with yellow ochre and pipeclay dots, as at Papunya. A waterhole with people, tracks and a coolamon.
  aboriginal: {
    light: { paper: '#F2E2C8', accent: '#9A4A16', cover: ['#3E2416', '#170C06'], ink: '#E9B14C' },
    dark: { paper: '#22160E', accent: '#E9B14C', cover: ['#2E1A10', '#110904'], ink: '#ECB850' },
    font: 'Nunito,sans-serif', glyph: 'Jukurrpa', numerals: 'latin', ornament: 'boomerang', layout: 'left',
    mark: { shape: '44% 56% 52% 48%' },
    pattern: tile(44, 44, ring(22, 22, 5, 8, 1, '.15') + ring(22, 22, 10, 14, 1, '.11') + "<circle cx='22' cy='22' r='1.6' fill='$.16)'/>" + [0, 44].flatMap((x) => [0, 44].map((y) => ring(x, y, 6, 10, 0.9, '.1'))).join('')),
  },
  // The Frisian flag: white, blue bends and red pompeblêden (Frisian blue at night).
  frisian: {
    light: { paper: '#E8EFF8', accent: '#1D4F9C', cover: ['#EEF3F9', '#D6E2F0'], ink: '#173F84' },
    dark: { paper: '#13203A', accent: '#8DB6F7', cover: ['#183F80', '#0B1E42'], ink: '#E8F0FA' },
    font: 'Bitter,serif', glyph: 'Frysk', numerals: 'latin', ornament: 'pompeblad', layout: 'left',
    mark: { shape: '50% 50% 50% 50%/40% 40% 60% 60%' },
    pattern: (i) => `${tile(36, 36, "<path d='M18 25C11 20 10 15 13 13C15.5 11.5 18 13.5 18 15C18 13.5 20.5 11.5 23 13C26 15 25 20 18 25Z' fill='rgba(200,40,50,.13)'/>")(i)},repeating-linear-gradient(-34deg,rgba(${i},.07) 0 14px,transparent 14px 42px)`,
  },
  // Tapa: beaten mulberry bark painted in dark brown (dark tapa at night). The hei matau, siapo squares and triangles.
  polynesia: {
    light: { paper: '#F3E6D2', accent: '#7A4420', cover: ['#DEC398', '#CBA672'], ink: '#24150A' },
    dark: { paper: '#271A10', accent: '#E0B98A', cover: ['#3E2716', '#1A0F07'], ink: '#E8D2AC' },
    font: "'Josefin Sans',sans-serif", glyph: 'Mana', numerals: 'latin', ornament: 'hook', layout: 'center', caps: true, track: '.08em',
    mark: { shape: '0', clip: CLIP.GATE },
    pattern: tile(24, 24, ln('M0 12H24M12 0V24', '.1') + "<path d='M0 0L12 12H0Z' fill='$.07)'/><path d='M12 12L24 24H12Z' fill='$.07)'/>"),
  },
  // Sepik red ochre burnt into black, with lime white. A bird of paradise, a zigzag of shell money.
  melanesia: {
    light: { paper: '#F5E2D6', accent: '#A0361C', cover: ['#8A3418', '#160806'], ink: '#F6F2E6' },
    dark: { paper: '#2A140C', accent: '#FF9B6B', cover: ['#5E2410', '#100503'], ink: '#F2EEE2' },
    font: 'Chivo,sans-serif', glyph: 'Wantok', numerals: 'latin', ornament: 'shell', layout: 'left',
    mark: { shape: '50%' },
    pattern: tile(20, 14, ln('M0 11L5 3L10 11L15 3L20 11', '.09') + "<circle cx='5' cy='11' r='1.1' fill='$.12)'/><circle cx='15' cy='11' r='1.1' fill='$.12)'/>"),
  },
  // Lagoon shallows over sand (the open ocean at night). A Marshallese stick chart with cowries, its swells.
  micronesia: {
    light: { paper: '#DDF3F1', accent: '#0A6F80', cover: ['#8ED9D2', '#4FB7B8'], ink: '#062A38' },
    dark: { paper: '#0D2A30', accent: '#62D8E8', cover: ['#08404A', '#031C22'], ink: '#B4EFEA' },
    font: 'Quicksand,sans-serif', glyph: 'Etak', numerals: 'latin', ornament: 'stickchart', layout: 'left',
    mark: { shape: '50%' },
    pattern: tile(40, 40, ln('M0 30L40 10M10 0L30 40', '.08') + ln('M0 20Q20 30 40 20', '.07') + "<circle cx='20' cy='20' r='1.7' fill='$.15)'/>"),
  },
  // Black, white, red and blue glass beads on a black ground. The isihlangu shield and iklwa, beadwork diamonds.
  zulu: {
    light: { paper: '#F2ECE4', accent: '#B3261E', cover: ['#24201D', '#0A0908'], ink: '#F7F3EC' },
    dark: { paper: '#1E1A17', accent: '#FF8A80', cover: ['#1C1917', '#080706'], ink: '#F2EEE8' },
    font: 'Lexend,sans-serif', glyph: 'Sawubona', numerals: 'latin', ornament: 'beads', layout: 'center', caps: true, track: '.06em',
    mark: { shape: '0', clip: CLIP.DIAMOND },
    pattern: tile(24, 24, "<path d='M12 3L21 12L12 21L3 12Z' fill='none' stroke='$.1)' stroke-width='1.2'/><path d='M12 8.5L15.5 12L12 15.5L8.5 12Z' fill='rgba(220,50,50,.16)'/><path d='M0 0H5L0 5ZM24 0V5L19 0ZM0 24V19L5 24ZM24 24H19L24 19Z' fill='rgba(80,150,240,.15)'/>"),
  },
  // Katanga copper, the metal of the copper crosses. The mbira, a Kuba interlace.
  bantu: {
    light: { paper: '#F4E0D2', accent: '#9A4A24', cover: ['#9A4A24', '#401A08'], ink: '#FBF5EC' },
    dark: { paper: '#2C190E', accent: '#F0A878', cover: ['#6A2E12', '#2A1106'], ink: '#F3ECE2' },
    font: 'Sora,sans-serif', glyph: 'Ntu', numerals: 'latin', ornament: 'mbira', layout: 'left',
    mark: { shape: '50% 50% 14px 14px' },
    pattern: tile(20, 20, ln('M0 10L10 0L20 10L10 20Z', '.09') + ln('M10 6L14 10L10 14L6 10Z', '.07')),
  },
  // Angkor sandstone at dusk, gilded like its apsaras. The prasat towers of Angkor Wat, a lotus-petal base.
  khmer: {
    light: { paper: '#F1E6CC', accent: '#7E5A12', cover: ['#7A5A1C', '#2E2008'], ink: '#FBF6E8' },
    dark: { paper: '#28210F', accent: '#E8C36A', cover: ['#4E3910', '#1E1505'], ink: '#F3ECDA' },
    font: 'Suwannaphum,serif', glyph: 'អង្គរ', numerals: 'khmer', ornament: 'prasat', layout: 'center',
    mark: { shape: '0', clip: CLIP.GATE },
    pattern: tile(20, 14, ln('M0 14C0 7 5 3 10 3S20 7 20 14', '.11') + ln('M10 14V8', '.08'), true),
  },
  // Verdigris green of the Book of Kells. The La Tène triskele, a knotwork band.
  celtic: {
    light: { paper: '#DDEDE2', accent: '#16704C', cover: ['#135E44', '#072A1D'], ink: '#F2F6EE' },
    dark: { paper: '#10251B', accent: '#7FD3A8', cover: ['#0E4632', '#041A11'], ink: '#EEF3EA' },
    font: "'Uncial Antiqua',serif", glyph: 'Awen', numerals: 'latin', ornament: 'triskele', layout: 'frame',
    mark: { shape: '50%' },
    pattern: tile(28, 28, ln('M0 7C7 7 7 21 14 21S21 7 28 7M0 21C7 21 7 7 14 7S21 21 28 21', '.09')),
  },
}
