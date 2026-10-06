// Ondas+ entitlement. The trial start time is set here, by the server, exactly once per account:
// reinstalling the app or clearing the device cannot restart it.
//   POST { action: 'start-trial' } -> { plus, trialStartedAt }
//   POST { action: 'status' }      -> { plus, trialStartedAt }   (also used by Restore)
import { HttpError, admin, json, requireUser, serve } from '../_shared/http.ts'

serve(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'POST only')
  const user = await requireUser(req)
  const { action } = (await req.json().catch(() => ({}))) as { action?: string }
  const db = admin()

  // Accounts created before the trigger existed still get a row.
  await db.from('profiles').upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true })

  if (action === 'start-trial') {
    // The WHERE clause is the guard: only an account that never had a trial and has not bought can start one.
    await db.from('profiles').update({ plus: 'trial', trial_started_at: new Date().toISOString() }).eq('user_id', user.id).eq('plus', 'none').is('trial_started_at', null)
  } else if (action !== 'status') {
    throw new HttpError(400, 'Unknown action')
  }

  const { data, error } = await db.from('profiles').select('plus, trial_started_at').eq('user_id', user.id).single()
  if (error) throw new HttpError(500, error.message)
  return json(req, { plus: data.plus, trialStartedAt: data.trial_started_at })
})
