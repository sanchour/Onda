import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { KIND_ICON, MEDIA_KINDS, ONDA_INDEX, mediaFor } from '@/content'
import { COMING_SOON } from '@/content/browse'
import { TASK_ACTIONS, type OndaContent } from '@/content/schema'
import { THEMES, ondaLook } from '@/content/themes'
import { SettingsSchema } from '@/data/schemas'
import { contrast } from '@/lib/color'
import { ICONS } from '@/ui/icons'

const dir = path.resolve(__dirname, '../../../content/ondas')
const all = ONDA_INDEX.map((o) => [o.id, JSON.parse(fs.readFileSync(path.join(dir, `${o.id}.json`), 'utf8')) as OndaContent] as const)

describe('3.0: games and travel in every Onda', () => {
  it.each(all)('%s lists games, festivals and places, each with a note', (_id, c) => {
    expect(c.immerse.games.length).toBeGreaterThanOrEqual(3)
    expect(c.immerse.festivals.length).toBeGreaterThanOrEqual(3)
    expect(c.immerse.places.length).toBeGreaterThanOrEqual(4)
    for (const it of [...c.immerse.games, ...c.immerse.festivals, ...c.immerse.places]) {
      expect(it.creator.length, it.title).toBeGreaterThan(2) // kind and maker, when, or where
      expect(it.why.length, it.title).toBeGreaterThan(30)
    }
  })
  it('shows festivals and places together as Travel, and games as their own kind', () => {
    const [, stoic] = all[0]!
    const media = mediaFor(stoic)
    expect(media.filter((m) => m.kind === 'travel')).toHaveLength(stoic.immerse.festivals.length + stoic.immerse.places.length)
    expect(media.filter((m) => m.kind === 'games')).toHaveLength(stoic.immerse.games.length)
    expect(media.find((m) => m.title === 'Saturnalia')?.meta).toBe('17 December and the days after')
    for (const k of MEDIA_KINDS) expect(ICONS, k).toHaveProperty(KIND_ICON[k])
    expect(TASK_ACTIONS).toEqual(expect.arrayContaining(['games', 'travel']))
  })
})

describe('3.0: the six new Ondas', () => {
  const fresh = ['norse', 'cynic', 'confucian', 'abbasid', 'twenties', 'cuba']
  it('each has its own colours, face, ornament and shape', () => {
    const others = Object.keys(THEMES).filter((id) => !fresh.includes(id))
    for (const id of fresh) {
      const t = THEMES[id]!
      for (const o of [...others, ...fresh.filter((x) => x !== id)]) {
        expect(t.light.accent, `${id} vs ${o}`).not.toBe(THEMES[o]!.light.accent)
        expect(t.light.paper, `${id} vs ${o}`).not.toBe(THEMES[o]!.light.paper)
        expect(t.font, `${id} vs ${o}`).not.toBe(THEMES[o]!.font)
        expect(t.ornament, `${id} vs ${o}`).not.toBe(THEMES[o]!.ornament)
      }
    }
  })
  it.each(fresh)('%s text stays readable in light and dark', (id) => {
    for (const dark of [false, true]) {
      const v = ondaLook({ id, tone: 'blue' }, { themed: true, dark }).vars as Record<string, string>
      expect(contrast(v['--onda-ink']!, v['--onda-solid']!), 'ink on fill').toBeGreaterThanOrEqual(7)
      expect(contrast(v['--onda-on']!, v['--onda-deep']!), 'text on accent').toBeGreaterThanOrEqual(4.5)
      expect(contrast(v['--onda-text']!, v['--onda-solid']!), 'accent text on fill').toBeGreaterThanOrEqual(4.5)
    }
  })
  it('are no longer placeholders, and the 7.2 placeholders are listed', () => {
    const names = COMING_SOON.map((c) => c.name)
    for (const n of ['Norse', 'Confucianism', 'Abbasid Caliphate', 'The 1920s', 'Traditional Cuban', 'Diogenes and the Cynics']) expect(names).not.toContain(n)
    for (const n of ['Rumi', 'Spinoza', 'Orwell', 'Abyssinia', 'Bedouin', 'Druidism']) expect(names).toContain(n)
  })
  it.each(all.filter(([id]) => fresh.includes(id)))('%s has eight or more tasks, with a shortcut on at least five', (_id, c) => {
    if (c.immersePlan.length >= 30) {
      // 6.0: the practices replace the old tasks
      expect(c.practices.length).toBeGreaterThanOrEqual(20)
      expect(c.practices.some((p) => p.action === 'journal')).toBe(true)
    } else {
      expect(c.tasks.length).toBeGreaterThanOrEqual(8)
      expect(c.tasks.filter((t) => t.action).length).toBeGreaterThanOrEqual(5)
      expect(c.tasks.some((t) => t.action === 'journal')).toBe(true)
      expect(c.tasks.some((t) => t.action === 'philosophy')).toBe(true)
    }
    expect(c.rules).toHaveLength(6)
    expect(c.quotes.length).toBeGreaterThanOrEqual(4)
  })
})

describe('3.0: shell', () => {
  it('appearance follows the phone by default', () => {
    expect(SettingsSchema.parse({}).themeMode).toBe('auto')
  })
  it('the Lagos tab uses the soft wave', () => {
    expect(ICONS).toHaveProperty('wave-soft')
    expect(ICONS['wave-soft'][1]).toContain('stroke-linecap="round"')
  })
  it('index.html applies the saved background before the first paint', () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8')
    expect(html).toContain("localStorage.getItem(d ? 'onda.bg.dark' : 'onda.bg.light')")
    expect(html).toContain("root.style.setProperty('--surface-grouped', bg)")
    // 5.0: an opaque bar coloured from theme-color; the translucent style left a pale strip in dark mode
    expect(html).toContain('name="apple-mobile-web-app-status-bar-style" content="default"')
    expect(html).not.toContain('black-translucent')
    expect(html).toContain("document.querySelector('meta[name=theme-color]').setAttribute('content', bg)")
  })
})
