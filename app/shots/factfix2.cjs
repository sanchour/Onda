const fs = require('fs')
const dir = process.argv[2]
let n = 0
for (const f of fs.readdirSync(dir).filter((x) => /^[a-z]+\.mjs$/.test(x) && x !== 'build.mjs')) {
  const p = `${dir}/${f}`
  const t = fs.readFileSync(p, 'utf8')
  const r = t.replace(/(I\('In Our Time[^']*', 'BBC Radio 4, Melvyn Bragg', )\d{4}(,)/g, (_, a, b) => { n++; return a + 'null' + b })
  if (r !== t) fs.writeFileSync(p, r)
}
console.log('In Our Time years removed:', n)

// Review header: describe the verification pass honestly
const hp = process.argv[3]
let h = fs.readFileSync(hp, 'utf8')
const a = h.indexOf('## How the content was written')
const b = h.indexOf('## What to review, in priority order')
h = h.slice(0, a) + `## How the content was written and checked

All ten Ondas were expanded from the first-draft \`onda-data.js\` by an AI model (Claude) from its knowledge of the published literature, then put through a fact-check pass (v1.1):

- Every date, attribution, work title, creator and year was reviewed claim by claim. Anything the reviewer could not stand behind was **removed**, not hedged: two Dalai Lama lines with no firm source, a Bashō line that is probably misattributed, a "chop wood, carry water" proverb with no traceable source, the "wound is the place where the Light enters you" line (a known misattribution to Rumi), a Jung "slipped up" remark, and several films, albums and paintings whose year or existence could not be confirmed. Years for BBC *In Our Time* episodes were dropped because they could not be confirmed.
- A small number of claims were checked against live web sources: the first written use of "ubuntu" (1846, per Christian Gade), the nine remaining Potawatomi speakers in *Braiding Sweetgrass*, Yvonne Mokgoro's dates, the year of Yungchen Lhamo's *Tibet, Tibet* (1996) and Jung's 1933 role in the International General Medical Society for Psychotherapy. Two were corrected as a result.
- **Everything else rests on the author's knowledge and has not been confirmed against a source.** The \`sources\` lists name the standard works the content is consistent with; they are a reading list for the reviewer, not citations that were looked up. Items the author was actively unsure about are marked \`unverified: true\`, listed per Onda below, and labelled "Not yet verified" in the app. A missing flag means "the author was confident", which is weaker than "checked".

` + h.slice(b)
fs.writeFileSync(hp, h)
