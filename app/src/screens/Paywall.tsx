import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlus } from '@/data/hooks'
import navCss from '@/nav/nav.module.css'
import { useNav } from '@/nav/store'
import { refreshEntitlement, startCheckout, startTrial } from '@/sync/entitlement'
import { accountInfo, backendConfigured } from '@/sync/supabase'
import { Button, GlassButton } from '@/ui/buttons'
import { Icon } from '@/ui/Icon'
import { beginPendingOnda } from './Onboarding'
import s from './screens.module.css'

/** Ondas+: seven days free, then a single lifetime purchase. Closable. */
export default function Paywall() {
  const { t } = useTranslation()
  const plus = usePlus()
  const { pop, showToast, openSheet } = useNav()
  const [busy, setBusy] = useState(false)

  const close = () => {
    void beginPendingOnda()
    pop()
  }

  const benefits = [
    { icon: 'waves', title: t('paywall.b1'), text: t('paywall.b1t') },
    { icon: 'infinity', title: t('paywall.b2'), text: t('paywall.b2t') },
    { icon: 'arrows-clockwise', title: t('paywall.b3'), text: t('paywall.b3t') },
    { icon: 'lock', title: t('paywall.b4'), text: t('paywall.b4t') },
  ]

  const cta = plus.tier === 'none' ? t('paywall.startTrial') : plus.tier === 'lifetime' ? t('paywall.done') : t('paywall.getLifetime')
  const subline =
    plus.tier === 'none' ? t('paywall.subFree') : plus.tier === 'lifetime' ? t('paywall.subLife') : plus.tier === 'expired' ? t('paywall.subExpired') : t('paywall.subTrialLeft', { count: plus.daysLeft })

  const act = async () => {
    if (busy) return
    if (plus.tier === 'lifetime') return close()
    setBusy(true)
    try {
      if (plus.tier === 'none') {
        await startTrial()
        showToast(t('paywall.trialStarted'), { icon: 'seal-check' })
        close()
        return
      }
      // Buying needs a real (non-anonymous) account so the purchase can be restored on another device.
      const acct = backendConfigured ? await accountInfo() : null
      if (backendConfigured && (!acct || acct.anonymous)) {
        showToast(t('paywall.signInFirst'), { icon: 'user' })
        openSheet({ name: 'account' })
        return
      }
      if ((await startCheckout()) === 'unavailable') showToast(t('paywall.checkoutUnavailable'), { icon: 'wifi-slash' })
    } finally {
      setBusy(false)
    }
  }

  const restore = async () => {
    const e = await refreshEntitlement()
    showToast(e?.plus === 'lifetime' ? t('paywall.restored') : t('paywall.nothingToRestore'), { icon: e?.plus === 'lifetime' ? 'seal-check' : 'info' })
  }

  return (
    <div className={s.pw}>
      <div className={s.pwRings} aria-hidden />
      <div className={navCss.chrome}>
        <GlassButton icon="x" ariaLabel={t('a11y.close')} onClick={close} />
      </div>
      <div className={s.pwHead}>
        <h1 className={s.pwTitle}>{t('paywall.title')}</h1>
        <div className={s.pwTag}>{t('paywall.tagline')}</div>
      </div>
      <div className={s.pwBenefits}>
        {benefits.map((b) => (
          <div key={b.title} className={s.pwBenefit}>
            <div className={`${s.circle} ${s.pwIcon}`}>
              <Icon name={b.icon} weight="fill" size={22} />
            </div>
            <div>
              <div className={s.pwBTitle}>{b.title}</div>
              <div className={s.sub}>{b.text}</div>
            </div>
          </div>
        ))}
      </div>
      <div className={s.pwFoot}>
        <div className={s.pwSubline}>{subline}</div>
        <Button fullWidth disabled={busy} onClick={act}>
          {cta}
        </Button>
        <div className={s.pwLegal}>
          <button type="button" onClick={restore}>{t('paywall.restore')}</button>
          <span aria-hidden>•</span>
          <button type="button" onClick={() => openSheet({ name: 'legal', doc: 'terms' })}>{t('paywall.terms')}</button>
          <span aria-hidden>•</span>
          <button type="button" onClick={() => openSheet({ name: 'legal', doc: 'privacy' })}>{t('paywall.privacy')}</button>
        </div>
      </div>
    </div>
  )
}
