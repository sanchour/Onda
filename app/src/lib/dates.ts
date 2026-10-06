/* Local-calendar date helpers. Days are stored as 'YYYY-MM-DD' strings in the user's own time zone,
   so a check in on Tuesday evening stays on Tuesday wherever the data syncs to. */

export type DateStr = string // YYYY-MM-DD

let clock: () => Date = () => new Date()
/** Tests and the demo seed pin the clock. */
export function setClock(fn: (() => Date) | null) {
  clock = fn ?? (() => new Date())
}
export const now = () => clock()

const p2 = (n: number) => (n < 10 ? '0' : '') + n

export function toDateStr(d: Date): DateStr {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}
export function fromDateStr(s: DateStr): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}
export const todayStr = (): DateStr => toDateStr(now())

export function addDays(s: DateStr, n: number): DateStr {
  const d = fromDateStr(s)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}
/** Whole days from a to b (b - a). DST-safe: both ends are local midnights compared in UTC. */
export function diffDays(a: DateStr, b: DateStr): number {
  const da = fromDateStr(a)
  const db = fromDateStr(b)
  return Math.round((Date.UTC(db.getFullYear(), db.getMonth(), db.getDate()) - Date.UTC(da.getFullYear(), da.getMonth(), da.getDate())) / 86400000)
}
export const weekday = (s: DateStr) => fromDateStr(s).getDay() // 0 = Sunday

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const

/** "6 Oct 2026" */
export function fmtDate(s: DateStr, locale = 'en-GB'): string {
  return fromDateStr(s).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}
/** "6 October, 2026" as in the Lago detail sheet. */
export function fmtLongDate(s: DateStr): string {
  const d = fromDateStr(s)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`
}
/** "21 Sep" */
export function fmtShortDate(s: DateStr, locale = 'en-GB'): string {
  return fromDateStr(s).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}
/** "Tue, 6 Oct" */
export function fmtDayTitle(s: DateStr, locale = 'en-GB'): string {
  return fromDateStr(s).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
}
/** "9:41AM" */
export function fmtTime(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d
  const h = x.getHours()
  return `${h % 12 || 12}:${p2(x.getMinutes())}${h < 12 ? 'AM' : 'PM'}`
}
/** 'HH:MM' (24h) to "8:00AM" */
export function fmtClock(hhmm: string): string {
  const [h = 0, m = 0] = hhmm.split(':').map(Number)
  return `${h % 12 || 12}:${p2(m)}${h < 12 ? 'AM' : 'PM'}`
}
export function toClock(h12: number, m: number, ap: 'AM' | 'PM'): string {
  const h = (h12 % 12) + (ap === 'PM' ? 12 : 0)
  return `${p2(h)}:${p2(m)}`
}
export function fromClock(hhmm: string): { h: number; m: number; ap: 'AM' | 'PM' } {
  const [h = 0, m = 0] = hhmm.split(':').map(Number)
  return { h: h % 12 || 12, m, ap: h < 12 ? 'AM' : 'PM' }
}

/** Relative "2 min ago" for sync status rows. */
export function fmtAgo(ts: number | null | undefined, t: (k: string, o?: Record<string, unknown>) => string): string {
  if (!ts) return t('common.never')
  const s = Math.max(0, Math.round((now().getTime() - ts) / 1000))
  if (s < 45) return t('common.justNow')
  if (s < 3600) return t('common.minAgo', { count: Math.max(1, Math.round(s / 60)) })
  if (s < 86400) return t('common.hoursAgo', { count: Math.round(s / 3600) })
  return fmtShortDate(toDateStr(new Date(ts)))
}

export function monthGrid(year: number, month: number): { offset: number; days: number } {
  return { offset: new Date(year, month, 1).getDay(), days: new Date(year, month + 1, 0).getDate() }
}
export const dateOf = (year: number, month: number, day: number): DateStr => `${year}-${p2(month + 1)}-${p2(day)}`
