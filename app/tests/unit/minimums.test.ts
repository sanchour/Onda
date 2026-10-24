import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ONDA_INDEX } from '@/content'
import { CONTENT_MINIMUMS, OndaContentSchema, contentGaps } from '@/content/schema'

const root = path.resolve(__dirname, '../../..')
const load = (id: string) => OndaContentSchema.parse(JSON.parse(fs.readFileSync(path.join(root, 'content/ondas', `${id}.json`), 'utf8')))
// the Ondas from before 8.1 that are still being filled in; the list only shrinks
const backfill: string[] = JSON.parse(fs.readFileSync(path.join(root, 'content/backfill.json'), 'utf8'))
const all = ONDA_INDEX.map((o) => [o.id, load(o.id)] as const)

describe('8.1 content minimums', () => {
  it('asks for at least the agreed amount of each kind', () => {
    expect(CONTENT_MINIMUMS).toMatchObject({ quotes: 7, wordsOfDay: 7, journal: 10, read: 8, watch: 6, listen: 7, art: 6, eat: 4, drink: 3, customs: 4, games: 2, travel: 5, glossary: 12, practices: 25, rules: 5, ethics: 5, think: 5 })
  })

  it('names only shipped Ondas on the backfill list', () => {
    for (const id of backfill) expect(ONDA_INDEX.some((o) => o.id === id), id).toBe(true)
  })

  it.each(all)('%s meets every minimum, or is still on the backfill list and short', (id, c) => {
    const gaps = contentGaps(c)
    if (backfill.includes(id)) expect(gaps.length, `${id} meets every minimum now: take it off content/backfill.json`).toBeGreaterThan(0)
    else expect(gaps, id).toEqual([])
  })
})
