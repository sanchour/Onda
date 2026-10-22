// Begins several Ondas in turn and screenshots each one's home (the Ondas tab), to compare their looks.
//   node shots/v7-homes.mjs <outDir> [light|dark] [names, comma separated]
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { devices, webkit } from '@playwright/test'

const here = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(here, process.argv[2] ?? 'v7-homes')
const scheme = process.argv[3] ?? 'light'
const names = (process.argv[4] ?? 'Zen Buddhism,Norse,Aztec,Hinduism,Celtic').split(',')
fs.mkdirSync(out, { recursive: true })
const port = 4350 + Math.floor(Math.random() * 30)
const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { cwd: path.join(here, '..'), shell: true, stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await sleep(6000)
const browser = await webkit.launch()
const page = await (await browser.newContext({ ...devices['iPhone 15 Pro'], colorScheme: scheme })).newPage()
const shot = (n) => page.screenshot({ path: path.join(out, `${scheme}-${n}.png`), scale: 'css' })
try {
  await page.goto(`http://localhost:${port}/?seed=demo`)
  await page.getByRole('button', { name: 'Browse Ondas' }).first().waitFor({ timeout: 90_000 })
  await sleep(1500)
  await page.getByRole('button', { name: /^(Dismiss|Close)$/ }).first().click({ timeout: 2000 }).catch(() => {})
  await shot('0-Stoicism')
  // beginning another Onda needs Ondas+, so start the trial first (as the e2e helper does)
  await page.getByRole('button', { name: 'Settings', exact: true }).first().click()
  await sleep(900)
  await page.getByRole('button', { name: /Ondas\+.*Start Free Trial/s }).click()
  await sleep(900)
  await page.getByRole('button', { name: 'Start Free Trial', exact: true }).first().click()
  await sleep(900)
  await page.getByRole('button', { name: 'Back', exact: true }).first().click()
  await sleep(900)
  for (const [i, n] of names.entries()) {
    try {
      await page.getByRole('button', { name: 'Browse Ondas' }).first().click()
      await sleep(1200)
      await page.getByRole('button', { name: new RegExp(n) }).first().click()
      await sleep(1200)
      await page.getByRole('button', { name: 'Begin Onda' }).click()
      await sleep(1500)
      for (let k = 0; k < 2; k++) { await page.getByRole('button', { name: 'Back', exact: true }).first().click(); await sleep(900) }
      await page.getByRole('button', { name: /^(Dismiss|Close)$/ }).first().click({ timeout: 1500 }).catch(() => {})
      await shot(`${i + 1}-${n.replace(/\s+/g, '')}`)
    } catch (e) {
      console.log('FAIL', n, String(e).slice(0, 160))
      await page.goto(`http://localhost:${port}/`)
      await sleep(3000)
    }
  }
} finally {
  await browser.close()
  server.kill()
  process.exit(0)
}
