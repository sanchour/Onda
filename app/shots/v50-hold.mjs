// Screenshots of the hold menu on a practice and its "How to do this" sheet. Starts `vite preview`, drives WebKit at iPhone size, writes PNGs to shots/v50/.
//   node shots/v50-hold.mjs [light|dark]
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { devices, webkit } from '@playwright/test'

const scheme = process.argv[2] === 'dark' ? 'dark' : 'light'
const here = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(here, 'v50')
fs.mkdirSync(out, { recursive: true })
const server = spawn('npx', ['vite', 'preview', '--port', '4179', '--strictPort'], { cwd: path.join(here, '..'), shell: true, stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await sleep(2500)

const browser = await webkit.launch()
const ctx = await browser.newContext({ ...devices['iPhone 15 Pro'], colorScheme: scheme })
const page = await ctx.newPage()
const shot = async (name) => {
  await sleep(500)
  await page.screenshot({ path: path.join(out, `${scheme}-${name}.png`) })
  console.log('shot', name)
}
const hold = async (loc) => {
  const b = await loc.boundingBox()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await sleep(650)
  await page.mouse.up()
  await sleep(300)
}

try {
  await page.goto('http://localhost:4179/?seed=demo')
  await page.getByText('Onda · Day 4 of 14').waitFor({ timeout: 90_000 })
  const x = page.getByRole('button', { name: 'Dismiss' })
  if (await x.isVisible().catch(() => false)) await x.click()
  await page.getByRole('tab', { name: 'Ondas' }).click()
  await sleep(800)
  const row = page.locator('[role=checkbox][aria-haspopup=menu]').first()
  await row.waitFor({ timeout: 20000 })
  const before = await row.getAttribute('aria-checked')
  await page.evaluate(() => { const els = [...document.querySelectorAll('.scroll')]; els[els.length - 1].scrollTop += 380 })
  await sleep(400)
  await shot('hold-0-list')
  await hold(row)
  console.log('checked unchanged after hold:', (await row.getAttribute('aria-checked')) === before)
  await shot('hold-1-menu')
  await page.getByRole('menuitem', { name: 'How to do this' }).click()
  await sleep(900)
  await page.getByText('Why', { exact: true }).waitFor({ timeout: 15000 })
  await sleep(600)
  await shot('hold-2-sheet')
  await page.getByRole('button', { name: 'Close' }).click()
  await sleep(700)
  await row.click()
  console.log('tap still toggles:', (await row.getAttribute('aria-checked')) !== before)
  await row.click()
} catch (e) {
  console.error(e)
  await shot('hold-error')
} finally {
  await browser.close()
  server.kill()
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { shell: true })
}
