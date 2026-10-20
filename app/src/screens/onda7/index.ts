/* Onda 7 design primitives. Specs in docs/ONDA7_DESIGN.md.

   Cover          the Onda's world: material, emblem, display face, numerals. size 'hero' | 'tile'.
   GroupedList    one rounded inset container; hairlines inset to the text; optional small capitals header and footer.
   Row            list row: line icon in the accent, title, subtitle, value, trailing check or chevron.
   CheckCircle    trailing 24pt ring that fills with the accent when done (decorative; the row has role checkbox).
   SectionHeader  22pt bold system title with count, collapse caret and an action.
   PracticeRow    a practice as a checkbox row; hold, right click or the context menu key opens "How to do this".
   PlanList       the day's plan as grouped lists by time of day.
   ShortcutBar    a compact row of shortcuts as one floating glass group.
   SearchField    iOS search field.
   QuoteBlock     a quote set on the page in the display face under the tradition's ornament.

   Every primitive reads --onda-* from the nearest wrapper (spread look.vars) and falls back to system colours without it. */

export { Cover, type CoverProps } from './Cover'
export { CheckCircle, GroupedList, QuoteBlock, Row, SearchField, SectionHeader, ShortcutBar, type RowProps } from './lists'
export { PlanList, PracticeRow, type PracticeInfo, type PracticeOpen } from './PracticeRow'
