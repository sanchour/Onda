import { getMeta, setMeta } from '@/data/db'

/* Face ID Lock. A PWA cannot call LocalAuthentication, but WebAuthn with a platform authenticator and
   userVerification: 'required' shows the same Face ID / Touch ID / passcode sheet. The credential is checked
   on the device only: this is a privacy screen for someone holding your unlocked phone, not encryption. */

const rand = (n: number) => crypto.getRandomValues(new Uint8Array(n))
const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

export async function lockSupported(): Promise<boolean> {
  try {
    return !!window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
  } catch {
    return false
  }
}

/** Register a device credential. Resolves false if the user cancels. */
export async function enableLock(): Promise<boolean> {
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: rand(32),
        rp: { name: 'Onda' },
        user: { id: rand(16), name: 'onda', displayName: 'Onda' },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
        timeout: 60_000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null
    if (!cred) return false
    await setMeta('lockCredential', b64(cred.rawId))
    return true
  } catch {
    return false
  }
}

export async function disableLock() {
  await setMeta('lockCredential', null)
}

/** Show the system Face ID sheet. Resolves true once the user is verified. */
export async function unlock(): Promise<boolean> {
  const id = await getMeta<string | null>('lockCredential')
  if (!id) return true
  try {
    const res = await navigator.credentials.get({
      publicKey: { challenge: rand(32), allowCredentials: [{ type: 'public-key', id: unb64(id), transports: ['internal'] }], userVerification: 'required', timeout: 60_000 },
    })
    return !!res
  } catch {
    return false
  }
}
