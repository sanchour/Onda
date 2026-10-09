import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ONDA_INDEX, mediaFor } from '@/content'
import { OndaContentSchema, type OndaContent } from '@/content/schema'
import { hasV6Plan, planForDay } from '@/data/derive/plan'
import { ICONS } from '@/ui/icons'

const dir = path.resolve(__dirname, '../../../content/ondas')
const load = (id: string): OndaContent => OndaContentSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, `${id}.json`), 'utf8')))
const v6 = ONDA_INDEX.map((o) => [o.id, load(o.id)] as const).filter(([, c]) => hasV6Plan(c))
const KINDS = ['read', 'watch', 'listen', 'art', 'eat', 'drink', 'customs', 'games', 'travel', 'words']

describe('6.0: an Onda’s twenty practices and thirty Immerse practices', () => {
  it('at least one Onda has been written for it', () => expect(v6.length).toBeGreaterThan(0))

  it.each(v6)('%s has six morning, six afternoon, six evening and two special practices, each with a full how-to', (_id, c) => {
    const by = (s: string) => c.practices.filter((p) => p.slot === s)
    expect([by('Morning').length, by('Afternoon').length, by('Evening').length, by('Special').length]).toEqual([6, 6, 6, 2])
    expect(c.tasks).toEqual([])
    for (const p of c.practices) {
      expect(p.instructions.length, p.name).toBeGreaterThanOrEqual(140)
      expect(p.why.length, p.name).toBeGreaterThanOrEqual(60)
      expect(p.variations, p.name).toHaveLength(3)
      expect(ICONS, `${p.name}: ${p.icon}`).toHaveProperty(p.icon)
      expect(p.minutes, p.name).toBeGreaterThan(0)
      expect(p.meta, p.name).toContain(`${p.minutes} min`)
    }
    // a special has its own time of day in its meta, and the others name theirs
    for (const p of by('Special')) expect(p.meta).not.toMatch(/^(Morning|Afternoon|Evening) /)
    for (const s of ['Morning', 'Afternoon', 'Evening']) for (const p of by(s)) expect(p.meta.startsWith(s)).toBe(true)
  })

  it.each(v6)('%s has three Immerse practices for each of the ten kinds, on items it really lists', (_id, c) => {
    expect(c.immersePlan).toHaveLength(30)
    const media = mediaFor(c, { includeFood: true })
    for (const k of KINDS) expect(c.immersePlan.filter((e) => e.kind === k), k).toHaveLength(3)
    for (const e of c.immersePlan) {
      const m = media.find((x) => x.id === e.item)
      expect(m, e.name).toBeDefined()
      expect(m!.kind, e.name).toBe(e.kind)
      expect(e.text.length, e.name).toBeGreaterThanOrEqual(60)
    }
    expect(new Set(c.immersePlan.map((e) => e.item)).size).toBe(30)
    expect(new Set(c.immersePlan.map((e) => e.name)).size).toBe(30)
  })

  it.each(v6)('%s gives five different practices every day: Immerse first, then four from the day, never the same split two days running', (_id, c) => {
    let last = ''
    for (let d = 1; d <= 30; d++) {
      const plan = planForDay(c, d)
      expect(plan, `day ${d}`).toHaveLength(5)
      expect(plan[0]!.kind, `day ${d}`).toBe('immerse')
      expect(plan.slice(1).every((p) => p.kind === 'practice')).toBe(true)
      expect(new Set(plan.map((p) => p.id)).size).toBe(5)
      const rest = plan.slice(1)
      const times = rest.map((p) => p.time)
      expect([...times].sort(), `day ${d} is in clock order`).toEqual(times)
      const shape = ['Morning', 'Afternoon', 'Evening'].map((s) => rest.filter((p) => p.slot === s).length).join('')
      const special = rest.filter((p) => p.slot === 'Special').length
      if (d % 5 === 0) expect(special, `day ${d}`).toBe(1)
      else {
        expect(special, `day ${d}`).toBe(0)
        expect(['211', '121', '112']).toContain(shape)
        expect(shape, `day ${d}`).not.toBe(last)
        last = shape
      }
    }
  })

  it.each(v6)('%s works through all its Immerse practices in thirty days, one kind a day', (_id, c) => {
    const ids = new Set<string>()
    const kinds: string[] = []
    for (let d = 1; d <= 30; d++) {
      const im = planForDay(c, d)[0]!
      ids.add(im.id)
      kinds.push(im.item!.kind)
    }
    expect(ids.size).toBe(30)
    for (let d = 1; d < 30; d++) expect(kinds[d], `day ${d + 1}`).not.toBe(kinds[d - 1])
  })

  it.each(v6)('%s shows every one of its practices at least twice in thirty days, its core practices most often', (_id, c) => {
    const count = new Map<string, number>()
    for (let d = 1; d <= 30; d++) for (const p of planForDay(c, d).slice(1)) count.set(p.id, (count.get(p.id) ?? 0) + 1)
    for (const p of c.practices) expect(count.get(p.id) ?? 0, p.name).toBeGreaterThanOrEqual(2)
    for (const s of ['Morning', 'Afternoon', 'Evening']) {
      const [core, ...rest] = c.practices.filter((p) => p.slot === s)
      expect(count.get(core!.id)!, `${s} core`).toBeGreaterThan(Math.max(...rest.map((p) => count.get(p.id)!)))
    }
  })

  it.each(v6)('%s keeps food and drink out when that setting is off', (_id, c) => {
    for (let d = 1; d <= 30; d++) {
      const im = planForDay(c, d, { includeFood: false })[0]!
      expect(['eat', 'drink']).not.toContain(im.item!.kind)
    }
  })

  it.each(v6)('%s follows the voice: no exclamation marks or emoji in its practices', (_id, c) => {
    const text = JSON.stringify([c.practices, c.immersePlan])
    expect(text).not.toMatch(/!/)
    expect(text).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u)
  })
})
