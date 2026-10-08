import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ONDA_INDEX, mediaFor } from '@/content'
import { OndaContentSchema, SHIPPED_MINIMUMS, type OndaContent } from '@/content/schema'
import { THEMES } from '@/content/themes'
import { ICONS } from '@/ui/icons'

const dir = path.resolve(__dirname, '../../../content/ondas')
const load = (id: string): OndaContent => OndaContentSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, `${id}.json`), 'utf8')))
const all = ONDA_INDEX.map((o) => [o.id, load(o.id)] as const)

describe('Onda content', () => {
  it('ships exactly the twenty-two Ondas, each with a file and a theme', () => {
    expect(ONDA_INDEX.map((o) => o.id)).toEqual(['stoic', 'zen', 'tao', 'tibet', 'vedanta', 'jung', 'animism', 'ubuntu', 'sufi', 'transc', 'soviet', 'yoruba', 'aztec', 'egypt', 'hermes', 'gnostic', 'norse', 'cynic', 'confucian', 'abbasid', 'twenties', 'cuba'])
    expect(fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()).toEqual(ONDA_INDEX.map((o) => `${o.id}.json`).sort())
    for (const o of ONDA_INDEX) expect(THEMES[o.id], o.id).toBeDefined()
  })

  it.each(all)('%s matches its index entry', (id, c) => {
    const idx = ONDA_INDEX.find((o) => o.id === id)!
    expect({ id: c.id, name: c.name, origin: c.origin, tone: c.tone, icon: c.icon, line: c.line }).toEqual({ id: idx.id, name: idx.name, origin: idx.origin, tone: idx.tone, icon: idx.icon, line: idx.line })
  })

  it.each(all)('%s meets the depth bar', (_id, c) => {
    expect(c.words.length).toBeGreaterThanOrEqual(SHIPPED_MINIMUMS.words)
    expect(c.journal.length).toBeGreaterThanOrEqual(SHIPPED_MINIMUMS.journal)
    expect(c.reflect.length).toBeGreaterThanOrEqual(SHIPPED_MINIMUMS.reflect)
    expect(c.dayThemes.length).toBe(SHIPPED_MINIMUMS.dayThemes)
    expect(c.practices.length).toBeGreaterThanOrEqual(SHIPPED_MINIMUMS.practices)
    expect(c.rules.length).toBeGreaterThanOrEqual(SHIPPED_MINIMUMS.rules)
    expect(c.guide.history.length).toBeGreaterThanOrEqual(SHIPPED_MINIMUMS.history)
    expect(c.guide.concepts.length).toBeGreaterThanOrEqual(SHIPPED_MINIMUMS.concepts)
    // "several hundred words of introduction"
    expect(c.guide.intro.join(' ').split(/\s+/).length).toBeGreaterThanOrEqual(300)
    expect(c.guide.sources.length).toBeGreaterThanOrEqual(5)
    expect(c.guide.figures.length).toBeGreaterThanOrEqual(8)
    expect(c.quote).not.toBeNull()
  })

  it.each(all)('%s is complete: every practice, rule, word and item is filled in', (_id, c) => {
    for (const p of c.practices) {
      expect(p.instructions.length, p.name).toBeGreaterThan(80)
      expect(p.why.length, p.name).toBeGreaterThan(40)
      expect(p.variations.length, p.name).toBeGreaterThanOrEqual(2)
    }
    for (const r of c.rules) expect(r.why.length, r.text).toBeGreaterThan(20)
    for (const w of c.words) expect(w.meaning.length && (w.language ?? '').length, w.term).toBeGreaterThan(0)
    // The first ten carry every kind; the newer six list only what can be stood behind (some kinds are legitimately empty).
    const original = ['stoic', 'zen', 'tao', 'tibet', 'vedanta', 'jung', 'animism', 'ubuntu', 'sufi', 'transc', 'norse', 'cynic', 'confucian', 'abbasid', 'twenties', 'cuba'].includes(c.id)
    for (const kind of ['read', 'watch', 'listen', 'art', 'eat', 'drink', 'customs'] as const) {
      if (original) expect(c.immerse[kind].length, kind).toBeGreaterThanOrEqual(kind === 'watch' ? 2 : 3)
      else if (c.immerse[kind].length === 0) continue
      for (const it of c.immerse[kind]) expect(it.why.length, it.title).toBeGreaterThan(10)
    }
    for (const h of c.guide.history) expect(h.detail.length, h.when).toBeGreaterThan(30)
    for (const k of c.guide.concepts) expect(k.detail.length, k.term).toBeGreaterThan(40)
    for (const e of [...c.philosophy, ...c.ethics]) expect(e.practice, e.title).toBeTruthy()
  })

  it.each(all)('%s has unique, stable ids and known icons', (_id, c) => {
    const ids = [...c.practices, ...c.tasks, ...c.rules, ...mediaFor(c)].map((x) => x.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of c.practices) expect(ICONS, `${p.name}: ${p.icon}`).toHaveProperty(p.icon)
    expect(ICONS).toHaveProperty(c.icon)
    expect(new Set(c.journal).size).toBe(c.journal.length)
    expect(new Set(c.dayThemes).size).toBe(c.dayThemes.length)
  })

  it.each(all)('%s follows the voice: no exclamation marks in our own copy, no emoji', (_id, c) => {
    // Quotations keep their author's punctuation; everything we wrote does not shout.
    const { quote: _q, quotes: _qs, ...own } = c
    // Titles of works are proper names and keep their punctuation.
    const text = JSON.stringify(own).replaceAll('Amandla! A Revolution in Four-Part Harmony', '')
    expect(text).not.toContain('!')
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it('traditions that need cultural care carry a framing note, caveats and community sources, and are flagged for review', () => {
    for (const id of ['animism', 'ubuntu', 'tibet', 'sufi', 'soviet', 'yoruba', 'aztec', 'gnostic', 'norse', 'confucian', 'abbasid', 'cuba']) {
      const c = load(id)
      expect(c.sensitivity, id).toBeDefined()
      expect(c.sensitivity!.reviewRequired, id).toBe(true)
      expect(c.sensitivity!.note.length, id).toBeGreaterThan(80)
      expect(c.sensitivity!.requiredCaveats.length, id).toBeGreaterThanOrEqual(3)
      expect(c.guide.learnFrom.length, id).toBeGreaterThanOrEqual(3)
    }
    // No closed ceremony is offered as a practice.
    const animism = load('animism')
    const offered = JSON.stringify([animism.practices, animism.tasks, animism.immerse]).toLowerCase()
    for (const closed of ['smudg', 'sweat lodge', 'vision quest', 'peace pipe', 'spirit animal', 'white sage']) expect(offered, closed).not.toContain(closed)
  })
})
