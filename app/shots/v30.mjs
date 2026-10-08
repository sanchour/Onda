// Screenshots for the 3.0 review. Starts `vite preview`, drives WebKit at iPhone size, writes PNGs to shots/v30/.
//   node shots/v30.mjs [light|dark]
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { devices, webkit } from '@playwright/test'

const scheme = process.argv[2] === 'dark' ? 'dark' : 'light'
const here = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(here, 'v30')
fs.mkdirSync(out, { recursive: true })
const server = spawn('npx', ['vite', 'preview', '--port', '4179', '--strictPort'], { cwd: path.join(here, '..'), shell: true, stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await sleep(2500)

const browser = await webkit.launch()
const ctx = await browser.newContext({ ...devices['iPhone 15 Pro'], colorScheme: scheme })
const page = await ctx.newPage()
const shot = async (name, full) => {
  await sleep(500)
  await page.screenshot({ path: path.join(out, `${scheme}-${name}.png`), fullPage: false })
  if (full) console.log('shot', name)
}
const tap = async (name, role = 'button') => {
  await page.getByRole(role, { name, exact: typeof name === 'string' }).first().click()
  await sleep(500)
}
const scrollBy = (y) => page.evaluate((dy) => { const els = [...document.querySelectorAll('.scroll')]; const el = els[els.length - 1]; el.scrollTop += dy }, y)

try {
  await page.goto('http://localhost:4179/?seed=demo')
  await page.getByText('Onda · Day 4 of 14').waitFor({ timeout: 90_000 })
  const x = page.getByRole('button', { name: 'Dismiss' })
  if (await x.isVisible().catch(() => false)) await x.click()
  // trial, so every Onda can be begun
  await tap('Settings')
  await page.getByRole('button', { name: /Ondas\+.*Start Free Trial/s }).click()
  await sleep(500)
  await tap('Start Free Trial')
  await tap('Back')
  await shot('01-ondas')

  await tap('Immerse')
  await shot('02-immerse')
  await scrollBy(500)
  await shot('03-immerse-lower')
  await tap(/^Read \d+ of \d+/)
  await shot('04-library-read')
  await page.getByRole('checkbox', { name: /^Mark Meditations done/ }).click()
  await scrollBy(300)
  await shot('05-library-read-lower')
  await tap(/^About Letters from a Stoic/)
  await shot('06-library-sheet')
  await page.keyboard.press('Escape')
  await page.mouse.click(200, 60)
  await sleep(600)
  await tap('Back')
  await tap(/^Travel \d+ of \d+/)
  await shot('07-library-travel')
  await tap('Back')
  await tap(/^Games \d+ of \d+/)
  await shot('08-library-games')
  await tap('Back')
  await tap('Back')

  await tap('Philosophy')
  await shot('09-philosophy')
  await page.getByRole('button', { expanded: false }).nth(1).click()
  await sleep(400)
  await page.getByRole('checkbox').first().click()
  await scrollBy(260)
  await shot('10-philosophy-open')
  await tap('Back')

  await tap('Rules')
  await page.getByRole('checkbox').nth(1).click()
  await shot('11-rules')
  await tap('Back')

  await page.getByRole('button', { name: /Onda · Day 4 of 14/ }).click()
  await sleep(600)
  await tap('Ethics', 'tab')
  await shot('12-guide-ethics')
  await tap('Travel', 'tab')
  await shot('13-guide-travel')
  await tap('Practices', 'tab')
  await shot('14-guide-practices')
  await tap('Back')

  await page.getByRole('tab', { name: 'Lagos' }).click()
  await sleep(500)
  await shot('15-lagos')
  await tap('Gallery')
  await tap(/^From the Ondas See more/)
  await shot('16-pick-ondas')
  await tap('Back')
  await tap('Back')
  await page.getByRole('tab', { name: 'Ondas' }).click()
  await sleep(400)

  await tap('Browse Ondas')
  await shot('17-browse')
  await tap('Back')

  for (const [id, name] of [['norse', /Norse/], ['cynic', /Diogenes/], ['confucian', /Confucianism/], ['abbasid', /Abbasid Caliphate/], ['twenties', /The 1920s/], ['cuba', /Traditional Cuban/]]) {
    await tap('Browse Ondas')
    await page.getByRole('button', { name }).first().scrollIntoViewIfNeeded()
    await sleep(300)
    if (id === 'norse' || id === 'twenties') await shot(`20-${id}-tile`)
    await page.getByRole('button', { name }).first().click()
    await sleep(900)
    await shot(`21-${id}-preview`)
    await tap('Begin Onda')
    await sleep(900)
    // beginning leaves us on that Onda's Today page; go home
    for (let i = 0; i < 3; i++) {
      const back = page.getByRole('button', { name: 'Back', exact: true }).last()
      if (await back.isVisible().catch(() => false)) { await back.click({ timeout: 1500 }).catch(() => undefined); await sleep(500) } else break
    }
    await shot(`22-${id}-home`)
    await tap('Immerse')
    await tap(/^Read \d+ of \d+/)
    await shot(`23-${id}-library`)
    await tap('Back')
    await tap('Back')
    await tap('Rules')
    await shot(`24-${id}-rules`)
    await tap('Back')
    console.log('done', id, await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor + ' | ' + localStorage.getItem('onda.bg.light') + ' ' + localStorage.getItem('onda.bg.dark')))
  }
  // relaunch: the saved background must be on the page before the app boots
  await page.goto('about:blank')
  await page.route('**/assets/index-*.js', (r) => new Promise(() => r)) // hold the app back
  await page.goto('http://localhost:4179/', { waitUntil: 'commit' }).catch(() => undefined)
  await sleep(800)
  console.log('launch page', await page.evaluate(() => ({ html: document.documentElement.style.backgroundColor, body: getComputedStyle(document.body).backgroundColor, theme: document.querySelector('meta[name=theme-color]').content, mode: document.documentElement.dataset.theme })))
  await shot('30-launch-shell')
} catch (e) {
  console.error('FAILED', e.message.split('\n').slice(0, 6).join('\n'))
  await page.screenshot({ path: path.join(out, `${scheme}-error.png`) })
} finally {
  await browser.close()
  server.kill()
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
}
