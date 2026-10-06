import type { BaseRecord } from './types'

const META = new Set(['id', '_f', 'updatedAt', 'deviceId'])
const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b)

/** Stamp a local write: every field whose value changed gets `now` in the per-field clock. */
export function stamp<T extends BaseRecord>(prev: T | undefined, next: T, now: number, deviceId: string): T {
  const f: Record<string, number> = { ...(prev?._f ?? {}) }
  const a = prev as unknown as Record<string, unknown> | undefined
  const b = next as unknown as Record<string, unknown>
  for (const k of Object.keys(b)) {
    if (META.has(k)) continue
    if (!a || !same(a[k], b[k])) f[k] = now
  }
  return { ...next, _f: f, updatedAt: now, deviceId }
}

const clockOf = (r: BaseRecord, k: string) => r._f?.[k] ?? r.updatedAt ?? 0

/** Merge two versions of one record, last-write-wins per field.
 *  Ties break on deviceId so every replica converges on the same value regardless of merge order. */
export function mergeRecord<T extends BaseRecord>(local: T | undefined, remote: T): T {
  if (!local) return remote
  const a = local as unknown as Record<string, unknown>
  const b = remote as unknown as Record<string, unknown>
  const out: Record<string, unknown> = { id: local.id }
  const f: Record<string, number> = {}
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (META.has(k)) continue
    const ta = k in a ? clockOf(local, k) : -1
    const tb = k in b ? clockOf(remote, k) : -1
    const takeRemote = tb > ta || (tb === ta && remote.deviceId > local.deviceId)
    out[k] = takeRemote ? b[k] : a[k]
    f[k] = Math.max(ta, tb)
  }
  const remoteNewer = remote.updatedAt > local.updatedAt || (remote.updatedAt === local.updatedAt && remote.deviceId > local.deviceId)
  out._f = f
  out.updatedAt = Math.max(local.updatedAt, remote.updatedAt)
  out.deviceId = remoteNewer ? remote.deviceId : local.deviceId
  return out as unknown as T
}

/** True when merging changed nothing the local replica can see. */
export function unchanged<T extends BaseRecord>(a: T | undefined, b: T): boolean {
  return !!a && JSON.stringify(a) === JSON.stringify(b)
}
