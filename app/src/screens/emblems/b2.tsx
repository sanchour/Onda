import type { ReactNode } from 'react'
import type { Emblem, EmblemMap, EmblemProps } from './kit'

/* Cover emblems, part B2. Each Onda's emblem is a line drawing of a motif from its own traditional art or symbols,
   on a 120 unit grid in currentColor (see kit.tsx for the contract). Fills are quiet tints only. Paths that need
   geometry are computed once at load. */

type V = [number, number]

const f = (n: number) => Math.round(n * 10) / 10
const pt = (x: number, y: number) => `${f(x)} ${f(y)}`
/** A point at radius r and `deg` degrees clockwise from the top, around (cx, cy). */
const polar = (r: number, deg: number, cx = 60, cy = 60): V => {
  const a = (deg * Math.PI) / 180
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)]
}
const P = (r: number, deg: number, cx = 60, cy = 60) => pt(...polar(r, deg, cx, cy))
const poly = (pts: string[]) => `M${pts.join('L')}Z`
/** A whole circle as a subpath (for even-odd rings and strings of beads). */
const ring = (r: number, cx = 60, cy = 60) => `M${f(cx - r)} ${f(cy)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`
const range = (n: number) => Array.from({ length: n }, (_, k) => k)
/** A ribbon of varying thickness around a centre line. */
const ribbon = (c: V[], th: (t: number) => number) => {
  const n = c.length - 1
  const a: string[] = []
  const b: string[] = []
  c.forEach((p, i) => {
    const p0 = c[Math.max(0, i - 1)]!
    const p1 = c[Math.min(n, i + 1)]!
    const l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1
    const nx = -(p1[1] - p0[1]) / l
    const ny = (p1[0] - p0[0]) / l
    const h = th(i / n) / 2
    a.push(pt(p[0] + nx * h, p[1] + ny * h))
    b.push(pt(p[0] - nx * h, p[1] - ny * h))
  })
  return `M${a.join('L')}L${b.reverse().join('L')}Z`
}
/** Keeps the part of a polygon where nx*x + ny*y <= c. */
const clip = (pg: V[], nx: number, ny: number, c: number): V[] => {
  const out: V[] = []
  pg.forEach((p, i) => {
    const q = pg[(i + 1) % pg.length]!
    const dp = nx * p[0] + ny * p[1] - c
    const dq = nx * q[0] + ny * q[1] - c
    if (dp <= 0) out.push(p)
    if (dp * dq < 0) {
      const t = dp / (dp - dq)
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])])
    }
  })
  return out
}
const MIRROR = 'matrix(-1 0 0 1 120 0)'

const tint = (o = 0.14) => ({ fill: 'currentColor', fillOpacity: o })
const dots = (len: number, n: number) => ({ strokeDasharray: `0 ${f(len / n)}` })

function emblem(name: string, draw: (w: number) => ReactNode): Emblem {
  const E = ({ size, line = 1.25 }: EmblemProps) => {
    const w = (line * 120) / size
    return (
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
        {draw(w)}
      </svg>
    )
  }
  E.displayName = `Emblem(${name})`
  return E
}

/* ── geometry computed once ─────────────────────────────── */

// Johor: a keris of seven luk, the waves starting above the ganja, with its spine and point.
const KERIS = (() => {
  const N = 70
  const l: string[] = []
  const r: string[] = []
  const ridge: string[] = []
  for (const k of range(N + 1)) {
    const t = k / N
    const y = 81 - 69 * t
    const s = Math.max(0, (t - 0.16) / 0.84)
    const x = 60 + 5.6 * Math.sin(Math.PI * 7 * s) * (1 - 0.35 * t)
    const hw = 10.5 * Math.pow(1 - t, 0.7)
    l.push(pt(x - hw, y))
    r.push(pt(x + hw, y))
    if (t > 0.05 && t < 0.86) ridge.push(pt(x, y))
  }
  return { blade: `M${l.join('L')}L${r.reverse().join('L')}Z`, ridge: `M${ridge.join('L')}` }
})()

// Inca: the stepped chakana, twelve corners around the hole of the axis.
const chakana = (u: number) => {
  const q: V[] = [[-1, -3], [1, -3], [1, -2], [2, -2], [2, -1]]
  const pts: string[] = []
  for (const k of range(4)) for (const [x, y] of q) {
    const [a, b] = ([[x, y], [-y, x], [-x, -y], [y, -x]] as V[])[k]!
    pts.push(pt(60 + a * u, 60 + b * u))
  }
  return poly(pts)
}

// Habsburg: one wing of the double-headed eagle, five pinions fanned from the shoulder.
const WING = (() => {
  const S: V = [53, 56]
  const tips: V[] = [[318, 45], [300, 45], [282, 43], [264, 39.5], [246, 34]]
  let d = `M${pt(...S)}`
  let veins = ''
  tips.forEach(([a, l], i) => {
    if (i) {
      const m = (a + tips[i - 1]![0]) / 2
      const n = Math.min(l, tips[i - 1]![1]) * 0.7
      d += `L${P(n, m, ...S)}`
      veins += `M${P(9, m, ...S)}L${P(n - 4, m, ...S)}`
    }
    d += `L${P(l, a, ...S)}`
  })
  return { d: `${d}L51 67Z`, veins }
})()

// HRE: the octagonal Reichskrone from the front, the brow plate between two picture plates and the edge-on temple plates.
const REICHSKRONE = (() => {
  const base = 96
  const arched = (x0: number, x1: number, peak: number, ry: number, bottom = base) =>
    `M${f(x0)} ${bottom}V${f(peak + ry)}A${f((x1 - x0) / 2)} ${f(ry)} 0 0 1 ${f(x1)} ${f(peak + ry)}V${bottom}Z`
  const plates = arched(43, 77, 48, 17) + arched(19, 43, 62, 17) + arched(77, 101, 62, 17) + arched(15.5, 19, 50, 5) + arched(101, 104.5, 50, 5)
  const frames = arched(23, 39, 68, 12, 90) + arched(81, 97, 68, 12, 90)
  const jewels = ([[51, 61], [69, 61], [60, 55], [50, 74], [70, 74], [51, 86], [69, 86], [60, 89]] as V[]).map(([x, y]) => ring(1.9, x, y)).join('')
  return { plates, frames, jewels }
})()

// Sixties: a daisy of twelve petals.
const DAISY = range(12)
  .map((k) => {
    const a = k * 30
    return `M${P(5, a - 10)}Q${P(17.5, a - 13)} ${P(16.5, a)}Q${P(17.5, a + 13)} ${P(5, a + 10)}`
  })
  .join('')

// Maasai: the long oval hide shield with its painted caps, over two crossed spears.
const SHIELD = (() => {
  const hw = (y: number) => 24.5 * Math.pow(Math.max(0, Math.sin((Math.PI * (y - 12)) / 96)), 0.8)
  const side = (s: number, y0: number, y1: number) => range(41).map((k) => pt(60 + s * hw(y0 + ((y1 - y0) * k) / 40), y0 + ((y1 - y0) * k) / 40))
  const outline = `M${side(-1, 108, 12).join('L')}L${side(1, 12, 108).join('L')}Z`
  const caps =
    `M${side(-1, 36, 12).join('L')}L${side(1, 12, 36).join('L')}Q60 43 ${pt(60 - hw(36), 36)}Z` +
    `M${side(-1, 84, 108).join('L')}L${side(1, 108, 84).join('L')}Q60 77 ${pt(60 - hw(84), 84)}Z`
  let shafts = ''
  let blades = ''
  for (const [a, b] of [[[25, 107], [97, 15]], [[95, 107], [23, 15]]] as [V, V][]) {
    const at = (t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
    let start: V | null = null
    let last: V = a
    for (const k of range(161)) {
      const p = at((k / 160) * 0.8)
      const out = Math.abs(p[0] - 60) > hw(p[1]) + 3
      if (out) {
        start = start ?? p
        last = p
      } else if (start) {
        shafts += `M${pt(...start)}L${pt(...last)}`
        start = null
      }
    }
    if (start) shafts += `M${pt(...start)}L${pt(...last)}`
    const [bx, by] = at(0.8)
    const [mx, my] = at(0.87)
    const l = Math.hypot(b[0] - a[0], b[1] - a[1])
    const nx = (-(b[1] - a[1]) / l) * 4
    const ny = ((b[0] - a[0]) / l) * 4
    blades += `M${pt(bx, by)}Q${pt(mx + nx, my + ny)} ${pt(...b)}Q${pt(mx - nx, my - ny)} ${pt(bx, by)}Z`
  }
  return { outline, caps, shafts, blades }
})()

// Aboriginal: the U of a seated person, curve to the fire, at each quarter of the camp.
const SEATED = [0, 90, 180, 270]
  .map((a) => {
    const [dx, dy] = polar(1, a, 0, 0)
    const L = (r: number, v: number) => pt(60 + dx * r - dy * v, 60 + dy * r + dx * v)
    return `M${L(42, -6.5)}L${L(34, -6.5)}A6.5 6.5 0 0 0 ${L(34, 6.5)}L${L(42, 6.5)}`
  })
  .join('')

// Frisian: the flag's seven bends, blue and white, with the seven pompeblêden on the white.
const FRISIAN = (() => {
  const [X0, X1, Y0, Y1] = [24, 96, 23, 103]
  const rect: V[] = [[X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1]]
  const c0 = X0 - Y1
  const step = (X1 - Y0 - c0) / 7
  const c = (k: number) => c0 + k * step
  const blue = [0, 2, 4, 6].map((k) => poly(clip(clip(rect, -1, 1, -c(k)), 1, -1, c(k + 1)).map((p) => pt(...p)))).join('')
  const span = (cc: number): [number, number] => [Math.max(X0, Y0 + cc), Math.min(X1, Y1 + cc)]
  const edges = range(6)
    .map((k) => {
      const [a, b] = span(c(k + 1))
      return `M${pt(a, a - c(k + 1))}L${pt(b, b - c(k + 1))}`
    })
    .join('')
  const leaf = (x: number, y: number, s: number) =>
    `M${pt(x, y + s)}C${pt(x - 1.35 * s, y + 0.05 * s)} ${pt(x - 0.95 * s, y - 1.1 * s)} ${pt(x, y - 0.45 * s)}C${pt(x + 0.95 * s, y - 1.1 * s)} ${pt(x + 1.35 * s, y + 0.05 * s)} ${pt(x, y + s)}Z`
  const leaves = ([[1, 2], [3, 3], [5, 2]] as V[])
    .map(([k, n]) => {
      const cc = c(k + 0.5)
      const [a, b] = span(cc)
      return range(n)
        .map((i) => {
          const x = a + ((b - a) * (i + 1)) / (n + 1)
          return leaf(x, x - cc + 0.5, 5.2)
        })
        .join('')
    })
    .join('')
  return { blue, edges, leaves, rect: poly(rect.map((p) => pt(...p))) }
})()

// Micronesia: a Marshallese stick chart, swells bent around the islands, shells for the atolls.
const SHELLS = ([[60, 60, 4], [60, 36, 3], [84, 60, 3], [60, 84, 3], [36, 60, 3]] as [number, number, number][]).map(([x, y, r]) => ring(r, x, y)).join('')

// Zulu: the incwadi, a beaded triangle; nested bands scaled about its centre.
const ZULU = (() => {
  const cy = (26 + 26 + 104) / 3
  const tri = (s: number) => poly(([[16, 26], [104, 26], [60, 104]] as V[]).map(([x, y]) => pt(60 + (x - 60) * s, cy + (y - cy) * s)))
  return { tri }
})()

// Bantu: the mbira's tines, longest in the middle.
const TINES = range(9)
  .map((k) => `M${34 + k * 6.5} 80V${22 + 4.5 * Math.abs(k - 4)}`)
  .join('')

// Khmer: the five lotus-bud towers of Angkor Wat over their stepped galleries.
const ANGKOR = (() => {
  let towers = ''
  let tiers = ''
  for (const [cx, base, h, bw] of [[60, 72, 58, 18], [34, 82, 36, 12.5], [86, 82, 36, 12.5], [17, 92, 28, 10], [103, 92, 28, 10]] as [number, number, number, number][]) {
    const hw = (u: number) => (u < 0.3 ? bw / 2 : (bw / 2) * Math.pow(1 - Math.pow((u - 0.3) / 0.7, 1.5), 0.75))
    const l: string[] = []
    const r: string[] = []
    for (const k of range(25)) {
      const u = k / 24
      l.push(pt(cx - hw(u), base - h * u))
      r.push(pt(cx + hw(u), base - h * u))
    }
    towers += `M${l.join('L')}L${r.reverse().join('L')}Z`
    tiers += [0.3, 0.45, 0.58, 0.7, 0.81].map((u) => `M${pt(cx - hw(u), base - h * u)}Q${pt(cx, base - h * u + 1.6)} ${pt(cx + hw(u), base - h * u)}`).join('')
    tiers += `M${pt(cx, base - h)}V${f(base - h - 4)}`
  }
  return { towers, tiers }
})()

// Celtic: the triskele, three spirals turning out of one centre.
const TRISKELE = [0, 120, 240]
  .map((base) => {
    const c = polar(23, base)
    const line = range(97).map((i) => polar(23 * Math.pow(1 - i / 96, 1.05), base + 180 + 560 * (i / 96), ...c))
    return ribbon(line, (t) => 1 + 7.5 * Math.sin((Math.PI * Math.min(1, t / 0.28)) / 2) * Math.pow(1 - t, 0.9))
  })
  .join('')

/* ── the emblems ────────────────────────────────────────── */

export const EMBLEMS_B2: EmblemMap = {
  // The keris of Johor: seven luk, the gecko-tailed ganja and the bent hulu.
  johor: emblem('keris', (w) => (
    <g transform="translate(60 60) scale(1.22) translate(-60 -60) rotate(20 60 60)">
      <path d={KERIS.blade} {...tint(0.14)} />
      <path d={KERIS.ridge} strokeWidth={w * 0.6} />
      <path d="M53.6 76.5C49 75.5 47.5 79.5 50 80.8C51.6 81.6 53 80.3 52.2 79.2" strokeWidth={w * 0.8} />
      <path d="M46.5 81.5H73C76 81.5 78.5 82.5 80.5 84C76.5 85.8 72 86.5 68 86.5H50.5C48 86.5 46.5 84.5 46.5 81.5Z" {...tint(0.2)} />
      <path d="M54 86.5H66L65 90.5H55Z" {...tint(0.3)} />
      <path d="M55 90.5C52.5 94.5 47.5 97.5 46.5 102C45.5 107 51 110.5 57 109.5C63.5 108.5 66.5 103 65.5 97C65 94 65 92 65 90.5Z" {...tint(0.14)} />
      <path d="M50 103C54 101.5 59 102 63 99" strokeWidth={w * 0.6} />
    </g>
  )),

  // The chakana, the stepped Andean cross, around the open centre of Cusco.
  inca: emblem('chakana', (w) => (
    <>
      <path d={chakana(14) + ring(9.5)} fillRule="evenodd" {...tint(0.14)} />
      <path d={chakana(10.5)} strokeWidth={w * 0.7} />
      <circle cx="60" cy="60" r="5" strokeWidth={w * 0.7} />
      <path d={[45, 135, 225, 315].map((a) => ring(1.8, ...polar(34.6, a))).join('')} {...tint(0.6)} stroke="none" />
      <path d={[0, 90, 180, 270].map((a) => ring(1.8, ...polar(36.8, a))).join('')} {...tint(0.6)} stroke="none" />
      <circle cx="60" cy="60" r="51" strokeWidth={w * 0.9} {...dots(2 * Math.PI * 51, 48)} />
    </>
  )),

  // The double-headed eagle of the Habsburgs, crowned heads, the red-white-red shield on its breast.
  habsburg: emblem('double-headed eagle', (w) => {
    const half = (t?: string) => (
      <g transform={t}>
        <path d={WING.d} {...tint(0.12)} />
        <path d={WING.veins} strokeWidth={w * 0.6} />
        <path d="M59 49C57 41 53 33 47 31.5C44 31 41.5 32 40.5 33.5L35 35.5Q34.5 38 36.5 38.5L41 37.5C44 39 47 41 49 44C51 47 53 50 54 54Z" {...tint(0.14)} />
        <path d="M41 29.5L41.5 23.5L44.3 26.3L46.2 22L48.1 26.3L50.9 23.5L51.4 29.5Z" {...tint(0.2)} strokeWidth={w * 0.8} />
        <path d="M60 77H55L48 97L54 94L55.5 102L60 99" {...tint(0.12)} />
        <path d="M54.5 73L44 81M44 81L38.5 80.5M44 81L40 85.5M44 81L43 87" strokeWidth={w * 0.85} />
      </g>
    )
    return (
      <>
        {half()}
        {half(MIRROR)}
        <ellipse cx="60" cy="63" rx="9.5" ry="15" {...tint(0.14)} />
        <path d="M53 55H67V65.5C67 70.5 63.5 73.5 60 74.5C56.5 73.5 53 70.5 53 65.5Z" />
        <path d="M53 55H67V60.5H53ZM53 66H67C66.5 70.5 63.5 73.5 60 74.5C56.5 73.5 53.5 70.5 53 66Z" {...tint(0.3)} stroke="none" />
        <circle cx="44.3" cy="34.6" r="1.1" {...tint(0.8)} stroke="none" />
        <circle cx="75.7" cy="34.6" r="1.1" {...tint(0.8)} stroke="none" />
      </>
    )
  }),

  // The Reichskrone: eight arched plates, jewels on the brow plate, the cross above it.
  hre: emblem('reichskrone', (w) => (
    <>
      <path d={REICHSKRONE.plates} {...tint(0.12)} />
      <path d={REICHSKRONE.frames} strokeWidth={w * 0.6} />
      <path d={REICHSKRONE.jewels} {...tint(0.55)} stroke="none" />
      <circle cx="60" cy="74" r="4.2" {...tint(0.2)} strokeWidth={w * 0.8} />
      <path d="M19 91.5H101" strokeWidth={w * 0.9} {...dots(82, 22)} />
      {/* the arch over the crown, set with pearls, and the cross rising in front of it */}
      <path d="M17 52C19 18 101 18 103 52" strokeWidth={w * 0.95} />
      <path d="M23 54C25 26 95 26 97 54" strokeWidth={w * 1.5} {...dots(96, 20)} />
      <path d="M60 48V12M52 20H68" strokeWidth={w * 1.3} />
    </>
  )),

  // A daisy on its stem, set in the peace sign.
  sixties: emblem('flower in peace sign', (w) => (
    <>
      <circle cx="60" cy="60" r="44" strokeWidth={w * 1.2} />
      <path d="M60 16V42.5M60 77.5V104" />
      <path d={`M${P(17.5, 135)}L${P(44, 135)}M${P(17.5, 225)}L${P(44, 225)}`} />
      <path d={DAISY} {...tint(0.12)} />
      <circle cx="60" cy="60" r="5" {...tint(0.4)} />
      <path d="M60 90C55 84 50 83 46 85C49 90 54 91 60 90ZM60 84C65 78 70 77 74 79C71 84 66 85 60 84Z" {...tint(0.16)} strokeWidth={w * 0.8} />
    </>
  )),

  // Leonardo's Vitruvian Man: the circle on the navel, the square on the groin.
  renaissance: emblem('vitruvian man', (w) => (
    <>
      <circle cx="60" cy="60" r="46.2" {...tint(0.05)} />
      <path d="M22 30.2H98V106.2H22Z" />
      <circle cx="60" cy="36.4" r="5.4" {...tint(0.14)} />
      <path d="M54 45.5H66C65 54 64.5 62 64 68.2H56C55.5 62 55 54 54 45.5Z" {...tint(0.14)} />
      <path d="M54 47H22M66 47H98M57 68.2L55 106.2M63 68.2L65 106.2" strokeWidth={w * 1.05} />
      <path d="M55 47.5L24.7 30.2M65 47.5L95.3 30.2M57.5 68.2L36.9 100M62.5 68.2L83.1 100" strokeWidth={w * 0.65} />
      <path d="M33 106.2V103M44 106.2V103M76 106.2V103M87 106.2V103" strokeWidth={w * 0.6} />
    </>
  )),

  // The Maasai shield, its painted caps and spine, over two crossed spears.
  maasai: emblem('maasai shield', (w) => (
    <>
      <path d={SHIELD.shafts} strokeWidth={w * 1.1} />
      <path d={SHIELD.blades} {...tint(0.2)} />
      <path d={SHIELD.outline} {...tint(0.08)} />
      <path d={SHIELD.caps} {...tint(0.18)} strokeWidth={w * 0.8} />
      <path d="M60 14V50.5M60 69.5V106" strokeWidth={w * 0.8} />
      <ellipse cx="60" cy="60" rx="6" ry="9.5" {...tint(0.22)} />
      <path d="M45 48C51 53 51 67 45 72M75 48C69 53 69 67 75 72" />
    </>
  )),

  // Desert iconography: concentric circles of a camp or waterhole, people seated around it with their coolamons.
  aboriginal: emblem('seated around a waterhole', (w) => (
    <>
      <circle cx="60" cy="60" r="5" {...tint(0.35)} />
      <circle cx="60" cy="60" r="10.5" />
      <circle cx="60" cy="60" r="16" />
      <circle cx="60" cy="60" r="22" strokeWidth={w * 1.5} {...dots(2 * Math.PI * 22, 24)} />
      <path d={SEATED} strokeWidth={w * 1.2} />
      {[45, 135, 225, 315].map((a) => (
        <ellipse key={a} cx="60" cy="25" rx="3.4" ry="7.5" transform={`rotate(${a} 60 60)`} {...tint(0.16)} />
      ))}
      <circle cx="60" cy="60" r="50" strokeWidth={w * 1.5} {...dots(2 * Math.PI * 50, 48)} />
    </>
  )),

  // The Frisian flag on its rod: seven bends and seven pompeblêden.
  frisian: emblem('pompeblêden', (w) => (
    <>
      <path d="M16 18H104" strokeWidth={w * 1.2} />
      <path d={ring(2.6, 13, 18) + ring(2.6, 107, 18)} {...tint(0.3)} />
      <path d={FRISIAN.blue} {...tint(0.14)} stroke="none" />
      <path d={FRISIAN.edges} strokeWidth={w * 0.6} />
      <path d={FRISIAN.rect} />
      <path d={FRISIAN.leaves} {...tint(0.4)} strokeWidth={w * 0.8} />
    </>
  )),

  // A Polynesian voyaging canoe under its crab claw sail.
  polynesia: emblem('crab claw sail', (w) => (
    <>
      <path d="M56 84C46 64 34 40 22 14Q58 60 100 22C84 44 68 64 56 84Z" {...tint(0.14)} stroke="none" />
      <path d="M56 84C46 64 34 40 22 14M56 84C68 64 84 44 100 22" strokeWidth={w * 1.2} />
      <path d="M22 14Q58 60 100 22" />
      <path d="M55.5 78L40.4 31.8M56 78L59.5 39M56.5 78L79.4 35.8" strokeWidth={w * 0.55} />
      <path d="M10 76C24 86 42 89 60 89C78 89 96 86 110 76C104 90 86 96 60 96C34 96 16 90 10 76Z" {...tint(0.16)} />
      <path d="M93 80L101 103M101 103L98.5 109M101 103L104.5 108" strokeWidth={w * 0.9} />
      <path d="M8 106C18 102 28 102 38 106S58 110 68 106S88 102 98 106" strokeWidth={w * 0.8} />
    </>
  )),

  // The frigate bird of Solomon Islands shell inlay: angled wings, forked tail, the throat pouch.
  melanesia: emblem('frigate bird', (w) => {
    const wing = (t?: string) => (
      <g transform={t}>
        <path d="M55 54C47 48 41 44 33 42C25 46 16 52 9 61C18 56 26 54 33 54C41 56 48 60 55 65Z" {...tint(0.14)} />
        <path d="M50 53.5C44 50.5 38.5 47.5 33.5 46.5C27 49.5 20.5 53.5 14.5 58" strokeWidth={w * 1.1} {...dots(48, 10)} />
      </g>
    )
    return (
      <>
        {wing()}
        {wing(MIRROR)}
        <path d="M56.5 71L51 104L60 85L69 104L63.5 71Z" {...tint(0.12)} />
        <ellipse cx="60" cy="60" rx="5.5" ry="13" {...tint(0.16)} />
        <circle cx="60.5" cy="41" r="5" {...tint(0.1)} />
        <path d="M56 39.5L40.5 42Q39 43.5 41.5 45.5M56 42.5L43 43.6" strokeWidth={w * 0.9} />
        <path d="M56.5 44.5C50 46.5 49.5 53 55 55.5C56.8 52 57.5 48 57 44.5Z" {...tint(0.3)} strokeWidth={w * 0.8} />
        <circle cx="59.6" cy="39.8" r="1.1" {...tint(0.8)} stroke="none" />
      </>
    )
  }),

  // A Marshallese stick chart: frame, swells bent round the islands, shells tied where they meet.
  micronesia: emblem('stick chart', (w) => (
    <>
      <path d="M24 24H96V96H24Z" strokeWidth={w * 1.1} />
      <path d="M24 24L96 96M96 24L24 96M60 24V96M24 60H96" strokeWidth={w * 0.7} />
      <path d="M24 24Q60 48 96 24M96 24Q72 60 96 96M96 96Q60 72 24 96M24 96Q48 60 24 24" />
      <circle cx="60" cy="60" r="13" strokeWidth={w * 0.9} />
      <path d={SHELLS} {...tint(0.4)} strokeWidth={w * 0.7} />
      <path d="M19 26L26 19M94 19L101 26M101 94L94 101M26 101L19 94" strokeWidth={w * 0.8} />
    </>
  )),

  // The incwadi, a Zulu beadwork love letter: a beaded triangle on its string of beads.
  zulu: emblem('beadwork love letter', (w) => (
    <>
      <path d={ZULU.tri(1) + ZULU.tri(0.78)} fillRule="evenodd" {...tint(0.15)} />
      <path d={ZULU.tri(0.56) + ZULU.tri(0.36)} fillRule="evenodd" {...tint(0.15)} strokeWidth={w * 0.8} />
      <path d={ZULU.tri(0.15)} {...tint(0.45)} strokeWidth={w * 0.8} />
      <path d="M27 34.5H93" strokeWidth={w * 1.6} {...dots(66, 16)} />
    </>
  )),

  // An mbira: tines over the bridge, the sound hole and the buzzers.
  bantu: emblem('mbira', (w) => (
    <>
      <path d="M38 30H82Q90 30 90 38V96Q90 104 82 104H38Q30 104 30 96V38Q30 30 38 30Z" {...tint(0.1)} />
      <circle cx="60" cy="91" r="5" {...tint(0.2)} strokeWidth={w * 0.8} />
      <path d={TINES} strokeWidth={w * 1.35} />
      <path d="M31 70H89" strokeWidth={w * 1.6} />
      <path d="M31 78H89" strokeWidth={w * 0.9} />
      <path d={ring(2.3, 39, 96) + ring(2.3, 45.5, 96) + ring(2.3, 74.5, 96) + ring(2.3, 81, 96)} {...tint(0.3)} strokeWidth={w * 0.7} />
    </>
  )),

  // Angkor Wat: the five towers on their galleries.
  khmer: emblem('angkor wat', (w) => (
    <>
      <path d="M8 102V92H24V82H38V72H82V82H96V92H112V102Z" {...tint(0.08)} />
      <path d="M24 92H96M38 82H82" strokeWidth={w * 0.7} />
      <path d={ANGKOR.towers} {...tint(0.14)} />
      <path d={ANGKOR.tiers} strokeWidth={w * 0.6} />
      <path d="M56 102V97A4 4 0 0 1 64 97V102M57 82V79A3 3 0 0 1 63 79V82" {...tint(0.3)} strokeWidth={w * 0.7} />
      <path d="M4 106H116" />
    </>
  )),

  // The triskele of La Tène and Newgrange inside a beaded ring.
  celtic: emblem('triskele', (w) => (
    <>
      <path d={TRISKELE} {...tint(0.16)} strokeWidth={w * 0.9} />
      <circle cx="60" cy="60" r="2" {...tint(0.6)} stroke="none" />
      <circle cx="60" cy="60" r="46" />
      <circle cx="60" cy="60" r="42" strokeWidth={w * 0.5} />
      <circle cx="60" cy="60" r="50.5" strokeWidth={w * 1.2} {...dots(2 * Math.PI * 50.5, 40)} />
      <path d={[0, 120, 240].map((a) => `M${P(42, a + 60)}L${P(46, a + 60)}`).join('')} strokeWidth={w * 0.8} />
    </>
  )),
}
