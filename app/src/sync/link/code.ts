/* Pairing codes: eight characters from an alphabet without look-alikes (no 0, O, 1, I), shown as XXXX-XXXX.
   32 symbols, so a code holds 40 bits and each byte of randomness maps to one symbol without bias. */

export const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
export const CODE_LEN = 8
/** How long a shown code works. */
export const CODE_TTL = 10 * 60_000

export function newCode(): string {
  const b = new Uint8Array(CODE_LEN)
  crypto.getRandomValues(b)
  return Array.from(b, (x) => CODE_ALPHABET[x & 31]).join('')
}

/** What someone typed or pasted, cleaned for the code boxes: capitals, alphabet characters only, at most eight. */
export function codeChars(input: string): string {
  let out = ''
  for (const ch of input.toUpperCase()) {
    if (CODE_ALPHABET.includes(ch)) out += ch
    if (out.length === CODE_LEN) break
  }
  return out
}

/** A typed code as the protocol uses it, or null. Case does not matter; spaces and dashes are ignored. */
export function normalizeCode(input: string): string | null {
  const s = input.toUpperCase().replace(/[\s\-‐-―]/g, '')
  if (s.length !== CODE_LEN) return null
  for (const ch of s) if (!CODE_ALPHABET.includes(ch)) return null
  return s
}

export const formatCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`
