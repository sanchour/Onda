import { chromium, devices } from '@playwright/test'
const b = await chromium.launch()
const ctx = await b.newContext({ ...devices['iPhone 15 Pro'], browserName: undefined })
const page = await ctx.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)))
page.on('response', (r) => r.status() >= 400 && errs.push(r.status() + ' ' + r.url()))
await page.goto('http://localhost:4180/Onda/?seed=demo')
await page.getByText('Onda · Day 4 of 14').waitFor({ timeout: 60000 })
const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return r.scope })
await page.getByRole('button', { name: 'Full guide', exact: true }).click(); await page.waitForTimeout(800)
console.log(JSON.stringify({ sw, guide: await page.getByRole('dialog').count(), errs }))
await b.close()
