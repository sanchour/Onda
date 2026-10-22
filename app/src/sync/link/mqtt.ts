import { concat, utf8, text, type Bytes } from './bytes'

/* A minimal MQTT 3.1.1 client over WebSocket, with only what device linking needs: QoS 0 publish and subscribe,
   retained messages, a Last Will, keepalive pings and a clean disconnect. MQTT travels in binary WebSocket frames,
   and a frame can carry part of a packet or several packets, so incoming bytes are buffered and cut by length. */

export interface Will {
  topic: string
  payload: Uint8Array
  retain: boolean
}

export type Packet =
  | { type: 'connack'; rc: number }
  | { type: 'publish'; topic: string; payload: Bytes; retain: boolean; qos: number; id?: number }
  | { type: 'suback'; id: number; codes: number[] }
  | { type: 'pingresp' }
  | { type: 'other'; code: number }

/* ── Encoding ─────────────────────────────────────────────── */

const u16 = (n: number) => Uint8Array.of((n >> 8) & 0xff, n & 0xff)
const str = (s: string) => {
  const b = utf8(s)
  return concat(u16(b.length), b)
}
/** Remaining length: 7 bits per byte, high bit set while more follow. */
function varint(n: number): Bytes {
  const out: number[] = []
  do {
    let b = n % 128
    n = Math.floor(n / 128)
    if (n > 0) b |= 0x80
    out.push(b)
  } while (n > 0)
  return Uint8Array.from(out)
}
const packet = (first: number, ...body: Uint8Array[]) => {
  const b = concat(...body)
  return concat(Uint8Array.of(first), varint(b.length), b)
}

export function connectPacket(o: { clientId: string; keepalive: number; will?: Will }): Bytes {
  // clean session always: nothing is queued for us while we are away, retained messages carry the state instead
  let flags = 0x02
  if (o.will) flags |= 0x04 | (o.will.retain ? 0x20 : 0)
  const head = concat(str('MQTT'), Uint8Array.of(4, flags), u16(o.keepalive))
  const will = o.will ? [str(o.will.topic), u16(o.will.payload.length), o.will.payload] : []
  return packet(0x10, head, str(o.clientId), ...will)
}
export const publishPacket = (topic: string, payload: Uint8Array, retain: boolean) => packet(0x30 | (retain ? 1 : 0), str(topic), payload)
export const subscribePacket = (id: number, filters: string[]) => packet(0x82, u16(id), ...filters.map((f) => concat(str(f), Uint8Array.of(0))))
export const unsubscribePacket = (id: number, filters: string[]) => packet(0xa2, u16(id), ...filters.map(str))
export const pubackPacket = (id: number) => packet(0x40, u16(id))
export const PINGREQ = Uint8Array.of(0xc0, 0)
export const DISCONNECT = Uint8Array.of(0xe0, 0)

/* ── Decoding ─────────────────────────────────────────────── */

/** Largest packet we accept: a few snapshot chunks of 64KB fit many times over. */
const MAX_PACKET = 4 * 1024 * 1024

export class PacketReader {
  private buf: Bytes = new Uint8Array(0)

  /** Add bytes from one WebSocket message; returns every packet now complete. Throws on a malformed stream. */
  push(chunk: Uint8Array): Packet[] {
    this.buf = this.buf.length ? concat(this.buf, chunk) : new Uint8Array(chunk)
    const out: Packet[] = []
    for (;;) {
      if (this.buf.length < 2) break
      let len = 0
      let mul = 1
      let i = 1
      let done = false
      for (; i < 5 && i < this.buf.length; i++) {
        const b = this.buf[i]!
        len += (b & 0x7f) * mul
        mul *= 128
        if (!(b & 0x80)) {
          done = true
          break
        }
      }
      if (!done) {
        if (i >= 5) throw new Error('mqtt: bad length')
        break // the length itself is still arriving
      }
      if (len > MAX_PACKET) throw new Error('mqtt: packet too large')
      const start = i + 1
      if (this.buf.length < start + len) break
      out.push(decode(this.buf[0]!, this.buf.subarray(start, start + len)))
      this.buf = this.buf.subarray(start + len)
    }
    return out
  }
}

function decode(first: number, body: Bytes): Packet {
  const type = first >> 4
  const r16 = (at: number) => ((body[at]! << 8) | body[at + 1]!) >>> 0
  if (type === 2) return { type: 'connack', rc: body[1] ?? 255 }
  if (type === 3) {
    const qos = (first >> 1) & 3
    const tl = r16(0)
    const topic = text(body.subarray(2, 2 + tl))
    let at = 2 + tl
    let id: number | undefined
    if (qos > 0) {
      id = r16(at)
      at += 2
    }
    return { type: 'publish', topic, payload: body.slice(at), retain: !!(first & 1), qos, id }
  }
  if (type === 9) return { type: 'suback', id: r16(0), codes: Array.from(body.subarray(2)) }
  if (type === 13) return { type: 'pingresp' }
  return { type: 'other', code: type }
}

/* ── Connection ───────────────────────────────────────────── */

export interface ConnOptions {
  url: string
  clientId: string
  /** Seconds. The broker drops us (and publishes the will) after 1.5 times this without a packet. */
  keepalive: number
  will?: Will
  WebSocket?: typeof WebSocket
  onUp: () => void
  onDown: () => void
  onPublish: (topic: string, payload: Bytes, retained: boolean) => void
}

/** One broker connection. It never reconnects by itself: the hub decides when to try again. */
export class MqttConnection {
  up = false
  private ws: WebSocket | null = null
  private reader = new PacketReader()
  private nextId = 1
  private pongs: ((ok: boolean) => void)[] = []
  private closed = false
  private o: ConnOptions
  constructor(o: ConnOptions) {
    this.o = o
  }

  open() {
    const WS = this.o.WebSocket ?? globalThis.WebSocket
    let ws: WebSocket
    try {
      ws = new WS(this.o.url, 'mqtt')
    } catch {
      queueMicrotask(() => this.down())
      return
    }
    this.ws = ws
    ws.binaryType = 'arraybuffer'
    ws.onopen = () => this.send(connectPacket(this.o))
    ws.onmessage = (e) => {
      if (!(e.data instanceof ArrayBuffer)) return
      let packets: Packet[]
      try {
        packets = this.reader.push(new Uint8Array(e.data))
      } catch {
        return this.kill()
      }
      for (const p of packets) this.handle(p)
    }
    ws.onclose = () => this.down()
    ws.onerror = () => this.down()
  }

  private handle(p: Packet) {
    if (p.type === 'connack') {
      if (p.rc !== 0) return this.kill()
      this.up = true
      this.o.onUp()
    } else if (p.type === 'publish') {
      // we only ask for QoS 0, but a broker may still send QoS 1: acknowledge it so it is not resent
      if (p.qos === 1 && p.id !== undefined) this.send(pubackPacket(p.id))
      this.o.onPublish(p.topic, p.payload, p.retain)
    } else if (p.type === 'pingresp') {
      const waiting = this.pongs
      this.pongs = []
      for (const w of waiting) w(true)
    }
  }

  private send(b: Uint8Array) {
    if (this.ws?.readyState === 1) this.ws.send(new Uint8Array(b))
  }
  private id() {
    this.nextId = (this.nextId % 0xffff) + 1
    return this.nextId
  }

  publish(topic: string, payload: Uint8Array, retain: boolean) {
    if (this.up) this.send(publishPacket(topic, payload, retain))
  }
  subscribe(filters: string[]) {
    if (this.up && filters.length) this.send(subscribePacket(this.id(), filters))
  }
  unsubscribe(filters: string[]) {
    if (this.up && filters.length) this.send(unsubscribePacket(this.id(), filters))
  }
  /** A ping round trip. The broker handles packets in order, so a reply also means everything sent before it arrived. */
  ping(timeoutMs: number): Promise<boolean> {
    if (!this.up) return Promise.resolve(false)
    return new Promise((res) => {
      const t = setTimeout(() => {
        this.pongs = this.pongs.filter((w) => w !== done)
        res(false)
      }, timeoutMs)
      const done = (ok: boolean) => {
        clearTimeout(t)
        res(ok)
      }
      this.pongs.push(done)
      this.send(PINGREQ)
    })
  }

  /** Clean goodbye: the broker discards the will. */
  end() {
    this.send(DISCONNECT)
    this.kill()
  }
  /** Drop the socket without a goodbye (a dead or stuck connection): the broker publishes the will. */
  kill() {
    const ws = this.ws
    if (ws) {
      ws.onopen = ws.onmessage = null
      try {
        ws.close()
      } catch {
        /* already closed */
      }
    }
    this.down()
  }
  private down() {
    if (this.closed) return
    this.closed = true
    this.up = false
    for (const w of this.pongs) w(false)
    this.pongs = []
    if (this.ws) this.ws.onclose = this.ws.onerror = null
    this.ws = null
    this.o.onDown()
  }
}
