import { FREE_LAGO_LIMIT, FREE_ONDA_ID, TRIAL_DAYS } from './catalog'
import type { User } from './types'

export type PlusState = { tier: 'lifetime' } | { tier: 'trial'; daysLeft: number } | { tier: 'expired' } | { tier: 'none' }

/** What the user is entitled to right now. A trial lasts TRIAL_DAYS from trialStartedAt (a server timestamp when signed in). */
export function plusState(user: Pick<User, 'plus' | 'trialStartedAt'> | null | undefined, nowMs: number): PlusState {
  if (!user) return { tier: 'none' }
  if (user.plus === 'lifetime') return { tier: 'lifetime' }
  if (user.trialStartedAt) {
    const left = Math.ceil((new Date(user.trialStartedAt).getTime() + TRIAL_DAYS * 86400000 - nowMs) / 86400000)
    return left > 0 ? { tier: 'trial', daysLeft: Math.min(TRIAL_DAYS, left) } : { tier: 'expired' }
  }
  return { tier: 'none' }
}

export const hasPlus = (s: PlusState) => s.tier === 'lifetime' || s.tier === 'trial'

/** Free tier: three running Lagos, Stoicism, no custom Ondas, no integrations. Plus unlocks everything. */
export const canStartLago = (s: PlusState, activeLagos: number) => hasPlus(s) || activeLagos < FREE_LAGO_LIMIT
export const canBeginOnda = (s: PlusState, ondaId: string) => hasPlus(s) || ondaId === FREE_ONDA_ID
export const canCreateOnda = (s: PlusState) => hasPlus(s)
export const canUseIntegrations = (s: PlusState) => hasPlus(s)
