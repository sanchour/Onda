import { webkit, devices } from '@playwright/test'
const browser = await webkit.launch()
const ctx = await browser.newContext({ ...devices['iPhone 15 Pro'] })
const page = await ctx.newPage()
page.on('console', (m) => m.text().startsWith('SEEDMARK') && console.log(m.text()))
await page.goto('http://localhost:5173/')
await page.waitForTimeout(1500)
await page.evaluate(async () => { const m = await import('/src/data/seed.ts'); await m.loadDemoSeed() })
await browser.close()
