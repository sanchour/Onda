// 8.0 review: the redesigned screens on an iPhone 15 Pro in WebKit (or the desktop at 1440x900 with "desk"), from the dev server.
//   node shots/v8.mjs <outDir> [light|dark] [pages, comma separated] [desk]
//   pages: home, browse, immersion, journal, guide, settings, stats (default: all)
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, devices, webkit } from '@playwright/test'

const here = path.dirname(fileURLToPath(import.meta.url))
const out = path.resolve(here, process.argv[2] ?? 'v8')
const scheme = process.argv[3] ?? 'light'
const pages = (process.argv[4] || 'home,browse,immersion,journal,guide,settings,stats').split(',')
const desk = process.argv[5] === 'desk'
fs.mkdirSync(out, { recursive: true })
const port = 5400 + Math.floor(Math.random() * 60)
const server = spawn('npx', ['vite', '--port', String(port), '--strictPort'], { cwd: path.join(here, '..'), shell: true, stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
for (let i = 0; i < 60; i++) { if (await fetch(`http://localhost:${port}/`).then((r) => r.ok).catch(() => false)) break; await sleep(1000) }
const browser = desk ? await chromium.launch() : await webkit.launch()
const ctx = desk ? await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme }) : await browser.newContext({ ...devices['iPhone 15 Pro'], colorScheme: scheme })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 300)))
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text().slice(0, 200)))
const shot = (n) => page.screenshot({ path: path.join(out, `${desk ? 'desk' : 'phone'}-${scheme}-${n}.png`), scale: 'css' })
const click = async (loc) => { await loc.first().click({ timeout: 8000 }); await sleep(3500) }
const btn = (name, exact = true) => page.getByRole('button', { name, exact })
const back = () => click(btn('Back'))
const scroll = async (y) => { await page.evaluate((y) => { const panes = [...document.querySelectorAll('.scroll')].filter((e) => e.getBoundingClientRect().width > 0 && e.scrollHeight > e.clientHeight); panes.at(-1)?.scrollBy(0, y) }, y); await sleep(700) }
const home = async () => { if (desk) await click(btn('Today')); else { while (await btn('Back').count()) await back() } }

try {
  await page.goto(`http://localhost:${port}/?seed=demo`)
  await page.waitForSelector('main, [role=tabpanel]', { timeout: 120_000 })
  await sleep(4000)
  await btn('Dismiss').first().click({ timeout: 3000 }).catch(() => {})
  await sleep(600)
  for (const p of pages) {
    try {
      if (p === 'home') { await shot('home'); await scroll(700); await shot('home2'); await scroll(900); await shot('home3') }
      if (p === 'browse') {
        await click(desk ? btn('Browse') : btn('Browse Ondas'))
        await shot('browse'); await scroll(600); await shot('browse2')
        await click(page.getByRole('tab', { name: 'Minds' })); await shot('browse-minds')
        await home()
      }
      if (p === 'immersion') {
        await click(page.getByRole('button', { name: /Immerse/ }))
        await shot('imm'); await scroll(600); await shot('imm2'); await scroll(700); await shot('imm3'); await scroll(800); await shot('imm4')
        await click(page.getByRole('tab', { name: 'Read' })); await shot('imm-read')
        await home()
      }
      if (p === 'journal') {
        await click(page.getByRole('button', { name: /Journal/ }))
        await shot('journal')
        await click(page.getByRole('button', { name: /new entry/i })); await shot('journal-write')
        await back(); await home()
      }
      if (p === 'guide') {
        await click(desk ? page.getByRole('button', { name: /Guide/ }) : page.getByRole('button', { name: /Day \d+ of/ }))
        await shot('guide'); await scroll(700); await shot('guide2'); await scroll(700); await shot('guide3'); await scroll(900); await shot('guide4')
        if (!desk) { await click(btn('Contents')); await shot('guide-contents'); await click(page.getByRole('button', { name: /Language/ })); await shot('guide-jump') }
        await home()
      }
      if (p === 'settings') { await click(desk ? btn('Settings') : btn('Settings')); await shot('settings'); await scroll(700); await shot('settings2'); await home() }
      if (p === 'stats') { await click(desk ? btn('Stats') : page.getByRole('tab', { name: 'Stats' })); await shot('stats'); if (desk) await home(); else await click(page.getByRole('tab', { name: 'Ondas' })) }
    } catch (e) {
      console.log('FAIL', p, String(e).replace(/[[0-9;]*m/g, '').slice(0, 900))
      await shot(`fail-${p}`).catch(() => {})
      await home().catch(() => {})
    }
  }
} catch (e) {
  console.log('FATAL', String(e).slice(0, 600))
} finally {
  await browser.close()
  server.kill()
  process.exit(0)
}
