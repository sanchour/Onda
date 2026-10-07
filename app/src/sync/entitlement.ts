import { useStore } from '@/data/store'
import { now } from '@/lib/dates'
import { backendConfigured, callFunction } from './supabase'

interface ServerEntitlement {
  plus: 'none' | 'trial' | 'lifetime'
  trialStartedAt: string | null
}

/** Ondas+ is a placeholder during the beta: "Buy lifetime" unlocks on the device and nothing is charged.
 *  Set VITE_PAYMENTS=live at build time to use the real Stripe Checkout flow instead. */
export const BETA_PAYMENTS = import.meta.env.VITE_PAYMENTS !== 'live'

const apply = (e: ServerEntitlement) => useStore.getState().setEntitlement({ plus: e.plus, trialStartedAt: e.trialStartedAt })

/** Start the 7 day trial. With a backend the start time is set and verified by the server (it cannot be restarted
 *  by reinstalling); in local mode it is recorded on the device. Returns false if a trial was already used. */
export async function startTrial(): Promise<boolean> {
  const user = useStore.getState().user
  if (user?.trialStartedAt || user?.plus === 'lifetime') return false
  if (backendConfigured && navigator.onLine) {
    try {
      apply(await callFunction<ServerEntitlement>('entitlement', { body: { action: 'start-trial' } }))
      return true
    } catch (e) {
      console.warn('[onda] server trial start failed, starting locally', e)
    }
  }
  useStore.getState().setEntitlement({ plus: 'trial', trialStartedAt: now().toISOString() })
  return true
}

/** Re-read the entitlement for this account (Restore, and on every launch). */
export async function refreshEntitlement(): Promise<ServerEntitlement | null> {
  if (!backendConfigured || !navigator.onLine) return null
  try {
    const e = await callFunction<ServerEntitlement>('entitlement', { body: { action: 'status' } })
    const u = useStore.getState().user
    // A lifetime unlock made in the beta is never taken back by a server that has no purchase on record.
    if (BETA_PAYMENTS && u?.plus === 'lifetime' && e.plus !== 'lifetime') return e
    if (u && (u.plus !== e.plus || (u.trialStartedAt ?? null) !== e.trialStartedAt)) apply(e)
    return e
  } catch {
    return null
  }
}

/** Lifetime purchase: Stripe Checkout (one-time price). The webhook sets plus = 'lifetime' on the account.
 *  In the beta (see BETA_PAYMENTS) this is a placeholder that unlocks immediately. */
export async function startCheckout(): Promise<'redirected' | 'granted' | 'unavailable'> {
  if (BETA_PAYMENTS) {
    useStore.getState().setEntitlement({ plus: 'lifetime' })
    return 'granted'
  }
  if (!backendConfigured || !navigator.onLine) return 'unavailable'
  try {
    const { url } = await callFunction<{ url: string }>('stripe-checkout', { body: { returnUrl: window.location.origin + import.meta.env.BASE_URL } })
    window.location.assign(url)
    return 'redirected'
  } catch (e) {
    console.warn('[onda] checkout failed', e)
    return 'unavailable'
  }
}
