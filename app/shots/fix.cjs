const fs = require('fs')
let t = fs.readFileSync('src/lib/ids.ts', 'utf8')
const bad = '[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']'
const bs = String.fromCharCode(92)
t = t.split(bad).join('[' + bs + 'u0300-' + bs + 'u036f]')
fs.writeFileSync('src/lib/ids.ts', t)
console.log(t.split('\n')[19])
