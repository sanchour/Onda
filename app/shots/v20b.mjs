import { webkit, devices } from '@playwright/test'
const browser = await webkit.launch()
const ctx = await browser.newContext({ ...devices['iPhone 15 Pro'] })
const page = await ctx.newPage()
const w = (ms = 800) => page.waitForTimeout(ms)
await page.goto('http://localhost:5173/')
await page.getByRole('button', { name: 'Continue' }).waitFor({ timeout: 90000 })
for (const b of ['Continue', 'Continue', 'Continue', 'Next']) { await page.getByRole('button', { name: b, exact: true }).click(); await w(600) }
await page.evaluate(() => { for (const e of document.querySelectorAll('*')) if (e.scrollHeight > e.clientHeight + 50 && getComputedStyle(e).overflowY !== 'visible') e.scrollTop = 1400 })
await w(500); await page.screenshot({ path: 'shots/v20b-1-pick.png' })
await page.getByRole('radio', { name: /Stoicism/ }).click()
await page.getByRole('button', { name: 'Get Started' }).click(); await w(1500)
await page.screenshot({ path: 'shots/v20b-2-paywall.png' })
await browser.close()
