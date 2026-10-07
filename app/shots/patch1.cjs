const fs = require('fs')
const edit = (f, fn) => { const t = fs.readFileSync(f, 'utf8'); const r = fn(t); if (r === t) console.log('NO CHANGE', f); fs.writeFileSync(f, r) }
const must = (t, a, b) => { if (!t.includes(a)) throw new Error('missing: ' + a.slice(0, 70)); return t.replace(a, b) }

edit('src/data/types.ts', (t) => must(t, "  onboarded: z.boolean().default(false),", "  onboarded: z.boolean().default(false),\n  /** Profile picture: a small square photo (data URL), or an icon on a colour. Empty icon means initials. */\n  avatarPhoto: z.string().default(''),\n  avatarIcon: z.string().default(''),\n  avatarTone: z.enum(['blue', 'green', 'yellow', 'coral', 'purple']).default('blue'),"))

edit('src/ui/data.tsx', (t) => {
  t = must(t, "import s from './ui.module.css'", "import { Icon } from './Icon'\nimport s from './ui.module.css'")
  const i = t.indexOf('export function Avatar')
  return t.slice(0, i) + fs.readFileSync('shots/avatar.txt', 'utf8')
})

edit('src/screens/Settings.tsx', (t) => must(t, "<Avatar initials={(name[0] ?? 'O').toUpperCase()} size={64} />", "<Avatar initials={(name[0] ?? 'O').toUpperCase()} size={64} photo={settings.avatarPhoto} icon={settings.avatarIcon} tone={settings.avatarTone} />"))

edit('src/sheets/SettingsSheets.tsx', (t) => {
  t = must(t, "import { Button, LinkButton } from '@/ui/buttons'", "import { Button, LinkButton } from '@/ui/buttons'\nimport { AVATAR_ICONS, AVATAR_TONES, Avatar, type AvatarTone } from '@/ui/data'")
  t = must(t, "import { useState } from 'react'", "import { useRef, useState } from 'react'")
  t = must(t, "  const signedIn = account && !account.anonymous\n", fs.readFileSync('shots/acct-hooks.txt', 'utf8'))
  t = must(t, "        <div className={m.emailField} style={{ marginTop: 0 }}>\n          <input aria-label={t('account.name')}", fs.readFileSync('shots/acct-ui.txt', 'utf8'))
  return t + fs.readFileSync('shots/acct-fn.txt', 'utf8')
})

edit('src/screens/more.module.css', (t) => t + fs.readFileSync('shots/acct.css', 'utf8'))
edit('src/i18n/en.ts', (t) => must(t, "    signOut: 'Sign Out', localOnly:", "    photo: 'Choose Photo', useInitials: 'Use Initials', icon: 'Icon', color: 'Color',\n    signOut: 'Sign Out', localOnly:"))
console.log('patched')
