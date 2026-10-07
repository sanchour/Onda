import type { ReactNode } from 'react'
import type { MediaKind } from '@/content'
import type { Ornament } from '@/content/themes'

/* Small line drawings, one per kind of immersion, in the Onda's own colours:
   outlines in the ink colour, one accent in the strong colour, soft fills from the chip tone. */

const ACCENT = 'var(--onda-strong)'
const SOFT = 'var(--onda-chip)'

const ART: Record<MediaKind, ReactNode> = {
  read: (
    <>
      <path d="M60 22C48 15 32 15 19 19v43c13-4 29-4 41 3z" fill={SOFT} />
      <path d="M60 22c12-7 28-7 41-3v43c-13-4-29-4-41 3z" fill={SOFT} />
      <path d="M28 31c8-2 16-2 24 1M28 40c8-2 16-2 24 1M28 49c8-2 16-2 24 1M68 32c8-3 16-3 24-1M68 41c8-3 16-3 24-1" opacity=".55" />
      <path d="M82 18.5v15l4.5-3.5 4.5 3.5V19" stroke={ACCENT} fill={ACCENT} />
    </>
  ),
  watch: (
    <>
      <rect x="17" y="15" width="86" height="50" rx="9" fill={SOFT} />
      <path d="M54 29l19 11-19 11z" fill={ACCENT} stroke={ACCENT} />
      <path d="M26 21h.1M34 21h.1M42 21h.1M78 59h.1M86 59h.1M94 59h.1" opacity=".5" strokeWidth="3.5" />
      <path d="M46 72h28" />
    </>
  ),
  listen: (
    <>
      <path d="M29 52V46a31 31 0 0 1 62 0v6" />
      <rect x="22" y="49" width="15" height="22" rx="6.5" fill={SOFT} />
      <rect x="83" y="49" width="15" height="22" rx="6.5" fill={SOFT} />
      <path d="M50 53v10M57 47v22M64 51v14M71 55v6" stroke={ACCENT} strokeWidth="3" />
    </>
  ),
  art: (
    <>
      <rect x="20" y="13" width="80" height="55" rx="5" fill={SOFT} />
      <rect x="26" y="19" width="68" height="43" rx="2" opacity=".45" />
      <circle cx="42" cy="33" r="6" fill={ACCENT} stroke={ACCENT} />
      <path d="M27 60l20-19 13 12 12-14 21 21" />
      <path d="M52 73h16" />
    </>
  ),
  eat: (
    <>
      <path d="M24 42h72c0 18-14 27-36 27S24 60 24 42z" fill={SOFT} />
      <path d="M48 35c-4-6 4-8 0-14M60 35c-4-6 4-8 0-14M72 35c-4-6 4-8 0-14" stroke={ACCENT} />
      <path d="M46 74h28" />
    </>
  ),
  drink: (
    <>
      <path d="M32 36h46v15c0 11-9 18-23 18S32 62 32 51z" fill={SOFT} />
      <path d="M78 41h6a8 8 0 0 1 0 16h-7" />
      <path d="M24 74h62" />
      <path d="M47 28c-3-5 3-6 0-11M59 28c-3-5 3-6 0-11" stroke={ACCENT} />
    </>
  ),
  customs: (
    <>
      <rect x="51" y="36" width="18" height="31" rx="3.5" fill={SOFT} />
      <path d="M60 17c7 6 7 13 0 15-7-2-7-9 0-15z" fill={ACCENT} stroke={ACCENT} />
      <path d="M60 32v4M41 71h38" />
      <path d="M37 40l-6-3M83 40l6-3M34 52h-7M86 52h7" opacity=".4" />
    </>
  ),
  words: (
    <>
      <path d="M26 19h68a7 7 0 0 1 7 7v26a7 7 0 0 1-7 7H58L43 71V59H26a7 7 0 0 1-7-7V26a7 7 0 0 1 7-7z" fill={SOFT} />
      <text x="60" y="49" textAnchor="middle" fontSize="25" fontWeight="600" fill={ACCENT} stroke="none" style={{ fontFamily: 'var(--onda-font)' }}>Aa</text>
    </>
  ),
}

export function KindArt({ kind, className }: { kind: MediaKind; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 80" fill="none" stroke="var(--onda-ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
      {ART[kind]}
    </svg>
  )
}

/* Section dividers: a hairline, a small emblem of the tradition, a hairline. */
const ORNAMENTS: Record<Ornament, ReactNode> = {
  column: <path d="M4.5 20h15M7 20V10M12 20V10M17 20V10M3.5 10h17L12 4.5z" />,
  enso: <path d="M18.4 8.2A8 8 0 1 0 20 13.2" />,
  yinyang: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5a4.25 4.25 0 0 1 0 8.5 4.25 4.25 0 0 0 0 8.5" />
      <circle cx="12" cy="7.8" r=".9" fill="currentColor" />
    </>
  ),
  lotus: (
    <>
      <path d="M12 19c-4.2 0-7.3-3-8.2-7.2 3.1 0 6 1.2 8.2 4 2.2-2.8 5.1-4 8.2-4C19.3 16 16.2 19 12 19z" />
      <path d="M12 16C9.9 13 9.9 9 12 5c2.1 4 2.1 8 0 11z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2.1 2.1M15.9 15.9L18 18M18 6l-2.1 2.1M8.1 15.9L6 18" />
    </>
  ),
  mandala: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3.5v17M3.5 12h17" />
    </>
  ),
  feather: (
    <>
      <path d="M5 19.5L18.5 6c.8 5.2-1.4 9.6-6.4 11.4L9.8 17 6.9 19.5z" />
      <path d="M5 19.5l6.5-6.5" />
    </>
  ),
  rings: (
    <>
      <circle cx="8.6" cy="14" r="4.4" />
      <circle cx="15.4" cy="14" r="4.4" />
      <circle cx="12" cy="8.6" r="4.4" />
    </>
  ),
  star8: (
    <>
      <rect x="6.5" y="6.5" width="11" height="11" />
      <rect x="6.5" y="6.5" width="11" height="11" transform="rotate(45 12 12)" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19C5 10.5 10 5 19 5c0 9-5 14-14 14z" />
      <path d="M5 19L14 10" />
    </>
  ),
  dot: <circle cx="12" cy="12" r="1.8" fill="currentColor" />,
}

export function OrnamentIcon({ name, size = 22 }: { name: Ornament; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
      {ORNAMENTS[name]}
    </svg>
  )
}
