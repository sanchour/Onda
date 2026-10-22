// Checks the Onda theme palettes in src/content/themes/a.ts, b.ts and c.ts against the Onda 7 contrast rules.
// Run from app/: node shots/theme-contrast.mjs   (exits 1 when anything fails)
//   cover ink on both gradient stops: 5.2:1 light, 8:1 dark
//   accent as text on a card: 4.5:1 on #FCFCF9 (light) and on #1C1C1E (dark)
//   pattern alphas at most .16, a one line comment above every entry, no three equal cover layouts in a row
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'themes')
const CARD = { light: '#FCFCF9', dark: '#1C1C1E' }
const MIN_INK = { light: 5.2, dark: 8 }
const MIN_ACCENT = 4.5
const MAX_ALPHA = 0.16

const lum = (hex) => {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

const HEX = "'(#[0-9A-Fa-f]{6})'"
const PAL = new RegExp(`(light|dark): \\{ paper: ${HEX}, accent: ${HEX}, cover: \\[${HEX}, ${HEX}\\], ink: ${HEX} \\}`)

const entries = []
for (const file of ['a.ts', 'b.ts', 'c.ts']) {
  const lines = readFileSync(join(root, file), 'utf8').split(/\r?\n/)
  let cur = null
  lines.forEach((line, n) => {
    const head = line.match(/^ {2}(\w+): \{$/)
    if (head) {
      cur = { id: head[1], file, comment: /^ {2}\/\/ \S/.test(lines[n - 1] ?? ''), pal: {}, alphas: [], layout: null }
      entries.push(cur)
      return
    }
    if (!cur) return
    if (/^ {2}\},?$/.test(line)) { cur = null; return }
    const p = line.match(PAL)
    if (p) cur.pal[p[1]] = { paper: p[2], accent: p[3], cover: [p[4], p[5]], ink: p[6] }
    const l = line.match(/layout: '(\w+)'/)
    if (l) cur.layout = l[1]
    if (/pattern:|^ {6}\S/.test(line) && !p) {
      // `$.12)` in tile bodies, `,.07)` in rgba(), `'.15'` as a helper argument (not `r='.7'` attributes)
      for (const m of line.matchAll(/(?:\$|,|(?<!=)')(0?\.\d+)(?=\)|')/g)) cur.alphas.push(parseFloat(m[1]))
      if (/ln\('[^']*'\)/.test(line)) cur.alphas.push(0.12) // ln() default alpha
      if (/#[0-9A-Fa-f]{3,6}\b/.test(line)) cur.alphas.push(1) // an opaque colour drawn in the pattern
    }
  })
}

const fails = []
for (const e of entries) {
  if (!e.comment) fails.push(`${e.id}: no one line comment above the entry`)
  for (const mode of ['light', 'dark']) {
    const p = e.pal[mode]
    if (!p) { fails.push(`${e.id} ${mode}: palette not found`); continue }
    p.cover.forEach((c, k) => {
      const r = contrast(p.ink, c)
      if (r < MIN_INK[mode]) fails.push(`${e.id} ${mode}: ink ${p.ink} on cover stop ${k} ${c} is ${r.toFixed(2)} (needs ${MIN_INK[mode]})`)
    })
    const a = contrast(p.accent, CARD[mode])
    if (a < MIN_ACCENT) fails.push(`${e.id} ${mode}: accent ${p.accent} on ${CARD[mode]} is ${a.toFixed(2)} (needs ${MIN_ACCENT})`)
  }
  const hi = Math.max(0, ...e.alphas)
  if (hi > MAX_ALPHA) fails.push(`${e.id}: pattern alpha ${hi} (at most ${MAX_ALPHA})`)
}
for (let k = 2; k < entries.length; k++) {
  const [x, y, z] = [entries[k - 2], entries[k - 1], entries[k]]
  if (x.layout && x.layout === y.layout && y.layout === z.layout) fails.push(`${x.id}, ${y.id}, ${z.id}: three '${x.layout}' covers in a row`)
}

if (process.argv.includes('--table')) {
  for (const e of entries) {
    const l = e.pal.light, d = e.pal.dark
    console.log(`${e.id.padEnd(12)} ${(e.layout ?? '').padEnd(6)} L ${l?.cover.join(' ')} ink ${contrast(l.ink, l.cover[0]).toFixed(1)}/${contrast(l.ink, l.cover[1]).toFixed(1)} acc ${contrast(l.accent, CARD.light).toFixed(1)} | D ${d?.cover.join(' ')} ink ${contrast(d.ink, d.cover[0]).toFixed(1)}/${contrast(d.ink, d.cover[1]).toFixed(1)} acc ${contrast(d.accent, CARD.dark).toFixed(1)}`)
  }
}
console.log(`${entries.length} themes checked, ${fails.length} failure${fails.length === 1 ? '' : 's'}`)
for (const f of fails) console.log('  ' + f)
process.exit(fails.length ? 1 : 0)
