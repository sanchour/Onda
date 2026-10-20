import type { ComponentType } from 'react'
import type { Ornament } from '@/content/themeKit'
import { OrnamentIcon } from '../KindArt'

/* Cover emblems: one refined line drawing per Onda, taken from its own traditional art.

   An emblem is a component that draws an <svg> of `size` px square in currentColor (the cover ink), with fills at most as
   quiet tints (fill="currentColor" with fillOpacity). Draw on a 120 unit viewBox with a stroke near `line` px
   (multiply by 120 / size when the stroke scales). It is always decorative: Cover hides it from VoiceOver. */

export interface EmblemProps {
  /** Rendered width and height in px. */
  size: number
  /** Stroke width in screen px (hairline on tiles, a touch heavier on the hero). */
  line?: number
}
export type Emblem = ComponentType<EmblemProps>
export type EmblemMap = Record<string, Emblem>

/** Stand-in emblem: the Onda's small line ornament, set large with a hairline stroke. */
export const fromOrnament = (name: Ornament): Emblem => {
  const E = ({ size, line = 1.25 }: EmblemProps) => <OrnamentIcon name={name} size={size} weight={(line * 24) / size} />
  E.displayName = `Emblem(${name})`
  return E
}
