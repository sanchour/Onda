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
function Tick({ on, light }: { on: boolean; light?: boolean }) {
  return (
    <span className={light ? `${o.mcTick} ${o.mcTickLight}` : o.mcTick} data-on={on ? '' : undefined} aria-hidden>
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
    <button type="button" role="checkbox" aria-checked={done} aria-label={t('a11y.markDone', { name: m.title })} className={`${o.mcArt} ${cls}`} data-frame={frame ? '' : undefined} onClick={onToggle}>
      {children}
    </button>
  )
  const caption = (title: boolean, line?: string) => (
    <button type="button" className={o.mcCap} aria-label={t('immersion.about', { name: m.title })} onClick={onOpen}>
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
              <span className={o.mcOrn} aria-hidden><OrnamentIcon name={ornament} size={18} /></span>
              <span className={o.mcBookTitle}>{m.title}</span>
              {m.creator && <span className={o.mcBookBy}>{m.creator}</span>}
              <Tick on={done} />
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
              <span className={o.mcPlay} aria-hidden><Icon name="play" weight="fill" size={22} /></span>
              {m.year && <span className={o.mcYear}>{m.year}</span>}
              <Tick on={done} />
            </>,
            o.mcVideo,
          )}
          {caption(true, [m.creator, m.year].filter(Boolean).join(' · '))}
        </div>
      )
    case 'listen':
    case 'games':
      return (
        <div className={o.mc} data-kind={m.kind}>
          {art(
            <>
              <span className={o.mcIcon} aria-hidden><Icon name={icon} weight="regular" size={40} /></span>
              {m.kind === 'listen' && <span className={o.mcDisc} aria-hidden><Icon name="play" weight="fill" size={14} /></span>}
              <Tick on={done} />
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
                <span className={o.mcCanvas}><Icon name={icon} weight="regular" size={30} /></span>
              </span>
              <Tick on={done} />
            </>,
            o.mcFramed,
          )}
          {caption(true, by)}
        </div>
      )
    case 'eat':
    case 'drink':
      return (
        <div className={o.mc} data-kind={m.kind}>
          {art(
            <>
              <span className={o.mcIcon} aria-hidden><Icon name={icon} weight="regular" size={36} /></span>
              <Tick on={done} />
            </>,
            o.mcPlate,
          )}
          {caption(true, by)}
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
              <Tick on={done} light />
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
              <Tick on={done} />
            </>,
            o.mcPost,
          )}
          {caption(false, m.creator || m.meta)}
        </div>
      )
    case 'words':
      return (
        <div className={o.mc} data-kind="words">
          {art(
            <>
              <span className={o.mcTerm}>{m.title}</span>
              {m.meta && <span className={o.mcMeaning}>{m.meta}</span>}
              <Tick on={done} light />
            </>,
            o.mcFlash,
          )}
        </div>
      )
  }
}
