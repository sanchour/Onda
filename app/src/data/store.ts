import { create } from 'zustand'
import { mediaFor } from '@/content'
import type { OndaContent } from '@/content/schema'
import { addDays, now, todayStr, type DateStr } from '@/lib/dates'
import { setHapticsEnabled } from '@/lib/haptics'
import { detId, uuid } from '@/lib/ids'
import { backendConfigured } from '@/sync/supabase'
import { db, getMeta, setMeta } from './db'
import { earnedAchievements, type AchievementKey } from './derive/achievements'
import { planSize } from './derive/plan'
import { mergeRecord, stamp } from './merge'
import { COLLECTIONS, withDefaults, type BaseRecord, type CheckIn, type Collection, type Frequency, type Lago, type OndaRun, type RunSnapshot, type Settings, type Tables, type User } from './types'

type Lists = { [K in Exclude<Collection, 'user'>]: Tables[K][] }

export interface LagoInput {
  name: string
  icon: string
  why: string
  lengthDays: number
  frequency: Frequency
  reminder: { on: boolean; time: string }
  origin?: string
  link?: { runId: string; practiceId: string } | null
}

export interface AppState extends Lists {
  ready: boolean
  today: DateStr
  deviceId: string
  user: User | null
  /** Achievements unlocked since the UI last looked: drives the unlock toast. */
  unlockQueue: AchievementKey[]
  /** Bumped on every local write; the sync layer watches it. */
  dirty: number

  init: () => Promise<void>
  tick: () => void
  shiftUnlock: () => void
  applyRemote: <K extends Collection>(collection: K, records: Tables[K][]) => Promise<void>

  setName: (name: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  setEntitlement: (patch: Pick<Partial<User>, 'plus' | 'trialStartedAt'>) => void

  createLago: (input: LagoInput) => Lago
  updateLago: (id: string, patch: Partial<LagoInput>) => void
  endLago: (id: string) => void
  restartLago: (id: string) => void
  extendLago: (id: string, days?: number) => void
  duplicateLago: (id: string) => void
  deleteLago: (id: string) => void
  restoreLago: (id: string) => void
  checkIn: (lagoId: string, input: { date?: DateStr; status: CheckIn['status']; note?: string; photoPath?: string | null; at?: string }) => CheckIn
  toggleCheckInToday: (lagoId: string) => void

  beginOnda: (content: OndaContent, lengthDays: number, intention?: string) => OndaRun
  endOnda: (runId: string) => void
  togglePractice: (runId: string, practiceId: string, date?: DateStr) => void
  toggleItem: (collection: 'ruleLogs' | 'taskLogs', runId: string, itemId: string, date?: DateStr) => void
  toggleImmerse: (runId: string, itemId: string) => void
  saveJournal: (runId: string, day: number, prompt: string, text: string) => void
  completeOnda: (runId: string, answers: { prompt: string; text: string }[], keptPracticeIds: string[]) => number
  saveCustomOnda: (content: OndaContent) => void

  exportAll: () => Record<string, unknown>
  /** Merge a file made by exportAll into this device. Newer edits win per field; nothing is deleted. */
  importAll: (raw: unknown) => Promise<{ imported: number; skipped: number }>
  resetAll: () => Promise<void>
}

const EMPTY: Lists = { lagos: [], checkIns: [], runs: [], practiceLogs: [], ruleLogs: [], taskLogs: [], immerseLogs: [], journal: [], reflections: [], achievements: [], customOndas: [] }
const live = <T extends BaseRecord>(x: T) => !x.deletedAt

function newUser(deviceId: string): User {
  const ts = now().getTime()
  let timezone = 'UTC'
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    /* keep UTC */
  }
  return { id: 'me', updatedAt: ts, deviceId, name: '', createdAt: now().toISOString(), plus: 'none', trialStartedAt: null, settings: withDefaults({ timezone }) }
}

export function snapshotOf(c: OndaContent): RunSnapshot {
  return {
    name: c.name,
    practices: c.practices.map((p) => ({ id: p.id, name: p.name, icon: p.icon, time: p.time, minutes: p.minutes })),
    rules: c.rules.map((r) => ({ id: r.id, text: r.text })),
    tasks: c.tasks.map((t) => ({ id: t.id, name: t.name, time: t.time })),
    perDay: planSize(c),
    immerse: mediaFor(c).map((m) => ({ id: m.id, kind: m.kind, title: m.title })),
  }
}

export const useStore = create<AppState>()((set, get) => {
  /** Persist one record: stamp per-field clocks, update memory, write IndexedDB and queue it for sync. */
  function write<K extends Collection>(collection: K, next: Tables[K]): Tables[K] {
    const s = get()
    const prev = (collection === 'user' ? (s.user ?? undefined) : (s[collection as keyof Lists] as BaseRecord[]).find((r) => r.id === next.id)) as Tables[K] | undefined
    const rec = stamp(prev, next, now().getTime(), s.deviceId)
    if (collection === 'user') set({ user: rec as User, dirty: s.dirty + 1 })
    else {
      const list = s[collection as keyof Lists] as BaseRecord[]
      const i = list.findIndex((r) => r.id === rec.id)
      const copy = i >= 0 ? list.map((r, j) => (j === i ? rec : r)) : [...list, rec]
      set({ [collection]: copy, dirty: s.dirty + 1 } as unknown as Partial<AppState>)
    }
    // Without a sync server there is nothing to queue for: the first sync after one is configured uploads everything.
    const saved = backendConfigured
      ? db.transaction('rw', db.table(collection), db.outbox, async () => {
          await db.table(collection).put(rec)
          await db.outbox.where('[collection+id]').equals([collection, rec.id]).delete()
          await db.outbox.add({ collection, id: rec.id })
        })
      : db.table(collection).put(rec)
    void Promise.resolve(saved).catch((e) => {
      console.error('[onda] write failed', collection, e)
      // iOS can run out of room (or evict storage); the UI tells the person rather than silently losing a write
      if ((e as Error)?.name === 'QuotaExceededError') window.dispatchEvent(new Event('onda:storage-full'))
    })
    return rec
  }
  const remove = <K extends Exclude<Collection, 'user'>>(collection: K, id: string) => {
    const rec = (get()[collection] as BaseRecord[]).find((r) => r.id === id)
    if (rec) write(collection, { ...rec, deletedAt: now().getTime() } as Tables[K])
  }
  const base = (id: string) => ({ id, updatedAt: 0, deviceId: get().deviceId })

  function evaluate() {
    const s = get()
    const have = new Set(s.achievements.filter(live).map((a) => a.key))
    const fresh = earnedAchievements(s, s.today).filter((k) => !have.has(k))
    if (!fresh.length) return
    for (const key of fresh) write('achievements', { ...base(detId('achievement', key)), key, unlockedAt: now().toISOString() })
    set({ unlockQueue: [...get().unlockQueue, ...fresh] })
  }
  /** A Lago made from an Onda practice shares its tick: ticking the practice ticks the Lago and the other way round. */
  const mirrorToLagos = (runId: string, practiceId: string, date: DateStr, done: boolean) => {
    for (const l of get().lagos) {
      if (!live(l) || l.link?.runId !== runId || l.link.practiceId !== practiceId) continue
      const id = detId('checkin', l.id, date)
      const prev = get().checkIns.find((c) => c.id === id)
      const isDone = !!prev && live(prev) && prev.status === 'done'
      if (done && !isDone) write('checkIns', { ...(prev ?? base(id)), lagoId: l.id, date, status: 'done', note: prev?.note ?? '', photoPath: prev?.photoPath ?? null, at: now().toISOString(), deletedAt: null })
      else if (!done && isDone) remove('checkIns', id)
    }
  }
  const mirrorToPractice = (lagoId: string, date: DateStr, done: boolean) => {
    const k = get().lagos.find((l) => l.id === lagoId)?.link
    if (!k) return
    const run = get().runs.find((r) => r.id === k.runId)
    if (!run || !live(run)) return
    const id = detId('practice', k.runId, k.practiceId, date)
    const prev = get().practiceLogs.find((p) => p.id === id)
    if (!!(prev && live(prev) && prev.done) === done) return
    write('practiceLogs', { ...(prev ?? base(id)), runId: k.runId, practiceId: k.practiceId, date, done, at: now().toISOString(), deletedAt: null })
  }
  const after = <T>(v: T): T => {
    evaluate()
    return v
  }

  return {
    ...EMPTY,
    ready: false,
    today: todayStr(),
    deviceId: '',
    user: null,
    unlockQueue: [],
    dirty: 0,

    async init() {
      let deviceId = await getMeta<string>('deviceId')
      if (!deviceId) {
        deviceId = uuid()
        await setMeta('deviceId', deviceId)
      }
      const loaded = await Promise.all(COLLECTIONS.map((c) => db.table(c).toArray()))
      const data = Object.fromEntries(COLLECTIONS.map((c, i) => [c, loaded[i]])) as unknown as Lists & { user: User[] }
      let user = data.user[0] ?? null
      if (user) user = { ...user, settings: withDefaults(user.settings) }
      const { user: _u, ...lists } = data
      set({ ...lists, user, deviceId, ready: true, today: todayStr() })
      if (!user) write('user', newUser(deviceId))
      setHapticsEnabled(get().user?.settings.haptics ?? true)
    },

    tick() {
      const t = todayStr()
      if (t !== get().today) set({ today: t })
    },
    shiftUnlock: () => set({ unlockQueue: get().unlockQueue.slice(1) }),

    async applyRemote(collection, records) {
      if (!records.length) return
      const s = get()
      const merged: BaseRecord[] = []
      if (collection === 'user') {
        const r = records[records.length - 1] as User
        const m = mergeRecord(s.user ?? undefined, { ...r, id: 'me' })
        const user = { ...m, settings: withDefaults(m.settings) }
        set({ user })
        merged.push(user)
      } else {
        const list = [...(s[collection as keyof Lists] as BaseRecord[])]
        const at = new Map(list.map((r, i) => [r.id, i]))
        for (const r of records as BaseRecord[]) {
          const i = at.get(r.id)
          const m = mergeRecord(i === undefined ? undefined : list[i], r)
          if (i === undefined) {
            at.set(r.id, list.length)
            list.push(m)
          } else list[i] = m
          merged.push(m)
        }
        set({ [collection]: list } as unknown as Partial<AppState>)
      }
      await db.table(collection).bulkPut(merged)
    },

    setName(name) {
      const u = get().user
      if (u) write('user', { ...u, name })
    },
    updateSettings(patch) {
      const u = get().user
      if (!u) return
      if (patch.haptics !== undefined) setHapticsEnabled(patch.haptics)
      write('user', { ...u, settings: { ...u.settings, ...patch } })
    },
    setEntitlement(patch) {
      const u = get().user
      if (u) write('user', { ...u, ...patch })
    },

    /* ── Lagos ─────────────────────────────────────────────── */
    createLago(input) {
      return after(write('lagos', { ...base(uuid()), ...input, origin: input.origin ?? 'user', startedAt: get().today, endedAt: null }))
    },
    updateLago(id, patch) {
      const l = get().lagos.find((x) => x.id === id)
      if (l) write('lagos', { ...l, ...patch })
    },
    endLago(id) {
      const l = get().lagos.find((x) => x.id === id)
      if (l) write('lagos', { ...l, endedAt: get().today })
    },
    restartLago(id) {
      const s = get()
      const l = s.lagos.find((x) => x.id === id)
      if (!l) return
      // A restart is a new experiment: the old one is ended and kept in history.
      write('lagos', { ...l, endedAt: l.endedAt ?? addDays(s.today, -1) })
      write('lagos', { ...base(uuid()), name: l.name, icon: l.icon, why: l.why, lengthDays: l.lengthDays, frequency: l.frequency, reminder: l.reminder, origin: l.origin, link: l.link ?? null, startedAt: s.today, endedAt: null })
    },
    extendLago(id, days = 7) {
      const l = get().lagos.find((x) => x.id === id)
      if (l) write('lagos', { ...l, lengthDays: l.lengthDays + days, endedAt: null })
    },
    duplicateLago(id) {
      const l = get().lagos.find((x) => x.id === id)
      if (l) write('lagos', { ...base(uuid()), name: l.name, icon: l.icon, why: l.why, lengthDays: l.lengthDays, frequency: l.frequency, reminder: l.reminder, origin: l.origin, link: l.link ?? null, startedAt: get().today, endedAt: null })
    },
    deleteLago(id) {
      // Soft delete: check ins stay so a delete can be undone and history is not rewritten.
      remove('lagos', id)
    },
    restoreLago(id) {
      const l = get().lagos.find((x) => x.id === id)
      if (l) write('lagos', { ...l, deletedAt: null })
    },
    checkIn(lagoId, input) {
      const s = get()
      const date = input.date ?? s.today
      const id = detId('checkin', lagoId, date)
      const prev = s.checkIns.find((c) => c.id === id)
      const rec = write('checkIns', {
          ...(prev ?? base(id)),
          lagoId,
          date,
          status: input.status,
          note: input.note ?? prev?.note ?? '',
          photoPath: input.photoPath === undefined ? (prev?.photoPath ?? null) : input.photoPath,
          at: input.at ?? now().toISOString(),
          deletedAt: null,
      })
      mirrorToPractice(lagoId, date, input.status === 'done')
      return after(rec)
    },
    toggleCheckInToday(lagoId) {
      const s = get()
      const id = detId('checkin', lagoId, s.today)
      const prev = s.checkIns.find((c) => c.id === id && live(c))
      if (prev?.status === 'done') {
        remove('checkIns', id)
        mirrorToPractice(lagoId, s.today, false)
      } else s.checkIn(lagoId, { status: 'done' })
    },

    /* ── Ondas ─────────────────────────────────────────────── */
    beginOnda(content, lengthDays, intention = '') {
      const s = get()
      // One Onda at a time: beginning another ends the current one.
      for (const r of s.runs) if (r.state === 'active' && live(r)) write('runs', { ...r, state: 'ended', endedAt: s.today })
      return after(write('runs', { ...base(uuid()), ondaId: content.id, lengthDays, startedAt: s.today, endedAt: null, intention, state: 'active', snapshot: snapshotOf(content) }))
    },
    endOnda(runId) {
      const r = get().runs.find((x) => x.id === runId)
      if (r) write('runs', { ...r, state: 'ended', endedAt: get().today })
    },
    togglePractice(runId, practiceId, date) {
      const s = get()
      const d = date ?? s.today
      const id = detId('practice', runId, practiceId, d)
      const prev = s.practiceLogs.find((p) => p.id === id)
      const done = !(prev && live(prev) && prev.done)
      write('practiceLogs', { ...(prev ?? base(id)), runId, practiceId, date: d, done, at: now().toISOString(), deletedAt: null })
      mirrorToLagos(runId, practiceId, d, done)
      after(null)
    },
    toggleItem(collection, runId, itemId, date) {
      const s = get()
      const d = date ?? s.today
      const id = detId(collection, runId, itemId, d)
      const prev = s[collection].find((p) => p.id === id)
      write(collection, { ...(prev ?? base(id)), runId, itemId, date: d, done: !(prev && live(prev) && prev.done), deletedAt: null })
    },
    toggleImmerse(runId, itemId) {
      const s = get()
      const id = detId('immerse', runId, itemId)
      const prev = s.immerseLogs.find((p) => p.id === id)
      after(write('immerseLogs', { ...(prev ?? base(id)), runId, itemId, doneAt: prev && live(prev) && prev.doneAt ? null : now().toISOString(), deletedAt: null }))
    },
    saveJournal(runId, day, prompt, text) {
      const id = detId('journal', runId, day)
      const prev = get().journal.find((j) => j.id === id)
      after(write('journal', { ...(prev ?? base(id)), runId, day, prompt, text, at: prev?.at ?? now().toISOString(), deletedAt: null }))
    },
    completeOnda(runId, answers, keptPracticeIds) {
      const s = get()
      const run = s.runs.find((r) => r.id === runId)
      if (!run) return 0
      const kept = (run.snapshot?.practices ?? []).filter((p) => keptPracticeIds.includes(p.id))
      for (const p of kept) {
        write('lagos', { ...base(uuid()), name: p.name, icon: p.icon, why: `Carried forward from ${run.snapshot?.name ?? 'an Onda'}.`, lengthDays: 30, frequency: 'daily', reminder: { on: true, time: p.time }, origin: `onda:${run.ondaId}`, startedAt: s.today, endedAt: null })
      }
      write('reflections', { ...base(detId('reflection', runId)), runId, answers, kept: kept.map((p) => p.id), at: now().toISOString() })
      write('runs', { ...run, state: 'complete', endedAt: s.today })
      return after(kept.length)
    },
    saveCustomOnda(content) {
      const prev = get().customOndas.find((c) => c.id === content.id)
      write('customOndas', { ...(prev ?? base(content.id)), content, deletedAt: null })
    },

    exportAll() {
      const s = get()
      return {
        app: 'onda',
        formatVersion: 1,
        exportedAt: now().toISOString(),
        user: s.user,
        ...Object.fromEntries((Object.keys(EMPTY) as (keyof Lists)[]).map((k) => [k, (s[k] as BaseRecord[]).filter(live)])),
      }
    },
    async importAll(raw) {
      const d = raw as Record<string, unknown> | null
      if (!d || typeof d !== 'object' || d.app !== 'onda') throw new Error('not-onda-file')
      if (typeof d.formatVersion !== 'number' || d.formatVersion > 1) throw new Error('unsupported-version')
      const { SCHEMAS } = await import('./schemas')
      let imported = 0
      let skipped = 0
      for (const c of COLLECTIONS) {
        const rows = c === 'user' ? (d.user ? [d.user] : []) : Array.isArray(d[c]) ? (d[c] as unknown[]) : []
        const ok: Tables[typeof c][] = []
        for (const row of rows) {
          const p = SCHEMAS[c].safeParse(row)
          if (!p.success) {
            skipped++
            continue
          }
          if (c === 'user') {
            // A file never changes what this account has paid for.
            const mine = get().user
            ok.push({ ...(p.data as User), id: 'me', plus: mine?.plus ?? 'none', trialStartedAt: mine?.trialStartedAt ?? null } as Tables[typeof c])
          } else ok.push(p.data)
        }
        if (!ok.length) continue
        await get().applyRemote(c, ok as never)
        // Queue for upload when a sync server is configured
        if (backendConfigured) await db.outbox.bulkAdd(ok.map((r) => ({ collection: c, id: (r as BaseRecord).id })))
        imported += ok.length
      }
      set({ today: todayStr(), dirty: get().dirty + 1 })
      evaluate()
      return { imported, skipped }
    },
    async resetAll() {
      await db.transaction('rw', db.tables, async () => {
        for (const t of db.tables) if (t.name !== 'meta') await t.clear()
      })
      set({ ...EMPTY, user: null, unlockQueue: [] })
      write('user', newUser(get().deviceId))
    },
  }
})

