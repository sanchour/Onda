// Prints what Ondas already have, to write their 6.0 practices from.  node content/sources/show.cjs <id> [id ...]
const fs = require('fs')
const path = require('path')
for (const id of process.argv.slice(2)) {
  const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ondas', id + '.json'), 'utf8'))
  console.log(`\n######## ${c.name} (${c.id}) | ${c.origin} | ${c.era} | ${c.line}`)
  if (c.sensitivity) console.log(`SENSITIVITY${c.sensitivity.reviewRequired ? ' (living people)' : ''}: ${c.sensitivity.note.slice(0, 260)}`)
  console.log('OLD PRACTICES (keep these ids where you reuse them):')
  for (const p of c.practices.filter((x) => !x.id.startsWith('treat-'))) console.log(`- [${p.id}] ${p.name} | ${p.slot} ${p.time} ${p.minutes ?? '?'}min | ${p.instructions.slice(0, 330)} | WHY ${p.why.slice(0, 150)} | VAR ${p.variations.join(' / ')}`)
  console.log('RULES: ' + c.rules.map((r) => r.text).join(' | '))
  for (const k of ['read', 'watch', 'listen', 'art', 'eat', 'drink', 'customs', 'games', 'festivals', 'places']) {
    console.log(`${k.toUpperCase()} (${c.immerse[k].length}): ` + c.immerse[k].map((i) => `${i.title} [${i.creator.slice(0, 38)}${i.year ? ', ' + i.year : ''}] ${i.why.slice(0, 70)}`).join(' || '))
  }
  console.log('WORDS (' + c.words.length + '): ' + c.words.map((w) => `${w.term}=${w.meaning.slice(0, 28)}`).join(' | '))
}
