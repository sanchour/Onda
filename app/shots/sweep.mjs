// Full sweep: opens every Onda (page and Full guide) plus the main tabs and Settings pages, in one appearance, and reports
// script errors, raw or broken text, display fonts that did not load, and sideways overflow. Screenshots go to shots/sweep/.
//   node shots/sweep.mjs [light|dark] [--shots]
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { devices, webkit } from '@playwright/test'

const scheme = process.argv[2] === 'dark' ? 'dark' : 'light'
const withShots = process.argv.includes('--shots')
const here = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(here, 'sweep')
fs.mkdirSync(out, { recursive: true })
const index = JSON.parse(fs.readFileSync(path.join(here, '..', '..', 'content', 'index.json'), 'utf8'))
const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean)
const ondas = (Array.isArray(index) ? index : index.ondas).filter((o) => !only.length || only.includes(o.id))
const server = spawn('npx', ['vite', 'preview', '--port', '4179', '--strictPort'], { cwd: path.join(here, '..'), shell: true, stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await sleep(3000)

const browser = await webkit.launch()
const findings = []
let where = 'start'
const flag = (msg) => findings.push(`[${scheme}] ${where}: ${msg}`)
let page
async function fresh() {
  if (page) await page.context().close()
  const ctx = await browser.newContext({ ...devices['iPhone 15 Pro'], colorScheme: scheme })
  page = await ctx.newPage()
  listen()
  await page.goto('http://localhost:4179/?seed=demo')
  await page.getByText('Onda · Day 4 of 14').waitFor({ timeout: 90_000 })
  const x = page.getByRole('button', { name: 'Dismiss' })
  if (await x.isVisible().catch(() => false)) await x.click()
}
function listen() {
page.on('pageerror', (e) => flag('script error: ' + String(e).slice(0, 200)))
page.on('console', (m) => {
  if (m.type() !== 'error') return
  const t = m.text()
  if (/preloaded using link preload|favicon|Failed to load resource: the server responded with a status of 404 \(Not Found\).*supabase/.test(t)) return
  flag('console error: ' + t.slice(0, 200))
})
page.on('requestfailed', (r) => {
  const u = r.url()
  if (/localhost:4179/.test(u)) flag('request failed: ' + u.replace('http://localhost:4179', ''))
})
page.on('response', (r) => {
  if (r.status() >= 400 && /localhost:4179/.test(r.url())) flag(`HTTP ${r.status()}: ` + r.url().replace('http://localhost:4179', ''))
})
}

/** Looks at the page that is on top right now. */
const inspect = () =>
  page.evaluate(async () => {
    await document.fonts.ready
    const problems = []
    const scrolls = [...document.querySelectorAll('.scroll')]
    const top = scrolls[scrolls.length - 1] ?? document.body
    const text = top.innerText
    const bad = text.match(/\bundefined\b|\bNaN\b|\[object Object\]|\{\{[^}]*\}\}|\bnull\b/)
    if (bad) problems.push(`broken text "${bad[0]}" near "${text.slice(Math.max(0, bad.index - 40), bad.index + 40).replace(/\s+/g, ' ')}"`)
    const key = text.match(/\b(onda|settings|common|browse|lagos|stats|paywall|whatsNew|sw|onboarding)\.[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*\b/)
    if (key) problems.push(`raw text key "${key[0]}"`)
    if (top.scrollWidth > top.clientWidth + 2) problems.push(`sideways overflow ${top.scrollWidth - top.clientWidth}px`)
    const h = top.querySelector('h1')
    let font = null
    if (h) {
      const fam = getComputedStyle(h).fontFamily.split(',')[0].trim()
      font = fam
      const size = getComputedStyle(h).fontSize
      const weight = getComputedStyle(h).fontWeight
      if (!/^(-apple-system|system-ui|BlinkMacSystemFont|serif|sans-serif|Georgia)$/i.test(fam.replace(/["']/g, '')) && !document.fonts.check(`${weight} ${size} ${fam}`)) problems.push(`title font ${fam} ${weight} is not loaded`)
      const r = h.getBoundingClientRect()
      if (h.scrollWidth > h.clientWidth + 2) problems.push(`title is clipped: "${h.textContent}"`)
      if (r.height > 220) problems.push(`title is very tall (${Math.round(r.height)}px): "${h.textContent}"`)
    }
    const empties = [...top.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth === 0).length
    if (empties) problems.push(`${empties} broken image(s)`)
    return { problems, font, length: text.length }
  })

const check = async (label, minLength = 80) => {
  where = label
  const r = await inspect().catch((e) => ({ problems: ['could not inspect: ' + String(e).slice(0, 120)], length: 0 }))
  for (const p of r.problems) flag(p)
  if (r.length < minLength) flag(`page looks empty (${r.length} characters)`)
  return r
}
const shot = async (name) => {
  if (withShots) await page.screenshot({ path: path.join(out, `${scheme}-${name}.png`) })
}
const back = async () => {
  await page.getByRole('button', { name: 'Back' }).last().click()
  await sleep(550)
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

try {
  await fresh()

  // The three tabs
  for (const t of ['Lagos', 'Ondas', 'Stats']) {
    await page.getByRole('tab', { name: t }).click()
    await sleep(900)
    await check(`tab ${t}`)
    await shot(`tab-${t.toLowerCase()}`)
  }
  await page.getByRole('tab', { name: 'Ondas' }).click()
  await sleep(500)

  // The running Onda's own pages
  for (const [btn, label] of [['Journal', 'Journal'], ['Philosophy', 'Philosophy'], ['Rules', 'Rules'], ['Immerse', 'Immerse']]) {
    const b = page.getByRole('button', { name: new RegExp('^' + btn) }).first()
    if (!(await b.isVisible().catch(() => false))) {
      where = 'Ondas tab'
      flag(`no "${btn}" tile`)
      continue
    }
    await b.click()
    await sleep(1100)
    await check(`running Onda · ${label}`)
    await shot(`run-${label.toLowerCase()}`)
    await back()
  }

  // Settings and its pages
  await page.getByRole('button', { name: 'Settings', exact: true }).first().click()
  await sleep(900)
  await check('Settings')
  for (const row of ['Subscription', 'Appearance', 'Notifications', 'Practice', 'Integrations', 'Data', 'Privacy', 'Help & About']) {
    await page.getByRole('button', { name: new RegExp('^' + esc(row)) }).first().click()
    await sleep(800)
    await check(`Settings · ${row}`, 30)
    if (row === 'Help & About') await shot('settings-help')
    await back()
  }
  await back()

  // Every Onda: its page and its Full guide
  await page.getByRole('button', { name: 'Browse Ondas', exact: true }).first().click()
  await page.getByText('Zen Buddhism').first().waitFor({ timeout: 30000 })
  await sleep(600)
  await check('All Ondas')
  await shot('browse')
  let done = 0
  for (const [n, o] of ondas.entries()) {
    if (n > 0 && n % 12 === 0) {
      await fresh()
      await page.getByRole('button', { name: 'Browse Ondas', exact: true }).first().click()
      await page.getByText('Zen Buddhism').first().waitFor({ timeout: 30000 })
      await sleep(600)
    }
    where = `Onda ${o.name}`
    const b = page.getByRole('button', { name: new RegExp(esc(o.name)) }).first()
    try {
      await b.scrollIntoViewIfNeeded({ timeout: 8000 })
      await b.click({ timeout: 8000 })
    } catch {
      flag('not found in the Browse list')
      continue
    }
    await page.getByText('Full guide').first().waitFor({ timeout: 20000 }).catch(() => flag('page did not finish loading'))
    await sleep(500)
    const r = await check(`Onda ${o.name}`, 400)
    const themed = await page.evaluate((id) => !!document.querySelector(`[data-onda="${id}"]`), o.id)
    if (!themed) flag('page is not themed')
    if (r.font && /Inter|system/i.test(r.font)) flag(`title uses the plain font (${r.font})`)
    await shot(`onda-${o.id}`)
    try {
      await page.getByRole('button', { name: /Full guide/ }).first().click({ timeout: 8000 })
      await sleep(900)
      await check(`Onda ${o.name} · Full guide`, 300)
      // each tab of the guide must have content
      const tabs = page.getByRole('tab')
      const count = await tabs.count()
      for (let i = 0; i < count; i += 3) {
        const tab = tabs.nth(i)
        const name = (await tab.textContent().catch(() => '')) ?? ''
        if (['Lagos', 'Ondas', 'Stats'].includes(name.trim())) continue
        if (!(await tab.isVisible().catch(() => false))) continue
        await tab.click({ timeout: 5000 }).catch(() => undefined)
        await sleep(160)
        await check(`Onda ${o.name} · guide · ${name.trim()}`, 120)
      }
      await back()
    } catch (e) {
      flag('Full guide did not open: ' + String(e).slice(0, 100))
    }
    await back()
    done++
  }
  console.log(`[${scheme}] opened ${done} of ${ondas.length} Ondas`)
} catch (e) {
  flag('SWEEP STOPPED: ' + String(e).slice(0, 300))
  await page.screenshot({ path: path.join(out, `${scheme}-stopped.png`) })
} finally {
  await browser.close()
  server.kill()
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { shell: true, stdio: 'ignore' })
}
const uniq = [...new Set(findings)]
fs.writeFileSync(path.join(out, `${scheme}-findings.txt`), uniq.join('\n'))
console.log(`[${scheme}] findings: ${uniq.length}`)
console.log(uniq.slice(0, 80).join('\n'))
