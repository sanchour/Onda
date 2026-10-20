// Screenshots of the Onda screens. Starts `vite preview`, drives WebKit at iPhone size.
//   node shots/v7-before.mjs [outDir] [light|dark]
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { devices, webkit } from '@playwright/test'

const here = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(here, process.argv[2] || 'v7-before')
const scheme = process.argv[3] === 'dark' ? 'dark' : 'light'
fs.mkdirSync(out, { recursive: true })
const port = 4180 + Math.floor(Math.random() * 40)
const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { cwd: path.join(here, '..'), shell: true, stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await sleep(3000)

const browser = await webkit.launch()
const ctx = await browser.newContext({ ...devices['iPhone 15 Pro'], colorScheme: scheme })
const page = await ctx.newPage()
const shot = async (name) => {
  await sleep(700)
  await page.screenshot({ path: path.join(out, `${scheme}-${name}.png`) })
  console.log('shot', name)
}
const tap = async (name, role = 'button') => {
  await page.getByRole(role, { name, exact: typeof name === 'string' }).first().click()
  await sleep(600)
}
const scrollBy = (y) => page.evaluate((dy) => { const els = [...document.querySelectorAll('.scroll')]; const el = els[els.length - 1]; el.scrollTop += dy }, y)
const step = async (label, fn) => { try { await fn() } catch (e) { console.log('FAIL', label, String(e).slice(0, 200)) } }

try {
  await page.goto(`http://localhost:${port}/?seed=demo`)
  await page.getByRole('button', { name: 'Ondas' }).first().waitFor({ timeout: 90_000 })
  await sleep(1500)
  const x = page.getByRole('button', { name: 'Dismiss' })
  if (await x.isVisible().catch(() => false)) await x.click()
  await step('tab', async () => { await tap('Ondas'); await shot('01-tab') })
  await step('tab2', async () => { await scrollBy(600); await shot('02-tab-lower') ; await scrollBy(-2000) })
  await step('browse', async () => { await tap('Browse Ondas'); await shot('03-browse'); await scrollBy(900); await shot('04-browse-lower') })
  for (const [i, n] of [['05', 'Zen'], ['07', 'Norse']]) {
    await step('onda ' + n, async () => {
      await scrollBy(-5000)
      await page.getByRole('button', { name: new RegExp(n) }).first().click()
      await sleep(1500)
      await shot(`${i}-onda-${n}`)
      await scrollBy(700); await shot(`${i}b-onda-${n}-lower`)
      await scrollBy(700); await shot(`${i}c-onda-${n}-lower2`)
      await tap('Back')
    })
  }
  await step('guide', async () => {
    await tap('Back')
    await page.getByRole('button', { name: /Guide/ }).first().click()
    await sleep(1500)
    await shot('09-guide')
    await scrollBy(700); await shot('10-guide-lower')
  })
} finally {
  await browser.close()
  server.kill()
  process.exit(0)
}
