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

## Update 2.0

- **Wash.** The running Onda tints the page background (about 30% of its pastel over cream in light mode, 34% over charcoal in dark mode) and the accent follows it in all three tabs and in Settings. Settings, Appearance, "Onda background tint" turns it off and returns the plain light or dark background. No Onda running means no tint.
- **Status bar (not verified on a device).** iOS only reads `apple-mobile-web-app-status-bar-style` at launch and `black-translucent` always draws white text, so a runtime switch is not possible. The page now always uses `black-translucent`: the page background shows through and follows dark or light on its own. In light mode a band of the accent colour (white text passes 4.5:1 on it) sits behind the status bar and fades out below it; in dark mode it is transparent.
- **Browse Ondas** is grouped into four: religions and spiritual traditions, philosophy and schools of thought, empires and states, cultures and eras. `src/content/browse.ts` holds the grouping and the greyed placeholders (not buttons, no content). The Nazi Germany placeholder is only a name; if it is ever built it needs the same sensitivity review as the other flagged Ondas, framed as history, with no glorification.
- **Navigation.** The Onda card on the Ondas tab opens the full guide. The old Today page is still reachable through Browse Ondas (the running Onda is marked Active), which is where Final reflection and End Onda live. Journal, Philosophy and Rules are pushed pages; Rules is read-only and no longer a tab under Today. The Calendar export lives only in Settings, Integrations.
- **Lagos and Stats** borrow the running Onda's type, ornament divider, bar shapes and calendar marks. Hero cards got a fine inner line and a soft highlight.

## Update 2.1

- **Performance (measured).** Lighthouse, Chromium, mobile emulation with simulated slow 4G and 4x CPU slowdown, production build. Before (one run): score 63, first contentful paint 3.8 s, largest contentful paint 4.9 s, total blocking time 420 ms, script boot-up 1.8 s, page weight 617 KiB. After (four runs): score 75 to 88, first contentful paint 2.4 s every run, largest contentful paint 3.4 to 3.8 s, total blocking time 80 to 400 ms, boot-up 0.4 to 0.9 s, page weight 387 KiB every run. Blocking time varies a lot between runs, so treat it as improved but not settled. These are worst-case-phone numbers, not iPhone numbers. A WebKit probe on the same build: first paint 6.9 s to 0.2 s on a cold load, JavaScript transferred 533 KB to 297 KB.
- **What changed.** zod no longer loads at start-up: schemas live in `data/schemas.ts` and load only for import, sync and custom Ondas; shipped content is trusted at runtime because `content:check` and a unit test prove each file equals its own parse (`npm run content:normalize` fixes a file). A tiny HTML shell paints at once. The first screen's chunk is fetched in parallel with the database. The Ondas are no longer all parsed at launch (the service worker already caches them) and the other screens warm one per idle slice. The edge shadow on a sliding page is a gradient strip instead of a 24px blur. The root uses 100svh.
- **Not done.** Initial JavaScript is about 190 KB gzipped, over the 170 KB target. The rest is React, i18next, TanStack Query, Dexie and the icon registry (about 50 KB gzipped); shrinking it means replacing i18next or splitting icon weights, which is a larger and riskier change. GitHub Pages cannot set Cache-Control headers, so sw.js and index.html rely on the service worker update flow. The frame-rate numbers from headless WebKit are not trustworthy and were not used.
- **Storage.** The app asks for persistent storage once onboarded and shows a message if a write fails because the device is full.
- **Content.** Every Onda has rewritten rules and five rewritten tasks in its own voice. Sources and cultural-care rules are unchanged in meaning.

## Onda 3.0

- **Six new Ondas.** Norse, Diogenes, Confucianism, Abbasid Caliphate, The 1920s and Traditional Cuban, to the same depth bar as the others. Each has its own colours, display face (Metamorphous, Vollkorn, Noto Serif SC, Reem Kufi, Limelight, Lobster Two), pattern, ornament, mark shape and row style; a unit test fails if two themes share a colour, face or ornament. Quotations are from public-domain translations or original texts and carry their source. Norse, Confucianism, Abbasid and Cuban are flagged for review by tradition bearers, like the earlier living traditions. None of the new content has been reviewed by experts yet.
- **Games and Travel.** `immerse` gained `games`, `festivals` and `places` (for the last two, `creator` holds when or where). Immerse shows festivals and places together as Travel; the full guide has a Travel tab with the two groups, and Culture lists the games. All 22 Ondas have them. Where no video or board game is really about a tradition, traditional games stand in and the note says how a modern game relates. Places in Russia and Iraq carry a line about checking travel advice.
- **Full guide tabs.** Ways is split: Ethics has its own tab, and Practices holds practices, rules and customs. Order: Overview, History, Ideas, Ethics, Practices, Culture, Travel, Language, Facts.
- **Immerse as a library.** Inside a kind, items are covers two to a row: a spine in the Onda colour, a catalogue number in the Onda numerals, the drawing, title and maker, and a dashed stamp ring that fills when ticked. The description stays in the sheet behind a tap, so the grid is quick to scan.
- **Philosophy.** The swipe deck is replaced by a list of folding cards (the same component as the guide): number, title and two lines when closed; the full text and a "try this" tick when open. Everything can be seen without swiping.
- **Rules.** Reverses 2.0: rules are tickable again, on the Rules page only, with a count and a bar. They write to the same `ruleLogs` as before.
- **Status bar (not verified on a device).** Recent iOS versions colour the strip behind the clock and battery from the page as it is at launch, and some draw it outside the web page altogether (WebKit bug 301994). The launch page was always cream until the app loaded, so with a tinted or dark background the strip stayed cream. The app now saves its background for light and for dark in `localStorage` and `index.html` applies it, and the theme colour, before the first paint. The first launch after an Onda or appearance change can still show the old colour once. The manifest colours stay cream because a manifest cannot follow dark mode; if iOS turns out to read those, this will not be enough. iOS reads the status bar style only when the app is added to the Home Screen, so an install from before 2.0 needs to be removed and added again.
- **Appearance.** The default is Automatic. People still on the old default (Light) are moved to Automatic once; choosing Light again afterwards sticks.
- **Tab bar.** The wiggle on the Lagos tab is gone. Its icon is a hand-drawn single wave with a gentler curve (`wave-soft` in `gen-icon-data.mjs`), since Phosphor has no softer one.
- **Gallery.** See more under From the Ondas uses the same four groups and toggles as Browse Ondas, without the placeholders.

## Cultural care

Native American Animism, Ubuntu, Tibetan Buddhism and Sufism are flagged `reviewRequired` and carry a framing note shown before the Onda begins. No closed ceremony is offered, which a test enforces. All four need review by tradition bearers before launch, as does the use of the word "animism". See `CONTENT_REVIEW.md`: all content was written without live fact-checking, and that file says so.

## Known gaps

- Push action buttons exist for Android and desktop; iOS ignores them and just opens the app.
- Only English strings exist; keys are in place for i18next.
- The server sends reminders in the time zone stored in settings; changing zone on the phone needs a settings write to update it.
- Lighthouse thresholds are configured in CI but have not been run against a deployed build, so that step reports without failing the build (`continue-on-error`) until someone has tuned it.
- Content was fact-checked in v1.1 (see `CONTENT_REVIEW.md`): unverifiable items were removed, a handful of claims were checked on the web, and the rest still need a human reviewer.

## Update 5.0

- **Status bar, hard fix (not verified on a device).** The strip behind the clock and battery stayed pale in dark mode. With `black-translucent` the page runs under the bar and recent iOS versions lay their own frosted material over that strip, which CSS cannot remove. The status bar style is now `default`: the bar is opaque, sits above the page, and iOS colours it from the `theme-color` meta, which the app already sets before first paint and on every appearance or Onda change, so it follows the app's own light or dark and not the system's. `theme_color` was removed from the manifest so no cream value competes with the meta. iOS reads the bar style only when the app is added to the Home Screen, so the app has to be removed and added again once.
- **Top bar on switching (not verified on a device).** After the change above the bar stayed dark when the app went from dark to light. iOS does not always notice an attribute changing on an existing `theme-color` tag, so the app now replaces the tag, pins the `color-scheme` meta and the root `color-scheme` to the app's own appearance, and applies both again on the next frame and when the app returns to the front.
- **Sixty Ondas.** All 38 placeholders are built (the Nazi Germany placeholder was removed by the owner and is not to be re-added). Each has its own theme in `themes5.ts`, 30 words, 30 journal prompts, 30 day themes, five practices with variations, a full guide and a sensitivity note. Ondas about living peoples carry `review: true` and name the language or people each word belongs to; they borrow everyday values only and no ceremonies. They were written from published sources and have not been reviewed by members of those communities.
- **Hold a practice.** A long press (450 ms), right click or the context menu key on a practice opens an iOS-style menu in the Onda's own lettering with one item, How to do this, which opens a sheet with the instructions, the reason and the variations. A tap still ticks the practice; the click that ends a hold is swallowed.
- **Missed update prompt.** The Reload toast shows once. Tapping the Version row in Settings now asks the service worker for the newest version, activates it and reloads. Fully closing and reopening the app also brings the prompt back.
