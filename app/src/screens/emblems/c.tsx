import type { ReactNode } from 'react'
import type { Emblem, EmblemMap, EmblemProps } from './kit'

/* Cover emblems, part C (7.2): Dostoevsky, Adler, Burgundy, Goethe, Machiavelli and Postmodernism.
   Same contract as parts A and B: a 120 unit grid in currentColor, quiet tints only. */

const f = (n: number) => Math.round(n * 10) / 10
const polar = (r: number, deg: number, cx = 60, cy = 60): [number, number] => {
  const a = (deg * Math.PI) / 180
  return [f(cx + r * Math.sin(a)), f(cy - r * Math.cos(a))]
}
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

// Goethe's colour circle: six segments in rising tints, the two triangles of complementary colours inside.
const RING = range(6).map((k) => {
  const [x0, y0] = polar(44, k * 60 - 30)
  const [x1, y1] = polar(44, k * 60 + 30)
  const [x2, y2] = polar(22, k * 60 + 30)
  const [x3, y3] = polar(22, k * 60 - 30)
  return `M${x0} ${y0}A44 44 0 0 1 ${x1} ${y1}L${x2} ${y2}A22 22 0 0 0 ${x3} ${y3}Z`
})
const tri = (start: number) => `M${range(3).map((k) => polar(22, start + k * 120).join(' ')).join('L')}Z`

export const EMBLEMS_C: EmblemMap = {
  // The lampada: an icon lamp of red glass in a metal cup, on three chains under a three-barred cross.
  dostoevsky: emblem('icon lamp', (w) => (
    <>
      <path d="M60 6V24M55 10.5H65M51.5 15H68.5M55.5 21.5L64.5 18.5" strokeWidth={w * 0.9} />
      <circle cx="60" cy="27" r="3" />
      <path d="M58.6 29.6L37 61M61.4 29.6L83 61M60 30V58" strokeDasharray="2.2 2.6" strokeWidth={w * 0.8} />
      <ellipse cx="60" cy="62" rx="23" ry="4" {...tint(0.12)} />
      <path d="M37 62C37 80 47 90 60 90C73 90 83 80 83 62" {...tint(0.18)} />
      <path d="M42 72C50 76 70 76 78 72M46 81C53 84 67 84 74 81" strokeWidth={w * 0.6} />
      <path d="M60 90V97" />
      <circle cx="60" cy="100.5" r="3.5" {...tint(0.2)} />
      <path d="M60 41C65 48 66 54 60 59C54 54 55 48 60 41Z" {...tint(0.42)} />
      <path d="M60 49C62 52 62 55 60 57C58 55 58 52 60 49Z" {...tint(0.3)} strokeWidth={w * 0.6} />
    </>
  )),

  // Gemeinschaftsgefühl: six people hand in hand around a shared light.
  adler: emblem('ring of people', (w) => (
    <>
      <circle cx="60" cy="60" r="31" strokeWidth={w * 0.9} />
      {range(6).map((k) => {
        const [hx, hy] = polar(43, k * 60)
        const [ax, ay] = polar(36, k * 60)
        const [bx, by] = polar(24, k * 60)
        return (
          <g key={k}>
            <circle cx={hx} cy={hy} r="6" {...tint(0.18)} />
            <path d={`M${ax} ${ay}L${bx} ${by}`} strokeWidth={w * 1.1} />
          </g>
        )
      })}
      <circle cx="60" cy="60" r="8" {...tint(0.3)} />
      {range(8).map((k) => {
        const [x0, y0] = polar(12, k * 45 + 22.5)
        const [x1, y1] = polar(17, k * 45 + 22.5)
        return <path key={k} d={`M${x0} ${y0}L${x1} ${y1}`} strokeWidth={w * 0.6} />
      })}
    </>
  )),

  // The Golden Fleece: the ram hung by a band from a collar of firesteels striking sparks.
  burgundy: emblem('golden fleece', (w) => (
    <>
      <path d="M12 26C30 42 90 42 108 26" strokeWidth={w * 0.8} />
      {[22, 41, 60, 79, 98].map((x, k) => {
        const y = k === 2 ? 37.5 : k === 1 || k === 3 ? 35.6 : 31
        return <path key={x} d={`M${x - 5} ${y - 4}H${x + 1}A3 3 0 0 1 ${x + 1} ${y + 2}H${x - 5}M${x - 5} ${y + 2}H${x + 2}A3 3 0 0 1 ${x + 2} ${y + 8}H${x - 5}Z`} {...tint(0.16)} strokeWidth={w * 0.75} />
      })}
      <path d="M31 30L33 25M50 33L51 28M69 33L69 28M88 30L87 25" strokeWidth={w * 0.6} />
      <path d="M60 46V56" />
      <circle cx="60" cy="50" r="3.2" />
      <path d="M34 72C34 64 46 60 60 60C76 60 88 64 88 72C88 80 78 84 60 84C46 84 34 80 34 72Z" {...tint(0.2)} />
      <path d="M34 72C30 74 26 80 24 88C27 92 32 91 34 86C35 83 35 78 37 76" {...tint(0.2)} />
      <path d="M26 82C24 81 22 82 22 84M30 84C31 86 30 89 28 90" strokeWidth={w * 0.6} />
      <path d="M44 83V98M52 84V100M70 84V100M78 83V98" strokeWidth={w * 0.9} />
      <path d="M55 60C53 66 53 78 55 84M65 60C67 66 67 78 65 84" strokeWidth={w * 1.1} />
      <path d="M41 68c2-2 4-2 6 0M47 75c2-2 4-2 6 0M70 66c2-2 4-2 6 0M74 74c2-2 4-2 6 0M80 69c2-2 4-2 6 0" strokeWidth={w * 0.55} />
    </>
  )),

  // The Farbenkreis, 1809: the colour circle with its complementary triangles.
  goethe: emblem('colour circle', (w) => (
    <>
      {RING.map((d, k) => <path key={k} d={d} {...tint(0.06 + k * 0.05)} strokeWidth={w * 0.8} />)}
      <circle cx="60" cy="60" r="50" strokeWidth={w * 0.6} />
      <path d={tri(0)} {...tint(0.1)} />
      <path d={tri(60)} />
      <circle cx="60" cy="60" r="3" {...tint(0.4)} />
    </>
  )),

  // The fox of The Prince, chapter 18: one must be a fox to know the snares, in a Florentine roundel.
  machiavelli: emblem('fox', (w) => (
    <>
      <circle cx="60" cy="60" r="53" strokeWidth={w * 0.6} />
      <circle cx="60" cy="60" r="49" strokeDasharray="0.1 4.2" strokeWidth={w * 1.4} />
      <path d="M60 97L44 80C36 72 31 60 31 47L27 20L47 34C51 32.5 56 31.5 60 31.5C64 31.5 69 32.5 73 34L93 20L89 47C89 60 84 72 76 80Z" {...tint(0.14)} />
      <path d="M32 27L43 36M88 27L77 36" strokeWidth={w * 0.8} />
      <path d="M37 57C45 63 52 67 60 67C68 67 75 63 83 57C80 68 72 78 60 82C48 78 40 68 37 57Z" {...tint(0.12)} strokeWidth={w * 0.7} />
      <path d="M45 51L53 54M75 51L67 54" strokeWidth={w * 1.2} />
      <path d="M60 67V86" strokeWidth={w * 0.6} />
      <path d="M56 88H64L60 93Z" {...tint(0.5)} />
    </>
  )),

  // Philip Johnson's AT&T Building, New York, 1984: a granite tower crowned with a broken Chippendale pediment.
  postmodern: emblem('chippendale tower', (w) => (
    <>
      <path d="M34 36L54 20A6 6 0 0 0 66 20L86 36Z" {...tint(0.16)} />
      <path d="M38 36H82V104H38Z" {...tint(0.06)} />
      <path d="M45 42V86M52.5 42V86M60 42V86M67.5 42V86M75 42V86" strokeWidth={w * 0.6} />
      <path d="M38 88H82" strokeWidth={w * 0.8} />
      <path d="M52 104V94A8 8 0 0 1 68 94V104" {...tint(0.2)} />
      <path d="M42 104V96A3 3 0 0 1 48 96V104M72 104V96A3 3 0 0 1 78 96V104" strokeWidth={w * 0.8} />
      <path d="M24 104H96" />
      <circle cx="60" cy="27" r="1.6" {...tint(0.5)} />
    </>
  )),
}
