// Desktop smoothness on a slow laptop: Chromium at 1440x900 with the CPU slowed down (default 6x), from a production build.
//   npm run build && node shots/perf-desk.mjs [throttle=6] [label]
// Prints, per screen: idle CPU (main-thread busy share while nothing is touched), idle frames per second (anything that keeps
// repainting), and scroll frame times (median, p95, share of frames over 33ms).
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const here = path.dirname(fileURLToPath(import.meta.url))
const rate = Number(process.argv[2] ?? 6)
const label = process.argv[3] ?? ''
const port = 5460 + Math.floor(Math.random() * 30)
const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { cwd: path.join(here, '..'), shell: true, stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await sleep(3500)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.25 })
page.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 200)))
const cdp = await page.context().newCDPSession(page)
await cdp.send('Performance.enable')

const busy = async (ms) => {
  const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]))
  const frames = await page.evaluate((ms) => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(n) }; requestAnimationFrame(f) }), ms)
  const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]))
  return { cpu: (m1.TaskDuration - m0.TaskDuration) / (ms / 1000), fps: frames / (ms / 1000) }
}
const scroll = () => page.evaluate(() => new Promise((res) => {
  const panes = [...document.querySelectorAll('.scroll')].filter((e) => e.getBoundingClientRect().width > 0 && e.scrollHeight > e.clientHeight + 200)
  const el = panes.at(-1)
  if (!el) return res(null)
  const times = []
  let last = performance.now()
  let i = 0
  const step = (t) => {
    times.push(t - last)
    last = t
    el.scrollTop += 22
    if (++i < 120) requestAnimationFrame(step)
    else {
      el.scrollTop = 0
      times.shift()
      times.sort((a, b) => a - b)
      res({ med: times[Math.floor(times.length / 2)], p95: times[Math.floor(times.length * 0.95)], slow: times.filter((x) => x > 34).length / times.length })
    }
  }
  requestAnimationFrame(step)
}))
const fmt = (n) => (n == null ? '-' : n.toFixed(1))
async function measure(name) {
  await sleep(1500)
  const idle = await busy(3000)
  const sc = await scroll()
  console.log(`${label.padEnd(8)} ${name.padEnd(12)} idleCPU ${fmt(idle.cpu * 100)}%  scroll med ${fmt(sc?.med)}ms p95 ${fmt(sc?.p95)}ms slow ${fmt((sc?.slow ?? 0) * 100)}%`)
}
try {
  await page.goto(`http://localhost:${port}/?seed=demo`)
  await page.waitForSelector('[data-desk]', { state: 'attached', timeout: 60_000 }).catch(() => {})
  await sleep(4000)
  await page.getByRole('button', { name: 'Dismiss' }).first().click({ timeout: 3000 }).catch(() => {})
  if (process.env.INJECT) await page.addStyleTag({ content: process.env.INJECT })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate })
  await measure('today')
  const nav = async (name) => { await page.getByRole('button', { name, exact: true }).first().click({ timeout: 8000 }); await sleep(1500) }
  await nav('Browse').then(() => measure('browse')).catch((e) => console.log('browse fail', String(e).slice(0, 120)))
  await nav('Today').catch(() => {})
  await page.getByRole('button', { name: /Guide/ }).first().click({ timeout: 8000 }).then(() => measure('guide')).catch((e) => console.log('guide fail', String(e).slice(0, 120)))
  await nav('Today').catch(() => {})
  await page.getByRole('button', { name: /Immerse/ }).first().click({ timeout: 8000 }).then(() => measure('immersion')).catch((e) => console.log('imm fail', String(e).slice(0, 120)))
  await nav('Stats').then(() => measure('stats')).catch((e) => console.log('stats fail', String(e).slice(0, 120)))
} finally {
  await browser.close()
  server.kill()
  process.exit(0)
}
