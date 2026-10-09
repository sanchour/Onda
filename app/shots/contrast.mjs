// Measures text contrast in the Full guide, every tab, in one appearance. Reports the weakest text per Onda and by CSS class.
//   node shots/contrast.mjs [dark|light] [--only=id,id] [--shots]
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { devices, webkit } from '@playwright/test'

const scheme = process.argv[2] === 'light' ? 'light' : 'dark'
const here = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(here, 'contrast')
fs.mkdirSync(out, { recursive: true })
const index = JSON.parse(fs.readFileSync(path.join(here, '..', '..', 'content', 'index.json'), 'utf8'))
const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean)
const ondas = index.filter((o) => !only.length || only.includes(o.id))
const server = spawn('npx', ['vite', 'preview', '--port', '4179', '--strictPort'], { cwd: path.join(here, '..'), shell: true, stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await sleep(3000)
const browser = await webkit.launch()
const ctx = await browser.newContext({ ...devices['iPhone 15 Pro'], colorScheme: scheme })
let page = await ctx.newPage()
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const measure = () =>
  page.evaluate(() => {
    const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[, /]+/).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 } }
    const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 })
    const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b) }
    const bgOf = (el) => {
      const stack = []
      for (let e = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e)
        const c = parse(cs.backgroundColor)
        if (c && c.a > 0) stack.push(c)
        if (c && c.a === 1) break
      }
      let base = { r: 20, g: 21, b: 24, a: 1 }
      const pageBg = parse(getComputedStyle(document.body).backgroundColor)
      if (pageBg && pageBg.a > 0) base = { ...pageBg, a: 1 }
      for (const c of stack.reverse()) base = over(c, base)
      return base
    }
    const rows = []
    const scrolls = [...document.querySelectorAll('.scroll')]
    const top = scrolls[scrolls.length - 1] ?? document.body
    const walker = document.createTreeWalker(top, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.textContent.trim()
      if (t.length < 3) continue
      const el = n.parentElement
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > innerHeight) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none') continue
      let op = 1
      for (let e = el; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity)
      const fg = parse(cs.color)
      if (!fg) continue
      const bg = bgOf(el)
      const eff = over({ ...fg, a: fg.a * op }, bg)
      const ratio = (Math.max(lum(eff), lum(bg)) + 0.05) / (Math.min(lum(eff), lum(bg)) + 0.05)
      const size = parseFloat(cs.fontSize)
      rows.push({ ratio: Math.round(ratio * 100) / 100, text: t.slice(0, 40), cls: (el.className?.toString() ?? '').split(' ').filter((x) => !/^_?\d/.test(x)).join(' ').slice(0, 60), size, weight: cs.fontWeight, op: Math.round(op * 100) / 100 })
    }
    return rows
  })

const all = []
try {
  await page.goto('http://localhost:4179/?seed=demo')
  await page.getByText('Onda · Day 4 of 14').waitFor({ timeout: 90_000 })
  const x = page.getByRole('button', { name: 'Dismiss' })
  if (await x.isVisible().catch(() => false)) await x.click()
  await page.getByRole('tab', { name: 'Ondas' }).click()
  await sleep(500)
  await page.getByRole('button', { name: 'Browse Ondas', exact: true }).first().click()
  await page.getByText('Zen Buddhism').first().waitFor({ timeout: 30000 })
  for (const [n, o] of ondas.entries()) {
    if (n > 0 && n % 10 === 0) {
      await page.context().close()
      const c2 = await browser.newContext({ ...devices['iPhone 15 Pro'], colorScheme: scheme })
      page = await c2.newPage()
      await page.goto('http://localhost:4179/?seed=demo')
      await page.getByText('Onda · Day 4 of 14').waitFor({ timeout: 90_000 })
      const d = page.getByRole('button', { name: 'Dismiss' })
      if (await d.isVisible().catch(() => false)) await d.click()
      await page.getByRole('tab', { name: 'Ondas' }).click()
      await sleep(400)
      await page.getByRole('button', { name: 'Browse Ondas', exact: true }).first().click()
      await page.getByText('Zen Buddhism').first().waitFor({ timeout: 30000 })
    }
    const b = page.getByRole('button', { name: new RegExp(esc(o.name)) }).first()
    await b.scrollIntoViewIfNeeded()
    await b.click()
    await page.getByText('Full guide').first().waitFor({ timeout: 20000 })
    await page.getByRole('button', { name: /Full guide/ }).first().click()
    await sleep(900)
    const tabs = page.getByRole('tab')
    const count = await tabs.count()
    for (let i = 0; i < count; i++) {
      const tab = tabs.nth(i)
      const name = ((await tab.textContent().catch(() => '')) ?? '').trim()
      if (['Lagos', 'Ondas', 'Stats'].includes(name) || !(await tab.isVisible().catch(() => false))) continue
      await tab.click({ timeout: 5000 }).catch(() => undefined)
      await sleep(250)
      // open the first fold on the page so its text is measured too
      const fold = page.locator('[aria-expanded=false]').first()
      if (await fold.isVisible().catch(() => false)) { await fold.click().catch(() => undefined); await sleep(200) }
      for (const r of await measure()) all.push({ id: o.id, tab: name, ...r })
      if (process.argv.includes('--shots') && i < 3) await page.screenshot({ path: path.join(out, `${scheme}-${o.id}-${name}.png`) })
    }
    await page.getByRole('button', { name: 'Back' }).last().click()
    await sleep(500)
    await page.getByRole('button', { name: 'Back' }).last().click()
    await sleep(500)
  }
} finally {
  await browser.close()
  server.kill()
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { shell: true, stdio: 'ignore' })
}
fs.writeFileSync(path.join(out, `${scheme}.json`), JSON.stringify(all))
const weak = all.filter((r) => r.ratio < (r.size >= 24 || (r.size >= 18.66 && Number(r.weight) >= 700) ? 3 : 4.5))
const byCls = new Map()
for (const r of weak) { const k = r.cls || '(none)'; const e = byCls.get(k) ?? { n: 0, min: 99, ex: r.text, op: r.op, ondas: new Set() }; e.n++; e.min = Math.min(e.min, r.ratio); e.ondas.add(r.id); byCls.set(k, e) }
console.log(`[${scheme}] ${all.length} text runs measured, ${weak.length} below WCAG AA`)
for (const [k, e] of [...byCls].sort((a, b) => a[1].min - b[1].min).slice(0, 25)) console.log(`${e.min.toFixed(2)}  x${e.n}  ${e.ondas.size} Ondas  .${k}  e.g. "${e.ex}" (opacity ${e.op})`)
