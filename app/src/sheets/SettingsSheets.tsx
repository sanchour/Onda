import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/data/hooks'
import { useStore } from '@/data/store'
import { fmtAgo, fmtClock } from '@/lib/dates'
import { copyText } from '@/lib/platform'
import { useNav, type SheetEntry } from '@/nav/store'
import m from '@/screens/more.module.css'
import s from '@/screens/screens.module.css'
import { EMPTY_STATUS, calendarFeedUrl, notionConnect, notionDisconnect, notionSyncNow, remindersFeedUrl, rotateFeedToken, shareIcs, useIntegrations, useRefreshIntegrations, webcalUrl } from '@/sync/integrations'
import { enablePush } from '@/sync/push'
import { accountInfo, backendConfigured, sendMagicLink, signInWithApple, signOut } from '@/sync/supabase'
import { Button, LinkButton } from '@/ui/buttons'
import { AVATAR_ICONS, AVATAR_TONES, Avatar, type AvatarTone } from '@/ui/data'
import { Icon } from '@/ui/Icon'
import { ListRow, ListSection } from '@/ui/lists'
import { AppSheet, useSheet } from './common'

type E<N extends SheetEntry['name']> = { entry: Extract<SheetEntry, { name: N }> }

function Head({ icon, title, sub, badge }: { icon: string; title: string; sub: string; badge?: string }) {
  return (
    <div className={m.intHead}>
      <div className={m.intLogo}>
        <Icon name={icon} weight="fill" size={44} />
      </div>
      <h2 className={m.intTitle}>{title}</h2>
      {badge && <span className={m.intBadge}>{badge}</span>}
      <div className={m.intSub}>{sub}</div>
    </div>
  )
}

/* ── Notion ───────────────────────────────────────────────── */
export function NotionSheet({ entry }: E<'notion'>) {
  const { t } = useTranslation()
  const showToast = useNav((n) => n.showToast)
  const settings = useSettings()
  const update = useStore((x) => x.updateSettings)
  const q = useIntegrations()
  const refresh = useRefreshIntegrations()
  const [busy, setBusy] = useState(false)
  const n = (q.data ?? EMPTY_STATUS).notion

  const run = async (fn: () => Promise<unknown>, done?: (r: unknown) => void) => {
    if (busy) return
    setBusy(true)
    try {
      done?.(await fn())
    } catch (e) {
      showToast(e instanceof Error && e.message === 'not-configured' ? t('settings.integrations.needsBackend') : t('common.error'), { icon: 'warning-circle' })
    } finally {
      setBusy(false)
      void refresh()
    }
  }

  return (
    <AppSheet entry={entry} title={t('notion.title')}>
      <div style={{ padding: '8px 0 60px' }}>
        <Head icon="notion-logo" title={n.connected ? t('notion.connectedTitle') : t('notion.title')} sub={n.connected ? t('notion.subOn') : t('notion.subOff')} />
        {n.connected ? (
          <>
            <div style={{ paddingTop: 24 }}>
              <ListSection>
                <ListRow icon="briefcase" title={t('notion.workspace')} value={n.workspace ?? ''} accessory="none" />
                <ListRow icon="database" title={t('notion.database')} value={n.parent ?? 'Onda'} accessory="none" />
              </ListSection>
            </div>
            <div className={m.gap28}>
              <ListSection header={t('notion.save')}>
                <ListRow icon="check-circle" title={t('notion.lagoCheckIns')} accessory="switch" switchOn={settings.notionLagos} onSwitchChange={(v) => update({ notionLagos: v })} />
                <ListRow icon="waves" title={t('notion.ondasJournal')} accessory="switch" switchOn={settings.notionOndas} onSwitchChange={(v) => update({ notionOndas: v })} />
                <ListRow icon="notebook" title={t('notion.reflections')} accessory="switch" switchOn={settings.notionReflections} onSwitchChange={(v) => update({ notionReflections: v })} />
              </ListSection>
            </div>
            <div className={m.gap28}>
              <ListSection footer={t('notion.autoFooter')}>
                <ListRow icon="arrows-clockwise" title={t('notion.autoUpdate')} accessory="switch" switchOn={settings.notionAuto} onSwitchChange={(v) => update({ notionAuto: v })} />
                <ListRow icon="clock" title={t('notion.lastSynced')} value={busy ? t('notion.syncing') : fmtAgo(n.lastSyncedAt, t)} accessory="none" />
                {n.queued > 0 && <ListRow icon="list-checks" title={t('notion.queued', { count: n.queued })} accessory="none" />}
              </ListSection>
              {(n.lastError || n.failed > 0) && (
                <div className={m.errorNote} role="alert">
                  {n.failed > 0 && `${t('notion.partial', { count: n.failed })}. `}
                  {n.lastError && `${t('notion.lastError')}: ${n.lastError}`}
                </div>
              )}
            </div>
            <div style={{ padding: '24px 16px 0' }}>
              <Button fullWidth icon="arrows-clockwise" disabled={busy} onClick={() => void run(notionSyncNow, (r) => { const x = r as { failed: number }; showToast(x.failed ? t('notion.partial', { count: x.failed }) : t('notion.synced'), { icon: x.failed ? 'warning-circle' : 'check' }) })}>
                {t('notion.syncNow')}
              </Button>
            </div>
            <div className={m.gap28}>
              <ListSection>
                <ListRow icon="plugs" title={t('notion.disconnect')} destructive accessory="none" onClick={() => void run(notionDisconnect, () => showToast(t('notion.disconnected'), { icon: 'plugs' }))} />
              </ListSection>
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: '32px 16px 0' }}>
              <Button fullWidth disabled={busy || !backendConfigured} onClick={() => void run(notionConnect)}>
                {t('notion.connect')}
              </Button>
            </div>
            {!backendConfigured && <div className={m.errorNote} style={{ color: 'var(--label-secondary)' }}>{t('settings.integrations.needsBackend')}</div>}
            {q.isError && <div className={m.errorNote} role="alert">{t('common.error')}</div>}
          </>
        )}
      </div>
    </AppSheet>
  )
}

/* ── Calendar: private ICS feed ───────────────────────────── */
export function CalendarSheet({ entry }: E<'calendar'>) {
  const { t } = useTranslation()
  const showToast = useNav((n) => n.showToast)
  const q = useIntegrations()
  const refresh = useRefreshIntegrations()
  const c = (q.data ?? EMPTY_STATUS).calendar
  const copied = () => showToast(t('common.copied'), { icon: 'copy' })
  const [inc, setInc] = useState({ practices: true, lagos: true, extras: false })
  const none = !inc.practices && !inc.lagos && !inc.extras
  const exportNow = () => void shareIcs(inc).then((r) => r === 'downloaded' && showToast(t('calendar.downloaded'), { icon: 'download-simple' }))
  return (
    <AppSheet entry={entry} title={t('calendar.title')}>
      <div style={{ padding: '8px 0 60px' }}>
        <Head icon="calendar-dots" title={t('calendar.title')} sub={t('calendar.lead')} />
        {c.token && (
          <div style={{ padding: '24px 16px 0' }}>
            {/* A real link, so iOS hands webcal:// straight to Calendar */}
            <LinkButton href={webcalUrl(c.token)} icon="calendar-check">
              {t('calendar.add')}
            </LinkButton>
          </div>
        )}
        <div className={m.gap28}>
          <ListSection header={t('calendar.includeHeader')} footer={t('calendar.includeFooter')}>
            <ListRow icon="waves" title={t('calendar.incPractices')} accessory="switch" switchOn={inc.practices} onSwitchChange={(v) => setInc((x) => ({ ...x, practices: v }))} />
            <ListRow icon="check-circle" title={t('calendar.incLagos')} accessory="switch" switchOn={inc.lagos} onSwitchChange={(v) => setInc((x) => ({ ...x, lagos: v }))} />
            <ListRow icon="list-checks" title={t('calendar.incExtras')} accessory="switch" switchOn={inc.extras} onSwitchChange={(v) => setInc((x) => ({ ...x, extras: v }))} />
          </ListSection>
        </div>
        <div style={{ padding: '20px 16px 0' }}>
          <Button fullWidth icon="export" disabled={none} onClick={exportNow}>{t('calendar.exportNow')}</Button>
        </div>
        <div className={m.gap28}>
          <ListSection footer={c.token ? t('calendar.rotateFooter') : t('calendar.localFooter')}>
            <ListRow icon="info" title={t('calendar.status')} value={c.token ? t('calendar.ready') : t('calendar.notReady')} accessory="none" />
            {c.token && <ListRow icon="clock" title={t('calendar.lastFetched')} value={fmtAgo(c.lastFetchedAt, t)} accessory="none" />}
            {c.token && <ListRow icon="link" title={t('calendar.copy')} accessory="none" onClick={() => void copyText(calendarFeedUrl(c.token!)).then((ok) => ok && copied())} />}
            {c.token && <ListRow icon="arrows-clockwise" title={t('calendar.rotate')} destructive accessory="none" onClick={() => void rotateFeedToken('calendar').then(() => { showToast(t('calendar.rotated'), { icon: 'arrows-clockwise' }); void refresh() }).catch(() => showToast(t('common.error'), { icon: 'warning-circle' }))} />}
          </ListSection>
        </div>
      </div>
    </AppSheet>
  )
}

/* ── Apple Reminders, via Shortcuts ───────────────────────── */
export function RemindersSheet({ entry }: E<'reminders'>) {
  const { t } = useTranslation()
  const showToast = useNav((n) => n.showToast)
  const q = useIntegrations()
  const refresh = useRefreshIntegrations()
  const r = (q.data ?? EMPTY_STATUS).reminders
  return (
    <AppSheet entry={entry} title={t('reminders.title')}>
      <div style={{ padding: '8px 0 60px' }}>
        <Head icon="list-checks" title={t('reminders.title')} badge={t('reminders.badge')} sub={t('reminders.lead')} />
        <div style={{ padding: '24px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {r.shortcutUrl ? (
            <LinkButton href={r.shortcutUrl} icon="download-simple" external>
              {t('reminders.install')}
            </LinkButton>
          ) : (
            <div className={s.sub} style={{ textAlign: 'center', padding: '0 16px' }}>{t('reminders.notPublished')}</div>
          )}
          <Button variant="secondary" fullWidth icon="link" disabled={!r.token} onClick={() => r.token && void copyText(remindersFeedUrl(r.token)).then((ok) => ok && showToast(t('common.copied'), { icon: 'copy' }))}>
            {t('reminders.copyFeed')}
          </Button>
        </div>
        <h2 className={`${s.h20} ${s.formH}`}>{t('reminders.stepsHeader')}</h2>
        <ol className={m.steps}>
          <li>{t('reminders.s1')}</li>
          <li>{t('reminders.s2')}</li>
          <li>{t('reminders.s3')}</li>
          <li>{t('reminders.s4')}</li>
        </ol>
        <div className={m.gap28}>
          <ListSection footer={t('reminders.footer')}>
            <ListRow icon="clock" title={t('reminders.lastFetched')} value={fmtAgo(r.lastFetchedAt, t)} accessory="none" />
            {r.token && <ListRow icon="arrows-clockwise" title={t('reminders.rotate')} destructive accessory="none" onClick={() => void rotateFeedToken('reminders').then(() => { showToast(t('calendar.rotated'), { icon: 'arrows-clockwise' }); void refresh() }).catch(() => showToast(t('common.error'), { icon: 'warning-circle' }))} />}
          </ListSection>
          {!backendConfigured && <div className={m.errorNote} style={{ color: 'var(--label-secondary)' }}>{t('settings.integrations.needsBackend')}</div>}
        </div>
      </div>
    </AppSheet>
  )
}

/* ── Notifications pre-prompt (shown before the system dialog) ── */
export function NotifPromptSheet({ entry }: E<'notifPrompt'>) {
  const { t } = useTranslation()
  const sh = useSheet(entry)
  const showToast = useNav((n) => n.showToast)
  const settings = useSettings()
  const rows = [
    ['bell', t('notif.r1'), t('notif.r1t', { time: fmtClock(settings.reminderTime) })],
    ['moon', t('notif.r2'), t('notif.r2t')],
    ['flag-checkered', t('notif.r3'), t('notif.r3t')],
  ] as const
  const allow = async () => {
    // Called from this tap: the only moment iOS will show the permission dialog.
    const r = await enablePush()
    showToast(r === 'granted' ? t('notif.enabled') : r === 'needs-install' ? t('notif.installFirst') : r === 'denied' ? t('notif.blocked') : t('settings.integrations.needsBackend'), { icon: 'bell' })
    sh.close()
  }
  return (
    <AppSheet entry={entry} detent={0.72}>
      <div style={{ padding: '0 24px 32px' }}>
        <div className={s.center}>
          <div className={m.intLogo}>
            <Icon name="bell" weight="fill" size={40} />
          </div>
          <h2 className={m.intTitle}>{t('notif.preTitle')}</h2>
          <div className={m.intSub}>{t('notif.preBody')}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, margin: '26px 0' }}>
          {rows.map(([icon, title, text]) => (
            <div key={title} className={s.pwBenefit}>
              <div className={`${s.circle} ${s.pwIcon}`} style={{ background: 'var(--surface-card)' }}>
                <Icon name={icon} weight="fill" size={22} />
              </div>
              <div>
                <div className={s.pwBTitle}>{title}</div>
                <div className={s.sub}>{text}</div>
              </div>
            </div>
          ))}
        </div>
        <Button fullWidth onClick={() => void allow()}>
          {t('notif.allow')}
        </Button>
        <Button variant="plain" fullWidth onClick={sh.close}>
          {t('notif.notNow')}
        </Button>
      </div>
    </AppSheet>
  )
}

/* ── Account ──────────────────────────────────────────────── */
export function AccountSheet({ entry }: E<'account'>) {
  const { t } = useTranslation()
  const showToast = useNav((n) => n.showToast)
  const qc = useQueryClient()
  const user = useStore((x) => x.user)
  const account = useQuery({ queryKey: ['account'], queryFn: accountInfo, enabled: backendConfigured }).data
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const saveName = () => name.trim() !== (user?.name ?? '') && useStore.getState().setName(name.trim())
  const fail = () => showToast(t('common.error'), { icon: 'warning-circle' })
  const signedIn = account && !account.anonymous
  const settings = useSettings()
  const update = useStore((x) => x.updateSettings)
  const file = useRef<HTMLInputElement>(null)
  const pickPhoto = async (f: File | undefined) => {
    if (!f) return
    try {
      update({ avatarPhoto: await squarePhoto(f, 256), avatarIcon: '' })
    } catch {
      fail()
    }
  }

  return (
    <AppSheet entry={entry} title={t('account.title')} detent={0.86}>
      <div style={{ padding: '8px 0 48px' }}>
        <div className={m.avatarEdit}>
          <Avatar initials={((name || user?.name || 'O')[0] ?? 'O').toUpperCase()} size={96} photo={settings.avatarPhoto} icon={settings.avatarIcon} tone={settings.avatarTone} />
          <div className={m.avatarActions}>
            <Button variant="secondary" size="md" icon="camera" onClick={() => file.current?.click()}>
              {t('account.photo')}
            </Button>
            {(settings.avatarPhoto || settings.avatarIcon) && (
              <Button variant="plain" size="md" onClick={() => update({ avatarPhoto: '', avatarIcon: '' })}>
                {t('account.useInitials')}
              </Button>
            )}
          </div>
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => void pickPhoto(e.target.files?.[0])} />
        </div>
        <div className={m.avatarGrid} role="radiogroup" aria-label={t('account.icon')}>
          {AVATAR_ICONS.map((ic) => {
            const on = !settings.avatarPhoto && settings.avatarIcon === ic
            return (
              <button key={ic} type="button" role="radio" aria-checked={on} aria-label={ic.replace(/-/g, ' ')} className={on ? `${m.avatarPick} ${m.avatarPickOn}` : m.avatarPick} onClick={() => update({ avatarIcon: ic, avatarPhoto: '' })}>
                <Icon name={ic} weight="fill" size={22} />
              </button>
            )
          })}
        </div>
        <div className={m.avatarTones} role="radiogroup" aria-label={t('account.color')}>
          {(Object.keys(AVATAR_TONES) as AvatarTone[]).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={settings.avatarTone === k} aria-label={t(`createOnda.tones.${k}`)} className={settings.avatarTone === k ? `${m.avatarSwatch} ${m.avatarSwatchOn}` : m.avatarSwatch} style={{ background: AVATAR_TONES[k][0] }} onClick={() => update({ avatarTone: k, avatarPhoto: '', avatarIcon: settings.avatarIcon || AVATAR_ICONS[0] })} />
          ))}
        </div>
        <div className={m.emailField}>
          <input aria-label={t('account.name')} placeholder={t('settings.yourName')} value={name} autoComplete="given-name" enterKeyHint="done" onChange={(e) => setName(e.target.value)} onBlur={saveName} />
        </div>
        {!backendConfigured ? (
          <div className={s.sub} style={{ padding: '16px 32px 0' }}>{t('account.localOnly')}</div>
        ) : signedIn ? (
          <div className={m.gap28}>
            <ListSection>
              <ListRow icon="user" title={account.email ? t('account.signedInAs', { email: account.email }) : t('account.signedIn')} accessory="none" />
              <ListRow icon="sign-out" title={t('account.signOut')} destructive accessory="none" onClick={() => void signOut().then(() => qc.invalidateQueries({ queryKey: ['account'] }))} />
            </ListSection>
          </div>
        ) : (
          <>
            <div className={s.sub} style={{ padding: '16px 32px 0' }}>{t('account.lead')}</div>
            <div style={{ padding: '16px 16px 0' }}>
              <Button fullWidth icon="apple-logo" variant="secondary" onClick={() => void signInWithApple().catch(fail)}>
                {t('account.apple')}
              </Button>
            </div>
            <div className={m.emailField}>
              <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" aria-label={t('account.email')} placeholder={t('account.email')} value={email} onChange={(e) => { setEmail(e.target.value); setSent(false) }} />
            </div>
            <div style={{ padding: '12px 16px 0' }}>
              <Button
                fullWidth
                icon="envelope-simple"
                disabled={sent}
                onClick={() => {
                  if (!/^\S+@\S+\.\S+$/.test(email)) return showToast(t('account.invalidEmail'), { icon: 'warning-circle' })
                  void sendMagicLink(email.trim()).then(() => setSent(true)).catch(fail)
                }}
              >
                {t('account.sendLink')}
              </Button>
            </div>
            {sent && <div className={s.sub} style={{ padding: '12px 32px 0' }} role="status">{t('account.linkSent')}</div>}
          </>
        )}
      </div>
    </AppSheet>
  )
}

/* ── What's New / Legal ───────────────────────────────────── */
export function WhatsNewSheet({ entry }: E<'whatsNew'>) {
  const { t } = useTranslation()
  return (
    <AppSheet entry={entry} title={t('whatsNew.title')} detent={0.8}>
      <div style={{ padding: '8px 0 40px' }}>
        <ListSection header={`${t('whatsNew.v71')} · ${t('whatsNew.v71date')}`}>
          <ListRow icon="palette" title={t('whatsNew.v71a')} accessory="none" />
          <ListRow icon="book-open" title={t('whatsNew.v71b')} accessory="none" />
          <ListRow icon="lightbulb" title={t('whatsNew.v71c')} accessory="none" />
        </ListSection>
        <ListSection header={`${t('whatsNew.v70')} · ${t('whatsNew.v70date')}`}>
          <ListRow icon="sparkle" title={t('whatsNew.v70a')} accessory="none" />
          <ListRow icon="list-checks" title={t('whatsNew.v70b')} accessory="none" />
          <ListRow icon="books" title={t('whatsNew.v70c')} accessory="none" />
        </ListSection>
        <ListSection header={`${t('whatsNew.v60')} · ${t('whatsNew.v60date')}`}>
          <ListRow icon="sparkle" title={t('whatsNew.v60a')} accessory="none" />
          <ListRow icon="calendar-check" title={t('whatsNew.v60b')} accessory="none" />
          <ListRow icon="headphones" title={t('whatsNew.v60c')} accessory="none" />
        </ListSection>
        <ListSection header={`${t('whatsNew.v521')} · ${t('whatsNew.v521date')}`}>
          <ListRow icon="repeat" title={t('whatsNew.v521a')} accessory="none" />
          <ListRow icon="headphones" title={t('whatsNew.v521b')} accessory="none" />
          <ListRow icon="moon" title={t('whatsNew.v521c')} accessory="none" />
        </ListSection>
        <ListSection header={`${t('whatsNew.v52')} · ${t('whatsNew.v52date')}`}>
          <ListRow icon="list-checks" title={t('whatsNew.v52a')} accessory="none" />
          <ListRow icon="arrow-up-right" title={t('whatsNew.v52b')} accessory="none" />
          <ListRow icon="paint-brush" title={t('whatsNew.v52c')} accessory="none" />
          <ListRow icon="clock" title={t('whatsNew.v52d')} accessory="none" />
          <ListRow icon="seal-check" title={t('whatsNew.v52e')} accessory="none" />
        </ListSection>
        <ListSection header={`${t('whatsNew.v51')} · ${t('whatsNew.v51date')}`}>
          <ListRow icon="compass" title={t('whatsNew.v51a')} accessory="none" />
          <ListRow icon="moon" title={t('whatsNew.v51b')} accessory="none" />
          <ListRow icon="shield-check" title={t('whatsNew.v51c')} accessory="none" />
        </ListSection>
        <ListSection header={`${t('whatsNew.v50')} · ${t('whatsNew.v50date')}`}>
          <ListRow icon="compass" title={t('whatsNew.v50a')} accessory="none" />
          <ListRow icon="info" title={t('whatsNew.v50b')} accessory="none" />
          <ListRow icon="moon" title={t('whatsNew.v50c')} accessory="none" />
          <ListRow icon="arrows-clockwise" title={t('whatsNew.v50d')} accessory="none" />
        </ListSection>
        <ListSection header={`${t('whatsNew.v30')} · ${t('whatsNew.v30date')}`}>
          <ListRow icon="compass" title={t('whatsNew.v30a')} accessory="none" />
          <ListRow icon="map-trifold" title={t('whatsNew.v30b')} accessory="none" />
          <ListRow icon="scales" title={t('whatsNew.v30c')} accessory="none" />
        </ListSection>
        <ListSection header={`${t('whatsNew.v21')} · ${t('whatsNew.v21date')}`}>
          <ListRow icon="fire" title={t('whatsNew.v21a')} accessory="none" />
          <ListRow icon="scales" title={t('whatsNew.v21b')} accessory="none" />
          <ListRow icon="shield-check" title={t('whatsNew.v21c')} accessory="none" />
        </ListSection>
        <ListSection header={`${t('whatsNew.v20')} · ${t('whatsNew.v20date')}`}>
          <ListRow icon="drop" title={t('whatsNew.v20a')} accessory="none" />
          <ListRow icon="compass" title={t('whatsNew.v20b')} accessory="none" />
          <ListRow icon="scales" title={t('whatsNew.v20c')} accessory="none" />
        </ListSection>
        <ListSection header={`${t('whatsNew.v14')} · ${t('whatsNew.v14date')}`}>
          <ListRow icon="list-checks" title={t('whatsNew.v14a')} accessory="none" />
          <ListRow icon="repeat" title={t('whatsNew.v14b')} accessory="none" />
          <ListRow icon="calendar-dots" title={t('whatsNew.v14c')} accessory="none" />
        </ListSection>
        <ListSection header={`${t('whatsNew.v131')} · ${t('whatsNew.v131date')}`}>
          <ListRow icon="eye" title={t('whatsNew.v131a')} accessory="none" />
          <ListRow icon="calendar-dots" title={t('whatsNew.v131b')} accessory="none" />
          <ListRow icon="notebook" title={t('whatsNew.v131c')} accessory="none" />
        </ListSection>
        <ListSection header={`${t('whatsNew.v13')} · ${t('whatsNew.v13date')}`}>
          <ListRow icon="waves" title={t('whatsNew.v13a')} accessory="none" />
          <ListRow icon="paint-brush" title={t('whatsNew.v13b')} accessory="none" />
          <ListRow icon="database" title={t('whatsNew.v13c')} accessory="none" />
        </ListSection>
        <div style={{ height: 20 }} />
        <ListSection header={`${t('whatsNew.v1')} · ${t('whatsNew.v1date')}`}>
          <ListRow icon="wave-sine" title={t('whatsNew.v1a')} accessory="none" />
          <ListRow icon="waves" title={t('whatsNew.v1b')} accessory="none" />
          <ListRow icon="arrows-clockwise" title={t('whatsNew.v1c')} accessory="none" />
        </ListSection>
      </div>
    </AppSheet>
  )
}

export function LegalSheet({ entry }: E<'legal'>) {
  const { t } = useTranslation()
  return (
    <AppSheet entry={entry} title={t(`legal.${entry.doc}Title`)} detent={0.78} background="var(--surface-page)">
      <div className={m.legal} data-selectable>
        <p style={{ marginTop: 0 }}>{t(`legal.${entry.doc}Body`)}</p>
        <p className={s.sub}>{t('legal.draft')}</p>
      </div>
    </AppSheet>
  )
}

/** Centre-crop to a square and re-encode small, so the profile picture stays a few tens of KB and syncs with settings. */
async function squarePhoto(file: Blob, size: number): Promise<string> {
  const bmp = await createImageBitmap(file)
  const side = Math.min(bmp.width, bmp.height)
  const c = document.createElement('canvas')
  c.width = c.height = size
  c.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size)
  return c.toDataURL('image/jpeg', 0.82)
}
