import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDesk } from '@/lib/desk'
import { fmtAgo } from '@/lib/dates'
import { BackButton, ChromeTitle, Screen } from '@/nav/Screen'
import { codeChars, CODE_LEN, CODE_TTL } from '@/sync/link/code'
import { cancelPairing, enterCode, resetPairing, startShowCode, unlinkDevice, useLinkState, type LinkedDevice } from '@/sync/link/state'
import { Button } from '@/ui/buttons'
import { Icon } from '@/ui/Icon'
import { GroupedList, Row } from './onda7'
import l from './link.module.css'

const KIND_ICON = { phone: 'device-mobile', tablet: 'device-tablet', computer: 'laptop' } as const

/** Seconds left on a code, ticking. */
function useCountdown(until: number | undefined) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!until) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [until])
  return until ? Math.max(0, Math.round((until - now) / 1000)) : 0
}

function Linked({ peer }: { peer?: string }) {
  const { t } = useTranslation()
  return (
    <div className={l.done} role="status">
      <span className={l.doneMark}>
        <Icon name="check" weight="bold" size={30} />
      </span>
      <div className={l.doneTitle}>{t('link.linkedWith', { name: peer || t('link.otherDevice') })}</div>
      <div className={l.help}>{t('link.linkedSub')}</div>
    </div>
  )
}

/** The code in two groups of four, a ring that empties as it expires, and what to do on the other device. */
function ShowCode({ code, expiresAt, state, peer }: { code: string; expiresAt: number; state: string; peer?: string }) {
  const { t } = useTranslation()
  const left = useCountdown(state === 'waiting' ? expiresAt : undefined)
  if (state === 'linked') return <Linked peer={peer} />
  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
  const frac = left / (CODE_TTL / 1000)
  return (
    <div className={l.show}>
      <div className={l.code} aria-label={`${t('link.codeLabel')}: ${code.split('').join(' ')}`} data-selectable>
        {[code.slice(0, 4), code.slice(4)].map((g, i) => (
          <span key={i} className={l.codeGroup} aria-hidden>
            {g.split('').map((ch, j) => (
              <span key={j} className={l.codeChar}>{ch}</span>
            ))}
          </span>
        ))}
      </div>
      {state === 'waiting' ? (
        <>
          <div className={l.wait}>
            <svg className={l.ring} viewBox="0 0 36 36" aria-hidden>
              <circle cx="18" cy="18" r="15" />
              <circle cx="18" cy="18" r="15" strokeDasharray={`${frac * 94.25} 94.25`} />
            </svg>
            <span>{t('link.waiting')}</span>
            <span className={l.mute}>{t('link.expires', { time: mm })}</span>
          </div>
          <p className={l.help}>{t('link.showHelp')}</p>
          <Button variant="secondary" size="md" onClick={cancelPairing}>
            {t('common.cancel')}
          </Button>
        </>
      ) : (
        <>
          <p className={l.err}>{state === 'expired' ? t('link.expired') : t('link.err.failed')}</p>
          <Button size="md" onClick={startShowCode}>
            {t('link.newCode')}
          </Button>
        </>
      )}
    </div>
  )
}

/** Eight boxes over one real input: typing, deleting and pasting all work, and the phone offers its code keyboard. */
function EnterCode({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  const pairing = useLinkState((s) => s.pairing)
  const p = pairing?.mode === 'enter' ? pairing : null
  const [value, setValue] = useState('')
  const [focus, setFocus] = useState(true)
  const input = useRef<HTMLInputElement>(null)
  const working = p?.state === 'working'
  const submit = (v = value) => v.length === CODE_LEN && !working && enterCode(v)
  if (p?.state === 'linked') return <Linked peer={p.peer} />
  return (
    <div className={l.enter}>
      <label className={l.boxes} data-focus={focus ? '' : undefined}>
        <span className="sr-only">{t('link.codeLabel')}</span>
        <input
          ref={input}
          className={l.boxInput}
          value={value}
          autoFocus
          autoComplete="one-time-code"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          maxLength={CODE_LEN + 2}
          disabled={working}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onChange={(e) => {
            const v = codeChars(e.target.value).slice(0, CODE_LEN)
            setValue(v)
            if (p?.state === 'error') resetPairing()
            // a pasted whole code goes straight away
            if (v.length === CODE_LEN && e.target.value.length > value.length + 1) submit(v)
          }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        {Array.from({ length: CODE_LEN }, (_, i) => (
          <span key={i} className={l.box} data-gap={i === 4 ? '' : undefined} data-on={i === Math.min(value.length, CODE_LEN - 1) ? '' : undefined} aria-hidden>
            {value[i] ?? ''}
          </span>
        ))}
      </label>
      <p className={p?.state === 'error' ? l.err : l.help} role={p?.state === 'error' ? 'alert' : undefined}>
        {p?.state === 'error' ? t(`link.err.${p.message ?? 'failed'}`) : working ? t('link.linking') : t('link.enterSub')}
      </p>
      <div className={l.actions}>
        <Button variant="secondary" size="md" onClick={() => (working ? cancelPairing() : onBack())}>
          {t('common.cancel')}
        </Button>
        <Button size="md" disabled={value.length < CODE_LEN || working} onClick={() => submit()}>
          {working ? t('link.linking') : t('link.link')}
        </Button>
      </div>
    </div>
  )
}

/** Pair this device with another: show a code here, or enter the one shown there. Also used by onboarding. */
export function PairPanel() {
  const { t } = useTranslation()
  const pairing = useLinkState((s) => s.pairing)
  const [entering, setEntering] = useState(false)
  // leaving the page stops a code that is still waiting: it should not stay open on the relays
  useEffect(() => () => {
    if (pairing?.mode === 'show' && pairing.state === 'waiting') cancelPairing()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  if (pairing?.mode === 'show') return <ShowCode {...pairing} />
  if (entering || pairing?.mode === 'enter')
    return (
      <EnterCode
        onBack={() => {
          setEntering(false)
          resetPairing()
        }}
      />
    )
  return (
    <div className={l.choose}>
      <button type="button" className={l.choice} onClick={startShowCode}>
        <Icon name="qr-code" size={28} />
        <span className={l.choiceTitle}>{t('link.show')}</span>
        <span className={l.choiceSub}>{t('link.showSub')}</span>
      </button>
      <button type="button" className={l.choice} onClick={() => setEntering(true)}>
        <Icon name="keyboard" size={28} />
        <span className={l.choiceTitle}>{t('link.enter')}</span>
        <span className={l.choiceSub}>{t('link.enterSub')}</span>
      </button>
    </div>
  )
}

function DeviceRow({ d }: { d: LinkedDevice }) {
  const { t } = useTranslation()
  const status = useLinkState((s) => s.status)
  const lastSyncAt = useLinkState((s) => s.lastSyncAt)
  const sub = d.me
    ? status === 'live' && lastSyncAt
      ? t('link.synced', { when: fmtAgo(lastSyncAt, t).toLowerCase() })
      : t(`link.status.${status}`)
    : d.online
      ? t('link.online')
      : t('link.seen', { when: fmtAgo(d.lastSeen, t).toLowerCase() })
  const live = d.me ? status === 'live' : d.online
  return (
    <Row
      icon={KIND_ICON[d.kind] ?? 'laptop'}
      title={d.me ? `${d.name} (${t('link.thisDevice')})` : d.name}
      sub={sub}
      trailing={<span className={l.dot} data-on={live ? '' : undefined} aria-hidden />}
    />
  )
}

export default function LinkDevices() {
  const { t } = useTranslation()
  const desk = useDesk()
  const linked = useLinkState((s) => s.linked)
  const devices = useLinkState((s) => s.devices)
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    if (!confirm) return
    const id = setTimeout(() => setConfirm(false), 3000)
    return () => clearTimeout(id)
  }, [confirm])

  const list = (
    <GroupedList header={t('link.devices')} footer={linked ? undefined : t('link.notLinked')}>
      {linked && devices.length ? devices.map((d) => <DeviceRow key={d.tag} d={d} />) : <Row icon={desk ? 'laptop' : 'device-mobile'} title={t('link.thisDevice')} />}
    </GroupedList>
  )
  const unlink = linked && (
    <div className={l.unlinkWrap}>
      <button
        type="button"
        className={l.unlink}
        onClick={() => {
          if (!confirm) return setConfirm(true)
          setConfirm(false)
          void unlinkDevice()
        }}
      >
        {confirm ? t('link.unlinkConfirm') : t('link.unlink')}
      </button>
      <p className={l.footnote}>{t('link.unlinkFooter')}</p>
    </div>
  )

  return (
    <Screen
      desk="wide"
      chrome={
        <>
          <BackButton />
          <ChromeTitle after={60}>{t('link.title')}</ChromeTitle>
          <span />
        </>
      }
    >
      <div className={l.page}>
        <header className={l.head}>
          <h1 className={l.title}>{t('link.title')}</h1>
          <p className={l.lead}>{t('link.lead')}</p>
        </header>
        <section className={l.pairCard} aria-label={t('link.show')}>
          <PairPanel />
        </section>
        <div className={l.side}>
          {list}
          {unlink}
          <p className={l.footnote}>{t('link.privacy')}</p>
        </div>
      </div>
    </Screen>
  )
}
