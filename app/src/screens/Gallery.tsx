import { useTranslation } from 'react-i18next'
import { CATEGORIES, CATEGORY_NAMES, FEATURED, type GalleryLago } from '@/data/catalog'
import { BackButton, Screen } from '@/nav/Screen'
import { useNav, type StackEntry } from '@/nav/store'
import { Button } from '@/ui/buttons'
import { Icon } from '@/ui/Icon'
import s from './screens.module.css'

function Tile({ it, tall }: { it: GalleryLago; tall?: boolean }) {
  const { t } = useTranslation()
  const openSheet = useNav((n) => n.openSheet)
  return (
    <button type="button" className={tall ? `${s.tile} ${s.tileTall}` : s.tile} onClick={() => openSheet({ name: 'lagoInfo', info: it })}>
      <Icon name={it.icon} weight="fill" size={26} />
      <span>
        <span className={s.tileName} style={{ display: 'block' }}>{it.name}</span>
        <span className={s.sub} style={{ display: 'block' }}>{t('common.daysCap', { count: it.length })}</span>
      </span>
    </button>
  )
}

/** Gallery: a snapping Featured carousel, then two Lagos per category with a See more link. */
export function Gallery() {
  const { t } = useTranslation()
  const { push, openSheet } = useNav()
  return (
    <Screen bg="page" chrome={<BackButton />}>
      <div className={s.pageHead}>
        <h1 className={s.largeTitle}>{t('gallery.title')}</h1>
      </div>
      <h2 className={s.h20} style={{ padding: '20px 20px 12px' }}>{t('gallery.featured')}</h2>
      <div className={`hscroll ${s.featuredScroll}`}>
        {FEATURED.map((f) => (
          <div key={f.name} className={s.featured}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={s.kicker11}>{t('gallery.kicker', { count: f.length })}</div>
              <div className={s.featuredName}>{f.name}</div>
              <div className={s.sub} style={{ marginTop: 4 }}>{f.desc}</div>
              <div style={{ marginTop: 14 }}>
                <Button size="sm" onClick={() => openSheet({ name: 'lagoInfo', info: f })}>
                  {t('gallery.startNow')}
                </Button>
              </div>
            </div>
            <div className={`${s.circle} ${s.featuredRing}`} aria-hidden>
              <Icon name={f.icon} weight="fill" size={36} />
            </div>
          </div>
        ))}
      </div>

      {CATEGORY_NAMES.map((name) => (
        <section key={name}>
          <button type="button" className={s.groupHead} onClick={() => push({ name: 'category', cat: name })}>
            <h2 className={s.h20}>{name}</h2>
            <span className={s.seeMore}>{t('gallery.seeMore')}</span>
          </button>
          <div className={s.grid2}>
            {CATEGORIES[name]!.slice(0, 2).map((it) => (
              <Tile key={it.name} it={it} />
            ))}
          </div>
        </section>
      ))}
    </Screen>
  )
}

/** One category: all of its Lagos, two per row. */
export function Category({ entry }: { entry: Extract<StackEntry, { name: 'category' }> }) {
  const { t } = useTranslation()
  const items = CATEGORIES[entry.cat] ?? []
  return (
    <Screen bg="page" chrome={<BackButton />}>
      <div className={s.pageHead}>
        <h1 className={s.largeTitle}>{entry.cat}</h1>
        <div className={`${s.sub} ${s.sub2}`}>{t('gallery.catSub', { count: items.length })}</div>
      </div>
      <div className={s.grid2} style={{ paddingTop: 20 }}>
        {items.map((it) => (
          <Tile key={it.name} it={it} tall />
        ))}
      </div>
    </Screen>
  )
}
