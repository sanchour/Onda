// Prints what an Onda already has, to write its 6.0 practices from.  node content/sources/show.cjs <id>
const fs = require('fs')
const path = require('path')
const id = process.argv[2]
const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ondas', id + '.json'), 'utf8'))
console.log(`# ${c.name} (${c.id}) | ${c.origin} | ${c.era} | ${c.line}`)
if (c.sensitivity) console.log(`SENSITIVITY${c.sensitivity.reviewRequired ? ' (living people)' : ''}: ${c.sensitivity.note}`)
console.log('\nPRACTICES BEFORE 6.0 (keep these ids where you reuse them):')
for (const p of c.practices) console.log(`- [${p.id}] ${p.name} | ${p.slot} ${p.time} ${p.minutes}min | ${p.instructions} | WHY ${p.why} | VAR ${p.variations.join(' / ')}`)
console.log('\nRULES: ' + c.rules.map((r) => r.text).join(' | '))
console.log('\nDAY THEMES: ' + c.dayThemes.slice(0, 12).join(' | '))
for (const k of ['read', 'watch', 'listen', 'art', 'eat', 'drink', 'customs', 'games', 'festivals', 'places']) {
  console.log(`\n${k.toUpperCase()} (${c.immerse[k].length}):`)
  for (const i of c.immerse[k]) console.log(`- ${i.title} | ${i.creator}${i.year ? ', ' + i.year : ''} | ${i.why.slice(0, 130)}`)
}
console.log('\nWORDS (' + c.words.length + '): ' + c.words.map((w) => `${w.term} = ${w.meaning.slice(0, 40)}`).join(' | '))
console.log('\nOTHER TASKS: ' + c.tasks.filter((t) => !t.action).map((t) => t.name).join(' | '))
