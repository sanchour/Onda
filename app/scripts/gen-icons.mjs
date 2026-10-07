// Generates the app icons, the notification badge and the iOS launch images, and writes the
// <link rel="apple-touch-startup-image"> block into index.html. Run: npm run icons
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pub = (...p) => path.join(root, 'public', ...p)
const BLUE = '#0A68D8'

// Three waves: the Ondas tab glyph, redrawn as plain strokes.
const waves = (stroke, w = 34) => `
  <g fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round">
    <path d="M132 190c42-34 82-34 124 0s82 34 124 0"/>
    <path d="M132 256c42-34 82-34 124 0s82 34 124 0"/>
    <path d="M132 322c42-34 82-34 124 0s82 34 124 0"/>
  </g>`
const icon = ({ pad = 0, bg = BLUE, fg = '#FFFFFF', radius = 0 } = {}) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${radius}" fill="${bg}"/>
  <g transform="translate(256 256) scale(${1 - pad}) translate(-256 -256)">${waves(fg)}</g>
</svg>`

const png = (svg, size, file) => sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toFile(file)

// Portrait launch images: [css width, css height, device pixel ratio]
const DEVICES = [
  [440, 956, 3], // 16 / 17 Pro Max
  [430, 932, 3], // 14 Pro Max, 15 / 16 Plus
  [420, 912, 3], // Air
  [402, 874, 3], // 16 / 17 Pro
  [393, 852, 3], // 14 Pro, 15, 15 Pro, 16
  [428, 926, 3], // 12 / 13 Pro Max, 14 Plus
  [390, 844, 3], // 12, 13, 14
  [375, 812, 3], // X, XS, 11 Pro, 12 / 13 mini
  [414, 896, 3], // XS Max, 11 Pro Max
  [414, 896, 2], // XR, 11
  [375, 667, 2], // SE
]
const THEMES = [
  { name: 'light', bg: '#F1F2F6', fg: BLUE },
  { name: 'dark', bg: '#1B1C1F', fg: '#3D94FF' },
]

async function main() {
  await fs.mkdir(pub('icons'), { recursive: true })
  await fs.mkdir(pub('splash'), { recursive: true })

  await png(icon(), 180, pub('icons', 'apple-touch-icon.png')) // iOS rounds the corners itself
  await png(icon({ radius: 112 }), 192, pub('icons', 'icon-192.png'))
  await png(icon({ radius: 112 }), 512, pub('icons', 'icon-512.png'))
  await png(icon({ pad: 0.22 }), 192, pub('icons', 'maskable-192.png')) // content inside the 80% safe zone
  await png(icon({ pad: 0.22 }), 512, pub('icons', 'maskable-512.png'))
  await png(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${waves('#FFFFFF', 40)}</svg>`, 96, pub('icons', 'badge-96.png'))
  await fs.writeFile(pub('favicon.svg'), icon({ radius: 112 }).trim() + '\n')

  const links = []
  for (const [w, h, r] of DEVICES) {
    for (const t of THEMES) {
      const W = w * r
      const H = h * r
      const s = Math.round(W * 0.22)
      const mark = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${waves(t.fg, 30)}</svg>`)).resize(s, s).png().toBuffer()
      const file = `splash/${t.name}-${W}x${H}.png`
      await sharp({ create: { width: W, height: H, channels: 3, background: t.bg } })
        .composite([{ input: mark, left: Math.round((W - s) / 2), top: Math.round((H - s) / 2) }])
        .png({ compressionLevel: 9, palette: true })
        .toFile(pub(file))
      const scheme = t.name === 'dark' ? ' and (prefers-color-scheme: dark)' : ''
      links.push(`    <link rel="apple-touch-startup-image" href="/${file}" media="screen and (device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)${scheme}" />`)
    }
  }

  const htmlPath = path.join(root, 'index.html')
  const html = await fs.readFile(htmlPath, 'utf8')
  const block = `<!--splash-->\n${links.join('\n')}\n    <!--/splash-->`
  const next = html.includes('<!--/splash-->') ? html.replace(/<!--splash-->[\s\S]*?<!--\/splash-->/, block) : html.replace('<!--splash-->', block)
  await fs.writeFile(htmlPath, next)
  console.log(`icons: 6, launch images: ${links.length}`)
}

await main()
