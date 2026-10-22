/* What this device calls itself to the others: a plain name and a kind, read from the browser. */

export type DeviceKind = 'phone' | 'tablet' | 'computer'
export interface DeviceInfo {
  name: string
  kind: DeviceKind
}

export function describeDevice(ua: string, touchPoints = 0): DeviceInfo {
  if (/iPhone|iPod/.test(ua)) return { name: 'iPhone', kind: 'phone' }
  // iPadOS asks for the desktop site and says Macintosh; only the touch screen gives it away
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1)) return { name: 'iPad', kind: 'tablet' }
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? { name: 'Android Phone', kind: 'phone' } : { name: 'Android Tablet', kind: 'tablet' }
  if (/Macintosh|Mac OS X/.test(ua)) return { name: 'Mac', kind: 'computer' }
  if (/Windows/.test(ua)) return { name: 'Windows PC', kind: 'computer' }
  if (/CrOS/.test(ua)) return { name: 'Chromebook', kind: 'computer' }
  if (/Linux|X11/.test(ua)) return { name: 'Linux PC', kind: 'computer' }
  return { name: 'Computer', kind: 'computer' }
}

export const thisDevice = (): DeviceInfo =>
  typeof navigator === 'undefined' ? { name: 'Computer', kind: 'computer' } : describeDevice(navigator.userAgent, navigator.maxTouchPoints ?? 0)
