import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { MOD_LABEL } from '@/lib/desk'
import { Icon } from '@/ui/Icon'
import k from './keys.module.css'

/* Key caps. Apple keyboards get their symbols; everyone else gets the words printed on their keys. */

const MAC = MOD_LABEL === '⌘'

/** Key names: 'mod', 'alt', 'shift', 'enter', 'up', 'down', 'left', 'esc', 'space', 'tab', or the printed character. */
export type KeyName = string

const ICON: Record<string, string> = { up: 'arrow-up', down: 'arrow-down', left: 'arrow-left', right: 'arrow-right' }
const CAP: Record<string, string> = { mod: MOD_LABEL, alt: MAC ? '⌥' : 'Alt', shift: MAC ? '⇧' : 'Shift', enter: MAC ? 'Return' : 'Enter', esc: 'Esc', space: 'Space', tab: 'Tab' }
// the name a screen reader says for each cap (power.keyName.*)
const NAME: Record<string, string> = { mod: MAC ? 'command' : 'control', alt: MAC ? 'option' : 'alt', shift: 'shift', enter: MAC ? 'return' : 'enter', up: 'up', down: 'down', left: 'left', right: 'right', esc: 'escape', space: 'space', tab: 'tab', ',': 'comma', '/': 'slash', '?': 'question', '\\': 'backslash' }

/** How a key combination reads aloud, e.g. "Control K". */
export const spoken = (t: TFunction, keys: KeyName[]) => keys.map((x) => (NAME[x] ? t(`power.keyName.${NAME[x]}`) : x.toUpperCase())).join(' ')

/** One key combination as caps, e.g. ['mod', 'k']. Read out as words; the caps themselves are decorative. */
export function Keys({ keys, tone }: { keys: KeyName[]; tone?: 'soft' | 'on' }) {
  const { t } = useTranslation()
  return (
    <span className={k.keys} data-tone={tone} role="img" aria-label={spoken(t, keys)}>
      {keys.map((x, i) => (
        <kbd key={i} className={k.cap} data-wide={(CAP[x] ?? x).length > 2 ? '' : undefined}>
          {ICON[x] ? <Icon name={ICON[x]} weight="bold" size={11} /> : CAP[x] ?? x.toUpperCase()}
        </kbd>
      ))}
    </span>
  )
}
