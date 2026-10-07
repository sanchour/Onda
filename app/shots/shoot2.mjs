// Ad-hoc visual check of deeper screens. Usage: node shots/shoot2.mjs [dark]
import { webkit, devices } from '@playwright/test'
const dark = process.argv[2] === 'dark'
const out = (n) => `shots/${dark ? 'dark-' : ''}${n}.png`
const browser = await webkit.launch()
const ctx = await browser.newContext({ ...devices['iPhone 15 Pro'], colorScheme: dark ? 'dark' : 'light' })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 300)))
const wait = (ms = 700) => page.waitForTimeout(ms)
const tap = async (name, role = 'button') => { await page.getByRole(role, { name, exact: true }).first().click(); await wait() }
const shot = (n) => page.screenshot({ path: out(n) })

await page.goto('http://localhost:5173/?seed=demo')
await page.getByText("Onda · Day 4 of 14").waitFor({ timeout: 90000 })
if (dark) {
  await page.evaluate(async () => { const { useStore } = await import('/src/data/store.ts'); useStore.getState().updateSettings({ themeMode: 'dark', a2hsDismissed: true }); useStore.getState().setEntitlement({ plus: 'trial', trialStartedAt: new Date().toISOString() }) })
} else {
  await page.evaluate(async () => { const { useStore } = await import('/src/data/store.ts'); useStore.getState().updateSettings({ a2hsDismissed: true }); useStore.getState().setEntitlement({ plus: 'trial', trialStartedAt: new Date().toISOString() }) })
}
await wait(600)
await shot('50-ondas')
await tap('Full guide'); await wait(900); await shot('51-guide')
await tap('History'); await shot('52-guide-history')
await page.getByRole('button', { name: /c\. 300 BCE/ }).first().click(); await wait(400); await shot('53-guide-open')
await tap('Close')
await tap('Browse Ondas'); await wait(800); await shot('54-all-ondas')
await page.getByRole('button', { name: /Sufism/ }).click(); await wait(1200); await shot('55-preview-sufi')
await page.evaluate(() => document.querySelectorAll('.scroll').forEach((e) => e.scrollTo(0, 99999))); await wait(500); await shot('56-preview-bottom')
await tap('Back'); await tap('Back')
await page.getByRole('tab', { name: 'Lagos' }).click(); await wait(700)
await page.getByRole('button', { name: 'More actions' }).first().click(); await wait(500); await shot('57-lago-menu')
await page.mouse.click(350, 100); await wait(300)
await page.getByRole('button', { name: /Delete social media, day/ }).click(); await wait(900); await shot('58-lago-insights')
await tap('Check In'); await wait(900); await shot('59-checkin-sheet')
await tap('Cancel'); await tap('Back')
await tap('New Lago'); await wait(900); await shot('60-lago-form')
await tap('Cancel')
await tap('Gallery'); await wait(900); await shot('61-gallery')
await tap('Back')
await page.getByRole('tab', { name: 'Stats' }).click(); await wait(900)
await tap('Achievements 8 of 12').catch(async () => { await page.getByRole('button', { name: /Achievements/ }).click(); await wait() }); await wait(600); await shot('62-achievements')
console.log(JSON.stringify({ errors: errors.slice(0, 10) }, null, 1))
await browser.close()
