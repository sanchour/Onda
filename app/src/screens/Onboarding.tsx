import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ONDA_INDEX, loadOnda } from '@/content'
import { canBeginOnda, plusState } from '@/data/entitlement'
import { useLookFn } from '@/data/hooks'
import { useStore } from '@/data/store'
import { fromClock, now, toClock } from '@/lib/dates'
import { EASE_ENTER, PUSH_MS, reducedMotion } from '@/lib/motion'
import { ChromeTitle } from '@/nav/Screen'
import navCss from '@/nav/nav.module.css'
import { nav } from '@/nav/store'
import { Button, GlassButton } from '@/ui/buttons'
import { ProgressRing, StepBar } from '@/ui/data'
import { Icon } from '@/ui/Icon'
import { RulerPicker, WheelPicker } from '@/ui/pickers'
import s from './screens.module.css'

/** The Onda chosen on the last step. It begins once the paywall closes, if the user is entitled to it. */
let pendingFirstOnda: { id: string; length: number } | null = null
export async function beginPendingOnda() {
  const p = pendingFirstOnda
  pendingFirstOnda = null
  const st = useStore.getState()
  if (!p || st.runs.some((r) => r.state === 'active' && !r.deletedAt)) return
  if (!canBeginOnda(plusState(st.user, now().getTime()), p.id)) return
  try {
    st.beginOnda(await loadOnda(p.id), p.length)
  } catch (e) {
    console.warn('[onda] could not begin first Onda', e)
  }
}

const HOURS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))
const MINS = [0, 15, 30, 45].map((m) => ({ value: m, label: (m < 10 ? '0' : '') + m }))
const AP = [{ value: 'AM', label: 'AM' }, { value: 'PM', label: 'PM' }]

/** First run: three intro pages, then length, reminder time and first Onda. No Skip anywhere. */
export default function Onboarding() {
  const { t } = useTranslation()
  const look = useLookFn()
  const settings = useStore((st) => st.user?.settings)
  const [step, setStep] = useState(0)
  const [len, setLen] = useState(settings?.defaultOndaLength ?? 14)
  const [time, setTime] = useState(() => fromClock(settings?.reminderTime ?? '08:00'))
  const [pick, setPick] = useState('stoic')
  const pane = useRef<HTMLDivElement>(null)
  const last = useRef(0)

  // Step change: a short slide in the direction of travel (fade when motion is reduced)
  useLayoutEffect(() => {
    const el = pane.current
    if (!el || last.current === step) return
    const dx = reducedMotion() ? 0 : step > last.current ? 48 : -48
    last.current = step
    el.animate([{ transform: `translate3d(${dx}px,0,0)`, opacity: 0.4 }, { transform: 'translate3d(0,0,0)', opacity: 1 }], { duration: PUSH_MS, easing: EASE_ENTER })
  }, [step])

  const finish = () => {
    pendingFirstOnda = { id: pick, length: len }
    useStore.getState().updateSettings({ onboarded: true, defaultOndaLength: len, reminderTime: toClock(time.h, time.m, time.ap) })
    nav().popToRoot('ondas')
    nav().push({ name: 'paywall' })
  }
  const next = () => (step < 5 ? setStep(step + 1) : finish())

  const lagoCard = (icon: string, name: string, meta: string, ring: number) => (
    <div key={name} className={s.obCard}>
      <ProgressRing value={ring} size={56} stroke={4} color="var(--label)" track="var(--gray-250)">
        <Icon name={icon} weight="fill" size={24} />
      </ProgressRing>
      <div style={{ minWidth: 0 }}>
        <div className={s.obCardName}>{name}</div>
        <div className={s.obCardMeta}>{meta}</div>
      </div>
    </div>
  )
  const ondaCard = (id: string) => {
    const o = ONDA_INDEX.find((x) => x.id === id)!
    return (
      <div key={id} className={`${s.obCard} ${s.obCardThemed}`} style={look(o).vars}>
        <ProgressRing value={0} size={56} stroke={4} color="var(--onda-ink)" track="var(--onda-chip)">
          <Icon name={o.icon} weight="fill" size={24} />
        </ProgressRing>
        <div style={{ minWidth: 0 }}>
          <div className={s.obCardName}>{o.name}</div>
          <div className={s.obCardMeta}>{o.origin}</div>
        </div>
      </div>
    )
  }

  const pages = [
    { title: t('onboarding.p1Title'), sub: t('onboarding.p1Sub'), cards: [lagoCard('shower', t('onboarding.c1a'), t('onboarding.dayDaily', { day: 1 }), 0), lagoCard('flower-lotus', t('onboarding.c1b'), t('onboarding.dayDaily', { day: 5 }), 0.17), lagoCard('book-open', t('onboarding.c1c'), t('onboarding.dayDaily', { day: 7 }), 0.23)] },
    { title: t('onboarding.p2Title'), sub: t('onboarding.p2Sub'), cards: ['stoic', 'zen', 'sufi'].map(ondaCard) },
    { title: t('onboarding.p3Title'), sub: t('onboarding.p3Sub'), cards: [lagoCard('sun-horizon', t('onboarding.c3a'), t('onboarding.kept'), 1), lagoCard('shower', t('onboarding.c3b'), t('onboarding.kept'), 1), lagoCard('moon', t('onboarding.c3c'), t('onboarding.notKept'), 0.4)] },
  ]
  const setup = [
    { q: t('onboarding.qLength'), h: t('onboarding.hLength') },
    { q: t('onboarding.qTime'), h: t('onboarding.hTime') },
    { q: t('onboarding.qPick'), h: t('onboarding.hPick') },
  ]
  const intro = step < 3
  const pg = pages[Math.min(step, 2)]!
  const su = setup[Math.max(0, step - 3)]!

  return (
    <div className={s.ob}>
      {/* no back on page one */}
      {step > 0 && (
        <div className={navCss.chrome}>
          <GlassButton icon="caret-left" ariaLabel={t('a11y.back')} onClick={() => setStep(step - 1)} />
          {!intro && <ChromeTitle>{t('onboarding.setUp')}</ChromeTitle>}
          <span />
        </div>
      )}
      <div ref={pane} className={s.obStep}>
        {intro ? (
          <>
            <div className={s.obCards} aria-hidden>
              {pg.cards}
            </div>
            <div className={s.obText}>
              <h1 className={s.obTitle}>{pg.title}</h1>
              <div className={s.obSub}>{pg.sub}</div>
            </div>
            <div className={s.obDots} role="img" aria-label={t('a11y.page', { n: step + 1, total: 3 })}>
              {[0, 1, 2].map((i) => (
                <span key={i} className={i === step ? `${s.obDot} ${s.obDotOn}` : s.obDot} />
              ))}
            </div>
          </>
        ) : (
          <>
            <StepBar value={(step - 2) / 3} style={{ marginTop: 'calc(var(--chrome-top) + 56px)' }} />
            <h1 className={s.obQuestion}>{su.q}</h1>
            <div className={s.obHint}>{su.h}</div>
            {step === 3 && (
              <div className={s.obPicker}>
                <div className={s.obRuler}>
                  <RulerPicker value={len} min={7} max={30} unit={t('common.unitDays')} onChange={setLen} ariaLabel={su.q} />
                </div>
              </div>
            )}
            {step === 4 && (
              <div className={s.obPicker}>
                <WheelPicker
                  columns={[
                    { items: HOURS, value: time.h, onChange: (v) => setTime((x) => ({ ...x, h: Number(v) })), ariaLabel: t('common.hour') },
                    { items: MINS, value: MINS.some((m) => m.value === time.m) ? time.m : 0, onChange: (v) => setTime((x) => ({ ...x, m: Number(v) })), ariaLabel: t('common.minute') },
                    { items: AP, value: time.ap, onChange: (v) => setTime((x) => ({ ...x, ap: v as 'AM' | 'PM' })), ariaLabel: t('common.period') },
                  ]}
                />
              </div>
            )}
            {step === 5 && (
              <div className={`scroll ${s.obPicks}`} role="radiogroup" aria-label={su.q}>
                {ONDA_INDEX.map((o) => (
                  <button key={o.id} type="button" role="radio" aria-checked={pick === o.id} className={pick === o.id ? `${s.obPick} ${s.obPickOn}` : s.obPick} style={look(o).vars} onClick={() => setPick(o.id)}>
                    <span className={s.obPickName}>{o.name}</span>
                    <span className={s.obPickOrigin}>{o.origin}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <div className={s.obCta}>
        <Button fullWidth onClick={next}>
          {step < 3 ? t('common.continue') : step < 5 ? t('common.next') : t('onboarding.getStarted')}
        </Button>
      </div>
    </div>
  )
}
