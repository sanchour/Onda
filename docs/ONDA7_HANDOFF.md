# Onda 7.0 handoff

Everything finished is on `main`. Unfinished theme work is parked on the branch `wip/onda7-themes`. This file is enough to continue on another account or machine.

## Prompt to paste into a new Claude Code session (in this repo)

```
Continue the Onda 7.0 redesign. Read docs/ONDA7_HANDOFF.md and docs/ONDA7_PLAN.md first and follow them.
Design only: do not rewrite any content in content/. Be fast and token efficient: work directly, read only the files you need,
no long multi-agent workflows. Finish the open items in the handoff in order: 1) the bespoke themes and emblems for all 64 Ondas
(start from the branch wip/onda7-themes, find why it renders a blank app first), 2) the failing e2e test, 3) a light and dark
screenshot check of every Onda screen. Then run typecheck, unit tests and build, update docs/ONDA7_PLAN.md,
commit and push to main, and confirm that git rev-parse HEAD equals origin/main.
```

## What Onda 7.0 is

A design overhaul of the Onda side of the app: premium iOS 27, clean, each Onda its own traditional world. Content is unchanged.

Done and on `main` (latest commits `36709f8`, `c007b84`, `2f2961a`, `18e2e77` and the handoff commit):
- Ondas tab: themed cover (palette, emblem, display face, traditional numerals), one connected shortcut bar (Immerse, Journal, Philosophy, Guide; icons only, on the page background), Today as grouped lists by time of day with thin line icons and check circles. No quote at the bottom.
- All Ondas: cover tiles by group, a search field.
- Running Onda page (tap the cover): only what is nowhere else (theme of the day, quote, word of the day, journal, final reflection). The preview of an Onda not begun still shows practices, rules, immerse and ideas.
- Guide: opens on a contents page (essence, at a glance, chapter tiles with counts and previews); tabs appear inside a chapter; history as a timeline; grouped lists.
- Philosophy: a swipeable deck of idea cards with "Try this today", plus a numbered list to jump.
- Immersion: Up Next cards, a library grid with progress rings, and a format per kind (Read bookshelf, Words flashcards, Listen record sleeves, Watch cinematic frames, Art gallery frames, Eat and Drink menu, Travel postcards, Games and Customs).
- Practice sheet, final reflection and Onda complete restyled. Lagos Quick tip removed. Version 7.0 with a What's New entry.

## Where things are

- Primitives: `app/src/screens/onda7/` (Cover, GroupedList, Row, CheckCircle, SectionHeader, PracticeRow, PlanList, ShortcutBar, SearchField, QuoteBlock), CSS in `onda7.module.css`.
- Theme type and helpers: `app/src/content/themeKit.ts`. Theme data: `app/src/content/themes/a.ts` (first 32 ids) and `themes/b.ts` (last 32). Runtime (CSS variables `--onda-*`, including `--onda-cover`, `--onda-material`, `--onda-accent`): `app/src/content/themes.ts`.
- Cover emblems: `app/src/screens/emblems/a.tsx` and `b.tsx`, contract in `emblems/kit.tsx` (120 unit viewBox, currentColor, stroke `line * 120 / size`). On `main` they are stand-ins built from the small ornaments (`fromOrnament`).
- Screens: `OndasTab.tsx`, `OndaToday.tsx`, `Guide.tsx`, `OndaPages.tsx` (Journal, Philosophy, Rules), `OndaFlow.tsx` (Immersion, Reflection, Done), `sheets/OndaSheets.tsx`. Styles: `screens/ondas.module.css` (blocks marked `Onda 7`), `sheets/guide.module.css`.
- Plan and checklist: `docs/ONDA7_PLAN.md`.

## Open items, in order

### 1. Bespoke themes and emblems for all 64 Ondas
Branch `wip/onda7-themes` holds unfinished agent work: 32 new emblems in `emblems/a.tsx` (stoic to sunni) and partial palette edits in `themes/a.ts` and `themes/b.ts`. It typechecks and builds, but **the app renders blank with no console error** (the `main` versions render fine). First find the cause (check each theme entry and emblem, for example by bisecting: restore `themes/b.ts` from main, then `themes/a.ts`, then `emblems/a.tsx`; `node app/shots/v7-errors.mjs` prints page errors and whether the Ondas tab and browse render). Keep what is good, then finish:
- `emblems/b.tsx`: draw a real emblem for each of: shia rasta discordia plato epicurus cyrenaic kant nietzsche freud existential gandhi rome qing mongol ottoman mughal johor inca habsburg hre sixties renaissance maasai aboriginal frisian polynesia melanesia micronesia zulu bantu khmer celtic.
- Palettes for all 64: colours from each culture's real pigments, materials and textiles (lapis, indigo, cinnabar, saffron, malachite, terracotta, gold leaf, sumi ink, kente gold and green ...), so covers read as different worlds side by side, not a row of muted slates. Contrast: cover ink at least 5.2:1 on both cover stops in light and 8:1 in dark; accent 4.5:1 as text on a near-white card (light) and on #1C1C1E (dark). Patterns subtle (alpha .16 at most). Mix cover layouts (left, center, frame). One line comment per entry naming pigments and motif. Use only fonts already imported in `app/src/styles/fonts.ts`.
- Each emblem: a real motif from that tradition's own art (for example ensō, Urnes interlace, girih star, Sun Stone, adire, triskele, chakana, tulip in an ogee, chhatri), 6 to 20 SVG elements, recognisable at 48px; no two Ondas share a motif.
- Check: Browse Ondas grid and a few Onda pages in light and dark (`node app/shots/v7-before.mjs <outDir> light|dark`), fix anything crude, crowded or illegible.

### 2. Failing e2e test
`app/tests/e2e/flows.spec.ts`, test "Ondas tab: cover, one bar of four shortcuts, and Today by time of day", fails at `getByRole('button', { name: /^Open: / })`. The immerse row's open control is in `app/src/screens/onda7/PracticeRow.tsx` (`aria-label={`${open.label}: ${p.name}`}`); match the test to the real label. The other Onda tests ("Rules can be kept ...", "Today page, Full guide ...") pass. Run: `npx playwright test tests/e2e/flows.spec.ts -g "Ondas" --reporter=line --project=iphone-webkit` (in `app/`). The full suite takes over 10 minutes; run it in the background at the end.

### 3. Light and dark check
`node app/shots/v7-pages.mjs <outDir> light|dark` (add `kinds` as a third argument for the Immersion formats only) and `node app/shots/v7-before.mjs <outDir> light|dark`. Read the PNGs, fix overlaps, clipped text and contrast.

## How to work here (Windows)

- App in `app/`: `npx tsc -b`, `npx vitest run`, `npm run build`, `npx oxlint src`. Screenshots use Playwright WebKit scripts in `app/shots/` (the Browser pane times out on this machine). A blank shot right after navigation can be a lazy chunk still loading.
- Git Bash mangles backticks, quotes and `\n` in heredocs and `node -e`: write patch scripts with the Write tool as `.cjs` files and run them with node.
- Copy voice: no exclamation marks or emoji (a unit test enforces it). New strings go in `app/src/i18n/en.ts`.
- Push rule: commit and push to `main` at the end of every update and confirm `git rev-parse HEAD` equals `origin/main` (retry on GitHub's transient errors). Never read or extract GitHub credentials.
- The owner wants: fast, token efficient, design only, premium iOS 27 and clean, every Onda traditional and unique.
