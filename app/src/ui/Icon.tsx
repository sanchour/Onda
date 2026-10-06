import type { CSSProperties } from 'react'
import { ICONS, type IconName } from './icons'

export type IconWeight = 'regular' | 'bold' | 'fill'
const WEIGHT: Record<IconWeight, 0 | 1 | 2> = { regular: 0, bold: 1, fill: 2 }

interface IconProps {
  /** Phosphor id, e.g. "flower-lotus". Unknown ids (user or content data) fall back to a circle. */
  name: string
  weight?: IconWeight
  size?: number
  color?: string
  style?: CSSProperties
  className?: string
}

/** Phosphor glyph: stands in for SF Symbols. Always decorative; the control that owns it carries the label. */
export function Icon({ name, weight = 'regular', size = 22, color, style, className }: IconProps) {
  const glyph = ICONS[name as IconName] ?? ICONS.circle
  return (
    <svg
      aria-hidden
      focusable={false}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      style={{ flexShrink: 0, color, ...style }}
      // Static markup generated from Phosphor's own SVG files: no user input reaches this.
      dangerouslySetInnerHTML={{ __html: glyph[WEIGHT[weight]] }}
    />
  )
}
