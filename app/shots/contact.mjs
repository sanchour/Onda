// Lays the PNGs of a shots folder out as one contact sheet, for a quick look at many screens at once.
//   node shots/contact.mjs <dir> [columns] [filter]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { webkit } from '@playwright/test'

const here = path.dirname(fileURLToPath(import.meta.url))
const dir = path.resolve(here, process.argv[2] ?? '')
const cols = Number(process.argv[3] ?? 6)
const filter = new RegExp(process.argv[4] ?? '.')
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png') && !f.startsWith('contact') && filter.test(f)).sort()
const w = 260
const html = `<body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(${cols},${w}px);gap:6px;padding:6px;font:11px sans-serif">${files
  .map((f) => `<figure style="margin:0"><img src="data:image/png;base64,${fs.readFileSync(path.join(dir, f)).toString("base64")}" style="width:${w}px;display:block"><figcaption>${f}</figcaption></figure>`)
  .join('')}</body>`
const page = await (await webkit.launch()).newPage({ viewport: { width: cols * (w + 6) + 6, height: 600 } })
await page.setContent(html)
await page.waitForLoadState('load')
await page.screenshot({ path: path.join(dir, 'contact.png'), fullPage: true })
console.log(files.length, 'images')
process.exit(0)
