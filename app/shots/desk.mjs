// Desktop screenshots. Starts a Vite server (dev by default, `PREVIEW=1` for the built app in dist/), drives Chromium
// at laptop size, writes PNGs to shots/<out>/.
//   node shots/desk.mjs <out> [light|dark] [width] [height]
//   STEPS="tab:Lagos:02-lagos,btn:Browse:03-browse,key:Escape,wait:500,shot:04-x" node shots/desk.mjs mine
// Steps: tab:<regex>, btn:<regex>, text:<regex>, key:<key>, wait:<ms>, shot:<name>, eval:<js>, scroll:<px> (last scroll pane).
// A third field on tab/btn/text/key/scroll takes a screenshot after the step. SEED=0 skips the demo data (fresh first run).
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const name = process.argv[2] || 'desk'
const scheme = process.argv[3] === 'dark' ? 'dark' : 'light'
const W = Number(process.argv[4] || 1440)
const H = Number(process.argv[5] || 900)
const here = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(here, name)
fs.mkdirSync(out, { recursive: true })
const port = 4300 + Math.floor(Math.random() * 600)
const preview = process.env.PREVIEW === '1'
const args = preview ? ['vite', 'preview', '--port', String(port), '--strictPort'] : ['vite', '--port', String(port), '--strictPort']
const server = spawn('npx', args, { cwd: path.join(here, '..'), shell: true, stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
for (let i = 0; i < 120; i++) {
  if (await fetch(`http://localhost:${port}/`).then(() => true, () => false)) break
  await sleep(500)
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: scheme })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
const shot = async (n) => {
  await sleep(800)
  await page.screenshot({ path: path.join(out, `${scheme}-${n}.png`) })
  console.log('shot', path.join(out, `${scheme}-${n}.png`))
}
const click = async (loc) => {
  await loc.first().click()
  await sleep(700)
}

try {
  const seed = process.env.SEED !== '0'
  await page.goto(`http://localhost:${port}/${seed ? '?seed=demo' : ''}`)
  if (seed) await page.getByText(/Day 4 of 14/).first().waitFor({ timeout: 120_000 })
  else await sleep(8000)
  await sleep(1500)
  const x = page.getByRole('button', { name: 'Dismiss' })
  if (await x.isVisible().catch(() => false)) await x.click()
  await shot('01-home')
  const steps = (process.env.STEPS || '').split(',').filter(Boolean)
  for (const s of steps) {
    const [kind, arg, label] = s.split(':')
    if (kind === 'btn') await click(page.getByRole('button', { name: new RegExp(arg, 'i') }))
    if (kind === 'tab') await click(page.getByRole('tab', { name: new RegExp(arg, 'i') }))
    if (kind === 'text') await click(page.getByText(new RegExp(arg, 'i')))
    if (kind === 'key') {
      await page.keyboard.press(arg)
      await sleep(500)
    }
    if (kind === 'wait') await sleep(Number(arg))
    if (kind === 'eval') await page.evaluate(arg)
    if (kind === 'scroll') {
      await page.evaluate((dy) => {
        const els = [...document.querySelectorAll('.scroll')].filter((e) => e.offsetParent !== null)
        const el = els[els.length - 1]
        if (el) el.scrollTop += dy
      }, Number(arg))
      await sleep(400)
    }
    if (kind === 'shot') await shot(arg)
    if (label) await shot(label)
  }
} catch (e) {
  console.error('FAILED', e.message.split('\n')[0])
  await page.screenshot({ path: path.join(out, `${scheme}-zz-fail.png`) })
} finally {
  if (errors.length) console.log('page errors:\n' + [...new Set(errors)].slice(0, 12).join('\n'))
  await browser.close()
  server.kill()
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/f', '/t'], { shell: true, stdio: 'ignore' })
  process.exit(0)
}
