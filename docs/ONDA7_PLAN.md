# Onda 7.0 plan

Design only. Content (guides, practices, philosophy text) stays as it is.

## Done and pushed
- [x] New Ondas tab: themed cover, Today as grouped lists by time of day, thin line icons, check circles
- [x] All Ondas: cover tiles by group, search field
- [x] Guide, Philosophy, Rules, Journal restyled as grouped lists (first pass)
- [x] Immersion: Up Next cards and a library grid with progress rings
- [x] Lagos: Quick tip removed

## In progress (this round)
- [x] Quote removed from the bottom of the Ondas tab
- [x] Shortcuts (Immerse, Journal, Philosophy, Guide): one connected bar in the Onda's colours, larger icons, no text
- [x] Practice sheet: quiet header, instructions as numbered steps, why as a quote-like paragraph, variations list
- [x] Final reflection and Onda complete: the Onda's cover, cleaner stats, carry-forward as one list
- [x] Immersion lists, a format per kind: Read as a bookshelf, Listen as record sleeves, Watch as cinematic frames, Art as a gallery wall, Eat and Drink as a menu, Words as a swipeable vocabulary deck, Travel as postcards, Games and Customs with their own marks; every item has its own tint so one book differs from the next
- [x] Running Onda page (tap the main card): Practices, Rules, Immerse and Think about removed, since they already live on the Ondas tab; it keeps the theme of the day, quote, word of the day, journal and final reflection. The preview of an Onda you have not begun keeps everything.
- [ ] Bespoke theme for each of the 64 Ondas: traditional pigments, pattern, display face, numerals and a new emblem drawn from its own art. Unfinished work is on the branch wip/onda7-themes (renders blank, see docs/ONDA7_HANDOFF.md)
- [x] Version 7.0 with a What’s New entry

## Next
- [x] Full guide, complete redesign: a cover, then a short "at a glance" card (origin, era, essence), a contents grid of the sections, and each section with its own form: History as a vertical timeline, Figures as portrait cards, Ideas as numbered essays, Language as a word deck, Facts as swipeable cards. Easy to scan, one tap to any section.
- [x] Philosophy, complete redesign: one idea at a time as a large card (title in the display face, the idea, "try this today" as a clear action you can tick), swipe between them, with Think about and Ethics as a segmented switch and a short list view to jump
- [ ] Merge the theme work, check every Onda's cover in light and dark
- [ ] Unit tests, build, screenshots, then commit and push to GitHub as Onda 7.0

## Second pass (iOS inspired)
- [x] All Ondas as a bookshop: search, filter chips (All, Religions, Philosophies, States, Cultures, Yours), a Featured row of large covers (the running Onda first, then four that change each day), one sideways shelf per group with See All, a chip or See All shows that group as a grid
- [x] Philosophy: iOS large title that hands over to the inline title on scroll, today's idea as a large themed card with "Try this today", then an iOS segmented control (Think about / Ethics) over an inset grouped index: numeral, title, one line peek, opens in place with its practice
- [x] Full guide as one long read: cover, essence, a floating glass chapter bar that jumps to each chapter and follows the reading position, chapters with an iOS header (Chapter II kicker in the Onda's numerals, bold title, one line lead), inset grouped lists with Show All as the last row (first 4 rows, history 6), People as contact-style cards, history as a timeline, facts as swipeable cards
- [x] Full guide, Wikipedia app touches: the essence as a serif lede over a hairline, an infobox (origin, era, key figures) with the Onda's name as its header, chapter headings in a serif over a hairline that fold on tap, sources as numbered references with links
- [x] `LargeTitle` and `ChromeTitle after={px}` in `app/src/nav/Screen.tsx` for iOS large titles on any page

## 7.1
- [x] Bespoke palettes for all 64 Ondas from each culture's pigments, materials and textiles, contrast checked by `app/shots/theme-contrast.mjs` (0 failures), cover layouts mixed so no three neighbours match
- [x] A real cover emblem for every Onda from its own art, no two alike (`emblems/a.tsx`, `b1.tsx`, `b2.tsx`)
- [x] Every cover checked in light and dark (`app/shots/v7-covers.mjs`)
- [x] Emblem touch-ups: an arch on the Reichskrone, the Zulu beadwork as a clear triangle, larger Johor keris and Kant
- [x] e2e green (33 tests): the immerse row opens from its hold menu, Philosophy via its shortcut, the Featured row in browse, the Lago link, the Gallery and the final reflection use what today's plan offers, the hold menu test uses a morning practice, version 7.1
- [x] Version 7.1 with a What's New entry

## 7.1, second round
- [x] Each Onda's home in its own look: the cover's colour and pattern washed behind the header, "Ondas" in the Onda's display face, today's progress as a row of its ornament, time of day headers in its accent, checks in its mark shape
- [x] Philosophy and Immersion carry the Onda's pattern (today's idea, Up Next, library tiles) and mark shape
- [x] Swipe back from anywhere on a page, smooth and in step with the page beneath (`app/shots/v7-swipe.mjs`)

## Not in scope
- Rewriting content
- The full end-to-end suite (more than 10 minutes); targeted checks only
