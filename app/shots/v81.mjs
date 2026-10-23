// 8.1 checks on an iPhone 15 Pro in WebKit (or the desktop at 1440x900 with "desk"), from the dev server.
//   node shots/v81.mjs <outDir> [light|dark] [steps, comma separated] [desk]
//   steps: home, swipe, imm, guide, featured, settings, stats
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, devices, webkit } from '@playwright/test'

const here = path.dirname(fileURLToPath(import.meta.url))
const out = path.resolve(here, process.argv[2] ?? 'v81')
const scheme = process.argv[3] ?? 'light'
const steps = (process.argv[4] || 'home,swipe').split(',')
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
const click = async (loc, wait = 2500) => { await loc.first().click({ timeout: 10000 }); await sleep(wait) }
const btn = (name, exact = true) => page.getByRole('button', { name, exact })
const scroll = async (y) => { await page.evaluate((y) => { const panes = [...document.querySelectorAll('.scroll')].filter((e) => e.getBoundingClientRect().width > 0 && e.scrollHeight > e.clientHeight); panes.at(-1)?.scrollBy(0, y) }, y); await sleep(700) }
const home = async () => { if (desk) await click(btn('Today')); else { while (await btn('Back').count()) await click(btn('Back'), 1500) } }
/** Drag with the mouse, paced like a finger, from (x, y) by dx. */
const drag = async (x, y, dx) => { await page.mouse.move(x, y); await page.mouse.down(); for (let i = 1; i <= 10; i++) { await page.mouse.move(x + (dx * i) / 10, y); await sleep(16) } await page.mouse.up(); await sleep(500) }

try {
  await page.goto(`http://localhost:${port}/?seed=demo`)
  await page.waitForSelector('main, [role=tabpanel]', { timeout: 120_000 })
  await sleep(4000)
  await btn('Dismiss').first().click({ timeout: 3000 }).catch(() => {})
  await sleep(600)
  for (const s of steps) {
    try {
      if (s === 'home') { await shot('home'); await scroll(600); await shot('home2'); await scroll(-2000) }
      if (s === 'swipe') {
        const row = page.locator('[role=group] [role=checkbox]').nth(1)
        await row.scrollIntoViewIfNeeded(); await sleep(400)
        const b = await row.boundingBox()
        await drag(b.x + b.width - 30, b.y + b.height / 2, -170)
        await shot('swipe-open')
        console.log('DBG', await page.evaluate(() => { const r = document.querySelectorAll('[class*=swRow]'); return [...r].map((e) => e.style.transform + '|' + getComputedStyle(e).backgroundColor + '|' + getComputedStyle(e.parentElement.parentElement).backgroundColor).join(' ; ') }))
        await click(btn('How To'), 7000)
        console.log('DBG2', await page.locator('[role=dialog]').count(), await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 120)))
        await shot('swipe-howto')
        await page.keyboard.press('Escape').catch(() => {}); await sleep(800)
      }
      if (s === 'imm') {
        await click(page.getByRole('button', { name: /Immerse/ }), 3500)
        await shot('imm'); await scroll(600); await shot('imm2'); await scroll(700); await shot('imm3'); await scroll(800); await shot('imm4')
        for (const k of ['Watch', 'Eat', 'Travel']) { await click(page.getByRole('tab', { name: k })); await shot(`imm-${k.toLowerCase()}`); await scroll(700); await shot(`imm-${k.toLowerCase()}2`) }
        await home()
      }
      if (s === 'guide') {
        await click(desk ? page.getByRole('button', { name: /Guide/ }) : page.getByRole('button', { name: /Day \d+ of/ }), 3500)
        for (let i = 0; i < 9; i++) { await shot(`guide${i}`); await scroll(650) }
        await home()
      }
      if (s === 'featured') { await click(desk ? btn('Browse') : btn('Browse Ondas'), 3500); await shot('featured'); for (let i = 0; i < 4; i++) { await page.evaluate(() => document.querySelector('[class*=feat] [class*=hscroll], [class*=hscroll]')?.scrollBy(320, 0)); await sleep(700); await shot(`featured${i}`) } await home() }
      if (s === 'map') {
        await click(desk ? page.getByRole('button', { name: /Guide/ }) : page.getByRole('button', { name: /Day \d+ of/ }), 3500)
        await page.locator('[class*=mapWidget]').first().scrollIntoViewIfNeeded(); await sleep(900); await shot('map-root')
        await click(page.getByRole('button', { name: 'World view' }), 900); await shot('map-world')
        await click(page.getByRole('button', { name: 'Regional focus' }), 600)
        await click(page.getByRole('button', { name: 'Zoom in' }).first(), 600); await shot('map-zoom')
        await home()
        await click(page.getByRole('button', { name: /Immerse/ }), 3500); await click(page.getByRole('tab', { name: 'Travel' }))
        await page.locator('[class*=placesMapCanvas]').first().scrollIntoViewIfNeeded(); await sleep(900); await shot('map-travel')
        await home()
      }
      if (s === 'native') {
        await click(btn('Settings')); await click(page.getByRole('button', { name: /^Appearance/ }))
        await click(page.getByRole('switch', { name: /Headings in the Onda/ }), 900); await shot('native-switch')
        await home(); await shot('native-home'); await scroll(500); await shot('native-home2'); await scroll(-2000)
        if (!desk) { await click(page.getByRole('tab', { name: 'Stats' })); await shot('native-stats'); await click(page.getByRole('tab', { name: 'Ondas' })) }
      }
      if (s === 'ideas') {
        if (!desk) await scroll(900)
        await click(page.getByRole('button', { name: /Ideas/ }), 3500); await shot('ideas'); await sleep(2500); await shot('ideas-b')
        await click(page.getByText(/^Ethics \d+$/), 1200); await shot('ideas-ethics')
        await click(page.getByText(/^Rules \d+$/), 1200); await shot('ideas-rules')
        await click(page.getByRole('checkbox', { name: /Keep this today/ }), 900); await shot('ideas-kept')
        await home()
      }
      if (s === 'gcards') {
        await click(desk ? page.getByRole('button', { name: /Guide/ }) : page.getByRole('button', { name: /Day \d+ of/ }), 3500)
        await page.locator('[class*=_gc_]').first().scrollIntoViewIfNeeded(); await sleep(900); await scroll(-80); await shot('gc-ideas')
        await scroll(420); await shot('gc-think')
        await page.locator('[class*=_gc_]', { hasText: 'How To' }).first().scrollIntoViewIfNeeded(); await sleep(900); await scroll(-80); await shot('gc-practices')
        await click(btn('Contents'), 900); await shot('gc-toc')
        await page.keyboard.press('Escape').catch(() => {}); await sleep(500)
        await home()
      }
      if (s === 'settings') { await click(btn('Settings')); await shot('settings'); await click(page.getByRole('button', { name: /^Appearance/ })); await shot('appearance'); await scroll(700); await shot('appearance2'); await home() }
      if (s === 'stats') { await click(desk ? btn('Stats') : page.getByRole('tab', { name: 'Stats' })); await shot('stats'); await scroll(700); await shot('stats2'); if (desk) await home(); else await click(page.getByRole('tab', { name: 'Ondas' })) }
    } catch (e) {
      console.log('FAIL', s, String(e).replace(/\x1b\[[0-9;]*m/g, '').slice(0, 700))
      await shot(`fail-${s}`).catch(() => {})
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
