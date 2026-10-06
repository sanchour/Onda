import type { CSSProperties } from 'react'
import { ICONS, type IconName } from './icons'

export type IconWeight = 'regular' | 'bold' | 'fill'

interface IconProps {
  /** Phosphor id, e.g. "flower-lotus". Unknown ids (user or content data) fall back to a circle. */
  name: string
  weight?: IconWeight
  size?: number
  color?: string
  style?: CSSProperties
  className?: string
}

/** Phosphor glyph wrapper: stands in for SF Symbols. Always decorative; controls carry their own label. */
export function Icon({ name, weight = 'regular', size = 22, color, style, className }: IconProps) {
  const Glyph = ICONS[name as IconName] ?? ICONS.circle
  return <Glyph aria-hidden focusable={false} size={size} weight={weight} color={color ?? 'currentColor'} className={className} style={{ flexShrink: 0, ...style }} />
}
