# Onda

An installable PWA for experimenting with how you live. **Lagos** are simple habit experiments. **Ondas** are 7 to 30 day immersions in one philosophy or tradition: its practices, rules, books, films, music, food and language, closed with a reflection.

Sixteen Ondas ship in `content/ondas`. Stack: Vite, React 18, TypeScript (strict), Zustand, Dexie, TanStack Query, Zod, vite-plugin-pwa (Workbox `injectManifest`), Supabase (Postgres, Auth, RLS, Edge Functions on Deno, Storage).

```
app/                  the PWA
  src/ui/             base components (GlassButton, Sheet, TabBar, ...)
  src/nav/            stack navigator, edge-swipe back, sheet and menu state
  src/data/           Dexie, store, per-field LWW merge, pure derivations (streaks, stats, achievements)
  src/sync/           sync engine, push, integrations client, entitlement
  src/content/        content schema, themes, lazy loaders
  tests/unit, tests/e2e
content/              one JSON file per Onda (lazy-loaded), plus index.json
supabase/             migrations, config.toml, Edge Functions (+ _shared)
design-reference/     the prototype and design system this was built from
docs/SHORTCUT.md      Apple Reminders via Shortcuts
```

## Run it

```bash
cd app
npm install
npm run dev            # http://localhost:5173
```

It runs with no backend at all (local mode): everything works on the device, and sync, integrations, push and checkout report that they are not configured. Open `/?seed=demo` for the demo data (Stoicism day 4 of 14, five Lagos).

| Script | |
|---|---|
| `npm run typecheck` / `lint` | tsc project references; oxlint |
| `npm test` | Vitest: Lago maths, stats, achievements, merge, ICS and Reminders feeds, entitlement, store, content depth, i18n keys |
| `npm run test:e2e` | Playwright, iPhone 15 Pro viewport, WebKit; the offline test runs on Chromium (see `playwright.config.ts`) |
| `npm run lhci` | Lighthouse CI against the production build |
| `npm run content:check -- --write` | validate `/content`, regenerate `CONTENT_REVIEW.md` |
| `npm run icons` / `icons:data` | regenerate app icons and iOS launch images / the Phosphor icon registry |

## Backend setup

1. Create a Supabase project. `supabase link --project-ref <ref>`, then `supabase db push`.
2. Auth: enable **Anonymous sign-ins**, **Email** (magic link) and **Apple** (Services ID and key from your Apple developer account). Add your site URL and redirect URLs.
3. Copy `supabase/functions/.env.example` to `.env`, fill it in, then `supabase secrets set --env-file supabase/functions/.env` and `supabase functions deploy`.
4. In the SQL editor, store the two Vault secrets named at the top of `supabase/migrations/20261006000100_schedules.sql` so pg_cron can call the functions.
5. Notion: create a **public integration** (redirect URI `https://<ref>.supabase.co/functions/v1/notion-oauth`). Stripe: create a one-time EUR 14.99 Price and a webhook to `.../stripe-webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `charge.refunded`. Push: `npx web-push generate-vapid-keys`.
6. Create `app/.env.local` from `app/.env.example`.

## Deploy the app

Static output in `app/dist`. On Vercel or Cloudflare Pages: root `app`, build `npm run build`, output `dist`, and a rewrite of all paths to `/index.html`. Serve `/sw.js` and `/index.html` with `Cache-Control: no-cache`. HTTPS is required for the service worker, push and the Face ID lock.

## GitHub Pages

`.github/workflows/pages.yml` builds with `BASE_PATH=/<repo>/` and deploys on every push to `main` (repository Settings > Pages > Source: GitHub Actions). The site is then at `https://<user>.github.io/<repo>/`. Optional backend settings go in repository **variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`. If you use the backend, add the Pages origin (`https://<user>.github.io`) to `APP_ORIGINS` and to the Supabase auth redirect URLs.

### Ondas+ in the beta

"Get Lifetime" unlocks Ondas+ on the device and charges nothing, so the whole app can be tried. Build with `VITE_PAYMENTS=live` (and the Stripe setup above) to switch to real checkout.

## Installing on an iPhone

Open the site in Safari, Share, Add to Home Screen. Push notifications only work for the installed app (iOS 16.4+).

See `DECISIONS.md` for what was decided and why, and `CONTENT_REVIEW.md` for what must be reviewed by humans before launch.
