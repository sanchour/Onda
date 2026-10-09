import type { MediaItem } from './index'

/* Where to find a book, a film, a song, a painting, a dish or a place.
   None of the 64 content files stores an address for these: addresses go stale, and a wrong one is worse than none.
   Every link here is a search on a service that has the thing, built from the item's own title and maker,
   so it cannot point at the wrong page and it never breaks. On a phone, a Spotify, YouTube or Maps link opens
   the app when it is installed. */

export interface FindLink {
  /** Shown on the button and never translated: these are names of services. */
  label: string
  icon: string
  url: string
}

/** The part of a creator line that is a name: "Marcus Aurelius, trans. Gregory Hays" gives "Marcus Aurelius".
 *  Lines that describe instead of naming ("Greek and Roman staple", "Board game · Roman") give nothing. */
export function makerName(creator: string | undefined): string {
  const first = (creator ?? '').split(/[,;(·]| trans\.| dir\.| ed\./)[0]!.trim()
  if (!first || first.length > 40 || /\d/.test(first)) return ''
  const words = first.split(/\s+/)
  if (words.length > 5) return ''
  // a name has capitals; a description is mostly lower case
  const caps = words.filter((w) => /^[\p{Lu}]/u.test(w)).length
  return caps >= Math.ceil(words.length / 2) && caps > 0 && !/^(For|Each|Every|A|An|The|In|On|At|From|Traditional|Board|Card|Greek|Roman|Daily|Any)\b/.test(first) ? first : ''
}

const plain = (title: string) => title.replace(/\s*\([^)]*\)/g, '').replace(/[“”"]/g, '').trim()
const q = (...parts: string[]) => encodeURIComponent(parts.filter(Boolean).join(' '))

export function linksFor(item: MediaItem): FindLink[] {
  const title = plain(item.title)
  const who = makerName(item.creator)
  const out: FindLink[] = []
  const add = (label: string, icon: string, url: string) => out.push({ label, icon, url })
  const wiki = () => add('Wikipedia', 'globe-hemisphere-west', `https://en.wikipedia.org/w/index.php?search=${q(title)}`)
  switch (item.kind) {
    case 'listen':
      add('Spotify', 'music-notes', `https://open.spotify.com/search/${q(title, who)}`)
      add('Apple Music', 'music-notes', `https://music.apple.com/search?term=${q(title, who)}`)
      add('YouTube', 'play', `https://www.youtube.com/results?search_query=${q(title, who)}`)
      break
    case 'watch':
      add('YouTube', 'play', `https://www.youtube.com/results?search_query=${q(title, who)}`)
      add('JustWatch', 'film-strip', `https://www.justwatch.com/us/search?q=${q(title)}`)
      wiki()
      break
    case 'read':
      add('Open Library', 'book-open', `https://openlibrary.org/search?q=${q(title, who)}`)
      add('Google Books', 'magnifying-glass', `https://www.google.com/search?tbm=bks&q=${q(title, who)}`)
      wiki()
      break
    case 'art':
      add('Wikimedia Commons', 'paint-brush', `https://commons.wikimedia.org/w/index.php?search=${q(title, who)}&ns6=1&ns14=1&ns0=1`)
      add('Google Arts', 'magnifying-glass', `https://artsandculture.google.com/search?q=${q(title, who)}`)
      wiki()
      break
    case 'eat':
    case 'drink':
      add('Recipes', 'bowl-food', `https://duckduckgo.com/?q=${q(title, 'recipe')}`)
      add('YouTube', 'play', `https://www.youtube.com/results?search_query=${q(title, 'recipe')}`)
      break
    case 'games':
      add('How to play', 'play', `https://www.youtube.com/results?search_query=${q('how to play', title)}`)
      wiki()
      break
    case 'customs':
      wiki()
      break
    case 'travel':
      // a place has somewhere to be; a festival has a date
      if (item.id.startsWith('place-')) add('Maps', 'map-pin', `https://www.google.com/maps/search/?api=1&query=${q(title, (item.creator ?? '').split('·')[0]!.trim())}`)
      wiki()
      break
    case 'words':
      add('Hear it', 'speaker-high', `https://forvo.com/search/${q(title)}/`)
      break
  }
  return out
}
