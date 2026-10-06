// Notion public integration (OAuth). Deploy with --no-verify-jwt: Notion's redirect carries no JWT,
// so POST actions authenticate the user explicitly and the GET callback trusts only its signed `state`.
//   POST { action: 'start', returnUrl }  -> { url }           the Notion consent page
//   GET  ?code=...&state=...             -> 302 back to the app with ?notion=connected | error
//   POST { action: 'disconnect' }        -> { disconnected }  revokes the token and removes it
// Tokens are AES-GCM encrypted before they are stored and are never sent to the client.
import { decrypt, encrypt, signState, verifyState } from '../_shared/crypto.ts'
import { HttpError, admin, cors, env, json, requireUser } from '../_shared/http.ts'
import { Notion, ensureWorkspace, exchangeCode, revokeNotionToken } from '../_shared/notion.ts'

const redirectUri = () => `${env('SUPABASE_URL')}/functions/v1/notion-oauth`
const appOrigins = () => env('APP_ORIGINS', 'http://localhost:5173').split(',').map((s) => s.trim())

async function callback(url: URL): Promise<Response> {
  const state = await verifyState<{ uid: string; returnUrl: string }>(url.searchParams.get('state') ?? '')
  const back = (status: string) => Response.redirect(`${state?.returnUrl ?? appOrigins()[0]}/?notion=${status}`, 302)
  const code = url.searchParams.get('code')
  if (!state || !code || url.searchParams.get('error')) return back('error')

  const db = admin()
  try {
    const tok = await exchangeCode(code, redirectUri())
    const n = new Notion(tok.access_token)
    // Store the connection first so a failure while creating databases can be retried with Sync Now.
    await db.from('notion_connections').upsert({
      user_id: state.uid,
      access_token_enc: await encrypt(tok.access_token),
      workspace_id: tok.workspace_id,
      workspace_name: tok.workspace_name,
      bot_id: tok.bot_id,
      parent_page_id: null,
      database_ids: {},
      last_error: null,
      failed: 0,
    })
    try {
      const ws = await ensureWorkspace(n, { parent_page_id: null, database_ids: {} }, tok.duplicated_template_id)
      await db.from('notion_connections').update(ws).eq('user_id', state.uid)
    } catch (e) {
      await db.from('notion_connections').update({ last_error: `Setup: ${(e as Error).message}. Share a page with Onda in Notion, then tap Sync Now.` }).eq('user_id', state.uid)
    }
    // Everything already on the server goes into the first sync.
    const { data: rows } = await db.from('records').select('collection, id').eq('user_id', state.uid).in('collection', ['lagos', 'checkIns', 'runs', 'journal', 'reflections'])
    if (rows?.length) {
      await db.from('notion_queue').upsert(rows.map((r) => ({ user_id: state.uid, collection: r.collection, record_id: r.id, run_after: new Date().toISOString() })), { onConflict: 'user_id,collection,record_id' })
    }
    return back('connected')
  } catch (e) {
    console.error(e)
    return back('error')
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  try {
    const url = new URL(req.url)
    if (req.method === 'GET') return await callback(url)
    if (req.method !== 'POST') throw new HttpError(405, 'GET or POST')

    const user = await requireUser(req)
    const body = (await req.json().catch(() => ({}))) as { action?: string; returnUrl?: string }
    const db = admin()

    if (body.action === 'start') {
      const origin = body.returnUrl ? new URL(body.returnUrl).origin : ''
      if (!appOrigins().includes(origin)) throw new HttpError(400, 'returnUrl is not an allowed origin')
      const state = await signState({ uid: user.id, returnUrl: origin })
      const q = new URLSearchParams({ client_id: env('NOTION_CLIENT_ID'), response_type: 'code', owner: 'user', redirect_uri: redirectUri(), state })
      return json(req, { url: `https://api.notion.com/v1/oauth/authorize?${q}` })
    }

    if (body.action === 'disconnect') {
      const { data } = await db.from('notion_connections').select('access_token_enc').eq('user_id', user.id).maybeSingle()
      if (data) await revokeNotionToken(await decrypt(data.access_token_enc)).catch((e) => console.error('revoke failed', e))
      await db.from('notion_queue').delete().eq('user_id', user.id)
      await db.from('notion_pages').delete().eq('user_id', user.id)
      await db.from('notion_connections').delete().eq('user_id', user.id)
      return json(req, { disconnected: true })
    }
    throw new HttpError(400, 'Unknown action')
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500
    if (status >= 500) console.error(e)
    return json(req, { error: e instanceof Error ? e.message : 'Internal error' }, status)
  }
})
