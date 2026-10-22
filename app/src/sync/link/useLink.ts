import { useEffect } from 'react'
import { getMeta } from '@/data/db'
import { useStore } from '@/data/store'

/** Mounted once. A linked device joins its group at launch; an unlinked one loads nothing and connects nowhere. */
export function useLink() {
  const ready = useStore((s) => s.ready)
  useEffect(() => {
    if (!ready) return
    void getMeta('link').then((m) => m && import('./instance').then(({ linkEngine }) => linkEngine().start()))
  }, [ready])
}
