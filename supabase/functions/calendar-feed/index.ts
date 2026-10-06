// Private ICS subscription feed. Deploy with --no-verify-jwt: Calendar apps cannot send a JWT,
// so the unguessable token in the URL is the credential. Rotating the token (Settings > Calendar) revokes access.
//   GET ?token=<48 hex>  -> text/calendar
// Subscribe on iOS with the same URL using the webcal:// scheme.
import { buildIcs } from '../_shared/feeds.ts'
import { admin } from '../_shared/http.ts'
import { loadFeedData, ownerOfToken } from '../_shared/records.ts'

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('GET only', { status: 405 })
  const db = admin()
  const userId = await ownerOfToken(db, 'calendar', new URL(req.url).searchParams.get('token'))
  // Same response for a missing and a rotated token: nothing to probe.
  if (!userId) return new Response('Not found', { status: 404 })
  try {
    const ics = buildIcs(await loadFeedData(db, userId))
    return new Response(req.method === 'HEAD' ? null : ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="onda.ics"',
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (e) {
    console.error(e)
    return new Response('Feed error', { status: 500 })
  }
})
