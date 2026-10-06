/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope

/* Offline: the whole app shell, every route chunk and every Onda's content are precached on first load. */
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
clientsClaim()

// SPA: every navigation gets the cached shell.
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/functions\//, /\.ics$/] }))

// Font subsets that are not precached (CJK, Arabic) are cached the first time they are used.
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({ cacheName: 'onda-fonts', plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 })] }),
)

// The page asks before swapping to a new version, so an update never lands mid-session.
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') void self.skipWaiting()
})

/* ── Web Push ──────────────────────────────────────────────── */
interface PushPayload {
  title?: string
  body?: string
  tag?: string
  /** 'daily' | 'evening' | 'milestone' | 'test' */
  kind?: string
  url?: string
  lagoId?: string
}

self.addEventListener('push', (event) => {
  let p: PushPayload = {}
  try {
    p = (event.data?.json() as PushPayload) ?? {}
  } catch {
    p = { body: event.data?.text() }
  }
  const options: NotificationOptions & { actions?: { action: string; title: string }[] } = {
    body: p.body ?? '',
    tag: p.tag ?? p.kind ?? 'onda',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    data: { url: p.url ?? '/', lagoId: p.lagoId ?? null, kind: p.kind ?? null },
    // Action buttons show on Android and desktop. iOS ignores them: a tap simply opens Onda.
    actions: [
      { action: 'checkin', title: 'Check In' },
      { action: 'open', title: 'Open' },
    ],
  }
  event.waitUntil(self.registration.showNotification(p.title ?? 'Onda', options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = (event.notification.data ?? {}) as { url?: string; lagoId?: string | null; kind?: string | null }
  const params = new URLSearchParams()
  if (event.action === 'checkin') params.set('action', 'checkin')
  if (data.lagoId) params.set('lago', data.lagoId)
  if (data.kind === 'evening') params.set('action', params.get('action') ?? 'journal')
  const target = `${data.url ?? '/'}${params.size ? `?${params}` : ''}`
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = all.find((c) => 'focus' in c)
      if (open) {
        open.postMessage({ type: 'NOTIFICATION_ACTION', action: params.get('action'), lagoId: data.lagoId ?? null })
        await open.focus()
      } else await self.clients.openWindow(target)
    })(),
  )
})

// iOS drops a push subscription now and then; ask the page to re-register when it happens.
self.addEventListener('pushsubscriptionchange', (event) => {
  ;(event as ExtendableEvent).waitUntil(
    self.clients.matchAll({ type: 'window' }).then((cs) => cs.forEach((c) => c.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' }))),
  )
})
