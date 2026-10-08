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

File: `content/ondas/stoic.json` · version 2 · about 4600 words · 32 words of vocabulary, 30 journal prompts, 16 history entries, 10 concepts, 8 sources.

Nothing is marked `unverified`.


## Zen Buddhism

File: `content/ondas/zen.json` · version 2 · about 4000 words · 32 words of vocabulary, 30 journal prompts, 14 history entries, 10 concepts, 6 sources.

Framing note shown in the app: Zen is a living Buddhist tradition. This Onda adapts its everyday lay practices. It is not ordination, and it does not replace a teacher or a community.

Marked `unverified` (1):

- Fact: Legend says Bodhidharma cut off his own eyelids to stay awake, and that the first tea plants grew where they fell.

## Taoism

File: `content/ondas/tao.json` · version 2 · about 4100 words · 32 words of vocabulary, 30 journal prompts, 13 history entries, 10 concepts, 7 sources.

Framing note shown in the app: Daoism is a living religion as well as a body of classic texts. This Onda uses the classics and common health practices. Priestly rites and initiations belong to Daoist communities and are not imitated here.

Marked `unverified` (1):

- Fact: Laozi means "Old Master". By legend he was carried in his mother’s womb for decades and was born with white hair.

## Tibetan Buddhism

File: `content/ondas/tibet.json` · version 2 · about 4000 words · 32 words of vocabulary, 30 journal prompts, 14 history entries, 10 concepts, 6 sources.

**Needs review by tradition bearers before launch.** Tibetan Buddhism is a living tradition whose people have been in exile since 1959. This Onda uses only practices that Tibetan teachers offer publicly: tonglen, the compassion mantra and the mind-training slogans. Practice as a guest, and learn from Tibetan teachers where you can.

Caveats shown in the app:

- Tantric practices that require empowerment from a qualified teacher are not included and should not be improvised.
- Prayer flags, images and texts are sacred objects, not decoration. Treat them with care.
- If tonglen stirs up more than you can hold, return to simple breathing and seek guidance.
- This content has not yet been reviewed by a Tibetan Buddhist teacher.

Nothing is marked `unverified`.


## Vedanta

File: `content/ondas/vedanta.json` · version 2 · about 3800 words · 32 words of vocabulary, 30 journal prompts, 13 history entries, 10 concepts, 6 sources.

Framing note shown in the app: Vedānta is part of living Hindu tradition and is normally learned from a teacher within a lineage. This Onda introduces its texts and its most widely taught practices.

Nothing is marked `unverified`.


## Jungian Individuation

File: `content/ondas/jung.json` · version 2 · about 4400 words · 32 words of vocabulary, 30 journal prompts, 15 history entries, 10 concepts, 6 sources.

Framing note shown in the app: This Onda is self-observation, not psychotherapy. Jung’s methods can bring up strong material.

Marked `unverified` (1):

- Immerse, watch: The Way of the Dream (Fraser Boa with Marie-Louise von Franz)

## Native American Animism

File: `content/ondas/animism.json` · version 2 · about 4600 words · 32 words of vocabulary, 30 journal prompts, 16 history entries, 10 concepts, 7 sources.

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

File: `content/ondas/ubuntu.json` · version 2 · about 4100 words · 32 words of vocabulary, 30 journal prompts, 14 history entries, 10 concepts, 7 sources.

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

File: `content/ondas/sufi.json` · version 2 · about 4300 words · 32 words of vocabulary, 30 journal prompts, 14 history entries, 10 concepts, 7 sources.

**Needs review by tradition bearers before launch.** Sufism is the contemplative heart of Islam and a living tradition of practising Muslims. This Onda offers remembrance, poetry, listening and night stillness in a form open to anyone, and does not reproduce the rituals of any order.

Caveats shown in the app:

- The dhikr circles, initiations and the Mevlevi turning ceremony belong to the orders and are learned from an authorised guide. Do not imitate them.
- Many popular English "Rumi" and "Hafez" quotations are loose versions or inventions. Prefer translations made from Persian.
- If you are not Muslim, practice as a respectful guest. If you are, follow your own tradition’s guidance.
- This content has not yet been reviewed by a Sufi teacher or a scholar of Islam. It should be before release.

Nothing is marked `unverified`.


## Transcendentalism

File: `content/ondas/transc.json` · version 2 · about 4100 words · 32 words of vocabulary, 30 journal prompts, 14 history entries, 10 concepts, 7 sources.

Nothing is marked `unverified`.


## Soviet Union

File: `content/ondas/soviet.json` · version 1 · about 5400 words · 32 words of vocabulary, 30 journal prompts, 12 history entries, 10 concepts, 7 sources.

**Needs review by tradition bearers before launch.** The Soviet Union was a one-party state responsible for mass repression, famine and war crimes, and also home to great art, science and ordinary kindness. This Onda explores the culture, ideas and daily habits of its people. It does not endorse the regime or its successors.

Caveats shown in the app:

- Hold the culture and the cost together. The terror, the Gulag and the famines are part of the story and are not set aside.
- The Soviet Union was many nations. Ukrainians, Balts, Georgians, Kazakhs and others experienced it as rule from Moscow, often as imperial, and their accounts deserve equal weight with Russian ones.
- Russian culture is not the same as any state. Reading Akhmatova or watching Tarkovsky does not endorse any government, past or present.
- This content has not yet been reviewed by historians or by people from the former Soviet republics. It should be before release.

Marked `unverified` (1):

- Quote: "Poetry is respected only in this country: people are killed for it." (Osip Mandelstam; As recalled by Nadezhda Mandelstam in Hope Against Hope)

## Yoruba

File: `content/ondas/yoruba.json` · version 1 · about 4600 words · 35 words of vocabulary, 30 journal prompts, 11 history entries, 10 concepts, 6 sources.

**Needs review by tradition bearers before launch.** Yoruba religion and culture are living traditions practised by tens of millions of people in Nigeria and across the diaspora. This Onda offers greetings, proverbs, ethics and listening in a form open to anyone. It does not teach the rites of initiates.

Caveats shown in the app:

- Initiation, divination, masquerades and shrine rites belong to initiated priests and communities. Do not imitate them. Learn from a trained teacher if you wish to go deeper.
- Yoruba is a tonal language. The tone marks and spellings here should be checked with a fluent speaker, and proverbs vary from region to region.
- The pouring of water in the Ìbà practice is a simple gesture of respect, not a ritual. It is not an offering to an òrìṣà.
- This content has not yet been reviewed by Yoruba speakers, Ifá scholars or priests. It should be before release.

Marked `unverified` (12):

- Quote: "Character is the beauty of a person." (Yoruba proverb; Ìwà lẹ̀wà)
- Quote: "Proverbs are the horses of speech; when speech is lost, we use proverbs to find it." (Yoruba proverb; Òwe lẹ́ṣin ọ̀rọ̀; bí ọ̀rọ̀ bá sọnù, òwe ni a fi ń wá a)
- Quote: "If a child knows how to wash their hands, they will eat with elders." (Yoruba proverb; Bí ọmọdé bá mọ ọwọ́ wẹ̀, yóò bá àgbà jẹun)
- Quote: "A child’s hand cannot reach the shelf, and an elder’s hand cannot enter the gourd." (Yoruba proverb; Ọwọ́ ọmọdé kò tó pẹpẹ; ti àgbà kò wọ kèrègbè)
- Quote: "A tiger does not proclaim its tigritude; it pounces." (Wole Soyinka; Attributed, from remarks in the early 1960s)
- Word: Ọmọlúàbí (Yoruba): spelling, meaning or pronunciation
- Word: Ìwà pẹ̀lẹ́ (Yoruba): spelling, meaning or pronunciation
- Word: Àyànmọ́ (Yoruba): spelling, meaning or pronunciation
- Word: Ìtútù (Yoruba): spelling, meaning or pronunciation
- Word: Aṣọ òkè (Yoruba): spelling, meaning or pronunciation
- Word: Ẹbí (Yoruba): spelling, meaning or pronunciation
- Immerse, listen: Oba Koso (Duro Ladipo, 1963)

## Aztec

File: `content/ondas/aztec.json` · version 1 · about 4700 words · 33 words of vocabulary, 30 journal prompts, 13 history entries, 10 concepts, 7 sources.

**Needs review by tradition bearers before launch.** The Mexica and other Nahua peoples built a great civilisation, and their descendants live today. This Onda offers gratitude, poetry and reflection inspired by Nahua thought. It does not reproduce ceremonies, and it treats the sacrificial side of Mexica religion as part of an honest history.

Caveats shown in the app:

- "Aztec" is an outside term. The people of Tenochtitlan called themselves Mexica, and many Nahua peoples shared the language. Use the name that people use for themselves when you can.
- Much of what we know comes from Spanish friars and colonial sources. Read accounts of sacrifice and of conquest with that in mind, and prefer Nahua-authored texts where you can.
- Ceremonies such as danza, copal blessings, temazcal steam baths and Day of the Dead rites belong to living communities. Attend only when invited and do not imitate them as costume.
- This content has not yet been reviewed by Nahua speakers, Mexican historians or community members. It should be before release.

Marked `unverified` (21):

- Quote: "Is it true that one lives with roots on the earth? Not forever on earth, only a little while here." (Poem attributed to Nezahualcoyotl; Cantares mexicanos, trans. after Miguel León-Portilla)
- Quote: "Though it be jade, it falls and shatters; though it be gold, it wears away; though it be quetzal plumage, it is torn asunder. Not forever on earth, only a little while here." (Poem attributed to Nezahualcoyotl; Cantares mexicanos, trans. after Miguel León-Portilla)
- Quote: "The wise one: a light, a torch, a stout torch that does not smoke." (Nahua sages; Florentine Codex, Book 10, on the tlamatini, trans. after León-Portilla)
- Quote: "Broken spears lie in the roads; we have torn our hair in our grief. The houses are roofless now, and their walls are red with blood." (Nahua lament of 1521; Cantares mexicanos, in The Broken Spears, trans. Lysander Kemp)
- Quote: "Father, do not be alarmed; we are still in nepantla." (A Nahua man to Diego Durán, as reported; Diego Durán, History of the Indies of New Spain, 16th century; reported wording)
- Word: Metztli (Classical Nahuatl): spelling, meaning or pronunciation
- Word: Neltiliztli (Classical Nahuatl): spelling, meaning or pronunciation
- Word: Teotl (Classical Nahuatl): spelling, meaning or pronunciation
- Word: Xocolatl (Classical Nahuatl): spelling, meaning or pronunciation
- Word: Xiuhpohualli (Classical Nahuatl): spelling, meaning or pronunciation
- Word: Tonalpohualli (Classical Nahuatl): spelling, meaning or pronunciation
- Immerse, read: Flower and Song: Poems of the Aztec Peoples (Translated by Edward Kissam and Michael Schmidt, 1977)
- Figure: Nezahualcoyotl, 1402–1472
- Figure: Tlacaelel, c. 1397–1487
- Figure: Cuauhtémoc, c. 1495–1525
- Figure: Malintzin, c. 1500 to c. 1529
- Figure: Diego Durán, c. 1537–1588
- Figure: Antonio Valeriano, c. 1522–1605
- History: c. 1325: Founding of Tenochtitlan
- History: 1487: The Templo Mayor rededicated
- Fact: Tenochtitlan was connected to the shore by three long causeways and supplied by aqueducts from Chapultepec. Nezahualcoyotl is credited with building a long dike across the lake to control floods.

## Ancient Egypt

File: `content/ondas/egypt.json` · version 1 · about 4900 words · 33 words of vocabulary, 30 journal prompts, 13 history entries, 10 concepts, 6 sources.

Framing note shown in the app: Ancient Egyptian religion is no longer practised as a continuous tradition, though some modern groups reconstruct it. This Onda borrows ethical ideas, habits of attention and cultural material, and does not ask you to worship its gods. Vowels in Egyptian words are conventional, since the script did not record them.

Marked `unverified` (11):

- Quote: "Great is Maat, lasting in effect; it has not been disturbed since the time of Osiris." (Ptahhotep; The Instruction of Ptahhotep, maxim 5, trans. after Miriam Lichtheim)
- Quote: "Do not be proud of your knowledge; consult the ignorant and the wise." (Ptahhotep; The Instruction of Ptahhotep, maxim 1, trans. after Miriam Lichtheim)
- Quote: "Do not move the markers on the borders of the fields, nor shift the position of the measuring cord." (Amenemope; The Instruction of Amenemope, chapter 6, trans. after Miriam Lichtheim)
- Quote: "I have not done wrong. I have not caused weeping." (The deceased before the tribunal; Book of the Dead, spell 125, the declaration of innocence; wording varies by papyrus)
- Quote: "Follow your heart as long as you live." (Song of the Harper; Tomb inscriptions and papyri of the New Kingdom, trans. varies)
- Quote: "How manifold are your works. They are hidden from the face of man." (The Great Hymn to the Aten; Tomb of Ay at Amarna, trans. after Miriam Lichtheim)
- Figure: Imhotep, fl. c. 2650 BCE
- Figure: Nefertiti, c. 1370 to c. 1330 BCE
- Figure: Ptahhotep, vizier, 24th century BCE
- History: c. 3100 BCE: Unification of Egypt
- History: c. 2670 BCE: The Step Pyramid

## Hermeticism

File: `content/ondas/hermes.json` · version 1 · about 4600 words · 33 words of vocabulary, 30 journal prompts, 14 history entries, 10 concepts, 6 sources.

Framing note shown in the app: Hermeticism includes ancient philosophy, Renaissance learning, historical alchemy and modern esoteric movements. This Onda draws on the first two and treats alchemy as symbol and history. It offers habits of attention and does not ask you to practise ritual magic or handle chemicals.

Marked `unverified` (8):

- Quote: "That which is below is like that which is above, and that which is above is like that which is below, to do the miracles of one only thing." (The Emerald Tablet; Tabula Smaragdina, trans. after Isaac Newton’s manuscript version)
- Quote: "A great wonder, Asclepius, is the human being." (Asclepius; Hermetic dialogue, Latin text, 3rd to 4th century CE)
- Quote: "Unless you make yourself equal to God, you cannot understand God; like is understood by like." (Mind to Hermes; Corpus Hermeticum XI, trans. after Brian Copenhaver)
- Quote: "All things are poison and nothing is without poison; only the dose makes a thing not a poison." (Paracelsus; Septem Defensiones, third defence, 1538)
- Word: Spagyric (Greek): spelling, meaning or pronunciation
- Immerse, read: Hermetic Spirituality and the Historical Imagination (Wouter J. Hanegraaff, 2022)
- Immerse, listen: Atalanta Fugiens: fugues for three voices (Michael Maier, 1617)
- Figure: Jabir ibn Hayyan, c. 721 to c. 815

## Gnosticism

File: `content/ondas/gnostic.json` · version 1 · about 4800 words · 32 words of vocabulary, 30 journal prompts, 12 history entries, 10 concepts, 7 sources.

**Needs review by tradition bearers before launch.** Gnosticism is a modern umbrella term for diverse ancient movements, and the Mandaeans are a living gnostic community. This Onda offers questions, images and attention in a form open to anyone. It does not reproduce the rites of any group.

Caveats shown in the app:

- Scholars dispute the word Gnosticism. The texts are fragmentary, the groups differed, and our older picture was drawn by their opponents. Treat sweeping claims, including those in popular books, with care.
- The Mandaeans are a living people, and their baptismal and priestly rites belong to them. Learn from Mandaeans themselves.
- Gnostic ideas, read in a certain way, can be used to despise the body, other people or the world. This Onda asks you to use them to look inward with care, and to keep the world and the body in view.
- This content has not yet been reviewed by a scholar of early Christianity or a Mandaean community member. It should be before release.

Marked `unverified` (17):

- Quote: "Those who seek should not stop seeking until they find." (Gospel of Thomas; Saying 2, trans. after Marvin Meyer)
- Quote: "Who we were, what we have become; where we were, where we were placed; where we are hastening, from what we are redeemed; what birth is, and what rebirth." (Valentinian formula; Excerpts of Theodotus 78, preserved by Clement of Alexandria; trans. varies)
- Quote: "The Son of Man is within you. Follow after him." (Gospel of Mary; Berlin Codex, trans. after R. McL. Wilson and George MacRae)
- Word: Kenoma (Greek): spelling, meaning or pronunciation
- Word: Yaldabaoth (Aramaic or Hebrew, in Greek texts): spelling, meaning or pronunciation
- Word: Barbelo (Greek or Coptic): spelling, meaning or pronunciation
- Word: Docetism (English): spelling, meaning or pronunciation
- Word: Bridal chamber (English): spelling, meaning or pronunciation
- Figure: Valentinus, c. 100 to c. 160
- Figure: Basilides, fl. 117–138
- Figure: Irenaeus of Lyons, c. 130 to c. 202
- Figure: Clement of Alexandria, c. 150 to c. 215
- Figure: Plotinus, 204 or 205–270
- Figure: Mary Magdalene, 1st century
- History: 1st to 2nd centuries CE: Roots
- History: c. 100 to c. 160: Valentinus
- History: 2nd to 3rd centuries: Texts of Thomas, Philip and John
