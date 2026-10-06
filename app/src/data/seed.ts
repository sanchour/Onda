import { loadOnda } from '@/content'
import { addDays, fromDateStr, todayStr } from '@/lib/dates'
import { detId, uuid } from '@/lib/ids'
import { db, getMeta } from './db'
import { snapshotOf, useStore } from './store'
import { SettingsSchema, type BaseRecord, type CheckIn, type JournalEntry, type Lago, type OndaRun, type PracticeLog, type Reflection, type Tables } from './types'

/* Demo data matching the prototype: Stoicism on day 4 of 14, five Lagos (two checked in today),
   two completed Ondas behind it and a few weeks of history.
   Run it with ?seed=demo in the URL, or Settings > Data > Load Demo Data in a dev build. */

const JOURNAL_SEED = [
  'Hard to start, easier once I did. Worth repeating tomorrow.',
  'Noticed more today than I expected. Wrote it down before it faded.',
  'Skipped one practice and felt the difference by evening.',
]

let running: Promise<void> | null = null
/** Single-flight: a second call while one is running joins it. */
export function loadDemoSeed(): Promise<void> {
  running ??= seed().finally(() => {
    running = null
  })
  return running
}

async function seed(): Promise<void> {
  const today = todayStr()
  const deviceId = (await getMeta<string>('deviceId')) ?? uuid()
  const ts = Date.now()
  const base = (id: string): BaseRecord => ({ id, updatedAt: ts, deviceId })
  const at = (date: string, h: number, m: number) => {
    const d = fromDateStr(date)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }

  const lagos: Lago[] = []
  const checkIns: CheckIn[] = []
  const lago = (name: string, icon: string, day: number, doneToday: boolean, why: string, hour: number, origin = 'gallery') => {
    const l: Lago = { ...base(uuid()), name, icon, why, lengthDays: 30, frequency: 'daily', startedAt: addDays(today, -(day - 1)), endedAt: null, reminder: { on: true, time: '08:00' }, origin }
    lagos.push(l)
    for (let i = 1; i < day; i++) {
      const date = addDays(today, -i)
      // one honest miss three days ago on the longer experiments
      const missed = day > 6 && i === 3
      checkIns.push({ ...base(detId('checkin', l.id, date)), lagoId: l.id, date, status: missed ? 'missed' : 'done', note: '', photoPath: null, at: at(date, hour, 5 + (i % 40)) })
    }
    if (doneToday) checkIns.push({ ...base(detId('checkin', l.id, today)), lagoId: l.id, date: today, status: 'done', note: '', photoPath: null, at: at(today, hour, 41) })
    return l
  }
  lago('Walk 10,000 steps', 'person-simple-walk', 12, false, 'Improve cardiovascular health and overall fitness.', 18)
  lago('No phone before bed', 'bed', 5, false, 'Sleep deeper and wake up clearer.', 22)
  lago('Delete social media', 'device-mobile', 2, false, 'Take back attention and time.', 9)
  lago('Take cold showers', 'shower', 20, true, 'Build resilience and start the day alert.', 7)
  lago('Morning yoga', 'flower-lotus', 7, true, 'Increase my physical flexibility and reduce daily stress levels.', 6, 'user')

  const runs: OndaRun[] = []
  const practiceLogs: PracticeLog[] = []
  const journal: JournalEntry[] = []
  const reflections: Reflection[] = []
  const ruleLogs: Tables['ruleLogs'][] = []
  const taskLogs: Tables['taskLogs'][] = []
  const immerseLogs: Tables['immerseLogs'][] = []

  const pastRun = async (ondaId: string, length: number, endedDaysAgo: number, keep: number) => {
    const c = await loadOnda(ondaId)
    const startedAt = addDays(today, -(endedDaysAgo + length - 1))
    const run: OndaRun = { ...base(uuid()), ondaId, lengthDays: length, startedAt, endedAt: addDays(today, -endedDaysAgo), intention: '', state: 'complete', snapshot: snapshotOf(c) }
    runs.push(run)
    for (let d = 0; d < length; d++) {
      const date = addDays(startedAt, d)
      c.practices.forEach((p, i) => {
        if ((d + i) % 5 === 4) return // roughly four days in five
        practiceLogs.push({ ...base(detId('practice', run.id, p.id, date)), runId: run.id, practiceId: p.id, date, done: true, at: at(date, 7 + i * 4, 10) })
      })
      if (d % 2 === 0) journal.push({ ...base(detId('journal', run.id, d + 1)), runId: run.id, day: d + 1, prompt: c.journal[d % c.journal.length] ?? '', text: JOURNAL_SEED[d % 3]!, at: at(date, 21, 50) })
    }
    const kept = c.practices.slice(0, keep)
    reflections.push({ ...base(detId('reflection', run.id)), runId: run.id, answers: c.reflect.map((prompt) => ({ prompt, text: '' })), kept: kept.map((p) => p.id), at: at(run.endedAt!, 20, 0) })
  }
  await pastRun('zen', 14, 15, 3)
  await pastRun('tao', 7, 34, 1)

  // The running Onda: Stoicism, day 4 of 14
  const stoic = await loadOnda('stoic')
  const run: OndaRun = { ...base(uuid()), ondaId: 'stoic', lengthDays: 14, startedAt: addDays(today, -3), endedAt: null, intention: '', state: 'active', snapshot: snapshotOf(stoic) }
  runs.push(run)
  for (let d = 0; d < 3; d++) {
    const date = addDays(run.startedAt, d)
    stoic.practices.forEach((p, i) => {
      if (d === 1 && i === 2) return
      practiceLogs.push({ ...base(detId('practice', run.id, p.id, date)), runId: run.id, practiceId: p.id, date, done: true, at: at(date, [6, 7, 12, 21][i] ?? 12, 30) })
    })
    journal.push({ ...base(detId('journal', run.id, d + 1)), runId: run.id, day: d + 1, prompt: stoic.journal[d % stoic.journal.length] ?? '', text: JOURNAL_SEED[(d + 1) % 3]!, at: at(date, 22, 2) })
  }
  // Today: two practices and the second task done, as in the prototype
  stoic.practices.slice(0, 2).forEach((p, i) => practiceLogs.push({ ...base(detId('practice', run.id, p.id, today)), runId: run.id, practiceId: p.id, date: today, done: true, at: at(today, 6 + i, 30) }))
  const task = stoic.tasks[1]
  if (task) taskLogs.push({ ...base(detId('taskLogs', run.id, task.id, today)), runId: run.id, itemId: task.id, date: today, done: true })
  for (const it of [stoic.immerse.read[0], stoic.immerse.listen[0]]) {
    if (it) immerseLogs.push({ ...base(detId('immerse', run.id, it.id)), runId: run.id, itemId: it.id, doneAt: at(addDays(today, -1), 20, 0) })
  }

  const prev = useStore.getState().user
  const user: Tables['user'] = {
    ...base('me'),
    name: 'Sander',
    createdAt: at(addDays(today, -45), 9, 0),
    plus: prev?.plus ?? 'none',
    trialStartedAt: prev?.trialStartedAt ?? null,
    settings: SettingsSchema.parse({ ...prev?.settings, onboarded: true }),
  }

  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) if (t.name !== 'meta' && t.name !== 'photos') await t.clear()
    await db.user.put(user)
    await db.lagos.bulkPut(lagos)
    await db.checkIns.bulkPut(checkIns)
    await db.runs.bulkPut(runs)
    await db.practiceLogs.bulkPut(practiceLogs)
    await db.ruleLogs.bulkPut(ruleLogs)
    await db.taskLogs.bulkPut(taskLogs)
    await db.immerseLogs.bulkPut(immerseLogs)
    await db.journal.bulkPut(journal)
    await db.reflections.bulkPut(reflections)
  })
  const { backendConfigured } = await import('@/sync/supabase')
  if (backendConfigured) await (await import('@/sync/engine')).enqueueAll()
  await useStore.getState().init()
  // Achievements follow from the data: let the normal evaluation unlock them (without a burst of toasts).
  useStore.getState().checkIn(lagos[4]!.id, { status: 'done', at: at(today, 6, 41) })
  useStore.setState({ unlockQueue: [] })
}
