// Package 0 screenshots: Ondas tab, All Ondas, an Onda page (running and preview).
//   node shots/v7-p0.mjs [outDir] [light|dark] [themesOff]
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { devices, webkit } from '@playwright/test'

const here = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(here, process.argv[2] || 'v7-p0')
const scheme = process.argv[3] === 'dark' ? 'dark' : 'light'
fs.mkdirSync(out, { recursive: true })
const port = 4180 + Math.floor(Math.random() * 40)
const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { cwd: path.join(here, '..'), shell: true, stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await sleep(6000)

const browser = await webkit.launch()
const ctx = await browser.newContext({ ...devices['iPhone 15 Pro'], colorScheme: scheme })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 300)))
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text().slice(0, 300)))
const shot = async (name) => {
  await sleep(800)
  await page.screenshot({ path: path.join(out, `${scheme}-${name}.png`) })
  console.log('shot', name)
}
const tap = async (name, role = 'button') => {
  await page.getByRole(role, { name, exact: typeof name === 'string' }).first().click()
  await sleep(700)
}
const scrollBy = (y) => page.evaluate((dy) => { const els = [...document.querySelectorAll('.scroll')]; const el = els[els.length - 1]; el.scrollTop += dy }, y)
const step = async (label, fn) => { try { await fn() } catch (e) { console.log('FAIL', label, String(e).slice(0, 200)) } }

try {
  await page.goto(`http://localhost:${port}/?seed=demo`)
  await page.getByRole('button', { name: 'Browse Ondas' }).first().waitFor({ timeout: 90_000 })
  await sleep(1500)
  const x = page.getByRole('button', { name: 'Dismiss' })
  if (await x.isVisible().catch(() => false)) await x.click()
  await step('tab', async () => { await shot('01-tab'); await scrollBy(640); await shot('02-tab-lower'); await scrollBy(700); await shot('02b-tab-end'); await scrollBy(-3000) })
  await step('onda', async () => {
    await page.getByRole('button', { name: /Onda · Day/ }).first().click()
    await sleep(1500)
    await shot('03-onda-live'); await scrollBy(700); await shot('03b-onda-live'); await scrollBy(700); await shot('03c-onda-live'); await scrollBy(800); await shot('03d-onda-live')
    await tap('Back')
  })
  await step('browse', async () => {
    await tap('Browse Ondas'); await shot('04-browse'); await scrollBy(1500); await shot('04b-browse-lower'); await scrollBy(-3000)
    await page.getByRole('searchbox').fill('an'); await sleep(500); await shot('04c-search')
    await page.getByRole('searchbox').fill('')
  })
  for (const [i, n] of [['05', 'Zen'], ['06', 'Sufism'], ['07', 'The 1920s']]) {
    await step('onda ' + n, async () => {
      await scrollBy(-9000)
      await page.getByRole('searchbox').fill(n); await sleep(500)
      await page.getByRole('button', { name: new RegExp(n) }).first().click()
      await sleep(1500)
      await shot(`${i}-onda-${n}`)
      await scrollBy(700); await shot(`${i}b-onda-${n}-lower`)
      await tap('Back')
    })
  }
} finally {
  await browser.close()
  server.kill()
  process.exit(0)
}
