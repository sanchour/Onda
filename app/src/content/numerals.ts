/* Numerals in each tradition's own script, used for rule numbers and index badges. Each set is standard Unicode. */

export type NumeralSet = 'latin' | 'roman' | 'kanji' | 'tibetan' | 'devanagari' | 'arabic' | 'greek' | 'gurmukhi' | 'thai' | 'persian' | 'hebrew' | 'khmer'

const DIGITS: Record<'tibetan' | 'devanagari' | 'arabic' | 'gurmukhi' | 'thai' | 'persian' | 'khmer', string> = {
  gurmukhi: '੦੧੨੩੪੫੬੭੮੯',
  thai: '๐๑๒๓๔๕๖๗๘๙',
  khmer: '០១២៣៤៥៦៧៨៩',
  persian: '۰۱۲۳۴۵۶۷۸۹',
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

const HEBREW_UNITS = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']
const HEBREW_TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ']
/** Hebrew letter numerals. 15 and 16 are written 9+6 and 9+7, as is the custom. */
const hebrew = (n: number) => (n === 15 ? 'טו' : n === 16 ? 'טז' : HEBREW_TENS[Math.floor(n / 10)]! + HEBREW_UNITS[n % 10]!)

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
    case 'hebrew':
      return hebrew(n)
    case 'gurmukhi':
    case 'thai':
    case 'persian':
    case 'tibetan':
    case 'devanagari':
    case 'arabic':
      return String(n).replace(/\d/g, (d) => DIGITS[set][Number(d)]!)
    default:
      return String(n)
  }
}
