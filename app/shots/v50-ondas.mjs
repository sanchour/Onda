// Screenshots of the Browse list and of some of the Ondas new in 5.0. Starts `vite preview`, drives WebKit at iPhone size, writes PNGs to shots/v50/.
//   node shots/v50-ondas.mjs [light|dark] [name ...]
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { devices, webkit } from '@playwright/test'

const scheme = process.argv[2] === 'dark' ? 'dark' : 'light'
const names = process.argv.slice(3).length ? process.argv.slice(3) : ['Frisian', 'Maasai', 'Polynesian', 'The 1960s', 'The Renaissance', 'Holy Roman Empire', 'Micronesian', 'Aboriginal Australian']
const here = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(here, 'v50')
fs.mkdirSync(out, { recursive: true })
const server = spawn('npx', ['vite', 'preview', '--port', '4179', '--strictPort'], { cwd: path.join(here, '..'), shell: true, stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await sleep(2500)

const browser = await webkit.launch()
const ctx = await browser.newContext({ ...devices['iPhone 15 Pro'], colorScheme: scheme })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
const shot = async (name) => {
  await sleep(600)
  await page.screenshot({ path: path.join(out, `${scheme}-${name}.png`) })
  console.log('shot', name)
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

try {
  await page.goto('http://localhost:4179/?seed=demo')
  await page.getByText('Onda · Day 4 of 14').waitFor({ timeout: 90_000 })
  const x = page.getByRole('button', { name: 'Dismiss' })
  if (await x.isVisible().catch(() => false)) await x.click()
  await page.getByRole('button', { name: 'Browse Ondas', exact: true }).first().click()
  await sleep(2500)
  await shot('browse')
  for (const n of names) {
    const b = page.getByRole('button', { name: new RegExp('^' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first()
    await b.scrollIntoViewIfNeeded()
    await sleep(300)
    await b.click()
    await page.getByText('Full guide').first().waitFor({ timeout: 30000 }).catch(() => undefined)
    await sleep(1500)
    await shot(`onda-${slug(n)}`)
    await page.evaluate(() => { const els = [...document.querySelectorAll('.scroll')]; els[els.length - 1].scrollTop += 620 })
    await shot(`onda-${slug(n)}-2`)
    await page.getByRole('button', { name: 'Back' }).first().click()
    await sleep(700)
  }
  console.log('page errors:', errors.length, errors.slice(0, 3).join(' | '))
} catch (e) {
  console.error('FAILED', e)
  await page.screenshot({ path: path.join(out, `${scheme}-ondas-fail.png`) })
} finally {
  await browser.close()
  server.kill()
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { shell: true, stdio: 'ignore' })
}
