import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { KIND_ICON, type MediaItem } from '@/content'
import type { Ornament } from '@/content/themes'
import { Icon } from '@/ui/Icon'
import { OrnamentIcon } from './KindArt'
import o from './ondas.module.css'

/* ── 8.0 Immersion: each kind as a card shaped like its medium ──
   A book cover, a 16:9 film still, a square album sleeve, a framed picture, a plate, a text card, a postcard, a flashcard.
   Every shape is drawn from the running Onda's cover (--onda-cover); tapping the art ticks the item as experienced and the
   caption under it opens the note. Styles: ondas.module.css, "8.0 Immersion". */

/** The tick in the corner of a media card: a ring until done, then a filled disc. `light` is for cards on the page. */
function Tick({ on, light, onToggle }: { on: boolean; light?: boolean; onToggle?: () => void }) {
  return (
    <span
      role="button"
      tabIndex={0}
      className={light ? `${o.mcTick} ${o.mcTickLight}` : o.mcTick}
      data-on={on ? '' : undefined}
      aria-label={on ? 'Marked experienced' : 'Mark experienced'}
      onClick={(e) => {
        e.stopPropagation()
        onToggle?.()
      }}
    >
      {on && <Icon name="check" weight="bold" size={13} />}
    </span>
  )
}

export interface MediaCardProps {
  item: MediaItem
  done: boolean
  onToggle: () => void
  onOpen: () => void
  ornament: Ornament
  /** The Onda's covers carry a thin inset frame (look.layout === 'frame'). */
  frame: boolean
}

export function MediaCard({ item: m, done, onToggle, onOpen, ornament, frame }: MediaCardProps) {
  const { t } = useTranslation()
  const icon = KIND_ICON[m.kind]
  const by = m.kind === 'words' ? m.meta : m.creator || m.meta
  const art = (children: ReactNode, cls?: string) => (
    <div
      role="button"
      tabIndex={0}
      className={`${o.mcArt} ${cls}`}
      data-frame={frame ? '' : undefined}
      aria-label={t('immersion.about', { name: m.title })}
      onClick={onOpen}
    >
      {children}
    </div>
  )
  const caption = (title: boolean, line?: string) => (
    <button type="button" className={o.mcCap} tabIndex={-1} aria-hidden onClick={onOpen}>
      {title && <span className={o.mcTitle}>{m.title}</span>}
      {line && <span className={o.mcBy}>{line}</span>}
    </button>
  )
  const water = (size: number) => (
    <span className={o.mcWater} aria-hidden>
      <Icon name={icon} weight="regular" size={size} />
    </span>
  )
  switch (m.kind) {
    case 'read':
      return (
        <div className={o.mc} data-kind="read">
          {art(
            <>
              <span className={o.mcOrn} aria-hidden><OrnamentIcon name={ornament} size={20} /></span>
              <span className={o.mcBookTitle}>{m.title}</span>
              {m.creator && <span className={o.mcBookBy}>{m.creator}</span>}
              <Tick on={done} onToggle={onToggle} />
            </>,
            o.mcBook,
          )}
          {caption(false, m.year || m.creator)}
        </div>
      )
    case 'watch':
      return (
        <div className={o.mc} data-kind="watch">
          {art(
            <>
              {water(150)}
              <span className={o.mcScrim} aria-hidden />
              {/* 8.1: the title, maker and year sit on the still itself, like a title card */}
              <span className={o.mcOnArt}>
                <span className={o.mcArtName}>{m.title}</span>
                {(m.creator || m.year) && <span className={o.mcArtBy}>{[m.creator, m.year].filter(Boolean).join(' · ')}</span>}
              </span>
              <Tick on={done} onToggle={onToggle} />
            </>,
            o.mcVideo,
          )}
        </div>
      )
    case 'listen':
    case 'games':
      return (
        <div className={o.mc} data-kind={m.kind}>
          {art(
            <>
              <span className={o.mcIcon} aria-hidden><Icon name={icon} weight="regular" size={44} /></span>
              {m.kind === 'listen' && <span className={o.mcDisc} aria-hidden><Icon name="play" weight="fill" size={14} /></span>}
              <Tick on={done} onToggle={onToggle} />
            </>,
            o.mcAlbum,
          )}
          {caption(true, by)}
        </div>
      )
    case 'art':
      return (
        <div className={o.mc} data-kind="art">
          {art(
            <>
              <span className={o.mcMat}>
                <span className={o.mcCanvas}>
                  <OrnamentIcon name={ornament} size={36} />
                  <span className={o.mcArtTitle}>{m.title}</span>
                </span>
              </span>
              <Tick on={done} onToggle={onToggle} />
            </>,
            o.mcFramed,
          )}
          {caption(true, by)}
        </div>
      )
    case 'eat':
      return (
        <div className={o.mc} data-kind="eat">
          {art(
            <>
              <span className={o.mcDish} aria-hidden>
                <Icon name={icon} weight="regular" size={32} />
              </span>
              <Tick on={done} onToggle={onToggle} />
            </>,
            o.mcEatPlate,
          )}
          {caption(true)}
        </div>
      )
    case 'drink':
      return (
        <div className={o.mc} data-kind="drink">
          {art(
            <>
              <span className={o.mcGlass} aria-hidden>
                <Icon name={icon} weight="regular" size={32} />
              </span>
              <Tick on={done} onToggle={onToggle} />
            </>,
            o.mcDrinkGlass,
          )}
          {caption(true)}
        </div>
      )
    case 'customs':
      return (
        <div className={o.mc} data-kind="customs">
          {art(
            <>
              <span className={o.mcAccent} aria-hidden><Icon name={icon} weight="regular" size={24} /></span>
              <span className={o.mcTitle}>{m.title}</span>
              {m.why && <span className={o.mcWhy}>{m.why}</span>}
              <Tick on={done} light onToggle={onToggle} />
            </>,
            o.mcText,
          )}
        </div>
      )
    case 'travel':
      return (
        <div className={o.mc} data-kind="travel">
          {art(
            <>
              <span className={o.mcStamp} aria-hidden><Icon name={icon} weight="regular" size={18} /></span>
              <span className={o.mcPostmark} aria-hidden />
              <span className={o.mcPostTitle}>{m.title}</span>
              {(m.creator || m.meta || m.year) && <span className={o.mcPostBy}>{[m.creator || m.meta, m.year].filter(Boolean).join(' · ')}</span>}
              <div className={o.mcPostMap} aria-hidden>
                <svg viewBox="0 0 200 45" preserveAspectRatio="none" className={o.mcPostMapSvg}>
                  <path d="M0,25 Q40,10 80,22 T160,18 T200,28 L200,45 L0,45 Z" fill="currentColor" opacity="0.18" />
                  <path d="M0,32 Q50,20 100,30 T200,24 L200,45 L0,45 Z" fill="currentColor" opacity="0.12" />
                  <line x1="0" y1="20" x2="200" y2="20" stroke="currentColor" strokeDasharray="3 3" opacity="0.15" />
                  <circle cx="80" cy="22" r="3" fill="var(--onda-accent, var(--accent))" />
                </svg>
              </div>
              <Tick on={done} onToggle={onToggle} />
            </>,
            o.mcPost,
          )}
        </div>
      )
    case 'words':
      return (
        <div className={o.mc} data-kind="words">
          {art(
            <>
              <span className={o.mcTerm}>{m.title}</span>
              {m.meta && <span className={o.mcMeaning}>{m.meta}</span>}
              <Tick on={done} light onToggle={onToggle} />
            </>,
            o.mcFlash,
          )}
        </div>
      )
  }
}
