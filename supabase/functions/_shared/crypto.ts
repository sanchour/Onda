// AES-256-GCM for secrets at rest (Notion tokens) and HMAC-signed state for OAuth round trips.
// ENCRYPTION_KEY is 32 random bytes, base64: `openssl rand -base64 32`.
import { env } from './http.ts'

const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const b64url = (b: Uint8Array) => b64(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64url = (s: string) => unb64(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4))

async function aesKey(): Promise<CryptoKey> {
  const raw = unb64(env('ENCRYPTION_KEY'))
  if (raw.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes, base64 encoded')
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

/** Returns "iv.ciphertext", both base64. A fresh random IV per message. */
export async function encrypt(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(), new TextEncoder().encode(plain))
  return `${b64(iv)}.${b64(new Uint8Array(ct))}`
}

export async function decrypt(packed: string): Promise<string> {
  const [iv, ct] = packed.split('.')
  if (!iv || !ct) throw new Error('Malformed ciphertext')
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await aesKey(), unb64(ct))
  return new TextDecoder().decode(pt)
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', unb64(env('ENCRYPTION_KEY')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

/** Sign a small JSON payload for an OAuth `state` parameter. Expires after ten minutes. */
export async function signState(payload: Record<string, unknown>): Promise<string> {
  const body = b64url(new TextEncoder().encode(JSON.stringify({ ...payload, exp: Date.now() + 10 * 60_000 })))
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(), new TextEncoder().encode(body))
  return `${body}.${b64url(new Uint8Array(sig))}`
}

export async function verifyState<T extends Record<string, unknown>>(state: string): Promise<T | null> {
  const [body, sig] = state.split('.')
  if (!body || !sig) return null
  const ok = await crypto.subtle.verify('HMAC', await hmacKey(), unb64url(sig), new TextEncoder().encode(body))
  if (!ok) return null
  const payload = JSON.parse(new TextDecoder().decode(unb64url(body))) as T & { exp: number }
  return payload.exp > Date.now() ? payload : null
}

/** Hex HMAC-SHA256, for verifying Stripe webhook signatures. */
export async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
