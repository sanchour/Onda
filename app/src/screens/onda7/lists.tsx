import { useId, type CSSProperties, type ReactNode } from 'react'
import { Icon } from '@/ui/Icon'
import c from './onda7.module.css'

/** One rounded inset container with hairlines inset to the text. Children are rows (Row, PracticeRow or any element). */
export function GroupedList({ header, footer, inset, label, children, style }: {
  /** Small capitals label above the container (a time of day, a group). */
  header?: string
  footer?: ReactNode
  /** Left inset of the hairlines in px: 58 with a leading icon (the default), 16 without. */
  inset?: number
  /** Accessible name for the group when there is no header. */
  label?: string
  children: ReactNode
  style?: CSSProperties
}) {
  const id = useId()
  return (
    <div role="group" aria-label={header ? undefined : label} aria-labelledby={header ? id : undefined} style={style}>
      {header && <div className={c.groupHead} id={id}>{header}</div>}
      <div className={c.group} style={inset != null ? ({ '--inset': `${inset}px` } as CSSProperties) : undefined}>
        {children}
      </div>
      {footer && <div className={c.groupFoot}>{footer}</div>}
    </div>
  )
}

export interface RowProps {
  /** Phosphor icon name, drawn as a line in the Onda accent. Or any node (a numeral). */
  icon?: string | ReactNode
  title: ReactNode
  sub?: ReactNode
  /** Trailing value in secondary colour. */
  value?: ReactNode
  /** Trailing element after the value (a CheckCircle). */
  trailing?: ReactNode
  /** Shows a chevron; set for rows that open a page. */
  chevron?: boolean
  onClick?: () => void
  ariaLabel?: string
  role?: string
  ariaChecked?: boolean
  /** For rows that show more on a tap. */
  expanded?: boolean
  className?: string
}

/** A list row: leading line icon (20 to 22pt), title and subtitle, trailing value, check or chevron. 52pt tall at least. */
export function Row({ icon, title, sub, value, trailing, chevron, onClick, ariaLabel, role, ariaChecked, expanded, className }: RowProps) {
  const body = (
    <>
      {icon != null && <span className={c.lead} aria-hidden={typeof icon === 'string' || undefined}>{typeof icon === 'string' ? <Icon name={icon} weight="regular" size={22} /> : icon}</span>}
      <span className={c.text}>
        <span className={c.rTitle}>{title}</span>
        {sub && <span className={c.rSub}>{sub}</span>}
      </span>
      {value != null && <span className={c.value}>{value}</span>}
      {trailing}
      {chevron && <span className={c.chev} aria-hidden><Icon name="caret-right" weight="bold" size={14} /></span>}
    </>
  )
  const cls = className ? `${c.row} ${className}` : c.row
  return onClick ? (
    <button type="button" className={cls} onClick={onClick} aria-label={ariaLabel} role={role} aria-checked={ariaChecked} aria-expanded={expanded}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

/** The trailing 24pt check. Empty ring until done, then filled with the Onda accent. Decorative: the row carries the state. */
export function CheckCircle({ on }: { on: boolean }) {
  return (
    <span className={on ? `${c.check} ${c.checkOn}` : c.check} aria-hidden>
      {on && <Icon name="check" weight="bold" size={14} />}
    </span>
  )
}

/** A section title (22pt bold, system sans) with an optional count, collapse caret and trailing action. */
export function SectionHeader({ title, meta, open, onToggle, action, id }: {
  title: string
  meta?: ReactNode
  /** With onToggle the header is a button that collapses its section. */
  open?: boolean
  onToggle?: () => void
  action?: { label: string; onClick: () => void }
  id?: string
}) {
  const metaEl = (meta != null || onToggle) && (
    <span className={c.secMeta}>
      {action && <span aria-hidden style={{ visibility: 'hidden' }} className={c.secAction}>{action.label}</span>}
      {meta != null && <span>{meta}</span>}
      {onToggle && (
        <span className={open === false ? `${c.caret} ${c.caretClosed}` : c.caret} aria-hidden>
          <Icon name="caret-down" weight="bold" size={14} color="var(--label-tertiary)" />
        </span>
      )}
    </span>
  )
  return (
    <div className={c.sec}>
      {onToggle ? (
        <button type="button" className={c.secRow} aria-expanded={open !== false} onClick={onToggle}>
          <h2 className={c.secTitle} id={id}>{title}</h2>
          {metaEl}
        </button>
      ) : (
        <div className={c.secRow}>
          <h2 className={c.secTitle} id={id}>{title}</h2>
          {metaEl}
        </div>
      )}
      {action && (
        <button type="button" className={c.secAction} style={{ position: 'absolute', right: onToggle ? 40 : 16, bottom: 2 }} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}

/** Icon-only shortcuts: a row of floating glass circles tinted with the Onda accent. The label is the accessible name. */
export function ShortcutBar({ items, label }: { items: { icon: string; label: string; onClick: () => void }[]; label?: string }) {
  return (
    <div className={c.bar} role="group" aria-label={label}>
      {items.map((x) => (
        <button key={x.label} type="button" className={c.barBtn} onClick={x.onClick} aria-label={x.label} title={x.label}>
          <span className={c.barIcon} aria-hidden><Icon name={x.icon} weight="regular" size={26} /></span>
        </button>
      ))}
    </div>
  )
}

/** iOS search field. */
export function SearchField({ value, onChange, placeholder, clearLabel }: { value: string; onChange: (v: string) => void; placeholder: string; clearLabel: string }) {
  return (
    <label className={c.search}>
      <Icon name="magnifying-glass" weight="regular" size={18} />
      <input type="search" value={value} placeholder={placeholder} aria-label={placeholder} enterKeyHint="search" autoComplete="off" onChange={(e) => onChange(e.target.value)} />
      {value && (
        <button type="button" className={c.searchClear} aria-label={clearLabel} onClick={() => onChange('')}>
          <Icon name="x-circle" weight="fill" size={18} />
        </button>
      )}
    </label>
  )
}

/** A quote set on the page itself, centred in the display face, with the tradition's ornament above it. */
export function QuoteBlock({ text, by, source, kicker, ornament, caps }: { text: string; by: string; source?: string; kicker?: string; ornament?: ReactNode; caps?: boolean }) {
  return (
    <figure className={c.quote}>
      {ornament && <div className={c.qOrn} aria-hidden>{ornament}</div>}
      {kicker && <div className={c.qKicker}>{kicker}</div>}
      <blockquote className={caps ? `${c.qText} ${c.qCaps}` : c.qText} data-selectable>{text}</blockquote>
      <figcaption className={c.qBy}>
        {by}
        {source && <span>, {source}</span>}
      </figcaption>
    </figure>
  )
}
