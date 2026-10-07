# Content review

This file lists what a human needs to check before Onda's content is published. The per-Onda sections below are
generated from the content files by `npm run content:check -- --write` (in `/app`); edit this header in
`content/REVIEW_HEADER.md`, not in `CONTENT_REVIEW.md`.

## How the content was written and checked

All ten Ondas were expanded from the first-draft `onda-data.js` by an AI model (Claude) from its knowledge of the published literature, then put through a fact-check pass (v1.1):

- Every date, attribution, work title, creator and year was reviewed claim by claim. Anything the reviewer could not stand behind was **removed**, not hedged: two Dalai Lama lines with no firm source, a Bashō line that is probably misattributed, a "chop wood, carry water" proverb with no traceable source, the "wound is the place where the Light enters you" line (a known misattribution to Rumi), a Jung "slipped up" remark, and several films, albums and paintings whose year or existence could not be confirmed. Years for BBC *In Our Time* episodes were dropped because they could not be confirmed.
- A small number of claims were checked against live web sources: the first written use of "ubuntu" (1846, per Christian Gade), the nine remaining Potawatomi speakers in *Braiding Sweetgrass*, Yvonne Mokgoro's dates, the year of Yungchen Lhamo's *Tibet, Tibet* (1996) and Jung's 1933 role in the International General Medical Society for Psychotherapy. Two were corrected as a result.
- **Everything else rests on the author's knowledge and has not been confirmed against a source.** The `sources` lists name the standard works the content is consistent with; they are a reading list for the reviewer, not citations that were looked up. Items the author was actively unsure about are marked `unverified: true`, listed per Onda below, and labelled "Not yet verified" in the app. A missing flag means "the author was confident", which is weaker than "checked".

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
- **Misattributed or untraceable quotes were removed**, not flagged. The Full guide notes that many online Rumi and Hafez quotes have no Persian source.
- **"Amor fati" and "memento mori"** are kept in the Stoic vocabulary with a note that neither phrase is ancient Stoic.
- **Morning pages** (Transcendentalism) and **sit spot** (Animism) are modern names. The text says so.
- **Gallery participant counts** in the Lagos gallery are illustrative seed numbers, not real usage.

## Stoicism

File: `content/ondas/stoic.json` · version 2 · about 4400 words · 32 words of vocabulary, 30 journal prompts, 16 history entries, 10 concepts, 8 sources.

Nothing is marked `unverified`.


## Zen Buddhism

File: `content/ondas/zen.json` · version 2 · about 3800 words · 32 words of vocabulary, 30 journal prompts, 14 history entries, 10 concepts, 6 sources.

Framing note shown in the app: Zen is a living Buddhist tradition. This Onda adapts its everyday lay practices. It is not ordination, and it does not replace a teacher or a community.

Marked `unverified` (1):

- Fact: Legend says Bodhidharma cut off his own eyelids to stay awake, and that the first tea plants grew where they fell.

## Taoism

File: `content/ondas/tao.json` · version 2 · about 3900 words · 32 words of vocabulary, 30 journal prompts, 13 history entries, 10 concepts, 7 sources.

Framing note shown in the app: Daoism is a living religion as well as a body of classic texts. This Onda uses the classics and common health practices. Priestly rites and initiations belong to Daoist communities and are not imitated here.

Marked `unverified` (1):

- Fact: Laozi means "Old Master". By legend he was carried in his mother’s womb for decades and was born with white hair.

## Tibetan Buddhism

File: `content/ondas/tibet.json` · version 2 · about 3800 words · 32 words of vocabulary, 30 journal prompts, 14 history entries, 10 concepts, 6 sources.

**Needs review by tradition bearers before launch.** Tibetan Buddhism is a living tradition whose people have been in exile since 1959. This Onda uses only practices that Tibetan teachers offer publicly: tonglen, the compassion mantra and the mind-training slogans. Practice as a guest, and learn from Tibetan teachers where you can.

Caveats shown in the app:

- Tantric practices that require empowerment from a qualified teacher are not included and should not be improvised.
- Prayer flags, images and texts are sacred objects, not decoration. Treat them with care.
- If tonglen stirs up more than you can hold, return to simple breathing and seek guidance.
- This content has not yet been reviewed by a Tibetan Buddhist teacher.

Nothing is marked `unverified`.


## Vedanta

File: `content/ondas/vedanta.json` · version 2 · about 3600 words · 32 words of vocabulary, 30 journal prompts, 13 history entries, 10 concepts, 6 sources.

Framing note shown in the app: Vedānta is part of living Hindu tradition and is normally learned from a teacher within a lineage. This Onda introduces its texts and its most widely taught practices.

Nothing is marked `unverified`.


## Jungian Individuation

File: `content/ondas/jung.json` · version 2 · about 4200 words · 32 words of vocabulary, 30 journal prompts, 15 history entries, 10 concepts, 6 sources.

Framing note shown in the app: This Onda is self-observation, not psychotherapy. Jung’s methods can bring up strong material.

Marked `unverified` (1):

- Immerse, watch: The Way of the Dream (Fraser Boa with Marie-Louise von Franz)

## Native American Animism

File: `content/ondas/animism.json` · version 2 · about 4500 words · 32 words of vocabulary, 30 journal prompts, 16 history entries, 10 concepts, 7 sources.

**Needs review by tradition bearers before launch.** There is no single Native American tradition. This Onda draws only on what Native authors and nations have shared publicly, names the nation each idea comes from, and includes no ceremonies. You are a guest: give thanks in your own words, learn whose land you are on, and give something back.

Caveats shown in the app:

- Do not perform or imitate smudging, sweat lodges, pipe ceremonies, vision quests, sun dances or any other ceremony. They belong to specific nations.
- Do not wear regalia or headdresses, and do not claim a "spirit animal".
- Pronunciations are approximate. Learn words from speakers and from nations’ own language programmes.
- "Animism" is an outsiders’ term with a colonial history. It is used here as a pointer, not a description any nation chose.
- This content has not yet been reviewed by Indigenous advisers. It must be before release.

Marked `unverified` (4):

- Word: Ohén:ton Karihwatéhkwen (Kanien’kéha (Mohawk)): spelling, meaning or pronunciation
- Word: Skén:nen (Kanien’kéha (Mohawk)): spelling, meaning or pronunciation
- Word: Aki (Anishinaabemowin (Ojibwe)): spelling, meaning or pronunciation
- Word: Nibi (Anishinaabemowin (Ojibwe)): spelling, meaning or pronunciation

## Ubuntu

File: `content/ondas/ubuntu.json` · version 2 · about 3900 words · 32 words of vocabulary, 30 journal prompts, 14 history entries, 10 concepts, 7 sources.

**Needs review by tradition bearers before launch.** Ubuntu is a living ethic of the peoples of southern Africa, not a brand or a technique. This Onda keeps to its everyday practice, greeting, visiting, sharing food and serving, and draws on African authors.

Caveats shown in the app:

- Pronunciations are approximate, and isiXhosa and isiZulu clicks cannot be shown in English spelling. Learn from speakers.
- Do not romanticise: ubuntu is demanding, debated among Africans, and has also been misused.
- Customs differ between peoples and families. When you are a guest, follow your hosts.
- This content has not yet been reviewed by southern African advisers. It should be before release.

Marked `unverified` (2):

- Word: Uxolo (isiXhosa, isiZulu): spelling, meaning or pronunciation
- Word: Ukuxolela (isiXhosa, isiZulu): spelling, meaning or pronunciation

## Sufism

File: `content/ondas/sufi.json` · version 2 · about 4100 words · 32 words of vocabulary, 30 journal prompts, 14 history entries, 10 concepts, 7 sources.

**Needs review by tradition bearers before launch.** Sufism is the contemplative heart of Islam and a living tradition of practising Muslims. This Onda offers remembrance, poetry, listening and night stillness in a form open to anyone, and does not reproduce the rituals of any order.

Caveats shown in the app:

- The dhikr circles, initiations and the Mevlevi turning ceremony belong to the orders and are learned from an authorised guide. Do not imitate them.
- Many popular English "Rumi" and "Hafez" quotations are loose versions or inventions. Prefer translations made from Persian.
- If you are not Muslim, practice as a respectful guest. If you are, follow your own tradition’s guidance.
- This content has not yet been reviewed by a Sufi teacher or a scholar of Islam. It should be before release.

Nothing is marked `unverified`.


## Transcendentalism

File: `content/ondas/transc.json` · version 2 · about 4000 words · 32 words of vocabulary, 30 journal prompts, 14 history entries, 10 concepts, 7 sources.

Nothing is marked `unverified`.
