/* One haptic entry point. iOS Safari has no navigator.vibrate; since iOS 17.4 toggling a native
   <input type="checkbox" switch> plays the system switch haptic, which is the only reliable Taptic path for a PWA.
   Android uses navigator.vibrate. Anywhere else this is a silent no-op. */

export type HapticKind = 'select' | 'impact' | 'success' | 'warning'

let enabled = true
let label: HTMLLabelElement | null = null

export function setHapticsEnabled(on: boolean) {
  enabled = on
}

function ensureSwitch(): HTMLLabelElement | null {
  if (label || typeof document === 'undefined') return label
  const l = document.createElement('label')
  l.setAttribute('aria-hidden', 'true')
  l.style.cssText = 'position:fixed;left:-100px;top:-100px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none'
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.setAttribute('switch', '')
  input.tabIndex = -1
  l.appendChild(input)
  document.body.appendChild(l)
  label = l
  return l
}

const PATTERN: Record<HapticKind, number | number[]> = { select: 6, impact: 12, success: [10, 40, 14], warning: [14, 60, 14] }

export function haptic(kind: HapticKind = 'select') {
  if (!enabled) return
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(PATTERN[kind])
      return
    }
    // iOS: a programmatic click on the label of a switch-styled checkbox triggers the system haptic.
    const l = ensureSwitch()
    l?.click()
    if (kind === 'success' || kind === 'warning') setTimeout(() => l?.click(), 90)
  } catch {
    // degrade silently
  }
}
