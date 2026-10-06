import { useStore } from '@/data/store'
import { isIOS, isStandalone } from '@/lib/platform'
import { backendConfigured, callFunction, ensureSession, getSupabase } from './supabase'

/* Web Push. iOS delivers it only to an installed (Home Screen) PWA on iOS 16.4+, and only after the user
   grants permission from a tap. Without a backend there is nothing to send reminders, so we say so. */

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export type PushState = 'unsupported' | 'needs-install' | 'not-configured' | 'default' | 'granted' | 'denied'

export function pushState(): PushState {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    // iOS Safari in a tab has no PushManager at all: it appears once the app is on the Home Screen.
    return isIOS() && !isStandalone() ? 'needs-install' : 'unsupported'
  }
  if (isIOS() && !isStandalone()) return 'needs-install'
  if (!backendConfigured || !VAPID) return Notification.permission === 'granted' ? 'granted' : 'not-configured'
  return Notification.permission
}

function keyBytes(base64url: string): Uint8Array {
  const b64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

/** Ask for permission (call this from a tap) and register this device's subscription with the server. */
export async function enablePush(): Promise<PushState> {
  const st = pushState()
  if (st === 'unsupported' || st === 'needs-install' || st === 'denied') return st
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return perm
  await saveSubscription()
  return 'granted'
}

export async function saveSubscription(): Promise<boolean> {
  if (!backendConfigured || !VAPID || !('serviceWorker' in navigator)) return false
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID) as BufferSource }))
  const json = sub.toJSON()
  const sb = await getSupabase()
  const session = await ensureSession()
  if (!sb || !session || !json.endpoint) return false
  const settings = useStore.getState().user?.settings
  const { error } = await sb.from('push_subscriptions').upsert(
    {
      user_id: session.user.id,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
      device_id: useStore.getState().deviceId,
      timezone: settings?.timezone ?? 'UTC',
      user_agent: navigator.userAgent.slice(0, 200),
    },
    { onConflict: 'endpoint' },
  )
  return !error
}

export async function disablePush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  const sb = await getSupabase()
  await sb?.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

/** Ask the server to push a test notification to this account's devices. Falls back to a local one. */
export async function sendTestPush(title: string, body: string): Promise<boolean> {
  try {
    if (backendConfigured && VAPID) {
      await callFunction('push-send', { body: { action: 'test' } })
      return true
    }
    const reg = await navigator.serviceWorker.ready
    await reg.showNotification(title, { body, icon: '/icons/icon-192.png', tag: 'test' })
    return true
  } catch {
    return false
  }
}
