# Onda 7.1 handoff

Everything is on `main` as version 7.1. The theme work from the branch `wip/onda7-themes` is merged into `main` and finished; that branch is no longer needed. This file is enough to continue on another account or machine.

## Prompt to paste into a new Claude Code session (in this repo)

```
Continue the Onda 7.1 design. Read docs/ONDA7_HANDOFF.md and docs/ONDA7_PLAN.md first and follow them.
Design only: do not rewrite any content in content/. Be fast and token efficient: work directly, read only the files you need,
no long multi-agent workflows. Finish "Unique home page per Onda" under "Open items": make each Onda's home (the Ondas tab),
Philosophy and Immersion feel like that Onda, using only its theme (colours, pattern, display face, numerals, glyph, ornament,
mark shape, emblem). Check several Ondas with node app/shots/v7-homes.mjs <outDir> light|dark and node app/shots/contact.mjs <outDir>,
then run typecheck, unit tests, build and the Ondas e2e tests, update docs/ONDA7_PLAN.md and this handoff,
commit and push to main, and confirm that git rev-parse HEAD equals origin/main.
```

## What Onda 7 is

A design overhaul of the Onda side of the app: premium iOS 27, clean, each Onda its own traditional world. Content is unchanged.

Done and on `main` (commits `36709f8`, `c007b84`, `2f2961a`, `18e2e77`, the handoff commit, and the iOS pass on Guide, Philosophy and All Ondas):
- Ondas tab: themed cover (palette, emblem, display face, traditional numerals), one connected shortcut bar (Immerse, Journal, Philosophy, Guide; icons only, on the page background), Today as grouped lists by time of day with thin line icons and check circles. No quote at the bottom.
- All Ondas: a bookshop. Search, filter chips, a Featured row that changes each day, one sideways shelf per group with See All.
- Running Onda page (tap the cover): only what is nowhere else (theme of the day, quote, word of the day, journal, final reflection). The preview of an Onda not begun still shows practices, rules, immerse and ideas.
- Guide: one long read. Cover and essence, then a floating glass chapter bar (Overview, People, History, Ideas, Ethics, Practices, Culture, Travel, Language, Facts) that jumps and follows the reading position; chapter headings in a serif over a hairline that fold on tap (Wikipedia app), an infobox for origin, era and key figures, sources as numbered references; inset grouped lists with Show All as the last row; the inline title appears once the cover scrolls away.
- Philosophy: iOS large title, today's idea as a large themed card with "Try this today", a segmented control between Think about and Ethics, and an index that opens each idea in place.
- Immersion: Up Next cards, a library grid with progress rings, and a format per kind (Read bookshelf, Words flashcards, Listen record sleeves, Watch cinematic frames, Art gallery frames, Eat and Drink menu, Travel postcards, Games and Customs).
- Practice sheet, final reflection and Onda complete restyled. Lagos Quick tip removed. Version 7.0 with a What's New entry.
- 7.1: a bespoke theme for all 64 Ondas: palettes from each culture's pigments and materials (all pass `node app/shots/theme-contrast.mjs`), mixed cover layouts, and a real emblem from each tradition's own art (`emblems/a.tsx`, `b1.tsx`, `b2.tsx`). The e2e suite is green again: tests for Today's open buttons, browse, the Lago link, the Gallery, the final reflection, the practice hold menu and the version now match the app. What's New entry for 7.1.

## Where things are

- Primitives: `app/src/screens/onda7/` (Cover, GroupedList, Row, CheckCircle, SectionHeader, PracticeRow, PlanList, ShortcutBar, SearchField, QuoteBlock), CSS in `onda7.module.css`.
- Theme type and helpers: `app/src/content/themeKit.ts`. Theme data: `app/src/content/themes/a.ts` (first 32 ids) and `themes/b.ts` (last 32). Runtime (CSS variables `--onda-*`, including `--onda-cover`, `--onda-material`, `--onda-accent`): `app/src/content/themes.ts`.
- Cover emblems: `app/src/screens/emblems/a.tsx` and `b.tsx`, contract in `emblems/kit.tsx` (120 unit viewBox, currentColor, stroke `line * 120 / size`). All 64 are drawn: `a.tsx` (first 32), `b1.tsx` (shia to mughal), `b2.tsx` (johor to celtic); `fromOrnament` stays as the fallback.
- iOS large titles: `LargeTitle` and `ChromeTitle after={px}` in `app/src/nav/Screen.tsx` (the inline title shows once the page scrolls past `after`).
- Screens: `OndasTab.tsx` (Ondas tab and All Ondas), `OndaToday.tsx`, `Guide.tsx`, `OndaPages.tsx` (Journal, Philosophy, Rules), `OndaFlow.tsx` (Immersion, Reflection, Done), `sheets/OndaSheets.tsx`. Styles: `screens/ondas.module.css` (blocks marked `Onda 7`), `sheets/guide.module.css`.
- Plan and checklist: `docs/ONDA7_PLAN.md`.

## Open items

### Unique home page per Onda (in progress)
The owner wants every Onda's home page to feel slightly its own, and the Today progress bar, the Ondas header and elements of Philosophy and Immersion to carry each Onda's look. Done so far (CSS blocks marked "Onda 7.1: each Onda's home" in `app/src/screens/onda7/onda7.module.css` and "Onda 7.1: philosophy and immersion" in `app/src/screens/ondas.module.css`):
- The Ondas tab wrapper gets `.home` (only with the Onda themes setting on): the Onda's cover colour and pattern (`--onda-cover`) washed behind the header and fading down; the large title "Ondas" in the Onda's display face, case and tracking, followed by its glyph (`look.glyph`) in the accent; time of day headers in the accent; check marks in the Onda's mark shape (`--onda-shape`, `--onda-clip`).
- Today's progress is a row of the Onda's ornament (`look.ornament` via `OrnamentIcon`), one per practice, lit when done (`.beads`, `.bead`, `.beadOn` in `OndasTab.tsx`), instead of a plain bar.
- Philosophy: today's idea card uses the full cover (pattern and colour); the Try box uses the mark shape; an open idea's title is set in the display face.
- Immersion: Up Next cards use the full cover; library tiles carry a faint wash of the pattern.
Still to do: review several Ondas in light and dark (`node app/shots/v7-homes.mjs <outDir> light|dark "Zen Buddhism,Norse,Aztec,Hinduism,Celtic"`, then `node app/shots/contact.mjs <outDir>` for one contact sheet), fix anything illegible (display faces such as blackletter on the title, contrast of the wash in dark), and consider more per-Onda touches: the shortcut bar icons in the accent with the mark shape behind, a small ornament divider between Today's groups, the Onda's numerals for the day count. Then the checks and push listed in the prompt.

### Other
Nothing else required is open. All 33 e2e tests pass (each failing one was rerun on its own and passes), the 1478 unit tests pass, the palette contrast check has 0 failures, and every cover was checked in light and dark. Optional next steps:
1. A dark mode sweep of the inner Onda screens (Guide, Philosophy, Immersion formats): `node app/shots/v7-pages.mjs <outDir> dark` (add `kinds` for the Immersion formats).
2. The full e2e suite takes about 15 minutes and times out when other heavy work runs at the same time; run it on its own.

## How to work here (Windows)

- App in `app/`: `npx tsc -b`, `npx vitest run`, `npm run build`, `npx oxlint src`, `node shots/theme-contrast.mjs` (palette contrast, add `--table` for every ratio). Screenshots use Playwright WebKit scripts in `app/shots/` (the Browser pane times out on this machine). A blank shot right after navigation can be a lazy chunk still loading.
- Git Bash mangles backticks, quotes and `\n` in heredocs and `node -e`: write patch scripts with the Write tool as `.cjs` files and run them with node.
- Copy voice: no exclamation marks or emoji (a unit test enforces it). New strings go in `app/src/i18n/en.ts`.
- Push rule: commit and push to `main` at the end of every update and confirm `git rev-parse HEAD` equals `origin/main` (retry on GitHub's transient errors). Never read or extract GitHub credentials.
- The owner wants: fast, token efficient, design only, premium iOS 27 and clean, every Onda traditional and unique.
