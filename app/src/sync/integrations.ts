import { useQuery, useQueryClient } from '@tanstack/react-query'
import { buildIcs, type FeedData, type IcsInclude } from '@shared/feeds'
import { useStore } from '@/data/store'
import { backendConfigured, callFunction, functionsUrl } from './supabase'

/* Integration status comes from the server, never from a local flag: what the sheet shows is what is true. */

export interface IntegrationStatus {
  notion: { connected: boolean; workspace: string | null; parent: string | null; lastSyncedAt: number | null; lastError: string | null; failed: number; queued: number }
  calendar: { token: string | null; lastFetchedAt: number | null }
  reminders: { token: string | null; lastFetchedAt: number | null; shortcutUrl: string | null }
}

export const EMPTY_STATUS: IntegrationStatus = {
  notion: { connected: false, workspace: null, parent: null, lastSyncedAt: null, lastError: null, failed: 0, queued: 0 },
  calendar: { token: null, lastFetchedAt: null },
  reminders: { token: null, lastFetchedAt: null, shortcutUrl: null },
}

export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: () => callFunction<IntegrationStatus>('integrations'),
    enabled: backendConfigured,
    staleTime: 20_000,
    refetchOnWindowFocus: true,
    retry: 1,
  })
}
export function useRefreshIntegrations() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['integrations'] })
}

/* ── Notion ────────────────────────────────────────────────── */
export async function notionConnect(): Promise<void> {
  const { url } = await callFunction<{ url: string }>('notion-oauth', { body: { action: 'start', returnUrl: window.location.origin + import.meta.env.BASE_URL } })
  window.location.assign(url)
}
export const notionSyncNow = () => callFunction<{ synced: number; failed: number; error: string | null }>('notion-sync', { body: { action: 'sync-now' } })
export const notionDisconnect = () => callFunction('notion-oauth', { body: { action: 'disconnect' } })

/* ── Calendar / Reminders feeds ────────────────────────────── */
export const rotateFeedToken = (kind: 'calendar' | 'reminders') => callFunction<{ token: string }>('integrations', { body: { action: 'rotate', kind } })
export const calendarFeedUrl = (token: string) => `${functionsUrl('calendar-feed')}?token=${token}`
/** iOS subscribes natively to a webcal:// link and keeps the calendar updated. */
export const webcalUrl = (token: string) => calendarFeedUrl(token).replace(/^https?:/, 'webcal:')
export const remindersFeedUrl = (token: string) => `${functionsUrl('reminders-feed')}?token=${token}`

function feedData(): FeedData {
  const s = useStore.getState()
  return { lagos: s.lagos, runs: s.runs, checkIns: s.checkIns, practiceLogs: s.practiceLogs, ruleLogs: s.ruleLogs, taskLogs: s.taskLogs }
}

/** One-time .ics export built on the device. Works offline and without an account. */
export function downloadIcs(include?: IcsInclude) {
  const blob = new Blob([buildIcs(feedData(), { include })], { type: 'text/calendar;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'onda.ics'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

/** Hand the calendar file to the system share sheet (iPhone offers Calendar there); fall back to a plain download. */
export async function shareIcs(include: IcsInclude): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([buildIcs(feedData(), { include })], 'onda.ics', { type: 'text/calendar' })
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Onda' })
      return 'shared'
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'cancelled'
  }
  downloadIcs(include)
  return 'downloaded'
}
