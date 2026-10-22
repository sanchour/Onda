import type { EmblemMap } from './kit'
import { EMBLEMS_B1 } from './b1'
import { EMBLEMS_B2 } from './b2'

/* Cover emblems, part B: the last 32 Ondas, drawn in b1.tsx (shia to mughal) and b2.tsx (johor to celtic). */
export const EMBLEMS_B: EmblemMap = { ...EMBLEMS_B1, ...EMBLEMS_B2 }
