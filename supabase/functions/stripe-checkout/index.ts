// Buying Ondas+: a Stripe Checkout Session.
//   lifetime: the one-time price (STRIPE_PRICE_ID, € 24,99)
//   monthly:  the recurring price (STRIPE_PRICE_MONTHLY, € 2,49 a month)
//   POST { returnUrl, plan? } -> { url }
// StoreKit is not available to a PWA; see DECISIONS.md for the App Store implications.
import { HttpError, admin, env, json, requireUser, serve } from '../_shared/http.ts'

serve(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'POST only')
  const user = await requireUser(req)
  if (user.is_anonymous) throw new HttpError(403, 'Sign in before buying, so the purchase can be restored')
  const { returnUrl, plan } = (await req.json().catch(() => ({}))) as { returnUrl?: string; plan?: string }
  const monthly = plan === 'monthly'
  const allowed = env('APP_ORIGINS', 'http://localhost:5173').split(',').map((s) => s.trim())
  // Keep the app's base path (GitHub Pages serves it from /<repo>/); only the origin has to be allow-listed.
  const u = returnUrl ? new URL(returnUrl) : null
  const base = u && allowed.includes(u.origin) ? u.origin + u.pathname.replace(/\/$/, '') : allowed[0]!

  const { data: profile } = await admin().from('profiles').select('plus').eq('user_id', user.id).maybeSingle()
  if (profile?.plus === 'lifetime') throw new HttpError(409, 'Already purchased')
  if (monthly && profile?.plus === 'monthly') throw new HttpError(409, 'Already subscribed')

  const form = new URLSearchParams({
    mode: monthly ? 'subscription' : 'payment',
    'line_items[0][price]': env(monthly ? 'STRIPE_PRICE_MONTHLY' : 'STRIPE_PRICE_ID'),
    'line_items[0][quantity]': '1',
    client_reference_id: user.id,
    'metadata[user_id]': user.id,
    'metadata[plan]': monthly ? 'monthly' : 'lifetime',
    [monthly ? 'subscription_data[metadata][user_id]' : 'payment_intent_data[metadata][user_id]']: user.id,
    success_url: `${base}/?purchase=success`,
    cancel_url: `${base}/?purchase=cancelled`,
    allow_promotion_codes: 'true',
  })
  if (user.email) form.set('customer_email', user.email)

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('STRIPE_SECRET_KEY')}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': `checkout-${monthly ? 'm' : 'l'}-${user.id}-${Math.floor(Date.now() / 60000)}` },
    body: form,
  })
  const session = await res.json()
  if (!res.ok) throw new HttpError(502, session?.error?.message ?? 'Stripe error')
  return json(req, { url: session.url })
})
