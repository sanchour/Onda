import { beforeEach, describe, expect, it } from 'vitest'
import { OndaContentSchema, type OndaContent } from '@/content/schema'
import { OndaDB, db, useDatabase } from '@/data/db'
import { lagoStats } from '@/data/derive/lago'
import { useStore } from '@/data/store'
import { TODAY } from './helpers'

const content = (id: string, name: string): OndaContent =>
  OndaContentSchema.parse({
    id,
    name,
    origin: 'Test',
    tone: 'blue',
    icon: 'bank',
    line: 'A line.',
    practices: [
      { id: 'p1', name: 'Morning practice', icon: 'sun-horizon', slot: 'Morning', time: '07:00', meta: 'Morning' },
      { id: 'p2', name: 'Evening practice', icon: 'moon', slot: 'Evening', time: '21:00', meta: 'Evening' },
    ],
    rules: [{ id: 'r1', text: 'One rule' }],
    words: [{ id: 'word-a', term: 'Logos', meaning: 'Reason' }],
    immerse: { eat: [{ id: 'eat-a', title: 'Bread' }] },
    reflect: ['What changed?'],
  })

let n = 0
beforeEach(async () => {
  useDatabase(new OndaDB(`onda-test-${++n}`))
  useStore.setState({ ready: false, user: null, lagos: [], checkIns: [], runs: [], practiceLogs: [], ruleLogs: [], taskLogs: [], immerseLogs: [], journal: [], reflections: [], achievements: [], customOndas: [], unlockQueue: [], dirty: 0 })
  await useStore.getState().init()
})
const s = () => useStore.getState()
const input = { name: 'Walk', icon: 'drop', why: '', lengthDays: 30, frequency: 'daily' as const, reminder: { on: true, time: '08:00' } }
const flush = () => new Promise((r) => setTimeout(r, 30))

describe('store: Lagos', () => {
  it('creates a user with default settings on first launch', () => {
    expect(s().user).toMatchObject({ id: 'me', plus: 'none' })
    expect(s().user!.settings).toMatchObject({ onboarded: false, themeMode: 'auto', defaultOndaLength: 14 })
  })
  it('creates a Lago starting today and checks in idempotently', () => {
    const l = s().createLago(input)
    expect(l.startedAt).toBe(TODAY)
    s().checkIn(l.id, { status: 'done' })
    s().checkIn(l.id, { status: 'done', note: 'felt good' })
    expect(s().checkIns).toHaveLength(1)
    expect(s().checkIns[0]).toMatchObject({ date: TODAY, status: 'done', note: 'felt good' })
    expect(lagoStats(l, s().checkIns, TODAY).doneToday).toBe(true)
  })
  it('toggling today checks in, then undoes, then checks in again on the same record', () => {
    const l = s().createLago(input)
    s().toggleCheckInToday(l.id)
    expect(lagoStats(l, s().checkIns, TODAY).doneToday).toBe(true)
    s().toggleCheckInToday(l.id)
    expect(lagoStats(l, s().checkIns, TODAY).doneToday).toBe(false)
    s().toggleCheckInToday(l.id)
    expect(s().checkIns).toHaveLength(1)
    expect(lagoStats(l, s().checkIns, TODAY).doneToday).toBe(true)
  })
  it('extend, end, duplicate, delete and restore', () => {
    const l = s().createLago(input)
    s().extendLago(l.id, 7)
    expect(s().lagos[0]!.lengthDays).toBe(37)
    s().duplicateLago(l.id)
    expect(s().lagos).toHaveLength(2)
    s().endLago(l.id)
    expect(s().lagos.find((x) => x.id === l.id)!.endedAt).toBe(TODAY)
    s().deleteLago(l.id)
    expect(s().lagos.find((x) => x.id === l.id)!.deletedAt).toBeTypeOf('number')
    s().restoreLago(l.id)
    expect(s().lagos.find((x) => x.id === l.id)!.deletedAt).toBeNull()
  })
  it('restart ends the old experiment and begins a fresh one', () => {
    const l = s().createLago(input)
    s().restartLago(l.id)
    expect(s().lagos).toHaveLength(2)
    expect(s().lagos.filter((x) => !x.endedAt)).toHaveLength(1)
  })
  it('stamps per-field clocks on every write', () => {
    const l = s().createLago(input)
    s().updateLago(l.id, { name: 'Walk further' })
    const saved = s().lagos[0]!
    expect(saved._f!.name).toBeGreaterThanOrEqual(saved._f!.icon!)
    expect(saved.deviceId).toBe(s().deviceId)
  })
  it('persists to IndexedDB and reloads', async () => {
    const l = s().createLago(input)
    s().checkIn(l.id, { status: 'done' })
    await flush()
    expect(await db.lagos.count()).toBe(1)
    useStore.setState({ lagos: [], checkIns: [], ready: false })
    await s().init()
    expect(s().lagos).toHaveLength(1)
    expect(s().checkIns).toHaveLength(1)
  })
})

describe('store: Ondas', () => {
  it('only one Onda runs at a time: beginning another ends the current one', () => {
    const a = s().beginOnda(content('stoic', 'Stoicism'), 14)
    const b = s().beginOnda(content('zen', 'Zen Buddhism'), 7)
    const runs = s().runs
    expect(runs.filter((r) => r.state === 'active').map((r) => r.id)).toEqual([b.id])
    expect(runs.find((r) => r.id === a.id)).toMatchObject({ state: 'ended', endedAt: TODAY })
    expect(b.snapshot!.practices.map((p) => p.id)).toEqual(['p1', 'p2'])
    expect(b.snapshot!.immerse.map((m) => m.kind)).toEqual(['eat', 'words'])
  })
  it('toggles practices, rules and immersion', () => {
    const r = s().beginOnda(content('stoic', 'Stoicism'), 14)
    s().togglePractice(r.id, 'p1')
    s().toggleItem('ruleLogs', r.id, 'r1')
    s().toggleImmerse(r.id, 'word-a')
    expect(s().practiceLogs[0]).toMatchObject({ done: true, date: TODAY })
    expect(s().ruleLogs[0]!.done).toBe(true)
    expect(s().immerseLogs[0]!.doneAt).toBeTruthy()
    s().togglePractice(r.id, 'p1')
    s().toggleImmerse(r.id, 'word-a')
    expect(s().practiceLogs).toHaveLength(1)
    expect(s().practiceLogs[0]!.done).toBe(false)
    expect(s().immerseLogs[0]!.doneAt).toBeNull()
  })
  it('saves one journal entry per day', () => {
    const r = s().beginOnda(content('stoic', 'Stoicism'), 14)
    s().saveJournal(r.id, 1, 'Prompt', 'first')
    s().saveJournal(r.id, 1, 'Prompt', 'edited')
    expect(s().journal).toHaveLength(1)
    expect(s().journal[0]!.text).toBe('edited')
  })
  it('completing an Onda saves the reflection and carries kept practices forward as Lagos', () => {
    const r = s().beginOnda(content('stoic', 'Stoicism'), 14)
    const kept = s().completeOnda(r.id, [{ prompt: 'What changed?', text: 'A lot' }], ['p2'])
    expect(kept).toBe(1)
    expect(s().runs[0]).toMatchObject({ state: 'complete', endedAt: TODAY })
    expect(s().reflections[0]).toMatchObject({ runId: r.id, kept: ['p2'] })
    expect(s().lagos).toHaveLength(1)
    expect(s().lagos[0]).toMatchObject({ name: 'Evening practice', origin: 'onda:stoic', lengthDays: 30, startedAt: TODAY })
  })
  it('unlocks achievements as they are earned, once', () => {
    const l = s().createLago(input)
    s().checkIn(l.id, { status: 'done' })
    expect(s().achievements.map((a) => a.key)).toContain('firstStep')
    expect(s().unlockQueue).toContain('firstStep')
    s().toggleCheckInToday(l.id)
    s().toggleCheckInToday(l.id)
    expect(s().achievements.filter((a) => a.key === 'firstStep')).toHaveLength(1)
    s().beginOnda(content('stoic', 'Stoicism'), 14)
    expect(s().achievements.map((a) => a.key)).toContain('firstOnda')
  })
  it('exports everything live and resets to a clean account', async () => {
    const l = s().createLago(input)
    s().deleteLago(l.id)
    s().createLago({ ...input, name: 'Read' })
    const dump = s().exportAll() as { lagos: unknown[]; formatVersion: number }
    expect(dump.formatVersion).toBe(1)
    expect(dump.lagos).toHaveLength(1)
    await s().resetAll()
    expect(s().lagos).toEqual([])
    expect(s().user!.settings.onboarded).toBe(false)
  })
  it('merges remote records without clobbering newer local fields', async () => {
    const l = s().createLago(input)
    const local = s().lagos[0]!
    await s().applyRemote('lagos', [{ ...local, name: 'Remote name', why: 'remote why', updatedAt: local.updatedAt + 5, deviceId: 'zzz', _f: { ...local._f, name: local._f!.name! - 1, why: local._f!.why! + 5 } }])
    expect(s().lagos[0]).toMatchObject({ id: l.id, name: 'Walk', why: 'remote why' })
  })
})
