import { contrast, mix } from '@/lib/color'
import type { NumeralSet } from './numerals'

/* Onda 7 theme type and the helpers the theme files (themes/a.ts, themes/b.ts) use. See docs/ONDA7_DESIGN.md. */

export const sv = (s: string) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`

/** One appearance (light or dark) of a tradition. */
export interface Palette {
  /** Soft tint of the tradition: behind numeral marks, the tile of a custom Onda and the app background wash. */
  paper: string
  /** Tint for line icons, checks, progress and links on the calm system surfaces. */
  accent: string
  /** The cover material: two stops of a 160deg gradient, deep enough that `ink` reads on both (5.2:1 light, 8:1 dark). */
  cover: [string, string]
  /** Text, emblem and pattern colour on the cover. */
  ink: string
}

/** Where the emblem sits on a cover. `left`: large and cropped at the right edge, text bottom left.
 *  `center`: a seal above a centred title. `frame`: a hairline frame inset on the cover, centred like a title page. */
export type CoverLayout = 'left' | 'center' | 'frame'

export interface Theme {
  light: Palette
  dark: Palette
  /** Display face, used only for the Onda's name, titles and quotes. */
  font: string
  /** A word in the tradition's own script, set as a quiet line on the cover. */
  glyph: string
  /** CSS background layers drawn on the cover; `i` is the cover ink as "r,g,b". */
  pattern: (i: string) => string
  /** Small line glyph for dividers and section marks (24 unit grid, see KindArt.tsx). Unique per Onda. */
  ornament: Ornament
  /** Key in the emblem registry (screens/emblems). Defaults to the Onda id. */
  emblem?: string
  numerals: NumeralSet
  layout: CoverLayout
  /** Names and titles in capitals, with this tracking. */
  caps?: boolean
  track?: string
  /** Shape of small numeral marks (rule numbers): a border radius and an optional clip path. */
  mark?: { shape: string; clip?: string }
}

export type ThemeSet = Record<string, Theme>

export type Ornament =
  | 'column' | 'enso' | 'yinyang' | 'lotus' | 'sun' | 'mandala' | 'feather' | 'rings' | 'star8' | 'leaf' | 'dot' | 'ankh' | 'star5' | 'sunstone' | 'drum' | 'hexagram' | 'pleroma'
  | 'longship' | 'lantern' | 'seal' | 'arch' | 'fan' | 'palm'
  | 'diya' | 'wheel' | 'stupa' | 'torii' | 'hand' | 'khanda' | 'flame' | 'menorah' | 'cross' | 'crescent' | 'dome' | 'lion' | 'apple'
  | 'solid' | 'atom' | 'cup' | 'starsky' | 'bolt' | 'couch' | 'boulder' | 'charkha'
  | 'laurel' | 'cash' | 'ger' | 'tulip' | 'paisley' | 'kris' | 'chakana' | 'crown' | 'orb'
  | 'peace' | 'dividers' | 'shield' | 'boomerang' | 'pompeblad' | 'hook' | 'shell' | 'stickchart'
  | 'beads' | 'mbira' | 'prasat' | 'triskele'

/** Clip paths for numeral marks. */
export const CLIP = {
  OCTAGRAM: 'polygon(50% 0%,64.5% 14.9%,85.4% 14.6%,85.1% 35.5%,100% 50%,85.1% 64.5%,85.4% 85.4%,64.5% 85.1%,50% 100%,35.5% 85.1%,14.6% 85.4%,14.9% 64.5%,0% 50%,14.9% 35.5%,14.6% 14.6%,35.5% 14.9%)',
  SHIELD: 'polygon(0 0,100% 0,100% 58%,50% 100%,0 58%)',
  DECO: 'polygon(28% 0,72% 0,100% 28%,100% 72%,72% 100%,28% 100%,0 72%,0 28%)',
  HEXAGON: 'polygon(25% 4%,75% 4%,100% 50%,75% 96%,25% 96%,0% 50%)',
  OCT: 'polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)',
  DIAMOND: 'polygon(50% 0,100% 50%,50% 100%,0 50%)',
  PENT: 'polygon(50% 0,100% 38%,81% 100%,19% 100%,0 38%)',
  STEP: 'polygon(22% 0,78% 0,78% 22%,100% 22%,100% 78%,78% 78%,78% 100%,22% 100%,22% 78%,0 78%,0 22%,22% 22%)',
  GATE: 'polygon(0 100%,0 34%,50% 0,100% 34%,100% 100%)',
  SHIELD5: 'polygon(0 0,100% 0,100% 60%,50% 100%,0 60%)',
} as const

/** A small SVG tile. In `body`, `$` stands for the ink colour up to its alpha: stroke='$.12)'.
 *  `edge` runs the tile once along the bottom instead of filling the cover. */
export const tile = (w: number, h: number, body: string, edge = false) => (i: string) =>
  `${sv(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${body.replace(/\$/g, `rgba(${i},`)}</svg>`)} ${edge ? `repeat-x 0 100%/${w}px ${h}px` : `0 0/${w}px ${h}px`}`

/** A stroked path for `tile`. */
export const ln = (d: string, a = '.12', w = 1.3) => `<path d='${d}' fill='none' stroke='$${a})' stroke-width='${w}'/>`

/** Even stripes at an angle. */
export const stripes = (deg: number, a: string, on: number, gap: number) => (i: string) => `repeating-linear-gradient(${deg}deg,rgba(${i},${a}) 0 ${on}px,transparent ${on}px ${gap}px)`

/** A cover material and ink from an accent colour: the accent deepened until the ink reads on it.
 *  Used for custom Ondas; the shipped themes were seeded with it and can be tuned by hand. */
export function coverFrom(accent: string, dark: boolean): Pick<Palette, 'cover' | 'ink'> {
  const ink = dark ? '#F3EEE4' : '#FBF7EF'
  let base = dark ? mix(accent, '#000000', 0.5) : accent
  for (let i = 0; i < 24 && contrast(ink, base) < (dark ? 8 : 5.2); i++) base = mix(base, '#000000', 0.08)
  return { cover: [base, mix(base, '#000000', 0.32)], ink }
}

/** The neutral cover used when Onda themes are off. */
export const NEUTRAL_COVER = {
  light: { cover: ['#ECE9E2', '#DEDAD1'] as [string, string], ink: '#1C1C1E' },
  dark: { cover: ['#2E2F33', '#232427'] as [string, string], ink: '#F4F4F5' },
}

/** "#RRGGBB" as "r,g,b" for rgba() patterns. */
export const rgbOf = (hex: string) => {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',')
}
