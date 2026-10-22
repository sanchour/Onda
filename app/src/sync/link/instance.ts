import { db, getMeta, setMeta } from '@/data/db'
import { onLocalWrite, useStore } from '@/data/store'
import { thisDevice } from './device'
import { LinkEngine } from './engine'
import { mqttBus } from './hub'
import { linkState } from './state'

/* The one engine for this app, wired to the real store, IndexedDB and the public relays. Loaded only when this device
   is linked or starts to pair (state.ts), so a device that never links never fetches it. */

let engine: LinkEngine | null = null

export function linkEngine(): LinkEngine {
  engine ??= new LinkEngine({
    store: useStore,
    onLocalWrite,
    meta: { get: getMeta, set: setMeta, del: (key) => db.meta.delete(key) },
    bus: (o) => mqttBus(o),
    state: linkState,
    device: thisDevice(),
  })
  return engine
}
