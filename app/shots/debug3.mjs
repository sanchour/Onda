import { webkit, devices } from '@playwright/test'
const browser = await webkit.launch()
const ctx = await browser.newContext({ ...devices['iPhone 15 Pro'] })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 600)))
await page.goto('http://localhost:5173/')
await page.waitForTimeout(1500)
const r = await page.evaluate(async () => {
  const { db } = await import('/src/data/db.ts')
  const { enqueueAll } = await import('/src/sync/engine.ts')
  const { useStore } = await import('/src/data/store.ts')
  const log = []
  const t = (name, p) => Promise.race([p.then(() => log.push(name + ' ok'), (e) => log.push(name + ' ERR ' + e)), new Promise((r) => setTimeout(() => { log.push(name + ' TIMEOUT'); r() }, 3000))])
  const clear = () => db.transaction('rw', db.tables, async () => { for (const tb of db.tables) if (tb.name !== 'meta') await tb.clear() })
  await Promise.all([t('clearA', clear()), t('clearB', clear())])
  await Promise.all([t('enqA', enqueueAll()), t('enqB', enqueueAll())])
  await Promise.all([t('initA', useStore.getState().init()), t('initB', useStore.getState().init())])
  return log
})
console.log(r)
await browser.close()
