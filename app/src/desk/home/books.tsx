import { useTranslation } from 'react-i18next'
import type { ComingSoon } from '@/content/browse'
import { GROUP_OF } from '@/content/browse'
import type { OndaIndex } from '@/content/schema'
import type { OndaLook } from '@/content/themes'
import { fitSize } from '@/lib/fit'
import { EmblemArt } from '@/screens/emblems'
import { Icon } from '@/ui/Icon'
import b from './books.module.css'
import { lean, unlean } from './parts'

/** The running Onda first, then four that change with the day: the same pick as the phone's All Ondas. */
export function featuredOndas(list: OndaIndex[], activeId: string | undefined, today: string): OndaIndex[] {
  const pool = list.filter((x) => GROUP_OF[x.id] && x.id !== activeId)
  const seed = [...today].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7)
  return [...list.filter((x) => x.id === activeId), ...(pool.length ? Array.from({ length: 4 }, (_, i) => pool[(seed + i * 17) % pool.length]!) : [])]
    .filter((x, i, all) => all.findIndex((y) => y.id === x.id) === i)
}

/** One Onda as an upright book: its material with a spine, its emblem, its name in its own face. */
export function Book({ x, look, badge, onOpen }: { x: OndaIndex; look: OndaLook; badge?: string; onOpen: () => void }) {
  const left = look.layout === 'left'
  const fs = fitSize(x.name, 168, 25, 14, look.caps)
  return (
    <button type="button" className={b.book} data-layout={look.layout} style={{ ...look.vars, background: look.cover, color: look.ink }} onClick={onOpen} onPointerMove={(e) => lean(e)} onPointerLeave={unlean}>
      {look.layout === 'frame' && <span className={b.frame} aria-hidden />}
      <span className={b.top}>
        {badge ? <span className={b.badge}>{badge}</span> : look.themed && look.glyph.length <= 3 ? <span className={b.mark} aria-hidden>{look.glyph}</span> : <span />}
      </span>
      {look.emblem && (
        <span className={b.emblem} aria-hidden>
          <EmblemArt id={look.emblem} size={left ? 176 : 70} line={1} />
        </span>
      )}
      <span className={b.body}>
        <span className={b.title} style={{ fontSize: fs }}>{x.name}</span>
        <span className={b.origin}>{x.origin}</span>
      </span>
      <span className={b.sheen} aria-hidden />
    </button>
  )
}

/** A world that is on the way: greyed out and not openable. */
export function SoonBook({ x }: { x: ComingSoon }) {
  const { t } = useTranslation()
  return (
    <div className={b.soon} aria-disabled="true">
      <span className={b.soonBadge}>{t('browse.soon')}</span>
      <span>
        <span className={b.soonName}>{x.name}</span>
        <span className={b.soonOrigin}>{x.origin}</span>
      </span>
    </div>
  )
}

/** A Featured cover: wide, with the Onda's one line. `big` is the lead of the spread. */
export function FeatureCover({ x, look, kicker, big, onOpen }: { x: OndaIndex; look: OndaLook; kicker: string; big?: boolean; onOpen: () => void }) {
  const left = look.layout === 'left'
  const fs = big ? fitSize(x.name, 420, 60, 30, look.caps) : fitSize(x.name, 200, 30, 18, look.caps)
  return (
    <button
      type="button"
      className={big ? `${b.feat} ${b.featBig}` : b.feat}
      data-layout={look.layout}
      style={{ ...look.vars, background: look.cover, color: look.ink }}
      onClick={onOpen}
      onPointerMove={(e) => lean(e)}
      onPointerLeave={unlean}
    >
      {look.layout === 'frame' && <span className={b.frame} aria-hidden />}
      <span className={b.featKick}>{kicker}</span>
      {look.emblem && (
        <span className={b.featEmblem} aria-hidden>
          <EmblemArt id={look.emblem} size={big ? (left ? 420 : 190) : left ? 220 : 96} line={1} />
        </span>
      )}
      <span className={b.featBody}>
        <span className={b.featTitle} style={{ fontSize: fs }}>{x.name}</span>
        {big ? <span className={b.featLine}>{x.line}</span> : <span className={b.featOrigin}>{x.origin}</span>}
      </span>
      <span className={b.featGo} aria-hidden><Icon name="arrow-right" weight="bold" size={18} /></span>
      <span className={b.sheen} aria-hidden />
    </button>
  )
}
