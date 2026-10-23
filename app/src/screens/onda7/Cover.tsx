import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { OndaLook } from '@/content/themes'
import { columnWidth, fitSize } from '@/lib/fit'
import { EmblemArt } from '../emblems'
import c from './onda7.module.css'

export interface CoverProps {
  look: OndaLook
  /** `hero`: full width at the top of a page. `tile`: one cell of the two column browse grid.
   *  `card`: 8.0, a 280x176 card on the shelves of All Ondas (`width` stretches it to a full row). */
  size: 'hero' | 'tile' | 'card'
  title: string
  /** Small capitals line at the top (for example "Onda · Day 4 of 14"). */
  kicker?: string
  /** A word in the tradition's own script, set in the display face where the kicker goes. Decorative. */
  glyph?: string
  /** One line under the title (the origin). */
  sub?: string
  /** Top right: a number in the tradition's numerals or its glyph. Decorative; put the meaning in `kicker` or `ariaLabel`. */
  mark?: string
  /** Top right pill (Active, Yours). Replaces `mark` on tiles. */
  badge?: string
  /** Day segments along the bottom. */
  days?: { day: number; length: number }
  /** With onClick the cover is a button. Its accessible name is `ariaLabel`, or its text when that is not set. */
  onClick?: () => void
  ariaLabel?: string
  /** Heading level for the title on a hero (1 on an Onda page). Tiles never use a heading. */
  level?: 1 | 2
  /** Width of a tile in px when it is not a cell of the two column grid (the 152px shelf tiles), so its title fits. */
  width?: number
  /** 8.0: the Full guide's opening card: no title on it, the glyph spaced wide, the essence under the emblem. */
  article?: boolean
  children?: ReactNode
}

const EMBLEM = { hero: { left: 200, center: 76, frame: 64 }, tile: { left: 104, center: 46, frame: 40 }, card: { left: 120, center: 46, frame: 40 } } as const

/** An Onda's cover: its material, emblem, display face and numerals. The one place each Onda shows its world. */
export function Cover({ look, size, title, kicker, glyph, sub, mark, badge, days, onClick, ariaLabel, level, width, article, children }: CoverProps) {
  const { t } = useTranslation()
  const hero = size === 'hero'
  const centred = look.layout !== 'left'
  // the longest word decides the size; heroes leave room for a cropped emblem on the right
  const fs = hero
    ? fitSize(title, columnWidth() - 32 - 44 - (centred ? 0 : 40), 40, 22, look.caps)
    : size === 'card'
      ? fitSize(title, (width ?? 168) - 28 - (centred ? 0 : 28), 22, 13, look.caps)
      : fitSize(title, (width ?? columnWidth() / 2 - 22) - 28, 19, 13, look.caps)
  const H = hero && level ? (`h${level}` as const) : 'span'
  const cls = [c.cover, c[size], c[look.layout], article && c.article].filter(Boolean).join(' ')
  const style = size === 'card' && width ? { ...look.vars, width } : look.vars
  const inner = (
    <>
      <span className={c.top}>
        {glyph && !kicker ? <span className={c.glyph} aria-hidden>{glyph}</span> : <span className={c.kicker}>{kicker}</span>}
        {badge ? <span className={c.badge}>{badge}</span> : mark ? <span className={c.mark} aria-hidden>{mark}</span> : null}
      </span>
      <span className={c.emblem} aria-hidden>
        <EmblemArt id={look.emblem} size={EMBLEM[size][look.layout]} line={hero ? 1.25 : size === 'card' ? 1.1 : 1} />
      </span>
      <span className={c.body}>
        {title && <H className={c.title} style={{ display: 'block', fontSize: fs }}>{title}</H>}
        {sub && <span className={c.sub}>{sub}</span>}
        {days && (
          <span className={c.days} role="img" aria-label={t('ondas.dayOf', days)}>
            {Array.from({ length: days.length }, (_, i) => (
              <i key={i} data-past={i < days.day - 1 ? '' : undefined} data-now={i === days.day - 1 ? '' : undefined} />
            ))}
          </span>
        )}
        {children}
      </span>
    </>
  )
  // 7.2: a large cover's emblem lives in its Onda's own way (content/souls.ts)
  const motion = hero && look.themed && look.motion !== 'still' ? look.motion : undefined
  return onClick ? (
    <button type="button" className={cls} style={style} onClick={onClick} aria-label={ariaLabel} data-motion={motion}>
      {inner}
    </button>
  ) : (
    <div className={cls} style={style} aria-label={ariaLabel} role={ariaLabel ? 'group' : undefined} data-motion={motion}>
      {inner}
    </div>
  )
}
