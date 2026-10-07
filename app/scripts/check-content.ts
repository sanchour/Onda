// Validates /content against the schema and the depth bar, and regenerates CONTENT_REVIEW.md.
//   npm run content:check            validate only (used in CI)
//   npm run content:check -- --write also rewrite ../CONTENT_REVIEW.md
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { OndaContentSchema, OndaIndexSchema, SHIPPED_MINIMUMS, type OndaContent } from '../src/content/schema.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const dir = path.join(root, 'content/ondas')
const index = OndaIndexSchema.array().parse(JSON.parse(fs.readFileSync(path.join(root, 'content/index.json'), 'utf8')))

const problems: string[] = []
const review: string[] = []
const words = (s: string) => s.split(/\s+/).filter(Boolean).length

for (const entry of index) {
  const file = path.join(dir, `${entry.id}.json`)
  const parsed = OndaContentSchema.safeParse(JSON.parse(fs.readFileSync(file, 'utf8')))
  if (!parsed.success) {
    problems.push(`${entry.id}: schema: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`)
    continue
  }
  const c: OndaContent = parsed.data
  const need = (label: string, have: number, min: number) => have < min && problems.push(`${entry.id}: ${label} ${have} < ${min}`)
  need('words', c.words.length, SHIPPED_MINIMUMS.words)
  need('journal prompts', c.journal.length, SHIPPED_MINIMUMS.journal)
  need('reflection prompts', c.reflect.length, SHIPPED_MINIMUMS.reflect)
  need('day themes', c.dayThemes.length, SHIPPED_MINIMUMS.dayThemes)
  need('history entries', c.guide.history.length, SHIPPED_MINIMUMS.history)
  need('concepts', c.guide.concepts.length, SHIPPED_MINIMUMS.concepts)
  need('introduction words', words(c.guide.intro.join(' ')), 300)
  need('sources', c.guide.sources.length, 5)
  for (const k of ['name', 'origin', 'tone', 'icon', 'line'] as const) if (c[k] !== entry[k]) problems.push(`${entry.id}: index.json ${k} differs from the content file`)

  // Everything flagged unverified, for the human review list
  const flagged: string[] = []
  const flag = (kind: string, label: string, u?: boolean) => u && flagged.push(`- ${kind}: ${label}`)
  for (const q of [c.quote, ...c.quotes]) if (q) flag('Quote', `"${q.text}" (${q.by}; ${q.source})`, q.unverified)
  for (const w of c.words) flag('Word', `${w.term} (${w.language ?? ''}): spelling, meaning or pronunciation`, w.unverified)
  for (const [kind, items] of Object.entries(c.immerse)) for (const it of items) flag(`Immerse, ${kind}`, `${it.title} (${[it.creator, it.year].filter(Boolean).join(', ')})`, it.unverified)
  for (const f of c.guide.figures) flag('Figure', `${f.name}, ${f.dates}`, f.unverified)
  for (const h of c.guide.history) flag('History', `${h.when}: ${h.what}`, h.unverified)
  for (const f of c.guide.facts) flag('Fact', f.text, f.unverified)

  const total = words(JSON.stringify(c))
  review.push(`## ${c.name}\n`)
  review.push(`File: \`content/ondas/${c.id}.json\` · version ${c.version} · about ${Math.round(total / 100) * 100} words · ${c.words.length} words of vocabulary, ${c.journal.length} journal prompts, ${c.guide.history.length} history entries, ${c.guide.concepts.length} concepts, ${c.guide.sources.length} sources.\n`)
  if (c.sensitivity?.reviewRequired) {
    review.push(`**Needs review by tradition bearers before launch.** ${c.sensitivity.note}\n`)
    review.push('Caveats shown in the app:\n')
    review.push(...c.sensitivity.requiredCaveats.map((x) => `- ${x}`), '')
  } else if (c.sensitivity) {
    review.push(`Framing note shown in the app: ${c.sensitivity.note}\n`)
  }
  review.push(flagged.length ? `Marked \`unverified\` (${flagged.length}):\n` : 'Nothing is marked `unverified`.\n')
  review.push(...flagged, '')
}

if (process.argv.includes('--write')) {
  const head = fs.readFileSync(path.join(root, 'content/REVIEW_HEADER.md'), 'utf8')
  fs.writeFileSync(path.join(root, 'CONTENT_REVIEW.md'), `${head.trimEnd()}\n\n${review.join('\n').trimEnd()}\n`)
  console.log('wrote CONTENT_REVIEW.md')
}
if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}
console.log(`content ok: ${index.length} Ondas`)
