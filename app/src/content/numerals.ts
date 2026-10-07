/* Numerals in each tradition's own script, used for rule numbers and index badges. Each set is standard Unicode. */

export type NumeralSet = 'latin' | 'roman' | 'kanji' | 'tibetan' | 'devanagari' | 'arabic' | 'greek'

const DIGITS: Record<'tibetan' | 'devanagari' | 'arabic', string> = {
  tibetan: '༠༡༢༣༤༥༦༧༨༩',
  devanagari: '०१२३४५६७८९',
  arabic: '٠١٢٣٤٥٦٧٨٩',
}

const KANJI = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']

function roman(n: number): string {
  const map: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  let out = ''
  let rest = n
  for (const [v, s] of map) {
    while (rest >= v) {
      out += s
      rest -= v
    }
  }
  return out
}

function kanji(n: number): string {
  if (n < 10) return KANJI[n]!
  const tens = Math.floor(n / 10)
  const ones = n % 10
  return (tens > 1 ? KANJI[tens]! : '') + '十' + KANJI[ones]!
}

const GREEK_UNITS = ['', 'α', 'β', 'γ', 'δ', 'ε', 'ϛ', 'ζ', 'η', 'θ']
const GREEK_TENS = ['', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ϟ']
/** Greek alphabetic numerals, marked with the keraia (ʹ) as in ancient use. */
const greek = (n: number) => GREEK_TENS[Math.floor(n / 10)]! + GREEK_UNITS[n % 10]! + 'ʹ'

/** Format a small positive integer (1..99) in the given numeral set. */
export function numeral(set: NumeralSet, n: number): string {
  if (n < 1 || n > 99 || !Number.isInteger(n)) return String(n)
  switch (set) {
    case 'roman':
      return roman(n)
    case 'kanji':
      return kanji(n)
    case 'greek':
      return greek(n)
    case 'tibetan':
    case 'devanagari':
    case 'arabic':
      return String(n).replace(/\d/g, (d) => DIGITS[set][Number(d)]!)
    default:
      return String(n)
  }
}
