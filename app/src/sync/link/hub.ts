import { hash53, randomBytes, hex, type Bytes } from './bytes'
import { MqttConnection, type Will } from './mqtt'

/* The relays. Three free public MQTT brokers, all at once: every message goes to each one that is connected and
   arrives from whichever is fastest, and copies are dropped. Any one broker being down changes nothing. They only
   ever carry ciphertext (crypto.ts). Retained messages are how a device that was away catches up. */

export const BROKERS = ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt', 'wss://test.mosquitto.org:8081/mqtt']

export type BusStatus = 'connecting' | 'live' | 'offline'

export interface BusOptions {
  will?: Will
  onMessage: (topic: string, payload: Bytes) => void
  onStatus?: (s: BusStatus) => void
  /** A relay connected (again): subscriptions and retained publishes have been sent to it. */
  onUp?: () => void
}

/** What the link engine needs from a transport. Tests plug in an in-memory broker instead. */
export interface Bus {
  subscribe(filter: string): void
  unsubscribe(filter: string): void
  publish(topic: string, payload: Uint8Array, retain?: boolean): void
  /** Resolves once every connected relay has received what was sent before. */
  flush(timeoutMs?: number): Promise<void>
  /** Clean disconnect (the will is discarded). The bus cannot be used afterwards. */
  close(): void
  status(): BusStatus
}
export type BusFactory = (o: BusOptions) => Bus

interface Slot {
  url: string
  conn: MqttConnection | null
  attempts: number
  failed: boolean
  timer: ReturnType<typeof setTimeout> | null
}

const KEEPALIVE = 30
const SEEN_MAX = 4000

export function mqttBus(o: BusOptions, cfg: { brokers?: string[]; WebSocket?: typeof WebSocket } = {}): Bus {
  const filters = new Set<string>()
  // Our own retained messages, kept so a relay that comes back (or was down when we published) gets them too.
  const retained = new Map<string, Uint8Array>()
  const seen = new Map<string, true>()
  let closed = false
  let last: BusStatus | null = null

  const slots: Slot[] = (cfg.brokers ?? BROKERS).map((url) => ({ url, conn: null, attempts: 0, failed: false, timer: null }))

  const status = (): BusStatus => {
    if (slots.some((s) => s.conn?.up)) return 'live'
    if ((typeof navigator !== 'undefined' && navigator.onLine === false) || slots.every((s) => s.failed)) return 'offline'
    return 'connecting'
  }
  const report = () => {
    if (closed) return
    const s = status()
    if (s !== last) {
      last = s
      o.onStatus?.(s)
    }
  }

  /** Each relay delivers every message once; a copy of the same bytes from another relay is dropped.
   *  Empty payloads (deletions) carry nothing to merge, so they always pass. */
  const fresh = (topic: string, payload: Bytes) => {
    if (!payload.length) return true
    const k = `${topic}|${payload.length}|${hash53(payload)}`
    if (seen.has(k)) return false
    seen.set(k, true)
    if (seen.size > SEEN_MAX) seen.delete(seen.keys().next().value!)
    return true
  }

  function connect(s: Slot) {
    if (closed || s.conn) return
    if (s.timer) clearTimeout(s.timer)
    s.timer = null
    const conn = new MqttConnection({
      url: s.url,
      clientId: `onda-${hex(randomBytes(9))}`,
      keepalive: KEEPALIVE,
      will: o.will,
      WebSocket: cfg.WebSocket,
      onUp: () => {
        s.attempts = 0
        s.failed = false
        conn.subscribe([...filters])
        for (const [t, p] of retained) conn.publish(t, p, true)
        report()
        o.onUp?.()
      },
      onDown: () => {
        if (s.conn === conn) s.conn = null
        s.failed = true
        report()
        retry(s)
      },
      onPublish: (topic, payload) => {
        if (!closed && fresh(topic, payload)) o.onMessage(topic, payload)
      },
    })
    s.conn = conn
    conn.open()
  }

  /** Back off 1s, 2s, 4s ... up to 30s, with jitter so three relays and many devices do not retry in step. */
  function retry(s: Slot) {
    if (closed || s.timer) return
    const base = Math.min(30_000, 1000 * 2 ** s.attempts)
    s.attempts++
    s.timer = setTimeout(() => {
      s.timer = null
      connect(s)
    }, base * (0.6 + Math.random() * 0.4))
  }

  /** Back online or back in front: try every relay that is down now, and check that the open ones still answer
   *  (iOS suspends sockets in the background and can hand back one that looks open but is dead). */
  function wake() {
    if (closed) return
    for (const s of slots) {
      if (!s.conn) {
        s.attempts = 0
        connect(s)
      } else if (s.conn.up) {
        const c = s.conn
        void c.ping(5000).then((ok) => !ok && c.kill())
      }
    }
  }
  const onVisible = () => document.visibilityState === 'visible' && wake()
  const onOffline = () => report()
  if (typeof window !== 'undefined') {
    window.addEventListener('online', wake)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisible)
  }
  // Keepalive: a ping every 15s keeps the broker from timing us out, and a missing answer means a dead socket.
  const beat = setInterval(() => {
    for (const s of slots) {
      const c = s.conn
      if (c?.up) void c.ping(10_000).then((ok) => !ok && !closed && c.kill())
    }
  }, (KEEPALIVE / 2) * 1000)

  for (const s of slots) connect(s)
  report()

  return {
    subscribe(f) {
      filters.add(f)
      for (const s of slots) s.conn?.subscribe([f])
    },
    unsubscribe(f) {
      filters.delete(f)
      for (const s of slots) s.conn?.unsubscribe([f])
    },
    publish(topic, payload, retain = false) {
      if (retain) {
        // an empty retained publish deletes the retained message; remember it so late relays are cleared too
        retained.set(topic, payload)
      }
      for (const s of slots) s.conn?.publish(topic, payload, retain)
    },
    async flush(timeoutMs = 3000) {
      await Promise.all(slots.map((s) => s.conn?.ping(timeoutMs)))
    },
    close() {
      if (closed) return
      closed = true
      clearInterval(beat)
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', wake)
        window.removeEventListener('offline', onOffline)
        document.removeEventListener('visibilitychange', onVisible)
      }
      for (const s of slots) {
        if (s.timer) clearTimeout(s.timer)
        s.timer = null
        s.conn?.end()
        s.conn = null
      }
    },
    status,
  }
}
