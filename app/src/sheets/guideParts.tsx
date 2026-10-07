import { useEffect, useRef, useState, type ReactNode } from 'react'
import { reducedMotion } from '@/lib/motion'
import { Icon } from '@/ui/Icon'
import g from './guide.module.css'

/** Animated height: the row grid goes from 0fr to 1fr. Closed content is visibility:hidden so it is not focusable or read. */
export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className={g.collapse} data-open={open || undefined}>
      <div className={g.collapseInner}>{children}</div>
    </div>
  )
}

export interface FoldProps {
  title: string
  sub?: string
  tag?: string
  /** A badge on the left: a numeral, or an icon name. */
  badge?: string
  icon?: string
  open: boolean
  onToggle: () => void
  /** Big display title, for words. */
  display?: boolean
  chips?: string[]
  children?: ReactNode
  /** Rows without a body are static. */
  expandable: boolean
}

/** One tappable card that opens in place. */
export function Fold({ title, sub, tag, badge, icon, open, onToggle, display, chips, children, expandable }: FoldProps) {
  const head = (
    <span className={g.foldHead}>
      {(badge || icon) && <span className={g.foldBadge} aria-hidden>{icon ? <Icon name={icon} weight="fill" size={20} /> : badge}</span>}
      <span className={g.foldText}>
        {tag && <span className={g.tag}>{tag}</span>}
        <span className={display ? g.foldDisplay : g.foldTitle}>{title}</span>
        {chips && chips.length > 0 && (
          <span className={g.chips}>
            {chips.map((c) => (
              <span key={c} className={g.chip}>{c}</span>
            ))}
          </span>
        )}
        {sub && <span className={open || !expandable ? g.foldSub : `${g.foldSub} ${g.clamp}`} data-selectable>{sub}</span>}
      </span>
      {expandable && (
        <span className={open ? `${g.caret} ${g.caretOpen}` : g.caret} aria-hidden>
          <Icon name="caret-down" weight="bold" size={16} color="var(--label-tertiary)" />
        </span>
      )}
    </span>
  )
  return (
    <div className={open ? `${g.fold} ${g.foldOpen}` : g.fold}>
      {expandable ? (
        <button type="button" className={g.foldBtn} aria-expanded={open} onClick={onToggle}>
          {head}
        </button>
      ) : (
        <div className={g.foldBtn}>{head}</div>
      )}
      {expandable && (
        <Collapse open={open}>
          <div className={g.foldBody} data-selectable>{children}</div>
        </Collapse>
      )}
    </div>
  )
}

/** Horizontal snap carousel with a dot indicator. `index` is controlled so a list elsewhere can jump to a slide. */
export function Deck({ slides, index, onIndex, label }: { slides: ReactNode[]; index: number; onIndex: (i: number) => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const lock = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [, force] = useState(0)

  const stride = () => {
    const el = ref.current
    const first = el?.firstElementChild as HTMLElement | null
    return first ? first.offsetWidth + 12 : 0
  }
  const jump = (i: number) => {
    const el = ref.current
    const w = stride()
    if (!el || !w) return
    clearTimeout(lock.current)
    lock.current = setTimeout(() => (lock.current = undefined), 500)
    el.scrollTo({ left: i * w, behavior: reducedMotion() ? 'auto' : 'smooth' })
  }

  useEffect(() => {
    const el = ref.current
    const w = stride()
    if (el && w && Math.abs(el.scrollLeft - index * w) > 6) jump(index)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  useEffect(() => () => clearTimeout(lock.current), [])
  useEffect(() => {
    const ro = new ResizeObserver(() => force((n) => n + 1))
    if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  return (
    <div>
      <div
        ref={ref}
        className={`hscroll ${g.deck}`}
        role="group"
        aria-label={label}
        onScroll={(e) => {
          if (lock.current) return
          const w = stride()
          if (!w) return
          const i = Math.max(0, Math.min(slides.length - 1, Math.round(e.currentTarget.scrollLeft / w)))
          if (i !== index) onIndex(i)
        }}
      >
        {slides.map((s, i) => (
          <div key={i} className={g.slide} aria-hidden={i !== index && undefined}>
            {s}
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className={g.dots}>
          {slides.map((_, i) => (
            <button key={i} type="button" className={i === index ? `${g.dot} ${g.dotOn}` : g.dot} aria-label={`${i + 1} / ${slides.length}`} aria-current={i === index || undefined} onClick={() => onIndex(i)} />
          ))}
        </div>
      )}
    </div>
  )
}

/** Opens http(s) links only: content files are trusted, but a link is never run as anything else. */
export function openExternal(url: string) {
  if (/^https?:\/\//i.test(url)) window.open(url, '_blank', 'noopener,noreferrer')
}
