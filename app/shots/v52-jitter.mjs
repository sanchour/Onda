// Checks that the Immerse screen holds still: prints the position of each kind tile over two seconds.
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { devices, webkit } from '@playwright/test'

const here = path.dirname(fileURLToPath(import.meta.url))
const server = spawn('npx', ['vite', 'preview', '--port', '4179', '--strictPort'], { cwd: path.join(here, '..'), shell: true, stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await sleep(3000)
const browser = await webkit.launch()
const page = await (await browser.newContext({ ...devices['iPhone 15 Pro'] })).newPage()
try {
  await page.goto('http://localhost:4179/?seed=demo')
  await page.getByText('Onda · Day 4 of 14').waitFor({ timeout: 90_000 })
  if (process.argv[2] === 'page') {
    await page.getByRole('tab', { name: 'Ondas' }).click()
    await sleep(600)
    await page.getByRole('button', { name: 'Browse Ondas', exact: true }).first().click()
    await sleep(900)
    await page.getByRole('button', { name: /Stoicism/ }).first().click()
    await sleep(1500)
    await page.getByRole('button', { name: 'See All' }).click()
  } else {
    await page.getByRole('tab', { name: 'Ondas' }).click()
    await sleep(800)
    await page.getByRole('button', { name: /^Immerse/ }).first().click()
  }
  await sleep(1500)
  const read = () =>
    page.evaluate(() => {
      const sc = [...document.querySelectorAll('.scroll')].pop()
      return JSON.stringify({
        top: sc.scrollTop,
        h: sc.scrollHeight,
        tiles: [...document.querySelectorAll('[class*=kindTile]')].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)].join(',') }).join(' | '),
        today: (() => { const r = document.querySelector('[class*=imToday]')?.getBoundingClientRect(); return r ? [Math.round(r.y), Math.round(r.height)].join(',') : '' })(),
      })
    })
  const seen = new Set()
  for (let i = 0; i < 20; i++) { seen.add(await read()); await sleep(100) }
  console.log('distinct layouts in 2s:', seen.size)
  for (const s of [...seen].slice(0, 3)) console.log(s)
  const t0 = Date.now()
  await page.getByRole('button', { name: /^Eat [0-9]+ of/ }).first().click({ timeout: 8000 }).then(() => console.log('click ok', Date.now() - t0), (e) => console.log('CLICK FAILED', String(e).slice(0, 400)))
  const raf = await Promise.race([page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r('raf ok'))))), sleep(3000).then(() => 'RAF STARVED')])
  console.log(raf)
} finally {
  await browser.close()
  server.kill()
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { shell: true, stdio: 'ignore' })
}
