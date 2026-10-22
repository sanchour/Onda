/* Fuzzy matching for the command palette. Every word of the query has to be found in a field, either as a run of
   letters or as letters in order; runs, word starts and early positions score higher, and scattered matches are
   dropped. Accents and case are ignored ("cafe" finds "Café"). Returns the matched positions for highlighting. */

export interface Field {
  text: string
  /** Score multiplier: the title counts fully, a subtitle less, hidden search words least. */
  weight: number
  /** Positions are reported for highlighting. */
  show?: boolean
}

export interface Hit {
  score: number
  /** Matched character positions per field index (only for fields with `show`). */
  marks: Map<number, number[]>
}

interface Prepared {
  norm: string
  starts: boolean[]
}

const cache = new Map<string, Prepared>()

/** Lower case with accents folded, one output character per input code unit so positions line up. */
function prepare(s: string): Prepared {
  const hit = cache.get(s)
  if (hit) return hit
  let norm = ''
  const starts: boolean[] = []
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!
    const f = ch.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    norm += f.length === 1 ? f : ch.toLowerCase().charAt(0) || ch
    const prev = s[i - 1]
    starts.push(i === 0 || !/[\p{L}\p{N}]/u.test(prev!) || (/\p{Ll}/u.test(prev!) && /\p{Lu}/u.test(ch)))
  }
  const p = { norm, starts }
  if (cache.size > 4000) cache.clear()
  cache.set(s, p)
  return p
}

export const normQuery = (q: string) => prepare(q.trim()).norm.split(/\s+/).filter(Boolean)

function range(from: number, n: number) {
  return Array.from({ length: n }, (_, i) => from + i)
}

/** One query word against one field. */
function matchWord(w: string, f: Prepared): { score: number; idx: number[] } | null {
  const s = f.norm
  let best: { score: number; idx: number[] } | null = null
  // a run of letters: best at the start of the field, then at the start of a word
  for (let at = s.indexOf(w); at !== -1; at = s.indexOf(w, at + 1)) {
    const score = 100 + w.length * 8 + (f.starts[at] ? 45 : 0) + (at === 0 ? 30 : 0) - Math.min(at, 40) * 0.6
    if (!best || score > best.score) best = { score, idx: range(at, w.length) }
  }
  if (best) return best
  // single letters only match a word start (as a run, above), or every letter would match everything
  if (w.length < 2) return null
  // letters in order, tried from every place the first one appears
  for (let start = s.indexOf(w[0]!); start !== -1; start = s.indexOf(w[0]!, start + 1)) {
    const idx = [start]
    let score = f.starts[start] ? 30 : 0
    let pos = start
    for (let j = 1; j < w.length; j++) {
      const ch = w[j]!
      // prefer the next word that starts with this letter when it comes soon, else the next occurrence
      let next = s.indexOf(ch, pos + 1)
      if (next === -1) {
        idx.length = 0
        break
      }
      if (next !== pos + 1) {
        for (let k = next; k < s.length && k < next + 12; k++) {
          if (s[k] === ch && f.starts[k]) {
            next = k
            break
          }
        }
      }
      score += 10 + (next === pos + 1 ? 16 : 0) + (f.starts[next] ? 18 : 0) - Math.min(next - pos - 1, 12) * 1.5
      idx.push(next)
      pos = next
    }
    if (idx.length !== w.length) continue
    // too scattered to mean anything
    if (idx[idx.length - 1]! - idx[0]! + 1 > w.length * 3 + 5) continue
    score -= Math.min(start, 40) * 0.4
    if (!best || score > best.score) best = { score, idx }
  }
  return best
}

/** Score `fields` against the query words; null when a word is not found. */
export function match(words: string[], fields: Field[]): Hit | null {
  if (!words.length) return { score: 0, marks: new Map() }
  const prepared = fields.map((f) => prepare(f.text))
  const marks = new Map<number, number[]>()
  let total = 0
  let inTitle = 0
  for (const w of words) {
    let best: { score: number; idx: number[]; field: number } | null = null
    for (let i = 0; i < prepared.length; i++) {
      const m = matchWord(w, prepared[i]!)
      if (!m) continue
      const score = m.score * fields[i]!.weight
      if (!best || score > best.score) best = { score, idx: m.idx, field: i }
    }
    if (!best) return null
    total += best.score
    if (best.field === 0) inTitle++
    if (fields[best.field]!.show) marks.set(best.field, [...(marks.get(best.field) ?? []), ...best.idx])
  }
  // the whole query is the title, or begins it
  const title = prepared[0]?.norm ?? ''
  const q = words.join(' ')
  if (title === q) total += 80
  else if (title.startsWith(q)) total += 40
  if (inTitle === words.length) total += 20
  return { score: total, marks }
}
