import type { CSSProperties } from 'react'
import { numeral, type NumeralSet } from './numerals'
import type { OndaIndex } from './schema'

/* Per-Onda aesthetics: pastel tone, pattern, display face and glyph, taken from the prototype.
   Each theme also has a dark variant. The "Onda themes" setting turns all of this off, leaving the plain tone. */

const sv = (s: string) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`

interface Theme {
  bg: string
  strong: string
  darkBg: string
  darkStrong: string
  glyph: string
  font: string
  /** CSS background layers; `i` is the ink as "r,g,b" so the pattern works on light and dark fills. */
  pattern: (i: string) => string
  /** Extras that make each Onda feel like its own place. */
  shape: string
  clip?: string
  radius: string
  numerals: NumeralSet
  ornament: Ornament
  caps?: boolean
  track?: string
}

export type Ornament = 'column' | 'enso' | 'yinyang' | 'lotus' | 'sun' | 'mandala' | 'feather' | 'rings' | 'star8' | 'leaf' | 'dot'

const OCTAGRAM = 'polygon(50% 0%,64.5% 14.9%,85.4% 14.6%,85.1% 35.5%,100% 50%,85.1% 64.5%,85.4% 85.4%,64.5% 85.1%,50% 100%,35.5% 85.1%,14.6% 85.4%,14.9% 64.5%,0% 50%,14.9% 35.5%,14.6% 14.6%,35.5% 14.9%)'
const HEXAGON = 'polygon(25% 4%,75% 4%,100% 50%,75% 96%,25% 96%,0% 50%)'

export const THEMES: Record<string, Theme> = {
  stoic: {
    shape: '10px', radius: '16px', numerals: 'roman', ornament: 'column', caps: true, track: '.05em',
    bg: '#D5DCE8', strong: '#5B6F8F', darkBg: '#2A3344', darkStrong: '#8EA3C6', glyph: 'ΑΡΕΤΗ', font: 'Cinzel,serif',
    pattern: (i) => `${sv(`<svg xmlns='http://www.w3.org/2000/svg' width='24' height='16'><path d='M0 14H3V2H21V12H9V6H15V9M21 14H24' fill='none' stroke='rgba(${i},.16)' stroke-width='1.5'/></svg>`)} repeat-x 0 calc(100% - 6px)/24px 16px`,
  },
  zen: {
    shape: '50%', radius: '34px', numerals: 'kanji', ornament: 'enso',
    bg: '#E6E2D6', strong: '#6F6C5C', darkBg: '#37352C', darkStrong: '#A8A48F', glyph: '禅', font: "'Shippori Mincho',serif",
    pattern: (i) => `repeating-radial-gradient(circle at 100% 0,transparent 0 14px,rgba(${i},.07) 14px 15px)`,
  },
  tao: {
    shape: '50%', radius: '40px', numerals: 'kanji', ornament: 'yinyang',
    bg: '#CFE4DB', strong: '#4C8A78', darkBg: '#22382F', darkStrong: '#6FB59F', glyph: '道', font: "'Cormorant Garamond',serif",
    pattern: (i) => `${sv(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='14'><path d='M0 7Q10 0 20 7T40 7' fill='none' stroke='rgba(${i},.14)' stroke-width='1.2'/></svg>`)} 0 0/40px 14px`,
  },
  tibet: {
    shape: '50%', radius: '22px', numerals: 'tibetan', ornament: 'lotus',
    bg: '#F3DAB8', strong: '#C26A2C', darkBg: '#46331D', darkStrong: '#E08A4A', glyph: 'ཨོཾ', font: 'Marcellus,serif',
    pattern: () => 'linear-gradient(90deg,#4F8EF7 0 20%,#FFFFFF 20% 40%,#F2745A 40% 60%,#3FA877 60% 80%,#E8B93A 80% 100%) 0 0/100% 7px no-repeat',
  },
  vedanta: {
    shape: '50%', radius: '30px', numerals: 'devanagari', ornament: 'sun',
    bg: '#F6D6C6', strong: '#D9663F', darkBg: '#4A2A1E', darkStrong: '#F0835C', glyph: 'ॐ', font: 'Spectral,serif',
    pattern: (i) => `repeating-conic-gradient(from 0deg at 50% 120%,rgba(${i},.07) 0 5deg,transparent 5deg 10deg)`,
  },
  jung: {
    shape: '38%', radius: '26px', numerals: 'roman', ornament: 'mandala',
    bg: '#D9D3EE', strong: '#6F63C2', darkBg: '#2F2A4A', darkStrong: '#9A8EE6', glyph: 'Ψ', font: "'Libre Caslon Text',serif",
    pattern: (i) => `radial-gradient(rgba(${i},.2) 1px,transparent 1.5px) 0 0/14px 14px`,
  },
  animism: {
    shape: '50%', clip: HEXAGON, radius: '18px', numerals: 'latin', ornament: 'feather',
    bg: '#E8CFB8', strong: '#A8613A', darkBg: '#44301F', darkStrong: '#CB8459', glyph: 'Kin', font: "'Zilla Slab',serif",
    pattern: (i) => `linear-gradient(135deg,rgba(${i},.07) 25%,transparent 25%) 0 0/22px 22px,linear-gradient(225deg,rgba(${i},.07) 25%,transparent 25%) 0 0/22px 22px`,
  },
  ubuntu: {
    shape: '50%', radius: '32px', numerals: 'latin', ornament: 'rings',
    bg: '#F4DE9E', strong: '#C9962A', darkBg: '#45391A', darkStrong: '#E0B04A', glyph: 'Umuntu', font: "'Young Serif',serif",
    pattern: (i) => `repeating-linear-gradient(90deg,rgba(${i},.09) 0 5px,transparent 5px 13px,rgba(${i},.05) 13px 15px,transparent 15px 24px)`,
  },
  sufi: {
    shape: '0', clip: OCTAGRAM, radius: '30px 8px 30px 8px', numerals: 'arabic', ornament: 'star8',
    bg: '#C2E4E5', strong: '#2E8C94', darkBg: '#1D3A3C', darkStrong: '#4FB3BC', glyph: 'عشق', font: 'Amiri,serif',
    pattern: (i) => `${sv(`<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><rect x='9' y='9' width='14' height='14' fill='none' stroke='rgba(${i},.09)'/><rect x='9' y='9' width='14' height='14' transform='rotate(45 16 16)' fill='none' stroke='rgba(${i},.09)'/></svg>`)} 0 0/32px 32px`,
  },
  transc: {
    shape: '50% 0 50% 0', radius: '28px 6px 28px 6px', numerals: 'latin', ornament: 'leaf', track: '.01em',
    bg: '#CDE4C3', strong: '#4F8A3D', darkBg: '#26391F', darkStrong: '#77B562', glyph: 'Nature', font: "'Libre Baskerville',serif",
    pattern: (i) => `repeating-linear-gradient(0deg,rgba(${i},.06) 0 1px,transparent 1px 11px)`,
  },
}

const TONES: Record<string, { bg: string; strong: string; darkBg: string; darkStrong: string }> = {
  blue: { bg: '#A9C4F7', strong: '#4F8EF7', darkBg: '#22355C', darkStrong: '#6FA4FF' },
  green: { bg: '#9FD9B8', strong: '#3FA877', darkBg: '#1F3D2D', darkStrong: '#5BBA87' },
  yellow: { bg: '#FDDF9A', strong: '#E8B93A', darkBg: '#4A3C16', darkStrong: '#FFD25A' },
  coral: { bg: '#FFB19C', strong: '#F2745A', darkBg: '#532A20', darkStrong: '#FF8A65' },
  purple: { bg: '#B7A8F0', strong: '#7F6BE0', darkBg: '#302757', darkStrong: '#9F8BF0' },
}
export const TONE_KEYS = ['blue', 'green', 'yellow', 'coral', 'purple'] as const
export const toneFill = (tone: string, dark: boolean) => (dark ? TONES[tone]?.darkBg : TONES[tone]?.bg) ?? TONES.blue!.bg

export interface OndaLook {
  /** CSS custom properties to spread on a wrapper; components read --onda-* */
  vars: CSSProperties
  fill: string
  solid: string
  strong: string
  font: string
  glyph: string
  /** Display size for the glyph watermark: long glyphs are set smaller. */
  glyphSize: number
  /** Rule and index numbers in the tradition's own numerals. */
  numeral: (n: number) => string
  ornament: Ornament
  /** Titles are set in capitals (they run wider). */
  caps: boolean
}

/** Resolve the look of an Onda for the current appearance. */
export function ondaLook(o: Pick<OndaIndex, 'id' | 'tone'> | undefined, opts: { themed: boolean; dark: boolean }): OndaLook {
  const t = o ? THEMES[o.id] : undefined
  const { dark, themed } = opts
  const ink = dark ? '#F4F4F5' : '#000000'
  const rgb = dark ? '255,255,255' : '0,0,0'
  let solid: string, strong: string, fill: string, font: string, glyph: string
  let shape = '50%', clip = 'none', radius = '26px', set: NumeralSet = 'latin', ornament: Ornament = 'dot', track = '0', caps = false
  if (t) {
    solid = dark ? t.darkBg : t.bg
    strong = dark ? t.darkStrong : t.strong
    fill = themed ? `${t.pattern(rgb)},${solid}` : solid
    font = themed ? t.font : 'var(--font-serif)'
    glyph = t.glyph
    if (themed) ({ shape, radius, numerals: set, ornament, track = '0', caps = false } = t)
    clip = themed ? (t.clip ?? 'none') : 'none'
  } else {
    const c = TONES[o?.tone ?? 'blue'] ?? TONES.blue!
    solid = dark ? c.darkBg : c.bg
    strong = dark ? c.darkStrong : c.strong
    fill = solid
    font = 'var(--font-serif)'
    glyph = ''
  }
  const glyphSize = glyph.length > 3 ? 44 : 88
  return {
    fill, solid, strong, font, glyph, glyphSize, ornament, caps,
    numeral: (n) => numeral(set, n),
    vars: {
      '--onda-fill': fill,
      '--onda-solid': solid,
      '--onda-strong': strong,
      '--onda-font': font,
      '--onda-ink': ink,
      '--onda-sub': dark ? '#C9C9CE' : '#3A3A3C',
      '--onda-chip': dark ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.6)',
      '--onda-rest': dark ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.6)',
      '--onda-shape': shape,
      '--onda-clip': clip,
      '--onda-radius': radius,
      '--onda-track': track,
      '--onda-case': caps ? 'uppercase' : 'none',
      '--onda-now': dark ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.45)',
    } as CSSProperties,
  }
}
