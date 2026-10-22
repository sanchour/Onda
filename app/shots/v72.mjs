// 7.2 review: the home of several Ondas, and the other tabs, on an iPhone 15 Pro in WebKit, from the dev server.
//   node shots/v72.mjs <outDir> [light|dark] [names, comma separated] [pages, comma separated: stats,lagos,settings,browse,guide,philosophy,immersion,onda]
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { devices, webkit } from '@playwright/test'

const here = path.dirname(fileURLToPath(import.meta.url))
const out = path.resolve(here, process.argv[2] ?? 'v72')
const scheme = process.argv[3] ?? 'light'
const names = (process.argv[4] ?? '').split(',').filter(Boolean)
const pages = (process.argv[5] ?? '').split(',').filter(Boolean)
fs.mkdirSync(out, { recursive: true })
const port = 5400 + Math.floor(Math.random() * 60)
const server = spawn('npx', ['vite', '--port', String(port), '--strictPort'], { cwd: path.join(here, '..'), shell: true, stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await sleep(4000)
const browser = await webkit.launch()
const page = await (await browser.newContext({ ...devices['iPhone 15 Pro'], colorScheme: scheme })).newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 200)))
const shot = (n, full = false) => page.screenshot({ path: path.join(out, `${scheme}-${n}.png`), scale: 'css', fullPage: full })
const tap = async (name, exact = true) => { await page.getByRole('button', { name, exact }).first().click(); await sleep(1100) }
const back = () => tap('Back')
// scrolls the visible scroll pane by most of a screen
const scrollDown = async () => { await page.evaluate(() => { const panes = [...document.querySelectorAll('.scroll')].filter((e) => e.getBoundingClientRect().width > 0 && e.scrollHeight > e.clientHeight); panes.at(-1)?.scrollBy(0, 560) }); await sleep(700) }
const dismiss = () => page.getByRole('button', { name: /^(Dismiss|Close)$/ }).first().click({ timeout: 1500 }).catch(() => {})
async function tour(label) {
  for (const p of pages) {
    try {
      if (p === 'stats') { await page.getByRole('tab', { name: 'Stats' }).click(); await sleep(1200); await shot(`${label}-stats`); await page.getByRole('tab', { name: 'Ondas' }).click(); await sleep(800) }
      if (p === 'lagos') { await page.getByRole('tab', { name: 'Lagos' }).click(); await sleep(1200); await shot(`${label}-lagos`); await page.getByRole('tab', { name: 'Ondas' }).click(); await sleep(800) }
      if (p === 'settings') { await tap('Settings'); await shot(`${label}-settings`); await back() }
      if (p === 'browse') { await tap('Browse Ondas'); await shot(`${label}-browse`); await back() }
      if (p === 'guide') { await page.getByRole('button', { name: /Guide/ }).first().click(); await sleep(1500); await shot(`${label}-guide`); await back() }
      if (p === 'philosophy') { await page.getByRole('button', { name: /Philosophy/ }).first().click(); await sleep(1500); await shot(`${label}-philosophy`); await back() }
      if (p === 'immersion') { await page.getByRole('button', { name: /Immerse/ }).first().click(); await sleep(1500); await shot(`${label}-immersion`); await back() }
      if (p === 'onda') { await page.locator('button[aria-label*="Day"]').first().click(); await sleep(1500); await shot(`${label}-onda`); await back() }
      if (p === 'full') await shot(`${label}-full`, true)
      if (p === 'scroll') { await scrollDown(); await shot(`${label}-scroll`); await scrollDown(); await shot(`${label}-scroll2`); await page.evaluate(() => document.querySelectorAll('.scroll').forEach((e) => e.scrollTo(0, 0))) }
      if (p === 'browse2') { await tap('Browse Ondas'); await scrollDown(); await shot(`${label}-browse2`); await scrollDown(); await shot(`${label}-browse3`); await back() }
    } catch (e) {
      console.log('FAIL', label, p, String(e).slice(0, 160))
    }
  }
}
try {
  await page.goto(`http://localhost:${port}/?seed=demo`)
  await page.getByRole('button', { name: 'Browse Ondas' }).first().waitFor({ timeout: 120_000 })
  await page.getByRole('button', { name: 'Dismiss' }).first().click({ timeout: 6000 }).catch(() => {})
  await sleep(800)
  await shot('0-home')
  await tour('0')
  if (names.length) {
    await tap('Settings')
    await page.getByRole('button', { name: /Ondas\+.*Start Free Trial/s }).click().catch(() => {})
    await sleep(900)
    await page.getByRole('button', { name: 'Start Free Trial', exact: true }).first().click().catch(() => {})
    await sleep(900)
    await back()
  }
  for (const [i, n] of names.entries()) {
    try {
      await tap('Browse Ondas')
      await page.getByRole('searchbox').fill(n).catch(() => {})
      await sleep(900)
      await page.getByRole('button', { name: new RegExp(n) }).first().click()
      await sleep(1300)
      await tap('Begin Onda')
      for (let k = 0; k < 2; k++) await back()
      await dismiss()
      await shot(`${i + 1}-${n.replace(/\s+/g, '')}`)
      await tour(String(i + 1))
    } catch (e) {
      console.log('FAIL', n, String(e).slice(0, 160))
      await page.goto(`http://localhost:${port}/`)
      await sleep(3000)
    }
  }
} finally {
  await browser.close()
  server.kill()
  process.exit(0)
}
