import type { StoreApi } from 'zustand'
import { mergeRecord } from '@/data/merge'
import type { AppState } from '@/data/store'
import { COLLECTIONS, type BaseRecord, type Collection, type Settings, type User } from '@/data/types'
import { EMPTY, b64, fromB64, hex, randomBytes, utf8, type Bytes } from './bytes'
import { Assembler, readChunk, splitChunks } from './chunks'
import { CODE_TTL, newCode, normalizeCode } from './code'
import { canGzip, codeKeys, deviceTag, ecdhPair, grantKey, groupKeys, newSecret, openJson, seal, sealJson } from './crypto'
import type { DeviceInfo, DeviceKind } from './device'
import type { Bus, BusFactory, BusStatus } from './hub'
import { initialLinkState, type LinkError, type LinkState, type LinkedDevice } from './state'

/* Device linking: this device's data and its linked devices' data kept in step through public relays, end to end
   encrypted, with no account and no server of our own.

   The group: every linked device holds the same secret S (crypto.ts). Under onda/v1/<topic>/ each device keeps
     snap/<tag>/<i>  its latest full snapshot, retained, so a device that was away catches up from it,
     dev/<tag>       its presence, retained, with a Last Will that marks it offline,
   and everyone shares live, where single edits travel within a second while devices are open together.
   Every record carries per-field clocks and merges last-write-wins (data/merge.ts), so full states applied in any
   order, any number of times, converge. Only rows that actually change something are handed to the store.

   Pairing (show a code on one device, enter it on the other): the code gives a slow key and a meeting topic; the two
   devices agree a fresh key by ECDH under it, and S travels under that. Then both simply join the group. */

export const META_KEY = 'link'
export interface LinkMeta {
  v: 1
  /** The group secret, base64. */
  secret: string
  /** The group's topic id (derived from the secret; kept for support and debugging). */
  group: string
  name: string
  kind: DeviceKind
  /** How many snapshot chunks this device last left on the relays. */
  chunks?: number
}

export interface Timing {
  /** After connecting, publish our snapshot this soon if no other device's arrived first. */
  first: number
  /** Quiet time after a change before the snapshot is published again... */
  snapshot: number
  /** ...but never longer than this while changes keep coming. */
  snapshotMax: number
  /** Single edits are batched this long. */
  delta: number
  codeTtl: number
  /** Entering a code: how long to wait for the offer once a relay answers, and for a relay at all. */
  offerWait: number
  connectWait: number
  grantWait: number
}
export const TIMING: Timing = { first: 2000, snapshot: 5000, snapshotMax: 30_000, delta: 300, codeTtl: CODE_TTL, offerWait: 7000, connectWait: 15_000, grantWait: 30_000 }

export interface LinkDeps {
  store: Pick<StoreApi<AppState>, 'getState' | 'setState' | 'subscribe'>
  onLocalWrite: (fn: (collection: Collection, record: BaseRecord) => void) => () => void
  meta: { get: <T>(key: string) => Promise<T | undefined>; set: (key: string, value: unknown) => Promise<void>; del: (key: string) => Promise<void> }
  bus: BusFactory
  state: StoreApi<LinkState>
  device: DeviceInfo
  timing?: Partial<Timing>
  /** PBKDF2 rounds for the code key (tests may lower it). */
  iterations?: number
}

type Row = { c: Collection; r: unknown }
interface SnapMsg { t: 'snap'; from: string; name: string; kind: DeviceKind; at: number; rows: Partial<Record<Collection, unknown[]>> }
interface DeltaMsg { t: 'delta'; from: string; id: string; rows: Row[] }
interface DevMsg { t: 'dev'; deviceId: string; name: string; kind: DeviceKind; online: boolean; lastSeen: number; gz: boolean }
interface OfferMsg { t: 'offer'; pub: string; name: string; kind: DeviceKind; exp: number }
interface JoinMsg { t: 'join'; pub: string; name: string; kind: DeviceKind }
interface GrantMsg { t: 'grant'; secret: string }

/** Settings that belong to one device: a phone's Face ID lock is not the laptop's. Kept local in every merge. */
const DEVICE_LOCAL = ['appLock', 'hideInSwitcher', 'a2hsDismissed'] as const satisfies readonly (keyof Settings)[]
/** Clock skew we allow on a code's expiry between two devices. */
const SKEW = 2 * 60_000

/** JSON with sorted keys: two records are the same when this is. */
const stable = (v: unknown) =>
  JSON.stringify(v, (_k, x: unknown) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : x))

/** The user record weighs nothing where it holds no choice yet. A device that never finished onboarding is a blank
 *  first run: none of its fields may override a device that did (this is what lets a new device join and leave
 *  onboarding by itself). And an empty name never wins over a real one. */
function weigh(u: User): User {
  if (!u.settings.onboarded) return { ...u, updatedAt: 0, _f: {} }
  if (!u.name) return { ...u, _f: { ...u._f, name: 0 } }
  return u
}

/** Collects a pairing's messages in order and lets the protocol wait for the next one. */
class PairSession {
  done = false
  bus: Bus | null = null
  timer: ReturnType<typeof setTimeout> | null = null
  /** Show mode: the grant went out, so this device is in the group whatever happens next. */
  granted = false
  peer = ''
  /** Clears what this side left retained on the pairing topics. */
  cleanup: (() => void) | null = null
  private chain: Promise<void> = Promise.resolve()
  private wakeFn = () => {}
  enqueue(f: () => Promise<void>) {
    this.chain = this.chain.then(f).catch((e) => console.warn('[onda] link pairing', e))
  }
  wake() {
    this.wakeFn()
  }
  wait(ms: number) {
    return new Promise<void>((r) => {
      const t = setTimeout(r, Math.max(0, ms))
      this.wakeFn = () => {
        clearTimeout(t)
        r()
      }
    })
  }
  finish() {
    this.done = true
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.wake()
  }
  /** Leave nothing behind on the relays, then hang up. */
  async close() {
    const bus = this.bus
    this.bus = null
    if (!bus) return
    this.cleanup?.()
    await bus.flush(2500).catch(() => undefined)
    bus.close()
  }
}

interface Remote {
  name: string
  kind: DeviceKind
  online: boolean
  lastSeen: number
  gz: boolean
}

/** One device's membership of its group: the relay connection, presence, snapshots out and in, deltas out and in. */
class GroupSync {
  private bus: Bus | null = null
  private key!: CryptoKey
  private base = ''
  private tag = ''
  private deviceId = ''
  private will: Bytes = EMPTY
  private remotes = new Map<string, Remote>()
  private tags = new Map<string, string>()
  private asm = new Assembler()
  private inbox: Promise<void> = Promise.resolve()
  private outbox: Promise<void> = Promise.resolve()
  private ownChunks: number
  private ownSeen = -1
  private snapId = ''
  private published = false
  private lastGz = false
  private firstTimer: ReturnType<typeof setTimeout> | null = null
  private snapTimer: ReturnType<typeof setTimeout> | null = null
  private snapSince = 0
  private deltaTimer: ReturnType<typeof setTimeout> | null = null
  private pending = new Map<string, Row>()
  private offs: (() => void)[] = []
  private live: (() => void)[] = []
  private stopped = false
  private status: BusStatus = 'connecting'
  private lastSync: number | null = null
  private d: LinkDeps
  private t: Timing
  private meta: LinkMeta
  private hooks: { onPeer: (name: string) => void }

  constructor(d: LinkDeps, t: Timing, meta: LinkMeta, hooks: { onPeer: (name: string) => void }) {
    this.d = d
    this.t = t
    this.meta = meta
    this.hooks = hooks
    this.ownChunks = meta.chunks ?? 0
  }

  private set(p: Partial<LinkState>) {
    if (!this.stopped) this.d.state.setState(p)
  }
  private emit() {
    const me: LinkedDevice = { tag: this.tag, name: this.meta.name, kind: this.meta.kind, online: this.status === 'live', lastSeen: this.lastSync ?? 0, me: true }
    const others = [...this.remotes].map(([tag, r]): LinkedDevice => ({ tag, name: r.name, kind: r.kind, online: r.online, lastSeen: r.lastSeen, me: false }))
    others.sort((a, b) => Number(b.online) - Number(a.online) || b.lastSeen - a.lastSeen)
    this.set({ devices: [me, ...others] })
  }
  private synced() {
    this.lastSync = Date.now()
    this.set({ lastSyncAt: this.lastSync })
    this.emit()
  }
  private presence(online: boolean): DevMsg {
    return { t: 'dev', deviceId: this.deviceId, name: this.meta.name, kind: this.meta.kind, online, lastSeen: Date.now(), gz: canGzip() }
  }
  private topic(...parts: (string | number)[]) {
    return [this.base, ...parts].join('/')
  }

  async start() {
    const { key, topic } = await groupKeys(fromB64(this.meta.secret))
    this.key = key
    this.base = `onda/v1/${topic}`
    this.deviceId = this.d.store.getState().deviceId
    this.tag = await deviceTag(this.deviceId)
    this.will = await sealJson(key, this.presence(false))
    const hello = await sealJson(key, this.presence(true))
    if (this.stopped) return
    this.emit()
    const bus = this.d.bus({
      will: { topic: this.topic('dev', this.tag), payload: this.will, retain: true },
      onMessage: (topic, payload) => {
        this.inbox = this.inbox.then(() => this.receive(topic, payload)).catch((e) => console.warn('[onda] link receive', e))
      },
      onStatus: (s) => {
        this.status = s
        this.set({ status: s })
        this.emit()
        if (s === 'live') for (const w of this.live.splice(0)) w()
      },
    })
    this.bus = bus
    this.status = bus.status()
    this.set({ status: this.status })
    bus.subscribe(this.topic('#'))
    bus.publish(this.topic('dev', this.tag), hello, true)
    // our snapshot goes out once the others' are merged in (see onSnapshot), or after a moment if none arrive
    this.firstTimer = setTimeout(() => this.publishSnapshot(), this.t.first)
    this.offs.push(this.d.onLocalWrite((c, r) => this.queueDelta(c, r)))
    this.offs.push(this.d.store.subscribe((s, p) => s.dirty !== p.dirty && this.scheduleSnapshot()))
    if (typeof document !== 'undefined') {
      // leaving the app (iOS may freeze it any moment now): send what is waiting instead of on a timer
      const hidden = () => document.visibilityState === 'hidden' && this.flushNow()
      const gone = () => this.bus?.publish(this.topic('dev', this.tag), this.will, true)
      document.addEventListener('visibilitychange', hidden)
      window.addEventListener('pagehide', gone)
      this.offs.push(() => {
        document.removeEventListener('visibilitychange', hidden)
        window.removeEventListener('pagehide', gone)
      })
    }
  }

  /* ── Receiving ─────────────────────────────────────────── */

  private async receive(topic: string, payload: Bytes) {
    if (this.stopped || !topic.startsWith(this.base + '/')) return
    const [kind, tag, index] = topic.slice(this.base.length + 1).split('/')
    if (kind === 'snap' && tag) return this.onChunk(topic, tag, Number(index), payload)
    if (kind === 'live') return this.onDelta(payload)
    if (kind === 'dev' && tag) return this.onPresence(tag, payload)
  }

  private async onChunk(topic: string, tag: string, index: number, payload: Bytes) {
    if (!payload.length) return
    if (tag === this.tag) {
      // our own chunks: count what is out there, and clear any a longer earlier snapshot left behind
      const c = readChunk(payload)
      if (this.published && c && c.snapId !== this.snapId && index >= this.ownChunks) this.bus?.publish(topic, EMPTY, true)
      else if (!this.published) this.ownSeen = Math.max(this.ownSeen, index)
      return
    }
    const whole = this.asm.add(tag, payload)
    if (!whole) return
    const m = await openJson<SnapMsg>(this.key, whole).catch(() => null)
    if (m?.t !== 'snap' || m.from === this.deviceId || !m.rows || typeof m.rows !== 'object') return
    this.tags.set(m.from, tag)
    this.seen(tag, { name: m.name, kind: m.kind, lastSeen: m.at })
    const rows: Row[] = []
    for (const c of COLLECTIONS) {
      const list = m.rows[c]
      if (Array.isArray(list)) for (const r of list) rows.push({ c, r })
    }
    const changed = await this.merge(rows)
    this.synced()
    // the first snapshot from another device is in: answer with ours, which now holds both
    if (!this.published) this.publishSnapshot()
    else if (changed) this.scheduleSnapshot()
  }

  private async onDelta(payload: Bytes) {
    const m = await openJson<DeltaMsg>(this.key, payload).catch(() => null)
    // our own edits come back from the relays too: they are already here
    if (m?.t !== 'delta' || m.from === this.deviceId || !Array.isArray(m.rows)) return
    const tag = this.tags.get(m.from) ?? (await deviceTag(m.from))
    this.tags.set(m.from, tag)
    this.seen(tag, { lastSeen: Date.now(), online: true })
    const changed = await this.merge(m.rows.filter((x) => x && typeof x === 'object'))
    this.synced()
    if (changed) this.scheduleSnapshot()
  }

  private async onPresence(tag: string, payload: Bytes) {
    if (tag === this.tag) return
    if (!payload.length) {
      // an empty retained message: that device unlinked
      if (this.remotes.delete(tag)) this.emit()
      return
    }
    const m = await openJson<DevMsg>(this.key, payload).catch(() => null)
    if (m?.t !== 'dev') return
    this.tags.set(m.deviceId, tag)
    this.seen(tag, { name: m.name, kind: m.kind, online: !!m.online, lastSeen: m.lastSeen, gz: m.gz !== false })
    // a device that cannot unzip (Safari before 16.4) has joined: send it a plain snapshot
    if (m.gz === false && this.lastGz) this.scheduleSnapshot()
  }

  private seen(tag: string, p: Partial<Remote>) {
    const prev = this.remotes.get(tag)
    const next: Remote = {
      name: p.name || prev?.name || 'Device',
      kind: p.kind ?? prev?.kind ?? 'computer',
      online: p.online ?? prev?.online ?? false,
      lastSeen: Math.max(prev?.lastSeen ?? 0, typeof p.lastSeen === 'number' ? p.lastSeen : 0),
      gz: p.gz ?? prev?.gz ?? true,
    }
    this.remotes.set(tag, next)
    if (!prev) this.hooks.onPeer(next.name)
    this.emit()
  }

  /** Check rows against the schemas and hand the store only those that change something here. */
  private async merge(rows: Row[]): Promise<boolean> {
    if (!rows.length) return false
    const { SCHEMAS } = await import('@/data/schemas')
    const by = new Map<Collection, BaseRecord[]>()
    for (const { c, r } of rows) {
      if (!(COLLECTIONS as readonly string[]).includes(c)) continue
      const p = SCHEMAS[c].safeParse(r)
      // a row this build cannot read (a newer version wrote it) is skipped, not fatal
      if (!p.success) continue
      const list = by.get(c) ?? []
      list.push(p.data as BaseRecord)
      by.set(c, list)
    }
    let changed = false
    for (const [c, list] of by) {
      if (this.stopped) return changed
      if (c === 'user') {
        for (const u of list) changed = (await this.mergeUser(u as User)) || changed
        continue
      }
      const local = new Map((this.d.store.getState()[c] as BaseRecord[]).map((x) => [x.id, x]))
      const diff = list.filter((r) => {
        const l = local.get(r.id)
        return !l || stable(mergeRecord(l, r)) !== stable(l)
      })
      if (!diff.length) continue
      await this.d.store.getState().applyRemote(c, diff as never)
      changed = true
    }
    return changed
  }

  private async mergeUser(u: User): Promise<boolean> {
    const mine = this.d.store.getState().user
    if (!mine) return false
    const keep = Object.fromEntries(DEVICE_LOCAL.map((k) => [k, mine.settings[k]]))
    // applyRemote keeps id 'me' and the store keeps its own deviceId: only the person's data comes across
    const incoming: User = { ...u, id: 'me', settings: { ...u.settings, ...keep } }
    const local = weigh(mine)
    const remote = weigh(incoming)
    if (stable(mergeRecord(local, remote)) === stable(mine)) return false
    if (local !== mine) this.d.store.setState({ user: local })
    await this.d.store.getState().applyRemote('user', [remote])
    return true
  }

  /* ── Sending ───────────────────────────────────────────── */

  private gzOk() {
    return canGzip() && [...this.remotes.values()].every((r) => r.gz)
  }

  private queueDelta(c: Collection, r: BaseRecord) {
    if (this.stopped) return
    this.pending.set(`${c}:${r.id}`, { c, r })
    this.deltaTimer ??= setTimeout(() => void this.sendDelta(), this.t.delta)
  }
  private async sendDelta() {
    if (this.deltaTimer) clearTimeout(this.deltaTimer)
    this.deltaTimer = null
    const rows = [...this.pending.values()]
    this.pending.clear()
    if (!rows.length || this.stopped) return
    const json = JSON.stringify({ t: 'delta', from: this.deviceId, id: hex(randomBytes(8)), rows } satisfies DeltaMsg)
    const sealed = await seal(this.key, utf8(json), json.length > 2048 && this.gzOk())
    if (this.stopped) return
    // not retained: a device that is away gets this edit from the next snapshot instead
    this.bus?.publish(this.topic('live'), sealed, false)
    if (this.status === 'live') this.synced()
  }

  private scheduleSnapshot() {
    if (this.stopped) return
    const now = Date.now()
    this.snapSince ||= now
    if (this.snapTimer) clearTimeout(this.snapTimer)
    const wait = Math.max(0, Math.min(this.t.snapshot, this.snapSince + this.t.snapshotMax - now))
    this.snapTimer = setTimeout(() => this.publishSnapshot(), wait)
  }

  /** Publish this device's whole state, one after another so a slow seal never overtakes a newer one. */
  publishSnapshot() {
    if (this.firstTimer) clearTimeout(this.firstTimer)
    if (this.snapTimer) clearTimeout(this.snapTimer)
    this.firstTimer = this.snapTimer = null
    this.snapSince = 0
    this.published = true
    this.outbox = this.outbox.then(() => this.sendSnapshot()).catch((e) => console.warn('[onda] link snapshot', e))
    return this.outbox
  }
  private async sendSnapshot() {
    const s = this.d.store.getState()
    if (this.stopped || !s.ready || !s.user) return
    // every record, deleted ones too, so a delete reaches a device that was away
    const rows: SnapMsg['rows'] = {}
    for (const c of COLLECTIONS) rows[c] = c === 'user' ? [s.user] : (s[c] as BaseRecord[])
    const gz = this.gzOk()
    const sealed = await sealJson(this.key, { t: 'snap', from: this.deviceId, name: this.meta.name, kind: this.meta.kind, at: Date.now(), rows } satisfies SnapMsg, gz)
    const bus = this.bus
    if (this.stopped || !bus) return
    const id = randomBytes(8)
    const chunks = splitChunks(sealed, id)
    this.snapId = hex(id)
    chunks.forEach((c, i) => bus.publish(this.topic('snap', this.tag, i), c, true))
    // a shorter snapshot than last time: delete the stale chunks after it (an empty retained message deletes)
    const before = Math.max(this.ownChunks, this.ownSeen + 1)
    for (let i = chunks.length; i < before; i++) bus.publish(this.topic('snap', this.tag, i), EMPTY, true)
    this.ownSeen = chunks.length - 1
    this.lastGz = gz
    if (chunks.length !== this.ownChunks) {
      this.ownChunks = chunks.length
      const m = await this.d.meta.get<LinkMeta>(META_KEY)
      if (m?.secret === this.meta.secret) await this.d.meta.set(META_KEY, { ...m, chunks: chunks.length })
    }
    if (this.status === 'live') this.synced()
  }

  private flushNow() {
    if (this.deltaTimer) void this.sendDelta()
    if (this.snapTimer) void this.publishSnapshot()
  }

  /* ── Leaving ───────────────────────────────────────────── */

  private waitLive(ms: number) {
    if (this.status === 'live') return Promise.resolve()
    return new Promise<void>((r) => {
      const t = setTimeout(r, ms)
      this.live.push(() => {
        clearTimeout(t)
        r()
      })
    })
  }

  /** Unlink: take this device's presence and snapshot off the relays (the others keep their copies of the data). */
  async leave() {
    const bus = this.bus
    this.clearTimers()
    if (bus) {
      await this.waitLive(4000)
      bus.publish(this.topic('dev', this.tag), EMPTY, true)
      const n = Math.max(this.ownChunks, this.ownSeen + 1)
      for (let i = 0; i < n; i++) bus.publish(this.topic('snap', this.tag, i), EMPTY, true)
      await bus.flush(3000).catch(() => undefined)
    }
    this.stop()
  }

  private clearTimers() {
    for (const t of [this.firstTimer, this.snapTimer, this.deltaTimer]) if (t) clearTimeout(t)
    this.firstTimer = this.snapTimer = this.deltaTimer = null
  }
  stop() {
    this.clearTimers()
    this.stopped = true
    for (const off of this.offs.splice(0)) off()
    for (const w of this.live.splice(0)) w()
    this.bus?.close()
    this.bus = null
  }
}

export class LinkEngine {
  private group: GroupSync | null = null
  private pair: PairSession | null = null
  private t: Timing
  private d: LinkDeps
  constructor(d: LinkDeps) {
    this.d = d
    this.t = { ...TIMING, ...d.timing }
  }

  private set(p: Partial<LinkState>) {
    this.d.state.setState(p)
  }
  private async readMeta(): Promise<LinkMeta | null> {
    const m = await this.d.meta.get<LinkMeta>(META_KEY)
    return m && m.v === 1 && typeof m.secret === 'string' ? m : null
  }

  /** Join this device's group if it is linked. When it is not, nothing runs and nothing connects. */
  async start(): Promise<boolean> {
    if (this.group) return true
    const meta = await this.readMeta()
    if (!meta) {
      this.set({ linked: false, status: 'off', devices: [] })
      return false
    }
    const g = new GroupSync(this.d, this.t, meta, { onPeer: (name) => this.onPeer(name) })
    this.group = g
    this.set({ linked: true, status: 'connecting' })
    await g.start()
    return true
  }

  /** Stop syncing without unlinking (tests, and switching groups). */
  stop() {
    this.group?.stop()
    this.group = null
    this.cancelPairing()
  }

  /** Keep S: as this device's group, or a new group when it was not linked yet. Leaves any other group first;
   *  this device's data reaches the new group through its snapshot, so nothing is lost. */
  private async adopt(secret: Uint8Array) {
    const s = b64(secret)
    const meta = await this.readMeta()
    if (meta?.secret === s) {
      await this.start()
      return
    }
    const old = this.group
    this.group = null
    if (old) await old.leave()
    const { topic } = await groupKeys(secret)
    await this.d.meta.set(META_KEY, { v: 1, secret: s, group: topic, name: this.d.device.name, kind: this.d.device.kind } satisfies LinkMeta)
    await this.start()
  }

  /* ── Pairing ───────────────────────────────────────────── */

  /** The device showing the code learns of success from the other's "done"; seeing it arrive in the group counts too. */
  private onPeer(name: string) {
    const s = this.pair
    const p = this.d.state.getState().pairing
    if (s?.granted && !s.done && p?.mode === 'show' && p.state === 'waiting') {
      s.finish()
      void s.close()
      this.pair = null
      this.set({ pairing: { ...p, state: 'linked', peer: s.peer || name } })
    }
  }

  cancelPairing() {
    const s = this.pair
    this.pair = null
    if (s && !s.done) {
      s.finish()
      void s.close()
    }
    this.set({ pairing: null })
  }

  /** Show a code: wait for one other device to enter it, then give it the group secret. */
  async startShowCode() {
    this.cancelPairing()
    const s = new PairSession()
    this.pair = s
    const code = newCode()
    const expiresAt = Date.now() + this.t.codeTtl
    const show = (state: 'waiting' | 'linked' | 'expired' | 'error', extra: { peer?: string; message?: LinkError } = {}) => {
      if (this.pair === s || state !== 'waiting') this.set({ pairing: { mode: 'show', code, expiresAt, state, ...extra } })
    }
    show('waiting')
    try {
      const meta = await this.readMeta()
      const secret = meta ? fromB64(meta.secret) : newSecret()
      const ck = await codeKeys(code, this.d.iterations)
      const mine = await ecdhPair()
      if (s.done) return
      let k2: CryptoKey | null = null
      const left: string[] = [ck.topic]
      const bus = this.d.bus({
        onMessage: (topic, payload) =>
          s.enqueue(async () => {
            if (s.done || !payload.length) return
            if (topic === `${ck.topic}/ack` && !k2) {
              const m = await openJson<JoinMsg>(ck.key, payload).catch(() => null)
              if (m?.t !== 'join' || typeof m.pub !== 'string') return
              k2 = await grantKey(mine.priv, fromB64(m.pub), ck.kc)
              s.peer = String(m.name || '')
              // one join per code: the offer comes down before the secret goes out
              bus.publish(ck.topic, EMPTY, true)
              left.push(`${ck.topic}/ack`, `${ck.topic}/grant`)
              bus.publish(`${ck.topic}/grant`, await sealJson(k2, { t: 'grant', secret: b64(secret) } satisfies GrantMsg), true)
              s.granted = true
              // not linked before: this device's group starts now, so its snapshot is there when the other arrives
              if (!meta) await this.adopt(secret)
            } else if (topic === `${ck.topic}/done` && k2) {
              const m = await openJson<{ t: string }>(k2, payload).catch(() => null)
              if (m?.t !== 'done' || s.done) return
              left.push(`${ck.topic}/done`)
              s.finish()
              if (this.pair === s) this.pair = null
              show('linked', { peer: s.peer })
              await s.close()
            }
          }),
      })
      s.bus = bus
      s.cleanup = () => {
        for (const t of left) bus.publish(t, EMPTY, true)
      }
      bus.subscribe(`${ck.topic}/ack`)
      bus.subscribe(`${ck.topic}/done`)
      const offer: OfferMsg = { t: 'offer', pub: b64(mine.pub), name: this.d.device.name, kind: this.d.device.kind, exp: expiresAt }
      bus.publish(ck.topic, await sealJson(ck.key, offer), true)
      s.timer = setTimeout(() => {
        if (s.done) return
        s.finish()
        if (this.pair === s) this.pair = null
        void s.close()
        show(s.granted ? 'linked' : 'expired', { peer: s.peer || undefined })
      }, Math.max(0, expiresAt - Date.now()))
    } catch (e) {
      console.warn('[onda] link show', e)
      if (this.pair === s) {
        s.finish()
        void s.close()
        this.pair = null
        show('error', { message: 'failed' })
      }
    }
  }

  /** Enter a code shown on another device: find its offer, answer it, receive the group secret, join. */
  async enterCode(input: string) {
    const code = normalizeCode(input)
    if (!code) {
      this.set({ pairing: { mode: 'enter', state: 'error', message: 'invalid' } })
      return
    }
    this.cancelPairing()
    const s = new PairSession()
    this.pair = s
    this.set({ pairing: { mode: 'enter', state: 'working' } })
    const fail = (message: LinkError) => {
      if (this.pair !== s) return
      s.finish()
      void s.close()
      this.pair = null
      this.set({ pairing: { mode: 'enter', state: 'error', message } })
    }
    try {
      const ck = await codeKeys(code, this.d.iterations)
      if (s.done) return
      const got: { offer?: OfferMsg; secret?: string; k2?: CryptoKey; upAt: number } = { upAt: 0 }
      const bus = this.d.bus({
        onUp: () => {
          got.upAt ||= Date.now()
          s.wake()
        },
        onMessage: (topic, payload) =>
          s.enqueue(async () => {
            if (s.done || !payload.length) return
            if (topic === ck.topic && !got.offer) {
              const m = await openJson<OfferMsg>(ck.key, payload).catch(() => null)
              if (m?.t === 'offer' && typeof m.pub === 'string') got.offer = m
            } else if (topic === `${ck.topic}/grant` && got.k2 && !got.secret) {
              const m = await openJson<GrantMsg>(got.k2, payload).catch(() => null)
              if (m?.t === 'grant' && typeof m.secret === 'string') got.secret = m.secret
            }
            s.wake()
          }),
      })
      s.bus = bus
      bus.subscribe(ck.topic)
      bus.subscribe(`${ck.topic}/grant`)

      // The offer is retained, so it arrives right after a relay accepts the subscription.
      const start = Date.now()
      for (;;) {
        if (got.offer || s.done) break
        const deadline = got.upAt ? Math.min(start + this.t.connectWait, got.upAt + this.t.offerWait) : start + this.t.connectWait
        if (Date.now() >= deadline) break
        await s.wait(deadline - Date.now())
      }
      if (s.done) return
      const offer = got.offer
      // a wrong code points at an empty topic; an old offer left behind by a device that went away has expired
      if (!offer || (offer.exp && offer.exp + SKEW < Date.now())) return fail(got.upAt ? 'noOffer' : 'offline')

      const mine = await ecdhPair()
      got.k2 = await grantKey(mine.priv, fromB64(offer.pub), ck.kc)
      s.cleanup = () => bus.publish(`${ck.topic}/ack`, EMPTY, true)
      bus.publish(`${ck.topic}/ack`, await sealJson(ck.key, { t: 'join', pub: b64(mine.pub), name: this.d.device.name, kind: this.d.device.kind } satisfies JoinMsg), true)
      const until = Date.now() + this.t.grantWait
      while (!got.secret && !s.done && Date.now() < until) await s.wait(until - Date.now())
      if (s.done) return
      if (!got.secret) return fail('noAnswer')

      await this.adopt(fromB64(got.secret))
      // the other side clears the pairing topics once it reads this
      s.cleanup = null
      bus.publish(`${ck.topic}/done`, await sealJson(got.k2, { t: 'done' }), true)
      s.finish()
      if (this.pair === s) this.pair = null
      this.set({ pairing: { mode: 'enter', state: 'linked', peer: offer.name } })
      await s.close()
    } catch (e) {
      console.warn('[onda] link enter', e)
      fail('failed')
    }
  }

  /** Forget the group on this device and take its traces off the relays. The other devices keep everything. */
  async unlink() {
    this.cancelPairing()
    const g = this.group
    this.group = null
    if (g) await g.leave()
    await this.d.meta.del(META_KEY)
    this.d.state.setState(initialLinkState())
  }
}
