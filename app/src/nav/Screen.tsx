import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassButton } from '@/ui/buttons'
import s from './nav.module.css'
import { useNav } from './store'

interface ScreenProps {
  /** root: tab root with a large-title row. page: pushed page. cta: pushed page with a fixed bottom button. hero: centered hero below the chrome. */
  variant?: 'root' | 'page' | 'cta' | 'hero' | 'bare'
  bg?: 'grouped' | 'page'
  /** Floating chrome row (glass buttons). */
  chrome?: ReactNode
  /** Fixed bottom area (primary button). */
  bottom?: ReactNode
  bottomRow?: boolean
  children: ReactNode
  style?: CSSProperties
  scrollRef?: React.Ref<HTMLDivElement>
  /** Per-Onda flair hook: lets the stylesheet restyle practice rows, bars and headers for this Onda. */
  dataOnda?: string
}

const PAD = { root: s.padRoot, page: s.padPage, cta: s.padPageCta, hero: s.padHero, bare: '' }

/** Page scaffold: one scroll pane, floating chrome above it, optional fixed bottom actions. Safe areas handled here. */
export function Screen({ variant = 'page', bg = 'grouped', chrome, bottom, bottomRow, children, style, scrollRef, dataOnda }: ScreenProps) {
  return (
    <div className={`${s.screen} ${bg === 'page' ? s.bgPage : s.bgGrouped}`}>
      <div ref={scrollRef} className={`scroll ${s.pane} ${PAD[variant]}`} style={style} data-onda={dataOnda}>
        {children}
      </div>
      {chrome && <div className={s.chrome}>{chrome}</div>}
      {bottom && <div className={bottomRow ? `${s.bottom} ${s.bottomRow}` : s.bottom}>{bottom}</div>}
    </div>
  )
}

export function BackButton({ onClick, icon = 'caret-left' }: { onClick?: () => void; icon?: 'caret-left' | 'x' }) {
  const { t } = useTranslation()
  const pop = useNav((n) => n.pop)
  return <GlassButton icon={icon} ariaLabel={icon === 'x' ? t('a11y.close') : t('a11y.back')} onClick={onClick ?? pop} />
}

export function ChromeTitle({ children }: { children: ReactNode }) {
  return <h1 className={s.chromeTitle}>{children}</h1>
}
export const ChromeGroup = ({ children }: { children: ReactNode }) => <div className={s.chromeGroup}>{children}</div>
export const ChromeSpacer = () => <span className={s.spacer44} />
export const BottomNote = ({ children }: { children: ReactNode }) => <div className={s.bottomNote}>{children}</div>
