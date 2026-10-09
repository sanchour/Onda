import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ONDA_INDEX, mediaFor } from '@/content'
import { linksFor, makerName } from '@/content/links'
import { OndaContentSchema, type OndaContent } from '@/content/schema'
import { hasPlus, plusState } from '@/data/entitlement'
import { PLAN_MAX, planForDay, planSize } from '@/data/derive/plan'

const dir = path.resolve(__dirname, '../../../content/ondas')
const load = (id: string): OndaContent => OndaContentSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, `${id}.json`), 'utf8')))
const all = ONDA_INDEX.map((o) => [o.id, load(o.id)] as const)

describe('5.2: the day’s practices', () => {
  it.each(all)('%s has five practices every day for thirty days, the last about taking the world in', (_id, c) => {
    const days = Array.from({ length: 30 }, (_, i) => planForDay(c, i + 1))
    for (const [i, plan] of days.entries()) {
      expect(plan.length, `day ${i + 1}`).toBe(PLAN_MAX)
      expect(new Set(plan.map((p) => p.id)).size, `day ${i + 1} ids`).toBe(plan.length)
      expect(plan[plan.length - 1]!.kind).toBe('immerse')
      expect(plan.filter((p) => p.kind === 'immerse')).toHaveLength(1)
      for (const p of plan) {
        expect(p.name.length).toBeGreaterThan(1)
        expect(p.icon.length).toBeGreaterThan(0)
      }
      // the first four run through the day in order
      const times = plan.slice(0, -1).map((p) => p.time)
      expect([...times].sort()).toEqual(times)
    }
    // a morning, an afternoon and an evening practice on day one
    const slots = new Set(days[0]!.map((p) => p.slot))
    for (const s of ['Morning', 'Afternoon', 'Evening', 'Immerse']) expect(slots.has(s as never), s).toBe(true)
    expect(planSize(c)).toBe(PLAN_MAX)
  })

  it.each(all)('%s is a little different every day', (_id, c) => {
    const key = (d: number) => planForDay(c, d).map((p) => `${p.id}|${p.twist ?? ''}`).join('#')
    for (let d = 1; d < 30; d++) expect(key(d), `day ${d} and ${d + 1}`).not.toBe(key(d + 1))
    // over two weeks a person meets many more than five different things
    const seen = new Set<string>()
    for (let d = 1; d <= 14; d++) for (const p of planForDay(c, d)) seen.add(`${p.id}|${p.twist ?? ''}`)
    expect(seen.size).toBeGreaterThanOrEqual(30)
  })

  it('is the same on every device, shows a practice as written first, and brings its variations later', () => {
    const stoic = load('stoic')
    expect(planForDay(stoic, 3)).toEqual(planForDay(stoic, 3))
    expect(planForDay(stoic, 1).filter((p) => p.kind === 'practice').every((p) => !p.twist)).toBe(true)
    const twists = new Set<string>()
    for (let d = 1; d <= 30; d++) for (const p of planForDay(stoic, d)) if (p.twist) twists.add(p.twist)
    // the morning anchor is Stoicism's first morning practice; every variation of it turns up within thirty days
    const anchor = stoic.practices.find((p) => p.slot === 'Morning')!
    expect(anchor.variations.every((v) => twists.has(v))).toBe(true)
  })

  it.each(all)('%s has a thread: its core practice for each time of day returns most days, and something else on the rest', (_id, c) => {
    const days = Array.from({ length: 30 }, (_, i) => planForDay(c, i + 1))
    for (const slot of ['Morning', 'Afternoon', 'Evening']) {
      const first = [...c.practices.filter((p) => p.slot === slot), ...c.tasks.filter((t) => t.slot === slot && !['read', 'watch', 'listen', 'art', 'eat', 'drink', 'customs', 'games', 'travel'].includes(t.action ?? ''))][0]!
      const shown = days.filter((d) => d.some((p) => p.id === first.id)).length
      expect(shown, slot + ' anchor ' + first.name).toBeGreaterThanOrEqual(17)
      expect(shown, slot + ' anchor ' + first.name).toBeLessThanOrEqual(24)
    }
  })

  it.each(all)('%s offers at least ten different practices and tasks, not counting Immerse, within two weeks', (_id, c) => {
    const names = new Set<string>()
    for (let d = 1; d <= 14; d++) for (const p of planForDay(c, d)) if (p.kind !== 'immerse') names.add(p.id)
    expect(names.size).toBeGreaterThanOrEqual(10)
  })

  it.each(all)('%s has at least five things for each time of day to rotate through', (_id, c) => {
    const MEDIA = ['read', 'watch', 'listen', 'art', 'eat', 'drink', 'customs', 'games', 'travel']
    for (const slot of ['Morning', 'Afternoon', 'Evening']) {
      const n = c.practices.filter((p) => p.slot === slot).length + c.tasks.filter((t) => t.slot === slot && !MEDIA.includes(t.action ?? '')).length
      expect(n, slot).toBeGreaterThanOrEqual(5)
    }
  })

  it('logs a variation under the practice’s own id, so keeping it as a Lago still works', () => {
    const zen = load('zen')
    const ids = new Set(zen.practices.map((p) => p.id))
    for (let d = 1; d <= 30; d++) for (const p of planForDay(zen, d)) if (p.kind === 'practice') expect(ids.has(p.id)).toBe(true)
  })

  it('leaves food and drink out of the immerse practice when the setting is off', () => {
    const cuba = load('cuba')
    for (let d = 1; d <= 30; d++) {
      const im = planForDay(cuba, d, { includeFood: false }).find((p) => p.kind === 'immerse')!
      expect(['eat', 'drink']).not.toContain(im.lead ?? im.action)
    }
  })

  it('keeps an Onda the user made exactly as they wrote it', () => {
    const mine = OndaContentSchema.parse({ id: 'mine', name: 'Mine', origin: '', tone: 'blue', icon: 'drop', line: '', custom: true, practices: Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, icon: 'drop', slot: 'Morning', time: '08:00', meta: '' })) })
    expect(planForDay(mine, 9).map((p) => p.id)).toEqual(['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6'])
  })

  it.each(all)('%s carries its four small pleasures', (_id, c) => {
    const treats = c.tasks.filter((t) => t.id.startsWith('treat-'))
    expect(treats).toHaveLength(4)
    for (const t of treats) {
      expect(t.action).toBeUndefined()
      expect(`${t.name} ${t.meta}`).not.toMatch(/!/)
    }
  })
})

describe('5.2: finding a book, a film or a song', () => {
  it('offers a search on a fitting service for every kind, and nothing else', () => {
    const stoic = load('stoic')
    const media = mediaFor(stoic)
    const one = (kind: string) => media.find((m) => m.kind === kind)!
    expect(linksFor(one('listen')).map((l) => l.label)).toEqual(['Spotify', 'Apple Music', 'YouTube'])
    expect(linksFor(one('watch')).map((l) => l.label)).toContain('YouTube')
    expect(linksFor(one('read')).map((l) => l.label)).toContain('Open Library')
    expect(linksFor(media.find((m) => m.id.startsWith('place-'))!).map((l) => l.label)).toContain('Maps')
    expect(linksFor(media.find((m) => m.id.startsWith('fest-'))!).map((l) => l.label)).not.toContain('Maps')
    for (const m of media) for (const l of linksFor(m)) expect(l.url).toMatch(/^https:\/\/[a-z.]+\/[^ ]*$/)
  })

  it('builds the search from the title and a real name only', () => {
    expect(makerName('Marcus Aurelius, trans. Gregory Hays')).toBe('Marcus Aurelius')
    expect(makerName('Wim Wenders')).toBe('Wim Wenders')
    expect(makerName('Greek and Roman staple')).toBe('')
    expect(makerName('Any unabridged recording')).toBe('')
    expect(makerName('For a full day')).toBe('')
    expect(makerName('')).toBe('')
    const url = linksFor({ id: 'listen-x', kind: 'listen', title: 'Flowing Water (Liu Shui)', meta: '', why: '', creator: 'Guan Pinghu, guqin' })[0]!.url
    expect(url).toBe('https://open.spotify.com/search/Flowing%20Water%20Guan%20Pinghu')
  })
})

describe('5.2: Ondas+ has a monthly plan', () => {
  it('unlocks everything for a subscriber, as it does for a lifetime owner', () => {
    expect(hasPlus(plusState({ plus: 'monthly', trialStartedAt: null }, Date.now()))).toBe(true)
    expect(plusState({ plus: 'monthly', trialStartedAt: '2020-01-01T00:00:00Z' }, Date.now())).toEqual({ tier: 'monthly' })
    expect(hasPlus(plusState({ plus: 'none', trialStartedAt: '2020-01-01T00:00:00Z' }, Date.now()))).toBe(false)
  })
})
