import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { en } from '@/i18n/en'

const src = path.resolve(__dirname, '../../src')
const files: string[] = []
const walk = (dir: string) => {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name)
    if (f.isDirectory()) walk(p)
    else if (/\.tsx?$/.test(f.name) && !p.includes(`${path.sep}i18n${path.sep}`)) files.push(p)
  }
}
walk(src)

const has = (key: string): boolean => {
  let node: unknown = en
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in (node as object)) node = (node as Record<string, unknown>)[part]
    else return false
  }
  return true
}
/** i18next plural keys live as key_one / key_other. */
const resolves = (key: string) => has(key) || (has(`${key}_one`) && has(`${key}_other`))

describe('i18n', () => {
  it('every literal t() key used in the app exists in the English strings', () => {
    const missing: string[] = []
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8')
      for (const m of text.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) {
        if (!resolves(m[1]!)) missing.push(`${path.relative(src, file)}: ${m[1]}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('template keys resolve for every value they are built from', () => {
    const groups: Record<string, string[]> = {
      freq: ['daily', 'weekdays', 'weekly'],
      kinds: ['all', 'read', 'watch', 'listen', 'art', 'eat', 'drink', 'customs', 'words'],
      kindLabel: ['read', 'watch', 'listen', 'art', 'eat', 'drink', 'customs', 'games', 'travel', 'words'],
      'ondas.go': ['journal', 'philosophy', 'read', 'watch', 'listen', 'art', 'eat', 'drink', 'customs', 'games', 'travel'],
      'guide.tabs': ['overview', 'history', 'ideas', 'ethics', 'ways', 'culture', 'travel', 'language', 'facts'],
      'settings.hub': ['subscription', 'appearance', 'notifications', 'practice', 'integrations', 'data', 'privacy', 'help'],
      'settings.display': ['light', 'dark', 'auto'],
      'settings.practice': ['monday', 'sunday'],
      'stats.ev': ['checkedIn', 'missed', 'practice', 'journal', 'ondaStarted', 'ondaCompleted', 'ondaEnded', 'kept'],
      'stats.kind': ['lagos', 'ondas', 'journal'],
      stats: ['week', 'month', 'all', 'noteWeek', 'noteMonth', 'noteAll'],
      guide: ['leadHistory', 'leadIdeas', 'leadEthics', 'leadWays', 'leadCulture', 'leadTravel', 'leadLanguage', 'leadFacts', 'festivals', 'places'],
      'settings.plus': ['lineFree', 'lineTrial', 'lineLife', 'lineExpired', 'ctaFree', 'ctaTrial', 'ctaLife'],
      legal: ['privacyTitle', 'privacyBody', 'termsTitle', 'termsBody'],
      'createOnda.tones': ['blue', 'green', 'yellow', 'coral', 'purple'],
      'ach.names': ['firstStep', 'sevenDays', 'habitBuilder', 'earlyBird', 'firstOnda', 'ondaComplete', 'wanderer', 'linguist', 'reflector', 'tableGuest', 'keeper', 'devoted'],
      'ach.desc': ['firstStep', 'sevenDays', 'habitBuilder', 'earlyBird', 'firstOnda', 'ondaComplete', 'wanderer', 'linguist', 'reflector', 'tableGuest', 'keeper', 'devoted'],
    }
    const missing = Object.entries(groups).flatMap(([g, keys]) => keys.map((k) => `${g}.${k}`).filter((k) => !resolves(k)))
    expect(missing).toEqual([])
  })

  it('follows the voice: no exclamation marks and no emoji in system copy', () => {
    const text = JSON.stringify(en)
    expect(text).not.toContain('!')
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u)
  })
})
