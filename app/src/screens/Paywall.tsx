import { Suspense, lazy, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlus } from '@/data/hooks'
import { useDesk } from '@/lib/desk'
import navCss from '@/nav/nav.module.css'
import { useNav } from '@/nav/store'
import { BETA_PAYMENTS, paid, refreshEntitlement, startCheckout, startTrial, type PlusPlan } from '@/sync/entitlement'
import { accountInfo, backendConfigured } from '@/sync/supabase'
import { Button, GlassButton } from '@/ui/buttons'
import { Icon } from '@/ui/Icon'
import { beginPendingOnda } from './Onboarding'
import s from './screens.module.css'

// The desktop's two-column pitch is its own chunk: phones never load it.
const DeskPaywall = lazy(() => import('@/desk/settings/DeskPaywall'))

/** Ondas+: seven days free, then € 2,49 a month or € 24,99 once for life. Closable. */
export default function Paywall() {
  const { t } = useTranslation()
  const desk = useDesk()
  const plus = usePlus()
  const { pop, showToast, openSheet } = useNav()
  const [busy, setBusy] = useState(false)
  const [plan, setPlan] = useState<PlusPlan>('lifetime')
  const owned = plus.tier === 'lifetime' || plus.tier === 'monthly'

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

  const buyLabel = t(plan === 'monthly' ? 'paywall.getMonthly' : 'paywall.getLifetime')
  const cta = plus.tier === 'none' ? t('paywall.startTrial') : plus.tier === 'lifetime' ? t('paywall.done') : plus.tier === 'monthly' ? t('paywall.getLifetime') : buyLabel
  const subline =
    plus.tier === 'none' ? t('paywall.subFree') : plus.tier === 'lifetime' ? t('paywall.subLife') : plus.tier === 'monthly' ? t('paywall.subMonthly') : plus.tier === 'expired' ? t('paywall.subExpired') : t('paywall.subTrialLeft', { count: plus.daysLeft })

  const buy = async () => {
    // Buying needs a real (non-anonymous) account so the purchase can be restored on another device.
    // The beta placeholder needs no account: nothing is charged.
    const acct = backendConfigured && !BETA_PAYMENTS ? await accountInfo() : null
    if (backendConfigured && !BETA_PAYMENTS && (!acct || acct.anonymous)) {
      showToast(t('paywall.signInFirst'), { icon: 'user' })
      openSheet({ name: 'account' })
      return
    }
    const want: PlusPlan = plus.tier === 'monthly' ? 'lifetime' : plan
    const res = await startCheckout(want)
    if (res === 'granted') {
      showToast(t(want === 'monthly' ? 'paywall.monthlyUnlocked' : 'paywall.lifetimeUnlocked'), { icon: 'seal-check' })
      close()
    } else if (res === 'unavailable') showToast(t('paywall.checkoutUnavailable'), { icon: 'wifi-slash' })
  }

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
      await buy()
    } finally {
      setBusy(false)
    }
  }

  const restore = async () => {
    const e = await refreshEntitlement()
    showToast(paid(e?.plus) ? t('paywall.restored') : t('paywall.nothingToRestore'), { icon: paid(e?.plus) ? 'seal-check' : 'info' })
  }
  const buyNow = () => {
    setBusy(true)
    void buy().finally(() => setBusy(false))
  }

  if (desk) {
    return (
      <Suspense fallback={null}>
        <DeskPaywall
          benefits={benefits}
          owned={owned}
          plan={plan}
          onPlan={setPlan}
          busy={busy}
          cta={cta}
          subline={subline}
          buyLabel={buyLabel}
          showBuy={plus.tier === 'none'}
          onAct={act}
          onBuy={buyNow}
          onRestore={restore}
          onClose={close}
          onLegal={(doc) => openSheet({ name: 'legal', doc })}
        />
      </Suspense>
    )
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
        {!owned && (
          <div className={s.pwPlans} role="radiogroup" aria-label={t('paywall.choose')}>
            {(['monthly', 'lifetime'] as const).map((p) => (
              <button key={p} type="button" role="radio" aria-checked={plan === p} className={plan === p ? `${s.pwPlan} ${s.pwPlanOn}` : s.pwPlan} onClick={() => setPlan(p)}>
                <span className={s.pwPlanName}>{t(`paywall.plan_${p}`)}</span>
                <span className={s.pwPlanPrice}>{t(`paywall.price_${p}`)}</span>
                <span className={s.pwPlanNote}>{t(`paywall.note_${p}`)}</span>
              </button>
            ))}
          </div>
        )}
        <div className={s.pwSubline}>{subline}</div>
        <Button fullWidth disabled={busy} onClick={act}>
          {cta}
        </Button>
        {plus.tier === 'none' && (
          <Button fullWidth variant="secondary" disabled={busy} onClick={buyNow}>
            {buyLabel}
          </Button>
        )}
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
