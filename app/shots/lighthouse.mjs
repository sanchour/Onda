// Lighthouse against the production preview, using Playwright's Chromium (chrome-launcher cannot start it on this machine).
// Needs `npm run build && npm run preview` running. Usage: node shots/lighthouse.mjs [name]   (writes shots/lh-<name>.json)
import { chromium } from '@playwright/test'
import { spawnSync } from 'node:child_process'
const name = process.argv[2] ?? 'run'
const browser = await chromium.launch({ args: ['--remote-debugging-port=9222'] })
await browser.newPage()
const out = `shots/lh-${name}.json`
spawnSync('node', ['node_modules/lighthouse/cli/index.js', 'http://localhost:4173/', '--port=9222', '--only-categories=performance', '--form-factor=mobile', '--screenEmulation.mobile', '--output=json', `--output-path=${out}`, '--quiet'], { stdio: 'inherit' })
await browser.close()
const { default: fs } = await import('node:fs')
const r = JSON.parse(fs.readFileSync(out, 'utf8'))
console.log('performance score', r.categories.performance.score)
for (const k of ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index', 'bootup-time', 'total-byte-weight']) console.log(k.padEnd(26), r.audits[k]?.displayValue)
