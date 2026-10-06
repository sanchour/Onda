import { describe, expect, it } from 'vitest'
import { buildIcs, buildRemindersFeed, clockIn, fold, lagoDueOn, todayIn, type FeedData } from '@shared/feeds'
import { canBeginOnda, canCreateOnda, canStartLago, canUseIntegrations, plusState } from '@/data/entitlement'
import { mergeRecord, stamp } from '@/data/merge'
import { detId, slug } from '@/lib/ids'
import { TODAY, checkIn, lago, practice, run } from './helpers'

describe('per-field last-write-wins merge', () => {
  type R = { id: string; updatedAt: number; deviceId: string; _f?: Record<string, number>; name: string; why: string; deletedAt?: number | null }
  const v0: R = { id: 'a', updatedAt: 10, deviceId: 'A', _f: { name: 10, why: 10 }, name: 'Walk', why: 'health' }

  it('stamps only the fields that changed', () => {
    const next = stamp(v0, { ...v0, name: 'Walk more' }, 20, 'A')
    expect(next._f).toEqual({ name: 20, why: 10 })
    expect(next.updatedAt).toBe(20)
  })
  it('keeps both edits when two devices change different fields', () => {
    const a = stamp(v0, { ...v0, name: 'Walk more' }, 20, 'A')
    const b = stamp(v0, { ...v0, why: 'sleep' }, 30, 'B')
    const m = mergeRecord(a, b)
    expect(m).toMatchObject({ name: 'Walk more', why: 'sleep', updatedAt: 30 })
    expect(m._f).toEqual({ name: 20, why: 30 })
  })
  it('the later write wins on the same field, in either merge order', () => {
    const a = stamp(v0, { ...v0, name: 'A name' }, 20, 'A')
    const b = stamp(v0, { ...v0, name: 'B name' }, 30, 'B')
    expect(mergeRecord(a, b).name).toBe('B name')
    expect(mergeRecord(b, a).name).toBe('B name')
  })
  it('ties break on deviceId so every replica converges', () => {
    const a = stamp(v0, { ...v0, name: 'A name' }, 20, 'A')
    const b = stamp(v0, { ...v0, name: 'B name' }, 20, 'B')
    expect(mergeRecord(a, b).name).toBe(mergeRecord(b, a).name)
  })
  it('is idempotent', () => {
    const a = stamp(v0, { ...v0, name: 'x' }, 20, 'A')
    const b = stamp(v0, { ...v0, why: 'y' }, 30, 'B')
    const once = mergeRecord(a, b)
    expect(mergeRecord(once, b)).toEqual(once)
    expect(mergeRecord(once, a)).toEqual(once)
  })
  it('a delete and a later edit both survive as fields', () => {
    const del = stamp(v0, { ...v0, deletedAt: 25 }, 25, 'A')
    const edit = stamp(v0, { ...v0, name: 'renamed' }, 30, 'B')
    const m = mergeRecord(del, edit)
    expect(m.deletedAt).toBe(25)
    expect(m.name).toBe('renamed')
  })
  it('adopts a record it has never seen', () => {
    expect(mergeRecord(undefined, v0)).toBe(v0)
  })
})

describe('ids', () => {
  it('detId is stable, well-formed and sensitive to every part', () => {
    const a = detId('checkin', 'lago-1', '2026-10-06')
    expect(a).toBe(detId('checkin', 'lago-1', '2026-10-06'))
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(a).not.toBe(detId('checkin', 'lago-1', '2026-10-07'))
    expect(detId('a', 'bc')).not.toBe(detId('ab', 'c'))
  })
  it('slug strips accents and punctuation', () => {
    expect(slug('Bhagavad Gītā, ch. 2')).toBe('bhagavad-gita-ch-2')
  })
})

describe('entitlement', () => {
  const at = (iso: string) => new Date(iso).getTime()
  it('trial lasts seven days from the start', () => {
    const u = { plus: 'trial' as const, trialStartedAt: '2026-10-01T10:00:00.000Z' }
    expect(plusState(u, at('2026-10-01T10:00:01.000Z'))).toEqual({ tier: 'trial', daysLeft: 7 })
    expect(plusState(u, at('2026-10-07T12:00:00.000Z'))).toEqual({ tier: 'trial', daysLeft: 1 })
    expect(plusState(u, at('2026-10-08T10:00:01.000Z'))).toEqual({ tier: 'expired' })
  })
  it('lifetime ignores the trial clock', () => {
    expect(plusState({ plus: 'lifetime', trialStartedAt: '2020-01-01T00:00:00.000Z' }, Date.now())).toEqual({ tier: 'lifetime' })
  })
  it('free tier: three Lagos, Stoicism only, no custom Ondas or integrations', () => {
    const free = plusState({ plus: 'none', trialStartedAt: null }, Date.now())
    expect(canStartLago(free, 2)).toBe(true)
    expect(canStartLago(free, 3)).toBe(false)
    expect(canBeginOnda(free, 'stoic')).toBe(true)
    expect(canBeginOnda(free, 'zen')).toBe(false)
    expect(canCreateOnda(free)).toBe(false)
    expect(canUseIntegrations(free)).toBe(false)
  })
  it('trial and lifetime unlock everything', () => {
    for (const s of [{ tier: 'lifetime' } as const, { tier: 'trial', daysLeft: 3 } as const]) {
      expect(canStartLago(s, 99)).toBe(true)
      expect(canBeginOnda(s, 'sufi')).toBe(true)
      expect(canCreateOnda(s)).toBe(true)
      expect(canUseIntegrations(s)).toBe(true)
    }
  })
})

describe('calendar feed (ICS)', () => {
  const l = lago({ day: 3, name: 'Walk, 10;000 steps' })
  const wk = lago({ id: 'l2', name: 'Weekday reading', frequency: 'weekdays', startedAt: '2026-10-03' }) // starts on a Saturday
  const r = run({ day: 4 })
  const data: FeedData = { lagos: [l, wk], runs: [r], checkIns: [checkIn(l.id, TODAY)], practiceLogs: [practice(r.id, 'p1', TODAY)], ruleLogs: [], taskLogs: [] }
  const ics = buildIcs(data, { now: new Date('2026-10-06T07:00:00Z') })
  const unfolded = ics.replace(/\r\n /g, '')

  it('is a valid calendar envelope with CRLF line endings', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true)
    expect(unfolded.match(/BEGIN:VEVENT/g)!.length).toBe(unfolded.match(/END:VEVENT/g)!.length)
  })
  it('schedules each practice daily at its time until the run ends', () => {
    expect(unfolded).toContain('SUMMARY:Morning premeditation')
    expect(unfolded).toContain('DTSTART:20261003T063000')
    expect(unfolded).toContain('RRULE:FREQ=DAILY;UNTIL=20261016T235959')
  })
  it('adds the reflection day and a daily immersion note', () => {
    expect(unfolded).toContain('SUMMARY:Final reflection · Stoicism')
    expect(unfolded).toContain('SUMMARY:Stoicism · Day 14 of 14')
    expect(unfolded).toContain('DTSTART;VALUE=DATE:20261016')
  })
  it('escapes text and gives Lago reminders the right recurrence', () => {
    expect(unfolded).toContain('SUMMARY:Walk\\, 10\\;000 steps')
    expect(unfolded).toMatch(/UID:lago-l2@onda[\s\S]*?DTSTART:20261005T080000[\s\S]*?RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR/)
  })
  it('leaves out Lagos without a reminder, deleted ones and long-finished ones', () => {
    const off = buildIcs({ ...data, lagos: [{ ...l, reminder: { on: false, time: '08:00' } }, { ...wk, deletedAt: 1 }, lago({ id: 'old', day: 90, lengthDays: 30 })], runs: [] })
    expect(off).not.toContain('BEGIN:VEVENT')
  })
  it('folds long lines with a leading space on the continuation', () => {
    const f = fold('DESCRIPTION:' + 'x'.repeat(200))
    expect(f.split('\r\n').length).toBeGreaterThan(2)
    expect(f.split('\r\n').slice(1).every((s) => s.startsWith(' '))).toBe(true)
    expect(f.replace(/\r\n /g, '')).toBe('DESCRIPTION:' + 'x'.repeat(200))
  })
})

describe('reminders feed', () => {
  const l = lago({ day: 3 })
  const r = run({ day: 4 })
  const data: FeedData = { lagos: [l, lago({ id: 'done', name: 'Yoga', day: 2 })], runs: [r], checkIns: [checkIn('done', TODAY)], practiceLogs: [practice(r.id, 'p1', TODAY)], ruleLogs: [], taskLogs: [] }
  const feed = buildRemindersFeed(data, TODAY)

  it('lists Lagos, practices, tasks and rules for today with done flags', () => {
    expect(feed).toMatchObject({ version: 1, date: TODAY, list: 'Onda' })
    expect(feed.items.map((i) => i.id)).toEqual(['lago:l1', 'lago:done', 'practice:p1', 'practice:p2', 'task:t1', 'rule:r1'])
    expect(feed.items.find((i) => i.id === 'lago:done')!.done).toBe(true)
    expect(feed.items.find((i) => i.id === 'lago:l1')!.done).toBe(false)
    expect(feed.items.find((i) => i.id === 'practice:p1')).toMatchObject({ done: true, due: '06:30' })
  })
  it('skips Lagos that are not scheduled today', () => {
    const weekly = lago({ id: 'w', frequency: 'weekly', startedAt: '2026-09-30' }) // Wednesdays
    expect(lagoDueOn(weekly, TODAY)).toBe(false)
    expect(buildRemindersFeed({ ...data, lagos: [weekly], runs: [] }, TODAY).items).toEqual([])
  })
  it('reads the date and clock in the user time zone', () => {
    const t = new Date('2026-10-06T22:30:00Z')
    expect(todayIn('Europe/Amsterdam', t)).toBe('2026-10-07')
    expect(todayIn('America/Los_Angeles', t)).toBe('2026-10-06')
    expect(clockIn('Europe/Amsterdam', t)).toBe('00:30')
    expect(todayIn('Not/AZone', t)).toBe('2026-10-06')
  })
})
