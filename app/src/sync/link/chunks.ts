import { concat, hex, type Bytes } from './bytes'

/* A sealed snapshot is cut into retained chunks of at most 64KB: [snapId 8][index u16][count u16][bytes].
   Relays hand retained messages back in any order, possibly mixed with chunks of an older snapshot, so the receiver
   collects chunks per device and snapshot id and only opens a snapshot once every piece is in. */

export const CHUNK_MAX = 64 * 1024
const HEAD = 12
/** 65535 chunks would be 4GB; anything near this is not a snapshot of ours. */
const MAX_CHUNKS = 512

export function splitChunks(data: Uint8Array, snapId: Uint8Array): Bytes[] {
  const size = CHUNK_MAX - HEAD
  const count = Math.max(1, Math.ceil(data.length / size))
  if (count > MAX_CHUNKS) throw new Error('link: snapshot too large')
  const out: Bytes[] = []
  for (let i = 0; i < count; i++) {
    const head = new Uint8Array(HEAD)
    head.set(snapId.subarray(0, 8))
    head[8] = i >> 8
    head[9] = i & 0xff
    head[10] = count >> 8
    head[11] = count & 0xff
    out.push(concat(head, data.subarray(i * size, (i + 1) * size)))
  }
  return out
}

export function readChunk(b: Uint8Array): { snapId: string; index: number; count: number; data: Bytes } | null {
  if (b.length < HEAD) return null
  const index = (b[8]! << 8) | b[9]!
  const count = (b[10]! << 8) | b[11]!
  if (!count || count > MAX_CHUNKS || index >= count) return null
  return { snapId: hex(b.subarray(0, 8)), index, count, data: b.slice(HEAD) }
}

interface Pending {
  count: number
  parts: (Bytes | undefined)[]
  got: number
}

export class Assembler {
  private byTag = new Map<string, Map<string, Pending>>()

  /** Add one chunk from a device; returns the whole sealed snapshot once its last piece arrives. */
  add(tag: string, chunk: Uint8Array): Bytes | null {
    const c = readChunk(chunk)
    if (!c) return null
    let snaps = this.byTag.get(tag)
    if (!snaps) this.byTag.set(tag, (snaps = new Map()))
    let p = snaps.get(c.snapId)
    if (!p || p.count !== c.count) {
      p = { count: c.count, parts: new Array(c.count), got: 0 }
      snaps.set(c.snapId, p)
      // a few snapshots per device at most: stray chunks of an old one must not pile up
      while (snaps.size > 3) snaps.delete(snaps.keys().next().value!)
    }
    if (!p.parts[c.index]) {
      p.parts[c.index] = c.data
      p.got++
    }
    if (p.got < p.count) return null
    snaps.delete(c.snapId)
    return concat(...(p.parts as Bytes[]))
  }
}
