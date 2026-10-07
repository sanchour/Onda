# Decisions

## Status: what is verified and what is not

Verified in this repo: typecheck, 176 unit tests, 25 Playwright flows (WebKit at iPhone 15 Pro size; the offline flow on Chromium), a production build with its service worker, and a Deno typecheck of every Edge Function.

**Not verified, because it needs accounts, devices or secrets that were not available:** the Supabase migrations and merge RPC against a real database; Notion OAuth and sync against real Notion; Stripe checkout and webhook; Web Push delivery; Sign in with Apple; the Shortcut (it must be built on an iPhone and signed by Apple, see `docs/SHORTCUT.md`); Lighthouse scores; install, haptics and swipe feel on a real iPhone in standalone mode. The code for each is written to the documented APIs but has never run against the live service. Treat the "done when" list as open until those are exercised.

## Product and tech

- **Local-first.** Dexie is the source of truth; Supabase holds a replica in one `records` table (one JSON document per record). Conflicts resolve last-write-wins **per field** using a `_f` clock map; ties break on `deviceId`. The same merge exists in TypeScript (`data/merge.ts`) and SQL (`merge_record`). Check ins, practice logs and journal entries use deterministic ids (`detId`) so two devices logging the same thing merge instead of duplicating.
- **No UI kit, no Tailwind.** CSS Modules over tokens ported unchanged from the design system, except that secondary label greys and the accent were darkened slightly to hold 4.5:1 contrast. Type sizes are rem-based with a `--type-scale`.
- **Icons:** Phosphor SVGs through a generated registry of regular, bold and fill weights only. The brief named `@phosphor-icons/react`; the React package ships six weights per icon and tripled the icon bundle, so this uses the same icons from `@phosphor-icons/core`.
- **Gestures** are hand-written with pointer events and WAAPI springs (`lib/motion.ts`), from the design system's motion helpers: edge-swipe back, sheets that follow the finger and dismiss downward, a scrubbing tab lens.
- **Content** is JSON per Onda, lazy-loaded, validated by Zod and precached by the service worker. Practice ids are stable because logs point at them.
- **Haptics:** `navigator.vibrate` where it exists; on iOS a programmatic toggle of `<input type="checkbox" switch>` (iOS 17.4+). Unverified on a device.
- **Face ID lock** uses WebAuthn with a platform authenticator: a privacy screen, not encryption.
- **Free tier** (not specified in the brief): three running Lagos, Stoicism only, no custom Ondas, no integrations. Constants are in `data/catalog.ts`.
- **Integrations require Ondas+ and a backend**, and their state comes from the server, never a local flag.
- **Calendar:** private per-user ICS feed with floating local times, a `webcal://` link, and a one-time `.ics` built on the device for offline or account-less use. Rotating the token revokes the old URL.
- **Reminders:** a Shortcut plus a JSON feed (GET today, POST completions back). Labelled "Via Shortcuts".
- **Notion:** one-way, app to Notion. Tokens are AES-GCM encrypted server-side. A trigger queues changed records with a 60 second debounce; a per-minute cron drains the queue under 3 requests per second with retry and backoff; failures stay queued and are reported on the connection. Pull from Notion is not implemented (stretch goal).
- **Gallery** is a plain catalogue of ready-made Lagos. The "Top Lagos" ranking and participant counts were removed in 1.2: they were seed numbers, not real usage, and a ranking implies data that does not exist.

## Ondas+ and the App Store

**Beta placeholder (1.2).** Until real payments are switched on, "Get Lifetime" in the app unlocks Ondas+ on the device and nothing is charged (`BETA_PAYMENTS` in `app/src/sync/entitlement.ts`). The paywall says so. A server that has no purchase on record never takes a beta unlock back. Building with `VITE_PAYMENTS=live` restores the real Stripe Checkout flow, which needs a signed-in account. Because the unlock is a local flag, it is not a security boundary: do not ship a public build without `VITE_PAYMENTS=live`.

Trial and purchase are an **app-level entitlement**: the server sets `trial_started_at` once per account (a reinstall cannot restart it) and Stripe's webhook is the only thing that sets `lifetime`. StoreKit is not available to PWAs. If Onda is ever wrapped natively and distributed through the App Store, Apple requires In-App Purchase to unlock digital features, so the Stripe path would have to be replaced by StoreKit (or removed) in that build, and Restore would need to read StoreKit entitlements. A PWA sold through Stripe from the web sits outside App Store review.

## Update 1.3

- **Sixteen Ondas.** Soviet Union, Yoruba, Aztec, Ancient Egypt, Hermeticism and Gnosticism join the ten. Each has the full content set, its own theme (colour, pattern, display face, mark shape, card corners, numerals, ornament) and a flair for the Ondas tab. Facts were written conservatively: what could not be stood behind is marked `unverified` or left out, and a few kinds (for example eat and drink for Hermeticism and Gnosticism) are empty rather than invented. Soviet Union, Yoruba, Aztec and Gnosticism are `reviewRequired` (see CONTENT_REVIEW.md). Hermeticism separates the ancient Hermetica from the modern Kybalion; Gnosticism notes that scholars dispute the category.
- **The accent follows the running Onda** everywhere except the Lagos tab and what is opened from it. Light mode darkens the Onda colour until white text reaches 4.5:1; dark mode picks near-black or white text.
- **Status bar.** iOS reads `apple-mobile-web-app-status-bar-style` when the app launches, not live. An inline script now sets it (and `theme-color`) from the saved appearance before first paint, so a change of theme takes effect the next time the app is opened. Not verified on a device.
- **Back glitch.** A timer that hides the covered page after a push read a stale stack, so pressing back soon after arriving could hide the page sliding back in. It now reads the live stack and stands down during a pop.
- **Export and import.** Import validates every record with the same Zod schemas, merges per field (newer edits win), never deletes, and never imports plan or trial state from a file. Photos are not included.
- **Full guide** is a pushed page with sticky tabs, section jump chips and collapsible groups.

## Update 1.3.1

- **Double tap.** Sheets and pages are loaded on demand, and the first tap showed nothing until the chunk arrived, so people tapped again. All chunks are now fetched once the app is idle, and opening the same sheet or page twice in a row is ignored. (Cause inferred from the code; not reproduced on a device.)
- **Readability.** Secondary and tertiary text are darker in light mode and lighter in dark mode, the three smallest type sizes grew by about a point, and text that was faded with opacity is stronger. Onda colours used as text now go through `--onda-text`, and filled chips and buttons use `--onda-deep` with `--onda-on` so the label reaches 4.5:1 for every Onda in both appearances (unit-tested).
- **Stats.** The Ondas list is gone. Each run is drawn on the History calendar as a small bar in the Onda's colour under its days, with the runs of the shown month listed beneath.
- The Onda glyph watermark and the header ornament were removed from the Ondas tab and the Onda page.

## Update 1.4

- **Content.** Every Onda has five practices and eight tasks. The new tasks cover reading, listening or watching, a journal entry, writing about one idea from the Philosophy sheet, and one cultural act, each named after the Onda's own items. A task can carry an `action` (journal, philosophy or an Immerse kind) that shows an Open row on the card. The original tasks stay.
- **Linked Lagos.** A Lago created from a practice of the running Onda stores `link: { runId, practiceId }`. Ticking either side writes the other for the same date (the store mirrors it in one place), so there is a single tick per day. Runs started before 1.4 keep their frozen snapshot, so the chips read the live content and the calendar export reads the snapshot.
- **Calendar.** Add to Calendar is reachable from the Ondas and Lagos tabs and from editing a Lago. Reminders itself still needs Shortcuts or a native wrapper.
- **Launch tab** is Ondas. The small beta note on the Ondas+ page is removed.

## Cultural care

Native American Animism, Ubuntu, Tibetan Buddhism and Sufism are flagged `reviewRequired` and carry a framing note shown before the Onda begins. No closed ceremony is offered, which a test enforces. All four need review by tradition bearers before launch, as does the use of the word "animism". See `CONTENT_REVIEW.md`: all content was written without live fact-checking, and that file says so.

## Known gaps

- Push action buttons exist for Android and desktop; iOS ignores them and just opens the app.
- Only English strings exist; keys are in place for i18next.
- The server sends reminders in the time zone stored in settings; changing zone on the phone needs a settings write to update it.
- Lighthouse thresholds are configured in CI but have not been run against a deployed build, so that step reports without failing the build (`continue-on-error`) until someone has tuned it.
- Content was fact-checked in v1.1 (see `CONTENT_REVIEW.md`): unverifiable items were removed, a handful of claims were checked on the web, and the rest still need a human reviewer.
