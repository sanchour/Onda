const fs = require('fs')
const edit = (f, fn) => { const t = fs.readFileSync(f, 'utf8'); const r = fn(t); if (r === t) console.log('NO CHANGE', f); fs.writeFileSync(f, r) }
const must = (t, a, b) => { if (!t.includes(a)) throw new Error('missing: ' + a.slice(0, 70)); return t.split(a).join(b) }

edit('vite.config.ts', (t) => {
  t = must(t, "export default defineConfig({\n  plugins: [", "// GitHub Pages serves the app from /<repo>/, so the base path comes from the build (BASE_PATH=/Onda/).\nconst base = process.env.BASE_PATH ?? '/'\n\nexport default defineConfig({\n  base,\n  plugins: [")
  t = must(t, "id: '/',", "id: './',")
  t = must(t, "start_url: '/?source=pwa',", "start_url: './?source=pwa',")
  t = must(t, "scope: '/',", "scope: './',")
  t = must(t, "src: '/icons/", "src: 'icons/")
  t = must(t, "url: '/?tab=", "url: './?tab=")
  return t
})

edit('src/sw.ts', (t) => {
  t = must(t, "createHandlerBoundToURL('/index.html')", "createHandlerBoundToURL(`${import.meta.env.BASE_URL}index.html`)")
  t = must(t, "denylist: [/^\\/functions\\//, /\\.ics$/]", "denylist: [/\\/functions\\//, /\\.ics$/]")
  t = must(t, "    icon: '/icons/icon-192.png',\n    badge: '/icons/badge-96.png',\n    data: { url: p.url ?? '/',", "    icon: new URL('icons/icon-192.png', self.registration.scope).href,\n    badge: new URL('icons/badge-96.png', self.registration.scope).href,\n    data: { url: p.url ?? '',")
  t = must(t, "  const target = `${data.url ?? '/'}${params.size ? `?${params}` : ''}`", "  // Server URLs are relative to the app (\"?tab=ondas\"), so the app works from any base path.\n  const [path = '', query = ''] = (data.url ?? '').replace(/^\\//, '').split('?')\n  const merged = new URLSearchParams(query)\n  params.forEach((v, k) => merged.set(k, v))\n  const target = new URL(`${path}${merged.size ? `?${merged}` : ''}`, self.registration.scope).href")
  return t
})

edit('src/sync/push.ts', (t) => must(t, "icon: '/icons/icon-192.png'", "icon: `${import.meta.env.BASE_URL}icons/icon-192.png`"))

for (const f of ['src/sync/entitlement.ts', 'src/sync/integrations.ts']) edit(f, (t) => must(t, "returnUrl: window.location.origin", "returnUrl: window.location.origin + import.meta.env.BASE_URL"))
edit('src/sync/supabase.ts', (t) => {
  t = must(t, "const redirectTo = window.location.origin", "const redirectTo = window.location.origin + import.meta.env.BASE_URL")
  return must(t, "const emailRedirectTo = window.location.origin", "const emailRedirectTo = window.location.origin + import.meta.env.BASE_URL")
})

// Edge functions: keep the path of the return URL, validate the origin
edit('../supabase/functions/stripe-checkout/index.ts', (t) => must(t, "const base = returnUrl && allowed.includes(new URL(returnUrl).origin) ? new URL(returnUrl).origin : allowed[0]!", "// Keep the app's base path (GitHub Pages serves it from /<repo>/); only the origin has to be allow-listed.\n  const u = returnUrl ? new URL(returnUrl) : null\n  const base = u && allowed.includes(u.origin) ? u.origin + u.pathname.replace(/\\/$/, '') : allowed[0]!"))
edit('../supabase/functions/notion-oauth/index.ts', (t) => {
  t = must(t, "const origin = body.returnUrl ? new URL(body.returnUrl).origin : ''\n      if (!appOrigins().includes(origin)) throw new HttpError(400, 'returnUrl is not an allowed origin')\n      const state = await signState({ uid: user.id, returnUrl: origin })", "const u = body.returnUrl ? new URL(body.returnUrl) : null\n      if (!u || !appOrigins().includes(u.origin)) throw new HttpError(400, 'returnUrl is not an allowed origin')\n      const state = await signState({ uid: user.id, returnUrl: u.origin + u.pathname.replace(/\\/$/, '') })")
  return t
})
edit('../supabase/functions/push-send/index.ts', (t) => {
  t = must(t, "url: '/?tab=ondas'", "url: '?tab=ondas'")
  t = must(t, "url: '/?tab=lagos'", "url: '?tab=lagos'")
  t = must(t, "url: '/'", "url: ''")
  return t
})
console.log('patched')
