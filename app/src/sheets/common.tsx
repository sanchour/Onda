import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNav, type SheetEntry } from '@/nav/store'
import { GlassButton } from '@/ui/buttons'
import { Sheet } from '@/ui/Sheet'

/** Wires a sheet entry from the nav store to the Sheet component. */
export function useSheet(entry: SheetEntry) {
  const closeSheet = useNav((n) => n.closeSheet)
  const sheetExited = useNav((n) => n.sheetExited)
  return { open: !entry.closing, onExited: () => sheetExited(entry.key), close: () => closeSheet(entry.key) }
}

interface AppSheetProps {
  entry: SheetEntry
  title?: string
  /** 'close' shows a lone × circle; 'cancel' shows a Cancel capsule. */
  leading?: 'close' | 'cancel' | ReactNode
  /** Save capsule on the trailing side. */
  onSave?: () => void
  saveLabel?: string
  saveDisabled?: boolean
  trailing?: ReactNode
  detent?: number
  background?: string
  onCancel?: () => void
  children: ReactNode
}

/** Standard sheet chrome: Cancel · Title · Save in glass capsules, or a lone close circle. */
export function AppSheet({ entry, title, leading = 'close', onSave, saveLabel, saveDisabled, trailing, detent, background, onCancel, children }: AppSheetProps) {
  const { t } = useTranslation()
  const sh = useSheet(entry)
  const cancel = onCancel ?? sh.close
  const lead =
    leading === 'close' ? <GlassButton icon="x" ariaLabel={t('a11y.close')} onClick={cancel} /> : leading === 'cancel' ? <GlassButton label={t('common.cancel')} onClick={cancel} /> : leading
  const trail = trailing ?? (onSave ? <GlassButton label={saveLabel ?? t('common.save')} labelWeight="semibold" disabled={saveDisabled} onClick={onSave} /> : undefined)
  return (
    <Sheet open={sh.open} onExited={sh.onExited} title={title ?? ''} leading={lead} trailing={trail} detent={detent} background={background} onScrimClick={onCancel}>
      {children}
    </Sheet>
  )
}
