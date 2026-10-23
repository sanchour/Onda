import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ONDA_INDEX } from '@/content'
import { ONDA_ORIGIN, placeAt } from '@/content/placeCoords'
import type { OndaContent } from '@/content/schema'

// 8.1: the maps pin every Onda's origin and each of its places to visit (content/placeCoords.ts)
const dir = path.resolve(__dirname, '../../../content/ondas')
const all = ONDA_INDEX.map((o) => [o.id, JSON.parse(fs.readFileSync(path.join(dir, `${o.id}.json`), 'utf8')) as OndaContent] as const)
// places that are anywhere, so they have no pin
const ANYWHERE = ['place-a-dark-sky-site-near-you', 'place-jain-center-of-greater-phoenix-oshwal-centre-and-others']

describe('map coordinates', () => {
  it.each(all)('%s has an origin and a pin for every place', (id, c) => {
    expect(ONDA_ORIGIN[id], id).toBeDefined()
    for (const p of c.immerse.places) {
      if (ANYWHERE.includes(p.id)) continue
      const at = placeAt(p.id)
      expect(at, `${id}: ${p.id}`).toBeDefined()
      expect(Math.abs(at![0])).toBeLessThanOrEqual(90)
      expect(Math.abs(at![1])).toBeLessThanOrEqual(180)
    }
  })
})
