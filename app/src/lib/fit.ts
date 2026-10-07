/* Fit a title to its box without measuring the DOM: the longest word decides the size, so one long word
   ("Transcendentalism") never spills out of a tile while short names keep the full display size. */

/** Average advance of a display serif, in em per character (a little generous so it errs towards fitting). */
const EM_PER_CHAR = 0.62

/** The largest font size, between `min` and `max` px, at which the longest word of `text` fits `width` px. */
export function fitSize(text: string, width: number, max: number, min = 13, wide = false): number {
  const longest = text.split(/\s+/).reduce((m, w) => Math.max(m, w.length), 1)
  const size = Math.floor(width / (longest * (wide ? EM_PER_CHAR + 0.16 : EM_PER_CHAR)))
  return Math.max(min, Math.min(max, size))
}

/** Usable width of the app column on this device (the shell never grows past a phone width). */
export const columnWidth = () => Math.min(typeof window === 'undefined' ? 390 : window.innerWidth, 430)
