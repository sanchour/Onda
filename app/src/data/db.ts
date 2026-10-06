import Dexie, { type Table } from 'dexie'
import type { Collection, Tables } from './types'

export interface OutboxRow {
  seq?: number
  collection: Collection
  id: string
}
export interface MetaRow {
  key: string
  value: unknown
}
export interface PhotoRow {
  id: string // check in id
  blob: Blob
  uploaded: boolean
}

/** IndexedDB: one table per collection, an outbox of unsynced writes, device metadata and local photo blobs. */
export class OndaDB extends Dexie {
  user!: Table<Tables['user'], string>
  lagos!: Table<Tables['lagos'], string>
  checkIns!: Table<Tables['checkIns'], string>
  runs!: Table<Tables['runs'], string>
  practiceLogs!: Table<Tables['practiceLogs'], string>
  ruleLogs!: Table<Tables['ruleLogs'], string>
  taskLogs!: Table<Tables['taskLogs'], string>
  immerseLogs!: Table<Tables['immerseLogs'], string>
  journal!: Table<Tables['journal'], string>
  reflections!: Table<Tables['reflections'], string>
  achievements!: Table<Tables['achievements'], string>
  customOndas!: Table<Tables['customOndas'], string>
  outbox!: Table<OutboxRow, number>
  meta!: Table<MetaRow, string>
  photos!: Table<PhotoRow, string>

  constructor(name = 'onda') {
    super(name)
    this.version(1).stores({
      user: 'id',
      lagos: 'id, startedAt',
      checkIns: 'id, lagoId, date',
      runs: 'id, state',
      practiceLogs: 'id, runId, date',
      ruleLogs: 'id, runId, date',
      taskLogs: 'id, runId, date',
      immerseLogs: 'id, runId',
      journal: 'id, runId',
      reflections: 'id, runId',
      achievements: 'id',
      customOndas: 'id',
      outbox: '++seq, [collection+id]',
      meta: 'key',
      photos: 'id',
    })
  }
}

export let db = new OndaDB()
/** Tests swap in a fresh database. */
export function useDatabase(next: OndaDB) {
  db = next
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined
}
export async function setMeta(key: string, value: unknown) {
  await db.meta.put({ key, value })
}
