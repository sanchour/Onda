// Other Ondas and dark mode for Update 1.2. Usage: node shots/v12b.mjs
import { webkit, devices } from '@playwright/test'
const browser = await webkit.launch()
const errors = []
async function run(dark) {
  const ctx = await browser.newContext({ ...devices['iPhone 15 Pro'], colorScheme: dark ? 'dark' : 'light' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(String(e)))
  const wait = (ms = 800) => page.waitForTimeout(ms)
  const out = (n) => `shots/v12b-${dark ? 'dark-' : ''}${n}.png`
  await page.goto('http://localhost:5173/?seed=demo')
  await page.getByText('Onda · Day 4 of 14').waitFor({ timeout: 90000 })
  const dismiss = page.getByRole('button', { name: 'Dismiss' })
  if (await dismiss.isVisible().catch(() => false)) await dismiss.click()
  await wait(500)
  if (dark) {
    await page.getByRole('tab', { name: 'Stats' }).click(); await wait(1400); await page.screenshot({ path: out('stats') })
    await page.getByRole('tab', { name: 'Ondas' }).click(); await wait(600)
    await page.getByRole('button', { name: 'Browse Ondas' }).click(); await wait(1200); await page.screenshot({ path: out('all-ondas') })
  } else {
    await page.getByRole('button', { name: 'Browse Ondas' }).click(); await wait(1200)
    for (const [name, id] of [['Sufism', 'sufi'], ['Vedanta', 'vedanta'], ['Tibetan Buddhism', 'tibet'], ['Taoism', 'tao']]) {
      await page.getByRole('button', { name: new RegExp(name) }).first().click(); await wait(1600)
      await page.screenshot({ path: out(`${id}-preview`) })
      await page.getByRole('button', { name: 'Full guide' }).first().click().catch(() => {}); await wait(1800)
      await page.screenshot({ path: out(`${id}-guide`) })
      await page.getByRole('button', { name: 'Close' }).click().catch(() => {}); await wait(700)
      await page.getByRole('button', { name: 'Back' }).click(); await wait(900)
    }
  }
  await ctx.close()
}
await run(false)
await run(true)
console.log(JSON.stringify({ errors: errors.slice(0, 8) }))
await browser.close()
