import { beforeEach, describe, expect, it } from 'vitest'
import { numeral } from '@/content/numerals'
import { OndaDB, useDatabase as setDatabase } from '@/data/db'
import { useStore } from '@/data/store'
import { accentFor, contrast } from '@/lib/color'

describe('Greek numerals', () => {
  it('writes alphabetic numerals with the keraia', () => {
    expect([1, 6, 10, 15, 21, 99].map((n) => numeral('greek', n))).toEqual(['αʹ', 'ϛʹ', 'ιʹ', 'ιεʹ', 'καʹ', 'ϟθʹ'])
  })
})

describe('accent from the Onda colour', () => {
  const strongs = ['#5B6F8F', '#6F6C5C', '#4C8A78', '#C26A2C', '#D9663F', '#6F63C2', '#A8613A', '#C9962A', '#2E8C94', '#4F8A3D', '#B3261E', '#343C99', '#9E2A5B', '#8F6A12', '#1D7A55', '#7A4A66']
  it('keeps white text readable on every light-mode accent', () => {
    for (const c of strongs) {
      const { accent, on } = accentFor(c, false)
      expect(on).toBe('#FFFFFF')
      expect(contrast(accent, '#FFFFFF'), c).toBeGreaterThanOrEqual(4.5)
    }
  })
  it('picks readable text on dark-mode accents', () => {
    for (const c of ['#8EA3C6', '#E2B84B', '#4FC08B', '#F0705F', '#C48AAA']) {
      const { accent, on } = accentFor(c, true)
      expect(accent).toBe(c)
      expect(contrast(accent, on), c).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('export and import', () => {
  let n = 0
  const fresh = async () => {
    setDatabase(new OndaDB(`onda-backup-${++n}`))
    useStore.setState({ ready: false, user: null, lagos: [], checkIns: [], runs: [], practiceLogs: [], ruleLogs: [], taskLogs: [], immerseLogs: [], journal: [], reflections: [], achievements: [], customOndas: [], unlockQueue: [], dirty: 0 })
    await useStore.getState().init()
  }
  const input = { name: 'Walk', icon: 'drop', why: '', lengthDays: 30, frequency: 'daily' as const, reminder: { on: true, time: '08:00' } }

  beforeEach(fresh)

  it('round-trips Lagos and check ins onto a clean device', async () => {
    const lago = useStore.getState().createLago(input)
    useStore.getState().toggleCheckInToday(lago.id)
    const file = JSON.parse(JSON.stringify(useStore.getState().exportAll()))
    await fresh()
    expect(useStore.getState().lagos).toHaveLength(0)
    const res = await useStore.getState().importAll(file)
    expect(res.skipped).toBe(0)
    expect(res.imported).toBeGreaterThan(1)
    expect(useStore.getState().lagos.map((l) => l.name)).toEqual(['Walk'])
    expect(useStore.getState().checkIns).toHaveLength(1)
  })

  it('is idempotent: importing twice does not duplicate', async () => {
    useStore.getState().createLago(input)
    const file = JSON.parse(JSON.stringify(useStore.getState().exportAll()))
    await useStore.getState().importAll(file)
    await useStore.getState().importAll(file)
    expect(useStore.getState().lagos).toHaveLength(1)
  })

  it('rejects files that are not Onda exports, and newer formats', async () => {
    await expect(useStore.getState().importAll({ hello: 'world' })).rejects.toThrow('not-onda-file')
    await expect(useStore.getState().importAll(null)).rejects.toThrow('not-onda-file')
    await expect(useStore.getState().importAll({ app: 'onda', formatVersion: 99 })).rejects.toThrow('unsupported-version')
  })

  it('skips malformed records and never imports someone else’s subscription', async () => {
    const file = { app: 'onda', formatVersion: 1, user: { id: 'me', updatedAt: 1, deviceId: 'x', name: 'Imported', createdAt: '2026-01-01', plus: 'lifetime', trialStartedAt: null, settings: {} }, lagos: [{ id: 'bad' }] }
    const res = await useStore.getState().importAll(file)
    expect(res.skipped).toBe(1)
    expect(useStore.getState().user?.plus).not.toBe('lifetime')
  })
})

describe('readable Onda colours (1.3.1)', () => {
  it('every Onda colour yields text that reads on its own tint and on the page, in both appearances', async () => {
    const { THEMES, ondaLook } = await import('@/content/themes')
    const { contrast } = await import('@/lib/color')
    for (const id of Object.keys(THEMES)) {
      for (const dark of [false, true]) {
        const v = ondaLook({ id, tone: 'blue' }, { themed: true, dark }).vars as Record<string, string>
        const page = dark ? '#303136' : '#F5F1E8'
        expect(contrast(v['--onda-text']!, page), `${id} text on page ${dark}`).toBeGreaterThanOrEqual(4.5)
        expect(contrast(v['--onda-text']!, v['--onda-solid']!), `${id} text on tint ${dark}`).toBeGreaterThanOrEqual(4.5)
        expect(contrast(v['--onda-on']!, v['--onda-deep']!), `${id} ink on fill ${dark}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})
