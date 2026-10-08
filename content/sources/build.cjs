// Expands the compact Onda sources in this folder into content/ondas/*.json and adds games, festivals and places to the older sixteen.
const fs = require('fs')
const path = require('path')
const root = 'C:/Users/sande/Claude AI/Claude Code/Ondas'
const dir = path.join(root, 'content/ondas')

const curl = (v) => (typeof v === 'string' ? v.replace(/'/g, '\u2019') : v)
const slug = (s) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70)
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== ''))
const PREFIX = { festivals: 'fest', places: 'place' }

const item = (kind) => (a) => {
  const travel = kind === 'festivals' || kind === 'places'
  const [title, creator, y, w, u] = travel ? [a[0], a[1], undefined, a[2], a[3]] : a
  return clean({ id: `${PREFIX[kind] ?? kind}-${slug(title)}`, title: curl(title), creator: curl(creator) ?? '', year: y || undefined, why: curl(w) ?? '', unverified: u || undefined })
}
const immerse = (im) => Object.fromEntries(['read', 'watch', 'listen', 'art', 'eat', 'drink', 'customs', 'games', 'festivals', 'places'].map((k) => [k, (im[k] ?? []).map(item(k))]))
const quote = (q) => clean({ text: curl(q[0]), by: curl(q[1]), source: curl(q[2]) ?? '', unverified: q[3] || undefined })
const idea = (a) => clean({ title: curl(a[0]), text: curl(a[1]), practice: curl(a[2]) })

function build(s) {
  const g = s.guide
  const c = {
    version: 1,
    id: s.id, name: s.name, origin: s.origin, era: s.era, tone: s.tone, icon: s.icon, font: s.font, pattern: s.pattern, glyph: s.glyph, line: curl(s.line),
    quote: quote(s.quote),
    quotes: s.quotes.map(quote),
    words: s.words.map((w) => clean({ id: `word-${slug(w[0])}`, term: w[0], meaning: curl(w[1]), pronunciation: w[2], language: w[3], usage: curl(w[4]), unverified: w[5] || undefined })),
    practices: s.practices.map(([id, name, icon, slot, time, minutes, instructions, why, variations]) => ({ id, name: curl(name), icon, slot, time, minutes, meta: `${slot} · ${minutes} min`, instructions: curl(instructions), why: curl(why), variations: variations.map(curl) })),
    tasks: s.tasks.map(([name, meta, time, slot, action]) => clean({ id: (action ? 'task-' : '') + slug(name), name: curl(name), meta: curl(meta), time, slot, action })),
    rules: s.rules.map(([text, why], i) => ({ id: `r${i + 1}`, text: curl(text), why: curl(why) })),
    immerse: immerse(s.immerse),
    ethics: s.ethics.map(idea),
    philosophy: s.philosophy.map(idea),
    journal: s.journal.map(curl),
    reflect: s.reflect.map(curl),
    dayThemes: s.dayThemes.map(curl),
    guide: {
      intro: g.intro.map(curl),
      origin: curl(g.origin),
      era: curl(g.era),
      figures: g.figures.map(([name, dates, bio]) => ({ name, dates, bio: curl(bio) })),
      history: g.history.map(([when, what, detail]) => ({ when, what: curl(what), detail: curl(detail) })),
      concepts: g.concepts.map(([term, text, detail]) => ({ term: curl(term), text: curl(text), detail: curl(detail) })),
      facts: g.facts.map((f) => ({ text: curl(f) })),
      glossary: g.glossary.map(([term, meaning]) => ({ term, meaning: curl(meaning) })),
      furtherReading: g.furtherReading.map(([title, creator, year, note]) => clean({ title: curl(title), creator, year, note: curl(note) })),
      learnFrom: g.learnFrom.map(([name, note, link]) => clean({ name: curl(name), note: curl(note), link })),
      sources: g.sources.map(([title, creator, publisher, year]) => clean({ title: curl(title), creator, publisher, year })),
    },
    sensitivity: { note: curl(s.sensitivity.note), requiredCaveats: s.sensitivity.caveats.map(curl), reviewRequired: !!s.sensitivity.review },
  }
  // ids must be unique within an Onda: a second use of the same slug gets a number
  const seen = new Map()
  for (const x of [...c.words, ...Object.values(c.immerse).flat()]) {
    const n = (seen.get(x.id) ?? 0) + 1
    seen.set(x.id, n)
    if (n > 1) x.id = x.id + '-' + n
  }
  return c
}

const ORDER = 'norse cynic confucian abbasid twenties cuba hindu mahayana theravada shinto jain sikh zoroaster judaism christian sunni shia rasta discordia plato epicurus cyrenaic kant nietzsche freud existential gandhi rome qing mongol ottoman mughal johor inca habsburg hre sixties renaissance maasai aboriginal frisian polynesia melanesia micronesia zulu bantu khmer celtic'.split(' ')
const only = process.argv.slice(2)
const NL = String.fromCharCode(10)
const built = []
for (const id of ORDER) {
  const file = path.join(__dirname, 'onda-' + id + '.cjs')
  if (!fs.existsSync(file)) continue
  const c = build(require(file))
  if (c.id !== id) throw new Error('id mismatch in ' + file)
  built.push(c)
  if (only.length && !only.includes(id)) continue
  fs.writeFileSync(path.join(dir, id + '.json'), JSON.stringify(c, null, 2) + NL)
  const n = (a) => a.length
  const im = c.immerse
  console.log(id, 'words', n(c.words), 'journal', n(c.journal), 'themes', n(c.dayThemes), 'hist', n(c.guide.history), 'conc', n(c.guide.concepts), 'fig', n(c.guide.figures), 'intro', c.guide.intro.join(' ').split(/\s+/).length, 'prac', n(c.practices), 'tasks', n(c.tasks), 'rules', n(c.rules), 'quotes', n(c.quotes), 'imm', Object.keys(im).map((k) => n(im[k])).join('/'), 'src', n(c.guide.sources), 'kb', Math.round(JSON.stringify(c).length / 1024))
}
const indexFile = path.join(root, 'content/index.json')
const old = JSON.parse(fs.readFileSync(indexFile, 'utf8')).filter((o) => !ORDER.includes(o.id))
const index = [...old, ...built.map((c) => ({ id: c.id, name: c.name, origin: c.origin, tone: c.tone, icon: c.icon, line: c.line }))]
fs.writeFileSync(indexFile, JSON.stringify(index, null, 2) + NL)
console.log('index:', index.length, 'missing:', ORDER.filter((id) => !built.some((c) => c.id === id)).join(' '))
