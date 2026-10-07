const fs = require('fs')
const edit = (f, fn) => { const t = fs.readFileSync(f, 'utf8'); const r = fn(t); if (r === t) console.log('NO CHANGE', f); fs.writeFileSync(f, r) }
const must = (t, a, b) => { if (!t.includes(a)) throw new Error('missing: ' + a.slice(0, 70)); return t.replace(a, b) }
const TINT = 'color-mix(in srgb, var(--onda-solid) 30%, var(--surface-grouped))'

edit('src/sheets/common.tsx', (t) => {
  t = must(t, "import { useNav, type SheetEntry } from '@/nav/store'", "import type { OndaLook } from '@/content/themes'\nimport { useNav, type SheetEntry } from '@/nav/store'")
  t = must(t, "  onCancel?: () => void\n  children: ReactNode\n}", "  onCancel?: () => void\n  /** Theme the sheet with an Onda: its colour, pattern and typeface. */\n  look?: OndaLook\n  children: ReactNode\n}")
  t = must(t, "background, onCancel, children }: AppSheetProps)", "background, onCancel, look, children }: AppSheetProps)")
  t = must(t, "background={background} onScrimClick={onCancel}>", "background={background ?? (look ? '" + TINT + "' : undefined)} style={look?.vars} onScrimClick={onCancel}>")
  return t
})

edit('src/screens/ondaShared.tsx', (t) => t + `
/** A themed header card for sheets and pages: the Onda's fill, glyph watermark, icon and display face. */
export function OndaBanner({ look, icon, kicker, title, sub }: { look: OndaLook; icon: string; kicker?: string; title: string; sub?: string }) {
  return (
    <div className={\`\${o.sBanner} \${o.themed}\`}>
      <Glyph look={look} opacity={0.14} right={14} bottom={4} />
      <span className={\`\${o.sBannerIcon} \${o.chipCircle}\`}>
        <Icon name={icon} weight="fill" size={22} />
      </span>
      <span className={o.sBannerText}>
        {kicker && <span className={o.sBannerKicker}>{kicker}</span>}
        <span className={o.sBannerTitle}>{title}</span>
        {sub && <span className={o.sBannerSub}>{sub}</span>}
      </span>
    </div>
  )
}
`)

edit('src/sheets/OndaSheets.tsx', (t) => {
  t = must(t, "import { Glyph, useActiveOnda, useRunToday } from '@/screens/ondaShared'", "import { Glyph, OndaBanner, useActiveOnda, useRunToday } from '@/screens/ondaShared'")
  // journal list
  t = must(t, "<AppSheet entry={entry} title={t('journal.title')} detent={0.78} trailing=", "<AppSheet entry={entry} look={active?.look} title={t('journal.title')} detent={0.78} trailing=")
  t = must(t, "      <div style={{ padding: '4px 16px 48px', ...active?.look.vars }}>\n        <Button", "      <div style={{ padding: '4px 16px 48px' }}>\n        {active?.look && <div style={{ marginBottom: 16 }}><OndaBanner look={active.look} icon=\"notebook\" kicker={name} title={t('journal.title')} sub={t('journal.count', { count: entries.length })} /></div>}\n        <Button")
  // editor
  t = must(t, "<AppSheet entry={entry} title={t('journal.title')} leading=\"cancel\"", "<AppSheet entry={entry} look={active.look} title={t('journal.title')} leading=\"cancel\"")
  t = must(t, "      <div style={{ padding: '8px 20px 40px', ...active.look.vars }}>\n        <div className={o.jeKicker}>{t('journal.dayLabel', { day, name: active.index?.name ?? '' })}</div>\n        <h2 className={o.jePrompt}>{prompt}</h2>", "      <div style={{ padding: '8px 20px 40px' }}>\n        <div className={`${o.jeCard} ${o.themed}`}>\n          <Glyph look={active.look} opacity={0.12} right={14} bottom={4} />\n          <div className={o.jeKicker} style={{ color: 'inherit', opacity: 0.8 }}>{t('journal.dayLabel', { day, name: active.index?.name ?? '' })}</div>\n          <h2 className={o.jePrompt}>{prompt}</h2>\n        </div>")
  // philosophy
  t = must(t, "<AppSheet entry={entry} title={t('philosophy.title')} detent={0.78}>\n      <div style={{ padding: '4px 20px 48px', ...active?.look.vars }}>\n        <div className={o.lead}>{t('philosophy.lead')}</div>", "<AppSheet entry={entry} look={active?.look} title={t('philosophy.title')} detent={0.78}>\n      <div style={{ padding: '4px 20px 48px' }}>\n        {active?.look && <OndaBanner look={active.look} icon=\"lightbulb\" kicker={active.index?.name} title={t('philosophy.title')} sub={t('philosophy.lead')} />}")
  // guide
  t = must(t, "<AppSheet entry={entry} title={index?.name ?? ''}>\n      <div style={{ padding: '0 0 60px', ...look.vars }}>", "<AppSheet entry={entry} look={look} title={index?.name ?? ''}>\n      <div style={{ padding: '0 0 60px' }}>")
  return t
})

edit('src/screens/OndaFlow.tsx', (t) => {
  t = must(t, "    <Screen chrome={<BackButton />}>\n      <div className={s.pageHead}>\n        <h1 className={s.largeTitle}>{t('immersion.title')}</h1>\n        <div className={`${s.sub} ${s.sub2}`}>{t('immersion.experienced', { name: active.index?.name ?? '', done: media.filter((m) => done.has(m.id)).length, total: media.length })}</div>\n      </div>", "    <Screen chrome={<BackButton />} style={active.look.vars}>\n      <div style={{ padding: '0 16px' }}>\n        <OndaBanner look={active.look} icon=\"headphones\" kicker={active.index?.name} title={t('immersion.title')} sub={t('immersion.experienced', { done: media.filter((m) => done.has(m.id)).length, total: media.length })} />\n      </div>")
  t = must(t, "import { useActiveOnda } from './ondaShared'", "import { OndaBanner, useActiveOnda } from './ondaShared'")
  return t
})

edit('src/i18n/en.ts', (t) => {
  t = must(t, "experienced: '{{name}} · {{done}} of {{total}} experienced'", "experienced: '{{done}} of {{total}} experienced'")
  return must(t, "journal: {\n    title: 'Journal',", "journal: {\n    count_one: '{{count}} entry', count_other: '{{count}} entries',\n    title: 'Journal',")
})

edit('src/screens/ondas.module.css', (t) => {
  t = t.replace(/\.quickTile\{[^}]*\}\n\.quickTile:active\{[^}]*\}\n\.quickCircle\{[^}]*\}/, `.quickTile{position:relative;overflow:hidden;background:color-mix(in srgb,var(--onda-solid) 55%,var(--surface-card));border-radius:22px;padding:14px 4px;display:flex;flex-direction:column;align-items:center;gap:8px;font:600 var(--fs-13) var(--font-sans);color:var(--label)}
.quickTile::before{content:"";position:absolute;inset:0;background:var(--onda-fill);opacity:.45;pointer-events:none}
.quickTile > *{position:relative}
.quickTile:active{opacity:.75}
.quickCircle{width:44px;height:44px;background:var(--onda-strong) !important;color:var(--white) !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.35)}`)
  return t + `
/* ── Themed sheet banners and journal prompt card ────────── */
.sBanner{position:relative;overflow:hidden;display:flex;align-items:center;gap:14px;border-radius:26px;padding:18px 20px;min-height:84px}
.sBannerIcon{width:48px;height:48px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center}
.sBannerText{display:flex;flex-direction:column;min-width:0;gap:2px}
.sBannerKicker{font:600 var(--fs-11) var(--font-sans);letter-spacing:.08em;text-transform:uppercase;opacity:.75}
.sBannerTitle{font:600 var(--fs-28)/1.1 var(--onda-font);letter-spacing:-0.01em}
.sBannerSub{font:400 var(--fs-14)/1.3 var(--font-sans);text-wrap:pretty;opacity:.85}
.jeCard{position:relative;overflow:hidden;border-radius:26px;padding:20px}
`
})
console.log('patched')
