// Checks swipe back in WebKit: from the edge (mouse), from anywhere (touch pointer events), a cancelled swipe,
// and a swipe on a row that scrolls sideways, which must not go back. Saves a mid-swipe screenshot.
//   node shots/v7-swipe.mjs <outDir>
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { devices, webkit } from '@playwright/test'

const here = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(here, process.argv[2] ?? 'v7-swipe')
fs.mkdirSync(out, { recursive: true })
const port = 4390 + Math.floor(Math.random() * 30)
const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { cwd: path.join(here, '..'), shell: true, stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await sleep(6000)
const browser = await webkit.launch()
const page = await (await browser.newContext({ ...devices['iPhone 15 Pro'] })).newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 200)))
const results = []
const check = (name, ok) => { results.push(`${ok ? 'PASS' : 'FAIL'} ${name}`) }
const onHome = async () => (await page.getByText('Today', { exact: true }).first().isVisible().catch(() => false)) && (await page.locator('[class*="page"]').count()) === 0
const open = async (name) => { await page.getByRole('button', { name, exact: true }).first().click(); await sleep(700) }
// touch-like pointer events from (x0, y) to (x1, y), in steps of 16 ms
const touchSwipe = (x0, x1, y, { release = true, steps = 14, hold = 0 } = {}) =>
  page.evaluate(
    async ({ x0, x1, y, release, steps, hold }) => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms))
      const target = document.elementFromPoint(x0, y)
      const fire = (type, x, t = target) => t.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, composed: true }))
      fire('pointerdown', x0)
      for (let k = 1; k <= steps; k++) {
        await wait(16)
        fire('pointermove', x0 + ((x1 - x0) * k) / steps)
      }
      if (hold) await wait(hold)
      if (release) fire('pointerup', x1)
    },
    { x0, x1, y, release, steps, hold },
  )

try {
  await page.goto(`http://localhost:${port}/?seed=demo`)
  await page.getByRole('button', { name: 'Browse Ondas' }).first().waitFor({ timeout: 90_000 })
  await page.getByRole('button', { name: /^(Dismiss|Close)$/ }).first().click({ timeout: 2000 }).catch(() => {})
  await sleep(800)

  // 1. edge swipe with the mouse
  await open('Philosophy')
  await page.mouse.move(6, 420)
  await page.mouse.down()
  for (let k = 1; k <= 12; k++) { await page.mouse.move(6 + k * 26, 420); await sleep(16) }
  await page.mouse.up()
  await sleep(1100)
  check('edge swipe from Philosophy returns home', await onHome())

  // 2. swipe from the middle of the page (touch)
  await open('Philosophy')
  await touchSwipe(120, 330, 520)
  await sleep(1100)
  check('mid-page swipe from Philosophy returns home', await onHome())

  // 3. a short, slow swipe springs back and stays
  await open('Philosophy')
  await touchSwipe(120, 170, 520, { hold: 300 })
  await sleep(1100)
  check('short slow swipe stays on Philosophy', !(await onHome()) && (await page.getByRole('heading', { name: 'Philosophy' }).count()) > 0)
  // mid-swipe picture: the page half away, the home trailing beneath
  await touchSwipe(100, 330, 520, { release: false })
  await sleep(120)
  await page.screenshot({ path: path.join(out, 'mid-swipe.png'), scale: 'css' })
  await page.evaluate(() => document.elementFromPoint(340, 520)?.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, pointerType: 'touch', clientX: 330, clientY: 520, bubbles: true })))
  await sleep(1100)
  check('releasing past half returns home', await onHome())

  // 4. two levels: Immerse, then a kind, back twice
  await open('Immerse')
  await page.getByRole('button', { name: /^Read [0-9]+ of/ }).first().click()
  await sleep(800)
  await touchSwipe(100, 330, 600)
  await sleep(1100)
  check('swipe from a kind returns to Immersion', (await page.getByText('Up Next').first().isVisible().catch(() => false)) && !(await onHome()))
  await touchSwipe(100, 330, 600)
  await sleep(1100)
  check('second swipe returns home', await onHome())

  // 5. a row that scrolls sideways keeps its own drag
  await open('Browse Ondas')
  const row = await page.locator('.hscroll').nth(1).boundingBox()
  await touchSwipe(60, 300, row.y + row.height / 2)
  await sleep(1100)
  check('drag on the Featured row does not go back', (await page.getByText('Sixty-four worlds to live in').isVisible()) === true)
  await touchSwipe(60, 300, 140)
  await sleep(1100)
  check('drag on the title area goes back', await onHome())
} catch (e) {
  results.push('ERROR ' + String(e).slice(0, 300))
} finally {
  console.log(results.join('\n'))
  await browser.close()
  server.kill()
  process.exit(0)
}
