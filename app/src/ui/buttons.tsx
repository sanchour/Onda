import type { CSSProperties, ReactNode } from 'react'
import { haptic } from '@/lib/haptics'
import { Icon, type IconWeight } from './Icon'
import s from './ui.module.css'

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ')

interface GlassButtonProps {
  icon?: string
  iconWeight?: IconWeight
  label?: string
  /** Accessible name. Required for icon-only buttons. */
  ariaLabel?: string
  prominent?: boolean
  size?: number
  labelWeight?: 'regular' | 'semibold'
  disabled?: boolean
  onClick?: () => void
  style?: CSSProperties
}

/** Floating liquid-glass bar button: a circle with an icon, or a capsule with a label. */
export function GlassButton({ icon, iconWeight = 'bold', label, ariaLabel, prominent, size = 44, labelWeight = 'regular', disabled, onClick, style }: GlassButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      disabled={disabled}
      data-glass={prominent ? undefined : 'chrome'}
      className={cx(s.glassBtn, label && s.glassLabel, labelWeight === 'semibold' && s.glassSemibold, prominent && s.glassProminent)}
      style={{ '--gb-size': `${size}px`, ...style } as CSSProperties}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
    >
      {icon && <Icon name={icon} weight={iconWeight} size={Math.round(size * 0.5)} />}
      {label && <span>{label}</span>}
    </button>
  )
}

interface ButtonProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'inverse' | 'plain'
  size?: 'lg' | 'md' | 'sm'
  fullWidth?: boolean
  icon?: string
  disabled?: boolean
  onClick?: () => void
  style?: CSSProperties
  ariaLabel?: string
}

const SIZE = { lg: s.btnLg, md: s.btnMd, sm: s.btnSm }
const VARIANT = { primary: s.btnPrimary, secondary: s.btnSecondary, inverse: s.btnInverse, plain: s.btnPlain }

export function Button({ children, variant = 'primary', size = 'lg', fullWidth, icon, disabled, onClick, style, ariaLabel }: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      className={cx(s.btn, SIZE[size], VARIANT[variant], fullWidth && s.btnFull)}
      style={style}
      onClick={(e) => {
        e.stopPropagation()
        if (variant === 'primary') haptic('select')
        onClick?.()
      }}
    >
      {icon && <Icon name={icon} weight="bold" size={18} />}
      {children}
    </button>
  )
}

/** A link that looks like a Button, for destinations the OS must open itself (webcal://, shortcut links). */
export function LinkButton({ href, children, variant = 'primary', icon, external }: { href: string; children: ReactNode; variant?: ButtonProps['variant']; icon?: string; external?: boolean }) {
  return (
    <a href={href} className={cx(s.btn, s.btnLg, VARIANT[variant ?? 'primary'], s.btnFull)} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
      {icon && <Icon name={icon} weight="bold" size={18} />}
      {children}
    </a>
  )
}
