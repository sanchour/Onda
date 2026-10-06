import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useStore } from '@/data/store'
import { refreshEntitlement } from './entitlement'
import { loadSyncMeta, refreshPending, subscribeRealtime, syncNow } from './engine'
import { backendConfigured, getSupabase } from './supabase'

/** Mounted once. Keeps the device and the server in step: on launch, on every local write (debounced),
 *  when the network returns, on a slow interval, and whenever another device writes (Realtime). */
export function useSync() {
  const ready = useStore((s) => s.ready)
  const dirty = useStore((s) => s.dirty)
  const qc = useQueryClient()
  const sync = useMutation({ mutationKey: ['sync'], mutationFn: syncNow, retry: 2 })
  const mutate = useRef(sync.mutate)
  mutate.current = sync.mutate

  // Periodic pull (also the launch sync)
  useQuery({
    queryKey: ['sync', 'round'],
    queryFn: async () => {
      await syncNow()
      await refreshEntitlement()
      return Date.now()
    },
    enabled: ready && backendConfigured,
    refetchInterval: 5 * 60_000,
    refetchOnReconnect: true,
    staleTime: 60_000,
  })

  // Local writes: push a couple of seconds after the last change
  useEffect(() => {
    if (!ready) return
    void refreshPending()
    if (!backendConfigured || dirty === 0) return
    const id = setTimeout(() => mutate.current(), 2000)
    return () => clearTimeout(id)
  }, [dirty, ready])

  useEffect(() => {
    if (!ready) return
    void loadSyncMeta()
    if (!backendConfigured) return
    let off: (() => void) | undefined
    let dead = false
    void subscribeRealtime(() => mutate.current()).then((fn) => (dead ? fn() : (off = fn)))
    const online = () => mutate.current()
    const visible = () => document.visibilityState === 'visible' && mutate.current()
    window.addEventListener('online', online)
    document.addEventListener('visibilitychange', visible)
    // Returning from a magic link, Apple sign-in or Stripe: the session or entitlement may have changed.
    let unsub: (() => void) | undefined
    void getSupabase()?.then((sb) => {
      const { data } = sb.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'SIGNED_OUT') {
          void qc.invalidateQueries({ queryKey: ['account'] })
          void qc.invalidateQueries({ queryKey: ['integrations'] })
          mutate.current()
          void refreshEntitlement()
        }
      })
      unsub = () => data.subscription.unsubscribe()
    })
    return () => {
      dead = true
      off?.()
      unsub?.()
      window.removeEventListener('online', online)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [ready, qc])
}
