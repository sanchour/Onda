import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ONDA_INDEX, loadOnda } from '@/content'
import { OndaContentSchema, OndaIndexSchema } from '@/content/schema'

const dir = path.resolve(__dirname, '../../../content/ondas')

// The app no longer runs zod over shipped content at launch (it was the heaviest start-up cost), so these must hold.
describe('shipped content can be trusted at runtime', () => {
  it('the index equals its own schema parse', () => {
    expect(JSON.parse(JSON.stringify(OndaIndexSchema.array().parse(ONDA_INDEX)))).toEqual(JSON.parse(JSON.stringify(ONDA_INDEX)))
  })
  it.each(ONDA_INDEX.map((o) => o.id))('%s already has every default filled (run npm run content:normalize if this fails)', async (id) => {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, `${id}.json`), 'utf8'))
    expect(JSON.parse(JSON.stringify(OndaContentSchema.parse(raw)))).toEqual(raw)
    expect(await loadOnda(id)).toEqual(raw)
  })
})
