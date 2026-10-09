// Screenshots for 5.2: the day's practices, the day scroller, the paywall plans, Immerse and its links. Writes PNGs to shots/v52/.
//   node shots/v52.mjs [light|dark]
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { devices, webkit } from '@playwright/test'

const scheme = process.argv[2] === 'dark' ? 'dark' : 'light'
const here = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(here, 'v52')
fs.mkdirSync(out, { recursive: true })
const server = spawn('npx', ['vite', 'preview', '--port', '4179', '--strictPort'], { cwd: path.join(here, '..'), shell: true, stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await sleep(3000)

const browser = await webkit.launch()
const ctx = await browser.newContext({ ...devices['iPhone 15 Pro'], colorScheme: scheme })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e).slice(0, 300)))
const shot = async (name, full) => {
  await sleep(600)
  await page.screenshot({ path: path.join(out, `${scheme}-${name}.png`), fullPage: !!full })
  console.log('shot', name)
}
const scrollTop = (y) => page.evaluate((y) => { const a = [...document.querySelectorAll('.scroll')]; a[a.length - 1].scrollTop = y }, y)
const back = async () => { await page.getByRole('button', { name: 'Back' }).last().click(); await sleep(600) }
const step = async (name, fn) => { try { await fn() } catch (e) { console.log('STEP FAILED', name, String(e).slice(0, 200)) } }

try {
  // the loading screen, before the app is up
  await page.route('**/assets/index-*.js', async (r) => { await sleep(1500); await r.continue() })
  page.goto('http://localhost:4179/?seed=demo').catch(() => undefined)
  await sleep(1100)
  await shot('00-boot')
  await page.unroute('**/assets/index-*.js')
  await page.getByText('Onda · Day 4 of 14').waitFor({ timeout: 90_000 })
  const x = page.getByRole('button', { name: 'Dismiss' })
  if (await x.isVisible().catch(() => false)) await x.click()

  await page.getByRole('tab', { name: 'Ondas' }).click()
  await sleep(900)
  await shot('10-ondas')
  await scrollTop(420)
  await shot('11-ondas-practices')
  await step('media sheet', async () => {
    await page.getByRole('button', { name: /^Open: / }).first().click({ timeout: 4000 })
    await shot('12-media-sheet')
    await page.keyboard.press('Escape')
    await page.mouse.click(200, 60)
    await sleep(700)
  })
  await scrollTop(0)
  await step('immersion', async () => {
    await page.getByRole('button', { name: /^Immerse/ }).first().click()
    await shot('20-immerse')
    await page.getByRole('button', { name: /^Listen/ }).first().click()
    await shot('21-immerse-listen')
    await page.getByRole('button', { name: /^About / }).first().click()
    await shot('22-immerse-item')
    await page.mouse.click(200, 60)
    await sleep(700)
    await back()
    await back()
  })
  await step('browse', async () => {
    await page.getByRole('button', { name: 'Browse Ondas', exact: true }).first().click()
    await page.getByText('Zen Buddhism').first().waitFor({ timeout: 30000 })
    for (const name of (process.argv[3] ?? 'Taoism,Norse,Celtic').split(',')) {
      const b = page.getByRole('button', { name: new RegExp(name) }).first()
      await b.scrollIntoViewIfNeeded()
      await b.click()
      await page.getByText('Full guide').first().waitFor({ timeout: 20000 })
      await shot(`30-${name}-top`)
      await scrollTop(640)
      await shot(`31-${name}-mid`)
      await scrollTop(1400)
      await shot(`32-${name}-low`)
      await back()
    }
    await back()
  })
  await step('paywall', async () => {
    await page.getByRole('button', { name: 'Settings', exact: true }).first().click()
    await sleep(700)
    await page.getByRole('button', { name: /Ondas\+/ }).first().click()
    await sleep(1500); await shot('40-paywall')
    await page.getByRole('button', { name: 'Close' }).first().click()
    await sleep(600)
    await page.getByRole('button', { name: /^Appearance/ }).first().click()
    await shot('41-appearance')
  })
} finally {
  await browser.close()
  server.kill()
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { shell: true, stdio: 'ignore' })
}
