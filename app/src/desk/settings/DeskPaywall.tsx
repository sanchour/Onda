import { useMemo, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { ONDA_INDEX } from '@/content'
import type { OndaIndex } from '@/content/schema'
import { useLookFn } from '@/data/hooks'
import navCss from '@/nav/nav.module.css'
import { EmblemArt } from '@/screens/emblems'
import type { PlusPlan } from '@/sync/entitlement'
import { Button, GlassButton } from '@/ui/buttons'
import { Icon } from '@/ui/Icon'
import p from './paywall.desk.module.css'

/* Ondas+ on the desktop: the pitch on the left, the plans on a glass card on the right, floating over a slow wall of
   every tradition's cover. Paywall.tsx keeps the state and the actions; this file only lays them out for the width. */

export interface DeskPaywallProps {
  benefits: { icon: string; title: string; text: string }[]
  /** Monthly or lifetime already: no plans to choose. */
  owned: boolean
  plan: PlusPlan
  onPlan: (p: PlusPlan) => void
  busy: boolean
  cta: string
  subline: string
  buyLabel: string
  /** Before the trial: buying straight away is the second button. */
  showBuy: boolean
  onAct: () => void
  onBuy: () => void
  onRestore: () => void
  onClose: () => void
  onLegal: (doc: 'terms' | 'privacy') => void
}

const COLS = 4
const PER_COL = 10

/** "Seventy worlds", shown rather than told: the covers drift past in columns, alternate ones the other way. */
function Worlds() {
  const lookOf = useLookFn()
  const cols = useMemo(() => {
    const out: { o: OndaIndex; look: ReturnType<typeof lookOf> }[][] = Array.from({ length: COLS }, () => [])
    ONDA_INDEX.slice(0, COLS * PER_COL).forEach((o, i) => out[i % COLS]!.push({ o, look: lookOf(o) }))
    return out
  }, [lookOf])
  return (
    <div className={p.worlds} aria-hidden>
      <div className={p.wall}>
        {cols.map((col, c) => (
          // each column holds its covers twice, so sliding by half loops without a seam
          <div key={c} className={p.col} data-back={c % 2 ? '' : undefined} style={{ '--dur': `${150 + c * 22}s` } as CSSProperties}>
            {[...col, ...col].map(({ o, look }, i) => (
              <div key={i} className={p.tile} style={{ background: look.cover, color: look.ink }}>
                <span className={p.tileArt}>{look.emblem ? <EmblemArt id={look.emblem} size={76} line={1} /> : <Icon name={o.icon} size={40} />}</span>
                <span className={p.tileName} style={{ fontFamily: look.font, textTransform: look.caps ? 'uppercase' : undefined }}>
                  {o.name}
                </span>
                <span className={p.tileOrigin}>{o.origin}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DeskPaywall(x: DeskPaywallProps) {
  const { t } = useTranslation()
  return (
    <div className={p.pw}>
      <div className={p.rings} aria-hidden />
      <div className={navCss.chrome}>
        <GlassButton icon="x" ariaLabel={t('a11y.close')} onClick={x.onClose} />
      </div>

      <section className={p.pitch}>
        <h1 className={p.title}>{t('paywall.title')}</h1>
        <p className={p.tag}>{t('paywall.tagline')}</p>
        <ul className={p.perks}>
          {x.benefits.map((b) => (
            <li key={b.title} className={p.perk}>
              <span className={p.perkIcon}>
                <Icon name={b.icon} weight="fill" size={22} />
              </span>
              <span className={p.perkTitle}>{b.title}</span>
              <span className={p.perkText}>{b.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <Worlds />

      <div className={p.card}>
        {x.owned ? (
          <span className={p.owned} aria-hidden>
            <Icon name="seal-check" weight="fill" size={34} />
          </span>
        ) : (
          <>
            <h2 className={p.cardHead}>{t('paywall.choose')}</h2>
            <div className={p.plans} role="radiogroup" aria-label={t('paywall.choose')}>
              {(['monthly', 'lifetime'] as const).map((pl) => (
                <button key={pl} type="button" role="radio" aria-checked={x.plan === pl} className={p.plan} onClick={() => x.onPlan(pl)}>
                  <span className={p.radio} aria-hidden>
                    <Icon name="check" weight="bold" size={12} />
                  </span>
                  <span className={p.planText}>
                    <span className={p.planName}>{t(`paywall.plan_${pl}`)}</span>
                    <span className={p.planNote}>{t(`paywall.note_${pl}`)}</span>
                  </span>
                  <span className={p.planPrice}>{t(`paywall.price_${pl}`)}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <p className={p.subline}>{x.subline}</p>
        <div className={p.actions}>
          <Button fullWidth disabled={x.busy} onClick={x.onAct}>
            {x.cta}
          </Button>
          {x.showBuy && (
            <Button fullWidth variant="secondary" disabled={x.busy} onClick={x.onBuy}>
              {x.buyLabel}
            </Button>
          )}
        </div>
        <div className={p.legal}>
          <button type="button" onClick={x.onRestore}>{t('paywall.restore')}</button>
          <span aria-hidden>·</span>
          <button type="button" onClick={() => x.onLegal('terms')}>{t('paywall.terms')}</button>
          <span aria-hidden>·</span>
          <button type="button" onClick={() => x.onLegal('privacy')}>{t('paywall.privacy')}</button>
        </div>
      </div>
    </div>
  )
}
