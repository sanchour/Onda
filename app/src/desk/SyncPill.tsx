import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fmtAgo } from '@/lib/dates'
import { useNav } from '@/nav/store'
import { useLinkState } from '@/sync/link/state'
import { Icon } from '@/ui/Icon'
import d from './desk.module.css'

/** Sidebar footer: whether this computer is linked, to what, and how fresh the last sync is. Opens Linked Devices. */
export function SyncPill({ rail }: { rail: boolean }) {
  const { t } = useTranslation()
  const linked = useLinkState((s) => s.linked)
  const status = useLinkState((s) => s.status)
  const lastSyncAt = useLinkState((s) => s.lastSyncAt)
  const other = useLinkState((s) => s.devices.find((x) => !x.me))
  const current = useNav((n) => n.stack[0]?.name === 'link')
  // "2 min ago" has to move on by itself
  const [, tick] = useState(0)
  useEffect(() => {
    if (!linked) return
    const id = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [linked])

  const title = linked ? t('link.pill', { name: other?.name ?? t('link.otherDevice') }) : t('desk.linkPhone')
  const sub = !linked ? null : status === 'live' ? (lastSyncAt ? fmtAgo(lastSyncAt, t) : t('link.status.live')) : t(`link.status.${status}`)
  const open = () => useNav.getState().jump(useNav.getState().tab, [{ name: 'link' }])
  return (
    <button type="button" className={d.navItem} aria-current={current ? 'page' : undefined} onClick={open} title={rail ? [title, sub].filter(Boolean).join(' · ') : undefined} aria-label={rail ? title : undefined}>
      <span className={d.syncIcon}>
        <Icon name={linked ? 'devices' : 'link-simple'} size={20} />
        {linked && <i className={d.syncDot} data-state={status} aria-hidden />}
      </span>
      {!rail && (
        <span className={d.syncText}>
          <span>{title}</span>
          {sub && <span className={d.syncSub}>{sub}</span>}
        </span>
      )}
    </button>
  )
}
