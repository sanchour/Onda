const fs = require('fs')
const os = require('os')
const dir = process.argv[2]
const read = (id) => fs.readFileSync(`${dir}/${id}.mjs`, 'utf8')
const write = (id, t) => fs.writeFileSync(`${dir}/${id}.mjs`, t)
let removed = 0, changed = 0
const drop = (id, marker) => {
  const lines = read(id).split('\n')
  const i = lines.findIndex((l) => l.includes(marker))
  if (i < 0) return console.log('DROP MISSING', id, marker)
  lines.splice(i, 1); removed++
  write(id, lines.join('\n'))
}
const sub = (id, a, b) => {
  const t = read(id)
  if (!t.includes(a)) return console.log('SUB MISSING', id, a.slice(0, 60))
  write(id, t.replace(a, b)); changed++
}

// Stoicism
sub('stoic', "'Zeno’s one recorded indulgence.'", "'Diogenes Laertius says Zeno was fond of green figs.'")

// Zen: a misattributed Bashō line and a proverb with no traceable source
drop('zen', "Do not seek to follow in the footsteps of the wise")
drop('zen', "Before enlightenment, chop wood, carry water. After enlightenment")

// Taoism: year was wrong
sub('tao', "I('Taoism: An Essential Guide', 'Eva Wong', 1997,", "I('Taoism: An Essential Guide', 'Eva Wong', null,")

// Tibetan Buddhism: two Dalai Lama lines with no firm source; a vague timeline
drop('tibet', "If you want others to be happy, practice compassion")
drop('tibet', "My religion is very simple")
sub('tibet', "The slogans were kept private for a century before Geshe Chekawa wrote them down.", "The slogans were passed on privately for generations before Geshe Chekawa taught them openly.")
sub('tibet', "FACT('The lojong slogans were passed on privately for about a century before Geshe Chekawa taught them in public.')", "FACT('The lojong slogans were passed on privately before Geshe Chekawa taught them publicly in the twelfth century.')")

// Vedanta
drop('vedanta', "Abide as the Self")
drop('vedanta', "Shankaracharya with his disciples")
sub('vedanta', "I('In Our Time: The Bhagavad Gita', 'BBC Radio 4, Melvyn Bragg', 2011,", "I('In Our Time: The Bhagavad Gita', 'BBC Radio 4, Melvyn Bragg', null,")

// Jung
sub('jung', "I('Jung: A Very Short Introduction', 'Anthony Stevens', 2001,", "I('Jung: A Very Short Introduction', 'Anthony Stevens', 1994,")
sub('jung', "B('Jung: A Very Short Introduction', 'Anthony Stevens', 2001,", "B('Jung: A Very Short Introduction', 'Anthony Stevens', 1994,")
sub('jung', "I('The Way of the Dream', 'Fraser Boa with Marie-Louise von Franz', 1985,", "I('The Way of the Dream', 'Fraser Boa with Marie-Louise von Franz', null,")
sub('jung', "A planned album 'Synchronicity'", "A planned album 'Synchronicity'")
sub('jung', "'An album named after Jung’s idea. Sting holds a copy of the book on the cover.'", "'An album named after Jung’s idea. Sting has said he read Jung and Koestler while writing it.'", )
sub('jung', "H('1933', 'Eranos, and a compromised presidency', 'The Eranos conferences begin at Ascona. The same year Jung becomes president of a German-based psychotherapy society as the Nazis take power; his conduct and writings of this period remain controversial.')", "H('1933', 'Eranos, and a controversial presidency', 'The Eranos conferences begin at Ascona. The same year Jung becomes president of the International General Medical Society for Psychotherapy, whose German section is brought into line with the Nazi state. He said he took the post to protect Jewish members, but his statements and editing of its journal in these years remain controversial.')")
drop('jung', "slipped up")

// Animism
sub('animism', "FACT('Robin Wall Kimmerer notes that her language, Potawatomi, had nine fluent speakers left when she began learning it.')", "FACT('In Braiding Sweetgrass (2013) Robin Wall Kimmerer writes that nine first-language speakers of Potawatomi remained. Their language is now taught again by the Potawatomi nations.')")
sub('animism', "'A painting that answers centuries of stereotypes. National Gallery of Art, Washington.'", "'A painting that answers centuries of stereotypes.'")

// Ubuntu
sub('ubuntu', "F('Yvonne Mokgoro', '1950–2024'", "F('Yvonne Mokgoro', '1950–2024'")
sub('ubuntu', "'The earliest known written uses of \"ubuntu\" date from the mid-nineteenth century, in texts by missionaries and African writers, where it names a human quality.'", "'The earliest written use found so far, by the researcher Christian Gade, is in a missionary text of 1846, where it names a human quality. The proverb \"a person is a person through other persons\" became the standard explanation of the word only in the 1990s.'")
sub('ubuntu', "Of a generous, dependable person people say: yu, u nobuntu. She has ubuntu.", "Of a generous, dependable person, people say that she has ubuntu.")
sub('ubuntu', "F('Mogobe Ramose', 'born 1945', 'Philosopher. Author of African Philosophy through Ubuntu.', true)", "F('Mogobe Ramose', '', 'South African philosopher. Author of African Philosophy through Ubuntu.')")

// Sufism
drop('sufi', "The wound is the place where the Light enters you")
drop('sufi', "the Qur’an in Persian")
sub('sufi', "'As recorded by ʿAṭṭār, trans. A. J. Arberry'", "'Attributed to Rābiʿa in later Sufi tradition'")

// Transcendentalism
drop('transc', "Ewers Brothers Productions")
drop('transc', "In Our Time: Thoreau and the American Idyll")
drop('transc', "The Portable Emerson")

console.log(JSON.stringify({ removed, changed }))
