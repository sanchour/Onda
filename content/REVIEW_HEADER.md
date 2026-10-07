# Content review

This file lists what a human needs to check before Onda's content is published. The per-Onda sections below are
generated from the content files by `npm run content:check -- --write` (in `/app`); edit this header in
`content/REVIEW_HEADER.md`, not in `CONTENT_REVIEW.md`.

## How the content was written

All ten Ondas were expanded from the first-draft `onda-data.js` by an AI model (Claude) working from its own
knowledge of the published literature. **No fact was checked against a live source during writing**: there was no
browsing, no library and no subject expert in the loop. The `sources` lists name the standard works the content is
consistent with; they are a reading list for the reviewer, not a record of citations that were looked up.

That means every date, attribution, title, year and pronunciation should be treated as *plausible and in need of
confirmation*, not as verified. Items the author was actively unsure about are marked `unverified: true` in the JSON
and listed per Onda below, and the app labels them "Not yet verified" in the Full guide. The absence of a flag means
"the author was confident", which is weaker than "checked".

## What to review, in priority order

1. **Cultural review (blocking).** Native American Animism, Ubuntu, Tibetan Buddhism and Sufism have
   `sensitivity.reviewRequired: true`. Each needs to be read by people from the tradition before launch:
   - *Native American Animism*: Indigenous advisers, ideally from more than one nation, with attention to the framing
     note, the choice of the word "animism", every word in the vocabulary (spelling, diacritics, pronunciation and
     whether the nation is content to have it shared), and whether the practices read as respectful to a guest.
     Consider renaming the Onda with their guidance.
   - *Ubuntu*: southern African reviewers (isiZulu, isiXhosa and Sesotho speakers) for vocabulary, pronunciation,
     customs and tone.
   - *Tibetan Buddhism*: a Tibetan Buddhist teacher, for the instructions for tonglen and the mantra, and the line
     drawn around practices that need empowerment.
   - *Sufism*: a Sufi teacher or a scholar of Islam, especially for the dhikr instructions written for non-Muslims.
2. **Quotations.** Check every quote against the cited edition. Translated quotes are worded from memory of
   standard translations and may differ by a word or two from the named translator. Fix the wording or the credit.
3. **Practice instructions that touch health.** Cold exposure and fasting (Stoicism), sitting posture (Zen),
   qigong (Taoism), diet (Vedanta), active imagination (Jung). Have a clinician read the caveats.
4. **Dates and works.** Years of films, albums, broadcasts and books; life dates of figures; the history timelines.
5. **Pronunciations.** All are rough English approximations written without a native speaker.
6. **Links.** No external links are included yet, on purpose: none could be verified. Add them during review.

## Decisions a reviewer should know about

- **No closed ceremonies.** The Animism Onda contains no smudging, sweat lodge, pipe, vision quest or sun dance, and
  a unit test fails if those words appear among its practices, tasks or immersion items.
- **Misattributed quotes were replaced or flagged.** The draft's "chop wood, carry water" proverb (Zen) and "the wound
  is the place where the Light enters you" (Rumi, in Coleman Barks's free version) are kept but marked unverified and
  moved out of first position; the Full guide notes that many online Rumi and Hafez quotes have no Persian source.
- **"Amor fati" and "memento mori"** are kept in the Stoic vocabulary with a note that neither phrase is ancient Stoic.
- **Morning pages** (Transcendentalism) and **sit spot** (Animism) are modern names. The text says so.
- **Gallery participant counts** in the Lagos gallery are illustrative seed numbers, not real usage.
