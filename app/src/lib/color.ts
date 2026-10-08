/* The accent follows the running Onda. These helpers keep text on it readable (WCAG contrast 4.5:1). */

const parse = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  const n = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)) as [number, number, number]
}
const toHex = (c: [number, number, number]) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase()

const lin = (v: number) => {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
export const luminance = (hex: string) => {
  const [r, g, b] = parse(hex)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}
export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

/** Accent and the colour of text on it. Light mode darkens the Onda's strong colour until white text reads on it;
 *  dark mode keeps the lighter colour and picks near-black or white text, whichever reads better. */
export function accentFor(strong: string, dark: boolean): { accent: string; on: string } {
  if (!dark) {
    let c = parse(strong)
    for (let i = 0; i < 12 && contrast(toHex(c), '#FFFFFF') < 4.5; i++) c = c.map((v) => v * 0.92) as [number, number, number]
    return { accent: toHex(c), on: '#FFFFFF' }
  }
  const on = contrast(strong, '#0B0B0D') >= contrast(strong, '#FFFFFF') ? '#0B0B0D' : '#FFFFFF'
  return { accent: strong, on }
}

/** A version of `strong` that reads as text (4.6:1) on every given background: darker in light mode, lighter in dark mode. */
export function readableText(strong: string, backgrounds: string[], dark: boolean): string {
  let c = parse(strong)
  for (let i = 0; i < 24 && backgrounds.some((b) => contrast(toHex(c), b) < 4.6); i++) {
    c = (dark ? c.map((v) => v + (255 - v) * 0.1) : c.map((v) => v * 0.93)) as [number, number, number]
  }
  return toHex(c)
}

/** Blend two colours: `t` of the way from `a` to `b`. */
export function mix(a: string, b: string, t: number): string {
  const x = parse(a)
  const y = parse(b)
  return toHex([0, 1, 2].map((i) => x[i]! + (y[i]! - x[i]!) * t) as [number, number, number])
}
