import type { KeyName } from './Kbd'

/* Every desktop shortcut, as the shortcut sheet lists them. The handler in useDeskKeys.ts, the palette and Focus
   implement them; keep the three in step with this list. Labels are keys under power.keys. */

export interface Shortcut {
  label: string
  /** Alternative combinations, each a list of keys pressed together. */
  keys: KeyName[][]
}

export const SHORTCUTS: { title: string; items: Shortcut[] }[] = [
  {
    title: 'general',
    items: [
      { label: 'search', keys: [['mod', 'k'], ['/']] },
      { label: 'shortcuts', keys: [['?']] },
      { label: 'sidebar', keys: [['mod', '\\']] },
      { label: 'back', keys: [['esc'], ['alt', 'left']] },
    ],
  },
  {
    title: 'go',
    items: [
      { label: 'today', keys: [['t']] },
      { label: 'browse', keys: [['b']] },
      { label: 'lagos', keys: [['l']] },
      { label: 'stats', keys: [['s']] },
      { label: 'settings', keys: [[',']] },
    ],
  },
  {
    title: 'inSearch',
    items: [
      { label: 'move', keys: [['up'], ['down']] },
      { label: 'run', keys: [['enter']] },
      { label: 'alt', keys: [['mod', 'enter']] },
      { label: 'focusIt', keys: [['shift', 'enter']] },
      { label: 'nextGroup', keys: [['tab']] },
      { label: 'clear', keys: [['esc']] },
    ],
  },
  {
    title: 'inFocus',
    items: [
      { label: 'focusNext', keys: [['f']] },
      { label: 'startPause', keys: [['space']] },
      { label: 'reset', keys: [['r']] },
      { label: 'leave', keys: [['esc']] },
    ],
  },
]
