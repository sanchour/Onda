import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { ONDA_INDEX, isShipped, loadOnda, toIndex } from '@/content'
import type { OndaContent, OndaIndex } from '@/content/schema'
import { ondaLook, type OndaLook } from '@/content/themes'
import { now } from '@/lib/dates'
import { plusState, type PlusState } from './entitlement'
import { useStore } from './store'
import { DEFAULT_SETTINGS, type BaseRecord, type Lago, type OndaRun, type Settings } from './types'

const live = <T extends BaseRecord>(x: T) => !x.deletedAt

export function useSettings(): Settings {
  return useStore((s) => s.user?.settings) ?? DEFAULT_SETTINGS
}

export function useLagos(): Lago[] {
  const lagos = useStore((s) => s.lagos)
  return useMemo(() => lagos.filter(live), [lagos])
}

export function useActiveRun(): OndaRun | undefined {
  return useStore((s) => s.runs.find((r) => r.state === 'active' && !r.deletedAt))
}

export function usePlus(): PlusState {
  const plus = useStore((s) => s.user?.plus)
  const trialStartedAt = useStore((s) => s.user?.trialStartedAt)
  const today = useStore((s) => s.today)
  // `today` is a dependency so a trial expires on screen when the day rolls over
  return useMemo(() => plusState(plus ? { plus, trialStartedAt } : null, now().getTime()), [plus, trialStartedAt, today]) // eslint-disable-line react-hooks/exhaustive-deps
}

/** Resolved appearance: the user's choice, or the system setting when on Auto. */
export function useDark(): boolean {
  const mode = useSettings().themeMode
  const [system, setSystem] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => setSystem(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return mode === 'dark' || (mode === 'auto' && system)
}

/** The user's own Ondas. They are checked against the content schema after zod has loaded (it is not part of start-up), so they appear a moment later. */
function useCustomOndas(): OndaContent[] {
  const custom = useStore((s) => s.customOndas)
  const [valid, setValid] = useState<OndaContent[]>([])
  useEffect(() => {
    const rows = custom.filter(live)
    if (!rows.length) return setValid((v) => (v.length ? [] : v))
    let off = false
    void import('@/content/schema').then(({ OndaContentSchema }) => {
      if (off) return
      setValid(rows.flatMap((c) => {
        const r = OndaContentSchema.safeParse(c.content)
        return r.success ? [r.data] : []
      }))
    })
    return () => {
      off = true
    }
  }, [custom])
  return valid
}

/** Shipped Ondas followed by the user's own. */
export function useOndaList(): OndaIndex[] {
  const custom = useCustomOndas()
  return useMemo(() => [...ONDA_INDEX, ...custom.map(toIndex)], [custom])
}

export function useOndaIndex(id: string | undefined): OndaIndex | undefined {
  const list = useOndaList()
  return useMemo(() => list.find((o) => o.id === id), [list, id])
}

/** Full content for one Onda. Shipped content is a lazy chunk; custom content comes from the store. */
export function useOnda(id: string | undefined): OndaContent | undefined {
  const custom = useCustomOndas()
  const mine = useMemo(() => custom.find((c) => c.id === id), [custom, id])
  const q = useQuery({ queryKey: ['onda', id], queryFn: () => loadOnda(id!), enabled: !!id && !mine && isShipped(id), staleTime: Infinity, gcTime: Infinity, networkMode: 'always' })
  return mine ?? q.data
}

export function useLook(o: Pick<OndaIndex, 'id' | 'tone'> | undefined): OndaLook {
  const themed = useSettings().ondaThemes
  const dark = useDark()
  return useMemo(() => ondaLook(o, { themed, dark }), [o?.id, o?.tone, themed, dark]) // eslint-disable-line react-hooks/exhaustive-deps
}

/** Look resolver for lists of Ondas (tiles, pickers). */
export function useLookFn(): (o: Pick<OndaIndex, 'id' | 'tone'> | undefined) => OndaLook {
  const themed = useSettings().ondaThemes
  const dark = useDark()
  return useMemo(() => (o) => ondaLook(o, { themed, dark }), [themed, dark])
}
