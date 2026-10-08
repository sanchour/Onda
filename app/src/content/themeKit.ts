import type { NumeralSet } from './numerals'

/* Shared pieces for the per-Onda themes (themes.ts and themes5.ts). */

export const sv = (s: string) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`

export interface Theme {
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

export type Ornament =
  | 'column' | 'enso' | 'yinyang' | 'lotus' | 'sun' | 'mandala' | 'feather' | 'rings' | 'star8' | 'leaf' | 'dot' | 'ankh' | 'star5' | 'sunstone' | 'drum' | 'hexagram' | 'pleroma'
  | 'longship' | 'lantern' | 'seal' | 'arch' | 'fan' | 'palm'
  | 'diya' | 'wheel' | 'stupa' | 'torii' | 'hand' | 'khanda' | 'flame' | 'menorah' | 'cross' | 'crescent' | 'dome' | 'lion' | 'apple'
  | 'solid' | 'atom' | 'cup' | 'starsky' | 'bolt' | 'couch' | 'boulder' | 'charkha'
  | 'laurel' | 'cash' | 'ger' | 'tulip' | 'paisley' | 'kris' | 'chakana' | 'crown' | 'orb'
  | 'peace' | 'dividers' | 'shield' | 'boomerang' | 'pompeblad' | 'hook' | 'shell' | 'stickchart'
  | 'beads' | 'mbira' | 'prasat' | 'triskele'

/** A small SVG tile. In `body`, `$` stands for the ink colour up to its alpha: stroke='$.12)'.
 *  `edge` runs the tile once along the bottom instead of filling the card. */
export const tile = (w: number, h: number, body: string, edge = false) => (i: string) =>
  `${sv(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${body.replace(/\$/g, `rgba(${i},`)}</svg>`)} ${edge ? `repeat-x 0 100%/${w}px ${h}px` : `0 0/${w}px ${h}px`}`

/** A stroked path for `tile`. */
export const ln = (d: string, a = '.12', w = 1.3) => `<path d='${d}' fill='none' stroke='$${a})' stroke-width='${w}'/>`
