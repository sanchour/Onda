// Rewrites every shipped Onda file with its schema defaults filled in. The app trusts shipped content at runtime
// (no zod parse on launch), and a unit test checks that each file already equals its own parse.
//   npm run content:normalize
import fs from 'node:fs'
import { isDeepStrictEqual } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { OndaContentSchema } from '../src/content/schema.ts'

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../content/ondas')
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const file = path.join(dir, f)
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
  const parsed = OndaContentSchema.parse(raw)
  // compare by value: key order does not matter
  if (!isDeepStrictEqual(JSON.parse(JSON.stringify(parsed)), raw)) {
    fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + '\n')
    console.log('normalized', f)
  }
}
