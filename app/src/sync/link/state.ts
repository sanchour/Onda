import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { DeviceKind } from './device'

/* What the screens see of device linking. Small and dependency free so it can load with any screen; the engine
   (engine.ts, the relays and the crypto) is fetched only when this device is linked or starts to pair. */

export type LinkStatus = 'off' | 'connecting' | 'live' | 'offline'
export type LinkError = 'invalid' | 'noOffer' | 'noAnswer' | 'offline' | 'failed'

export interface LinkedDevice {
  tag: string
  name: string
  kind: DeviceKind
  online: boolean
  /** Last time we heard from it (ms); for this device, the last sync. */
  lastSeen: number
  me: boolean
}

export type Pairing =
  | { mode: 'show'; code: string; expiresAt: number; state: 'waiting' | 'linked' | 'expired' | 'error'; peer?: string; message?: LinkError }
  | { mode: 'enter'; state: 'idle' | 'working' | 'linked' | 'error'; peer?: string; message?: LinkError }

export interface LinkState {
  status: LinkStatus
  linked: boolean
  devices: LinkedDevice[]
  lastSyncAt: number | null
  pairing: Pairing | null
}

export const initialLinkState = (): LinkState => ({ status: 'off', linked: false, devices: [], lastSyncAt: null, pairing: null })

export const linkState: StoreApi<LinkState> = createStore<LinkState>()(initialLinkState)
export const useLinkState = <T>(pick: (s: LinkState) => T): T => useStore(linkState, pick)

const engine = () => import('./instance').then((m) => m.linkEngine())
const run = (f: (e: Awaited<ReturnType<typeof engine>>) => Promise<unknown> | void) =>
  void engine()
    .then(f)
    .catch((e) => console.error('[onda] link', e))

export const startShowCode = () => run((e) => e.startShowCode())
export const enterCode = (code: string) => run((e) => e.enterCode(code))
export const cancelPairing = () => run((e) => e.cancelPairing())
/** Ready the enter-a-code form again after an error. */
export const resetPairing = () => linkState.setState({ pairing: null })
export const unlinkDevice = () => engine().then((e) => e.unlink())

// development builds: let a test script read the link state from the page
if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __ondaLink: typeof linkState }).__ondaLink = linkState
