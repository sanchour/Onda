// Lifetime purchase: a Stripe Checkout Session for the one-time price (STRIPE_PRICE_ID, € 14,99).
//   POST { returnUrl } -> { url }
// StoreKit is not available to a PWA; see DECISIONS.md for the App Store implications.
import { HttpError, admin, env, json, requireUser, serve } from '../_shared/http.ts'

serve(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'POST only')
  const user = await requireUser(req)
  if (user.is_anonymous) throw new HttpError(403, 'Sign in before buying, so the purchase can be restored')
  const { returnUrl } = (await req.json().catch(() => ({}))) as { returnUrl?: string }
  const allowed = env('APP_ORIGINS', 'http://localhost:5173').split(',').map((s) => s.trim())
  const base = returnUrl && allowed.includes(new URL(returnUrl).origin) ? new URL(returnUrl).origin : allowed[0]!

  const { data: profile } = await admin().from('profiles').select('plus').eq('user_id', user.id).maybeSingle()
  if (profile?.plus === 'lifetime') throw new HttpError(409, 'Already purchased')

  const form = new URLSearchParams({
    mode: 'payment',
    'line_items[0][price]': env('STRIPE_PRICE_ID'),
    'line_items[0][quantity]': '1',
    client_reference_id: user.id,
    'metadata[user_id]': user.id,
    'payment_intent_data[metadata][user_id]': user.id,
    success_url: `${base}/?purchase=success`,
    cancel_url: `${base}/?purchase=cancelled`,
    allow_promotion_codes: 'true',
  })
  if (user.email) form.set('customer_email', user.email)

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('STRIPE_SECRET_KEY')}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': `checkout-${user.id}-${Math.floor(Date.now() / 60000)}` },
    body: form,
  })
  const session = await res.json()
  if (!res.ok) throw new HttpError(502, session?.error?.message ?? 'Stripe error')
  return json(req, { url: session.url })
})
