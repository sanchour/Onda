import { useEffect, useState } from 'react'
import { db } from './db'

/* Check in photos. The blob is kept in IndexedDB so it works offline; when signed in it is also uploaded to
   private Storage (sync/engine.ts) and other devices read it through a short-lived signed URL. */

export const LOCAL_PREFIX = 'local:'

/** Downscale to at most 1600px and re-encode as JPEG so a photo is a few hundred KB, not several MB. */
async function compress(file: Blob): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b ?? file), 'image/jpeg', 0.82))
  } catch {
    return file
  }
}

export async function savePhoto(checkInId: string, file: Blob): Promise<string> {
  await db.photos.put({ id: checkInId, blob: await compress(file), uploaded: false })
  return LOCAL_PREFIX + checkInId
}
export async function deletePhoto(checkInId: string) {
  await db.photos.delete(checkInId)
}

/** Object URL for a check in photo: the local blob if this device has it, otherwise a signed URL from Storage. */
export function usePhotoUrl(checkInId: string | undefined, photoPath: string | null | undefined, rev = 0): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    let made: string | null = null
    setUrl(null)
    if (!checkInId || !photoPath) return
    void (async () => {
      const row = await db.photos.get(checkInId)
      if (row) {
        made = URL.createObjectURL(row.blob)
        if (alive) setUrl(made)
        return
      }
      if (photoPath.startsWith(LOCAL_PREFIX)) return
      const { signedPhotoUrl } = await import('@/sync/engine')
      const signed = await signedPhotoUrl(photoPath)
      if (alive) setUrl(signed)
    })()
    return () => {
      alive = false
      if (made) URL.revokeObjectURL(made)
    }
  }, [checkInId, photoPath, rev])
  return url
}
