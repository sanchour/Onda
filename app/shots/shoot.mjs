// Ad-hoc visual check: iPhone 15 Pro, WebKit. Usage: node shots/shoot.mjs [dark]
import { webkit, devices } from '@playwright/test'
const dark = process.argv[2] === 'dark'
const out = (n) => `shots/${dark ? 'dark-' : ''}${n}.png`
const browser = await webkit.launch()
const ctx = await browser.newContext({ ...devices['iPhone 15 Pro'], colorScheme: dark ? 'dark' : 'light' })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
const wait = (ms = 600) => page.waitForTimeout(ms)
const tap = async (name) => { await page.getByRole('button', { name, exact: true }).first().click(); await wait() }
await page.goto('http://localhost:5173/')
await wait(1200)
await page.screenshot({ path: out('01-onboarding') })
await tap('Continue'); await page.screenshot({ path: out('02-onboarding-ondas') })
await tap('Continue'); await tap('Continue'); await page.screenshot({ path: out('03-setup-length') })
await tap('Next'); await page.screenshot({ path: out('04-setup-time') })
await tap('Next'); await page.screenshot({ path: out('05-setup-pick') })
await tap('Get Started'); await wait(600); await page.screenshot({ path: out('06-paywall') })
await page.goto("http://localhost:5173/?seed=demo"); await page.getByText("Onda · Day 4 of 14").waitFor({ timeout: 60000 }); await wait(500)
if (dark) { await page.evaluate(() => {}); }
await page.screenshot({ path: out('10-ondas') })
await page.getByRole('button', { name: /Onda · Day/ }).click().catch(()=>{}); await wait(900)
await page.screenshot({ path: out('11-today') })
await page.evaluate(() => document.querySelector('[class*="pane"]')?.scrollTo?.(0, 0))
await page.screenshot({ path: out('12-today-full'), fullPage: false })
await tap('Back')
await page.getByRole('tab', { name: 'Lagos' }).click(); await wait(700); await page.screenshot({ path: out('20-lagos') })
await page.getByRole('tab', { name: 'Stats' }).click(); await wait(900); await page.screenshot({ path: out('30-stats') })
await tap('Settings'); await wait(500); await page.screenshot({ path: out('40-settings') })
console.log(JSON.stringify({ errors: errors.slice(0, 12) }, null, 1))
await browser.close()
