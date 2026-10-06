import { describe, expect, it } from 'vitest'
import { checkInsByDate, dueOn, isLagoCompleted, lagoCalendar, lagoDay, lagoPhase, lagoStats, lagoStreak } from '@/data/derive/lago'
import { addDays } from '@/lib/dates'
import { TODAY, checkIn, history, lago } from './helpers'

describe('lagoDay and lagoPhase', () => {
  it('counts the start day as day 1 and clamps to the length', () => {
    expect(lagoDay(lago({ day: 1 }), TODAY)).toBe(1)
    expect(lagoDay(lago({ day: 12 }), TODAY)).toBe(12)
    expect(lagoDay(lago({ day: 45, lengthDays: 30 }), TODAY)).toBe(30)
  })
  it('is active through its last day, finished after, ended when stopped', () => {
    expect(lagoPhase(lago({ day: 30, lengthDays: 30 }), TODAY)).toBe('active')
    expect(lagoPhase(lago({ day: 31, lengthDays: 30 }), TODAY)).toBe('finished')
    expect(lagoPhase(lago({ day: 5, endedAt: TODAY }), TODAY)).toBe('ended')
  })
})

describe('dueOn', () => {
  it('daily is due every day inside the window only', () => {
    const l = lago({ day: 3, lengthDays: 5 })
    expect(dueOn(l, TODAY)).toBe(true)
    expect(dueOn(l, addDays(l.startedAt, -1))).toBe(false)
    expect(dueOn(l, addDays(l.startedAt, 5))).toBe(false)
  })
  it('weekdays skips Saturday and Sunday', () => {
    const l = lago({ frequency: 'weekdays', day: 10 })
    expect(dueOn(l, '2026-10-06')).toBe(true) // Tuesday
    expect(dueOn(l, '2026-10-03')).toBe(false) // Saturday
    expect(dueOn(l, '2026-10-04')).toBe(false) // Sunday
  })
  it('weekly is due on the weekday it started', () => {
    const l = lago({ frequency: 'weekly', startedAt: '2026-09-22' }) // a Tuesday
    expect(dueOn(l, '2026-10-06')).toBe(true)
    expect(dueOn(l, '2026-10-05')).toBe(false)
  })
  it('nothing is due after a Lago is ended', () => {
    const l = lago({ day: 10, endedAt: addDays(TODAY, -2) })
    expect(dueOn(l, addDays(TODAY, -2))).toBe(true)
    expect(dueOn(l, TODAY)).toBe(false)
  })
})

describe('streak', () => {
  it('counts consecutive done days and does not break on an unchecked today', () => {
    const l = lago({ day: 8 })
    expect(lagoStreak(l, checkInsByDate(history(l, 7), l.id), TODAY)).toBe(7)
  })
  it('includes today once checked in', () => {
    const l = lago({ day: 8 })
    expect(lagoStreak(l, checkInsByDate([...history(l, 7), checkIn(l.id, TODAY)], l.id), TODAY)).toBe(8)
  })
  it('stops at a missed or empty day', () => {
    const l = lago({ day: 8 })
    expect(lagoStreak(l, checkInsByDate(history(l, 7, [3]), l.id), TODAY)).toBe(2)
    const missed = [...history(l, 7, [3]), checkIn(l.id, addDays(TODAY, -3), 'missed')]
    expect(lagoStreak(l, checkInsByDate(missed, l.id), TODAY)).toBe(2)
  })
  it('a missed today resets the streak to zero', () => {
    const l = lago({ day: 4 })
    expect(lagoStreak(l, checkInsByDate([...history(l, 3), checkIn(l.id, TODAY, 'missed')], l.id), TODAY)).toBe(0)
  })
  it('weekday Lagos keep their streak across a weekend', () => {
    const l = lago({ frequency: 'weekdays', startedAt: '2026-09-28' }) // Monday
    const days = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-05']
    expect(lagoStreak(l, checkInsByDate(days.map((d) => checkIn(l.id, d)), l.id), TODAY)).toBe(6)
  })
})

describe('lagoStats', () => {
  it('scores done over scheduled days so far, leaving an open today out', () => {
    const l = lago({ day: 11 })
    const s = lagoStats(l, history(l, 10, [3, 7]), TODAY)
    expect(s.checkIns).toBe(8)
    expect(s.score).toBeCloseTo(0.8)
    expect(s.doneToday).toBe(false)
    expect(s.pct).toBeCloseTo(11 / 30)
  })
  it('the newest write wins when two devices checked the same day', () => {
    const l = lago({ day: 2 })
    const a = { ...checkIn(l.id, TODAY, 'missed'), updatedAt: 5 }
    const b = { ...checkIn(l.id, TODAY, 'done'), id: 'other', updatedAt: 9 }
    expect(lagoStats(l, [a, b], TODAY).doneToday).toBe(true)
  })
  it('ignores deleted check ins and other Lagos', () => {
    const l = lago({ day: 3 })
    const s = lagoStats(l, [{ ...checkIn(l.id, TODAY), deletedAt: 1 }, checkIn('someone-else', TODAY)], TODAY)
    expect(s.checkIns).toBe(0)
  })
})

describe('calendar', () => {
  it('pads to the first weekday and marks states', () => {
    const l = lago({ day: 6 })
    const cells = lagoCalendar(l, [checkIn(l.id, '2026-10-05'), checkIn(l.id, '2026-10-04', 'missed')], 2026, 9, TODAY)
    expect(cells.slice(0, 4)).toEqual([null, null, null, null]) // 1 Oct 2026 is a Thursday
    const by = Object.fromEntries(cells.filter(Boolean).map((c) => [c!.day, c!]))
    expect(by[5]!.state).toBe('done')
    expect(by[4]!.state).toBe('missed')
    expect(by[6]!.today).toBe(true)
    expect(by[7]!.state).toBe('future')
    expect(cells.filter(Boolean)).toHaveLength(31)
  })
})

describe('Habit Builder rule', () => {
  it('needs 30+ days, the full length and a score of 80%', () => {
    const l = lago({ day: 31, lengthDays: 30 })
    expect(isLagoCompleted(l, history(l, 30, [2, 9, 15]), TODAY)).toBe(true)
    expect(isLagoCompleted(l, history(l, 30, [1, 2, 3, 4, 5, 6, 7, 8]), TODAY)).toBe(false)
    expect(isLagoCompleted(lago({ day: 15, lengthDays: 14 }), [], TODAY)).toBe(false)
    expect(isLagoCompleted(lago({ day: 20, lengthDays: 30 }), [], TODAY)).toBe(false)
  })
})
