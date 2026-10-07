import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import s from './ui.module.css'

export interface MenuItem {
  label: string
  icon?: string
  checked?: boolean
  destructive?: boolean
  divider?: boolean
  onClick: () => void
}

export interface MenuSpec {
  /** Anchor rect in viewport coordinates; the menu opens just below it. */
  anchor: { top: number; bottom: number; left: number; right: number }
  items?: MenuItem[]
  /** Lago actions layout: a row of three quick actions, then grouped rows. */
  quick?: MenuItem[]
  groups?: MenuItem[][]
  width?: number
  dim?: boolean
  align?: 'start' | 'end'
}

/** Glass pop-over anchored to its trigger. No scrim (a faint one for the context menu), closes on outside tap or Escape. */
export function Menu({ spec, onClose }: { spec: MenuSpec; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const width = spec.width ?? 250
  const vw = window.innerWidth
  const vh = window.innerHeight

  useEffect(() => {
    const first = ref.current?.querySelector('button')
    first?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const left = Math.max(12, Math.min(vw - width - 12, spec.align === 'end' ? spec.anchor.right - width : spec.anchor.left))
  // Open just below the trigger; if that would run off the bottom, slide up until it fits.
  const [top, setTop] = useState(spec.anchor.bottom + 6)
  useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 0
    setTop(Math.max(56, Math.min(spec.anchor.bottom + 6, vh - h - 20)))
  }, [spec.anchor.bottom, vh])
  const hasChecks = !!spec.items?.some((it) => it.checked !== undefined)
  const pick = (it: MenuItem) => () => {
    onClose()
    it.onClick()
  }
  const row = (it: MenuItem, i: number) => (
    <div key={i}>
      <button type="button" role="menuitem" className={it.destructive ? `${s.menuItem} ${s.menuDestructive}` : s.menuItem} onClick={pick(it)}>
        {hasChecks && <span className={s.menuCheck}>{it.checked && <Icon name="check" weight="bold" size={18} />}</span>}
        {it.icon && (
          <span className={s.menuIcon}>
            <Icon name={it.icon} size={22} />
          </span>
        )}
        <span style={{ flex: 1 }}>{it.label}</span>
      </button>
      {it.divider && <div className={s.menuDivider} />}
    </div>
  )

  return (
    <>
      <div className={spec.dim ? `${s.menuScrim} ${s.menuScrimDim}` : s.menuScrim} onPointerDown={onClose} />
      <div ref={ref} role="menu" className={s.menu} style={{ width, left, top }}>
        {spec.quick && (
          <div className={s.menuQuick}>
            {spec.quick.map((q, i) => (
              <button key={i} type="button" role="menuitem" className={s.menuQuickBtn} onClick={pick(q)}>
                <Icon name={q.icon ?? 'circle'} size={22} />
                <span>{q.label}</span>
              </button>
            ))}
          </div>
        )}
        {spec.groups?.map((g, gi) => (
          <div key={gi} className={s.menuGroup}>
            {g.map(row)}
          </div>
        ))}
        {spec.items?.map(row)}
      </div>
    </>
  )
}
