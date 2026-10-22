import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { EmblemArt } from '@/screens/emblems'
import { useActiveOnda } from '@/screens/ondaShared'
import { Icon } from '@/ui/Icon'
import { trapTab, usePresence, useReturnFocus } from '../keys/dialog'
import { Keys } from '../keys/Kbd'
import { useDeskUI } from '../store'
import { search, usePaletteItems, type Act, type PItem, type Row } from './items'
import p from './palette.module.css'
import { Preview } from './Preview'

/* The command palette (Cmd or Ctrl+K, /, or Search in the sidebar). A glass panel near the top of the window:
   the field, results in groups with a highlight that glides between rows, a preview of the chosen result, and a
   footer naming what Enter will do. The field keeps focus throughout; the list is an ARIA listbox driven by
   aria-activedescendant. */

export default function Palette() {
  const open = useDeskUI((s) => s.palette)
  const mounted = usePresence(open, 170)
  return mounted ? <Panel open={open} /> : null
}

/** Text with the matched letters marked. */
function Marked({ text, marks }: { text: string; marks?: number[] }) {
  if (!marks?.length) return <>{text}</>
  const on = new Set(marks)
  const out: ReactNode[] = []
  let run = ''
  let hit = on.has(0)
  for (let i = 0; i <= text.length; i++) {
    const m = i < text.length && on.has(i)
    if (i === text.length || m !== hit) {
      if (run) out.push(hit ? <mark key={i}>{run}</mark> : run)
      run = ''
      hit = m
    }
    if (i < text.length) run += text[i]
  }
  return <>{out}</>
}

function Lead({ item }: { item: PItem }) {
  if (item.kind === 'onda' && item.look) {
    const look = item.look
    return (
      <span className={p.cover} style={{ background: look.cover, color: look.ink }} aria-hidden>
        {look.emblem ? <EmblemArt id={look.emblem} size={24} line={1} /> : <Icon name={item.icon} size={15} />}
      </span>
    )
  }
  if (item.kind === 'lago') {
    return (
      <span className={p.lagoIcon} data-on={item.checked ? '' : undefined} aria-hidden>
        <Icon name={item.icon} weight="fill" size={16} />
      </span>
    )
  }
  return (
    <span className={p.icon} data-kind={item.kind} aria-hidden>
      <Icon name={item.icon} size={18} />
    </span>
  )
}

function Panel({ open }: { open: boolean }) {
  const { t } = useTranslation()
  const items = usePaletteItems()
  const [query, setQuery] = useState('')
  const sections = useMemo(() => search(items, query), [items, query])
  const flat = useMemo(() => sections.flatMap((s) => s.rows), [sections])
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const index = Math.max(0, flat.findIndex((r) => r.item.key === activeKey))
  const current: Row | undefined = flat[index]
  const uid = useId()
  const optId = (key: string) => `${uid}o${key}`
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const glide = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const pointer = useRef({ x: -1, y: -1 })
  const restore = useReturnFocus()
  const active = useActiveOnda()

  useEffect(() => {
    if (open) input.current?.focus({ preventScroll: true })
    else restore()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // the highlight glides to the chosen row, and the row scrolls into view (with its group's heading when it is the first)
  useLayoutEffect(() => {
    const g = glide.current
    const el = current ? document.getElementById(optId(current.item.key)) : null
    if (!g) return
    if (!el) {
      g.style.opacity = '0'
      return
    }
    g.style.opacity = '1'
    g.style.transform = `translate3d(0,${el.offsetTop}px,0)`
    g.style.height = `${el.offsetHeight}px`
    el.scrollIntoView({ block: 'nearest' })
    if (el.previousElementSibling?.getAttribute('role') === 'presentation') el.previousElementSibling.scrollIntoView({ block: 'nearest' })
    // glide only once it has a place to glide from
    if (!g.dataset.ready) requestAnimationFrame(() => (g.dataset.ready = ''))
  }, [current?.item.key, sections]) // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => useDeskUI.getState().closePalette()
  const run = (act: Act | undefined) => {
    if (!act) return
    if (act.stay) return act.run()
    // focus goes back before the action, so a sheet it opens takes focus from there
    restore()
    close()
    act.run()
  }
  const move = (d: number, wrap = true) => {
    if (!flat.length) return
    const n = wrap ? (index + d + flat.length) % flat.length : Math.max(0, Math.min(flat.length - 1, index + d))
    setActiveKey(flat[n]!.item.key)
  }
  const jumpGroup = (d: number) => {
    if (!sections.length || !current) return
    const at = sections.findIndex((s) => s.rows.includes(current))
    setActiveKey(sections[(at + d + sections.length) % sections.length]!.rows[0]!.item.key)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return
    const mod = e.metaKey || e.ctrlKey
    if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) {
      e.preventDefault()
      move(1)
    } else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) {
      e.preventDefault()
      move(-1)
    } else if (e.key === 'PageDown' || e.key === 'PageUp') {
      e.preventDefault()
      move(e.key === 'PageDown' ? 6 : -6, false)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      jumpGroup(e.shiftKey ? -1 : 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (current) run(mod ? current.item.alt : e.shiftKey ? current.item.focus : current.item.primary)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (query) setQuery('')
      else close()
    }
  }

  const item = current?.item
  const listId = `${uid}list`
  const count = flat.length
  const style = active ? (active.look.vars as CSSProperties) : undefined

  return (
    <div className={p.root} data-closing={open ? undefined : ''} style={style}>
      <div className={p.scrim} onPointerDown={close} aria-hidden />
      <div ref={panel} className={p.panel} role="dialog" aria-modal="true" aria-label={t('power.palette.label')} onKeyDown={(e) => trapTab(e, panel.current)}>
        <div className={p.head}>
          <Icon name="magnifying-glass" size={20} className={p.lens} />
          <input
            ref={input}
            className={p.input}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={item ? optId(item.key) : undefined}
            aria-label={t('power.palette.label')}
            placeholder={t('power.palette.placeholder')}
            spellCheck={false}
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveKey(null)
            }}
            onKeyDown={onKeyDown}
          />
          {query ? (
            <button type="button" tabIndex={-1} className={p.clear} onMouseDown={(e) => e.preventDefault()} onClick={() => setQuery('')} aria-label={t('power.palette.clear')}>
              <Icon name="x" weight="bold" size={12} />
            </button>
          ) : (
            <Keys keys={['esc']} />
          )}
        </div>

        <div className={p.body}>
          <div ref={list} className={p.list} id={listId} role="listbox" aria-label={t('power.palette.results')}>
            <div ref={glide} className={p.glide} aria-hidden />
            {sections.map((s) => (
              <div key={s.group} role="group" aria-labelledby={`${uid}g${s.group}`} className={p.group}>
                <div className={p.groupHead} id={`${uid}g${s.group}`} role="presentation">
                  {t(`power.palette.group.${s.group}`)}
                </div>
                {s.rows.map((r) => {
                  const it = r.item
                  const on = it.key === item?.key
                  return (
                    <div
                      key={it.key}
                      id={optId(it.key)}
                      role="option"
                      aria-selected={on}
                      aria-checked={it.checked}
                      className={p.row}
                      data-kind={it.kind}
                      data-active={on ? '' : undefined}
                      onMouseDown={(e) => e.preventDefault()}
                      onPointerMove={(e) => {
                        // only a real move of the mouse chooses a row, not the list scrolling beneath it
                        if (e.clientX === pointer.current.x && e.clientY === pointer.current.y) return
                        pointer.current = { x: e.clientX, y: e.clientY }
                        if (!on) setActiveKey(it.key)
                      }}
                      onClick={() => run(it.primary)}
                    >
                      <Lead item={it} />
                      <span className={p.text}>
                        <span className={p.title}>
                          <Marked text={it.title} marks={r.marks.get(0)} />
                        </span>
                        {it.sub && (
                          <span className={p.sub}>
                            <Marked text={it.sub} marks={r.marks.get(1)} />
                          </span>
                        )}
                      </span>
                      {it.badge && <span className={p.badge}>{it.badge}</span>}
                      {on && (it.alt || it.focus) && (
                        <span className={p.reveal}>
                          {[it.alt, it.focus].map(
                            (a) =>
                              a && (
                                <button key={a.label} type="button" tabIndex={-1} className={p.chip} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); run(a) }}>
                                  {a.icon && <Icon name={a.icon} size={14} />}
                                  {a.label}
                                </button>
                              ),
                          )}
                        </span>
                      )}
                      {it.keys && !(on && (it.alt || it.focus)) && <Keys keys={it.keys} tone="soft" />}
                      {it.checked !== undefined && (
                        <span className={p.check} data-on={it.checked ? '' : undefined} aria-hidden>
                          <Icon name="check" weight="bold" size={12} />
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
            {query && !count && (
              <div className={p.empty}>
                <span className={p.emptyIcon} aria-hidden>
                  <Icon name="magnifying-glass" size={26} />
                </span>
                <div className={p.emptyTitle}>{t('power.palette.empty')}</div>
                <div className={p.emptySub}>{t('power.palette.emptySub')}</div>
              </div>
            )}
          </div>
          {item && (
            <aside className={p.preview} aria-label={item.title}>
              <Preview key={item.key} item={item} />
            </aside>
          )}
        </div>

        <footer className={p.foot}>
          <span className={p.footHint}>
            <Keys keys={['up']} tone="soft" />
            <Keys keys={['down']} tone="soft" />
            {t('power.palette.move')}
            <span className={p.dot} />
            <Keys keys={['tab']} tone="soft" />
            {t('power.palette.nextGroup')}
          </span>
          {item && (
            <span className={p.footActs}>
              {item.focus && (
                <button type="button" tabIndex={-1} className={p.footAct} onMouseDown={(e) => e.preventDefault()} onClick={() => run(item.focus)}>
                  {item.focus.label}
                  <Keys keys={['shift', 'enter']} tone="soft" />
                </button>
              )}
              {item.alt && (
                <button type="button" tabIndex={-1} className={p.footAct} onMouseDown={(e) => e.preventDefault()} onClick={() => run(item.alt)}>
                  {item.alt.label}
                  <Keys keys={['mod', 'enter']} tone="soft" />
                </button>
              )}
              <button type="button" tabIndex={-1} className={`${p.footAct} ${p.footMain}`} onMouseDown={(e) => e.preventDefault()} onClick={() => run(item.primary)}>
                {item.primary.label}
                <Keys keys={['enter']} />
              </button>
            </span>
          )}
        </footer>
        <div className="sr-only" aria-live="polite">
          {query ? t('power.palette.count', { count }) : ''}
        </div>
      </div>
    </div>
  )
}
