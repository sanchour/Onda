// Screenshots every Onda cover, group by group, as the All Ondas grid shows them.
//   node shots/v7-covers.mjs <outDir> [light|dark]
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { devices, webkit } from '@playwright/test'

const here = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(here, process.argv[2] ?? 'v7-covers')
const scheme = process.argv[3] ?? 'light'
fs.mkdirSync(out, { recursive: true })
const port = 4310 + Math.floor(Math.random() * 30)
const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort', ...(process.env.DIST ? ['--outDir', process.env.DIST] : [])], { cwd: path.join(here, '..'), shell: true, stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await sleep(6000)
const browser = await webkit.launch()
const page = await (await browser.newContext({ ...devices['iPhone 15 Pro'], colorScheme: scheme })).newPage()
const scroll = (y) => page.evaluate((dy) => { const els = [...document.querySelectorAll('.scroll')]; els[els.length - 1].scrollTop = dy }, y)
try {
  await page.goto(`http://localhost:${port}/?seed=demo`)
  await page.getByRole('button', { name: 'Browse Ondas' }).first().click({ timeout: 90_000 })
  await sleep(2500)
  for (const g of ['Religions', 'Philosophies', 'States', 'Cultures']) {
    await page.getByRole('tab', { name: g, exact: true }).click()
    await sleep(1500)
    for (const [i, y] of [[1, 0], [2, 640], [3, 1280], [4, 1920]]) {
      await scroll(y)
      await sleep(600)
      await page.screenshot({ path: path.join(out, `${scheme}-${g}-${i}.png`), scale: 'css' })
    }
  }
} catch (e) {
  console.log('FAIL', String(e).slice(0, 200))
} finally {
  await browser.close()
  server.kill()
  process.exit(0)
}
