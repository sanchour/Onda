import { webkit, devices } from '@playwright/test'
const browser = await webkit.launch()
const ctx = await browser.newContext({ ...devices['iPhone 15 Pro'] })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 600)))
page.on('console', (m) => console.log('CONSOLE', m.type(), m.text().slice(0, 300)))
await page.goto('http://localhost:5173/')
await page.waitForTimeout(1500)
const r = await page.evaluate(async () => {
  const m = await import('/src/data/seed.ts')
  const t = (p) => Promise.race([p.then(() => 'ok', (e) => 'ERR ' + (e?.stack || e)), new Promise((r) => setTimeout(() => r("TIMEOUT"), 40000))])
  const t0=performance.now(); const a = await t(m.loadDemoSeed()); const t1=performance.now(); const b = await Promise.all([t(m.loadDemoSeed()), t(m.loadDemoSeed())]); return {single:a, ms1: Math.round(t1-t0), double:b, ms2: Math.round(performance.now()-t1)}
})
console.log('double seed:', r)
await browser.close()
