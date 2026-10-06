/* Lago gallery catalog (from the prototype). Participant counts are illustrative seed numbers for the
   community ranking until a real aggregate exists; see DECISIONS.md. */

export interface GalleryLago {
  name: string
  icon: string
  length: number
  cat: string
  desc: string
  count?: number
}

const top = (name: string, icon: string, length: number, count: number, cat: string, desc: string): GalleryLago => ({ name, icon, length, count, cat, desc })

export const TOP_LAGOS: GalleryLago[] = [
  top('Walk 10,000 steps', 'person-simple-walk', 30, 3490, 'Health', 'Improve cardiovascular health and overall fitness.'),
  top('No phone before bed', 'bed', 30, 2312, 'Sleep', 'Sleep deeper and wake up clearer.'),
  top('Meditate 5 mins', 'flower-lotus', 7, 2175, 'Mind', 'Five quiet minutes to start each day.'),
  top('Wake up early', 'alarm', 21, 2107, 'Routine', 'Win the morning before the world wakes up.'),
  top('Take cold showers', 'shower', 30, 1428, 'Health', 'Build resilience and start the day alert.'),
  top('75 Hard Challenge', 'spade', 75, 1301, 'Challenge', 'A seventy-five day test of discipline.'),
  top('Track all spending', 'chart-bar', 7, 1281, 'Money', 'See where every coin goes for a week.'),
  top('The Great Lock In', 'lock', 121, 1188, 'Challenge', 'Four months of focused, deliberate effort.'),
  top('Delete social media', 'device-mobile', 7, 1086, 'Focus', 'Take back attention and time.'),
  top('Get morning sun', 'sun', 30, 659, 'Health', 'Ten minutes of daylight within an hour of waking.'),
  top('Take a photo', 'camera', 30, 606, 'Creativity', 'One photo a day, noticed on purpose.'),
  top('Build an app', 'hammer', 7, 407, 'Creativity', 'Ship something small in a single week.'),
]

export const FEATURED: GalleryLago[] = [
  { name: 'Walk 10,000 steps', icon: 'person-simple-walk', desc: 'Improve cardiovascular health and overall fitness.', length: 30, cat: 'Featured', count: 3490 },
  { name: 'Meditate daily', icon: 'flower-lotus', desc: 'Ten quiet minutes every morning.', length: 7, cat: 'Featured' },
]

const C = (rows: [string, string, number][], cat: string): GalleryLago[] =>
  rows.map(([name, icon, length]) => {
    const known = TOP_LAGOS.find((t) => t.name === name)
    return { name, icon, length, cat, desc: known?.desc ?? '', count: known?.count }
  })

export const CATEGORIES: Record<string, GalleryLago[]> = {
  Challenge: C([['75 Hard Challenge', 'spade', 75], ['The Great Lock In', 'lock', 121], ['75 Soft Challenge', 'heart', 75], ['Project 50 Challenge', 'person-simple-run', 50], ['12 Week Year', 'calendar-dots', 84], ['30 Day Reset', 'arrow-counter-clockwise', 30], ['No Excuses Month', 'flag', 30], ['100 Day Streak', 'fire', 100]], 'Challenge'),
  Creativity: C([['Build an app', 'hammer', 7], ['Take a photo', 'camera', 30], ['Draw every day', 'paint-brush', 30], ['Write 500 words', 'pen-nib', 30], ['Learn an instrument', 'guitar', 60], ['Write a poem a week', 'book-open', 28], ['Sketch one object', 'pencil-simple', 14], ['Cook something new', 'cooking-pot', 21]], 'Creativity'),
  Mind: C([['Meditate 5 mins', 'flower-lotus', 7], ['Read 20 pages', 'book-open', 21], ['Journal nightly', 'notebook', 30], ['Gratitude list', 'heart', 21], ['Follow 20-20-20', 'eye', 30], ['Digital declutter', 'laptop', 30], ['Use a dumb phone', 'device-mobile', 30], ['No-scroll Sundays', 'lock', 28]], 'Mind'),
  Health: C([['Walk 10,000 steps', 'person-simple-walk', 30], ['Take cold showers', 'shower', 30], ['Get morning sun', 'sun', 30], ['Quit sugar', 'cookie', 30], ['Quit caffeine', 'coffee', 21], ['Eat last meal early', 'fork-knife', 7], ['Wake up early', 'alarm', 21], ['Stretch daily', 'person-simple-tai-chi', 14]], 'Health'),
}
export const CATEGORY_NAMES = Object.keys(CATEGORIES)
export const TOP_CATEGORIES = [...new Set(TOP_LAGOS.map((t) => t.cat))]

export const LAGO_ICONS = ['drop', 'person-simple-walk', 'bed', 'shower', 'flower-lotus', 'book-open', 'device-mobile', 'barbell', 'pen-nib', 'leaf', 'coffee', 'moon']

/** Free tier limits (see DECISIONS.md, "Ondas+ gating"). */
export const FREE_LAGO_LIMIT = 3
export const FREE_ONDA_ID = 'stoic'
export const TRIAL_DAYS = 7
