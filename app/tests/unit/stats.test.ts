import { describe, expect, it } from 'vitest'
import { achievementProgress, earnedAchievements } from '@/data/derive/achievements'
import { pickForDay, reflectionDue, runDay, runSummary } from '@/data/derive/onda'
import { activityBars, activityByDate, bestStreak, consistency, currentStreak, dayEvents, summarize } from '@/data/derive/stats'
import { addDays } from '@/lib/dates'
import { TODAY, checkIn, history, lago, practice, run } from './helpers'

const empty = { lagos: [], checkIns: [], runs: [], practiceLogs: [], journal: [], reflections: [], immerseLogs: [] }

describe('activity', () => {
  const l = lago({ day: 8 })
  const r = run({ day: 4 })
  const input = { ...empty, lagos: [l], checkIns: [...history(l, 7, [5]), checkIn(l.id, TODAY)], runs: [r], practiceLogs: [practice(r.id, 'p1', TODAY), practice(r.id, 'p2', addDays(TODAY, -1))] }
  const act = activityByDate(input, TODAY)

  it('adds Lago check ins and Onda practices per day', () => {
    expect(act.get(TODAY)).toEqual({ done: 2, due: 3 })
    expect(act.get(addDays(TODAY, -1))).toEqual({ done: 2, due: 3 })
    expect(act.get(addDays(TODAY, -5))).toEqual({ done: 0, due: 1 })
  })
  it('streaks: current stops at the gap, best is the longest run', () => {
    expect(currentStreak(act, TODAY)).toBe(5)
    expect(bestStreak(act)).toBe(5)
  })
  it('summaries count check ins in range', () => {
    const week = summarize('week', act, TODAY)
    expect(week.checkIns).toBe(8)
    expect(week.streak).toBe(5)
    expect(week.completion).toBeGreaterThan(0.5)
    expect(summarize('all', act, TODAY).streak).toBe(5)
  })
  it('bars: seven days, four weeks, six months, last one current', () => {
    const w = activityBars('week', act, TODAY)
    expect(w).toHaveLength(7)
    expect(w[6]).toMatchObject({ value: 2, current: true, label: 'T' })
    expect(activityBars('month', act, TODAY)).toHaveLength(4)
    const all = activityBars('all', act, TODAY)
    expect(all).toHaveLength(6)
    expect(all[5]!.label).toBe('Oct')
  })
  it('lists the events of one day', () => {
    const ev = dayEvents(TODAY, input)
    expect(ev.map((e) => e.key).sort()).toEqual(['checkedIn', 'practice'])
    expect(dayEvents(r.startedAt, input).some((e) => e.key === 'ondaStarted')).toBe(true)
  })
})

describe('onda', () => {
  it('runDay clamps and the reflection opens on the last day', () => {
    expect(runDay(run({ day: 4 }), TODAY)).toBe(4)
    expect(runDay(run({ day: 20, lengthDays: 14 }), TODAY)).toBe(14)
    expect(reflectionDue(run({ day: 13, lengthDays: 14 }), TODAY)).toBe(false)
    expect(reflectionDue(run({ day: 14, lengthDays: 14 }), TODAY)).toBe(true)
  })
  it('pickForDay wraps', () => {
    expect(pickForDay(['a', 'b', 'c'], 1)).toBe('a')
    expect(pickForDay(['a', 'b', 'c'], 4)).toBe('a')
    expect(pickForDay([], 3)).toBeUndefined()
  })
  it('summarises a run', () => {
    const r = run({ day: 4 })
    const s = runSummary(r, ['p1', 'p2'], [practice(r.id, 'p1', TODAY), practice(r.id, 'p1', addDays(TODAY, -1)), practice(r.id, 'p2', TODAY)], [], TODAY)
    expect(s.practiceCheckIns).toBe(3)
    expect(s.practiceRate).toBeCloseTo(3 / 8)
    expect(s.perPractice).toEqual({ p1: 2, p2: 1 })
  })
})

describe('achievements', () => {
  it('nothing is earned on an empty account', () => {
    expect(earnedAchievements(empty, TODAY)).toEqual([])
  })
  it('First Step, Seven Days and First Onda', () => {
    const l = lago({ day: 8 })
    const got = earnedAchievements({ ...empty, lagos: [l], checkIns: [...history(l, 7), checkIn(l.id, TODAY)], runs: [run()] }, TODAY)
    expect(got).toEqual(expect.arrayContaining(['firstStep', 'sevenDays', 'firstOnda']))
    expect(got).not.toContain('ondaComplete')
  })
  it('Early Bird needs five check ins before 7AM local time', () => {
    const l = lago({ day: 8 })
    const early = (i: number) => checkIn(l.id, addDays(TODAY, -i), 'done', new Date(2026, 9, 6 - i, 6, 30).toISOString())
    expect(achievementProgress({ ...empty, lagos: [l], checkIns: [1, 2, 3, 4].map(early) }, TODAY).earlyBird).toEqual([4, 5])
    expect(earnedAchievements({ ...empty, lagos: [l], checkIns: [1, 2, 3, 4, 5].map(early) }, TODAY)).toContain('earlyBird')
  })
  it('Wanderer counts distinct completed Ondas', () => {
    const done = (id: string, ondaId: string) => run({ id, ondaId, state: 'complete', day: 20, endedAt: addDays(TODAY, -5) })
    expect(achievementProgress({ ...empty, runs: [done('a', 'zen'), done('b', 'zen'), done('c', 'tao')] }, TODAY).wanderer).toEqual([2, 3])
    expect(earnedAchievements({ ...empty, runs: [done('a', 'zen'), done('b', 'stoic'), done('c', 'tao')] }, TODAY)).toEqual(expect.arrayContaining(['wanderer', 'ondaComplete']))
  })
  it('Linguist and Table Guest read immersion logs by kind', () => {
    const r = run()
    const log = (itemId: string) => ({ id: itemId, updatedAt: 1, deviceId: 't', runId: r.id, itemId, doneAt: '2026-10-06T10:00:00.000Z' })
    const p = achievementProgress({ ...empty, runs: [r], immerseLogs: [log('word-a'), log('eat-a'), log('read-a')] }, TODAY)
    expect(p.linguist[0]).toBe(1)
    expect(p.tableGuest[0]).toBe(1)
  })
  it('Keeper sums practices carried forward', () => {
    const refl = (id: string, kept: string[]) => ({ id, updatedAt: 1, deviceId: 't', runId: id, answers: [], kept })
    expect(earnedAchievements({ ...empty, reflections: [refl('a', ['p1', 'p2']), refl('b', ['p1'])] }, TODAY)).toContain('keeper')
  })
  it('Devoted needs a hundred check ins', () => {
    const l = lago({ day: 120, lengthDays: 365 })
    expect(achievementProgress({ ...empty, lagos: [l], checkIns: history(l, 99) }, TODAY).devoted).toEqual([99, 100])
    expect(earnedAchievements({ ...empty, lagos: [l], checkIns: history(l, 100) }, TODAY)).toContain('devoted')
  })
})

describe('consistency', () => {
  const l = lago({ day: 60, lengthDays: 90 })
  const build = (skip: number[]) => activityByDate({ ...empty, lagos: [l], checkIns: history(l, 59, skip) }, TODAY)

  it('is the share of scheduled days done, ignoring an open today', () => {
    const c = consistency(build([2, 4, 6, 8]), TODAY)
    // last 28 days: today is open (ignored), 27 counted, 4 missed
    expect(c.score).toBeCloseTo(23 / 27, 5)
    expect(c.tier).toBe('steady')
    expect(c.days).toHaveLength(14)
    expect(c.days[13]).toBeNull()
    expect(c.days[12]).toBe(1)
    expect(c.days[11]).toBe(0)
  })
  it('compares with the four weeks before', () => {
    const skip = Array.from({ length: 28 }, (_, i) => i + 29).filter((i) => i % 2)
    const c = consistency(build(skip), TODAY)
    expect(c.score).toBeCloseTo(1, 5)
    expect(c.delta).toBeGreaterThan(30)
    expect(c.tier).toBe('lockedIn')
  })
  it('has no trend until there is history, and zero with nothing done', () => {
    const fresh = lago({ day: 3 })
    const c = consistency(activityByDate({ ...empty, lagos: [fresh], checkIns: history(fresh, 2) }, TODAY), TODAY)
    expect(c.delta).toBeNull()
    expect(c.score).toBe(1)
    const none = consistency(new Map(), TODAY)
    expect(none).toMatchObject({ score: 0, delta: null, tier: 'finding' })
  })
  it('a missed run lands in the lowest tier', () => {
    expect(consistency(build(Array.from({ length: 40 }, (_, i) => i + 1).filter((i) => i % 5 !== 0)), TODAY).tier).toBe('finding')
  })
})
