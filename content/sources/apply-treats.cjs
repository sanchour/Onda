// Adds the small pleasures in treats.cjs to every content/ondas/<id>.json as plain tasks (no action), replacing any added before.
// build.cjs does the same when it rebuilds an Onda from its source, so the two never disagree.
//   node content/sources/apply-treats.cjs
const fs = require('fs')
const path = require('path')
const TREATS = require('./treats.cjs')
const dir = path.join(__dirname, '..', 'ondas')
const NL = String.fromCharCode(10)
const curl = (v) => v.replace(/'/g, '’')
const slug = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
const TIME = { Morning: '08:30', Afternoon: '15:30', Evening: '19:30' }

const DAILY_TIME = { Morning: '07:15', Afternoon: '14:00', Evening: '20:30' }
const dailiesFor = (id) => (require('./dailies.cjs')[id] ?? []).map(([name, slot, note]) => ({ id: 'daily-' + slug(name), name: curl(name), meta: curl(note), time: DAILY_TIME[slot], slot }))
const treatsFor = (id) => (TREATS[id] ?? []).map(([name, slot, note]) => ({ id: 'treat-' + slug(name), name: curl(name), meta: curl(note), time: TIME[slot], slot }))
module.exports = { treatsFor, dailiesFor }

if (require.main === module) {
  let n = 0
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const id = file.replace('.json', '')
    const c = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
    const add = [...treatsFor(id), ...dailiesFor(id)]
    if (!add.length) {
      console.log('no treats for', id)
      continue
    }
    c.tasks = [...c.tasks.filter((t) => !t.id.startsWith('treat-') && !t.id.startsWith('daily-')), ...add]
    const ids = c.tasks.map((t) => t.id)
    if (new Set(ids).size !== ids.length) throw new Error('duplicate task id in ' + id)
    fs.writeFileSync(path.join(dir, file), JSON.stringify(c, null, 2) + NL)
    n++
  }
  console.log('treats added to', n, 'Ondas')
}
