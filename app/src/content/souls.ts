import { sv } from './themeKit'

/* Onda 7.2: each Onda's soul. The theme (themes/a.ts, b.ts) gives an Onda its colours, face, emblem and pattern; the soul
   is how its world feels to live in while it runs:
   - grain: the material of the page itself, behind every screen (washi for Zen, khadi for Gandhi, felt for the Mongols)
   - motion: how the emblem on its cover lives (the Sufi dervish turns, the menorah's lights flicker, the ouroboros circles)
   - corner: its shape language, from soft brush curves to cut stone and hard print
   All of it follows the "Onda themes" setting and stops for Reduce Motion. */

export type Grain =
  | 'paper' | 'washi' | 'linen' | 'canvas' | 'marble' | 'stone' | 'parchment' | 'papyrus' | 'felt' | 'bark' | 'silk' | 'sand'
  | 'night' | 'gilt' | 'clay' | 'water' | 'print'
export type Motion = 'still' | 'breathe' | 'turn' | 'whirl' | 'flicker' | 'sway' | 'drift' | 'pulse' | 'shimmer' | 'rise' | 'march' | 'glitch'
export type Corner = 'soft' | 'round' | 'cut' | 'sharp'

export interface Soul {
  grain: Grain
  motion: Motion
  corner: Corner
}

const S = (grain: Grain, motion: Motion, corner: Corner): Soul => ({ grain, motion, corner })

export const SOULS: Record<string, Soul> = {
  stoic: S('marble', 'breathe', 'cut'),
  zen: S('washi', 'breathe', 'soft'),
  tao: S('silk', 'turn', 'soft'),
  tibet: S('felt', 'breathe', 'round'),
  vedanta: S('sand', 'rise', 'soft'),
  jung: S('night', 'turn', 'round'),
  animism: S('bark', 'sway', 'soft'),
  ubuntu: S('clay', 'pulse', 'round'),
  sufi: S('silk', 'whirl', 'round'),
  transc: S('bark', 'sway', 'soft'),
  soviet: S('print', 'march', 'sharp'),
  yoruba: S('linen', 'pulse', 'round'),
  aztec: S('stone', 'turn', 'cut'),
  egypt: S('papyrus', 'shimmer', 'cut'),
  hermes: S('parchment', 'rise', 'round'),
  gnostic: S('night', 'turn', 'round'),
  norse: S('bark', 'drift', 'cut'),
  cynic: S('sand', 'sway', 'round'),
  confucian: S('paper', 'still', 'cut'),
  abbasid: S('parchment', 'rise', 'round'),
  twenties: S('gilt', 'shimmer', 'cut'),
  cuba: S('clay', 'pulse', 'round'),
  hindu: S('silk', 'breathe', 'round'),
  mahayana: S('paper', 'breathe', 'soft'),
  theravada: S('bark', 'breathe', 'soft'),
  shinto: S('washi', 'sway', 'sharp'),
  jain: S('marble', 'still', 'soft'),
  sikh: S('linen', 'rise', 'round'),
  zoroaster: S('clay', 'rise', 'cut'),
  judaism: S('parchment', 'flicker', 'round'),
  christian: S('gilt', 'shimmer', 'round'),
  sunni: S('sand', 'breathe', 'round'),
  shia: S('silk', 'breathe', 'round'),
  rasta: S('canvas', 'pulse', 'round'),
  discordia: S('print', 'glitch', 'cut'),
  plato: S('marble', 'rise', 'cut'),
  epicurus: S('clay', 'sway', 'soft'),
  cyrenaic: S('silk', 'breathe', 'round'),
  kant: S('night', 'still', 'sharp'),
  nietzsche: S('stone', 'rise', 'cut'),
  freud: S('felt', 'drift', 'round'),
  existential: S('paper', 'rise', 'sharp'),
  gandhi: S('linen', 'breathe', 'soft'),
  rome: S('stone', 'march', 'sharp'),
  qing: S('silk', 'drift', 'round'),
  mongol: S('felt', 'pulse', 'round'),
  ottoman: S('gilt', 'sway', 'round'),
  mughal: S('gilt', 'shimmer', 'round'),
  johor: S('canvas', 'drift', 'round'),
  inca: S('felt', 'rise', 'sharp'),
  habsburg: S('gilt', 'shimmer', 'round'),
  hre: S('parchment', 'still', 'cut'),
  sixties: S('print', 'whirl', 'soft'),
  renaissance: S('canvas', 'still', 'cut'),
  maasai: S('clay', 'pulse', 'round'),
  aboriginal: S('sand', 'breathe', 'soft'),
  frisian: S('water', 'drift', 'round'),
  polynesia: S('water', 'drift', 'soft'),
  melanesia: S('bark', 'pulse', 'round'),
  micronesia: S('water', 'drift', 'soft'),
  zulu: S('felt', 'pulse', 'round'),
  bantu: S('clay', 'sway', 'round'),
  khmer: S('stone', 'rise', 'cut'),
  celtic: S('parchment', 'turn', 'round'),
  // 7.2
  dostoevsky: S('paper', 'flicker', 'sharp'),
  adler: S('paper', 'rise', 'round'),
  burgundy: S('gilt', 'shimmer', 'cut'),
  goethe: S('canvas', 'breathe', 'soft'),
  machiavelli: S('parchment', 'still', 'sharp'),
  postmodern: S('print', 'glitch', 'sharp'),
}

/** Corner radius of a hero cover; tiles, lists and the shortcut bar take theirs from it. */
export const CORNER_R: Record<Corner, number> = { soft: 32, round: 26, cut: 14, sharp: 7 }

/* ── Grains: tiles drawn in the page ink at a whisper, so the page reads as paper, stone or cloth rather than a flat tint.
   `i` is "r,g,b" of the ink; `a` scales the strength. Noise comes from feTurbulence with stitched tiles. ── */

const noise = (i: string, a: number, freq: string, oct: number, slope: number, cut: number, size = 220, seed = 3) =>
  `${sv(`<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><filter id='n' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${oct}' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${rgb01(i)} 0 0 0 0 ${rgb01(i, 1)} 0 0 0 0 ${rgb01(i, 2)} ${slope * a} 0 0 0 ${-cut * a}'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`)} 0 0/${size}px ${size}px`

/** Thin veins where ridged turbulence nears zero, as in marble or old crackled glaze. */
const veins = (i: string, a: number, freq: string, oct: number, peak: number, slope: number, size = 360, seed = 5) =>
  `${sv(`<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><filter id='v' x='0' y='0'><feTurbulence type='turbulence' baseFrequency='${freq}' numOctaves='${oct}' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${rgb01(i)} 0 0 0 0 ${rgb01(i, 1)} 0 0 0 0 ${rgb01(i, 2)} ${-slope * a} 0 0 0 ${peak * a}'/></filter><rect width='100%' height='100%' filter='url(#v)'/></svg>`)} 0 0/${size}px ${size}px`

const rgb01 = (i: string, k = 0) => (Number(i.split(',')[k]) / 255).toFixed(3)

/** Deterministic scatter for fibres and stars, so a grain looks the same on every launch. */
const rand = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646

function fibres(i: string, a: number) {
  const r = rand(11)
  let d = ''
  for (let k = 0; k < 16; k++) {
    const x = r() * 260, y = r() * 260, l = 30 + r() * 70, t = r() * Math.PI
    const dx = Math.cos(t) * l, dy = Math.sin(t) * l
    d += `M${x.toFixed(1)} ${y.toFixed(1)}q${(dx / 2 + (r() - 0.5) * 18).toFixed(1)} ${(dy / 2 + (r() - 0.5) * 18).toFixed(1)} ${dx.toFixed(1)} ${dy.toFixed(1)}`
  }
  return `${sv(`<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><path d='${d}' fill='none' stroke='rgba(${i},${(0.22 * a).toFixed(3)})' stroke-width='.7' stroke-linecap='round'/></svg>`)} 0 0/260px 260px`
}

function stars(i: string, a: number) {
  const r = rand(29)
  let c = ''
  for (let k = 0; k < 26; k++) c += `<circle cx='${(r() * 240).toFixed(1)}' cy='${(r() * 240).toFixed(1)}' r='${(0.5 + r() * 0.9).toFixed(2)}' fill-opacity='${(0.25 + r() * 0.75).toFixed(2)}'/>`
  return `${sv(`<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><g fill='rgba(${i},${(0.5 * a).toFixed(3)})'>${c}</g></svg>`)} 0 0/240px 240px`
}

const weave = (i: string, a: number, step: number) =>
  `repeating-linear-gradient(0deg,rgba(${i},${(0.05 * a).toFixed(3)}) 0 1px,transparent 1px ${step}px),repeating-linear-gradient(90deg,rgba(${i},${(0.045 * a).toFixed(3)}) 0 1px,transparent 1px ${step}px)`

const ripples = (i: string, a: number) =>
  `${sv(`<svg xmlns='http://www.w3.org/2000/svg' width='120' height='36'><path d='M0 18q15-7 30 0t30 0 30 0 30 0' fill='none' stroke='rgba(${i},${(0.09 * a).toFixed(3)})' stroke-width='.8'/></svg>`)} 0 0/120px 36px`

const GRAINS: Record<Grain, (i: string, a: number) => string> = {
  paper: (i, a) => noise(i, a, '.9', 3, 0.5, 0.18),
  washi: (i, a) => `${fibres(i, a)},${noise(i, a, '.75', 2, 0.42, 0.14)}`,
  linen: (i, a) => `${weave(i, a, 3)},${noise(i, a, '.8', 2, 0.3, 0.1)}`,
  canvas: (i, a) => `${weave(i, a * 1.4, 4)},${noise(i, a, '.06', 3, 0.5, 0.2, 240, 7)}`,
  marble: (i, a) => `${veins(i, a, '.005 .011', 4, 0.2, 2.2)},${noise(i, a, '.012', 3, 0.3, 0.12, 300, 2)}`,
  stone: (i, a) => `${noise(i, a, '.65', 2, 3.6, 2.2)},${noise(i, a, '.02', 3, 0.5, 0.2, 260, 9)}`,
  parchment: (i, a) => `${noise(i, a, '.012', 4, 0.42, 0.14, 300, 4)},${noise(i, a, '.9', 2, 0.25, 0.08)}`,
  papyrus: (i, a) => `${noise(i, a, '.003 .09', 2, 0.5, 0.2, 240, 2)},${noise(i, a, '.09 .003', 2, 0.38, 0.15, 240, 6)}`,
  felt: (i, a) => noise(i, a, '.42', 3, 1.0, 0.36),
  bark: (i, a) => noise(i, a, '.9 .018', 3, 0.62, 0.26, 240, 8),
  silk: (i, a) => `repeating-linear-gradient(0deg,rgba(${i},${(0.04 * a).toFixed(3)}) 0 .5px,transparent .5px 2px),linear-gradient(120deg,transparent 30%,rgba(${i},${(0.035 * a).toFixed(3)}) 50%,transparent 70%) 0 0/100% 100%`,
  sand: (i, a) => noise(i, a, '1.1', 2, 3.2, 1.9),
  night: (i, a) => stars(i, a),
  gilt: (i, a) => `repeating-linear-gradient(115deg,transparent 0 46px,rgba(${i},${(0.03 * a).toFixed(3)}) 46px 60px,transparent 60px 110px),${noise(i, a, '.8', 2, 0.3, 0.1)}`,
  clay: (i, a) => `${noise(i, a, '.035', 3, 0.7, 0.26, 260, 12)},${noise(i, a, '.85', 2, 0.28, 0.09)}`,
  water: (i, a) => `${ripples(i, a)},${noise(i, a, '.02 .1', 2, 0.5, 0.2, 240, 10)}`,
  print: (i, a) => `radial-gradient(rgba(${i},${(0.07 * a).toFixed(3)}) .8px,transparent 1.1px) 0 0/5px 5px,${noise(i, a, '.9', 2, 0.25, 0.08)}`,
}

/** The CSS background layers of a grain in ink `i` ("r,g,b"). Dark pages carry a little more so it still reads. */
export const grainBackground = (g: Grain, i: string, dark: boolean) => GRAINS[g](i, dark ? 0.62 : 0.5)
