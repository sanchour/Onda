// Visual check for Update 1.3. Usage: node shots/v13.mjs
import { webkit, devices } from '@playwright/test'
const browser = await webkit.launch()
const ctx = await browser.newContext({ ...devices['iPhone 15 Pro'] })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
const wait = (ms = 800) => page.waitForTimeout(ms)
const shot = (n) => page.screenshot({ path: `shots/v13-${n}.png` })
const tap = async (name, role = 'button') => { await page.getByRole(role, { name, exact: typeof name === 'string' }).first().click(); await wait() }

await page.goto('http://localhost:5173/?seed=demo')
await page.getByText('Onda · Day 4 of 14').waitFor({ timeout: 90000 })
const dismiss = page.getByRole('button', { name: 'Dismiss' })
if (await dismiss.isVisible().catch(() => false)) await dismiss.click()
await wait(600)
await shot('10-ondas-stoic')
await tap('Stats', 'tab'); await wait(1200); await shot('20-stats')
await tap('Lagos', 'tab'); await wait(600); await shot('30-lagos-blue')
await tap('Ondas', 'tab')
await tap('Full guide'); await wait(1800); await shot('40-guide-page')
await tap('Ways', 'tab'); await wait(700); await shot('41-guide-ways')
await tap('Culture', 'tab'); await wait(700); await shot('42-guide-culture')
await tap('Back'); await wait(700)
await tap('Settings'); await wait(900)
await page.getByRole('button', { name: /Data/ }).first().click(); await wait(800); await shot('50-settings-data')
await tap('Back'); await tap('Back')
// start the trial, then begin each new Onda and look at the Ondas tab
await page.getByRole('button', { name: 'Settings' }).first().click(); await wait(700)
await page.getByRole('button', { name: /Ondas\+.*Start Free Trial/s }).click(); await wait(700)
await tap('Start Free Trial'); await wait(900); await page.getByRole('button', { name: 'Back' }).first().click().catch(() => {}); await wait(700)
for (const [name, id] of [['Soviet Union', 'soviet'], ['Yoruba', 'yoruba'], ['Aztec', 'aztec'], ['Ancient Egypt', 'egypt'], ['Hermeticism', 'hermes'], ['Gnosticism', 'gnostic']]) {
  await page.getByRole('tab', { name: 'Ondas' }).click(); await wait(500)
  await page.getByRole('button', { name: 'Browse Ondas' }).click(); await wait(900)
  await page.getByRole('button', { name: new RegExp(name) }).first().click(); await wait(1400)
  await page.getByRole('button', { name: 'Begin Onda' }).click(); await wait(1500); await shot('7-' + id + '-page'); for (let k = 0; k < 3 && !(await page.getByRole('tab', { name: 'Ondas' }).isVisible().catch(() => false)); k++) { await page.getByRole('button', { name: 'Back' }).first().click().catch(() => {}); await wait(900) }
  const ok = page.getByRole('button', { name: /Yes|Begin|Continue/ })
  if (await ok.count() && !(await page.getByText(/Day 1 of/).count())) await ok.first().click().catch(() => {})
  await wait(900)
  await page.getByRole('tab', { name: 'Ondas' }).click().catch(() => {}); await wait(800)
  await shot(`6-${id}`)
}
console.log(JSON.stringify({ errors: errors.slice(0, 8) }))
await browser.close()
