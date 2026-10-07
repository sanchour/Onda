// Visual check for Update 1.2. Usage: node shots/v12.mjs [dark]
import { webkit, devices } from '@playwright/test'
const dark = process.argv[2] === 'dark'
const out = (n) => `shots/v12-${dark ? 'dark-' : ''}${n}.png`
const browser = await webkit.launch()
const ctx = await browser.newContext({ ...devices['iPhone 15 Pro'], colorScheme: dark ? 'dark' : 'light' })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
const wait = (ms = 700) => page.waitForTimeout(ms)
const tap = async (name, role = 'button') => { await page.getByRole(role, { name, exact: true }).first().click(); await wait() }
const shot = (n) => page.screenshot({ path: out(n) })

await page.goto('http://localhost:5173/?seed=demo')
await page.getByText('Onda · Day 4 of 14').waitFor({ timeout: 90000 })
await wait(800)
await shot('10-ondas')
await page.getByRole('tab', { name: 'Stats' }).click(); await wait(1400); await shot('20-stats')
await page.getByRole('tab', { name: 'Ondas' }).click(); await wait(700)
await tap('Immerse'); await wait(500); await shot('30-immersion-grid')
await page.getByRole('button', { name: /^Read/ }).first().click(); await wait(700); await shot('31-immersion-read')
await page.getByRole('button', { name: /^About / }).first().click(); await wait(900); await shot('32-media-sheet')
await page.getByRole('button', { name: 'Close' }).click(); await wait(600)
await tap('Back'); await tap('Back')
await tap('Philosophy'); await wait(1800); await shot('40-philosophy')
await page.getByRole('button', { name: 'Close' }).click(); await wait(600)
await tap('Full guide'); await wait(1800); await shot('50-guide-overview')
for (const [k, n] of [['History', '51'], ['Ideas', '52'], ['Ways', '53'], ['Culture', '54'], ['Language', '55'], ['Facts', '56']]) {
  await page.getByRole('tab', { name: k, exact: true }).click(); await wait(700); await shot(`${n}-guide-${k.toLowerCase()}`)
}
await page.getByRole('button', { name: 'Close' }).click(); await wait(600)
await page.getByRole('button', { name: 'Browse Ondas' }).click().catch(() => {}); await wait(900); await shot('60-all-ondas')
console.log(JSON.stringify({ errors: errors.slice(0, 12) }, null, 1))
await browser.close()
