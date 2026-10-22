import type { ReactNode } from 'react'
import type { Emblem, EmblemMap, EmblemProps } from './kit'

/* Cover emblems, part B1. Each Onda's emblem is a line drawing of a motif from its own traditional art or symbols,
   on a 120 unit grid in currentColor (see kit.tsx for the contract). Fills are quiet tints only. */

const f = (n: number) => Math.round(n * 10) / 10
const pt = (x: number, y: number) => `${f(x)} ${f(y)}`
/** A point at radius r and `deg` degrees clockwise from the top, around (cx, cy). */
const polar = (r: number, deg: number, cx = 60, cy = 60): [number, number] => {
  const a = (deg * Math.PI) / 180
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)]
}
const P = (r: number, deg: number, cx = 60, cy = 60) => pt(...polar(r, deg, cx, cy))
const poly = (pts: string[]) => `M${pts.join('L')}Z`
const range = (n: number) => Array.from({ length: n }, (_, k) => k)
/** Mirrors a path of absolute x y pairs (M, L, C, Q only) across the vertical centre line. */
const mirror = (d: string) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => `${f(120 - Number(x))} ${y}`)

const tint = (o = 0.14) => ({ fill: 'currentColor', fillOpacity: o })

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

// Rasta: the lion's mane, a scalloped crescent behind the face.
const MANE = (() => {
  const c = [56, 50] as const
  const from = -34
  const to = 205
  const n = 11
  const step = (to - from) / n
  let d = `M${P(13, from, ...c)}`
  for (const k of range(n)) d += `A3.6 3.6 0 0 1 ${P(13, from + (k + 1) * step, ...c)}`
  d += `L${P(7, to, ...c)}A7 7 0 0 0 ${P(7, from, ...c)}Z`
  return d
})()

// Plato: the dodecahedron seen face on, front pentagon within a decagon, the hidden edges dotted.
const DODECA = (() => {
  const a = 27
  const b = a * 1.618
  const front = poly(range(5).map((k) => P(a, k * 72)))
  const outline = poly(range(10).map((k) => P(b, k * 36)))
  const spokes = range(5).map((k) => `M${P(a, k * 72)}L${P(b, k * 72)}`).join('')
  const back = poly(range(5).map((k) => P(a, k * 72 + 36))) + range(5).map((k) => `M${P(a, k * 72 + 36)}L${P(b, k * 72 + 36)}`).join('')
  return { front, outline, spokes, back }
})()

// Epicurus: a five lobed fig leaf from the Garden, veins running from the stalk.
const FIG = (() => {
  const c = [60, 72] as const
  // [sinus before, sinus radius, lobe angle, lobe radius, sinus after, sinus radius]
  const lobes = [[180, 4, 242, 30, 278, 15], [278, 15, 304, 37, 332, 17], [332, 17, 360, 38, 388, 17], [388, 17, 416, 37, 442, 15], [442, 15, 478, 30, 540, 4]] as const
  let d = `M${P(4, 180, ...c)}`
  lobes.forEach(([s1, r1, a, R, s2, r2]) => {
    const [tx, ty] = polar(R, a, ...c)
    const ux = Math.cos((a * Math.PI) / 180)
    const uy = Math.sin((a * Math.PI) / 180)
    const kk = R * 0.42
    d += `C${P(r1 + (R - r1) * 0.55, s1 + (a - s1) * 0.2, ...c)} ${pt(tx - kk * ux, ty - kk * uy)} ${pt(tx, ty)}`
    d += `C${pt(tx + kk * ux, ty + kk * uy)} ${P(r2 + (R - r2) * 0.55, s2 - (s2 - a) * 0.2, ...c)} ${P(r2, s2, ...c)}`
  })
  const veins = lobes.map(([, , a, R]) => `M${pt(c[0], c[1] + 2)}L${P(R * 0.78, a, ...c)}`).join('')
  return { d: d + 'Z', veins }
})()

// Cyrenaic: an ivy garland arching over the cup, leaves turning out and in.
const IVY = (() => {
  const B = [[14, 57], [20, 20], [100, 20], [104, 57]] as const
  const at = (t: number) => {
    const m = 1 - t
    const x = m * m * m * B[0][0] + 3 * m * m * t * B[1][0] + 3 * m * t * t * B[2][0] + t * t * t * B[3][0]
    const y = m * m * m * B[0][1] + 3 * m * m * t * B[1][1] + 3 * m * t * t * B[2][1] + t * t * t * B[3][1]
    return [x, y] as const
  }
  const vine = `M${B[0].join(' ')}C${B[1].join(' ')} ${B[2].join(' ')} ${B[3].join(' ')}`
  const leaves = [0.1, 0.25, 0.4, 0.6, 0.75, 0.9]
    .map((t, k) => {
      const [x, y] = at(t)
      const [x2, y2] = at(t + 0.01)
      const dir = (Math.atan2(x2 - x, -(y2 - y)) * 180) / Math.PI
      const a = dir + (k % 2 ? 90 : -90) + (t < 0.5 ? 25 : -25)
      const s = 11
      const base = pt(x, y)
      return `M${base}C${P(s * 0.8, a - 105, x, y)} ${P(s * 0.8, a - 28, x, y)} ${P(s, a, x, y)}C${P(s * 0.8, a + 28, x, y)} ${P(s * 0.8, a + 105, x, y)} ${base}Z`
    })
    .join('')
  return { vine, leaves }
})()

// Kant: a four pointed star.
const star = (cx: number, cy: number, r: number) => `M${pt(cx, cy - r)}Q${pt(cx, cy)} ${pt(cx + r, cy)}Q${pt(cx, cy)} ${pt(cx, cy + r)}Q${pt(cx, cy)} ${pt(cx - r, cy)}Q${pt(cx, cy)} ${pt(cx, cy - r)}Z`

// Nietzsche: twelve rays around the rising sun, long and short.
const RAYS = range(12).map((k) => `M${P(15.5, k * 30, 60, 30)}L${P(k % 2 ? 19.5 : 23, k * 30, 60, 30)}`).join('')

// Existential: the slope, the boulder resting on it and the man leaning into it.
const SISYPHUS = (() => {
  const A = [8, 104] as const
  const B = [98, 46] as const
  const L = Math.hypot(B[0] - A[0], B[1] - A[1])
  const u = [(B[0] - A[0]) / L, (B[1] - A[1]) / L] as const
  const n = [u[1], -u[0]] as const
  const on = (s: number, h = 0) => [A[0] + u[0] * s + n[0] * h, A[1] + u[1] * s + n[1] * h] as const
  const r = 17
  const [cx, cy] = on(68, r)
  const hatch = range(8).map((k) => `M${pt(...on(8 + k * 12))}L${pt(...on(4 + k * 12, -6))}`).join('')
  return { slope: `M${A.join(' ')}L${B.join(' ')}Q104 42 114 42`, hill: `M${A.join(' ')}L${B.join(' ')}Q104 42 114 42V104Z`, hatch, cx: f(cx), cy: f(cy), r }
})()

// Gandhi: the charkha's wheel, its laced rim, and the drive band to the spindle.
const CHARKHA = (() => {
  const c = [46, 54] as const
  const R = 31
  const lace = range(25).map((k) => P(k % 2 ? R : R - 4.5, k * 15, ...c))
  const spokes = range(8).map((k) => `M${P(5, k * 45 + 22.5, ...c)}L${P(R - 4.5, k * 45 + 22.5, ...c)}`).join('')
  // External tangents from the wheel to the spindle pulley.
  const p = [98, 76] as const
  const r = 3
  const dx = p[0] - c[0]
  const dy = p[1] - c[1]
  const d = Math.hypot(dx, dy)
  const base = Math.atan2(dy, dx)
  const off = Math.acos((R - r) / d)
  const band = [base - off, base + off]
    .map((t) => `M${pt(c[0] + R * Math.cos(t), c[1] + R * Math.sin(t))}L${pt(p[0] + r * Math.cos(t), p[1] + r * Math.sin(t))}`)
    .join('')
  return { lace: `M${lace.join('L')}`, spokes, band }
})()

// Rome: the aquila's raised wing, feathered along its trailing edge (mirrored for the right).
const WING = 'M55 35C50 24 39 14 23 8L31 19L28.5 21L38 27L35.5 30L45 34L43.5 37L53 40L55.5 45Z'

// Qing: tongues of flame swirling round the pearl, and the spiral within it.
const PEARL = (() => {
  const c = [60, 44] as const
  const flames = range(11)
    .map((k) => {
      const a = -140 + k * 28
      const L = 31 - 7 * (Math.abs(a) / 140)
      return `M${P(13.5, a - 10, ...c)}Q${P(L * 0.78, a - 8, ...c)} ${P(L, a + 18, ...c)}Q${P(L * 0.62, a + 6, ...c)} ${P(13.5, a + 10, ...c)}`
    })
    .join('')
  const sp = range(41).map((k) => P(1.2 + 8.3 * (k / 40), 40 + 640 * (k / 40), ...c))
  return { flames, spiral: `M${sp.join('L')}`, c }
})()

// Ottoman: the ogee arch of a tile panel.
const OGEE = 'M22 110V58C22 40 44 33 53 23C56.5 19 58.5 14.5 60 9C61.5 14.5 63.5 19 67 23C76 33 98 40 98 58V110'

/* ── the emblems ────────────────────────────────────────── */

export const EMBLEMS_B1: EmblemMap = {
  // The alam of Abbas: the panja, the open hand of the Five, raised on its standard with ribbons.
  shia: emblem('alam', (w) => (
    <>
      <path
        d="M54 64C49.5 62.5 46 59.5 44.5 55L37.5 45.5A3.5 3.5 0 0 1 43.2 41.4L44.5 47V23.5A3.5 3.5 0 0 1 51.5 23.5V38A.5 .5 0 0 0 52.5 38V18.5A3.5 3.5 0 0 1 59.5 18.5V38A.5 .5 0 0 0 60.5 38V22.5A3.5 3.5 0 0 1 67.5 22.5V38A.5 .5 0 0 0 68.5 38V29.5A3.5 3.5 0 0 1 75.5 29.5V52C75.5 58 71 62 66 64Z"
        {...tint(0.14)}
      />
      <path d="M53 67.5H67" strokeWidth={w * 1.3} />
      <circle cx="60" cy="75" r="4.5" {...tint(0.14)} />
      <path d="M60 79.5V108M53 108H67" />
      <path d="M38 85H82" strokeWidth={w * 1.3} />
      <circle cx="35.5" cy="85" r="2" />
      <circle cx="84.5" cy="85" r="2" />
      <path d="M43 85C41 93 45 99 42 107L46 105C49 98 45 92 47 85ZM77 85C79 93 75 99 78 107L74 105C71 98 75 92 73 85Z" {...tint(0.12)} strokeWidth={w * 0.85} />
    </>
  )),

  // The Conquering Lion of Judah, crowned, bearing the cross staff with its pennant.
  rasta: emblem('lion of judah', (w) => (
    <>
      <path d="M30 104V17M26.5 12.5H33.5M30 9V17" />
      <path d="M30 19C24 17 18 21 11 18L14.5 24.5L10.5 30C18 32 24 28 30 30Z" {...tint(0.14)} strokeWidth={w * 0.9} />
      <path d={MANE} {...tint(0.16)} />
      <path d="M54 43C50 43 46 44 43 47L39 51C38 53 38.5 55 40 56L42 56.5C42.5 59 44.5 61 47 61C50 62 53 62 56 61" />
      <path d="M46 48.6L49 48.2" strokeWidth={w * 1.2} />
      <path d="M46 39.5L45.5 31.5L49 35L52 29.5L55 35L58.5 31.5L58 39.5Z" {...tint(0.1)} strokeWidth={w * 0.9} />
      <path d="M52 29.5V25.5M50.3 27.3H53.7" strokeWidth={w * 0.8} />
      <path d="M66 59C77 55 91 55 99 59C104 62 105 68 103 74V97H96L95 82C86 84 75 84 68 82L67 97H60L59.5 76" {...tint(0.12)} />
      <path d="M60 64C51 68 42 68 35 66C32 66 31 70 33 71L36 72C44 74 52 74 60 72" {...tint(0.12)} />
      <path d="M90 83L86 97H80" strokeWidth={w * 0.85} />
      <path d="M103 63C110 60 112 50 107 44" />
      <path d="M107 44C103 41 103 36 106 33C109 36 110 40 107 44Z" {...tint(0.16)} />
      <path d="M50 104H106" strokeWidth={w * 0.85} />
    </>
  )),

  // The Sacred Chao: Hodge and Podge, the golden apple of Eris and the pentagon.
  discordia: emblem('sacred chao', (w) => (
    <>
      <path d="M60 14A23 23 0 0 1 60 60A23 23 0 0 0 60 106A46 46 0 0 1 60 14Z" {...tint(0.12)} />
      <circle cx="60" cy="60" r="46" />
      <path d="M60 14A23 23 0 0 1 60 60A23 23 0 0 0 60 106" />
      <path d="M60 33C55 29 49 31 49 38C49 44 54 48 60 46C66 48 71 44 71 38C71 31 65 29 60 33Z" />
      <path d="M60 33C60 30 61 28 63 26.5M61 29C64 26 68 27 69 28C66 30 63 30 61 29Z" strokeWidth={w * 0.85} />
      <path d="M57.5 35.5V43M57.5 39.5L62.5 35.5M59 38.5L62.5 43" strokeWidth={w * 0.8} />
      <path d={poly(range(5).map((k) => P(9.5, k * 72, 60, 84)))} {...tint(0.14)} />
    </>
  )),

  // The dodecahedron of the Timaeus, the shape the god used for the whole heaven.
  plato: emblem('dodecahedron', (w) => (
    <>
      <circle cx="60" cy="60" r="52" strokeWidth={w * 0.6} strokeDasharray={`${w * 0.8} ${w * 3}`} />
      <path d={DODECA.back} strokeWidth={w * 0.6} strokeDasharray={`${w * 1.5} ${w * 2.5}`} />
      <path d={DODECA.outline} {...tint(0.08)} />
      <path d={DODECA.spokes} />
      <path d={DODECA.front} {...tint(0.14)} />
      <circle cx="60" cy="60" r="2" strokeWidth={w * 0.7} />
    </>
  )),

  // A fig leaf from the Garden, and the atoms falling in their lines, one of them swerving.
  epicurus: emblem('fig leaf and swerve', (w) => (
    <>
      <path d={FIG.d} {...tint(0.14)} />
      <path d={FIG.veins} strokeWidth={w * 0.7} />
      <path d="M60 74Q60 92 53 108" />
      <path d="M40 7V21M80 7V21" strokeWidth={w * 0.7} strokeDasharray={`${w * 1.2} ${w * 2.2}`} />
      <path d="M60 7V14C60 19 63 22 67 23" strokeWidth={w * 0.7} strokeDasharray={`${w * 1.2} ${w * 2.2}`} />
      <circle cx="40" cy="24.5" r="2.3" {...tint(0.16)} />
      <circle cx="80" cy="24.5" r="2.3" {...tint(0.16)} />
      <circle cx="70" cy="24.5" r="2.3" {...tint(0.16)} />
    </>
  )),

  // A kylix, the shallow wine cup of the symposium, under a garland of Dionysus' ivy.
  cyrenaic: emblem('kylix and ivy', (w) => (
    <>
      <path d={IVY.vine} strokeWidth={w * 0.85} />
      <path d={IVY.leaves} {...tint(0.14)} strokeWidth={w * 0.85} />
      <path d="M56.5 24.5a2 2 0 1 0 .1 0M63.5 24.5a2 2 0 1 0 .1 0M60 19.5a2 2 0 1 0 .1 0" strokeWidth={w * 0.8} />
      <path d="M22 62C26 74 44 79 60 79C76 79 94 74 98 62Z" {...tint(0.14)} />
      <path d="M19 62H101" strokeWidth={w * 1.2} />
      <path d="M28 66C19 65 14 60 14 55C19 61 27 67 36 69.5M92 66C101 65 106 60 106 55C101 61 93 67 84 69.5" />
      <path d="M55.5 79C57.5 84 57.5 88 55 92M64.5 79C62.5 84 62.5 88 65 92" />
      <path d="M42 98C46 91 74 91 78 98Z" {...tint(0.14)} />
      <path d="M40 70C50 74 70 74 80 70" strokeWidth={w * 0.6} strokeDasharray={`${w * 1.2} ${w * 2.4}`} />
    </>
  )),

  // The starry heavens above, the moral law within: stars over a tablet of maxims.
  kant: emblem('starry heavens and law', (w) => (
    <>
      <path d={star(60, 17, 13) + star(25, 31, 9) + star(95, 31, 9)} {...tint(0.16)} />
      <path d={star(41, 11, 3.8) + star(79, 11, 3.8) + star(11, 52, 3.8) + star(109, 52, 3.8)} strokeWidth={w * 0.9} />
      <path d="M31 110V71A29 29 0 0 1 89 71V110Z" {...tint(0.14)} />
      <path d="M44 62H76M40 74H80M40 86H80M40 98H70" strokeWidth={w * 0.9} />
      <path d="M14 110H106" strokeWidth={w * 1.3} />
    </>
  )),

  // The sun over Zarathustra's mountain, and his eagle wheeling in the air.
  nietzsche: emblem('sun over the mountain', (w) => (
    <>
      <circle cx="60" cy="30" r="11" {...tint(0.14)} />
      <path d={RAYS} />
      <path d="M8 104L34 72L42 79L60 52L78 76L86 68L112 104Z" {...tint(0.12)} />
      <path d="M52 64L60 52L69 64L64.5 61L60 66L56 61Z" {...tint(0.12)} strokeWidth={w * 0.85} />
      <path d="M30 104L42 79M86 104L78 76" strokeWidth={w * 0.6} strokeDasharray={`${w * 1.2} ${w * 2.4}`} />
      <path d="M17 38Q22 31.5 26.5 36.5Q31 31.5 36 38" strokeWidth={w * 0.95} />
      <path d="M4 104H116" />
    </>
  )),

  // The iceberg of the mind: the little that shows above the waterline, the great mass below.
  freud: emblem('iceberg', (w) => (
    <>
      <path d="M42 48L50 34L55 38L63 20L70 32L74 30L80 48Z" {...tint(0.16)} />
      <path d="M55 38L58 48M70 32L67 41" strokeWidth={w * 0.7} />
      <path d="M42 48L31 60L26 78L33 94L51 105L74 103L90 91L97 73L91 58L80 48" {...tint(0.07)} strokeWidth={w * 0.85} />
      <path d="M31 60L44 70L26 78M44 70L51 105M44 70L70 76L74 103M70 76L97 73M70 76L91 58" strokeWidth={w * 0.5} strokeDasharray={`${w * 1.2} ${w * 2.4}`} />
      <path d="M8 48H112" />
      <path d="M8 62H112" strokeWidth={w * 0.6} strokeDasharray={`${w * 1.2} ${w * 2.6}`} />
      <path d="M14 41Q18 38 22 41T30 41M90 41Q94 38 98 41T106 41" strokeWidth={w * 0.8} />
    </>
  )),

  // Sisyphus at his boulder, one must imagine him happy.
  existential: emblem('sisyphus', (w) => (
    <>
      <path d={SISYPHUS.hill} {...tint(0.07)} stroke="none" />
      <path d={SISYPHUS.slope} />
      <path d={SISYPHUS.hatch} strokeWidth={w * 0.6} />
      <circle cx={SISYPHUS.cx} cy={SISYPHUS.cy} r={SISYPHUS.r} {...tint(0.14)} />
      <path d={`M${f(SISYPHUS.cx - 8)} ${f(SISYPHUS.cy - 6)}Q${f(SISYPHUS.cx - 2)} ${f(SISYPHUS.cy - 2)} ${f(SISYPHUS.cx + 1)} ${f(SISYPHUS.cy + 6)}`} strokeWidth={w * 0.6} />
      <circle cx="33.5" cy="56.5" r="3.8" {...tint(0.16)} />
      <path d="M38.5 58L31 63L21 74L17.5 98.5M21 74L32 77L33 89M31 63L33 64.5" />
    </>
  )),

  // The charkha: the spinning wheel, its laced rim, the crank and the spindle.
  gandhi: emblem('charkha', (w) => (
    <>
      <circle cx="46" cy="54" r="31" />
      <path d={CHARKHA.lace} strokeWidth={w * 0.55} />
      <path d={CHARKHA.spokes} strokeWidth={w * 0.85} />
      <circle cx="46" cy="54" r="5" {...tint(0.16)} />
      <path d="M46 54L33 62" />
      <circle cx="31.5" cy="63" r="2.2" {...tint(0.16)} />
      <path d="M43 59L36 98M49 59L56 98" />
      <path d={CHARKHA.band} strokeWidth={w * 0.6} />
      <path d="M98 98V79M88 76H112" />
      <circle cx="98" cy="76" r="3" />
      <path d="M10 98H110V104H10Z" {...tint(0.14)} />
    </>
  )),

  // The aquila of the legion: the eagle, wings raised, on its standard, with the corona below.
  rome: emblem('aquila', (w) => (
    <>
      <path d={WING + mirror(WING)} {...tint(0.14)} />
      <ellipse cx="60" cy="42" rx="6.5" ry="11.5" {...tint(0.12)} />
      <path d="M63 32C64 27 64.5 22 61 20C58 18.5 54 20 52 23.5C53.5 23 55 23.5 56 25C56 28 56.5 30 57.5 32" />
      <circle cx="58.7" cy="23" r=".9" />
      <path d="M55 52L51 60L56 58L60 62L64 58L69 60L65 52" strokeWidth={w * 0.9} />
      <path d="M44 64H76" strokeWidth={w * 1.6} />
      <path d="M60 64V110" />
      <circle cx="60" cy="81" r="9" />
      <circle cx="60" cy="81" r="5.5" {...tint(0.14)} strokeWidth={w * 0.7} />
    </>
  )),

  // The flaming pearl the dragons chase, above the ruyi clouds.
  qing: emblem('flaming pearl', (w) => (
    <>
      <path d={PEARL.flames} {...tint(0.12)} strokeWidth={w * 0.85} />
      <circle cx={PEARL.c[0]} cy={PEARL.c[1]} r="13.5" {...tint(0.08)} />
      <path d={PEARL.spiral} strokeWidth={w * 0.8} />
      <path d="M24 102C16 102 14 92 22 90C21 83 30 80 35 85C37 77 49 75 53 82C55 78 65 78 67 82C71 75 83 77 85 85C90 80 99 83 98 90C106 92 104 102 96 102Z" {...tint(0.12)} />
      <path d="M30 97C27 97 26 93 29 92.5C31 92 32 94.5 30.5 95M90 97C93 97 94 93 91 92.5C89 92 88 94.5 89.5 95M60 96C56 96 55 91 59 90.5C61.5 90.5 62 93 60.5 93.5" strokeWidth={w * 0.8} />
    </>
  )),

  // The Soyombo: fire, sun and moon, the arrowheads, the bars, the two fish and the pillars.
  mongol: emblem('soyombo', (w) => (
    <g transform="translate(0 3)">
      <path d="M60 6C65 11 65.5 17 60 22C54.5 17 55 11 60 6ZM52 12C55 15 55.5 19 52.5 22C49.5 19 49.5 15 52 12ZM68 12C65 15 64.5 19 67.5 22C70.5 19 70.5 15 68 12Z" {...tint(0.14)} strokeWidth={w * 0.9} />
      <circle cx="60" cy="29" r="4.8" {...tint(0.14)} />
      <path d="M51 32A9 9 0 0 0 69 32A9 6.2 0 0 1 51 32Z" {...tint(0.14)} />
      <path d="M47 45H73L60 53Z" {...tint(0.14)} />
      <path d="M47 57H73V61H47Z" {...tint(0.14)} />
      <circle cx="60" cy="75" r="11" />
      <path d="M60 64A5.5 5.5 0 0 1 60 75A5.5 5.5 0 0 0 60 86A11 11 0 0 1 60 64Z" {...tint(0.14)} />
      <circle cx="60" cy="69.5" r="1.3" />
      <circle cx="60" cy="80.5" r="1.3" {...tint(0.16)} />
      <path d="M47 89H73V93H47Z" {...tint(0.14)} />
      <path d="M47 97H73L60 105Z" {...tint(0.14)} />
      <path d="M36 45H41V105H36ZM79 45H84V105H79Z" {...tint(0.14)} />
    </g>
  )),

  // An Iznik tulip with its saz leaves, set in an ogee arch.
  ottoman: emblem('tulip in arch', (w) => (
    <>
      <path d={OGEE} />
      <path d="M14 110H106" />
      <path d="M60 64C52 56 51 41 60 27C69 41 68 56 60 64Z" {...tint(0.16)} />
      <path d="M58.5 66C46 65 40 54 41 35C45 46 51 52 56.5 56M61.5 66C74 65 80 54 79 35C75 46 69 52 63.5 56" {...tint(0.1)} />
      <path d="M60 66C61 78 59 90 60 104" />
      <path d="M60 98C50 96 40 86 36 71C44 80 52 87 59.5 91ZM60 88C70 86 80 76 84 62C76 70 67 78 60.5 82" {...tint(0.12)} strokeWidth={w * 0.9} />
    </>
  )),

  // A chhatri: the onion dome on its slender columns under a deep chhajja eave.
  mughal: emblem('chhatri', (w) => (
    <g transform="translate(0 4)">
      <path d="M60 6V12M57 13.5H63" strokeWidth={w * 0.9} />
      <circle cx="60" cy="16.5" r="2.6" />
      <path d="M44 48C38 40 42 30 52 25C56 23 59 21.5 60 19.5C61 21.5 64 23 68 25C78 30 82 40 76 48Z" {...tint(0.14)} />
      <path d="M52 48C51 42 54 37 60 34C66 37 69 42 68 48" strokeWidth={w * 0.6} />
      <path d="M42 48H78V51H42Z" />
      <path d="M36 51H84L94 58H26Z" {...tint(0.14)} />
      <path d="M33 58V90M48 58V90M72 58V90M87 58V90" />
      <path d="M33 72C33 65 37 62 40.5 60.5C44 62 48 65 48 72M48 72C48 64 55 61 60 59.5C65 61 72 64 72 72M72 72C72 65 76 62 79.5 60.5C83 62 87 65 87 72" strokeWidth={w * 0.85} />
      <path d="M28 90H92V96H28ZM22 96H98V102H22Z" {...tint(0.12)} />
    </g>
  )),
}
