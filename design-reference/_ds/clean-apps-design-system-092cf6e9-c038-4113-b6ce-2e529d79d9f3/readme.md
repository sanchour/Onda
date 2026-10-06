# Sander Software — Design System

The design system for **Sander Software**, a studio that ships **simple, clean, easy-to-understand iOS 27 and Android apps that help people** (tasks, journaling, notes, fitness, nutrition…). Every app shares one quiet visual language — monochrome, airy, generous — and differs by a single accent tint and one of two chromes:

- **Glass chrome** (iOS-leaning): floating liquid-glass bar buttons, floating tab bar, grouped 26px cards on a grey background. Tasks / Journal / Notes.
- **Flat chrome** (`data-chrome="flat"`, content-dense / Android-leaning): DM Sans, edge-to-edge bottom bar with raised center action, 20px cards, pastel data-viz. Nutrition / Fitness style apps.

Both support **light and dark** (`data-theme="dark"` on any screen root).

> **No logo supplied.** The studio name is set in plain bold type wherever a mark would go. Add a real mark to `assets/` when available.

## Native-first delivery

Every app built with this system ships as a **native iOS (SwiftUI / Xcode)** and **Android (Jetpack Compose)** app. HTML is the prototype medium; `native/` holds the tokens, Swift/Kotlin theme + component files, the web→native component map, icon map and store checklists. Follow `native/BUILDING_APPS.md` while designing so screens port 1:1.

## Start here — building a new app
1. Pick a **template** in `templates/` (Onboarding Flow, Dashboard Home, Settings & Profile, Mood Insights, Guided Exercise) — each has a light/dark tweak.
2. Choose chrome (`data-chrome="flat"` or default glass), theme (`data-theme`) and accent (`data-tint`: black, indigo, yellow — or define a new `--accent`).
3. Compose from components. Data colors come from `--viz-*`; never invent new hues for UI.
4. Keep it simple: one primary action per screen, 1–3 word labels, grey for everything secondary.

## Sources

All foundations were derived from **29 iPhone screenshots** (1170×2532 @3x → 390×844pt) uploaded to `uploads/IMG_9373.png … IMG_9401.png`. No Figma file, codebase, font files or icon assets were provided.

The screenshots show three reference apps in iOS 26/27 light mode:
- **Tasks** (a third-party Notion-synced to-do app) — Today, Upcoming, Search, Lists, View/Date sheets, quick-add composer, Settings, General, Tab Bar, Task Default, Widgets/Wallpapers, About, What's New, paywall. (`IMG_9373–9391`)
- **Journal** (Apple Journal-style, Spanish locale) — insights home, entries timeline, compose. (`IMG_9392–9396`)
- **Notes** (Apple Notes-style) — folders, note list, editor. (`IMG_9397–9401`)

Colors were **pixel-sampled** from the screenshots. Sizes were measured at 3x. Note: the screenshots were captured at a **larger Dynamic Type setting (~1.35×)**; tokens use the default (Large) iOS sizes — set `--type-scale: 1.35` to match the screenshots' text size.

Third-party brand names visible in the references (the tasks app's own name, Notion) were **not** carried into the system; the kits use generic copy ("Tasks Pro", "My Workspace").

---

## Index

| Path | What |
|---|---|
| `styles.css` | Entry point — `@import`s only |
| `tokens/fonts.css` | Inter (web fallback) + Phosphor icon fonts via CDN |
| `tokens/colors.css` | Neutrals, system hues, semantic labels/surfaces, `data-tint` scopes |
| `tokens/typography.css` | Font stacks, Dynamic Type ramp, semantic text roles |
| `tokens/spacing.css` | Spacing, control sizes, radii |
| `tokens/effects.css` | Glass material, shadows, motion |
| `tokens/base.css` | Body reset, link colors |
| `guidelines/*.html` | Foundation specimen cards (Colors, Type, Spacing, Brand) |
| `components/<group>/` | React primitives (`.jsx` + `.d.ts` + `.prompt.md` + card) |
| `templates/<slug>/` | Reusable app screens (Design Components): `onboarding-flow`, `dashboard-home`, `settings-profile`, `mood-insights`, `guided-exercise` |
| `tokens/themes.css` | Data-viz palette, hero gradient, dark theme, flat chrome |
| `ui_kits/tasks/` | Interactive Tasks app recreation |
| `ui_kits/journal/` | Interactive Journal app recreation |
| `ui_kits/notes/` | Interactive Notes app recreation |
| `ui_kits/shared/phone.jsx` | iPhone frame + status bar used by the kits |
| `_dev/ds-fallback.js` | Builds the component namespace in-browser if `_ds_bundle.js` isn't compiled yet (no-op otherwise) |
| `components/motion/motion.jsx` | Motion helpers (springTo, grab, flipFrom, useSlotScrub, haptic) + live card `interaction.card.html` |
| `guidelines/motion-performance.html` | Motion & Performance doc: glass, springs, 60fps rules, QA checklist |
| `CLAUDE.md` | Always-on motion, glass and performance rules for every build |
| `native/` | **Native handoff**: `tokens.json`, SwiftUI (`ios/`), Jetpack Compose (`android/`), `COMPONENT_MAP.md`, `BUILDING_APPS.md`, `RELEASE_CHECKLIST.md` |
| `thumbnail.html` | Project tile |
| `SKILL.md` | Agent-skill entry point |

## Components

Namespace: `window.CleanAppsDesignSystem_092cf6`.

- **icons/** — `Icon`
- **buttons/** — `GlassButton`, `GlassGroup`, `Button`, `FAB`
- **navigation/** — `NavBar`, `LargeTitle`, `TabBar` (liquid-glass lens, dock, collapse), `SearchField`, `Toolbar`, `EdgeSwipeBack`
- **lists/** — `ListSection`, `ListRow`, `SectionHeader`
- **controls/** — `Switch`, `Slider`, `Stepper`, `Chip`, `ValuePill`, `StatusCircle`, `ActionTiles`
- **overlays/** — `Menu`, `Sheet`
- **data/** — `ProgressBar`, `ProgressRing`, `StackedColumns`, `MetricCard`
- **flow/** — `StepBar`, `Timeline`, `WheelPicker`, `RulerPicker`
- **chrome/** — `SegmentedControl`, `FlatTabBar`, `FlatHeader`, `DisplayTitle`, `DayStrip`, `Avatar`
- **insights/** (optional, reflective/dark apps) — `RangeSwitcher`, `InsightCard`, `MonthGrid`, `BubbleChart`, `PillBars`, `TileCard`, `CheckInButton`, `DotOrb`
- **content/** — `TaskRow`, `Composer`, `EmptyState`, `PromoCard`, `FeatureRow`, `EntryCard`, `StatCard`

Every family above maps to a pattern visible in the screenshots. **Intentional additions:** `Icon` (wrapper for the Phosphor substitute glyph set). System chrome (keyboard, status bar) is not a component; the status bar lives in the kit frame only.

## UI kits

- `ui_kits/tasks/index.html` — tab bar (Today/Upcoming/Search/Lists), FAB → glass composer → Date sheet, ellipsis → View sheet with Sort menu, gear → Settings → General, Upgrade → paywall. Tap status circles to complete tasks.
- `ui_kits/journal/index.html` — insights home → Journal timeline → compose (indigo tint).
- `ui_kits/notes/index.html` — folders → notes list (pinned/locked, month groups) → editor (yellow tint).

---

## CONTENT FUNDAMENTALS

**Voice:** quiet, utilitarian, second person implied. The UI describes things rather than talking to you. No personality copy, no jokes, no exclamation marks in system copy.

- **Casing:** Title Case for screen titles, settings rows and buttons ("Claim Free Membership", "Task Default", "What's New", "Help & Feedback", "Next Week", "No Date"). Sentence case for longer row labels and toggles ("Overdue tasks", "Show status circle", "Reverse scroll direction", "Slash quick search"). Menu items sentence case ("Edit lists", "New folder").
- **Length:** 1–3 words per label. Values are single words ("Manual", "None", "Bottom", "Monday", "Minimalist").
- **Pronouns:** "you/your" only in explanations ("Sync tasks across all your devices"). Never "I/we" except ownership possessives in user data ("My Workspace").
- **Empty states:** a plain question + one instruction — "What do you want to search" / "Tap the input box to search".
- **Footnotes:** one explanatory sentence under a section, starting "When enabled, …".
- **Paywall:** short benefit title + plain description ("Home screen widgets — Unlock access to all widgets"; "Complete privacy — No ads, no data collected, no tracking"); price line "Lifetime access for just € 9,99"; one CTA "Continue"; legal row "Restore • Terms and conditions • Privacy policy".
- **Meta lines:** parts joined with a spaced middle dot: "Personal · Short-term task", "Oct 5 · Tomorrow · Monday", "10:00AM → 5:00PM · Work". Arrows (→) for ranges.
- **Dates:** "4 Oct 2026" in pickers; ISO "2026-09-21" for version history; locale formats in user content ("Thu, Oct 1, 22:40").
- **Emoji:** never in system UI. They appear only as user-authored content in task titles (🧣, 🥋) — support them, don't add them.
- **Localization:** apps ship multilingual (EN, ES, NL seen); keep labels short to survive translation.

## VISUAL FOUNDATIONS

- **Overall vibe:** monochrome, calm, generous whitespace. Black on white, with grey for everything secondary. Color is functional (green switches, red destructive) or a single per-app accent.
- **Color:** Pure white page (`#FFFFFF`) for primary lists; cool grey grouped background (`#F1F2F6`) for settings, folders and sheets, with white cards on it. Accent defaults to **black** (FAB, send, Pro card). Apps retint with `data-tint`: indigo `#5E52F4` (Journal), yellow `#E3AF0A` (Notes). Four label greys: `#000`, `#8A8A8E`, `#A3A3A7`, `#C4C5C7`.
- **Type:** the platform system font (SF Pro / Roboto), never a custom display face. Bold 34 large titles with tight tracking, semibold 17 nav titles, bold 20–22 section headers, regular 17 body, 15 meta. Hierarchy comes from weight and grey, not size jumps.
- **Backgrounds:** flat. No images, patterns, textures or full-bleed photography in system UI. The only gradients: the Journal insight widget (lavender `#8481BE → #A282B4`) and a tinted menu glass. Wallpaper assets are plain dark `#242424` or light `#F1F2F2`.
- **Liquid glass:** every floating control — bar buttons, grouped capsules, tab bar, search field, toolbars, menus, floating sheets, composer — is translucent white (≈72%) with `blur(24px) saturate(180%)`, a 0.5px dark hairline, a white inner top highlight and a soft drop shadow. Content scrolls underneath; there is **no opaque nav bar**.
- **Cards:** white, **26px** radius, **no shadow, no border**, inset 16px from screen edges. Rows inside are separated by 1px `#E7E7E8` hairlines inset to the text (60px with icon, 16px without) and right-inset 16px. Single-row cards are common. Journal entry cards are the exception with a barely-there shadow.
- **Corner radii:** large and concentric — chips 10, media tiles 22 (inside 26 cards with 4px inset), cards 26, menus 34, sheets 38, device 55, buttons fully round.
- **Shadows:** cards flat; glass `0 4px 18px rgba(0,0,0,.07)`; menus/sheets `0 18px 50px rgba(0,0,0,.16)`; FAB `0 8px 24px rgba(0,0,0,.22)`.
- **Layout:** 16px page margin; large title at 17px; task rows 20px side padding; 32px between sections. Fixed elements: floating tab bar 20px from sides/bottom, FAB bottom-right ~22px above it, top-right glass actions at y≈50. Bottom-docked search + compose in Notes.
- **Sheets:** full sheets rise to 47px from top with 38px top corners on the grouped background; short pickers use a **floating** glass sheet inset 8px on all sides. Background dims with a 20% black scrim. Header: Cancel (regular) · title (semibold) · Done (semibold) in glass capsules, or a lone close (×) circle.
- **Menus:** glass pop-overs anchored to their trigger, 250px wide, 34px radius, check column for single-choice, hairline dividers between groups, no scrim.
- **Press states:** glass and solid buttons scale to 0.96 with a springy ease; list rows flash a light grey `#E7E7E8` highlight. No hover states (touch-first) — on web, use opacity 0.7 for links.
- **Animation:** springs, not durations — snappy (400/30), smooth (220/26), gentle (120/20); CSS fallbacks 120/220/360ms, enter `cubic-bezier(.2,.8,.2,1)`, exit `cubic-bezier(.4,0,1,1)`. Press `scale(.97)` in 80ms. Transform/opacity only, interruptible, velocity-aware, reduced-motion → fades. Full rules: `guidelines/motion-performance.html` (and `CLAUDE.md`).
- **Transparency & blur:** only on floating chrome and overlays. Content surfaces are opaque.
- **Imagery:** none in system UI. User content (maps, activity rings, photos, voice memos) appears inside rounded media tiles with soft pastel fills (rose `#FBE6E6`, pale indigo `#E7EBFE`).
- **Controls:** iOS 26 switches 63×28 with a pill thumb (green on, `#C4C5C7` off); outline rounded-rect chips; grey value pills; grey −|+ steppers; three-state status circles (ring, half, ring+dot).

## ICONOGRAPHY

- **Source system:** the reference apps use **SF Symbols** (iOS) — monochrome, matched to text weight, mixing outline and `.fill` variants. SF Symbols can't be redistributed, and no icon files were provided.
- **Substitute (flagged):** **Phosphor Icons** via CDN (`@phosphor-icons/web@2.1.1`, regular / bold / fill), loaded in `tokens/fonts.css`, used through the `Icon` component (`<Icon name="bell" weight="fill" />`). Phosphor's three weights map cleanly onto SF Symbols usage:
  - **bold** — bar and navigation glyphs: `dots-three`, `plus`, `caret-left/right`, `caret-up-down`, `magnifying-glass`, `list-bullets`, `arrow-up`, `check`.
  - **fill** — solid row icons: `briefcase`, `gift`, `lock`, `eye`, `check-circle`, `squares-four`, `image`, `sparkle`, `info`, `calendar-dots`.
  - **regular** — outline row icons: `bell`, `clock`, `globe`, `folder`, `trash`, `books`, `camera`, `paperclip`.
- **Color:** icons are black (`--label`) in rows, grey in inactive/secondary roles, white on accent. Only Notes tints folder icons yellow; only colored *tiles* (cyan "Shared") get a background.
- **Size:** 26px in list rows (28px box), 22px in glass buttons, 26px in tab bar/toolbars, 18px in chips/menus checks.
- **No emoji, no unicode glyph icons** in system UI. "Aa" in format buttons is text, not an icon. The Today tab's day number is a CSS-drawn rounded square with text.
- **Logos / app icons:** none provided; none drawn.

## Templates

| Template | Pattern | Reference |
|---|---|---|
| Onboarding Flow | Header + StepBar + question + WheelPicker / RulerPicker + Next | nutrition onboarding |
| Dashboard Home | DisplayTitle, StackedColumns + pill toggle, MetricCard grid, FlatTabBar | nutrition dashboard |
| Settings & Profile | Avatar header, grouped ListSections, FlatTabBar | nutrition "More" |

## Reflective / insights pattern (optional)

A third reference set (dark mood-tracking app) contributed a small, **optional** kit — it is not the default look. Use it only for apps about reflection, habits or wellbeing that need period-based charts: `RangeSwitcher` + `InsightCard` shells holding `PillBars`, `MonthGrid` or `BubbleChart`; `CheckInButton` as the single home action; `TileCard` hub grids; `TabBar variant="capsule"`; `DisplayTitle variant="serif"` (Newsreader) for one expressive title per screen. Keep the serif and mood colors (`--mood-*`) to these screens — everything else stays sans, monochrome and calm. Template: `templates/mood-insights`.

| Mood Insights | Check-in ring, range switcher, insight card with ranked bars, capsule tab bar (optional, dark) | dark mood-tracking app |
| Guided Exercise | Tile grid → intro with video CTA → dot-orb session (optional, dark) | dark mood-tracking app |

## Data-viz & dark mode

- Pastel fills in light (`--viz-blue/coral/yellow/green/purple`), same names resolve to saturated fills in dark; `-strong` variants for lines, rings and icons. Text on viz fills is always `--viz-ink` (black).
- Dark: `#121212` page, `#1E1E1E` cards, accent flips to white, glass becomes `rgba(44,44,46,.72)`.
- Typography in flat chrome: **DM Sans** body, **Unbounded** (wide, heavy, uppercase) for tab-root titles via `DisplayTitle` — substitute for the reference app's display face.

## Caveats

- SF Pro is not shipped; Apple devices get it via `-apple-system`, others fall back to **Inter** (Google Fonts).
- Android is expressed through the flat chrome (no native Material components yet). Dark mode covers tokens + all new components; the original glass-chrome kits are light-first.
- Display face (Unbounded) and body (DM Sans) are Google Fonts approximations of the reference apps' fonts.
