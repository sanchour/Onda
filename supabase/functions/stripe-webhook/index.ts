// Stripe webhook: the only place `plus = 'lifetime'` or `plus = 'monthly'` is ever set.
// Deploy with --no-verify-jwt (Stripe cannot send a Supabase JWT); the signature check below is the authentication.
// Events: checkout.session.completed, checkout.session.async_payment_succeeded, charge.refunded,
//         customer.subscription.updated, customer.subscription.deleted.
import { admin, env, timingSafeEqual } from '../_shared/http.ts'
import { hmacHex } from '../_shared/crypto.ts'

const TOLERANCE_S = 300

async function verify(payload: string, header: string | null): Promise<boolean> {
  if (!header) return false
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]))
  const t = Number(parts.t)
  if (!t || Math.abs(Date.now() / 1000 - t) > TOLERANCE_S) return false
  const expected = await hmacHex(env('STRIPE_WEBHOOK_SECRET'), `${t}.${payload}`)
  // A header may carry several v1 signatures during secret rotation.
  return header.split(',').filter((p) => p.startsWith('v1=')).some((p) => timingSafeEqual(p.slice(3), expected))
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  const payload = await req.text()
  if (!(await verify(payload, req.headers.get('stripe-signature')))) return new Response('Bad signature', { status: 400 })

  const event = JSON.parse(payload) as { type: string; data: { object: Record<string, unknown> } }
  const obj = event.data.object
  const db = admin()

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const userId = (obj.client_reference_id as string | null) ?? (obj.metadata as Record<string, string> | undefined)?.user_id
    if (userId && obj.payment_status === 'paid') {
      const monthly = obj.mode === 'subscription'
      // a subscription bought by someone who already owns lifetime must not downgrade them
      const { data: have } = monthly ? await db.from('profiles').select('plus').eq('user_id', userId).maybeSingle() : { data: null }
      const plus = monthly && have?.plus !== 'lifetime' ? 'monthly' : 'lifetime'
      const { error } = await db
        .from('profiles')
        .upsert({ user_id: userId, plus, stripe_customer_id: (obj.customer as string | null) ?? null, stripe_session_id: obj.id as string, ...(monthly ? { stripe_subscription_id: (obj.subscription as string | null) ?? null } : {}) }, { onConflict: 'user_id' })
      // A 500 makes Stripe retry, which is what we want if the database was briefly unavailable.
      if (error) return new Response(error.message, { status: 500 })
    }
  } else if (event.type === 'charge.refunded') {
    const userId = (obj.metadata as Record<string, string> | undefined)?.user_id
    if (userId && obj.refunded === true) await db.from('profiles').update({ plus: 'none' }).eq('user_id', userId).eq('plus', 'lifetime')
  } else if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
    // The subscription ended, or stopped being paid for: monthly access goes, lifetime is never touched.
    const userId = (obj.metadata as Record<string, string> | undefined)?.user_id
    const status = obj.status as string
    const over = event.type === 'customer.subscription.deleted' || status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired'
    if (userId && over) {
      const { error } = await db.from('profiles').update({ plus: 'none' }).eq('user_id', userId).eq('plus', 'monthly')
      if (error) return new Response(error.message, { status: 500 })
    } else if (userId && (status === 'active' || status === 'trialing')) {
      await db.from('profiles').update({ plus: 'monthly' }).eq('user_id', userId).eq('plus', 'none')
    }
  }
  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })
})
