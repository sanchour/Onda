import { useQuery } from '@tanstack/react-query'
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { hasPlus } from '@/data/entitlement'
import { activityByDate, currentStreak } from '@/data/derive/stats'
import { useLagos, usePlus, useSettings } from '@/data/hooks'
import { fetchLatestVersion } from '@/app/Overlays'
import { barKind } from '@/app/statusBar'
import { useStore } from '@/data/store'
import type { Settings as SettingsT } from '@/data/types'
import { fmtAgo, fmtDate, toDateStr } from '@/lib/dates'
import { useDesk } from '@/lib/desk'
import { setLiteMode, useLiteMode } from '@/lib/lite'
import { downloadJson, isStandalone } from '@/lib/platform'
import { BackButton, Screen } from '@/nav/Screen'
import { useNav, type SettingsPage, type StackEntry } from '@/nav/store'
import { deleteAccount, syncNow, useSyncState } from '@/sync/engine'
import { paid, refreshEntitlement } from '@/sync/entitlement'
import { useIntegrations } from '@/sync/integrations'
import { accountInfo, backendConfigured, signOut } from '@/sync/supabase'
import { SegmentedControl } from '@/ui/controls'
import { Avatar } from '@/ui/data'
import { Icon } from '@/ui/Icon'
import { ListRow, ListSection } from '@/ui/lists'
import { DayScroller } from '@/ui/pickers'
import { guardNewLago } from './lagoActions'
import c from './onda7/onda7.module.css'
import { guardCreateOnda, OrnDivider, useOndaScope } from './ondaShared'
import m from './more.module.css'
import o from './ondas.module.css'
import s from './screens.module.css'

const APP_VERSION = '8.0'
const BUILD = '1'
const HUB: [string, SettingsPage][] = [['plus-circle', 'add'], ['seal-check', 'subscription'], ['paint-brush', 'appearance'], ['arrows-clockwise', 'integrations'], ['database', 'data'], ['question', 'help']]
// The desktop split view is its own chunk: phones never load it.
const DeskSettings = lazy(() => import('@/desk/settings/DeskSettings'))

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
  const desk = useDesk()
  const scope = useOndaScope()
  const lite = useLiteMode()
  const page = entry.page
  const [manageOpen, setManageOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const importFile = async (file: File | undefined) => {
    if (!file) return
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error('too-large')
      const res = await useStore.getState().importAll(JSON.parse(await file.text()))
      showToast(t('settings.data.imported', { count: res.imported }) + (res.skipped ? ` ${t('settings.data.skipped', { count: res.skipped })}` : ''), { icon: 'download-simple' })
    } catch (e) {
      const why = (e as Error).message
      showToast(t(why === 'unsupported-version' ? 'settings.data.importNewer' : 'settings.data.importBad'), { icon: 'warning-circle' })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }
  const streak = useMemo(() => {
    const st = useStore.getState()
    return currentStreak(activityByDate({ lagos: st.lagos, checkIns: st.checkIns, runs: st.runs, practiceLogs: st.practiceLogs, journal: st.journal, reflections: st.reflections }, today), today)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, lagos, runs])

  const sw = (k: keyof SettingsT) => ({ accessory: 'switch' as const, switchOn: !!settings[k], onSwitchChange: (v: boolean) => update({ [k]: v }) })
  const tier = plus.tier === 'lifetime' ? t('settings.sub.lifetime') : plus.tier === 'monthly' ? t('settings.sub.monthly') : plus.tier === 'trial' ? t('settings.sub.trial') : plus.tier === 'expired' ? t('settings.sub.expired') : t('settings.sub.free')
  const onCount = (integrations?.notion.connected ? 1 : 0) + (integrations?.calendar.lastFetchedAt ? 1 : 0) + (integrations?.reminders.lastFetchedAt ? 1 : 0)
  const hubValue: Record<SettingsPage, string> = {
    add: '',
    subscription: tier,
    appearance: t(`settings.display.${settings.themeMode}`),
    integrations: onCount ? String(onCount) : '',
    data: '',
    help: '',
  }
  const name = user?.name || t('settings.yourName')
  const paywall = () => push({ name: 'paywall' })
  const restore = async () => {
    const e = await refreshEntitlement()
    showToast(paid(e?.plus) ? t('paywall.restored') : t('paywall.nothingToRestore'), { icon: paid(e?.plus) ? 'seal-check' : 'info' })
  }
  const openIntegration = (sheet: 'notion' | 'calendar' | 'reminders') => () => {
    if (!hasPlus(plus)) {
      showToast(t('paywall.gateSync'), { icon: 'seal-check' })
      paywall()
    } else openSheet({ name: sheet })
  }

  const pages: Record<SettingsPage, React.ReactNode> = {
    // 8.0: everything you can add lives here: a new Onda or Lago, the bookshop of Ondas and the Gallery of Lagos
    add: (
      <div className={m.add}>
        <ListSection header={t('settings.hub.add')}>
          <ListRow
            icon="waves"
            title={t('settings.add.newOnda')}
            subtitle={t('settings.add.newOndaSub')}
            onClick={() => guardCreateOnda(t) && openSheet({ name: 'createOnda' })}
          />
          <ListRow
            icon="wave-soft"
            title={t('settings.add.newLago')}
            subtitle={t('settings.add.newLagoSub')}
            onClick={() => guardNewLago(t) && openSheet({ name: 'lagoForm' })}
          />
          <ListRow icon="compass" title={t('settings.add.browseOndas')} onClick={() => push({ name: 'allOndas' })} />
          <ListRow icon="squares-four" title={t('settings.add.browseLagos')} onClick={() => push({ name: 'gallery' })} />
        </ListSection>
      </div>
    ),
    subscription: (
      <div className={m.gap28}>
        <ListSection header={t('settings.sub.header')} footer={t('settings.sub.footer')}>
          <ListRow icon="seal-check" title={t('settings.sub.plan')} value={tier} onClick={paywall} />
          {plus.tier === 'trial' && <ListRow icon="clock" title={t('settings.sub.trialLeft')} value={t('common.days', { count: plus.daysLeft })} accessory="none" />}
          {plus.tier !== 'lifetime' && <ListRow icon="infinity" title={t('settings.sub.getLifetime')} value="€ 24,99" onClick={paywall} />}
          {plus.tier !== 'lifetime' && plus.tier !== 'monthly' && <ListRow icon="calendar-blank" title={t('settings.sub.getMonthly')} value="€ 2,49" onClick={paywall} />}
          <ListRow icon="arrow-counter-clockwise" title={t('settings.sub.restore')} accessory="none" onClick={() => void restore()} />
        </ListSection>
      </div>
    ),
    appearance: (
      <>
        {/* the desktop draws the three looks as small windows instead (DeskSettings) */}
        {!desk && (
          <div className={m.setCard}>
            <SegmentedControl options={(['light', 'dark', 'auto'] as const).map((v) => ({ value: v, label: t(`settings.display.${v}`) }))} value={settings.themeMode} onChange={(v) => update({ themeMode: v })} fullWidth ariaLabel={t('settings.hub.appearance')} />
          </div>
        )}
        <div className={m.rulerCard}>
          <div className={m.rulerTitle}>{t('settings.display.defaultLength')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 16px 12px' }}>
            <span style={{ whiteSpace: 'nowrap', font: '600 var(--fs-17) var(--font-sans)' }}>{t('common.days', { count: settings.defaultOndaLength })}</span>
            <DayScroller value={settings.defaultOndaLength} min={7} max={30} onChange={(v) => update({ defaultOndaLength: v })} ariaLabel={t('settings.display.defaultLength')} />
          </div>
        </div>
        <div className={m.gap28}>
          <ListSection footer={`${t('settings.display.footer')} ${t('settings.display.textSize')}`}>
            <ListRow icon="paint-brush" title={t('settings.display.themes')} {...sw('ondaThemes')} />
            <ListRow icon="drop" title={t('settings.display.tint')} {...sw('ondaTint')} />
          </ListSection>
        </div>
        <div className={m.rulerCard} style={{ marginTop: 28 }}>
          <div className={m.rulerTitle}>{t('settings.display.lite')}</div>
          <div style={{ padding: '4px 16px 14px' }}>
            <SegmentedControl options={(['auto', 'on', 'off'] as const).map((v) => ({ value: v, label: t(`settings.display.lite_${v}`) }))} value={lite} onChange={setLiteMode} fullWidth ariaLabel={t('settings.display.lite')} />
          </div>
        </div>
        <p className={m.liteNote}>{t('settings.display.liteFooter')}</p>
      </>
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
        <input ref={fileRef} type="file" accept="application/json,.json" hidden aria-label={t('settings.data.import')} onChange={(e) => void importFile(e.target.files?.[0])} />
        <div className={m.gap28}>
          <ListSection footer={t('settings.data.backupFooter')}>
            <ListRow icon="chart-bar" title={t('settings.data.history')} onClick={() => popToRoot('stats')} />
            <ListRow icon="export" title={t('settings.data.export')} accessory="none" onClick={() => { downloadJson(`onda-export-${today}.json`, useStore.getState().exportAll()); showToast(t('settings.data.exported'), { icon: 'export' }) }} />
            <ListRow icon="download-simple" title={t('settings.data.import')} accessory="none" onClick={() => fileRef.current?.click()} />
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
            <ListRow icon="info" title={t('settings.help.versionRow')} value={`${APP_VERSION} (${BUILD})`} accessory="none" onClick={() => { showToast(t('settings.help.checking'), { icon: 'arrows-clockwise' }); void fetchLatestVersion() }} />
            <ListRow icon="device-mobile" title={t('settings.help.topBar')} value={t(`settings.help.bar_${barKind()}`)} accessory="none" />
            <ListRow icon="arrow-counter-clockwise" title={t('settings.help.replay')} onClick={() => { popToRoot(); update({ onboarded: false }) }} />
            {!isStandalone() && <ListRow icon="device-mobile" title={t('settings.help.install')} onClick={() => { update({ a2hsDismissed: false }); popToRoot() }} />}
          </ListSection>
        </div>
      </>
    ),
  }

  const badge = plus.tier === 'lifetime' ? t('settings.plus.badgeLife') : plus.tier === 'monthly' ? t('settings.plus.badgeMonthly') : plus.tier === 'trial' ? t('settings.plus.badgeTrial', { count: plus.daysLeft }) : plus.tier === 'expired' ? t('settings.plus.badgeExpired') : t('settings.plus.badgeFree')
  const plusKey = plus.tier === 'lifetime' ? 'Life' : plus.tier === 'monthly' ? 'Monthly' : plus.tier === 'trial' ? 'Trial' : plus.tier === 'expired' ? 'Expired' : 'Free'
  const avatar = (size: number) => <Avatar initials={(name[0] ?? 'O').toUpperCase()} size={size} photo={settings.avatarPhoto} icon={settings.avatarIcon} tone={settings.avatarTone} />
  const memberSince = t('settings.memberSince', { date: fmtDate(toDateStr(new Date(user?.createdAt ?? Date.now()))) })
  const stats: [number, string][] = [[streak, t('settings.streak')], [runs.filter((r) => !r.deletedAt).length, t('settings.ondas')], [lagos.length, t('settings.lagos')]]
  const danger = (
    <ListSection>
      <ListRow icon="trash" destructive accessory="none" title={confirm.armed === 'reset' ? t('settings.danger.confirm') : t('settings.danger.reset')} onClick={() => confirm.tap('reset', () => void useStore.getState().resetAll().then(() => showToast(t('settings.danger.resetDone'), { icon: 'trash' })))} />
      {backendConfigured && account && !account.anonymous && <ListRow icon="sign-out" destructive accessory="none" title={t('settings.danger.signOut')} onClick={() => void signOut()} />}
      {backendConfigured && account && (
        <ListRow icon="x-circle" destructive accessory="none" title={confirm.armed === 'delete' ? t('settings.danger.confirm') : t('settings.danger.deleteAccount')} onClick={() => confirm.tap('delete', () => void deleteAccount().then(() => showToast(t('settings.danger.deleted'), { icon: 'trash' })))} />
      )}
    </ListSection>
  )

  if (desk) {
    return (
      <Suspense fallback={null}>
        <DeskSettings
          page={page}
          hub={HUB}
          pages={pages}
          name={name}
          memberSince={memberSince}
          avatar={avatar}
          stats={stats}
          onProfile={() => openSheet({ name: 'account' })}
          plus={{ title: t('settings.plus.title'), badge, line: t(`settings.plus.line${plusKey}`), cta: t(`settings.plus.cta${plusKey === 'Expired' ? 'Trial' : plusKey}`), open: paywall }}
          danger={danger}
          version={t('settings.version', { v: APP_VERSION })}
          theme={settings.themeMode}
          onTheme={(v) => update({ themeMode: v })}
          onBack={pop}
          onLink={() => push({ name: 'link' })}
        />
      </Suspense>
    )
  }

  return (
    <Screen chrome={<BackButton onClick={pop} />} style={scope?.look.vars} dataOnda={scope?.themed ? scope.props['data-onda'] : undefined}>
      <div className={scope?.themed ? c.home : undefined}>
      <div className={s.titleRow} style={{ padding: '0 20px' }}>
        <h1 className={s.largeTitle}>{page ? t(`settings.hub.${page}`) : t('settings.title')}</h1>
      </div>
      {scope?.themed && <OrnDivider look={scope.look} />}
      {page ? (
        pages[page]
      ) : (
        <>
          <button type="button" className={m.profile} onClick={() => openSheet({ name: 'account' })}>
            <span className={m.profileRow}>
              {avatar(64)}
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className={m.profileName} style={{ display: 'block' }}>{name}</span>
                <span className={s.sub} style={{ display: 'block' }}>{memberSince}</span>
              </span>
              <Icon name="caret-right" weight="bold" size={18} color="var(--label-quaternary)" />
            </span>
            <span className={`${s.stat3} ${m.profileStats}`}>
              {stats.map(([v, l]) => (
                <span key={l}>
                  <span className={s.statV}>{v}</span>
                  <span className={s.statL} style={{ display: 'block' }}>{l}</span>
                </span>
              ))}
            </span>
          </button>

          <div className={m.plusCard}>
            <div className={m.plusTop}>
              <span className={m.plusTitle}>{t('settings.plus.title')}</span>
              <span className={m.plusBadge}>{badge}</span>
            </div>
            <div className={m.plusBottom}>
              <span className={m.plusLine}>{t(`settings.plus.line${plusKey}`)}</span>
              <button
                type="button"
                className={m.plusCta}
                onClick={() => setManageOpen((v) => !v)}
              >
                {t('settings.plus.ctaLife')}
              </button>
            </div>
            {manageOpen && (
              <div className={o.plusManageWrap}>
                {plus.tier !== 'lifetime' && (
                  <button type="button" className={o.plusManageBtn} onClick={paywall}>
                    <span>{t('settings.sub.getLifetime')}</span>
                    <span className={o.plusManageSub}>€ 24,99</span>
                  </button>
                )}
                {plus.tier !== 'lifetime' && plus.tier !== 'monthly' && (
                  <button type="button" className={o.plusManageBtn} onClick={paywall}>
                    <span>{t('settings.sub.getMonthly')}</span>
                    <span className={o.plusManageSub}>€ 2,49</span>
                  </button>
                )}
                <button type="button" className={o.plusManageBtn} onClick={() => void restore()}>
                  <span>{t('settings.sub.restore')}</span>
                  <Icon name="arrow-counter-clockwise" weight="bold" size={15} />
                </button>
              </div>
            )}
          </div>

          <div className={m.gap28}>
            {pages.add}
          </div>

          <div className={m.gap28}>
            <ListSection>
              {HUB.filter(([, key]) => key !== 'add').map(([icon, key]) => (
                <ListRow key={key} icon={icon} title={t(`settings.hub.${key}`)} value={hubValue[key]} onClick={() => push({ name: 'settings', page: key })} />
              ))}
            </ListSection>
          </div>
          <div className={m.gap28}>{danger}</div>
          <div className={m.version}>{t('settings.version', { v: APP_VERSION })}</div>
        </>
      )}
      </div>
    </Screen>
  )
}
