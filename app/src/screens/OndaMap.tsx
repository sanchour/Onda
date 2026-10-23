import { useMemo, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { haptic } from '@/lib/haptics'
import { Icon } from '@/ui/Icon'
import { openExternal } from '@/sheets/guideParts'
import type { OndaLook } from '@/content/themes'
import g from '@/sheets/guide.module.css'

export interface MapPlace {
  id: string
  title: string
  creator?: string
  why?: string
  link?: string
  icon?: string
  unverified?: boolean
}

interface Coords {
  lat: number
  lng: number
  x: number
  y: number
}

// Equirectangular projection: 800 x 400
export const MAP_W = 800
export const MAP_H = 400

export function project(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng + 180) / 360) * MAP_W
  const y = ((90 - lat) / 180) * MAP_H
  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
  }
}

/** Fallback coordinates for each Onda ID */
const ONDA_COORDS: Record<string, [number, number]> = {
  stoic: [37.98, 23.72],
  zen: [35.01, 135.76],
  tao: [32.4, 111.0],
  confucian: [35.59, 116.98],
  plato: [37.98, 23.72],
  epicurus: [37.98, 23.72],
  cyrenaic: [32.82, 21.86],
  cynic: [37.98, 23.72],
  hindu: [25.31, 82.97],
  vedanta: [25.31, 82.97],
  jain: [24.69, 84.99],
  sikh: [31.63, 74.87],
  theravada: [7.29, 80.63],
  mahayana: [24.69, 84.99],
  tibet: [29.65, 91.13],
  shinto: [34.46, 136.73],
  zoroaster: [31.89, 54.36],
  judaism: [31.76, 35.21],
  christian: [31.76, 35.21],
  sunni: [21.42, 39.83],
  shia: [32.0, 44.33],
  sufi: [37.87, 32.48],
  gnostic: [31.2, 29.91],
  hermes: [31.2, 29.91],
  norse: [64.14, -21.94],
  animism: [45.0, -95.0],
  rasta: [18.01, -76.8],
  discordia: [37.77, -122.41],
  druid: [51.18, -1.83],
  transc: [42.46, -71.35],
  existential: [48.85, 2.35],
  ubuntu: [-26.2, 28.04],
  postmodern: [48.85, 2.35],
  machiavelli: [43.76, 11.25],
  goethe: [50.98, 11.32],
  kant: [54.71, 20.51],
  dostoevsky: [59.93, 30.33],
  nietzsche: [46.42, 9.76],
  freud: [48.2, 16.37],
  gandhi: [23.02, 72.57],
  adler: [48.2, 16.37],
  jung: [47.37, 8.54],
  rumi: [37.87, 32.48],
  aquinas: [40.85, 14.26],
  spinoza: [52.07, 4.3],
  rousseau: [46.2, 6.14],
  hegel: [50.92, 11.58],
  schopenhauer: [50.11, 8.68],
  orwell: [51.5, -0.12],
  egypt: [25.68, 32.64],
  rome: [41.9, 12.49],
  abbasid: [33.31, 44.36],
  hre: [50.11, 8.68],
  khmer: [13.41, 103.86],
  mongol: [47.19, 102.83],
  ottoman: [41.0, 28.97],
  burgundy: [47.32, 5.04],
  aztec: [19.43, -99.13],
  inca: [-13.53, -71.96],
  mughal: [27.17, 78.0],
  johor: [1.46, 103.76],
  habsburg: [48.2, 16.37],
  qing: [39.9, 116.4],
  soviet: [55.75, 37.61],
  abyssinia: [14.13, 38.72],
  celtic: [53.34, -6.26],
  frisian: [53.2, 5.79],
  renaissance: [43.76, 11.25],
  twenties: [40.71, -74.0],
  sixties: [37.77, -122.41],
  cuba: [23.11, -82.36],
  yoruba: [7.48, 4.55],
  zulu: [-28.33, 31.41],
  bantu: [-4.0, 22.0],
  maasai: [-2.33, 34.83],
  aboriginal: [-25.34, 131.03],
  polynesia: [-21.23, -159.77],
  melanesia: [-17.71, 178.06],
  micronesia: [6.92, 158.21],
  maori: [-36.85, 174.76],
  bedouin: [23.88, 45.07],
}

/** Keyword to coordinate lookup for places */
const CITY_COORDS: [RegExp, [number, number]][] = [
  // Greece & Mediterranean
  [/athens|agora|acropolis|parthenon|stoa/i, [37.98, 23.72]],
  [/corinth/i, [37.94, 22.93]],
  [/sparta/i, [37.07, 22.43]],
  [/delphi/i, [38.48, 22.5]],
  [/epirus|preveza|nicopolis/i, [38.96, 20.75]],
  [/rhodes/i, [36.43, 28.22]],
  [/crete|knossos/i, [35.3, 25.16]],
  [/cyrene|libya/i, [32.82, 21.86]],
  [/rome|capitol|vatican|palatine|colosseum/i, [41.9, 12.49]],
  [/naples|pompeii|vesuvius/i, [40.85, 14.26]],
  [/carnuntum|austria|vienna|zentralfriedhof/i, [48.2, 16.37]],
  [/florence|tuscany|uffizi/i, [43.76, 11.25]],
  [/venice/i, [45.44, 12.33]],
  [/milan/i, [45.46, 9.19]],
  // Middle East & North Africa
  [/baghdad|tigris|mesopotamia/i, [33.31, 44.36]],
  [/samarra/i, [34.19, 43.87]],
  [/cairo|giza|pyramids|nile|luxor|karnak/i, [30.04, 31.23]],
  [/alexandria/i, [31.2, 29.91]],
  [/jerusalem|judea|galilee/i, [31.76, 35.21]],
  [/mecca/i, [21.42, 39.83]],
  [/medina/i, [24.52, 39.56]],
  [/konya|dervish|rumi/i, [37.87, 32.48]],
  [/istanbul|constantinople|bosporus/i, [41.0, 28.97]],
  [/isfahan|shiraz|tehran|persia|iran/i, [32.65, 51.66]],
  [/damascus/i, [33.51, 36.29]],
  [/qatar|doha/i, [25.28, 51.53]],
  [/emirates|sharjah|dubai/i, [25.35, 55.4]],
  // Asia
  [/kyoto|ryoan|gion|kamogawa/i, [35.01, 135.76]],
  [/tokyo|edo|shinjuku|shibuya/i, [35.67, 139.65]],
  [/nara/i, [34.68, 135.8]],
  [/mount fuji|fujisan/i, [35.36, 138.73]],
  [/beijing|forbidden city/i, [39.9, 116.4]],
  [/chang'an|xi'an|terracotta/i, [34.34, 108.93]],
  [/wudang/i, [32.4, 111.0]],
  [/qufu|shandong/i, [35.59, 116.98]],
  [/varanasi|benares|ganges/i, [25.31, 82.97]],
  [/bodh gaya|bihar/i, [24.69, 84.99]],
  [/amritsar|golden temple/i, [31.63, 74.87]],
  [/delhi|new delhi/i, [28.61, 77.2]],
  [/agra|taj mahal/i, [27.17, 78.0]],
  [/lhasa|tibet|himalaya/i, [29.65, 91.13]],
  [/angkor|cambodia/i, [13.41, 103.86]],
  [/bagan|myanmar/i, [21.17, 94.86]],
  [/karakorum|mongolia/i, [47.19, 102.83]],
  // Europe
  [/paris|louvre|seine|sorbonne/i, [48.85, 2.35]],
  [/london|westminster|thames/i, [51.5, -0.12]],
  [/edinburgh|scotland/i, [55.95, -3.18]],
  [/dublin|ireland/i, [53.34, -6.26]],
  [/amsterdam|hague|netherlands|holland/i, [52.36, 4.9]],
  [/leeuwarden|frisia/i, [53.2, 5.79]],
  [/geneva|switzerland/i, [46.2, 6.14]],
  [/zurich/i, [47.37, 8.54]],
  [/sils maria|engadin/i, [46.42, 9.76]],
  [/berlin|germany/i, [52.52, 13.4]],
  [/frankfurt/i, [50.11, 8.68]],
  [/weimar/i, [50.98, 11.32]],
  [/jena/i, [50.92, 11.58]],
  [/königsberg|kaliningrad/i, [54.71, 20.51]],
  [/dijon|burgundy/i, [47.32, 5.04]],
  [/madrid|spain/i, [40.41, -3.7]],
  [/st petersburg|leningrad/i, [59.93, 30.33]],
  [/moscow/i, [55.75, 37.61]],
  [/reykjavik|iceland|thingvellir/i, [64.14, -21.94]],
  [/stonehenge/i, [51.18, -1.83]],
  // Americas
  [/mexico city|tenochtitlan|chapultepec|zocalo/i, [19.43, -99.13]],
  [/teotihuacan/i, [19.69, -98.84]],
  [/oaxaca|monte alban/i, [17.06, -96.72]],
  [/cusco|machu picchu|andes|peru/i, [-13.53, -71.96]],
  [/lake titicaca/i, [-15.84, -69.33]],
  [/havana|cuba/i, [23.11, -82.36]],
  [/new york|manhattan|brooklyn/i, [40.71, -74.0]],
  [/concord|walden|boston|massachusetts/i, [42.46, -71.35]],
  [/washington|smithsonian/i, [38.9, -77.03]],
  [/san francisco/i, [37.77, -122.41]],
  [/new mexico|taos|santa fe/i, [35.68, -105.93]],
  [/arizona|phoenix/i, [33.44, -112.07]],
  [/illinois|chicago|collinsville|cahokia/i, [38.65, -90.06]],
  // Oceania & Africa
  [/uluru|kata tjuta|red centre/i, [-25.34, 131.03]],
  [/northern territory|darwin/i, [-12.46, 130.84]],
  [/new south wales|sydney/i, [-33.86, 151.2]],
  [/victoria|melbourne/i, [-37.81, 144.96]],
  [/canberra/i, [-35.28, 149.13]],
  [/aotearoa|new zealand|auckland|rotorua/i, [-36.85, 174.76]],
  [/polynesia|tahiti|rarotonga|samoa/i, [-21.23, -159.77]],
  [/melanesia|fiji|vanuatu/i, [-17.71, 178.06]],
  [/micronesia|pohnpei/i, [6.92, 158.21]],
  [/ethiopia|axum|lalibela|addis/i, [14.13, 38.72]],
  [/timbuktu|mali/i, [16.76, -3.0]],
  [/nigeria|ile-ife|yoruba/i, [7.48, 4.55]],
  [/zulu|kwazulu|durban|ulundi/i, [-28.33, 31.41]],
  [/serengeti|kenya|tanzania|maasai/i, [-2.33, 34.83]],
  [/great zimbabwe|bantu/i, [-20.27, 30.93]],
]

export function resolveCoords(place: MapPlace, ondaId: string, index: number): Coords {
  const text = `${place.title} ${place.creator ?? ''} ${place.why ?? ''}`
  for (const [pattern, [lat, lng]] of CITY_COORDS) {
    if (pattern.test(text)) {
      // Add a slight jitter if multiple places share coordinates so pins don't overlap completely
      const jLat = lat + ((index % 3) - 1) * 0.35
      const jLng = lng + ((Math.floor(index / 3) % 3) - 1) * 0.45
      const { x, y } = project(jLat, jLng)
      return { lat: jLat, lng: jLng, x, y }
    }
  }
  // Fallback to Onda's default coordinates with deterministic offset
  const base = ONDA_COORDS[ondaId] ?? [35.0, 20.0]
  const lat = base[0] + ((index % 4) - 1.5) * 0.8
  const lng = base[1] + ((Math.floor(index / 2) % 4) - 1.5) * 1.1
  const { x, y } = project(lat, lng)
  return { lat, lng, x, y }
}

export function computeBoundingViewBox(points: { x: number; y: number }[]): string {
  if (!points.length) return `0 0 ${MAP_W} ${MAP_H}`
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  const padX = 60
  const padY = 45
  let w = Math.max(220, maxX - minX + padX * 2)
  let h = Math.max(130, maxY - minY + padY * 2)
  // Keep roughly 2:1 aspect ratio
  if (w / h > 2.2) h = w / 2
  else if (w / h < 1.7) w = h * 1.9

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const x = Math.max(0, Math.min(MAP_W - w, cx - w / 2))
  const y = Math.max(0, Math.min(MAP_H - h, cy - h / 2))
  return `${Math.round(x)} ${Math.round(y)} ${Math.round(w)} ${Math.round(h)}`
}

/** Vector silhouettes for world continents in Equirectangular projection (800x400) */
export function WorldLandmasses() {
  return (
    <g className={g.mapLand} aria-hidden>
      {/* North America & Greenland */}
      <path d="M120,45 L155,42 L180,50 L210,38 L225,55 L245,60 L235,85 L260,95 L250,120 L210,135 L190,145 L175,130 L160,110 L140,95 L115,75 Z M220,25 L240,20 L260,35 L245,45 L225,38 Z" />
      {/* Central America & Caribbean */}
      <path d="M190,145 L215,160 L230,175 L220,185 L205,175 L185,155 Z M235,160 Q245,158 250,165 Q240,170 235,160" />
      {/* South America */}
      <path d="M225,185 L255,180 L285,195 L300,225 L285,270 L265,310 L250,335 L240,320 L250,270 L240,230 L220,200 Z" />
      {/* Europe */}
      <path d="M395,70 L430,65 L460,75 L450,105 L430,125 L405,120 L385,115 L380,95 Z M375,75 L385,70 L390,85 L380,90 Z M410,50 L425,48 L430,60 L415,65 Z" />
      {/* British Isles */}
      <path d="M370,80 L380,78 L382,92 L372,95 Z M362,85 L368,83 L366,92 L360,90 Z" />
      {/* Africa & Madagascar */}
      <path d="M380,125 L430,125 L465,145 L475,175 L455,225 L435,270 L415,280 L395,250 L375,190 L365,155 Z M475,235 L485,230 L480,260 L470,255 Z" />
      {/* Asia & Middle East */}
      <path d="M460,75 L520,65 L580,60 L650,65 L710,75 L730,105 L700,125 L650,140 L600,155 L550,140 L500,145 L465,135 Z M660,145 L690,140 L685,180 L650,195 L630,170 Z M460,135 L490,140 L485,175 L455,170 Z M525,145 L560,150 L550,195 L520,185 Z" />
      {/* Japan & East Asian Islands */}
      <path d="M705,105 L715,100 L720,120 L710,125 Z M680,160 L695,155 L700,175 L685,180 Z" />
      {/* Australia & New Zealand */}
      <path d="M660,250 L710,245 L730,270 L715,310 L675,315 L645,285 Z M745,310 L755,305 L760,325 L750,330 Z" />
      {/* Indonesia & Pacific */}
      <path d="M640,195 L680,190 L710,205 L670,215 Z M720,195 L740,200 L730,220 L715,210 Z" />
    </g>
  )
}

/** Graticules (Latitude / Longitude grid) */
export function MapGrid() {
  return (
    <g className={g.mapGrid} aria-hidden>
      {/* Equator */}
      <line x1="0" y1="200" x2="800" y2="200" strokeDasharray="3 3" />
      {/* Tropics */}
      <line x1="0" y1="148" x2="800" y2="148" strokeDasharray="2 4" opacity="0.6" />
      <line x1="0" y1="252" x2="800" y2="252" strokeDasharray="2 4" opacity="0.6" />
      {/* Meridians */}
      <line x1="200" y1="0" x2="200" y2="400" strokeDasharray="2 4" opacity="0.5" />
      <line x1="400" y1="0" x2="400" y2="400" strokeDasharray="3 3" />
      <line x1="600" y1="0" x2="600" y2="400" strokeDasharray="2 4" opacity="0.5" />
    </g>
  )
}

/** Compact map widget placed between At a Glance and Quote on Full Guide */
export function OndaMapWidget({
  ondaId,
  origin,
  places,
  look,
}: {
  ondaId: string
  origin: string
  places: MapPlace[]
  look: OndaLook
}) {
  const { t } = useTranslation()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [regional, setRegional] = useState(true)

  // Map markers: origin + up to 5 places
  const markers = useMemo(() => {
    const originBase = ONDA_COORDS[ondaId] ?? [35.0, 20.0]
    const originProj = project(originBase[0], originBase[1])
    const originMarker = {
      id: 'origin',
      title: origin || t('guide.origin'),
      creator: ondaId.toUpperCase(),
      why: t('guide.originMarker', { name: ondaId }),
      isOrigin: true,
      coords: { lat: originBase[0], lng: originBase[1], ...originProj },
    }

    const placeMarkers = places.slice(0, 5).map((p, idx) => ({
      ...p,
      isOrigin: false,
      coords: resolveCoords(p, ondaId, idx + 1),
    }))

    return [originMarker, ...placeMarkers]
  }, [ondaId, origin, places, t])

  const viewBox = useMemo(() => {
    if (!regional) return `0 0 ${MAP_W} ${MAP_H}`
    return computeBoundingViewBox(markers.map((m) => m.coords))
  }, [regional, markers])

  const activeItem = markers.find((m) => m.id === activeId) ?? markers[0]

  const openInMaps = (title: string, location?: string) => {
    const q = encodeURIComponent([title, location].filter(Boolean).join(', '))
    openExternal(`https://www.google.com/maps/search/?api=1&query=${q}`)
  }

  return (
    <div className={g.mapWidget} data-frame={look.layout === 'frame' || undefined}>
      <div className={g.mapWidgetHead}>
        <div className={g.mapWidgetTitle}>
          <Icon name="compass" weight="bold" size={18} />
          <span>{t('guide.mapTitle', { defaultValue: 'Where It Took Root' })}</span>
        </div>
        <button
          type="button"
          className={g.mapViewBtn}
          onClick={() => setRegional((v) => !v)}
          aria-label={regional ? t('guide.worldView', { defaultValue: 'World View' }) : t('guide.regionView', { defaultValue: 'Regional Focus' })}
        >
          <Icon name={regional ? 'globe' : 'magnifying-glass-plus'} weight="bold" size={15} />
          <span>{regional ? t('guide.world', { defaultValue: 'World' }) : t('guide.region', { defaultValue: 'Region' })}</span>
        </button>
      </div>

      <div className={g.mapSvgWrapper}>
        <svg
          viewBox={viewBox}
          className={g.mapSvg}
          role="img"
          aria-label={t('guide.mapAria', { defaultValue: 'Map of relevant historical locations' })}
        >
          <rect width={MAP_W} height={MAP_H} className={g.mapOcean} />
          <MapGrid />
          <WorldLandmasses />

          {/* Markers */}
          {markers.map((m) => {
            const isSelected = activeItem?.id === m.id
            return (
              <g
                key={m.id}
                className={g.mapPin}
                data-selected={isSelected || undefined}
                data-origin={m.isOrigin || undefined}
                transform={`translate(${m.coords.x}, ${m.coords.y})`}
                onClick={() => {
                  haptic('select')
                  setActiveId(m.id)
                }}
                role="button"
                tabIndex={0}
                aria-label={m.title}
              >
                {/* Large touch/click hitbox */}
                <circle r="26" fill="transparent" style={{ pointerEvents: 'all' }} />
                {/* Pulse ring for active pin */}
                {isSelected && <circle r="14" className={g.mapPulse} />}
                {/* Pin shadow */}
                <circle r="7" cy="1.5" className={g.mapPinShadow} />
                {/* Pin body */}
                <circle r="6.5" className={m.isOrigin ? g.mapPinOrigin : g.mapPinBody} />
                {/* Pin icon/dot */}
                <circle r="2.2" className={g.mapPinDot} />
              </g>
            )
          })}
        </svg>
      </div>

      {/* Selected location pill card */}
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
            <button
              type="button"
              className={g.mapNavBtn}
              aria-label={`${t('guide.openLink')}: ${activeItem.title}`}
              onClick={() => openInMaps(activeItem.title, activeItem.creator)}
            >
              <Icon name="arrow-up-right" weight="bold" size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** Cool interactive map view for Chapter 7: Places and festivals */
export function OndaPlacesMap({
  ondaId,
  places,
  look,
}: {
  ondaId: string
  places: MapPlace[]
  look: OndaLook
}) {
  const { t } = useTranslation()
  const [activeIdx, setActiveIdx] = useState(0)
  const [regional, setRegional] = useState(true)
  const deckRef = useRef<HTMLDivElement>(null)

  const items = useMemo(() => {
    return places.map((p, idx) => ({
      ...p,
      coords: resolveCoords(p, ondaId, idx),
    }))
  }, [places, ondaId])

  const viewBox = useMemo(() => {
    if (!regional) return `0 0 ${MAP_W} ${MAP_H}`
    return computeBoundingViewBox(items.map((m) => m.coords))
  }, [regional, items])

  const selectPlace = (idx: number) => {
    haptic('select')
    setActiveIdx(idx)
    const el = deckRef.current
    if (el) {
      const card = el.children[idx] as HTMLElement | undefined
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
    }
  }

  const openInMaps = (title: string, location?: string) => {
    const q = encodeURIComponent([title, location].filter(Boolean).join(', '))
    openExternal(`https://www.google.com/maps/search/?api=1&query=${q}`)
  }

  return (
    <div className={g.placesMapContainer}>
      {/* Interactive Map Canvas */}
      <div className={g.placesMapCanvas} data-frame={look.layout === 'frame' || undefined}>
        <svg
          viewBox={viewBox}
          className={g.placesMapSvg}
          role="img"
          aria-label={t('guide.ch.places')}
        >
          <rect width={MAP_W} height={MAP_H} className={g.mapOcean} />
          <MapGrid />
          <WorldLandmasses />

          {items.map((m, idx) => {
            const isSelected = activeIdx === idx
            return (
              <g
                key={m.id}
                className={g.mapPin}
                data-selected={isSelected || undefined}
                transform={`translate(${m.coords.x}, ${m.coords.y})`}
                onClick={() => selectPlace(idx)}
                role="button"
                tabIndex={0}
                aria-label={m.title}
              >
                {/* Large touch/click hitbox */}
                <circle r="28" fill="transparent" style={{ pointerEvents: 'all' }} />
                {isSelected && <circle r="16" className={g.mapPulse} />}
                <circle r="8" cy="2" className={g.mapPinShadow} />
                <circle r="7.5" className={g.mapPinBody} />
                <circle r="2.5" className={g.mapPinDot} />
                {isSelected && (
                  <g className={g.mapPinLabelGroup}>
                    <rect
                      x={-Math.min(100, Math.max(40, m.title.length * 3.5)) - 6}
                      y="-25"
                      width={Math.min(200, Math.max(80, m.title.length * 7)) + 12}
                      height="18"
                      rx="5"
                      fill="var(--surface-card)"
                      stroke="var(--separator)"
                      strokeWidth="0.5"
                    />
                    <text
                      y="-12"
                      textAnchor="middle"
                      className={g.mapPinLabel}
                    >
                      {m.title}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>

        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className={g.mapViewBtn}
            onClick={() => setRegional((v) => !v)}
            aria-label={regional ? t('guide.worldView', { defaultValue: 'World View' }) : t('guide.regionView', { defaultValue: 'Regional Focus' })}
          >
            <Icon name={regional ? 'globe' : 'magnifying-glass-plus'} weight="bold" size={13} />
            <span>{regional ? t('guide.world', { defaultValue: 'World' }) : t('guide.region', { defaultValue: 'Region' })}</span>
          </button>
          <div className={g.placesMapBadge} style={{ position: 'static' }}>
            <Icon name="map-pin" weight="fill" size={14} />
            <span>{t('guide.placesCount', { count: items.length, defaultValue: `${items.length} locations` })}</span>
          </div>
        </div>
      </div>

      {/* Swipable cards synced with map markers */}
      <div
        ref={deckRef}
        className={`hscroll ${g.placesDeck}`}
        onScroll={(e) => {
          const el = e.currentTarget
          const w = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 1
          const n = Math.round(el.scrollLeft / (w + 12))
          if (n !== activeIdx && n >= 0 && n < items.length) {
            setActiveIdx(n)
          }
        }}
      >
        {items.map((x, idx) => {
          const isSelected = activeIdx === idx
          return (
            <article
              key={x.id}
              className={g.placeCard}
              data-selected={isSelected || undefined}
              onClick={() => selectPlace(idx)}
            >
              <div className={g.placeCardTop}>
                <span className={g.placeCardIcon}>
                  <Icon name={x.icon || 'map-pin'} weight="regular" size={20} />
                </span>
                <span className={g.placeCardNum}>
                  {look.numeral(idx + 1)}
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
                  <span>{t('guide.openMaps', { defaultValue: 'Open in Maps' })}</span>
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
          )
        })}
      </div>
    </div>
  )
}
