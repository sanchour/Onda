import type { CSSProperties } from 'react'
import { accentFor, mix, readableText } from '@/lib/color'
import { numeral, type NumeralSet } from './numerals'
import type { OndaIndex } from './schema'
import { CORNER_R, SOULS, grainBackground, type Motion } from './souls'
import { NEUTRAL_COVER, coverFrom, rgbOf, type CoverLayout, type Ornament, type Palette, type Theme } from './themeKit'
import { THEMES_A } from './themes/a'
import { THEMES_B } from './themes/b'
import { THEMES_C } from './themes/c'

export type { CoverLayout, Ornament, Palette, Theme } from './themeKit'

/* Per-Onda worlds (Onda 7). The theme data lives in themes/a.ts and themes/b.ts; this file resolves it into a look
   for the current appearance. The "Onda themes" setting turns the world off: a neutral cover, the system serif, Latin numerals. */

export const THEMES: Record<string, Theme> = { ...THEMES_A, ...THEMES_B, ...THEMES_C }

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
  /** Legacy fill: the paper tint under a faint pattern. New surfaces use `cover`. */
  fill: string
  /** Paper tint (was the tile fill). */
  solid: string
  /** Accent colour (same as `accent`). */
  strong: string
  accent: string
  /** Full CSS background of the cover: pattern layers over the material gradient. */
  cover: string
  /** Text and emblem colour on the cover. */
  ink: string
  /** Emblem registry key, or undefined (themes off, custom Ondas). */
  emblem?: string
  layout: CoverLayout
  themed: boolean
  font: string
  glyph: string
  /** Display size for the glyph watermark: long glyphs are set smaller. */
  glyphSize: number
  /** Rule and index numbers in the tradition's own numerals. */
  numeral: (n: number) => string
  ornament: Ornament
  /** Titles are set in capitals (they run wider). */
  caps: boolean
  /** 7.2, the Onda's soul (content/souls.ts): how its cover emblem lives and its page grain as CSS layers. */
  motion: Motion
  grain?: string
}

/** Resolve the look of an Onda for the current appearance. */
export function ondaLook(o: Pick<OndaIndex, 'id' | 'tone'> | undefined, opts: { themed: boolean; dark: boolean }): OndaLook {
  const t = o ? THEMES[o.id] : undefined
  const { dark, themed } = opts
  const on = themed && !!t
  let pal: Palette
  if (t) pal = dark ? t.dark : t.light
  else {
    const c = TONES[o?.tone ?? 'blue'] ?? TONES.blue!
    const accent = dark ? c.darkStrong : c.strong
    pal = { paper: dark ? c.darkBg : c.bg, accent, ...coverFrom(accent, dark) }
  }
  const neutral = dark ? NEUTRAL_COVER.dark : NEUTRAL_COVER.light
  const ink = themed ? pal.ink : neutral.ink
  const [c0, c1] = themed ? pal.cover : neutral.cover
  const material = `linear-gradient(160deg,${c0},${c1})`
  // the pattern is drawn in the ink blended part way into the material, so it stays a texture rather than a print
  const cover = on ? `${t!.pattern(rgbOf(mix(ink, c0, 0.4)))},${material}` : material
  const solid = pal.paper
  const strong = pal.accent
  const rgb = dark ? '255,255,255' : '0,0,0'
  const fill = on ? `${t!.pattern(rgb)},${solid}` : solid
  const font = on ? t!.font : 'var(--font-serif)'
  const glyph = t?.glyph ?? ''
  const set: NumeralSet = on ? t!.numerals : 'latin'
  const ornament: Ornament = on ? t!.ornament : 'dot'
  const caps = on && !!t!.caps
  const track = (on && t!.track) || '0'
  const shape = (on && t!.mark?.shape) || '50%'
  const clip = (on && t!.mark?.clip) || 'none'
  const deep = accentFor(strong, dark)
  const soul = on ? SOULS[o!.id] : undefined
  const radius = soul ? CORNER_R[soul.corner] : 34
  return {
    fill, solid, strong, accent: strong, cover, ink, font, glyph, ornament, caps, themed: on,
    motion: soul?.motion ?? 'still',
    grain: soul ? grainBackground(soul.grain, rgbOf(strong), dark) : undefined,
    emblem: on ? (t!.emblem ?? o!.id) : undefined,
    layout: on ? t!.layout : 'left',
    glyphSize: glyph.length > 3 ? 44 : 88,
    numeral: (n) => numeral(set, n),
    vars: {
      '--onda-fill': fill,
      '--onda-solid': solid,
      '--onda-paper': solid,
      '--onda-strong': strong,
      '--onda-accent': strong,
      '--onda-cover': cover,
      '--onda-material': material,
      '--onda-cover-ink': ink,
      '--onda-cover-edge': c1,
      '--onda-text': readableText(strong, dark ? [solid, '#303136'] : [solid, '#F5F1E8'], dark),
      '--onda-deep': deep.accent,
      '--onda-on': deep.on,
      '--onda-font': font,
      '--onda-ink': dark ? '#F4F4F5' : '#000000',
      '--onda-sub': dark ? '#C9C9CE' : '#3A3A3C',
      '--onda-chip': dark ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.6)',
      '--onda-rest': dark ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.6)',
      '--onda-shape': shape,
      '--onda-clip': clip,
      '--onda-r': `${radius}px`,
      '--onda-radius': '28px',
      '--onda-radius-md': '24px',
      '--onda-radius-sm': '18px',
      '--onda-track': track,
      '--onda-case': caps ? 'uppercase' : 'none',
      '--onda-now': dark ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.45)',
    } as CSSProperties,
  }
}
