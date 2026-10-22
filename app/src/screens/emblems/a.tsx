import type { ReactNode } from 'react'
import type { Emblem, EmblemMap, EmblemProps } from './kit'

/* Cover emblems, part A. Each Onda's emblem is a line drawing of a motif from its own traditional art or architecture,
   on a 120 unit grid in currentColor. Fills are quiet tints only. Paths that need geometry are computed once at load. */

const f = (n: number) => Math.round(n * 10) / 10
const pt = (x: number, y: number) => `${f(x)} ${f(y)}`
/** A point at radius r and `deg` degrees clockwise from the top, around (cx, cy). */
const polar = (r: number, deg: number, cx = 60, cy = 60): [number, number] => {
  const a = (deg * Math.PI) / 180
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)]
}
const P = (r: number, deg: number, cx = 60, cy = 60) => pt(...polar(r, deg, cx, cy))
const poly = (pts: string[]) => `M${pts.join('L')}Z`
/** A circular arc as a path, clockwise when b > a. */
const arc = (r: number, a: number, b: number, cx = 60, cy = 60) =>
  `M${P(r, a, cx, cy)}A${f(r)} ${f(r)} 0 ${Math.abs(b - a) > 180 ? 1 : 0} ${b > a ? 1 : 0} ${P(r, b, cx, cy)}`
/** A whole circle as a subpath (for even-odd rings). */
const ring = (r: number, cx = 60, cy = 60) => `M${f(cx - r)} ${f(cy)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`
const range = (n: number) => Array.from({ length: n }, (_, k) => k)

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

// Zen: a single brushed ensō, heavy where the brush lands, dry and open at the end.
const ENSO = (() => {
  const N = 72
  const out: string[] = []
  const inn: string[] = []
  for (const k of range(N + 1)) {
    const t = k / N
    const a = 212 + 318 * t
    const r = 43 + 1.8 * Math.sin(t * 6.4 + 0.6)
    const th = 1 + 14 * Math.pow(1 - t, 1.15) * (0.8 + 0.2 * Math.sin(t * 13 + 1))
    out.push(P(r + th * 0.5, a))
    inn.push(P(r - th * 0.5, a))
  }
  return `M${out.join('L')}L${inn.reverse().join('L')}Z`
})()

// Tao: the eight trigrams of the Earlier Heaven order around the taijitu, inner line first.
const BAGUA = (() => {
  const set: [number, number[]][] = [[0, [1, 1, 1]], [45, [0, 1, 1]], [90, [0, 1, 0]], [135, [0, 0, 1]], [180, [0, 0, 0]], [225, [1, 0, 0]], [270, [1, 0, 1]], [315, [1, 1, 0]]]
  let d = ''
  for (const [a, lines] of set) {
    const rad = (a * Math.PI) / 180
    const tx = Math.cos(rad)
    const ty = Math.sin(rad)
    lines.forEach((solid, k) => {
      const [cx, cy] = polar(36 + 6.5 * k, a)
      const L = 8 + 1.3 * k
      const seg = (s: number, e: number) => `M${pt(cx + tx * s, cy + ty * s)}L${pt(cx + tx * e, cy + ty * e)}`
      d += solid ? seg(-L, L) : seg(-L, -2.4) + seg(2.4, L)
    })
  }
  return d
})()

// Vedanta: the Sri Yantra, gates, petals and interlocking triangles around the bindu.
const YANTRA = (() => {
  const petals = range(16)
    .map((k) => {
      const a = k * 22.5
      return `M${P(30, a - 11.25)}Q${P(41, a - 11.25)} ${P(40.5, a)}Q${P(41, a + 11.25)} ${P(30, a + 11.25)}`
    })
    .join('')
  const tri = (apex: number, base: number, hw: number) => `M60 ${60 + apex}L${60 - hw} ${60 + base}H${60 + hw}Z`
  const tris = [tri(28, -20, 19.6), tri(19, -11, 25), tri(11, -2, 18.5), tri(5, -6, 8), tri(-28, 19.6, 20), tri(-19, 11, 24.5), tri(-10, 4, 15)].join('')
  return { petals, tris }
})()

// Tibet: the endless knot, drawn square and turned 45 degrees.
const KNOT = (() => {
  const e = 24
  let d = ''
  for (const q of [-18, -6, 6, 18]) d += `M${q} ${-e}V${e}M${-e} ${q}H${e}`
  d += `M-6 ${-e}A6 6 0 0 1 6 ${-e}M${e} -6A6 6 0 0 1 ${e} 6M6 ${e}A6 6 0 0 1 -6 ${e}M${-e} 6A6 6 0 0 1 ${-e} -6`
  d += `M18 ${-e}C18 -40 40 -18 ${e} -18M${e} 18C40 18 18 40 18 ${e}M-18 ${e}C-18 40 -40 18 ${-e} 18M${-e} -18C-40 -18 -18 -40 -18 ${-e}`
  return d
})()

// Yoruba: the border of an opon Ifá, a zigzag band broken by Èṣù's face at the top.
const OPON = (() => {
  const pts: string[] = []
  for (const k of range(29)) pts.push(P(k % 2 ? 46 : 38.5, 26 + k * 11))
  return `M${pts.join('L')}`
})()

// Aztec: the Sun Stone, rays, day-sign ring and the four suns of Nahui Ollin.
const SUNSTONE = (() => {
  const ticks = range(40).map((k) => `M${P(45.5, k * 9 + 4.5)}L${P(51, k * 9 + 4.5)}`).join('')
  const days = range(20).map((k) => `M${P(30, k * 18 + 9)}L${P(36, k * 18 + 9)}`).join('')
  const rays = [0, 90, 180, 270].map((a) => `M${P(36, a - 8)}L${P(51, a)}L${P(36, a + 8)}`).join('') + [45, 135, 225, 315].map((a) => `M${P(36, a - 5)}L${P(43, a)}L${P(36, a + 5)}`).join('')
  const suns = [45, 135, 225, 315].map((a) => {
    const [cx, cy] = polar(20, a)
    return `M${P(7, a, cx, cy)}L${P(7, a + 90, cx, cy)}L${P(7, a + 180, cx, cy)}L${P(7, a + 270, cx, cy)}Z`
  }).join('')
  return { ticks, days, rays, suns }
})()

// Gnostic: the ouroboros, thick behind the head and tapering into its own mouth.
const OUROBOROS = (() => {
  const N = 60
  const out: string[] = []
  const inn: string[] = []
  for (const k of range(N + 1)) {
    const t = k / N
    const a = 36 + 318 * t
    const th = 1.2 + 10 * Math.pow(1 - t, 0.7)
    out.push(P(41 + th / 2, a))
    inn.push(P(41 - th / 2, a))
  }
  const body = `M${out.join('L')}L${inn.reverse().join('L')}Z`
  const head = `M${P(47.5, 38)}Q${P(50.5, 18)} ${P(44, 5)}L${P(41.5, 13)}L${P(38, 5)}Q${P(31.5, 18)} ${P(35, 38)}Z`
  return { body, head, eye: polar(44.5, 24) }
})()

// Mahayana: a five storey pagoda with upturned eaves and a ringed finial.
const PAGODA = (() => {
  const Ey = [96, 80, 64.5, 50, 36]
  const ew = [40, 35, 30, 25, 20]
  const bw = [21, 18, 15, 12, 9]
  let eaves = ''
  let walls = ''
  Ey.forEach((y, k) => {
    const w = ew[k] ?? 0
    const b = bw[k] ?? 0
    const floor = k === 0 ? 106 : (Ey[k - 1] ?? 0) - 9
    walls += `M${60 - b} ${floor}V${y + 1}M${60 + b} ${floor}V${y + 1}`
    eaves += `M${60 - w} ${y - 5}Q60 ${y + 3} ${60 + w} ${y - 5}`
    const nb = bw[k + 1]
    eaves += nb === undefined ? `M${60 - w} ${y - 5}L60 ${y - 15}L${60 + w} ${y - 5}` : `M${60 - w} ${y - 5}L${60 - nb} ${y - 9}M${60 + w} ${y - 5}L${60 + nb} ${y - 9}`
  })
  return { eaves, walls }
})()

// Twenties: the Chrysler Building crown, stacked sunburst arches under a needle spire.
const CROWN = (() => {
  const hw = [30, 26, 22, 18, 14]
  const ys = [92]
  for (const k of [1, 2, 3, 4]) {
    const prev = ys[k - 1] ?? 0
    const a = hw[k - 1] ?? 0
    const b = hw[k] ?? 0
    ys.push(prev - Math.sqrt(a * a - b * b))
  }
  let arches = ''
  let windows = ''
  hw.forEach((r, k) => {
    const y = ys[k] ?? 0
    arches += `M${60 - r} ${f(y)}A${r} ${r} 0 0 1 ${60 + r} ${f(y)}`
    if (k < 4) for (const a of [-60, -30, 0, 30, 60]) windows += `M${P(r - 6.5, a, 60, y)}L${P(r - 2, a - 5, 60, y)}L${P(r - 2, a + 5, 60, y)}Z`
  })
  return { arches, windows, top: (ys[4] ?? 0) - 14 }
})()

// Sunni: a ten-fold girih rosette, star within petals within star.
const GIRIH = (() => {
  const outer: string[] = []
  const inner: string[] = []
  let petals = ''
  for (const k of range(10)) {
    const a = k * 36
    outer.push(P(50, a), P(31, a + 18))
    inner.push(P(17, a), P(10.5, a + 18))
    petals += `M${P(31, a - 18)}L${P(17, a)}L${P(31, a + 18)}`
  }
  return { outer: poly(outer), inner: poly(inner), petals }
})()

// Hindu: mango leaves fanned from the mouth of the kalasha.
const LEAVES = [-78, -46, -16, 16, 46, 78]
  .map((a) => {
    const [tx, ty] = polar(25, a, 60, 47)
    const [lx, ly] = polar(13, a - 14, 60, 47)
    const [rx, ry] = polar(13, a + 14, 60, 47)
    return `M60 47Q${pt(lx, ly)} ${pt(tx, ty)}Q${pt(rx, ry)} 60 47Z`
  })
  .join('')

// Jain: a dharma wheel in the raised palm.
const PALM_WHEEL = range(8).map((k) => `M${P(3.5, k * 45, 63, 82)}L${P(11, k * 45, 63, 82)}`).join('')

/* ── the emblems ────────────────────────────────────────── */

export const EMBLEMS_A: EmblemMap = {
  // The Stoa Poikile: a long Doric colonnade on its steps.
  stoic: emblem('stoa', (w) => (
    <>
      <path d="M8 34L17 25H103L112 34Z" {...tint(0.16)} />
      <path d="M10 34V43H110V34" />
      <path d="M10 38.5H110" strokeWidth={w * 0.7} />
      <path d={[20, 36, 52, 68, 84, 100].map((x) => `M${x - 6} 46H${x + 6}M${x - 4} 48V85M${x + 4} 48V85`).join('')} />
      <path d="M10 87H110M6 93H114M2 99H118" />
    </>
  )),

  // A brushed ensō with its open gap and the painter's seal.
  zen: emblem('enso', (w) => (
    <>
      <path d={ENSO} {...tint(0.3)} strokeWidth={w * 0.8} />
      <path d={arc(49.5, 478, 524) + arc(38, 492, 527)} strokeWidth={w * 0.6} />
      <rect x="91" y="94" width="10" height="13" rx="1.5" {...tint(0.3)} />
    </>
  )),

  // The taijitu inside the eight trigrams.
  tao: emblem('taijitu', (w) => (
    <>
      <circle cx="60" cy="60" r="24" />
      <path d="M60 36A24 24 0 0 1 60 84A12 12 0 0 1 60 60A12 12 0 0 0 60 36Z" {...tint(0.32)} />
      <circle cx="60" cy="48" r="3.2" />
      <circle cx="60" cy="72" r="3.2" {...tint(0.6)} stroke="none" />
      <path d={BAGUA} strokeWidth={w * 1.3} strokeLinecap="butt" />
    </>
  )),

  // The endless knot, one of the eight auspicious symbols.
  tibet: emblem('endless knot', (w) => (
    <g transform="translate(60 60) rotate(45) scale(1.24)" strokeWidth={w / 1.24}>
      <path d="M-18 -18H18V18H-18Z" {...tint(0.12)} stroke="none" />
      <path d={KNOT} />
    </g>
  )),

  // The Sri Yantra.
  vedanta: emblem('sri yantra', (w) => (
    <>
      <path d="M12 12H50V6H70V12H108V50H114V70H108V108H70V114H50V108H12V70H6V50H12Z" />
      <circle cx="60" cy="60" r="44" strokeWidth={w * 0.8} />
      <path d={YANTRA.petals} />
      <circle cx="60" cy="60" r="30" {...tint(0.1)} />
      <path d={YANTRA.tris} strokeWidth={w * 0.9} />
      <circle cx="60" cy="60.5" r="1.8" {...tint(0.7)} stroke="none" />
    </>
  )),

  // The alchemists' squared circle that Jung read as the Self.
  jung: emblem('squared circle', () => (
    <>
      <circle cx="60" cy="60" r="48" />
      <path d="M26 26H94V94H26Z" />
      <path d="M60 26L94 94H26Z" {...tint(0.1)} />
      <circle cx="60" cy="73" r="21" {...tint(0.12)} />
      <circle cx="60" cy="73" r="2.6" {...tint(0.7)} stroke="none" />
      <path d="M60 4V9M60 111V116M4 60H9M111 60H116" />
    </>
  )),

  // The Anishinaabe thunderbird, wings spread, carrying lightning.
  animism: emblem('thunderbird', (w) => (
    <>
      <circle cx="60" cy="22" r="6" />
      <path d="M65.5 20L74 23.5L65.5 26M57 16.5L54 9M63 16.5L66 9" />
      <path d="M50 34H70L64 58L72 84H48L56 58Z" {...tint(0.16)} />
      <path d="M60 39L64 46L60 53L56 46Z" strokeWidth={w * 0.8} />
      <path d="M51 38L8 30L15 39L8 44L17 48L12 55L55 54M69 38L112 30L105 39L112 44L103 48L108 55L65 54" {...tint(0.1)} />
      <path d="M50 84L44 104L54 98L60 106L66 98L76 104L70 84" />
      <path d="M22 62L30 70L24 74L33 84M98 62L90 70L96 74L87 84" strokeWidth={w * 0.9} />
    </>
  )),

  // An Ndebele painted gateway: stepped gable, doubled outlines, chevrons.
  ubuntu: emblem('ndebele wall', (w) => (
    <>
      <path d="M14 104V56H24V46H36V36H50V26H70V36H84V46H96V56H106V104" />
      <path d="M22 104V63H32V53H44V43H55V35H65V43H76V53H88V63H98V104" strokeWidth={w * 0.8} />
      <path d="M46 104V68H74V104Z" {...tint(0.18)} />
      <path d="M60 46L66 52L60 58L54 52Z" {...tint(0.3)} />
      <path d="M26 98L32 76L40 98ZM80 98L88 76L94 98Z" {...tint(0.14)} />
      <path d="M50 76H70M50 84H70M50 92H70" strokeWidth={w * 0.7} />
      <path d="M6 104H114" />
    </>
  )),

  // A Mevlevi dervish turning, sikke hat, one palm raised and one lowered.
  sufi: emblem('dervish', (w) => (
    <>
      <path d="M55.5 9.5Q60 6.5 64.5 9.5L66 25H54Z" {...tint(0.28)} />
      <circle cx="60" cy="30.5" r="5.5" />
      <path d="M55 38L53 58H67L65 38Z" {...tint(0.1)} />
      <path d="M55 40C47 35 41 29 37 21M37 21L33 19M65 40C74 42 84 46 92 53M92 53L95 57" />
      <path d="M53 58C43 74 30 87 14 97C40 108 80 108 106 97C90 87 77 74 67 58Z" {...tint(0.12)} />
      <path d="M57.5 60L38 103M60 60V106M62.5 60L82 103" strokeWidth={w * 0.7} />
      <path d="M20 103C44 113 76 113 100 103" strokeWidth={w * 0.7} />
    </>
  )),

  // Thoreau's cabin at Walden, under the white pines, by the pond.
  transc: emblem('walden cabin', (w) => (
    <>
      <path d="M90 16L80 34H100ZM90 28L76 50H104ZM90 43L72 70H108Z" {...tint(0.12)} />
      <path d="M90 70V100" />
      <path d="M18 56L12 70H24ZM18 66L9 84H27Z" {...tint(0.1)} />
      <path d="M18 84V100" />
      <path d="M32 100V74H66V100M28 76L49 58L70 76M58 66V56H63V70" />
      <path d="M44 100V87H52V100M56 80H62V86H56Z" strokeWidth={w * 0.85} />
      <path d="M6 100H114M24 107H58M70 107H96M40 114H80" />
    </>
  )),

  // Hammer, sickle and star, cut as constructivist geometry.
  soviet: emblem('hammer and sickle', (w) => (
    <>
      <path d={poly(range(10).map((k) => P(k % 2 ? 5.5 : 14, k * 36, 92, 24)))} {...tint(0.22)} />
      <path d="M40.8 79.2A30 30 0 1 0 36 43A24 24 0 1 1 46 73Z" {...tint(0.16)} />
      <path d="M42.5 77L27 95" strokeWidth={w * 3.4} />
      <path d="M90 98L50 56" strokeWidth={w * 3.4} />
      <path d="M52 39.4L59 46.6L40 64.6L33 57.4Z" {...tint(0.3)} />
    </>
  )),

  // An opon Ifá divination tray with Èṣù at the top and Èjì Ogbè marked in the dust.
  yoruba: emblem('opon ifa', (w) => (
    <>
      <circle cx="60" cy="60" r="51" />
      <circle cx="60" cy="60" r="34" {...tint(0.12)} />
      <path d={OPON} strokeWidth={w * 0.85} />
      <ellipse cx="60" cy="17.5" rx="7" ry="8.5" {...tint(0.2)} />
      <path d="M56.5 16H58.5M61.5 16H63.5M60 17.5V20.5M57.5 22.5H62.5" strokeWidth={w * 0.8} />
      <path d="M52 42V48M52 52V58M52 62V68M52 72V78M68 42V48M68 52V58M68 62V68M68 72V78" strokeWidth={w * 1.3} />
    </>
  )),

  // The Sun Stone: Tonatiuh, the four suns, the day signs and the rays.
  aztec: emblem('sun stone', (w) => (
    <>
      <circle cx="60" cy="60" r="52" />
      <circle cx="60" cy="60" r="45.5" strokeWidth={w * 0.8} />
      <path d={SUNSTONE.ticks} strokeWidth={w * 0.7} />
      <circle cx="60" cy="60" r="36" />
      <path d={SUNSTONE.rays} {...tint(0.14)} />
      <circle cx="60" cy="60" r="30" strokeWidth={w * 0.8} />
      <path d={SUNSTONE.days} strokeWidth={w * 0.7} />
      <path d={SUNSTONE.suns} {...tint(0.18)} />
      <circle cx="60" cy="60" r="11" {...tint(0.12)} />
      <path d="M55.5 57H57.5M62.5 57H64.5M58 65L60 71L62 65" strokeWidth={w * 0.9} />
    </>
  )),

  // The ankh raised on the djed pillar.
  egypt: emblem('ankh and djed', (w) => (
    <>
      <path d="M49 18a11 14 0 1 0 22 0a11 14 0 1 0 -22 0ZM54 18a6 9.5 0 1 0 12 0a6 9.5 0 1 0 -12 0Z" fillRule="evenodd" {...tint(0.16)} />
      <path d="M57 31.5L40 29V40L57 37ZM63 31.5L80 29V40L63 37Z" {...tint(0.16)} />
      <path d="M50 41V71M70 41V71M51 71L47 104M69 71L73 104M56 37L55 41M64 37L65 41" />
      <path d={[42, 50, 58, 66].map((y) => `M40 ${y}H80V${y + 5}H40Z`).join('')} {...tint(0.2)} strokeWidth={w * 0.9} />
      <path d="M38 106H82" strokeWidth={w * 1.4} />
    </>
  )),

  // The caduceus of Hermes: winged staff, two serpents.
  hermes: emblem('caduceus', (w) => (
    <>
      <circle cx="60" cy="10.5" r="4" />
      <path d="M60 14.5V110" />
      <path d="M57 27C49 18 35 14 16 16C24 20 29 22 33 23C27 25 23 27 19 30C29 31 35 30 41 29C37 31 35 33 33 36C43 35 51 32 57 30ZM63 27C71 18 85 14 104 16C96 20 91 22 87 23C93 25 97 27 101 30C91 31 85 30 79 29C83 31 85 33 87 36C77 35 69 32 63 30Z" {...tint(0.12)} />
      <path d="M58 106C42 100 42 88 60 82C78 76 78 64 60 58C44 52 44 44 53 40M62 106C78 100 78 88 60 82C42 76 42 64 60 58C76 52 76 44 67 40" />
      <path d="M53 40C51 37 55 35 57 37.5M67 40C69 37 65 35 63 37.5" strokeWidth={w * 0.9} />
    </>
  )),

  // The ouroboros of the Alexandrian Chrysopoeia, with the spark it encircles.
  gnostic: emblem('ouroboros', (w) => (
    <>
      <path d={OUROBOROS.body} {...tint(0.16)} />
      <path d={OUROBOROS.head} {...tint(0.2)} />
      <circle cx={f(OUROBOROS.eye[0])} cy={f(OUROBOROS.eye[1])} r="1.5" {...tint(0.8)} stroke="none" />
      <path d={arc(41, 60, 330)} strokeWidth={w * 0.6} strokeDasharray={`${w * 0.8} ${w * 3.2}`} />
      <path d="M60 46L62.5 57.5L74 60L62.5 62.5L60 74L57.5 62.5L46 60L57.5 57.5Z" {...tint(0.18)} />
    </>
  )),

  // The Oseberg ship: spiral prow, striped sail, the sea.
  norse: emblem('oseberg ship', (w) => (
    <>
      <path d="M14 70C34 82 86 82 106 70C98 84 84 94 60 94C36 94 22 84 14 70Z" {...tint(0.14)} />
      <path d="M106 70C112 56 113 40 105 30C99 22 88 25 90 33C92 39 100 37 98 31M14 70C9 59 9 48 15 41C19 37 25 40 23 44" />
      <path d="M22 78C42 87 78 87 98 78" strokeWidth={w * 0.7} />
      <path d="M60 80V18M40 22H80" />
      <path d="M41 23H79L77 58Q60 62 43 58Z" {...tint(0.1)} />
      <path d="M53.5 23L52.5 60M66.5 23L67.5 60" strokeWidth={w * 0.7} />
      <path d="M6 106Q15 100 24 106T42 106T60 106T78 106T96 106T114 106" />
    </>
  )),

  // Diogenes' pithos, the great storage jar he slept in, on its side.
  cynic: emblem('pithos', (w) => (
    <>
      <path d="M31 43C46 27 78 27 97 45C104 52 106 58 106 62C106 66 104 72 97 79C78 97 46 97 31 81" {...tint(0.12)} />
      <path d="M103.5 53.5C106.5 59 106.5 65 103.5 70.5" />
      <ellipse cx="27" cy="62" rx="9.5" ry="20.5" />
      <ellipse cx="27" cy="62" rx="5.5" ry="15" {...tint(0.32)} strokeWidth={w * 0.8} />
      <path d="M52 31C58 47 58 79 52 93M77 34C82 48 82 76 77 90" strokeWidth={w * 0.8} />
      <path d="M40 36C44 50 44 74 40 88" strokeWidth={w * 0.6} strokeDasharray={`${w * 1.5} ${w * 2.5}`} />
      <path d="M6 100H114" />
    </>
  )),

  // A bronze ding, the ritual tripod of the rites, with its taotie band.
  confucian: emblem('ding', (w) => (
    <>
      <path d="M35 38V21H46V38M74 38V21H85V38" />
      <path d="M22 38H98" strokeWidth={w * 1.4} />
      <path d="M28 38V50C28 72 42 82 60 82C78 82 92 72 92 50V38" {...tint(0.14)} />
      <path d="M28 52H92" strokeWidth={w * 0.8} />
      <path d="M44 46C45 41 52 40 54 44M76 46C75 41 68 40 66 44M60 40V50" strokeWidth={w * 0.85} />
      <circle cx="50" cy="46" r="1.8" {...tint(0.7)} stroke="none" />
      <circle cx="70" cy="46" r="1.8" {...tint(0.7)} stroke="none" />
      <path d="M36 74L30 104H38L44 78ZM84 74L90 104H82L76 78ZM56 82L56 107H64L64 82" {...tint(0.12)} />
    </>
  )),

  // The spiral minaret of the Great Mosque of Samarra.
  abbasid: emblem('malwiya', (w) => (
    <>
      <path d="M24 104L45 34H75L96 104Z" {...tint(0.1)} stroke="none" />
      <path d="M24 104L45 34M96 104L75 34" />
      <path d="M24 104L90 84M30 84L84 64M36 64L78 46M41 46L74 34" strokeWidth={w * 0.85} />
      <path d="M53 34V21H67V34M51 21H69M57 34V28A3 3 0 0 1 63 28V34" />
      <path d="M56 104V97A4 4 0 0 1 64 97V104" />
      <path d="M8 104H112V110H8Z" {...tint(0.14)} />
    </>
  )),

  // The Chrysler Building crown.
  twenties: emblem('chrysler crown', (w) => (
    <>
      <path d={`M30 112V92M90 112V92M45 112V96M75 112V96M60 112V96`} />
      <path d={CROWN.arches} />
      <path d={CROWN.windows} {...tint(0.3)} strokeWidth={w * 0.6} />
      <path d={`M57 ${f(CROWN.top + 14)}L60 4L63 ${f(CROWN.top + 14)}`} {...tint(0.16)} />
    </>
  )),

  // A royal palm before the mogotes of Viñales.
  cuba: emblem('royal palm', (w) => (
    <>
      <path d="M4 110C9 94 21 89 28 98C33 87 45 88 49 104M74 104C79 91 91 89 96 98C101 92 110 95 116 110" strokeWidth={w * 0.85} />
      <path d="M57 110C56 90 58 66 58.5 44M63 110C64 90 62 66 61.5 44" />
      <path d="M58.5 44L58 31H62L61.5 44" {...tint(0.2)} />
      <path d="M60 30C48 20 32 18 15 26M60 30C46 28 34 36 25 51M60 30C54 16 44 8 31 6M60 30C66 16 76 8 89 6M60 30C72 20 88 18 105 26M60 30C74 28 86 36 95 51M60 30V6" />
      <path d="M58 25C46 18 32 18 17 24M58 27C46 28 35 34 28 46M62 25C74 18 88 18 103 24M62 27C74 28 85 34 92 46" strokeWidth={w * 0.6} strokeDasharray={`${w * 1.2} ${w * 2.2}`} />
      <path d="M2 110H118" />
    </>
  )),

  // The kalasha: a water pot crowned with mango leaves and a coconut.
  hindu: emblem('kalasha', (w) => (
    <>
      <path d={LEAVES} {...tint(0.16)} strokeWidth={w * 0.85} />
      <ellipse cx="60" cy="31" rx="10" ry="12.5" {...tint(0.16)} />
      <path d="M60 18.5V12M57 15L60 12L63 15" strokeWidth={w * 0.85} />
      <path d="M43 48C43 43.5 77 43.5 77 48C77 52.5 43 52.5 43 48Z" />
      <path d="M48 52C51 56 51 59 47 63C25 69 23 101 50 106H70C97 101 95 69 73 63C69 59 69 56 72 52" {...tint(0.1)} />
      <path d="M29 79C48 86 72 86 91 79M32 89C50 95 70 95 88 89" strokeWidth={w * 0.8} />
      <path d="M50 106L47 113H73L70 106" />
    </>
  )),

  // A five storey pagoda.
  mahayana: emblem('pagoda', (w) => (
    <>
      <path d={PAGODA.walls} strokeWidth={w * 0.85} />
      <path d={PAGODA.eaves} />
      <path d="M60 21V6M56 18H64M56.5 14.5H63.5M57 11H63" strokeWidth={w * 0.85} />
      <circle cx="60" cy="4.5" r="2.4" {...tint(0.3)} strokeWidth={w * 0.8} />
      <path d="M56 106V98H64V106" strokeWidth={w * 0.85} />
      <path d="M16 106H104V111H16Z" {...tint(0.14)} />
    </>
  )),

  // A bell-shaped chedi on its terraces, with ringed spire.
  theravada: emblem('chedi', (w) => (
    <>
      <path d="M20 108H100V102H93V96H86V91H34V96H27V102H20Z" {...tint(0.12)} />
      <path d="M35 91C35 70 44 59 60 55C76 59 85 70 85 91" {...tint(0.14)} />
      <path d="M37 84C52 87 68 87 83 84" strokeWidth={w * 0.75} />
      <path d="M51 55V47H69V55" />
      <path d="M53 43.5H67M54 40H66M55 36.5H65M56 33H64" strokeWidth={w * 0.9} />
      <path d="M56.5 33L60 6L63.5 33" {...tint(0.16)} />
    </>
  )),

  // A torii with the shimenawa rope and its shide papers.
  shinto: emblem('torii', (w) => (
    <>
      <path d="M5 21C30 28 90 28 115 21L113 30C89 35 31 35 7 30Z" {...tint(0.22)} />
      <path d="M14 36H106V41H14Z" />
      <path d="M12 52H108V58H12Z" {...tint(0.14)} />
      <path d="M31 41L27 108M39 41L36 108M89 41L93 108M81 41L84 108M55 41V52M65 41V52" />
      <path d="M39 63C50 71 70 71 81 63M39 67C50 75 70 75 81 67" strokeWidth={w * 0.9} />
      <path d="M48 71L52 76L48 79L52 84M60 73L64 78L60 81L64 86M72 71L76 76L72 79L76 84" strokeWidth={w * 0.85} />
      <path d="M23 108H42M78 108H97" strokeWidth={w * 1.4} />
    </>
  )),

  // The Jain hand of ahimsa, with the wheel in the palm.
  jain: emblem('ahimsa hand', (w) => (
    <>
      <path d="M48 108L46 78C40 72 32 64 30 56C29 50 35 47 38.5 52.5L45 63V30C45 22 54 22 54 30V24C54 15 64 15 64 24V28C64 20 74 20 74 28V36C74 28 82 28 82 36V80C82 94 76 102 74 108" {...tint(0.12)} />
      <path d="M54 30V56M64 28V56M74 36V58" strokeWidth={w * 0.75} />
      <circle cx="63" cy="82" r="11" />
      <path d={PALM_WHEEL} strokeWidth={w * 0.75} />
      <circle cx="63" cy="82" r="2.4" {...tint(0.5)} />
    </>
  )),

  // The Khanda: double-edged sword, chakkar and two kirpans.
  sikh: emblem('khanda', (w) => (
    <>
      <path d={ring(24, 60, 60) + ring(18.5, 60, 60)} fillRule="evenodd" {...tint(0.16)} />
      <path d="M60 6L66.5 19V78H53.5V19Z" {...tint(0.2)} />
      <path d="M60 16V75" strokeWidth={w * 0.6} />
      <path d="M49 80H71" strokeWidth={w * 1.8} />
      <path d="M60 81V94" strokeWidth={w * 1.6} />
      <circle cx="60" cy="97.5" r="3" />
      <path d="M67 98C43 92 23 74 21 46L26 30C29 60 45 83 70 93ZM53 98C77 92 97 74 99 46L94 30C91 60 75 83 50 93Z" {...tint(0.14)} />
      <path d="M69 96L81 108M51 96L39 108M64 92L72 100M56 92L48 100" strokeWidth={w * 1.6} />
    </>
  )),

  // The Faravahar of Persepolis.
  zoroaster: emblem('faravahar', (w) => (
    <>
      <path d="M56 22V15.5H64V22" {...tint(0.2)} />
      <circle cx="60" cy="26.5" r="4.6" />
      <path d="M57 31L60 36L63 31" strokeWidth={w * 0.85} />
      <path d="M54 37H66L64 51H56Z" {...tint(0.1)} />
      <path d="M55 40L45 33L43 28M65 40L72 44" />
      <circle cx="74" cy="45" r="2.3" />
      <circle cx="60" cy="60" r="9" {...tint(0.1)} />
      <path d="M51 56C40 52 24 50 6 47C8 51 11 53 13 54C11 57 13 59 16 60.5C15 63 17 65 20 66.5C30 68 42 68 51 65ZM69 56C80 52 96 50 114 47C112 51 109 53 107 54C109 57 107 59 104 60.5C105 63 103 65 100 66.5C90 68 78 68 69 65Z" {...tint(0.12)} />
      <path d="M13 54C27 56 40 58 51 60M16 60.5C28 62 40 63 51 63M107 54C93 56 80 58 69 60M104 60.5C92 62 80 63 69 63" strokeWidth={w * 0.65} />
      <path d="M55 69L48 88C54 92 66 92 72 88L65 69Z" {...tint(0.12)} />
      <path d="M50.5 79H69.5" strokeWidth={w * 0.65} />
      <path d="M53 67C45 73 38 79 36 87C35 93 42 93 42 88M67 67C75 73 82 79 84 87C85 93 78 93 78 88" />
    </>
  )),

  // The seven-branched menorah of the Temple, as carved on the Arch of Titus.
  judaism: emblem('menorah', (w) => (
    <>
      <path d="M60 30V96" />
      <path d={[12, 24, 36].map((r) => `M${60 - r} 30V46A${r} ${r} 0 0 0 ${60 + r} 46V30`).join('')} />
      <path d={[24, 36, 48, 60, 72, 84, 96].map((x) => `M${x - 4} 30H${x + 4}`).join('')} strokeWidth={w * 1.3} />
      <path d={[24, 36, 48, 60, 72, 84, 96].map((x) => `M${x} 26.5C${x - 3} 23 ${x - 1.5} 19 ${x} 15.5C${x + 1.5} 19 ${x + 3} 23 ${x} 26.5Z`).join('')} {...tint(0.3)} strokeWidth={w * 0.8} />
      <path d="M50 96H70L76 104H44Z" {...tint(0.16)} />
      <path d="M38 109H82" />
    </>
  )),

  // The Chi-Rho between alpha and omega, as on early Christian medallions.
  christian: emblem('chi rho', (w) => (
    <>
      <circle cx="60" cy="61" r="49" />
      <circle cx="60" cy="61" r="44.5" strokeWidth={w * 0.7} />
      <path d="M38 38L82 86M82 38L38 86" />
      <path d="M60 22V102M60 22H67C79 22 79 43 67 43H60" />
      <path d="M24 71L31 52L38 71M27 64.5H35" strokeWidth={w * 0.95} />
      <path d="M82 57C80 70 87 72 89 64C91 72 98 70 96 57" strokeWidth={w * 0.95} />
    </>
  )),

  // A ten-fold girih rosette.
  sunni: emblem('girih rosette', (w) => (
    <>
      <path d={GIRIH.outer} {...tint(0.1)} />
      <path d={GIRIH.petals} strokeWidth={w * 0.85} />
      <path d={GIRIH.inner} {...tint(0.2)} />
      <circle cx="60" cy="60" r="55" strokeWidth={w * 0.6} />
    </>
  )),
}
