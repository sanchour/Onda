// Device linking, end to end, through the real public relays. Two browsers with separate storage:
// A is a laptop with the demo data, B is a fresh phone. A shows a code, B enters it during onboarding, B must leave
// onboarding with A's data, then edits must cross both ways. Screenshots go to shots/link-e2e/.
//   node shots/link-e2e.mjs
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const here = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(here, 'link-e2e')
fs.mkdirSync(out, { recursive: true })
const port = 4300 + Math.floor(Math.random() * 600)
const server = spawn('npx', ['vite', '--port', String(port), '--strictPort'], { cwd: path.join(here, '..'), shell: true, stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
for (let i = 0; i < 120; i++) {
  if (await fetch(`http://localhost:${port}/`).then(() => true, () => false)) break
  await sleep(500)
}
const url = `http://localhost:${port}/`
const t0 = Date.now()
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a)

/** Done practices straight from IndexedDB: proves the data arrived, whatever the screen shows. */
const donePractices = (page) =>
  page.evaluate(
    () =>
      new Promise((res) => {
        const r = indexedDB.open('onda')
        r.onsuccess = () => {
          const g = r.result.transaction('practiceLogs').objectStore('practiceLogs').getAll()
          g.onsuccess = () => res(g.result.filter((x) => x.done && !x.deletedAt).map((x) => `${x.practiceId}@${x.date}`).sort())
        }
      }),
  )
const until = async (what, f, ms = 45_000) => {
  const end = Date.now() + ms
  for (;;) {
    if (await f().catch(() => false)) return log('ok:', what)
    if (Date.now() > end) throw new Error(`timed out: ${what}`)
    await sleep(500)
  }
}

const browser = await chromium.launch()
let ok = false
try {
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })
  const A = await ctxA.newPage()
  const B = await ctxB.newPage()
  for (const [n, p] of [['A', A], ['B', B]]) {
    p.on('pageerror', (e) => log(`${n} pageerror`, String(e)))
    p.on('console', (m) => /onda|link|mqtt|WebSocket/i.test(m.text()) && log(`${n} console`, m.type(), m.text().slice(0, 300)))
  }
  globalThis.__pages = [A, B]

  await A.goto(`${url}?seed=demo`)
  await A.getByText(/Day 4 of 14/).first().waitFor({ timeout: 120_000 })
  await sleep(1500)
  await A.getByRole('button', { name: /Link Your Phone/ }).first().click()
  await A.getByRole('button', { name: /Show a Code/ }).click()
  const label = await A.locator('[aria-label^="Pairing code:"]').getAttribute('aria-label', { timeout: 30_000 })
  const code = label.replace('Pairing code:', '').replace(/\s/g, '')
  log('A shows code', code)
  await A.screenshot({ path: path.join(out, 'a1-code.png') })

  await B.goto(url)
  await B.getByRole('button', { name: /I Already Use Onda/ }).click({ timeout: 120_000 })
  await B.getByRole('button', { name: /Enter a Code/ }).click()
  await B.getByLabel('Pairing code').fill(code)
  await B.screenshot({ path: path.join(out, 'b1-enter.png') })
  // a pasted whole code links by itself; typing would need the button
  const linkBtn = B.getByRole('button', { name: /^Link$/ })
  if (await linkBtn.isEnabled().catch(() => false)) await linkBtn.click()
  await until('B linked', () => B.evaluate(() => window.__ondaLink?.getState().linked === true), 60_000)
  await until('A sees B join', () => A.evaluate(() => window.__ondaLink?.getState().devices.length === 2), 30_000)
  await A.screenshot({ path: path.join(out, 'a2-linked.png') })
  await until('B left onboarding with the demo data', () => B.getByText(/Day 4 of 14/).first().isVisible(), 90_000)
  await B.screenshot({ path: path.join(out, 'b2-home.png') })

  const a0 = await donePractices(A)
  const b0 = await donePractices(B)
  log('done practices A', a0.length, 'B', b0.length)
  if (a0.join() !== b0.join()) throw new Error('B does not hold A data')

  // B (phone) ticks a practice; A must get it
  const boxB = B.getByRole('checkbox', { checked: false }).first()
  const nameB = await boxB.getAttribute('aria-label')
  await boxB.click()
  log('B ticked', nameB)
  await until('A got B tick', async () => (await donePractices(A)).length === a0.length + 1, 30_000)

  // A (laptop) ticks one back; B must get it
  await A.getByRole('button', { name: /^Today$/ }).first().click()
  await sleep(800)
  const boxA = A.getByRole('checkbox', { checked: false }).first()
  const nameA = await boxA.getAttribute('aria-label')
  await boxA.click()
  log('A ticked', nameA)
  await until('B got A tick', async () => (await donePractices(B)).length === b0.length + 2, 30_000)
  await A.screenshot({ path: path.join(out, 'a3-after.png') })
  await B.screenshot({ path: path.join(out, 'b3-after.png') })

  // B goes away and comes back: it catches up from the retained snapshot
  await B.close()
  const boxA2 = A.getByRole('checkbox', { checked: false }).first()
  await boxA2.click()
  log('A ticked another while B was closed')
  await sleep(7000)
  const B2 = await ctxB.newPage()
  await B2.goto(url)
  await until('B caught up after reopening', async () => (await donePractices(B2)).length === b0.length + 3, 45_000)
  ok = true
} catch (e) {
  log('FAILED', e.message.split('\n')[0])
  for (const [i, p] of (globalThis.__pages ?? []).entries()) {
    if (p.isClosed()) continue
    await p.screenshot({ path: path.join(out, `zz-fail-${i ? 'B' : 'A'}.png`) }).catch(() => undefined)
    log(i ? 'B' : 'A', 'link state', await p.evaluate(() => JSON.stringify(window.__ondaLink?.getState?.() ?? null)).catch(() => '?'))
  }
} finally {
  log(ok ? 'PASS' : 'FAIL')
  await browser.close()
  server.kill()
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/f', '/t'], { shell: true, stdio: 'ignore' })
  process.exit(ok ? 0 : 1)
}
