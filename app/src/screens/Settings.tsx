import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { hasPlus } from '@/data/entitlement'
import { activityByDate, currentStreak } from '@/data/derive/stats'
import { useLagos, usePlus, useSettings } from '@/data/hooks'
import { useStore } from '@/data/store'
import type { Settings as SettingsT } from '@/data/types'
import { disableLock, enableLock, lockSupported } from '@/lib/applock'
import { fmtAgo, fmtClock, fmtDate, toDateStr } from '@/lib/dates'
import { downloadJson, isStandalone } from '@/lib/platform'
import { BackButton, Screen } from '@/nav/Screen'
import { useNav, type SettingsPage, type StackEntry } from '@/nav/store'
import { deleteAccount, syncNow, useSyncState } from '@/sync/engine'
import { refreshEntitlement } from '@/sync/entitlement'
import { useIntegrations } from '@/sync/integrations'
import { disablePush, pushState, sendTestPush } from '@/sync/push'
import { accountInfo, backendConfigured, signOut } from '@/sync/supabase'
import { SegmentedControl } from '@/ui/controls'
import { Avatar } from '@/ui/data'
import { Icon } from '@/ui/Icon'
import { ListRow, ListSection } from '@/ui/lists'
import { RulerPicker } from '@/ui/pickers'
import m from './more.module.css'
import s from './screens.module.css'

const APP_VERSION = '1.0'
const BUILD = '1'
const HUB: [string, SettingsPage][] = [['seal-check', 'subscription'], ['paint-brush', 'appearance'], ['bell', 'notifications'], ['sparkle', 'practice'], ['arrows-clockwise', 'integrations'], ['database', 'data'], ['lock', 'privacy'], ['question', 'help']]

/** Tap once to arm, again to confirm: the quiet version of an "Are you sure" alert. */
function useConfirm() {
  const [armed, setArmed] = useState<string | null>(null)
  useEffect(() => {
    if (!armed) return
    const id = setTimeout(() => setArmed(null), 4000)
    return () => clearTimeout(id)
  }, [armed])
  return { armed, tap: (key: string, run: () => void) => (armed === key ? (setArmed(null), run()) : setArmed(key)) }
}

export default function Settings({ entry }: { entry: Extract<StackEntry, { name: 'settings' }> }) {
  const { t } = useTranslation()
  const { push, pop, popToRoot, openSheet, showToast } = useNav()
  const settings = useSettings()
  const update = useStore((x) => x.updateSettings)
  const user = useStore((x) => x.user)
  const today = useStore((x) => x.today)
  const lagos = useLagos()
  const runs = useStore((x) => x.runs)
  const plus = usePlus()
  const sync = useSyncState()
  const integrations = useIntegrations().data
  const account = useQuery({ queryKey: ['account'], queryFn: accountInfo, enabled: backendConfigured, staleTime: 60_000 }).data
  const confirm = useConfirm()
  const page = entry.page
  const [lockOk, setLockOk] = useState(false)
  const push_ = pushState()

  useEffect(() => {
    void lockSupported().then(setLockOk)
  }, [])

  const streak = useMemo(() => {
    const st = useStore.getState()
    return currentStreak(activityByDate({ lagos: st.lagos, checkIns: st.checkIns, runs: st.runs, practiceLogs: st.practiceLogs, journal: st.journal, reflections: st.reflections }, today), today)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, lagos, runs])

  const sw = (k: keyof SettingsT) => ({ accessory: 'switch' as const, switchOn: !!settings[k], onSwitchChange: (v: boolean) => update({ [k]: v }) })
  const tier = plus.tier === 'lifetime' ? t('settings.sub.lifetime') : plus.tier === 'trial' ? t('settings.sub.trial') : plus.tier === 'expired' ? t('settings.sub.expired') : t('settings.sub.free')
  const onCount = (integrations?.notion.connected ? 1 : 0) + (integrations?.calendar.lastFetchedAt ? 1 : 0) + (integrations?.reminders.lastFetchedAt ? 1 : 0)
  const hubValue: Record<SettingsPage, string> = {
    subscription: tier,
    appearance: t(`settings.display.${settings.themeMode}`),
    notifications: push_ === 'granted' && settings.notifDaily ? t('common.on') : t('common.off'),
    practice: '',
    integrations: onCount ? String(onCount) : '',
    data: '',
    privacy: settings.appLock ? t('common.on') : t('common.off'),
    help: '',
  }
  const name = user?.name || t('settings.yourName')
  const paywall = () => push({ name: 'paywall' })
  const restore = async () => {
    const e = await refreshEntitlement()
    showToast(e?.plus === 'lifetime' ? t('paywall.restored') : t('paywall.nothingToRestore'), { icon: e?.plus === 'lifetime' ? 'seal-check' : 'info' })
  }
  const openIntegration = (sheet: 'notion' | 'calendar' | 'reminders') => () => {
    if (!hasPlus(plus)) {
      showToast(t('paywall.gateSync'), { icon: 'seal-check' })
      paywall()
    } else openSheet({ name: sheet })
  }
  const pushLabel = { granted: t('settings.notif.allowed'), denied: t('settings.notif.denied'), default: t('settings.notif.notAsked'), 'needs-install': t('settings.notif.needsInstall'), unsupported: t('settings.notif.unsupported'), 'not-configured': t('settings.integrations.needsBackend') }[push_]

  const pages: Record<SettingsPage, React.ReactNode> = {
    subscription: (
      <div className={m.gap28}>
        <ListSection header={t('settings.sub.header')} footer={t('settings.sub.footer')}>
          <ListRow icon="seal-check" title={t('settings.sub.plan')} value={tier} onClick={paywall} />
          {plus.tier === 'trial' && <ListRow icon="clock" title={t('settings.sub.trialLeft')} value={t('common.days', { count: plus.daysLeft })} accessory="none" />}
          {plus.tier !== 'lifetime' && <ListRow icon="infinity" title={t('settings.sub.getLifetime')} value="€ 14,99" onClick={paywall} />}
          <ListRow icon="arrow-counter-clockwise" title={t('settings.sub.restore')} accessory="none" onClick={() => void restore()} />
        </ListSection>
      </div>
    ),
    appearance: (
      <>
        <div className={m.setCard}>
          <SegmentedControl options={(['light', 'dark', 'auto'] as const).map((v) => ({ value: v, label: t(`settings.display.${v}`) }))} value={settings.themeMode} onChange={(v) => update({ themeMode: v })} fullWidth ariaLabel={t('settings.hub.appearance')} />
        </div>
        <div className={m.rulerCard}>
          <div className={m.rulerTitle}>{t('settings.display.defaultLength')}</div>
          <div style={{ padding: '8px 16px 0' }}>
            <RulerPicker value={settings.defaultOndaLength} min={7} max={30} unit={t('common.unitDays')} onChange={(v) => update({ defaultOndaLength: v })} ariaLabel={t('settings.display.defaultLength')} />
          </div>
        </div>
        <div className={m.gap28}>
          <ListSection footer={`${t('settings.display.footer')} ${t('settings.display.textSize')}`}>
            <ListRow icon="paint-brush" title={t('settings.display.themes')} {...sw('ondaThemes')} />
          </ListSection>
        </div>
      </>
    ),
    notifications: (
      <>
        <div className={m.gap28}>
          <ListSection>
            <ListRow icon="bell" title={t('settings.notif.status')} value={pushLabel} accessory={push_ === 'default' ? 'chevron' : 'none'} onClick={push_ === 'default' ? () => openSheet({ name: 'notifPrompt' }) : undefined} />
            {push_ === 'granted' && <ListRow icon="waveform" title={t('settings.notif.test')} accessory="none" onClick={() => void sendTestPush('Onda', t('notif.r1')).then((ok) => ok && showToast(t('settings.notif.testSent'), { icon: 'bell' }))} />}
          </ListSection>
        </div>
        <div className={m.gap28}>
          <ListSection header={t('settings.notif.header')} footer={t('settings.notif.footer')}>
            <ListRow icon="bell" title={t('settings.notif.daily')} accessory="switch" switchOn={settings.notifDaily} onSwitchChange={(v) => { update({ notifDaily: v }); if (v && push_ === 'default') openSheet({ name: 'notifPrompt' }); if (!v && !settings.notifEvening && !settings.notifMilestones) void disablePush() }} />
            <ListRow icon="clock" title={t('settings.notif.time')} value={fmtClock(settings.reminderTime)} onClick={() => openSheet({ name: 'time', title: t('settings.notif.daily'), value: settings.reminderTime, onPick: (v) => update({ reminderTime: v }) })} />
            <ListRow icon="moon" title={t('settings.notif.evening')} {...sw('notifEvening')} />
            <ListRow icon="clock" title={t('settings.notif.eveningTime')} value={fmtClock(settings.eveningTime)} onClick={() => openSheet({ name: 'time', title: t('settings.notif.evening'), value: settings.eveningTime, onPick: (v) => update({ eveningTime: v }) })} />
            <ListRow icon="flag-checkered" title={t('settings.notif.milestones')} {...sw('notifMilestones')} />
          </ListSection>
        </div>
      </>
    ),
    practice: (
      <div className={m.gap28}>
        <ListSection footer={t('settings.practice.foodFooter')}>
          <ListRow icon="calendar-blank" title={t('settings.practice.weekStarts')} value={t(`settings.practice.${settings.weekStart}`)} accessory="none" onClick={() => update({ weekStart: settings.weekStart === 'monday' ? 'sunday' : 'monday' })} />
          <ListRow icon="fork-knife" title={t('settings.practice.includeFood')} {...sw('includeFood')} />
          <ListRow icon="vibrate" title={t('settings.practice.haptics')} {...sw('haptics')} />
          <ListRow icon="speaker-high" title={t('settings.practice.sounds')} {...sw('sounds')} />
        </ListSection>
      </div>
    ),
    integrations: (
      <div className={m.gap28}>
        <ListSection header={t('settings.integrations.header')} footer={backendConfigured ? t('settings.integrations.footer') : `${t('settings.integrations.needsBackend')}. ${t('calendar.localFooter')}`}>
          <ListRow icon="list-checks" title={t('settings.integrations.reminders')} value={t('settings.integrations.viaShortcuts')} onClick={openIntegration('reminders')} />
          <ListRow icon="calendar-dots" title={t('settings.integrations.calendar')} value={integrations?.calendar.lastFetchedAt ? t('settings.integrations.subscribed') : t('settings.integrations.off')} onClick={openIntegration('calendar')} />
          <ListRow icon="notion-logo" title={t('settings.integrations.notion')} value={integrations?.notion.connected ? t('settings.integrations.connected') : t('settings.integrations.off')} onClick={openIntegration('notion')} />
        </ListSection>
      </div>
    ),
    data: (
      <>
        <div className={m.gap28}>
          <ListSection>
            <ListRow icon="chart-bar" title={t('settings.data.history')} onClick={() => popToRoot('stats')} />
            <ListRow icon="export" title={t('settings.data.export')} accessory="none" onClick={() => { downloadJson(`onda-export-${today}.json`, useStore.getState().exportAll()); showToast(t('settings.data.exported'), { icon: 'export' }) }} />
          </ListSection>
        </div>
        <div className={m.gap28}>
          <ListSection header={t('settings.data.sync')} footer={t('settings.data.footer')}>
            <ListRow icon="user" title={t('settings.data.account')} value={!backendConfigured ? t('settings.data.anonymous') : account?.email ?? (account ? t('settings.data.anonymous') : t('settings.data.signedOut'))} onClick={() => openSheet({ name: 'account' })} />
            <ListRow icon="clock" title={t('settings.data.lastSynced')} value={sync.status === 'syncing' ? t('notion.syncing') : sync.status === 'offline' ? t('common.offline') : fmtAgo(sync.lastSyncedAt, t)} accessory="none" />
            {sync.pending > 0 && <ListRow icon="arrows-clockwise" title={t('settings.data.pending', { count: sync.pending })} accessory="none" />}
            {backendConfigured && <ListRow icon="arrows-clockwise" title={t('settings.data.syncNow')} accessory="none" onClick={() => void syncNow()} />}
          </ListSection>
          {sync.error && <div className={m.errorNote} role="alert">{sync.error}</div>}
        </div>
        {import.meta.env.DEV && (
          <div className={m.gap28}>
            <ListSection>
              <ListRow icon="sparkle" title={t('settings.data.loadDemo')} accessory="none" onClick={() => void import('@/data/seed').then((x) => x.loadDemoSeed()).then(() => { showToast(t('settings.data.demoLoaded'), { icon: 'sparkle' }); popToRoot('ondas') })} />
            </ListSection>
          </div>
        )}
      </>
    ),
    privacy: (
      <div className={m.gap28}>
        <ListSection footer={`${lockOk ? t('settings.privacy.footer') : t('settings.privacy.lockUnsupported')} ${t('settings.privacy.noTracking')}`}>
          <ListRow
            icon="lock"
            title={t('settings.privacy.appLock')}
            accessory="switch"
            switchOn={settings.appLock}
            onSwitchChange={(v) => {
              if (!v) return void disableLock().then(() => update({ appLock: false }))
              if (!lockOk) return showToast(t('settings.privacy.lockUnsupported'), { icon: 'lock' })
              void enableLock().then((ok) => ok && update({ appLock: true }))
            }}
          />
          <ListRow icon="eye-slash" title={t('settings.privacy.hide')} {...sw('hideInSwitcher')} />
        </ListSection>
      </div>
    ),
    help: (
      <>
        <div className={m.gap28}>
          <ListSection header={t('settings.help.support')}>
            <ListRow icon="question" title={t('settings.help.help')} accessory="external" onClick={() => window.open('mailto:sanderwijnia@gmail.com?subject=Onda', '_self')} />
            <ListRow icon="sparkle" title={t('settings.help.whatsNew')} onClick={() => openSheet({ name: 'whatsNew' })} />
            <ListRow icon="shield-check" title={t('settings.help.privacyPolicy')} onClick={() => openSheet({ name: 'legal', doc: 'privacy' })} />
            <ListRow icon="file-text" title={t('settings.help.terms')} onClick={() => openSheet({ name: 'legal', doc: 'terms' })} />
          </ListSection>
        </div>
        <div className={m.gap28}>
          <ListSection header={t('settings.help.about')}>
            <ListRow icon="info" title={t('settings.help.versionRow')} value={`${APP_VERSION} (${BUILD})`} accessory="none" />
            <ListRow icon="arrow-counter-clockwise" title={t('settings.help.replay')} onClick={() => { popToRoot(); update({ onboarded: false }) }} />
            {!isStandalone() && <ListRow icon="device-mobile" title={t('settings.help.install')} onClick={() => { update({ a2hsDismissed: false }); popToRoot() }} />}
          </ListSection>
        </div>
      </>
    ),
  }

  const badge = plus.tier === 'lifetime' ? t('settings.plus.badgeLife') : plus.tier === 'trial' ? t('settings.plus.badgeTrial', { count: plus.daysLeft }) : plus.tier === 'expired' ? t('settings.plus.badgeExpired') : t('settings.plus.badgeFree')
  const plusKey = plus.tier === 'lifetime' ? 'Life' : plus.tier === 'trial' ? 'Trial' : plus.tier === 'expired' ? 'Expired' : 'Free'

  return (
    <Screen chrome={<BackButton onClick={pop} />}>
      <div className={s.titleRow} style={{ padding: '0 20px' }}>
        <h1 className={s.largeTitle}>{page ? t(`settings.hub.${page}`) : t('settings.title')}</h1>
      </div>
      {page ? (
        pages[page]
      ) : (
        <>
          <button type="button" className={m.profile} onClick={() => openSheet({ name: 'account' })}>
            <span className={m.profileRow}>
              <Avatar initials={(name[0] ?? 'O').toUpperCase()} size={64} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className={m.profileName} style={{ display: 'block' }}>{name}</span>
                <span className={s.sub} style={{ display: 'block' }}>{t('settings.memberSince', { date: fmtDate(toDateStr(new Date(user?.createdAt ?? Date.now()))) })}</span>
              </span>
              <Icon name="caret-right" weight="bold" size={18} color="var(--label-quaternary)" />
            </span>
            <span className={`${s.stat3} ${m.profileStats}`}>
              {[[streak, t('settings.streak')], [runs.filter((r) => !r.deletedAt).length, t('settings.ondas')], [lagos.length, t('settings.lagos')]].map(([v, l]) => (
                <span key={l}>
                  <span className={s.statV}>{v}</span>
                  <span className={s.statL} style={{ display: 'block' }}>{l}</span>
                </span>
              ))}
            </span>
          </button>

          <button type="button" className={m.plusCard} onClick={paywall}>
            <span className={m.plusTop}>
              <span className={m.plusTitle}>{t('settings.plus.title')}</span>
              <span className={m.plusBadge}>{badge}</span>
            </span>
            <span className={m.plusBottom}>
              <span className={m.plusLine}>{t(`settings.plus.line${plusKey}`)}</span>
              <span className={m.plusCta}>{t(`settings.plus.cta${plusKey === 'Expired' ? 'Trial' : plusKey}`)}</span>
            </span>
          </button>

          <div className={m.gap28}>
            <ListSection>
              {HUB.map(([icon, key]) => (
                <ListRow key={key} icon={icon} title={t(`settings.hub.${key}`)} value={hubValue[key]} onClick={() => push({ name: 'settings', page: key })} />
              ))}
            </ListSection>
          </div>
          <div className={m.gap28}>
            <ListSection>
              <ListRow icon="trash" destructive accessory="none" title={confirm.armed === 'reset' ? t('settings.danger.confirm') : t('settings.danger.reset')} onClick={() => confirm.tap('reset', () => void useStore.getState().resetAll().then(() => showToast(t('settings.danger.resetDone'), { icon: 'trash' })))} />
              {backendConfigured && account && !account.anonymous && <ListRow icon="sign-out" destructive accessory="none" title={t('settings.danger.signOut')} onClick={() => void signOut()} />}
              {backendConfigured && account && (
                <ListRow icon="x-circle" destructive accessory="none" title={confirm.armed === 'delete' ? t('settings.danger.confirm') : t('settings.danger.deleteAccount')} onClick={() => confirm.tap('delete', () => void deleteAccount().then(() => showToast(t('settings.danger.deleted'), { icon: 'trash' })))} />
              )}
            </ListSection>
          </div>
          <div className={m.version}>{t('settings.version', { v: APP_VERSION })}</div>
        </>
      )}
    </Screen>
  )
}
