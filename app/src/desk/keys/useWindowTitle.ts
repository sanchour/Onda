import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLagos, useOndaList } from '@/data/hooks'
import { useNav, type StackEntry } from '@/nav/store'
import { useActiveOnda } from '@/screens/ondaShared'

/* The window title follows the screen, the way a desktop app's does: "Stoicism, Day 4 - Onda", "Lagos - Onda".
   Focus sets its own (a countdown) while it is open, so `skip` hands the title over. */

const SUFFIX = ' - Onda'

export function useWindowTitle(skip: boolean) {
  const { t } = useTranslation()
  const tab = useNav((n) => n.tab)
  const top: StackEntry | undefined = useNav((n) => n.stack.filter((e) => !e.leaving).at(-1))
  const active = useActiveOnda()
  const ondas = useOndaList()
  const lagos = useLagos()

  const title = useMemo(() => {
    const ondaName = (id: string) => ondas.find((o) => o.id === id)?.name ?? ''
    const running = active ? { id: active.run.ondaId, label: t('power.title.onda', { name: active.index?.name ?? active.run.snapshot?.name ?? '', day: active.day }) } : undefined
    if (!top) {
      if (tab === 'lagos') return t('tabs.lagos')
      if (tab === 'stats') return t('tabs.stats')
      return running?.label ?? t('desk.today')
    }
    switch (top.name) {
      case 'onda':
        return top.id === running?.id ? running.label : ondaName(top.id)
      case 'allOndas':
        return t('desk.browse')
      case 'lago':
        return lagos.find((l) => l.id === top.id)?.name ?? t('tabs.lagos')
      case 'gallery':
      case 'category':
        return t('gallery.title')
      case 'settings':
        return top.page ? t(`settings.hub.${top.page}`) : t('settings.title')
      case 'guide':
        return t('power.title.guide', { name: ondaName(top.ondaId) })
      case 'immersion':
        return t('immersion.title')
      case 'journal':
        return t('journal.title')
      case 'philosophy':
        return t('philosophy.title')
      case 'rules':
        return t('ondas.rules')
      case 'reflection':
        return t('reflection.title')
      case 'done':
        return t('done.title')
      case 'paywall':
        return t('settings.plus.title')
      case 'link':
        return t('link.title')
      default:
        return ''
    }
  }, [t, tab, top, active, ondas, lagos])

  useEffect(() => {
    if (!skip) document.title = title ? title + SUFFIX : 'Onda'
  }, [title, skip])
  useEffect(
    () => () => {
      document.title = 'Onda'
    },
    [],
  )
}
