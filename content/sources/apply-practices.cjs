// Onda 6.0: writes each Onda's twenty practices and thirty Immerse practices from content/practices/<id>.cjs into content/ondas/<id>.json.
//   node content/sources/apply-practices.cjs [id ...]      (no ids: every Onda that has a practices file)
//
// A practices file exports { morning, afternoon, evening, special, immerse }:
//   morning, afternoon, evening: six rows each:  [name, icon, minutes, time, instructions, why, [three variations], opts?]
//   special: two rows:  [name, icon, minutes, time, when, instructions, why, [three variations], opts?]
//   immerse: thirty rows, three for each of read, watch, listen, art, eat, drink, customs, games, travel, words:
//            [kind, itemTitle, name, text, minutes?]    itemTitle is the title in the Onda's own lists (for words, the term)
//   opts: { id } keeps the id of a practice that existed before 6.0 so past ticks still count; { action: 'journal' | 'philosophy' }
// Every rule below throws, so a weak or broken entry stops the build.
const fs = require('fs')
const path = require('path')
const root = path.join(__dirname, '..', '..')
const NL = String.fromCharCode(10)
const curl = (v) => (typeof v === 'string' ? v.replace(/'/g, '\u2019') : v)
const slug = (s) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70)
const norm = (s) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\u2018\u2019']/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const icons = new Set([...fs.readFileSync(path.join(root, 'app/src/ui/icons.ts'), 'utf8').matchAll(/^\s+'?([a-z0-9-]+)'?:\s*\[/gm)].map((m) => m[1]))
const KINDS = ['read', 'watch', 'listen', 'art', 'eat', 'drink', 'customs', 'games', 'travel', 'words']
const SLOTS = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' }
const COUNTS = { morning: 6, afternoon: 6, evening: 6, special: 2, immerse: 30 }

function practiceDir() { return path.join(root, 'content', 'practices') }

function build(id, src, c) {
  const fail = (m) => { throw new Error(`${id}: ${m}`) }
  for (const [k, n] of Object.entries(COUNTS)) if ((src[k] ?? []).length !== n) fail(`${k} has ${(src[k] ?? []).length} entries, needs ${n}`)
  const practices = []
  const text = (label, s, min, max) => {
    if (typeof s !== 'string' || s.length < min || s.length > max) fail(`${label} must be ${min} to ${max} characters, is ${typeof s === 'string' ? s.length : s}: ${String(s).slice(0, 60)}`)
    if (/!/.test(s)) fail(`${label} has an exclamation mark: ${s.slice(0, 60)}`)
    if (/\u2014|\u2013 /.test(s)) fail(`${label} has a dash used as punctuation: ${s.slice(0, 60)}`)
    if (/  /.test(s)) fail(`${label} has a double space: ${s.slice(0, 60)}`)
    if (/[\u{1F300}-\u{1FAFF}]/u.test(s)) fail(`${label} has an emoji`)
  }
  for (const key of ['morning', 'afternoon', 'evening', 'special']) {
    for (const row of src[key]) {
      const special = key === 'special'
      const [name, icon, minutes, time, ...rest] = row
      const when = special ? rest.shift() : undefined
      const [how, why, vars, opts = {}] = rest
      text(`${key} name`, name, 4, 70)
      if (!icons.has(icon)) fail(`${name}: unknown icon ${icon}`)
      if (!(minutes >= 1 && minutes <= 120)) fail(`${name}: minutes ${minutes}`)
      if (!/^\d\d:\d\d$/.test(time)) fail(`${name}: time ${time}`)
      if (special) text(`${name} when`, when, 3, 40)
      text(`${name} instructions`, how, 140, 650)
      text(`${name} why`, why, 60, 340)
      if (!Array.isArray(vars) || vars.length !== 3) fail(`${name}: needs three variations`)
      for (const v of vars) text(`${name} variation`, v, 15, 150)
      const meta = `${special ? when : SLOTS[key]} \u00B7 ${minutes} min`
      practices.push({ id: opts.id ?? slug(name), name: curl(name), icon, slot: special ? 'Special' : SLOTS[key], time, minutes, meta: curl(meta), instructions: curl(how), why: curl(why), variations: vars.map(curl), ...(opts.action ? { action: opts.action } : {}) })
    }
  }
  const ids = practices.map((p) => p.id)
  if (new Set(ids).size !== ids.length) fail('duplicate practice ids: ' + ids.filter((x, i) => ids.indexOf(x) !== i).join(', '))
  const names = practices.map((p) => norm(p.name))
  if (new Set(names).size !== names.length) fail('duplicate practice names')

  // Immerse practices: each kind has three, each item is used once
  const lookup = {
    read: c.immerse.read, watch: c.immerse.watch, listen: c.immerse.listen, art: c.immerse.art, eat: c.immerse.eat, drink: c.immerse.drink,
    customs: c.immerse.customs, games: c.immerse.games, travel: [...c.immerse.festivals, ...c.immerse.places],
    words: c.words.map((w) => ({ id: w.id, title: w.term })),
  }
  const immersePlan = []
  for (const [kind, title, name, textLine, minutes] of src.immerse) {
    if (!KINDS.includes(kind)) fail(`immerse: unknown kind ${kind}`)
    const hit = lookup[kind].find((it) => norm(it.title) === norm(title))
    if (!hit) fail(`immerse ${kind}: "${title}" is not in this Onda's ${kind} list. Choices: ${lookup[kind].map((i) => i.title).join(' | ')}`)
    text(`immerse ${title} name`, name, 8, 70)
    text(`immerse ${title} text`, textLine, 60, 330)
    immersePlan.push({ kind, item: hit.id, name: curl(name), text: curl(textLine), ...(minutes ? { minutes } : {}) })
  }
  for (const k of KINDS) if (immersePlan.filter((e) => e.kind === k).length !== 3) fail(`immerse needs three ${k} practices`)
  const items = immersePlan.map((e) => e.item)
  if (new Set(items).size !== items.length) fail('an Immerse item is used twice')
  return { practices, immersePlan }
}

/** Applies a practices file to an Onda's content object, if it has one. Returns true when it did. */
function applyTo(c) {
  const file = path.join(practiceDir(), c.id + '.cjs')
  if (!fs.existsSync(file)) return false
  const { practices, immersePlan } = build(c.id, require(file), c)
  c.practices = practices
  c.immersePlan = immersePlan
  c.tasks = []
  return true
}
module.exports = { applyTo, build }

if (require.main === module) {
  const only = process.argv.slice(2)
  const dir = path.join(root, 'content', 'ondas')
  const files = fs.existsSync(practiceDir()) ? fs.readdirSync(practiceDir()).filter((f) => f.endsWith('.cjs')).map((f) => f.replace('.cjs', '')) : []
  let n = 0
  for (const id of files.filter((f) => !only.length || only.includes(f))) {
    const c = JSON.parse(fs.readFileSync(path.join(dir, id + '.json'), 'utf8'))
    applyTo(c)
    fs.writeFileSync(path.join(dir, id + '.json'), JSON.stringify(c, null, 2) + NL)
    n++
    console.log(id, 'ok:', c.practices.length, 'practices,', c.immersePlan.length, 'immerse practices')
  }
  console.log('applied to', n, 'Ondas')
}
