import type { TFunction } from 'i18next'
import i18n from '@/i18n'
import { canStartLago, plusState } from '@/data/entitlement'
import { FREE_LAGO_LIMIT } from '@/data/catalog'
import { lagoPhase, lagoStats } from '@/data/derive/lago'
import { useStore, type LagoInput } from '@/data/store'
import type { Lago } from '@/data/types'
import { now } from '@/lib/dates'
import { haptic } from '@/lib/haptics'
import { nav } from '@/nav/store'
import type { MenuSpec } from '@/ui/Menu'

export async function share(text: string, title = 'Onda') {
  try {
    if (navigator.share) await navigator.share({ title, text })
    else {
      await navigator.clipboard.writeText(text)
      nav().showToast(i18n.t('common.copied'), { icon: 'copy' })
    }
  } catch {
    // user closed the share sheet
  }
}

/** Free tier allows a few running Lagos; past that the paywall opens. Returns true when the Lago may start. */
export function guardNewLago(t: TFunction): boolean {
  const s = useStore.getState()
  const active = s.lagos.filter((l) => !l.deletedAt && lagoPhase(l, s.today) === 'active').length
  if (canStartLago(plusState(s.user, now().getTime()), active)) return true
  nav().showToast(t('paywall.gateLagos', { count: FREE_LAGO_LIMIT }), { icon: 'seal-check' })
  nav().push({ name: 'paywall' })
  return false
}

export function startLago(t: TFunction, input: LagoInput): boolean {
  if (!guardNewLago(t)) return false
  useStore.getState().createLago(input)
  haptic('success')
  return true
}

/** The Lago actions menu: Check In, Edit, End, then Restart, Extend, Share, Duplicate, Delete. */
export function lagoMenu(t: TFunction, lago: Lago, anchor: DOMRect): MenuSpec {
  const st = useStore.getState()
  const stats = lagoStats(lago, st.checkIns, st.today)
  const { showToast, openSheet } = nav()
  return {
    anchor: { top: anchor.top, bottom: anchor.bottom, left: 24, right: 24 + 262 },
    width: 262,
    dim: true,
    quick: [
      stats.doneToday
        ? { label: t('lagos.menu.undo'), icon: 'arrow-counter-clockwise', onClick: () => st.toggleCheckInToday(lago.id) }
        : { label: t('lagos.menu.checkIn'), icon: 'check', onClick: () => { haptic('success'); st.checkIn(lago.id, { status: 'done' }) } },
      { label: t('lagos.menu.edit'), icon: 'pencil-simple', onClick: () => openSheet({ name: 'lagoForm', editId: lago.id }) },
      { label: t('lagos.menu.end'), icon: 'stop-circle', onClick: () => { st.endLago(lago.id); showToast(t('lagos.ended'), { icon: 'stop-circle' }) } },
    ],
    groups: [
      [
        { label: t('lagos.menu.restart'), icon: 'arrow-clockwise', onClick: () => { st.restartLago(lago.id); showToast(t('lagos.restarted'), { icon: 'arrow-clockwise' }) } },
        { label: t('lagos.menu.extend'), icon: 'clock-clockwise', onClick: () => { st.extendLago(lago.id, 7); showToast(t('lagos.extended'), { icon: 'clock-clockwise' }) } },
      ],
      [
        { label: t('lagos.menu.share'), icon: 'export', onClick: () => void share(t('lagos.shareText', { name: lago.name, day: stats.day, length: lago.lengthDays, streak: stats.streak })) },
        { label: t('lagos.menu.duplicate'), icon: 'copy', onClick: () => { if (guardNewLago(t)) { st.duplicateLago(lago.id); showToast(t('lagos.duplicated'), { icon: 'copy' }) } } },
      ],
      [
        {
          label: t('lagos.menu.delete'),
          icon: 'trash',
          destructive: true,
          onClick: () => {
            st.deleteLago(lago.id)
            if (nav().stack.some((e) => e.name === 'lago' && e.id === lago.id)) nav().pop()
            showToast(t('lagos.deleted'), { icon: 'trash', action: { label: t('lagos.undo'), run: () => useStore.getState().restoreLago(lago.id) } })
          },
        },
      ],
    ],
  }
}
