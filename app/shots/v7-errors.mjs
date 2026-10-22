// Loads the demo and prints page errors and console errors, then whether the Ondas tab and browse render.
//   node shots/v7-errors.mjs
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { devices, webkit } from '@playwright/test'

const here = path.dirname(fileURLToPath(import.meta.url))
const port = 4280 + Math.floor(Math.random() * 30)
const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { cwd: path.join(here, '..'), shell: true, stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await sleep(6000)
const browser = await webkit.launch()
const page = await (await browser.newContext({ ...devices['iPhone 15 Pro'] })).newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 300)))
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)) })
try {
  await page.goto(`http://localhost:${port}/?seed=demo`)
  await sleep(8000)
  console.log('immerse button:', await page.getByRole('button', { name: 'Immerse', exact: true }).count())
  await page.getByRole('button', { name: 'Browse Ondas' }).first().click().catch((e) => console.log('NOBROWSE', String(e).slice(0, 120)))
  await sleep(3000)
  console.log('tiles:', await page.getByRole('button', { name: /Zen Buddhism/ }).count())
} finally { await browser.close(); server.kill(); process.exit(0) }
