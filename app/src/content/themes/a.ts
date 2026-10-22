import { CLIP, ln, stripes, sv, tile, type ThemeSet } from '../themeKit'

/* Themes, part A: religions and the first philosophies and worlds.
   Each entry is one tradition's world: palettes for light and dark, the cover material, its display face, numerals,
   the small line ornament, the cover layout and a pattern drawn in the cover ink. See docs/ONDA7_DESIGN.md.
   Covers take their colour from the tradition's own pigments and materials. Some light covers are pale grounds
   (paper, glaze, gold leaf) with a dark ink; every ink reads on both stops (5.2:1 light, 8:1 dark). */

/** A small SVG tile run once along an edge at `y` (as `tile`, which runs it along the bottom). */
const band = (w: number, h: number, body: string, y = '0') => (i: string) =>
  `${sv(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${body.replace(/\$/g, `rgba(${i},`)}</svg>`)} repeat-x 0 ${y}/${w}px ${h}px`

export const THEMES_A: ThemeSet = {
  // Imperial porphyry and Pentelic marble; a meander under porphyry flecks. The Stoa Poikile colonnade.
  stoic: {
    light: { paper: '#EEDFE1', accent: '#7E3646', cover: ['#6E2B36', '#481A23'], ink: '#F8F3EA' },
    dark: { paper: '#3A2329', accent: '#E3A1AE', cover: ['#45202A', '#2A1218'], ink: '#F3EDE3' },
    font: "Cinzel,'GFS Didot',serif", glyph: 'ΑΡΕΤΗ', numerals: 'roman', ornament: 'column', layout: 'frame', caps: true, track: '.05em',
    mark: { shape: '4px' },
    pattern: (i) =>
      `${band(24, 16, ln('M0 14H3V2H21V12H9V6H15V9M21 14H24', '.15', 1.4), 'calc(100% - 12px)')(i)},${tile(23, 19, "<g fill='$.13)'><circle cx='3' cy='4' r='.7'/><circle cx='14' cy='2' r='.5'/><circle cx='9' cy='11' r='.8'/><circle cx='19' cy='9' r='.6'/><circle cx='5' cy='16' r='.5'/><circle cx='17' cy='16' r='.7'/></g>")(i)}`,
  },
  // Unbleached kozo washi and sumi ink, a vermilion seal for the accent. Raked gravel rings; a brushed ensō.
  zen: {
    light: { paper: '#F1ECE1', accent: '#A8382A', cover: ['#E8E0CF', '#D3C7AF'], ink: '#1C1A17' },
    dark: { paper: '#2D2B27', accent: '#EC8A74', cover: ['#2B2926', '#161513'], ink: '#EEE8DC' },
    font: "'Shippori Mincho',serif", glyph: '禅', numerals: 'kanji', ornament: 'enso', layout: 'left',
    mark: { shape: '50%' },
    pattern: (i) => `repeating-radial-gradient(circle at 92% 18%,transparent 0 13px,rgba(${i},.09) 13px 14px)`,
  },
  // Song celadon glaze and ink; cloud scrolls. The taijitu within the eight trigrams.
  tao: {
    light: { paper: '#E1EDE4', accent: '#2B7356', cover: ['#B7CEBB', '#93B09D'], ink: '#12241B' },
    dark: { paper: '#1D302A', accent: '#80CBA9', cover: ['#1C3A30', '#10241D'], ink: '#DCEEE3' },
    font: "'Cormorant Garamond','Shippori Mincho',serif", glyph: '道', numerals: 'kanji', ornament: 'yinyang', layout: 'center',
    mark: { shape: '50%' },
    pattern: tile(46, 28, ln('M2 22C2 14 12 13 13 19C13.5 23 8.5 23.5 8 20M13 19C15 11 27 10 29 17C30 22 24 23 23.5 19.5M29 17C33 15 38 16 42 20', '.12', 1.2)),
  },
  // Monastic maroon wool and saffron; prayer flags along the top. The endless knot.
  tibet: {
    light: { paper: '#F5E4C8', accent: '#9B2C2D', cover: ['#741F25', '#4D1217'], ink: '#F6C75A' },
    dark: { paper: '#3E2219', accent: '#F2BC52', cover: ['#4D1418', '#2F0B0E'], ink: '#F6C75A' },
    font: 'Marcellus,serif', glyph: 'སྙིང་རྗེ', numerals: 'tibetan', ornament: 'lotus', layout: 'center',
    mark: { shape: '50%' },
    pattern: band(70, 24, "<path d='M0 3Q35 11 70 3' fill='none' stroke='$.16)' stroke-width='1'/><g fill='$.09)' stroke='$.15)' stroke-width='.8'><path d='M5 4.9h9v10h-9z'/><path d='M19 6.6h9v10h-9z'/><path d='M33 7h9v10h-9z'/><path d='M47 6.1h9v10h-9z'/><path d='M61 4h9v10h-9z'/></g>"),
  },
  // Sandalwood paste and kumkum; a lotus petal border. The Sri Yantra.
  vedanta: {
    light: { paper: '#F6E6D3', accent: '#A4471C', cover: ['#DDB78D', '#C6976A'], ink: '#3A1B0C' },
    dark: { paper: '#432A1B', accent: '#F09A62', cover: ['#4A2E1A', '#2E1B0E'], ink: '#F2D5B2' },
    font: "Spectral,Martel,serif", glyph: 'ॐ', numerals: 'devanagari', ornament: 'sun', layout: 'left',
    mark: { shape: '50%' },
    pattern: tile(22, 13, ln('M11 13C5 9 5 4 11 1C17 4 17 9 11 13ZM0 13C3 10.5 5 10 6 10M22 13C19 10.5 17 10 16 10', '.14', 1.1), true),
  },
  // The violet night of the Red Book's mandalas; circles squared in a lattice. The alchemists' squared circle.
  jung: {
    light: { paper: '#E4DDF3', accent: '#6047BE', cover: ['#4F3A8E', '#32245E'], ink: '#F6F2FC' },
    dark: { paper: '#2C2547', accent: '#B4A2F2', cover: ['#35285F', '#1F173C'], ink: '#F1ECF8' },
    font: "'Libre Caslon Text',serif", glyph: 'Selbst', numerals: 'roman', ornament: 'mandala', layout: 'left',
    mark: { shape: '38%' },
    pattern: tile(34, 34, "<g fill='none' stroke='$.08)' stroke-width='1'><circle cx='17' cy='17' r='9'/><path d='M10.6 10.6H23.4V23.4H10.6Z'/></g>"),
  },
  // Smoked buckskin and red ochre; a parfleche band. The thunderbird.
  animism: {
    light: { paper: '#EFE0D0', accent: '#8A5232', cover: ['#84553A', '#583824'], ink: '#FBF3E8' },
    dark: { paper: '#3D2C21', accent: '#DDA275', cover: ['#4F3424', '#312014'], ink: '#F5EBDD' },
    font: "'Zilla Slab',serif", glyph: 'Manidoo', numerals: 'latin', ornament: 'feather', layout: 'center',
    mark: { shape: '50%', clip: CLIP.HEXAGON },
    pattern: tile(24, 16, "<path d='M0 16L6 7L12 16Z' fill='$.11)'/><path d='M18 5L22 10L18 15L14 10Z' fill='none' stroke='$.15)' stroke-width='1.2'/>", true),
  },
  // Ndebele house paint: yellow ochre ground, black outlines; stepped geometry. A painted gateway.
  ubuntu: {
    light: { paper: '#F8E9BC', accent: '#8A5E0B', cover: ['#F0C64C', '#DCA22C'], ink: '#16120D' },
    dark: { paper: '#3F3317', accent: '#EEC352', cover: ['#3D2B0C', '#271B07'], ink: '#F3C94F' },
    font: "'Young Serif',serif", glyph: 'Umuntu', numerals: 'latin', ornament: 'rings', layout: 'left',
    mark: { shape: '6px' },
    pattern: tile(40, 40, ln('M0 34H8V26H16V18H24V26H32V34H40M20 18V8M0 3H40', '.09', 1.6)),
  },
  // The turquoise tile of the Green Dome at Konya; a khatam star lattice. A turning dervish.
  sufi: {
    light: { paper: '#CFEAEA', accent: '#15767F', cover: ['#17707A', '#0F4A52'], ink: '#F2FBFA' },
    dark: { paper: '#173A3C', accent: '#5CC4CB', cover: ['#11474C', '#0A2D31'], ink: '#ECF6F4' },
    font: 'Amiri,serif', glyph: 'عشق', numerals: 'arabic', ornament: 'star8', layout: 'center',
    mark: { shape: '0', clip: CLIP.OCTAGRAM },
    pattern: tile(32, 32, "<g fill='none' stroke='$.09)'><rect x='9' y='9' width='14' height='14'/><rect x='9' y='9' width='14' height='14' transform='rotate(45 16 16)'/></g>"),
  },
  // White pine and birch bark; birch lenticels. Thoreau's cabin at Walden.
  transc: {
    light: { paper: '#DDE8DA', accent: '#3A6E45', cover: ['#2F4D33', '#1D3221'], ink: '#F5F2E8' },
    dark: { paper: '#223128', accent: '#8DC79A', cover: ['#1F3524', '#122016'], ink: '#F0EDE3' },
    font: "'Libre Baskerville',serif", glyph: 'Nature', numerals: 'latin', ornament: 'leaf', layout: 'left', track: '.01em',
    mark: { shape: '50% 0 50% 0' },
    pattern: tile(34, 22, ln('M3 5H12M20 12H26M7 18H10M27 3H31', '.12', 1.4)),
  },
  // Banner red and poster cream; constructivist diagonals. Hammer, sickle and star.
  soviet: {
    light: { paper: '#EEDFDA', accent: '#B3141C', cover: ['#BA151E', '#760A10'], ink: '#FCF5E8' },
    dark: { paper: '#352828', accent: '#F2766A', cover: ['#7C0D13', '#4C070B'], ink: '#F5ECDD' },
    font: 'Oswald,sans-serif', glyph: 'МИР', numerals: 'latin', ornament: 'star5', layout: 'frame', caps: true, track: '.05em',
    mark: { shape: '0', clip: 'polygon(0 0,100% 0,100% 68%,68% 100%,0 100%)' },
    pattern: stripes(-45, '.07', 12, 24),
  },
  // Adire indigo cloth; resist-dyed circles. The opon Ifá.
  yoruba: {
    light: { paper: '#D8DAF0', accent: '#3A43A8', cover: ['#252C6A', '#161A43'], ink: '#F3F2FB' },
    dark: { paper: '#242955', accent: '#9AA2F4', cover: ['#1B2052', '#0F1232'], ink: '#EEEDF8' },
    font: 'Fraunces,serif', glyph: 'Orí', numerals: 'latin', ornament: 'drum', layout: 'center',
    mark: { shape: '50%' },
    pattern: tile(28, 28, "<circle cx='14' cy='14' r='8' fill='none' stroke='$.13)' stroke-width='1.4'/><circle cx='14' cy='14' r='2.4' fill='$.15)'/><g fill='$.12)'><circle cx='0' cy='0' r='1.6'/><circle cx='28' cy='0' r='1.6'/><circle cx='0' cy='28' r='1.6'/><circle cx='28' cy='28' r='1.6'/></g>"),
  },
  // Xiuhitl turquoise mosaic and obsidian; a stepped fret. The Sun Stone.
  aztec: {
    light: { paper: '#D3EEEC', accent: '#137A78', cover: ['#6CC2BC', '#44A09C'], ink: '#0B1D1C' },
    dark: { paper: '#173A3B', accent: '#59CFC8', cover: ['#1B1E1F', '#0D0F10'], ink: '#7FD8CF' },
    font: 'Bevan,serif', glyph: 'Ollin', numerals: 'latin', ornament: 'sunstone', layout: 'left',
    mark: { shape: '14%' },
    pattern: tile(32, 16, ln('M0 16V9H7V2H17V9H11V16', '.14', 1.6), true),
  },
  // Lapis lazuli and gold leaf; the starred ceilings of the tombs. The ankh raised on the djed.
  egypt: {
    light: { paper: '#E9E1C9', accent: '#2A4EA5', cover: ['#244A9E', '#152E68'], ink: '#F1D07A' },
    dark: { paper: '#1E2742', accent: '#EBC76A', cover: ['#172E68', '#0D1C44'], ink: '#F1D07A' },
    font: "'Cinzel Decorative',serif", glyph: '𓋹𓈖𓐍', numerals: 'latin', ornament: 'ankh', layout: 'frame',
    mark: { shape: '50% 50% 10px 10px' },
    pattern: tile(30, 30, "<g fill='$.13)'><path d='M8 4L9.2 7.6H13L9.9 9.8L11.1 13.4L8 11.2L4.9 13.4L6.1 9.8L3 7.6H6.8Z'/><path d='M23 19L24.2 22.6H28L24.9 24.8L26.1 28.4L23 26.2L19.9 28.4L21.1 24.8L18 22.6H21.8Z'/></g>"),
  },
  // Emerald and alchemical gold; a fine lattice. The caduceus.
  hermes: {
    light: { paper: '#D6EADF', accent: '#127052', cover: ['#0F5B44', '#093B2C'], ink: '#EED48E' },
    dark: { paper: '#18352A', accent: '#62CBA0', cover: ['#0A3B2C', '#05251B'], ink: '#EED48E' },
    font: "'IM Fell English','GFS Didot',serif", glyph: 'ΕΡΜΗΣ', numerals: 'roman', ornament: 'hexagram', layout: 'center',
    mark: { shape: '8px', clip: 'polygon(50% 0%,100% 50%,50% 100%,0% 50%)' },
    pattern: (i) => `repeating-linear-gradient(45deg,rgba(${i},.06) 0 1px,transparent 1px 14px),repeating-linear-gradient(-45deg,rgba(${i},.06) 0 1px,transparent 1px 14px)`,
  },
  // Murex purple on Coptic linen; scattered sparks of light. The ouroboros.
  gnostic: {
    light: { paper: '#EEDDEB', accent: '#7A3373', cover: ['#5C2453', '#3B1536'], ink: '#F4EBDD' },
    dark: { paper: '#36203A', accent: '#D9A0D2', cover: ['#3A1838', '#230E22'], ink: '#EFE5D5' },
    font: "Forum,'GFS Didot',serif", glyph: 'ΓΝΩΣΙΣ', numerals: 'greek', ornament: 'pleroma', layout: 'left',
    mark: { shape: '50%' },
    pattern: tile(46, 46, "<path d='M12 8L13 12L17 13L13 14L12 18L11 14L7 13L11 12ZM34 29L34.7 32.3L38 33L34.7 33.7L34 37L33.3 33.7L30 33L33.3 32.3Z' fill='$.15)'/>"),
  },
  // Fjord water and tarred iron, bone ink; a two strand plait. The Oseberg ship.
  norse: {
    light: { paper: '#D8E3E8', accent: '#2F6A84', cover: ['#2D4B5B', '#1C313D'], ink: '#F2EFE7' },
    dark: { paper: '#1D323D', accent: '#86C3DB', cover: ['#1C3140', '#101F28'], ink: '#EEEBE3' },
    font: 'Metamorphous,serif', glyph: 'Urðr', numerals: 'latin', ornament: 'longship', layout: 'left', track: '.01em',
    mark: { shape: '0', clip: CLIP.SHIELD },
    pattern: tile(24, 14, ln('M0 4C6 4 6 11 12 11C18 11 18 4 24 4M0 11C6 11 6 4 12 4C18 4 18 11 24 11', '.15', 1.4), true),
  },
  // Olive wood and Attic clay; the running dog scroll. Diogenes' pithos.
  cynic: {
    light: { paper: '#E8E6C4', accent: '#6A691C', cover: ['#5F5E22', '#3E3D14'], ink: '#FBF7EA' },
    dark: { paper: '#36351B', accent: '#CDCB6E', cover: ['#3C3B15', '#25240C'], ink: '#F5F0E0' },
    font: "Vollkorn,'GFS Didot',serif", glyph: 'κύων', numerals: 'greek', ornament: 'lantern', layout: 'left',
    mark: { shape: '50%' },
    pattern: tile(28, 14, ln('M0 11C8 11 9 3 15 3C19.5 3 20.5 8 17.5 8.5C15.5 9 15 6.5 17 6.3M15 3C21 3 22 11 28 11', '.14', 1.3), true),
  },
  // Cinnabar lacquer and gold; the huiwen fret. A bronze ding.
  confucian: {
    light: { paper: '#F2E2CD', accent: '#9B2D20', cover: ['#8D2A1C', '#5A1910'], ink: '#F2D490' },
    dark: { paper: '#41231C', accent: '#EE9A84', cover: ['#581A11', '#370E08'], ink: '#F2D490' },
    font: "'Noto Serif SC','Shippori Mincho',serif", glyph: '仁', numerals: 'kanji', ornament: 'seal', layout: 'frame',
    mark: { shape: '4px' },
    pattern: tile(28, 28, ln('M0 14H8V6H20V22H8V14M20 14H28', '.09', 1.3)),
  },
  // Samarra lustre: amber glaze and cream; an arcade along the foot. The spiral minaret.
  abbasid: {
    light: { paper: '#EFE3C8', accent: '#7F5A17', cover: ['#6E4B16', '#48300C'], ink: '#FBF3E2' },
    dark: { paper: '#3A2E1A', accent: '#DDB766', cover: ['#45300D', '#2B1E07'], ink: '#F4EBD8' },
    font: "'Reem Kufi',sans-serif", glyph: 'حكمة', numerals: 'arabic', ornament: 'arch', layout: 'left',
    mark: { shape: '50%' },
    pattern: tile(22, 22, ln('M2 22V12C2 7 6 5 11 1.5C16 5 20 7 20 12V22', '.13', 1.3), true),
  },
  // Black lacquer and gold leaf; a sunburst. The Chrysler crown.
  twenties: {
    light: { paper: '#EDE4D0', accent: '#7C5E14', cover: ['#252327', '#111013'], ink: '#E8C873' },
    dark: { paper: '#26221C', accent: '#E3BF62', cover: ['#1C1B1F', '#0D0C0F'], ink: '#E8C873' },
    font: 'Limelight,serif', glyph: 'Jazz', numerals: 'roman', ornament: 'fan', layout: 'frame', caps: true, track: '.06em',
    mark: { shape: '0', clip: CLIP.DECO },
    pattern: (i) => `repeating-conic-gradient(from -90deg at 50% 100%,rgba(${i},.08) 0 3deg,transparent 3deg 9deg)`,
  },
  // Havana pastel stucco and tobacco brown; medio punto fanlights. A royal palm before the mogotes.
  cuba: {
    light: { paper: '#FADDE3', accent: '#B03A5B', cover: ['#F2B4BF', '#E396A6'], ink: '#3A1620' },
    dark: { paper: '#47202B', accent: '#F590AE', cover: ['#5A1E2E', '#38121C'], ink: '#F8E6EA' },
    font: "'Lobster Two',cursive", glyph: 'Son', numerals: 'latin', ornament: 'palm', layout: 'left',
    mark: { shape: '36%' },
    pattern: tile(40, 22, "<g fill='none' stroke='$.13)' stroke-width='1.2'><path d='M3 22A17 17 0 0 1 37 22M11 22A9 9 0 0 1 29 22M20 13V5M13.6 15.6L8 10M26.4 15.6L32 10'/></g>", true),
  },
  // Marigold garlands and kumkum; a toran along the top. The kalasha.
  hindu: {
    light: { paper: '#FFE6BD', accent: '#B4500A', cover: ['#F49D3C', '#E08428'], ink: '#4A0A16' },
    dark: { paper: '#46290E', accent: '#FFAA45', cover: ['#4A1E04', '#301302'], ink: '#FFC170' },
    font: 'Eczar,serif', glyph: 'धर्म', numerals: 'devanagari', ornament: 'diya', layout: 'left',
    mark: { shape: '50%' },
    pattern: band(24, 20, "<path d='M0 2Q12 10 24 2' fill='none' stroke='$.14)' stroke-width='1.2'/><g fill='$.12)'><circle cx='5.5' cy='4.8' r='2.6'/><circle cx='12' cy='6' r='2.6'/><circle cx='18.5' cy='4.8' r='2.6'/><path d='M12 9C10 12 10.5 15 12 18.5C13.5 15 14 12 12 9Z'/></g>"),
  },
  // Lotus pink and rose madder of temple banners; lotus scallops. A five storey pagoda.
  mahayana: {
    light: { paper: '#F3DCE6', accent: '#9C3F68', cover: ['#8C3A5E', '#5C2440'], ink: '#FCF1F4' },
    dark: { paper: '#40222F', accent: '#EE9CC0', cover: ['#5A2440', '#391628'], ink: '#F6E9EE' },
    font: "'Zen Old Mincho','Shippori Mincho',serif", glyph: '空', numerals: 'kanji', ornament: 'wheel', layout: 'left',
    mark: { shape: '50% 50% 50% 50%/62% 62% 38% 38%' },
    pattern: tile(28, 16, ln('M0 16Q7 2 14 16Q21 2 28 16M7 16Q14 6 21 16'), true),
  },
  // Saffron robe cloth and gold leaf; bodhi leaves. A bell chedi.
  theravada: {
    light: { paper: '#F8E2C8', accent: '#A4501A', cover: ['#9A4C14', '#68310B'], ink: '#FFF6EA' },
    dark: { paper: '#43291A', accent: '#F6A964', cover: ['#6A300A', '#432005'], ink: '#FBEBD6' },
    font: 'Trirong,serif', glyph: 'ธรรม', numerals: 'thai', ornament: 'stupa', layout: 'center',
    mark: { shape: '50%' },
    pattern: tile(30, 34, "<path d='M15 6C9 9 7 15 10 20C11.5 22.5 14 24 15 28C16 24 18.5 22.5 20 20C23 15 21 9 15 6ZM15 8V25' fill='none' stroke='$.11)' stroke-width='1.1'/>"),
  },
  // Vermilion shu lacquer and white paper; shide hung along the top. A torii with its shimenawa.
  shinto: {
    light: { paper: '#F8EDE6', accent: '#BC3A22', cover: ['#B5351D', '#842212'], ink: '#FFF8F0' },
    dark: { paper: '#2E2522', accent: '#F58270', cover: ['#7E2010', '#4F1308'], ink: '#F8EDE3' },
    font: "'Kaisei Opti','Shippori Mincho',serif", glyph: '神', numerals: 'kanji', ornament: 'torii', layout: 'left',
    mark: { shape: '8px' },
    pattern: band(44, 24, "<path d='M0 2.5H44' stroke='$.16)' stroke-width='2'/><path d='M14 3V7L19 10.5L14 14L19 17.5L14 21' fill='none' stroke='$.15)' stroke-width='1.2'/>"),
  },
  // White Makrana marble and saffron; the three jewels under the crescent. The hand of ahimsa.
  jain: {
    light: { paper: '#F6EDE2', accent: '#A63E14', cover: ['#F2ECE2', '#DCD2C1'], ink: '#7E2810' },
    dark: { paper: '#3A2A1E', accent: '#F4A060', cover: ['#3A2A1E', '#231910'], ink: '#F6E5CE' },
    font: "'Rozha One',serif", glyph: 'अहिंसा', numerals: 'devanagari', ornament: 'hand', layout: 'center',
    mark: { shape: '50%' },
    pattern: tile(30, 26, "<g fill='$.13)'><circle cx='9' cy='15' r='1.4'/><circle cx='15' cy='15' r='1.4'/><circle cx='21' cy='15' r='1.4'/></g><path d='M10 9.5Q15 12.5 20 9.5' fill='none' stroke='$.13)' stroke-width='1.2'/>"),
  },
  // Nihang blue and kesri saffron; phulkari stitches. The Khanda.
  sikh: {
    light: { paper: '#FBE6C6', accent: '#0E4C92', cover: ['#173A73', '#0D244C'], ink: '#F7B54E' },
    dark: { paper: '#14283F', accent: '#F2A33A', cover: ['#0E2550', '#081833'], ink: '#F7B54E' },
    font: "'Anek Gurmukhi',sans-serif", glyph: 'ੴ', numerals: 'gurmukhi', ornament: 'khanda', layout: 'center',
    mark: { shape: '50%' },
    pattern: tile(24, 24, "<path d='M12 3L21 12L12 21L3 12Z' fill='none' stroke='$.1)' stroke-width='1.2'/><path d='M12 8L16 12L12 16L8 12Z' fill='$.1)'/>"),
  },
  // Ash and the ember of the sacred fire; Persepolis merlons. The Faravahar.
  zoroaster: {
    light: { paper: '#F6E4D2', accent: '#B0431A', cover: ['#3B3532', '#211D1B'], ink: '#F7B26C' },
    dark: { paper: '#2B1B13', accent: '#FF9D52', cover: ['#272220', '#151211'], ink: '#F7B26C' },
    font: "'Gilda Display',serif", glyph: 'Asha', numerals: 'persian', ornament: 'flame', layout: 'center',
    mark: { shape: '50% 50% 50% 50%/70% 70% 30% 30%' },
    pattern: tile(20, 12, "<path d='M0 12V9H4V5H8V1H12V5H16V9H20V12Z' fill='$.1)'/>", true),
  },
  // Techelet blue and tallit white; woven bands. The menorah of the Temple.
  judaism: {
    light: { paper: '#E1EAF4', accent: '#1F4F86', cover: ['#2C6597', '#1B436A'], ink: '#F7F9FC' },
    dark: { paper: '#172437', accent: '#9CC2EE', cover: ['#1A355E', '#0F213D'], ink: '#EFF3F9' },
    font: "'Frank Ruhl Libre',serif", glyph: 'חי', numerals: 'hebrew', ornament: 'menorah', layout: 'frame',
    mark: { shape: '10px' },
    pattern: (i) => `repeating-linear-gradient(0deg,transparent 0 22px,rgba(${i},.08) 22px 25px,transparent 25px 28px,rgba(${i},.05) 28px 29px,transparent 29px 46px)`,
  },
  // Byzantine gold mosaic, ultramarine and crimson; tesserae. The Chi-Rho.
  christian: {
    light: { paper: '#F4EAD2', accent: '#7B1E3A', cover: ['#E3C57E', '#C9A257'], ink: '#24183E' },
    dark: { paper: '#3A1722', accent: '#E6C36A', cover: ['#58101F', '#360913'], ink: '#EBCB7C' },
    font: "'EB Garamond','GFS Didot',serif", glyph: 'ΙΧΘΥΣ', numerals: 'roman', ornament: 'cross', layout: 'center',
    mark: { shape: '50% 50% 8px 8px' },
    pattern: tile(12, 9, ln('M0 .5H12M3 .5V4.5M9 4.5V9M0 4.5H12', '.07', 0.8)),
  },
  // The green of the Prophet's banner and white; a hexagonal lattice. A ten-fold girih rosette.
  sunni: {
    light: { paper: '#D8EBDA', accent: '#17683A', cover: ['#13703D', '#0B4A27'], ink: '#F4FAF5' },
    dark: { paper: '#15301F', accent: '#6CCB8F', cover: ['#0E4A2A', '#082F1B'], ink: '#ECF5EE' },
    font: "'Aref Ruqaa',serif", glyph: 'توحيد', numerals: 'arabic', ornament: 'crescent', layout: 'center',
    mark: { shape: '0', clip: CLIP.OCT },
    pattern: tile(24, 42, ln('M12 0L24 7V21L12 28L0 21V7ZM12 28V42', '.09')),
  },
}
