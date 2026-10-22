import { concat, hex, randomBytes, text, utf8, type Bytes } from './bytes'

/* End-to-end encryption for linked devices, WebCrypto only. Linked devices share one 32-byte group secret S. From S
   come an AES-GCM key and the topic the group talks on, so a relay sees an opaque topic and ciphertext, nothing else.
   A payload is [version][flags][12-byte IV][AES-GCM ciphertext]; the two header bytes are authenticated too.
   Pairing derives a key from the short code (PBKDF2, slow on purpose) and then agrees a fresh key by ECDH. */

const subtle = () => globalThis.crypto.subtle
const VERSION = 1
const GZIP = 1

export async function hkdf(ikm: Uint8Array, info: string, bytes: number): Promise<Bytes> {
  const k = await subtle().importKey('raw', ikm as Bytes, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await subtle().deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: utf8(info) }, k, bytes * 8))
}
const aesKey = (raw: Bytes) => subtle().importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])

export const newSecret = (): Bytes => randomBytes(32)

export interface GroupKeys {
  key: CryptoKey
  /** 16 bytes as hex: the group's topic under onda/v1/. */
  topic: string
}
export async function groupKeys(secret: Uint8Array): Promise<GroupKeys> {
  const [k, t] = await Promise.all([hkdf(secret, 'onda-link/v1/enc', 32), hkdf(secret, 'onda-link/v1/topic', 16)])
  return { key: await aesKey(k), topic: hex(t) }
}

/** How a device appears in topics: never its id, only a short hash of it. */
export async function deviceTag(deviceId: string): Promise<string> {
  return hex(new Uint8Array(await subtle().digest('SHA-256', utf8(deviceId))).subarray(0, 12))
}

/* ── Compression: gzip where the browser has it (Safari before iOS 16.4 does not) ── */

export const canGzip = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'

async function pipe(data: Bytes, t: CompressionStream | DecompressionStream): Promise<Bytes> {
  const stream = new Blob([data]).stream().pipeThrough(t as unknown as ReadableWritablePair<Uint8Array, Uint8Array>)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/* ── Sealing ─────────────────────────────────────────────── */

export async function seal(key: CryptoKey, plain: Bytes, gzip: boolean): Promise<Bytes> {
  let body = plain
  let flags = 0
  if (gzip && canGzip()) {
    const z = await pipe(plain, new CompressionStream('gzip'))
    if (z.length < plain.length) {
      body = z
      flags |= GZIP
    }
  }
  const head = Uint8Array.of(VERSION, flags)
  const iv = randomBytes(12)
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: head }, key, body))
  return concat(head, iv, ct)
}

/** Decrypt a sealed payload. Throws when the key is wrong, the bytes were changed, or the format is unknown. */
export async function open(key: CryptoKey, payload: Uint8Array): Promise<Bytes> {
  if (payload.length < 14 + 16 || payload[0] !== VERSION) throw new Error('link: unknown payload')
  const head = payload.slice(0, 2)
  const iv = payload.slice(2, 14)
  const body = new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv, additionalData: head }, key, payload.slice(14)))
  if (!(head[1]! & GZIP)) return body
  if (!canGzip()) throw new Error('link: gzip unsupported')
  return pipe(body, new DecompressionStream('gzip'))
}

export const sealJson = (key: CryptoKey, value: unknown, gzip = false) => seal(key, utf8(JSON.stringify(value)), gzip)
export async function openJson<T>(key: CryptoKey, payload: Uint8Array): Promise<T> {
  return JSON.parse(text(await open(key, payload))) as T
}

/* ── Pairing ─────────────────────────────────────────────── */

export const PAIR_ITERATIONS = 200_000

export interface CodeKeys {
  /** PBKDF2 output, mixed into the final pairing key so the ECDH step alone is not enough. */
  kc: Bytes
  key: CryptoKey
  /** Full topic: onda/v1/pair/<16 bytes hex>. */
  topic: string
}
/** Keys from a normalised pairing code. Slow on purpose: guessing codes offline costs 200,000 hashes each. */
export async function codeKeys(code: string, iterations = PAIR_ITERATIONS): Promise<CodeKeys> {
  const base = await subtle().importKey('raw', utf8(code), 'PBKDF2', false, ['deriveBits'])
  const kc = new Uint8Array(await subtle().deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: utf8('onda-link/v1/pair'), iterations }, base, 256))
  const [k, t] = await Promise.all([hkdf(kc, 'onda-link/v1/pair-key', 32), hkdf(kc, 'onda-link/v1/pair-topic', 16)])
  return { kc, key: await aesKey(k), topic: `onda/v1/pair/${hex(t)}` }
}

const ECDH = { name: 'ECDH', namedCurve: 'P-256' } as const

export async function ecdhPair(): Promise<{ priv: CryptoKey; pub: Bytes }> {
  const kp = await subtle().generateKey(ECDH, false, ['deriveBits'])
  return { priv: kp.privateKey, pub: new Uint8Array(await subtle().exportKey('raw', kp.publicKey)) }
}

/** The key the group secret travels under: ECDH of the two devices' fresh keys, bound to the code. */
export async function grantKey(priv: CryptoKey, theirPub: Uint8Array, kc: Bytes): Promise<CryptoKey> {
  const pub = await subtle().importKey('raw', theirPub as Bytes, ECDH, false, [])
  const z = new Uint8Array(await subtle().deriveBits({ name: 'ECDH', public: pub }, priv, 256))
  return aesKey(await hkdf(concat(z, kc), 'onda-link/v1/pair-grant', 32))
}
