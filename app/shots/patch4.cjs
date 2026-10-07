const fs = require('fs')
const edit = (f, fn) => { const t = fs.readFileSync(f, 'utf8'); const r = fn(t); if (r === t) console.log('NO CHANGE', f); fs.writeFileSync(f, r) }
const must = (t, a, b) => { if (!t.includes(a)) throw new Error('missing: ' + a.slice(0, 80)); return t.replace(a, b) }

edit('src/screens/LagoInsights.tsx', (t) => {
  t = must(t, "import { ProgressBar } from '@/ui/data'", "import { ProgressBar, ProgressRing } from '@/ui/data'")
  // hero
  const a = t.indexOf("      <div className={`${s.center} ${s.hero}`}>")
  const b = t.indexOf("      <div className={`${s.card} ${s.calCard}`}>")
  const mid = fs.readFileSync('shots/lago-mid.txt', 'utf8')
  t = t.slice(0, a) + mid + t.slice(b)
  t = must(t, "<div className={`${s.card} ${s.calCard}`}>", "<div className={`${s.card} ${s.calCard} ${s.glassCard}`}>")
  t = must(t, "  const cta = st.phase", "  const ringPct = Math.round(st.pct * 100)\n  const cta = st.phase")
  t = must(t, "    <Screen\n      variant=\"hero\"", "    <Screen\n      variant=\"hero\"\n      style={{ position: 'relative' }}")
  t = t.replace("className={[s.calCell, c.today && c.state === 'done' ? s.calOn : c.state === 'done' ? s.calHas : ''", "className={[s.calCell, c.state === 'done' ? s.calOn : ''")
  return t
})

edit('src/screens/screens.module.css', (t) => t + fs.readFileSync('shots/lago.css', 'utf8'))
edit('src/i18n/en.ts', (t) => must(t, "    title: 'Lago', progress: 'Progress',", "    title: 'Lago', dayStreak_one: '{{count}} day streak', dayStreak_other: '{{count}} day streak', noStreak: 'Start your streak', progress: 'Progress',"))
console.log('patched')
