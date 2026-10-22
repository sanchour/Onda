import { EMBLEMS_A } from './a'
import { EMBLEMS_B } from './b'
import { EMBLEMS_C } from './c'
import type { EmblemMap, EmblemProps } from './kit'

export type { Emblem, EmblemMap, EmblemProps } from './kit'

/** Every Onda's cover emblem, keyed by emblem id (the Onda id unless its theme names another). */
export const EMBLEMS: EmblemMap = { ...EMBLEMS_A, ...EMBLEMS_B, ...EMBLEMS_C }

/** Draws the emblem for `id`, or nothing when there is none (themes off, custom Ondas). */
export function EmblemArt({ id, ...p }: EmblemProps & { id: string | undefined }) {
  const E = id ? EMBLEMS[id] : undefined
  return E ? <E {...p} /> : null
}
