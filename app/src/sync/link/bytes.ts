/* Byte helpers for device linking: text, hex and base64, and a fast non-cryptographic hash for duplicate checks. */

export type Bytes = Uint8Array<ArrayBuffer>

const te = new TextEncoder()
const td = new TextDecoder()

export const utf8 = (s: string): Bytes => te.encode(s) as Bytes
export const text = (b: Uint8Array): string => td.decode(b)
export const EMPTY: Bytes = new Uint8Array(0)

export function concat(...parts: Uint8Array[]): Bytes {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}

export function randomBytes(n: number): Bytes {
  const b = new Uint8Array(n)
  crypto.getRandomValues(b)
  return b
}

export const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')

export function b64(b: Uint8Array): string {
  let s = ''
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000))
  return btoa(s)
}
export function fromB64(s: string): Bytes {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** cyrb53: 53 bits, fast, good spread. Only used to recognise the same message arriving from several relays. */
export function hash53(b: Uint8Array): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < b.length; i++) {
    const c = b[i]!
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}
