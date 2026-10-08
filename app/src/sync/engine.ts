import { create } from 'zustand'
import { db, getMeta, setMeta } from '@/data/db'
import { LOCAL_PREFIX } from '@/data/photos'
import { useStore } from '@/data/store'
import { COLLECTIONS, type BaseRecord, type Collection } from '@/data/types'
import { backendConfigured, ensureSession, getSupabase } from './supabase'

/* Sync engine. The device database is the source of truth; the server is a replica.
   Push: drain the outbox through the push_records RPC, which merges last-write-wins per field.
   Pull: read every row whose server sequence is past our cursor and merge it the same way.
   Both directions are idempotent, so retries and overlapping runs are safe. */

interface SyncState {
  status: 'idle' | 'syncing' | 'error' | 'offline' | 'local'
  lastSyncedAt: number | null
  pending: number
  error: string | null
}
export const useSyncState = create<SyncState>()(() => ({ status: backendConfigured ? 'idle' : 'local', lastSyncedAt: null, pending: 0, error: null }))

const BATCH = 200
let running: Promise<void> | null = null

export async function refreshPending() {
  useSyncState.setState({ pending: await db.outbox.count() })
}

/** Queue every local record again, e.g. after signing in to a different account. */
export async function enqueueAll() {
  await db.transaction('rw', [db.outbox, ...COLLECTIONS.map((c) => db.table(c))], async () => {
    await db.outbox.clear()
    for (const c of COLLECTIONS) {
      const ids = (await db.table(c).toCollection().primaryKeys()) as string[]
      await db.outbox.bulkAdd(ids.map((id) => ({ collection: c, id })))
    }
  })
}

async function push(): Promise<number> {
  const sb = await getSupabase()
  if (!sb) return 0
  let sent = 0
  for (;;) {
    const rows = await db.outbox.orderBy('seq').limit(BATCH).toArray()
    if (!rows.length) break
    const payload: { collection: Collection; id: string; data: BaseRecord }[] = []
    for (const r of rows) {
      const data = (await db.table(r.collection).get(r.id)) as BaseRecord | undefined
      if (data) payload.push({ collection: r.collection, id: r.id, data })
    }
    if (payload.length) {
      const { error } = await sb.rpc('push_records', { p_records: payload })
      if (error) throw new Error(error.message)
    }
    await db.outbox.bulkDelete(rows.map((r) => r.seq!))
    sent += payload.length
    if (rows.length < BATCH) break
  }
  return sent
}

async function pull(): Promise<number> {
  const sb = await getSupabase()
  if (!sb) return 0
  const { SCHEMAS } = await import('@/data/schemas')
  let cursor = (await getMeta<number>('pullCursor')) ?? 0
  let got = 0
  for (;;) {
    const { data, error } = await sb.from('records').select('collection,id,data,seq').gt('seq', cursor).order('seq', { ascending: true }).limit(500)
    if (error) throw new Error(error.message)
    if (!data?.length) break
    const byCollection = new Map<Collection, BaseRecord[]>()
    for (const row of data as { collection: Collection; id: string; data: unknown; seq: number }[]) {
      const schema = SCHEMAS[row.collection]
      const parsed = schema?.safeParse(row.data)
      // A row this build cannot read (newer schema) is skipped, not fatal.
      if (parsed?.success) {
        const list = byCollection.get(row.collection) ?? []
        list.push(parsed.data as BaseRecord)
        byCollection.set(row.collection, list)
      }
      cursor = Math.max(cursor, row.seq)
    }
    for (const [c, list] of byCollection) await useStore.getState().applyRemote(c, list as never)
    got += data.length
    await setMeta('pullCursor', cursor)
    if (data.length < 500) break
  }
  return got
}

async function uploadPhotos() {
  const sb = await getSupabase()
  const session = await ensureSession()
  if (!sb || !session) return
  const waiting = await db.photos.filter((p) => !p.uploaded).toArray()
  for (const p of waiting) {
    const path = `${session.user.id}/${p.id}.jpg`
    const { error } = await sb.storage.from('photos').upload(path, p.blob, { upsert: true, contentType: 'image/jpeg' })
    if (error) continue
    await db.photos.update(p.id, { uploaded: true })
    const c = useStore.getState().checkIns.find((x) => x.id === p.id)
    if (c && (!c.photoPath || c.photoPath.startsWith(LOCAL_PREFIX))) useStore.getState().checkIn(c.lagoId, { date: c.date, status: c.status, note: c.note, at: c.at, photoPath: path })
  }
}

export async function signedPhotoUrl(path: string): Promise<string | null> {
  const sb = await getSupabase()
  if (!sb) return null
  const { data } = await sb.storage.from('photos').createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}

/** One full round: account check, push, pull, photo upload. Concurrent calls share the same run. */
export function syncNow(): Promise<void> {
  if (!backendConfigured) return Promise.resolve()
  running ??= (async () => {
    if (!navigator.onLine) {
      useSyncState.setState({ status: 'offline' })
      await refreshPending()
      return
    }
    useSyncState.setState({ status: 'syncing', error: null })
    try {
      const session = await ensureSession()
      if (!session) throw new Error('no-session')
      // A different account on this device: start its cursor from zero and upload everything we hold.
      const lastUser = await getMeta<string>('syncUser')
      if (lastUser !== session.user.id) {
        await setMeta('pullCursor', 0)
        await enqueueAll()
        await setMeta('syncUser', session.user.id)
      }
      await push()
      await pull()
      await uploadPhotos()
      await push()
      useSyncState.setState({ status: 'idle', lastSyncedAt: Date.now() })
      await setMeta('lastSyncedAt', Date.now())
    } catch (e) {
      useSyncState.setState({ status: 'error', error: e instanceof Error ? e.message : String(e) })
    } finally {
      await refreshPending()
    }
  })().finally(() => {
    running = null
  })
  return running
}

/** Realtime: another device wrote something, so pull. Returns an unsubscribe function. */
export async function subscribeRealtime(onChange: () => void): Promise<() => void> {
  const sb = await getSupabase()
  const session = await ensureSession()
  if (!sb || !session) return () => undefined
  const channel = sb
    .channel(`records:${session.user.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'records', filter: `user_id=eq.${session.user.id}` }, (payload) => {
      const dev = (payload.new as { data?: { deviceId?: string } } | null)?.data?.deviceId
      if (dev !== useStore.getState().deviceId) onChange()
    })
    .subscribe()
  return () => void sb.removeChannel(channel)
}

export async function loadSyncMeta() {
  useSyncState.setState({ lastSyncedAt: (await getMeta<number>('lastSyncedAt')) ?? null, pending: await db.outbox.count() })
}

/** Delete the account and everything synced for it, then wipe this device. */
export async function deleteAccount(): Promise<void> {
  const { callFunction, signOut } = await import('./supabase')
  if (backendConfigured) {
    await callFunction('account', { method: 'DELETE' })
    await signOut()
  }
  await setMeta('pullCursor', 0)
  await setMeta('syncUser', null)
  await useStore.getState().resetAll()
}
