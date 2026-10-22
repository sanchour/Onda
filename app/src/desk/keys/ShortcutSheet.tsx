import { useEffect, useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/ui/Icon'
import { useDeskUI } from '../store'
import { trapTab, usePresence, useReturnFocus } from './dialog'
import { Keys } from './Kbd'
import k from './keys.module.css'
import { SHORTCUTS } from './shortcuts'

/** The keyboard shortcut sheet (?): every shortcut in four short groups, on a glass card. */
export default function ShortcutSheet() {
  const open = useDeskUI((s) => s.shortcuts)
  const mounted = usePresence(open, 180)
  return mounted ? <Sheet open={open} /> : null
}

function Sheet({ open }: { open: boolean }) {
  const { t } = useTranslation()
  const panel = useRef<HTMLDivElement>(null)
  const restore = useReturnFocus()
  const titleId = useId()
  const close = () => useDeskUI.getState().setShortcuts(false)

  useEffect(() => {
    if (open) panel.current?.focus({ preventScroll: true })
    else restore()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={k.root} data-closing={open ? undefined : ''}>
      <div className={k.scrim} onPointerDown={close} aria-hidden />
      <div
        ref={panel}
        className={k.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={(e) => {
          trapTab(e, panel.current)
          if (e.key === 'Escape' || e.key === '?') {
            e.preventDefault()
            close()
          }
        }}
      >
        <header className={k.head}>
          <span className={k.headIcon} aria-hidden>
            <Icon name="keyboard" size={22} />
          </span>
          <h2 id={titleId} className={k.title}>{t('power.keys.title')}</h2>
          <button type="button" className={k.close} onClick={close} aria-label={t('a11y.close')}>
            <Icon name="x" weight="bold" size={16} />
          </button>
        </header>
        <div className={k.grid}>
          {SHORTCUTS.map((g) => (
            <section key={g.title} className={k.group} aria-label={t(`power.keys.${g.title}`)}>
              <h3 className={k.groupHead}>{t(`power.keys.${g.title}`)}</h3>
              <dl className={k.list}>
                {g.items.map((s) => (
                  <div key={s.label} className={k.row}>
                    <dt>{t(`power.keys.${s.label}`)}</dt>
                    <dd>
                      {s.keys.map((combo, i) => (
                        <span key={i} className={k.alt}>
                          {i > 0 && <span className={k.or}>{t('power.keys.or')}</span>}
                          <Keys keys={combo} />
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
