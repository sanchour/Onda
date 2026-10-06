// Full delete (Settings > Data): photos in Storage, then the auth user. Every table cascades from auth.users.
//   DELETE -> { deleted: true }
import { HttpError, admin, json, requireUser, serve } from '../_shared/http.ts'
import { decrypt } from '../_shared/crypto.ts'
import { revokeNotionToken } from '../_shared/notion.ts'

serve(async (req) => {
  if (req.method !== 'DELETE') throw new HttpError(405, 'DELETE only')
  const user = await requireUser(req)
  const db = admin()

  // Leave nothing behind at Notion either.
  const { data: notion } = await db.from('notion_connections').select('access_token_enc').eq('user_id', user.id).maybeSingle()
  if (notion) await revokeNotionToken(await decrypt(notion.access_token_enc)).catch(() => undefined)

  for (;;) {
    const { data: files, error } = await db.storage.from('photos').list(user.id, { limit: 100 })
    if (error || !files?.length) break
    await db.storage.from('photos').remove(files.map((f) => `${user.id}/${f.name}`))
    if (files.length < 100) break
  }

  const { error } = await db.auth.admin.deleteUser(user.id)
  if (error) throw new HttpError(500, error.message)
  return json(req, { deleted: true })
})
