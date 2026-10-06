import type { CheckIn, Lago, OndaRun, PracticeLog } from '@/data/types'
import { addDays } from '@/lib/dates'
import { detId } from '@/lib/ids'

export const TODAY = '2026-10-06'
const base = (id: string) => ({ id, updatedAt: 1, deviceId: 'test' })

/** A Lago that is on `day` today. */
export function lago(p: Partial<Lago> & { day?: number } = {}): Lago {
  const { day = 1, ...rest } = p
  return { ...base(rest.id ?? 'l1'), name: 'Walk', icon: 'drop', why: '', lengthDays: 30, frequency: 'daily', startedAt: addDays(TODAY, -(day - 1)), endedAt: null, reminder: { on: true, time: '08:00' }, origin: 'user', ...rest }
}

export function checkIn(lagoId: string, date: string, status: CheckIn['status'] = 'done', at?: string): CheckIn {
  return { ...base(detId('checkin', lagoId, date)), lagoId, date, status, note: '', photoPath: null, at: at ?? `${date}T08:00:00.000Z` }
}

/** Done check ins for the n days before today (not today), minus the offsets in `skip`. */
export const history = (l: Lago, n: number, skip: number[] = []) =>
  Array.from({ length: n }, (_, i) => i + 1)
    .filter((i) => !skip.includes(i))
    .map((i) => checkIn(l.id, addDays(TODAY, -i)))

/** A run that is on `day` today. */
export function run(p: Partial<OndaRun> & { day?: number } = {}): OndaRun {
  const { day = 1, ...rest } = p
  return {
    ...base(rest.id ?? 'r1'),
    ondaId: 'stoic',
    lengthDays: 14,
    startedAt: addDays(TODAY, -(day - 1)),
    endedAt: null,
    intention: '',
    state: 'active',
    snapshot: {
      name: 'Stoicism',
      practices: [
        { id: 'p1', name: 'Morning premeditation', icon: 'sun-horizon', time: '06:30', minutes: 5 },
        { id: 'p2', name: 'Evening review', icon: 'moon', time: '21:30' },
      ],
      rules: [{ id: 'r1', text: 'Do not complain aloud' }],
      tasks: [{ id: 't1', name: 'Read one Letter', time: '13:00' }],
      immerse: [
        { id: 'read-a', kind: 'read', title: 'Meditations' },
        { id: 'eat-a', kind: 'eat', title: 'Lentil soup' },
        { id: 'word-a', kind: 'words', title: 'Amor fati' },
      ],
    },
    ...rest,
  }
}

export function practice(runId: string, practiceId: string, date: string, at?: string): PracticeLog {
  return { ...base(detId('practice', runId, practiceId, date)), runId, practiceId, date, done: true, at: at ?? `${date}T08:00:00.000Z` }
}
