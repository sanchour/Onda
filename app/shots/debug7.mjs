import { webkit, devices } from '@playwright/test'
const browser = await webkit.launch()
const ctx = await browser.newContext({ ...devices['iPhone 15 Pro'] })
const page = await ctx.newPage()
page.on('console', (m) => m.text().startsWith('NAV') && console.log(m.text().slice(0, 900)))
await page.goto('http://localhost:5173/?seed=demo')
await page.getByText(/Onda · Day \d+ of 14/).waitFor({ timeout: 90000 })
await page.evaluate(async () => {
  const { useNav } = await import('/src/nav/store.ts')
  const s = useNav.getState()
  for (const k of ['closeSheet', 'sheetExited', 'openSheet', 'popToRoot', 'swapSheet']) {
    const orig = s[k]
    useNav.setState({ [k]: (...a) => { console.log('NAV ' + k + ' ' + JSON.stringify(a).slice(0, 80) + ' :: ' + new Error().stack.split('\n').slice(1, 7).map((l) => l.trim().replace(/http:\/\/localhost:5173/g, '')).join(' | ')); return orig(...a) } })
  }
})
await page.getByRole('tab', { name: 'Lagos' }).click(); await page.waitForTimeout(700)
await page.getByRole('button', { name: /Delete social media, day/ }).click(); await page.waitForTimeout(900)
await page.getByRole('button', { name: 'Check In', exact: true }).first().click()
for (const ms of [200, 500, 900, 1500]) { await page.waitForTimeout(ms === 200 ? 200 : 300); console.log(ms, await page.evaluate(() => !![...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Cancel'))) }
await browser.close()
