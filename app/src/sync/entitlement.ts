import { useStore } from '@/data/store'
import { now } from '@/lib/dates'
import { backendConfigured, callFunction } from './supabase'

interface ServerEntitlement {
  plus: 'none' | 'trial' | 'lifetime'
  trialStartedAt: string | null
}

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
    if (u && (u.plus !== e.plus || (u.trialStartedAt ?? null) !== e.trialStartedAt)) apply(e)
    return e
  } catch {
    return null
  }
}

/** Lifetime purchase: Stripe Checkout (one-time price). The webhook sets plus = 'lifetime' on the account. */
export async function startCheckout(): Promise<'redirected' | 'unavailable'> {
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
