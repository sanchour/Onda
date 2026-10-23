import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ONDA_ORIGIN, placeAt } from '@/content/placeCoords'
import type { OndaLook } from '@/content/themes'
import { haptic } from '@/lib/haptics'
import { openExternal } from '@/sheets/guideParts'
import g from '@/sheets/guide.module.css'
import { Icon } from '@/ui/Icon'
import { WORLD_LAND } from './worldLand'

/* The Onda maps (8.1): "Where it took root" in the Full Guide and the Travel tab in Immersion. The land is Natural Earth
   (src/screens/worldLand.ts, from scripts/gen-world.mjs) in an equirectangular frame of 800 x 400; every place to visit
   has its own coordinates (content/placeCoords.ts). Drag to move, pinch, double tap or the buttons to zoom; pins keep
   their size at any zoom. */

export interface MapPlace {
  id: string
  title: string
  creator?: string
  why?: string
  link?: string
  icon?: string
  unverified?: boolean
}

const MAP_W = 800
const MAP_H = 400
const MIN_W = 6

function project(lat: number, lng: number): { x: number; y: number } {
  return { x: ((lng + 180) / 360) * MAP_W, y: ((90 - lat) / 180) * MAP_H }
}

/** Where a place is on the map, or null for a festival or a place that is anywhere. */
function resolveCoords(place: MapPlace): { x: number; y: number } | null {
  const at = placeAt(place.id)
  return at ? project(at[0], at[1]) : null
}

interface View {
  x: number
  y: number
  w: number
  h: number
}
const WORLD: View = { x: 0, y: 0, w: MAP_W, h: MAP_H }

/** The view that frames these points with some sea around them, at the canvas's aspect. */
function fitView(points: { x: number; y: number }[], aspect: number): View {
  if (!points.length) return WORLD
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const pad = Math.max(10, (x1 - x0) * 0.22, (y1 - y0) * 0.22)
  let w = Math.max(x1 - x0 + pad * 2, 34)
  let h = Math.max(y1 - y0 + pad * 2, 34 / aspect)
  if (w / h > aspect) h = w / aspect
  else w = h * aspect
  return clampView({ x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h })
}

function clampView(v: View): View {
  const aspect = v.w / v.h
  const w = Math.min(MAP_W, Math.max(MIN_W, v.w))
  const h = Math.min(MAP_H, w / aspect)
  return { x: Math.min(MAP_W - w, Math.max(0, v.x)), y: Math.min(MAP_H - h, Math.max(0, v.y)), w, h }
}

/** Zoom by `f` (above 1 zooms in) around a point given as fractions of the canvas. */
const zoomAt = (v: View, f: number, fx = 0.5, fy = 0.5): View => {
  const w = Math.min(MAP_W, Math.max(MIN_W, v.w / f))
  const h = w * (v.h / v.w)
  return clampView({ x: v.x + (v.w - w) * fx, y: v.y + (v.h - h) * fy, w, h })
}

interface Pin {
  key: string
  x: number
  y: number
  title: string
  origin?: boolean
}

/** The map itself: ocean, grid, land and pins, which the finger and the zoom buttons move. */
function MapCanvas({ fit, pins, active, onPick, label, className, labels, children }: { fit: View; pins: Pin[]; active?: string; onPick: (key: string) => void; label: string; className?: string; labels?: boolean; children?: ReactNode }) {
  const { t } = useTranslation()
  const svg = useRef<SVGSVGElement>(null)
  const [view, setView] = useState(fit)
  const [px, setPx] = useState(360)
  const pts = useRef(new Map<number, { x: number; y: number }>())
  const g0 = useRef({ view: fit, x: 0, y: 0, d: 0, mx: 0, my: 0, moved: false, swallow: false })

  useLayoutEffect(() => {
    const el = svg.current
    if (!el) return
    const ro = new ResizeObserver(() => setPx(el.clientWidth || 360))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const rect = () => svg.current!.getBoundingClientRect()
  const two = () => [...pts.current.values()] as [{ x: number; y: number }, { x: number; y: number }]
  const start = () => {
    const s = g0.current
    s.view = view
    if (pts.current.size === 2) {
      const [a, b] = two()
      s.d = Math.hypot(a.x - b.x, a.y - b.y)
      s.mx = (a.x + b.x) / 2
      s.my = (a.y + b.y) / 2
    } else {
      const [a] = [...pts.current.values()]
      s.x = a!.x
      s.y = a!.y
    }
  }
  // zoomed in past the framed view, the finger moves the map; at the framed view a vertical drag still scrolls the page
  const zoomed = view.w < fit.w - 0.5
  const k = view.w / px

  return (
    <div className={className}>
      <svg
        ref={svg}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className={g.mapSvg}
        role="img"
        aria-label={label}
        style={{ touchAction: zoomed ? 'none' : 'pan-y' }}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return
          pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
          g0.current.moved = pts.current.size > 1
          if (pts.current.size > 1) (e.currentTarget as Element).setPointerCapture(e.pointerId)
          start()
        }}
        onPointerMove={(e) => {
          if (!pts.current.has(e.pointerId)) return
          pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
          const s = g0.current
          const r = rect()
          if (pts.current.size === 2) {
            const [a, b] = two()
            const d = Math.hypot(a.x - b.x, a.y - b.y) || 1
            const mx = (a.x + b.x) / 2
            const my = (a.y + b.y) / 2
            const w = Math.min(MAP_W, Math.max(MIN_W, (s.view.w * s.d) / d))
            const h = w * (s.view.h / s.view.w)
            // the map point under the fingers' first midpoint follows the midpoint
            const ux = s.view.x + ((s.mx - r.left) / r.width) * s.view.w
            const uy = s.view.y + ((s.my - r.top) / r.height) * s.view.h
            setView(clampView({ x: ux - ((mx - r.left) / r.width) * w, y: uy - ((my - r.top) / r.height) * h, w, h }))
            return
          }
          const dx = e.clientX - s.x
          const dy = e.clientY - s.y
          if (!s.moved) {
            if (Math.hypot(dx, dy) < 6) return
            s.moved = true
            ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
          }
          setView(clampView({ ...s.view, x: s.view.x - (dx / r.width) * s.view.w, y: s.view.y - (dy / r.height) * s.view.h }))
        }}
        onPointerUp={(e) => {
          pts.current.delete(e.pointerId)
          if (g0.current.moved) g0.current.swallow = true
          if (pts.current.size) start()
        }}
        onPointerCancel={(e) => {
          pts.current.delete(e.pointerId)
          if (pts.current.size) start()
        }}
        onClickCapture={(e) => {
          // the release that ends a drag is not a tap on a pin
          if (g0.current.swallow) {
            g0.current.swallow = false
            e.stopPropagation()
          }
        }}
        onDoubleClick={(e) => {
          const r = rect()
          setView((v) => zoomAt(v, 2, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height))
        }}
        onWheel={(e) => {
          // a pinch on a trackpad arrives as a wheel with ctrl; a plain wheel keeps scrolling the page
          if (!e.ctrlKey && !e.metaKey) return
          e.preventDefault()
          const r = rect()
          setView((v) => zoomAt(v, Math.exp(-e.deltaY / 200), (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height))
        }}
      >
        <rect width={MAP_W} height={MAP_H} className={g.mapOcean} />
        <g className={g.mapGrid} aria-hidden>
          {[-60, -30, 0, 30, 60].map((lat) => <line key={lat} x1={0} x2={MAP_W} y1={project(lat, 0).y} y2={project(lat, 0).y} vectorEffect="non-scaling-stroke" strokeDasharray={lat ? '2 4' : '3 3'} />)}
          {[-120, -60, 0, 60, 120].map((lng) => <line key={lng} y1={0} y2={MAP_H} x1={project(0, lng).x} x2={project(0, lng).x} vectorEffect="non-scaling-stroke" strokeDasharray={lng ? '2 4' : '3 3'} />)}
        </g>
        <g className={g.mapLand} aria-hidden>
          <path d={WORLD_LAND} vectorEffect="non-scaling-stroke" />
        </g>
        {pins.map((m) => {
          const on = active === m.key
          return (
            <g
              key={m.key}
              className={g.mapPin}
              data-selected={on || undefined}
              data-origin={m.origin || undefined}
              transform={`translate(${m.x} ${m.y}) scale(${k})`}
              onClick={() => {
                haptic('select')
                onPick(m.key)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onPick(m.key)
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={m.title}
            >
              <circle r="20" fill="transparent" style={{ pointerEvents: 'all' }} />
              {on && <circle r="14" className={g.mapPulse} />}
              <circle r="7.5" cy="1.5" className={g.mapPinShadow} />
              <circle r="7" className={m.origin ? g.mapPinOrigin : g.mapPinBody} />
              <circle r="2.4" className={g.mapPinDot} />
              {labels && on && (
                <text y="-15" textAnchor="middle" className={g.mapPinLabel}>
                  {m.title}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <div className={g.mapZoom}>
        <button type="button" className={g.mapZoomBtn} aria-label={t('guide.zoomIn')} onClick={() => setView((v) => zoomAt(v, 2))}>
          <Icon name="plus" weight="bold" size={15} />
        </button>
        <button type="button" className={g.mapZoomBtn} aria-label={t('guide.zoomOut')} onClick={() => setView((v) => zoomAt(v, 0.5))}>
          <Icon name="minus" weight="bold" size={15} />
        </button>
      </div>
      {children}
    </div>
  )
}

const openInMaps = (title: string, location?: string) => {
  const q = encodeURIComponent([title, location].filter(Boolean).join(', '))
  openExternal(`https://www.google.com/maps/search/?api=1&query=${q}`)
}

function ViewToggle({ regional, onToggle, size = 15 }: { regional: boolean; onToggle: () => void; size?: number }) {
  const { t } = useTranslation()
  return (
    <button type="button" className={g.mapViewBtn} onClick={onToggle} aria-label={regional ? t('guide.worldView') : t('guide.regionView')}>
      <Icon name={regional ? 'globe' : 'magnifying-glass-plus'} weight="bold" size={size} />
      <span>{regional ? t('guide.world') : t('guide.region')}</span>
    </button>
  )
}

/** "Where it took root" in the Full Guide: where the Onda began, and its places to visit. */
export function OndaMapWidget({ ondaId, origin, places, look }: { ondaId: string; origin: string; places: MapPlace[]; look: OndaLook }) {
  const { t } = useTranslation()
  const [activeId, setActiveId] = useState('origin')
  const [regional, setRegional] = useState(true)

  const markers = useMemo(() => {
    const at = ONDA_ORIGIN[ondaId]
    const home = at ? [{ ...project(at[0], at[1]), id: 'origin', title: origin || t('guide.origin'), creator: t('guide.origin') as string | undefined, why: undefined as string | undefined, isOrigin: true }] : []
    const rest = places.flatMap((p) => {
      const c = resolveCoords(p)
      return c ? [{ ...p, ...c, isOrigin: false }] : []
    })
    return [...home, ...rest]
  }, [ondaId, origin, places, t])

  const fit = useMemo(() => (regional ? fitView(markers, 2) : WORLD), [regional, markers])
  const activeItem = markers.find((m) => m.id === activeId) ?? markers[0]

  return (
    <div className={g.mapWidget} data-frame={look.layout === 'frame' || undefined}>
      <div className={g.mapWidgetHead}>
        <div className={g.mapWidgetTitle}>
          <Icon name="compass" weight="bold" size={18} />
          <span>{t('guide.mapTitle')}</span>
        </div>
        <ViewToggle regional={regional} onToggle={() => setRegional((v) => !v)} />
      </div>
      <MapCanvas
        key={`${fit.x} ${fit.y} ${fit.w}`}
        fit={fit}
        className={g.mapSvgWrapper}
        label={t('guide.mapAria')}
        pins={markers.map((m) => ({ key: m.id, x: m.x, y: m.y, title: m.title, origin: m.isOrigin }))}
        active={activeItem?.id}
        onPick={setActiveId}
      />
      {activeItem && (
        <div className={g.mapInfoCard}>
          <div className={g.mapInfoIcon}>
            <Icon name={activeItem.isOrigin ? 'compass' : 'map-pin'} weight="fill" size={18} />
          </div>
          <div className={g.mapInfoContent}>
            <div className={g.mapInfoTitle}>{activeItem.title}</div>
            {activeItem.creator && <div className={g.mapInfoLoc}>{activeItem.creator}</div>}
            {activeItem.why && <div className={g.mapInfoWhy}>{activeItem.why}</div>}
          </div>
          {!activeItem.isOrigin && (
            <button type="button" className={g.mapNavBtn} aria-label={`${t('guide.openLink')}: ${activeItem.title}`} onClick={() => openInMaps(activeItem.title, activeItem.creator)}>
              <Icon name="arrow-up-right" weight="bold" size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** Places and festivals, with the places pinned on a map above a row of cards that follow each other. */
export function OndaPlacesMap({ places, look }: { ondaId: string; places: MapPlace[]; look: OndaLook }) {
  const { t } = useTranslation()
  const [activeIdx, setActiveIdx] = useState(0)
  const [regional, setRegional] = useState(true)
  const deckRef = useRef<HTMLDivElement>(null)

  const items = useMemo(() => places.map((p) => ({ ...p, at: resolveCoords(p) })), [places])
  const pins = useMemo(() => items.flatMap((m, i) => (m.at ? [{ key: String(i), x: m.at.x, y: m.at.y, title: m.title }] : [])), [items])
  const fit = useMemo(() => (regional ? fitView(pins, 1.9) : WORLD), [regional, pins])

  const selectPlace = (idx: number) => {
    haptic('select')
    setActiveIdx(idx)
    const card = deckRef.current?.children[idx] as HTMLElement | undefined
    card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  return (
    <div className={g.placesMapContainer}>
      {pins.length > 0 && (
        <MapCanvas key={`${fit.x} ${fit.y} ${fit.w}`} fit={fit} className={g.placesMapCanvas} label={t('guide.ch.places')} pins={pins} active={String(activeIdx)} onPick={(k) => selectPlace(Number(k))} labels>
          <div className={g.placesMapTools} data-frame={look.layout === 'frame' || undefined}>
            <ViewToggle regional={regional} onToggle={() => setRegional((v) => !v)} size={13} />
            <div className={g.placesMapBadge}>
              <Icon name="map-pin" weight="fill" size={14} />
              <span>{t('guide.placesCount', { count: pins.length })}</span>
            </div>
          </div>
        </MapCanvas>
      )}

      <div
        ref={deckRef}
        className={`hscroll ${g.placesDeck}`}
        onScroll={(e) => {
          const el = e.currentTarget
          const w = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 1
          const n = Math.round(el.scrollLeft / (w + 12))
          if (n !== activeIdx && n >= 0 && n < items.length) setActiveIdx(n)
        }}
      >
        {items.map((x, idx) => (
          <article key={x.id} className={g.placeCard} data-selected={activeIdx === idx || undefined} onClick={() => selectPlace(idx)}>
            <div className={g.placeCardTop}>
              <span className={g.placeCardIcon}>
                <Icon name={x.icon || 'map-pin'} weight="regular" size={20} />
              </span>
            </div>
            <h4 className={g.placeCardTitle}>{x.title}</h4>
            {x.creator && <div className={g.placeCardMeta}>{x.creator}</div>}
            {x.why && <p className={g.placeCardWhy}>{x.why}</p>}
            <div className={g.placeCardActions}>
              <button
                type="button"
                className={g.placeMapBtn}
                onClick={(e) => {
                  e.stopPropagation()
                  openInMaps(x.title, x.creator)
                }}
              >
                <Icon name="compass" weight="regular" size={15} />
                <span>{t('guide.openMaps')}</span>
              </button>
              {x.link && /^https?:\/\//i.test(x.link) && (
                <button
                  type="button"
                  className={g.placeLinkBtn}
                  onClick={(e) => {
                    e.stopPropagation()
                    openExternal(x.link!)
                  }}
                  aria-label={`${t('guide.openLink')}: ${x.title}`}
                >
                  <Icon name="arrow-up-right" weight="bold" size={14} />
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
