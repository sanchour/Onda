import { webkit, chromium, devices } from '@playwright/test'
for (const [name, bt] of [['webkit', webkit], ['chromium', chromium]]) {
  const browser = await bt.launch()
  const ctx = await browser.newContext({ ...devices['iPhone 15 Pro'] })
  const page = await ctx.newPage()
  await page.goto('http://localhost:5173/')
  await page.waitForTimeout(1500)
  const r = await page.evaluate(async () => {
    const { db } = await import('/src/data/db.ts')
    const { enqueueAll } = await import('/src/sync/engine.ts')
    const { useStore } = await import('/src/data/store.ts')
    const { loadOnda } = await import('/src/content/index.ts')
    const out = {}
    const time = async (k, fn) => { const t = performance.now(); await fn(); out[k] = Math.round(performance.now() - t) }
    await time('loadOnda x3', async () => { await loadOnda('zen'); await loadOnda('tao'); await loadOnda('stoic') })
    const rows = Array.from({ length: 400 }, (_, i) => ({ id: 'x' + i, lagoId: 'l', date: '2026-01-01', status: 'done', note: '', at: '', updatedAt: 1, deviceId: 'd' }))
    await time('tx clear+bulkPut 400', () => db.transaction('rw', db.tables, async () => { for (const tb of db.tables) if (tb.name !== 'meta') await tb.clear(); await db.checkIns.bulkPut(rows) }))
    await time('enqueueAll', () => enqueueAll())
    await time('init', () => useStore.getState().init())
    await time('checkIn+evaluate', async () => { useStore.getState().checkIn('l', { status: 'done' }) })
    return out
  })
  console.log(name, r)
  await browser.close()
}
