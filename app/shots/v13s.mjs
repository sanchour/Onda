import { webkit, devices } from '@playwright/test'
const browser = await webkit.launch()
const ctx = await browser.newContext({ ...devices['iPhone 15 Pro'] })
const page = await ctx.newPage()
await page.goto('http://localhost:5173/?seed=demo')
await page.getByText('Onda · Day 4 of 14').waitFor({ timeout: 90000 })
await page.getByRole('tab', { name: 'Stats' }).click()
await page.waitForTimeout(3000)
console.log(await page.evaluate(() => {
  const out = []
  let el = document.querySelector('[role=tabpanel] h1')
  out.push(el ? el.textContent : 'no h1')
  while (el) { const c = getComputedStyle(el); out.push(el.tagName + '.' + String(el.className).slice(0, 30) + ' vis=' + c.visibility + ' op=' + c.opacity + ' disp=' + c.display + ' tr=' + c.transform.slice(0, 30)); el = el.parentElement }
  return out.join('\n')
}))
await page.screenshot({ path: 'shots/v13-stats3.png' })
await browser.close()
