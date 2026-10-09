// All the daily practices (5.2.1): dailies1.cjs and dailies2.cjs together.
const a = require('./dailies1.cjs')
const b = require('./dailies2.cjs')
const out = {}
for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) out[id] = [...(a[id] ?? []), ...(b[id] ?? [])]
module.exports = out
