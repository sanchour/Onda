import { Children, cloneElement, isValidElement, type CSSProperties, type ReactElement, type ReactNode } from 'react'
import { Switch } from './controls'
import { Icon, type IconWeight } from './Icon'
import s from './ui.module.css'

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ')

interface ListSectionProps {
  header?: string
  footer?: string
  children: ReactNode
  style?: CSSProperties
}
/** Inset-grouped section: optional bold header, a 26px white card of rows, optional footnote. */
export function ListSection({ header, footer, children, style }: ListSectionProps) {
  const rows = Children.toArray(children).filter(Boolean)
  return (
    <section className={s.section} style={style}>
      {header && <h2 className={s.sectionHeader}>{header}</h2>}
      <div className={s.sectionCard}>
        {rows.map((r, i) =>
          isValidElement(r) && (r.props as ListRowProps).showSeparator === undefined
            ? cloneElement(r as ReactElement<ListRowProps>, { showSeparator: i < rows.length - 1 })
            : r,
        )}
      </div>
      {footer && <div className={s.sectionFooter}>{footer}</div>}
    </section>
  )
}

export interface ListRowProps {
  icon?: string
  iconWeight?: IconWeight
  title: string
  subtitle?: string
  value?: string | number
  accessory?: 'chevron' | 'external' | 'check' | 'switch' | 'none'
  switchOn?: boolean
  onSwitchChange?: (on: boolean) => void
  destructive?: boolean
  showSeparator?: boolean
  onClick?: () => void
  /** Extra trailing node (spinner, status dot). */
  trailing?: ReactNode
}

export function ListRow({ icon, iconWeight = 'regular', title, subtitle, value, accessory = 'chevron', switchOn, onSwitchChange, destructive, showSeparator = true, onClick, trailing }: ListRowProps) {
  const clickable = !!onClick && accessory !== 'switch'
  const body = (
    <>
      {icon && (
        <span className={s.rowLead}>
          <Icon name={icon} weight={iconWeight} size={26} color={destructive ? 'var(--destructive)' : undefined} />
        </span>
      )}
      <span className={s.rowText}>
        <span className={cx(s.rowTitle, subtitle && s.rowTitleNowrap, destructive && s.rowDestructive)} style={{ display: 'block' }}>
          {title}
        </span>
        {subtitle && <span className={s.rowSub} style={{ display: 'block' }}>{subtitle}</span>}
      </span>
      {value != null && value !== '' && <span className={s.rowValue}>{value}</span>}
      {trailing}
      {accessory === 'chevron' && <Icon name="caret-right" weight="bold" size={17} color="var(--label-quaternary)" className={s.chev} />}
      {accessory === 'external' && <Icon name="arrow-up-right" weight="bold" size={18} color="var(--label-secondary)" />}
      {accessory === 'check' && <Icon name="check" weight="bold" size={18} color="var(--accent)" />}
      {accessory === 'switch' && <Switch checked={!!switchOn} onChange={onSwitchChange} ariaLabel={title} />}
      {showSeparator && <span aria-hidden className={cx(s.rowSep, icon && s.rowSepInset)} />}
    </>
  )
  const cls = cx(s.row, subtitle && s.rowTall)
  return clickable ? (
    <button type="button" className={cls} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

interface SectionToggleProps {
  title: string
  meta?: ReactNode
  open: boolean
  onToggle: () => void
  /** Extra tappable link before the caret (e.g. "See All"). */
  action?: { label: string; onClick: () => void }
}
/** Collapsible section header: bold title, count on the right, caret that rotates when closed. */
export function SectionToggle({ title, meta, open, onToggle, action }: SectionToggleProps) {
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" className={s.toggle} aria-expanded={open} onClick={onToggle}>
        <h2 className={s.toggleTitle}>{title}</h2>
        <span className={s.toggleMeta}>
          {action && <span aria-hidden className={s.toggleAction} style={{ visibility: 'hidden' }}>{action.label}</span>}
          {meta != null && <span>{meta}</span>}
          <span className={cx(s.toggleCaret, !open && s.toggleCaretClosed)}>
            <Icon name="caret-down" weight="bold" size={16} color="var(--label-tertiary)" />
          </span>
        </span>
      </button>
      {action && (
        <button type="button" className={s.toggleAction} style={{ position: 'absolute', right: 46, bottom: 14 }} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}
