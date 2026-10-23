// What keeps the desktop busy while nothing is touched: running animations and long tasks per screen, from a production
// build (npx vite build first).   node shots/idle-desk.mjs
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const here = path.dirname(fileURLToPath(import.meta.url))
const port = 5490 + Math.floor(Math.random() * 30)
const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { cwd: path.join(here, '..'), shell: true, stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
for (let i = 0; i < 60; i++) { if (await fetch(`http://localhost:${port}/`).then((r) => r.ok).catch(() => false)) break; await sleep(1000) }
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.addInitScript((v) => localStorage.setItem('onda.lite', v), process.env.LITE ? 'on' : 'off')
if (process.env.INJECT) await page.addInitScript((css) => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = css; document.head.append(s) }), process.env.INJECT)
const report = async (name) => {
  await sleep(2500)
  const r = await page.evaluate(() => new Promise((res) => {
    const anims = document.getAnimations().filter((a) => a.playState === 'running').map((a) => `${a.animationName || a.constructor.name}@${(a.effect?.target?.className?.baseVal ?? a.effect?.target?.className ?? '').toString().slice(0, 40)}`)
    let long = 0
    const po = new PerformanceObserver((l) => { for (const e of l.getEntries()) long += e.duration })
    po.observe({ type: 'longtask', buffered: false })
    let frames = 0
    const t0 = performance.now()
    const f = () => { frames++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else { po.disconnect(); res({ anims: [...new Set(anims)].slice(0, 12), n: anims.length, long: Math.round(long), fps: frames / 2 }) } }
    requestAnimationFrame(f)
  }))
  console.log(name, JSON.stringify(r))
}
try {
  await page.goto(`http://localhost:${port}/?seed=demo`)
  await page.waitForSelector('[data-desk]', { state: 'attached', timeout: 60_000 }).catch(() => {})
  await sleep(4000)
  await page.getByRole('button', { name: 'Dismiss' }).first().click({ timeout: 3000 }).catch(() => {})
  await report('today')
  await page.getByRole('button', { name: 'Browse', exact: true }).first().click()
  await report('browse')
  await page.getByRole('button', { name: 'Today', exact: true }).first().click()
  await page.getByRole('button', { name: /Immerse/ }).first().click()
  await report('immersion')
  await page.getByRole('button', { name: 'Today', exact: true }).first().click()
  await page.getByRole('button', { name: /Guide/ }).first().click()
  await report('guide')
} catch (e) {
  console.log('FATAL', String(e).slice(0, 300))
} finally {
  await browser.close()
  server.kill()
  process.exit(0)
}
