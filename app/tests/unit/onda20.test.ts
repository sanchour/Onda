import { describe, expect, it } from 'vitest'
import { BROWSE_GROUPS, COMING_SOON, GROUP_OF } from '@/content/browse'
import { ONDA_INDEX } from '@/content'
import { SettingsSchema } from '@/data/types'
import { contrast, mix } from '@/lib/color'

describe('Browse Ondas groups', () => {
  it('puts every shipped Onda in exactly one of the four groups', () => {
    expect(BROWSE_GROUPS).toHaveLength(4)
    for (const o of ONDA_INDEX) expect(BROWSE_GROUPS, o.id).toContain(GROUP_OF[o.id])
    expect(Object.keys(GROUP_OF).sort()).toEqual(ONDA_INDEX.map((o) => o.id).sort())
  })
  it('lists placeholders that are unique, grouped, and not shipped Ondas', () => {
    const names = COMING_SOON.map((c) => c.name)
    expect(new Set(names).size).toBe(names.length)
    for (const c of COMING_SOON) expect(BROWSE_GROUPS).toContain(c.group)
    for (const g of BROWSE_GROUPS) expect(COMING_SOON.some((c) => c.group === g)).toBe(true)
    expect(names).toEqual(expect.arrayContaining(['Nietzsche', 'Roman Empire', 'Maasai', 'Zoroastrianism', 'Islam: Sunni', 'Islam: Shia']))
  })
})

describe('Onda background wash', () => {
  it('blends two colours and stays light enough to keep text readable', () => {
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080')
    expect(mix('#F5F1E8', '#D5DCE8', 0.3)).toMatch(/^#[0-9A-F]{6}$/)
    // black text on the strongest light-mode wash (30% of the Onda tint over cream) still reads
    expect(contrast('#000000', mix('#F5F1E8', '#C2E4E5', 0.3))).toBeGreaterThan(14)
    // light text on the dark-mode wash
    expect(contrast('#F4F4F5', mix('#1B1C1F', '#46331D', 0.34))).toBeGreaterThan(12)
  })
  it('the tint is on by default and can be switched off', () => {
    expect(SettingsSchema.parse({}).ondaTint).toBe(true)
    expect(SettingsSchema.parse({ ondaTint: false }).ondaTint).toBe(false)
  })
})
