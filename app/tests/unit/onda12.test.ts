import { beforeEach, describe, expect, it } from 'vitest'
import { numeral } from '@/content/numerals'
import { ondaLook, THEMES } from '@/content/themes'
import { OndaDB, useDatabase } from '@/data/db'
import { useStore } from '@/data/store'
import { fitSize } from '@/lib/fit'
import { BETA_PAYMENTS, startCheckout } from '@/sync/entitlement'

describe('numerals', () => {
  it('writes Roman numerals', () => {
    expect([1, 4, 9, 14, 19, 29, 39].map((n) => numeral('roman', n))).toEqual(['I', 'IV', 'IX', 'XIV', 'XIX', 'XXIX', 'XXXIX'])
  })
  it('writes kanji numerals up to 99', () => {
    expect([1, 3, 10, 11, 20, 23, 99].map((n) => numeral('kanji', n))).toEqual(['一', '三', '十', '十一', '二十', '二十三', '九十九'])
  })
  it('maps digits for Devanagari, Tibetan and Arabic-Indic', () => {
    expect(numeral('devanagari', 12)).toBe('१२')
    expect(numeral('tibetan', 7)).toBe('༧')
    expect(numeral('arabic', 305 % 100)).toBe('٥')
  })
  it('falls back to plain digits outside the supported range', () => {
    expect(numeral('roman', 0)).toBe('0')
    expect(numeral('kanji', 100)).toBe('100')
    expect(numeral('latin', 5)).toBe('5')
  })
})

describe('per-Onda looks', () => {
  it('gives every shipped theme its own ornament and numerals', () => {
    const ids = Object.keys(THEMES)
    expect(ids.length).toBeGreaterThanOrEqual(22)
    expect(new Set(ids.map((id) => THEMES[id]!.ornament)).size).toBe(ids.length)
  })
  it('uses the tradition numerals when themed and plain ones when not', () => {
    expect(ondaLook({ id: 'stoic', tone: 'blue' }, { themed: true, dark: false }).numeral(3)).toBe('III')
    expect(ondaLook({ id: 'stoic', tone: 'blue' }, { themed: false, dark: false }).numeral(3)).toBe('3')
    expect(ondaLook({ id: 'my-own', tone: 'coral' }, { themed: true, dark: false }).numeral(3)).toBe('3')
  })
  it('sets shape variables for themed Ondas', () => {
    const sufi = ondaLook({ id: 'sufi', tone: 'blue' }, { themed: true, dark: false })
    expect(String(sufi.vars['--onda-clip' as keyof typeof sufi.vars])).toMatch(/^polygon/)
    const plain = ondaLook({ id: 'sufi', tone: 'blue' }, { themed: false, dark: false })
    expect(String(plain.vars['--onda-clip' as keyof typeof plain.vars])).toBe('none')
  })
})

describe('fitSize', () => {
  it('keeps the full size for short names', () => {
    expect(fitSize('Zen', 140, 22)).toBe(22)
  })
  it('shrinks to fit the longest word, never below the minimum', () => {
    const size = fitSize('Transcendentalism', 140, 22)
    expect(size).toBeLessThan(16)
    expect(size).toBeGreaterThanOrEqual(13)
    expect(fitSize('Transcendentalism', 60, 22, 13)).toBe(13)
  })
  it('allows more room per word than per letter: two short words keep their size', () => {
    expect(fitSize('Native American Animism', 140, 22)).toBe(22)
  })
  it('runs wider for capitals', () => {
    expect(fitSize('Individuation', 200, 30, 13, true)).toBeLessThan(fitSize('Individuation', 200, 30, 13, false))
  })
})

describe('Ondas+ beta placeholder', () => {
  let n = 0
  beforeEach(async () => {
    useDatabase(new OndaDB(`onda-beta-${++n}`))
    useStore.setState({ ready: false, user: null, lagos: [], checkIns: [], runs: [] })
    await useStore.getState().init()
  })
  it('is on unless the build says VITE_PAYMENTS=live', () => {
    expect(BETA_PAYMENTS).toBe(true)
  })
  it('Get Lifetime unlocks on the device without a backend', async () => {
    expect(useStore.getState().user?.plus).not.toBe('lifetime')
    expect(await startCheckout()).toBe('granted')
    expect(useStore.getState().user?.plus).toBe('lifetime')
  })
})
