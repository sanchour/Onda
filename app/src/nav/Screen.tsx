import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassButton } from '@/ui/buttons'
import s from './nav.module.css'
import { useNav } from './store'

interface ScreenProps {
  /** root: tab root with a large-title row. page: pushed page. cta: pushed page with a fixed bottom button. hero: centered hero below the chrome. */
  variant?: 'root' | 'page' | 'cta' | 'hero' | 'bare' | 'glass'
  bg?: 'grouped' | 'page'
  /** Floating chrome row (glass buttons). */
  chrome?: ReactNode
  /** 8.0: a frosted header (GlassHead) the page scrolls under, in place of the chrome row. */
  head?: ReactNode
  /** Fixed over the page and its chrome: floating buttons, drawers (the Full guide's contents). */
  overlay?: ReactNode
  /** Fixed bottom area (primary button). */
  bottom?: ReactNode
  bottomRow?: boolean
  children: ReactNode
  style?: CSSProperties
  scrollRef?: React.Ref<HTMLDivElement>
  /** Per-Onda flair hook: lets the stylesheet restyle practice rows, bars and headers for this Onda. */
  dataOnda?: string
  /** Desktop column width: read (760px) for long text, wide (1240px) for grids and dashboards, full for the whole stage. 880px otherwise. */
  desk?: 'read' | 'wide' | 'full'
}

/** Once the page has moved under the floating title, the title gets a glass backing so text does not run through it.
 *  A title with `after` stays hidden until the page has scrolled that far, as an iOS large title hands over to the inline one. */
function markScrolled(e: React.UIEvent<HTMLDivElement>) {
  const screen = e.currentTarget.parentElement
  if (!screen) return
  const top = e.currentTarget.scrollTop
  const on = top > 6
  if ((screen.dataset.scrolled === '1') !== on) {
    if (on) screen.dataset.scrolled = '1'
    else delete screen.dataset.scrolled
  }
  const late = screen.querySelector<HTMLElement>('[data-after]')
  if (!late) return
  const show = top > Number(late.dataset.after)
  if ((screen.dataset.inline === '1') !== show) {
    if (show) screen.dataset.inline = '1'
    else delete screen.dataset.inline
  }
}

const PAD = { root: s.padRoot, page: s.padPage, cta: s.padPageCta, hero: s.padHero, bare: '', glass: s.padGlass }

/** Page scaffold: one scroll pane, floating chrome above it, optional fixed bottom actions. Safe areas handled here. */
export function Screen({ variant = 'page', bg = 'grouped', chrome, head, overlay, bottom, bottomRow, children, style, scrollRef, dataOnda, desk }: ScreenProps) {
  return (
    <div className={`${s.screen} ${bg === 'page' ? s.bgPage : s.bgGrouped}`}>
      <div ref={scrollRef} className={`scroll ${s.pane} ${PAD[variant]}`} style={style} data-onda={dataOnda} data-desk-w={desk} onScroll={markScrolled}>
        {children}
      </div>
      {head && <div className={s.head}>{head}</div>}
      {chrome && <div className={s.chrome}>{chrome}</div>}
      {bottom && <div className={bottomRow ? `${s.bottom} ${s.bottomRow}` : s.bottom}>{bottom}</div>}
      {overlay}
    </div>
  )
}

export function BackButton({ onClick, icon = 'caret-left' }: { onClick?: () => void; icon?: 'caret-left' | 'x' }) {
  const { t } = useTranslation()
  const pop = useNav((n) => n.pop)
  return <GlassButton icon={icon} ariaLabel={icon === 'x' ? t('a11y.close') : t('a11y.back')} onClick={onClick ?? pop} />
}

/** `onda`: set in the running Onda's display face (8.0 Journal). */
export function ChromeTitle({ children, after, onda }: { children: ReactNode; after?: number; onda?: boolean }) {
  return (
    <h1 className={[s.chromeTitle, after != null && s.chromeLate, onda && s.glassOnda].filter(Boolean).join(' ')} data-after={after}>
      {children}
    </h1>
  )
}
/** iOS large title at the top of the page; the chrome title (with `after`) carries the heading for assistive tech. */
export function LargeTitle({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <header className={s.largeHead}>
      <div className={s.largeText} aria-hidden>{title}</div>
      {sub && <p className={s.largeSub}>{sub}</p>}
    </header>
  )
}
export const ChromeGroup = ({ children }: { children: ReactNode }) => <div className={s.chromeGroup}>{children}</div>
export const ChromeSpacer = () => <span className={s.spacer44} />
export const BottomNote = ({ children }: { children: ReactNode }) => <div className={s.bottomNote}>{children}</div>

/** 8.0: a frosted band across the top: back button, a centred title, an optional trailing button, and a row of glass pill
 *  tabs under them (Screen variant "glass" leaves room for both). The title is set in the running Onda's display face,
 *  or in the system sans where the page covers every Onda. */
export function GlassHead({ title, face = 'onda', trailing, tabs }: { title: string; face?: 'onda' | 'sans'; trailing?: ReactNode; tabs?: ReactNode }) {
  return (
    <>
      <span className={s.frost} data-tabs={tabs ? '' : undefined} aria-hidden />
      <div className={s.glassRow}>
        <BackButton />
        <h1 className={face === 'onda' ? `${s.glassTitle} ${s.glassOnda}` : s.glassTitle}>{title}</h1>
        {trailing ?? <ChromeSpacer />}
      </div>
      {tabs && <div className={s.glassTabs}>{tabs}</div>}
    </>
  )
}
