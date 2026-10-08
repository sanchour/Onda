// WebKit timing probe for the production build. Usage: node shots/perf.mjs [label]
import { webkit, devices } from '@playwright/test'
const browser = await webkit.launch()
const out = {}
async function run(name, warm) {
  const ctx = await browser.newContext({ ...devices['iPhone 15 Pro'], serviceWorkers: 'allow' })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    window.__lcp = 0
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true }) } catch {}
    window.__frames = []
    let last = performance.now()
    const tick = (t) => { window.__frames.push(t - last); last = t; requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  })
  const t0 = Date.now()
  await page.goto('http://localhost:4173/?seed=demo', { waitUntil: 'commit' })
  await page.getByText('Onda · Day 4 of 14').waitFor({ timeout: 60000 })
  const interactive = Date.now() - t0
  if (warm) { await page.waitForTimeout(3000); await page.reload(); const t1 = Date.now(); await page.getByRole('tab', { name: 'Lagos' }).waitFor(); out[name + '_warm_ms'] = Date.now() - t1 }
  await page.waitForTimeout(1500)
  const m = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    const paint = Object.fromEntries(performance.getEntriesByType('paint').map((p) => [p.name, Math.round(p.startTime)]))
    const res = performance.getEntriesByType('resource')
    const js = res.filter((r) => r.name.endsWith('.js'))
    return { dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), paint, lcp: Math.round(window.__lcp), jsCount: js.length, jsKB: Math.round(js.reduce((a, r) => a + (r.transferSize || r.encodedBodySize || 0), 0) / 1024), resCount: res.length }
  })
  // interaction timing: tab switches and a sheet open, frame gaps while they run
  await page.evaluate(() => { window.__frames.length = 0 })
  const times = []
  for (const tab of ['Lagos', 'Stats', 'Ondas']) { const a = Date.now(); await page.getByRole('tab', { name: tab }).click(); await page.waitForTimeout(700); times.push(tab + ':' + (Date.now() - a - 700)) }
  const frames = await page.evaluate(() => window.__frames.slice())
  const slow = frames.filter((f) => f > 20).length
  out[name] = { interactive, ...m, tabClicks: times.join(' '), frames: frames.length, over20ms: slow, worstFrame: Math.round(Math.max(...frames)) }
  await ctx.close()
}
await run('cold', false)
await run('warm', true)
console.log(JSON.stringify(out, null, 1))
await browser.close()
