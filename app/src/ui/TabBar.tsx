import type { CSSProperties, ReactNode } from 'react'
import { Icon, type IconWeight } from './Icon'
import { useSlotScrub } from './useSlotScrub'
import s from './ui.module.css'

export interface TabItem<K extends string> {
  key: K
  icon: string
  label: string
  weight?: IconWeight
  /** Drawn instead of the icon (the running Onda's ornament on the Ondas tab). */
  art?: ReactNode
}

interface TabBarProps<K extends string> {
  items: TabItem<K>[]
  activeKey: K
  onChange: (k: K) => void
  style?: CSSProperties
}

/** Floating icon-only liquid-glass tab bar. The lens follows the finger across tabs and springs into place. */
export function TabBar<K extends string>({ items, activeKey, onChange, style }: TabBarProps<K>) {
  const idx = Math.max(0, items.findIndex((i) => i.key === activeKey))
  const sc = useSlotScrub({ count: items.length, index: idx, onCommit: (i) => onChange(items[i]!.key) })
  return (
    <nav ref={sc.trackRef} role="tablist" data-glass="chrome" className={s.tabBar} style={style} {...sc.handlers}>
      <span ref={sc.thumbRef} aria-hidden className={s.tabThumb} style={{ width: sc.w || 0 }}>
        <span className={sc.pressed ? `${s.lens} ${s.lensPressed}` : s.lens} />
      </span>
      {items.map((it, i) => (
        <button
          key={it.key}
          type="button"
          role="tab"
          aria-label={it.label}
          aria-selected={it.key === activeKey}
          className={i === sc.hover ? `${s.tabBtn} ${s.tabBtnOn}` : s.tabBtn}
          onClick={(e) => {
            if (e.detail === 0) onChange(it.key)
          }}
        >
          <span className={s.tabIcon}>
            {it.art ?? <Icon name={it.icon} weight={it.weight ?? 'bold'} size={32} />}
          </span>
        </button>
      ))}
    </nav>
  )
}
