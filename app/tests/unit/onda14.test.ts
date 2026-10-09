import fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { ONDA_INDEX } from '@/content'
import { hasV6Plan } from '@/data/derive/plan'
import { OndaContentSchema, type OndaContent } from '@/content/schema'
import { OndaDB, useDatabase } from '@/data/db'
import { useStore } from '@/data/store'
import { detId } from '@/lib/ids'

const dir = path.resolve(__dirname, '../../../content/ondas')
const load = (id: string): OndaContent => OndaContentSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, `${id}.json`), 'utf8')))
const all = ONDA_INDEX.map((o) => [o.id, load(o.id)] as const)

describe('1.4 content: practices and tasks', () => {
  it.each(all)('%s has at least five practices and a well rounded task list', (_id, c) => {
    if (hasV6Plan(c)) {
      expect(c.practices.length).toBe(20)
      for (const p of c.practices) expect(p.instructions.length, `${c.id}/${p.id}`).toBeGreaterThan(80)
      return
    }
    expect(c.practices.length).toBeGreaterThanOrEqual(5)
    expect(c.tasks.length).toBeGreaterThanOrEqual(8)
    const actions = new Set(c.tasks.map((t) => t.action))
    expect(actions.has('journal')).toBe(true)
    expect(actions.has('philosophy')).toBe(true)
    expect(c.tasks.some((t) => t.action === 'read' || t.name.startsWith('Read'))).toBe(true)
    expect(c.tasks.filter((t) => !t.action).length).toBeGreaterThanOrEqual(3) // the original tasks stay
    for (const p of c.practices) expect(p.instructions.length, `${c.id}/${p.id}`).toBeGreaterThan(80)
  })
})

describe('Lagos linked to Onda practices share one tick', () => {
  let n = 0
  beforeEach(async () => {
    useDatabase(new OndaDB(`onda-link-${++n}`))
    useStore.setState({ ready: false, user: null, lagos: [], checkIns: [], runs: [], practiceLogs: [] })
    await useStore.getState().init()
  })
  const setup = () => {
    const s = useStore.getState()
    const run = s.beginOnda(load('stoic'), 14)
    const p = run.snapshot!.practices[0]!
    const lago = s.createLago({ name: p.name, icon: p.icon, why: '', lengthDays: 30, frequency: 'daily', reminder: { on: true, time: p.time }, link: { runId: run.id, practiceId: p.id } })
    return { run, p, lago }
  }
  const lagoDone = (id: string) => useStore.getState().checkIns.some((c) => c.lagoId === id && c.date === useStore.getState().today && c.status === 'done' && !c.deletedAt)
  const pracDone = (runId: string, pid: string) => {
    const st = useStore.getState()
    const l = st.practiceLogs.find((x) => x.id === detId('practice', runId, pid, st.today))
    return !!l && !l.deletedAt && l.done
  }

  it('ticking the practice ticks the Lago, and unticking clears it', () => {
    const { run, p, lago } = setup()
    useStore.getState().togglePractice(run.id, p.id)
    expect(lagoDone(lago.id)).toBe(true)
    useStore.getState().togglePractice(run.id, p.id)
    expect(lagoDone(lago.id)).toBe(false)
  })
  it('checking in the Lago ticks the practice, and undoing clears it', () => {
    const { run, p, lago } = setup()
    useStore.getState().checkIn(lago.id, { status: 'done' })
    expect(pracDone(run.id, p.id)).toBe(true)
    useStore.getState().toggleCheckInToday(lago.id)
    expect(lagoDone(lago.id)).toBe(false)
    expect(pracDone(run.id, p.id)).toBe(false)
  })
  it('does not touch other practices or unlinked Lagos', () => {
    const { run, p } = setup()
    const other = run.snapshot!.practices[1]!
    const plain = useStore.getState().createLago({ name: 'Plain', icon: 'drop', why: '', lengthDays: 30, frequency: 'daily', reminder: { on: false, time: '08:00' } })
    useStore.getState().togglePractice(run.id, p.id)
    expect(pracDone(run.id, other.id)).toBe(false)
    expect(lagoDone(plain.id)).toBe(false)
  })
})
