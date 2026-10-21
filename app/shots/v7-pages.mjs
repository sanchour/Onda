// Screenshots of the secondary Onda pages (guide, philosophy, journal, immerse, practice sheet).
//   node shots/v7-pages.mjs [outDir] [light|dark]
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { devices, webkit } from '@playwright/test'

const here = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(here, process.argv[2] || 'v7-pages')
const scheme = process.argv[3] === 'dark' ? 'dark' : 'light'
fs.mkdirSync(out, { recursive: true })
const port = 4230 + Math.floor(Math.random() * 40)
const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { cwd: path.join(here, '..'), shell: true, stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await sleep(6000)
const browser = await webkit.launch()
const ctx = await browser.newContext({ ...devices['iPhone 15 Pro'], colorScheme: scheme })
const page = await ctx.newPage()
const shot = async (name) => { await sleep(700); await page.screenshot({ path: path.join(out, `${scheme}-${name}.png`) }); console.log('shot', name) }
const tap = async (name, role = 'button') => { await page.getByRole(role, { name, exact: typeof name === 'string' }).first().click(); await sleep(700) }
const scrollBy = (y) => page.evaluate((dy) => { const els = [...document.querySelectorAll('.scroll')]; els[els.length - 1].scrollTop += dy }, y)
const step = async (label, fn) => { try { await fn() } catch (e) { console.log('FAIL', label, String(e).slice(0, 160)) } }
try {
  await page.goto(`http://localhost:${port}/?seed=demo`)
  await page.getByRole('button', { name: 'Philosophy' }).first().waitFor({ timeout: 90_000 }).catch((e) => console.log('WAIT', String(e).slice(0, 200)))
  const x = page.getByRole('button', { name: 'Dismiss' })
  if (await x.isVisible().catch(() => false)) await x.click()
  await step('philosophy', async () => { await tap('Philosophy'); await shot('01-philosophy'); await scrollBy(600); await shot('02-philosophy-lower'); await tap('Back') })
  await step('journal', async () => { await tap('Journal'); await shot('03-journal'); await tap('Back') })
  await step('immerse', async () => { await tap('Immerse'); await shot('04-immerse'); await scrollBy(600); await shot('05-immerse-lower'); await tap('Back') })
  await step('guide', async () => {
    await tap('Guide'); await shot('06-guide'); await scrollBy(700); await shot('07-guide-lower')
    for (const [n, label] of [['08', /^History/], ['09', /^Ideas/], ['10', /^Ways/i]]) { await scrollBy(-5000); await page.getByRole('tab', { name: label }).first().click().catch(() => page.getByRole('button', { name: label }).first().click()); await sleep(700); await shot(`${n}-guide-${String(label).slice(2, 8)}`) }
    await tap('Back')
  })
  await step('practice', async () => {
    const row = page.getByRole('checkbox').nth(1)
    const b = await row.boundingBox()
    await page.mouse.move(b.x + 60, b.y + b.height / 2); await page.mouse.down(); await sleep(900); await page.mouse.up(); await sleep(900)
    await shot('11-practice-sheet')
  })
} catch (e) { console.log('ERR', String(e).slice(0, 300)) } finally { await browser.close(); server.kill(); process.exit(0) }
