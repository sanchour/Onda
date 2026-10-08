// Starts Playwright Chromium with a debugging port so Lighthouse can attach (chrome-launcher cannot start it on this machine):
//   node shots/chrome-up.mjs &   then   node node_modules/lighthouse/cli/index.js http://localhost:4173/ --port=9223 --only-categories=performance --form-factor=mobile --screenEmulation.mobile
import { chromium } from '@playwright/test'
const b = await chromium.launch({ args: ['--remote-debugging-port=9223'], headless: true })
await b.newPage()
console.log('up')
await new Promise((r) => setTimeout(r, 150000))
await b.close()
